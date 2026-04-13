// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20}     from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20}  from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IRegistryEmissionsVault {
    function admin()          external view returns (address);
    function adminOperator()  external view returns (address);
    function protocolTreasury() external view returns (address);
    function requireNotBanned(address addr) external view;
}

interface IStakingPoolDeposit {
    function depositEmission(uint256 epochId, uint256 usdcAmount) external;
    function currentEpoch() external view returns (uint256);
}

/// @title EmissionsVault
/// @notice Holds USDC emissions submitted by the project multisig/EOA.
///         Admin Operator (AO) reviews earnings report + uploads on-chain proof.
///         On AO approval: 10 % fee to admin wallet, 90 % flows to StakingPool.
contract EmissionsVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant FEE_BPS   = 1_000;  // 10 %
    uint256 public constant BPS_DENOM = 10_000;

    // ── State ────────────────────────────────────────────────────────────────
    IRegistryEmissionsVault public immutable registry;
    IERC20                  public immutable usdc;
    address                 public immutable operator;
    address                 public immutable stakingPool;

    enum DepositStatus { Pending, Verified, Distributed, Rejected }

    struct EmissionDeposit {
        uint256 amount;               // USDC deposited by project
        string  earningsReportCid;    // IPFS CID of project earnings report
        string  proofCid;             // IPFS CID of AO-uploaded verification proof
        uint256 submittedAt;
        uint256 verifiedAt;
        uint256 distributedAt;
        DepositStatus status;
        uint256 feeAmount;            // 10 % sent to admin
        uint256 netAmount;            // 90 % sent to stakers
        uint256 epochId;              // StakingPool epoch this was deposited into
    }

    EmissionDeposit[] private _deposits;
    uint256 public totalPendingUsdc;
    uint256 public totalDistributedUsdc;
    uint256 public totalFeesCollected;

    // ── Events ───────────────────────────────────────────────────────────────
    event EmissionSubmitted(uint256 indexed depositId, uint256 amount, string reportCid);
    event ProofUploaded(uint256 indexed depositId, string proofCid, address by);
    event EmissionApproved(uint256 indexed depositId, uint256 fee, uint256 net, uint256 epochId);
    event EmissionRejected(uint256 indexed depositId, address by);

    // ── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyOperator() {
        require(msg.sender == operator, "EmissionsVault: not operator");
        _;
    }

    modifier onlyAdminOperator() {
        require(
            msg.sender == registry.adminOperator(),
            "EmissionsVault: not admin operator"
        );
        _;
    }

    constructor(
        address registry_,
        address usdc_,
        address operator_,
        address stakingPool_
    ) {
        require(registry_    != address(0), "zero registry");
        require(usdc_        != address(0), "zero usdc");
        require(operator_    != address(0), "zero operator");
        require(stakingPool_ != address(0), "zero stakingPool");
        registry    = IRegistryEmissionsVault(registry_);
        usdc        = IERC20(usdc_);
        operator    = operator_;
        stakingPool = stakingPool_;
    }

    // ── Project: submit emissions + earnings report ───────────────────────────
    /// @notice Project submits USDC from their multisig/EOA and attaches earnings report CID.
    function submitEmission(uint256 amount, string calldata earningsReportCid)
        external
        nonReentrant
        onlyOperator
        returns (uint256 depositId)
    {
        require(amount > 0, "zero amount");
        require(bytes(earningsReportCid).length > 0, "missing report CID");

        depositId = _deposits.length;
        _deposits.push(EmissionDeposit({
            amount:           amount,
            earningsReportCid: earningsReportCid,
            proofCid:         "",
            submittedAt:      block.timestamp,
            verifiedAt:       0,
            distributedAt:    0,
            status:           DepositStatus.Pending,
            feeAmount:        0,
            netAmount:        0,
            epochId:          0
        }));

        totalPendingUsdc += amount;
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        emit EmissionSubmitted(depositId, amount, earningsReportCid);
    }

    // ── Admin Operator: upload proof ──────────────────────────────────────────
    function uploadProof(uint256 depositId, string calldata proofCid)
        external
        onlyAdminOperator
    {
        require(depositId < _deposits.length, "not found");
        EmissionDeposit storage d = _deposits[depositId];
        require(d.status == DepositStatus.Pending, "not pending");
        require(bytes(proofCid).length > 0, "missing proof CID");
        d.proofCid    = proofCid;
        d.verifiedAt  = block.timestamp;
        emit ProofUploaded(depositId, proofCid, msg.sender);
    }

    // ── Admin Operator: approve → split fee + send to stakers ────────────────
    /// @notice Distributes approved emission into the StakingPool's current open epoch.
    function approveEmission(uint256 depositId) external nonReentrant onlyAdminOperator {
        require(depositId < _deposits.length, "not found");
        EmissionDeposit storage d = _deposits[depositId];
        require(d.status == DepositStatus.Pending, "not pending");
        require(bytes(d.proofCid).length > 0, "proof not uploaded");

        uint256 fee = (d.amount * FEE_BPS) / BPS_DENOM;
        uint256 net = d.amount - fee;
        uint256 currentEpoch = IStakingPoolDeposit(stakingPool).currentEpoch();
        require(currentEpoch > 0, "no closed epoch yet");
        uint256 epochId = currentEpoch - 1;   // most recently closed epoch

        d.status        = DepositStatus.Distributed;
        d.feeAmount     = fee;
        d.netAmount     = net;
        d.epochId       = epochId;
        d.distributedAt = block.timestamp;

        totalPendingUsdc     -= d.amount;
        totalDistributedUsdc += net;
        totalFeesCollected   += fee;

        // 10 % fee → admin wallet
        usdc.safeTransfer(registry.admin(), fee);

        // 90 % → StakingPool for staker distribution
        usdc.safeApprove(stakingPool, net);
        IStakingPoolDeposit(stakingPool).depositEmission(epochId, net);

        emit EmissionApproved(depositId, fee, net, epochId);
    }

    // ── Admin Operator: reject ────────────────────────────────────────────────
    function rejectEmission(uint256 depositId) external nonReentrant onlyAdminOperator {
        require(depositId < _deposits.length, "not found");
        EmissionDeposit storage d = _deposits[depositId];
        require(d.status == DepositStatus.Pending, "not pending");

        d.status = DepositStatus.Rejected;
        totalPendingUsdc -= d.amount;

        // Return funds to operator
        usdc.safeTransfer(operator, d.amount);
        emit EmissionRejected(depositId, msg.sender);
    }

    // ── Views ─────────────────────────────────────────────────────────────────
    function getDeposit(uint256 id) external view returns (EmissionDeposit memory) {
        require(id < _deposits.length, "not found");
        return _deposits[id];
    }

    function depositCount() external view returns (uint256) { return _deposits.length; }

    function pendingCount() external view returns (uint256 count) {
        for (uint256 i = 0; i < _deposits.length; i++) {
            if (_deposits[i].status == DepositStatus.Pending) count++;
        }
    }
}
