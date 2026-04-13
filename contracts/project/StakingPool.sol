// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IRegistry} from "../interfaces/IRegistry.sol";
import {IRWAToken} from "../interfaces/IRWAToken.sol";

interface IRegistryEmissions {
    function admin() external view returns (address);
    function emissionsPaused(address operator) external view returns (bool);
}

/// @title StakingPool
/// @notice Manages token staking and weekly USDC emission distribution.
///         Admin can pause new emissions. Missed epochs tracked to gate disbursements.
contract StakingPool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────── Constants ────────────────────────────
    uint256 public constant EPOCH_DURATION = 7 days;

    // ─────────────────────────────── Immutables ───────────────────────────
    IRegistry public immutable registry;
    IRWAToken public immutable token;
    IERC20    public immutable usdc;
    address   public immutable operator;

    // ─────────────────────────────── Epoch data ───────────────────────────
    struct Epoch {
        uint256 snapshotId;
        uint256 totalStakedAtSnapshot;
        uint256 usdcEmission;
        uint256 timestamp;
        bool    funded;    // true once operator deposits emission for this epoch
    }

    mapping(uint256 => Epoch) public epochs;
    uint256 public currentEpoch;
    uint256 public lastSnapshotTime;
    uint256 public deployTime;

    // ─────────────────────────────── Staker state ─────────────────────────
    struct Checkpoint {
        uint256 timestamp;
        uint256 amount;
    }

    mapping(address => uint256)              public stakedBalance;
    mapping(address => Checkpoint[])         private _checkpoints;
    uint256                                  public totalStaked;

    mapping(address => mapping(uint256 => bool)) public claimed;

    // ─────────────────────────────── Events ───────────────────────────────
    event Staked(address indexed staker, uint256 amount);
    event Unstaked(address indexed staker, uint256 amount);
    event EpochSnapshotTaken(uint256 indexed epochId, uint256 snapshotId, uint256 totalStaked);
    event EmissionDeposited(uint256 indexed epochId, uint256 usdcAmount);
    event EmissionClaimed(address indexed staker, uint256 indexed epochId, uint256 usdcAmount);

    // ─────────────────────────────── Modifiers ────────────────────────────
    modifier notBanned() {
        registry.requireNotBanned(msg.sender);
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator, "StakingPool: not operator");
        _;
    }

    modifier emissionsNotPaused() {
        require(
            !IRegistryEmissions(address(registry)).emissionsPaused(operator),
            "StakingPool: emissions paused by admin"
        );
        _;
    }

    constructor(
        address registry_,
        address token_,
        address usdc_,
        address operator_
    ) {
        require(registry_ != address(0) && token_ != address(0), "zero address");
        require(usdc_     != address(0) && operator_ != address(0), "zero address");
        registry         = IRegistry(registry_);
        token            = IRWAToken(token_);
        usdc             = IERC20(usdc_);
        operator         = operator_;
        lastSnapshotTime = block.timestamp;
        deployTime       = block.timestamp;
    }

    // ─────────────────────────────── Staker actions ───────────────────────
    function stake(uint256 amount) external nonReentrant notBanned {
        require(amount > 0, "zero amount");

        stakedBalance[msg.sender] += amount;
        totalStaked               += amount;
        _writeCheckpoint(msg.sender, stakedBalance[msg.sender]);

        IERC20(address(token)).safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant notBanned {
        require(amount > 0, "zero amount");
        require(stakedBalance[msg.sender] >= amount, "insufficient staked");

        stakedBalance[msg.sender] -= amount;
        totalStaked               -= amount;
        _writeCheckpoint(msg.sender, stakedBalance[msg.sender]);

        IERC20(address(token)).safeTransfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    // ─────────────────────────────── Epoch / snapshot ─────────────────────
    function takeWeeklySnapshot() external returns (uint256 epochId) {
        require(
            block.timestamp >= lastSnapshotTime + EPOCH_DURATION,
            "StakingPool: epoch not complete"
        );

        epochId = currentEpoch;
        uint256 snapshotId = token.snapshot();

        epochs[epochId] = Epoch({
            snapshotId:            snapshotId,
            totalStakedAtSnapshot: totalStaked,
            usdcEmission:          0,
            timestamp:             block.timestamp,
            funded:                false
        });

        currentEpoch++;
        lastSnapshotTime = block.timestamp;

        emit EpochSnapshotTaken(epochId, snapshotId, totalStaked);
    }

    /// @notice Operator deposits USDC emissions. Paused by admin if emissionsPaused.
    function depositEmission(uint256 epochId, uint256 usdcAmount)
        external
        onlyOperator
        emissionsNotPaused
    {
        require(epochId < currentEpoch, "StakingPool: epoch not closed");
        require(usdcAmount > 0, "zero amount");
        require(!epochs[epochId].funded, "already funded");

        epochs[epochId].usdcEmission += usdcAmount;
        epochs[epochId].funded        = true;
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);

        emit EmissionDeposited(epochId, usdcAmount);
    }

    // ─────────────────────────────── Claim emissions ──────────────────────
    function claimEmission(uint256 epochId) public nonReentrant notBanned {
        require(epochId < currentEpoch, "StakingPool: epoch not closed");
        require(!claimed[msg.sender][epochId], "already claimed");

        Epoch storage epoch = epochs[epochId];
        require(epoch.usdcEmission > 0, "no emission for epoch");
        require(epoch.totalStakedAtSnapshot > 0, "no stakers in epoch");

        uint256 stakedAmt = _getStakedAtTimestamp(msg.sender, epoch.timestamp);
        require(stakedAmt > 0, "not staked in epoch");

        uint256 share = (stakedAmt * epoch.usdcEmission) / epoch.totalStakedAtSnapshot;
        require(share > 0, "zero share");

        claimed[msg.sender][epochId] = true;
        usdc.safeTransfer(msg.sender, share);

        emit EmissionClaimed(msg.sender, epochId, share);
    }

    function claimMultipleEpochs(uint256[] calldata epochIds) external {
        for (uint256 i = 0; i < epochIds.length; i++) {
            claimEmission(epochIds[i]);
        }
    }

    // ─────────────────────────────── View helpers ─────────────────────────
    function pendingEmission(address staker, uint256 epochId) external view returns (uint256) {
        if (epochId >= currentEpoch) return 0;
        if (claimed[staker][epochId]) return 0;

        Epoch storage epoch = epochs[epochId];
        if (epoch.usdcEmission == 0 || epoch.totalStakedAtSnapshot == 0) return 0;

        uint256 stakedAmt = _getStakedAtTimestamp(staker, epoch.timestamp);
        if (stakedAmt == 0) return 0;

        return (stakedAmt * epoch.usdcEmission) / epoch.totalStakedAtSnapshot;
    }

    /// @notice Returns count of closed epochs that were never funded by the operator.
    ///         Used by DisbursementScheduler to gate tranche releases.
    function missedEpochs() external view returns (uint256 count) {
        for (uint256 i = 0; i < currentEpoch; i++) {
            if (!epochs[i].funded) count++;
        }
    }

    function stakerInfo(address staker) external view returns (uint256 staked, uint256 checkpointCount) {
        return (stakedBalance[staker], _checkpoints[staker].length);
    }

    function getEpoch(uint256 epochId) external view returns (Epoch memory) {
        return epochs[epochId];
    }

    function timeUntilNextSnapshot() external view returns (uint256) {
        uint256 nextTime = lastSnapshotTime + EPOCH_DURATION;
        if (block.timestamp >= nextTime) return 0;
        return nextTime - block.timestamp;
    }

    function totalUsdcDistributed() external view returns (uint256 total) {
        for (uint256 i = 0; i < currentEpoch; i++) {
            total += epochs[i].usdcEmission;
        }
    }

    // ─────────────────────────────── Checkpoint internals ─────────────────
    function _writeCheckpoint(address staker, uint256 newAmount) internal {
        Checkpoint[] storage checkpoints = _checkpoints[staker];
        if (checkpoints.length > 0 && checkpoints[checkpoints.length - 1].timestamp == block.timestamp) {
            checkpoints[checkpoints.length - 1].amount = newAmount;
        } else {
            checkpoints.push(Checkpoint({timestamp: block.timestamp, amount: newAmount}));
        }
    }

    function _getStakedAtTimestamp(address staker, uint256 timestamp) internal view returns (uint256) {
        Checkpoint[] storage checkpoints = _checkpoints[staker];
        if (checkpoints.length == 0) return 0;
        if (checkpoints[0].timestamp > timestamp) return 0;

        uint256 low  = 0;
        uint256 high = checkpoints.length - 1;

        while (low < high) {
            uint256 mid = (low + high + 1) / 2;
            if (checkpoints[mid].timestamp <= timestamp) {
                low = mid;
            } else {
                high = mid - 1;
            }
        }

        return checkpoints[low].amount;
    }
}
