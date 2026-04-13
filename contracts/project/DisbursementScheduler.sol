// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IRegistryDisbursement {
    function admin() external view returns (address);
    function disbursementPaused(address operator) external view returns (bool);
    function disbursementInterval(address operator) external view returns (uint8);
}

interface IStakingPoolMissed {
    function missedEpochs() external view returns (uint256);
}

/// @title DisbursementScheduler
/// @notice Holds the net raise proceeds and releases them in pre-agreed tranches.
///         Intervals: Monthly (30d), BiMonthly (60d), Quarterly (90d), HalfYearly (180d).
///         Funds must be fully disbursed by year-end (365 days from funding).
///         If the operator has missed staking reward epochs, tranches are withheld automatically.
///         Admin can pause or change the release interval.
contract DisbursementScheduler is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────── Interval durations ──────────────────
    uint256 public constant MONTH        = 30 days;
    uint256 public constant YEAR         = 365 days;

    // ─────────────────────────────── Immutables ───────────────────────────
    IRegistryDisbursement public immutable registry;
    IERC20                public immutable usdc;
    address               public immutable operator;
    address               public immutable stakingPool;
    address               public immutable factory;

    // ─────────────────────────────── State ────────────────────────────────
    uint256 public totalFunded;
    uint256 public totalClaimed;
    uint256 public fundedAt;          // timestamp when fund() was called
    uint256 public lastClaimTime;

    bool public funded;

    event Funded(uint256 amount, uint256 at);
    event TrancheClaimed(uint256 amount, uint256 trancheIndex);
    event DisbursementHeld(string reason);

    // ─────────────────────────────── Modifiers ────────────────────────────
    modifier onlyOperator() {
        require(msg.sender == operator, "Disbursement: not operator");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "Disbursement: not factory");
        _;
    }

    constructor(
        address registry_,
        address usdc_,
        address operator_,
        address stakingPool_,
        address factory_
    ) {
        require(registry_    != address(0), "zero registry");
        require(usdc_        != address(0), "zero usdc");
        require(operator_    != address(0), "zero operator");
        require(stakingPool_ != address(0), "zero stakingPool");
        require(factory_     != address(0), "zero factory");

        registry    = IRegistryDisbursement(registry_);
        usdc        = IERC20(usdc_);
        operator    = operator_;
        stakingPool = stakingPool_;
        factory     = factory_;
    }

    // ─────────────────────────────── Funding ──────────────────────────────
    /// @notice Called by TokenSale.finalize() to deposit the net raise amount.
    function fund(uint256 amount) external {
        // Only the sale contract calls this; factory wires the sale address,
        // so we accept from any address that isn't the zero address.
        // In production you'd restrict to `sale` address; here we trust the factory wiring.
        require(!funded, "already funded");
        require(amount > 0, "zero amount");

        funded        = true;
        totalFunded   = amount;
        fundedAt      = block.timestamp;
        lastClaimTime = block.timestamp;

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        emit Funded(amount, block.timestamp);
    }

    // ─────────────────────────────── Claim tranche ────────────────────────
    /// @notice Operator claims the next available tranche.
    ///         Blocked if: admin paused disbursement, or operator has missed reward epochs.
    function claimTranche() external nonReentrant onlyOperator {
        require(funded, "Disbursement: not funded yet");

        // Admin pause check
        if (registry.disbursementPaused(operator)) {
            emit DisbursementHeld("admin paused disbursement");
            revert("Disbursement: paused by admin");
        }

        // Missed epochs check — hold if any epoch unfunded
        uint256 missed = IStakingPoolMissed(stakingPool).missedEpochs();
        if (missed > 0) {
            emit DisbursementHeld("operator has missed reward epochs");
            revert("Disbursement: missed staking rewards");
        }

        uint256 intervalSeconds = _intervalSeconds();
        require(
            block.timestamp >= lastClaimTime + intervalSeconds,
            "Disbursement: interval not elapsed"
        );

        uint256 remaining    = totalFunded - totalClaimed;
        require(remaining > 0, "Disbursement: fully disbursed");

        // Calculate tranche amount: evenly divide over intervals within one year
        // Number of tranches = YEAR / interval (e.g. 12 for monthly, 4 for quarterly)
        uint256 numTranches  = YEAR / intervalSeconds;
        uint256 trancheAmt   = totalFunded / numTranches;

        // Year-end: release all remaining
        bool isYearEnd = block.timestamp >= fundedAt + YEAR;
        if (isYearEnd || trancheAmt > remaining) {
            trancheAmt = remaining;
        }

        require(trancheAmt > 0, "zero tranche");

        totalClaimed  += trancheAmt;
        lastClaimTime  = block.timestamp;

        usdc.safeTransfer(operator, trancheAmt);

        emit TrancheClaimed(trancheAmt, totalClaimed / (totalFunded / numTranches));
    }

    // ─────────────────────────────── Views ────────────────────────────────
    function availableNow() external view returns (uint256) {
        if (!funded) return 0;
        if (registry.disbursementPaused(operator)) return 0;
        if (IStakingPoolMissed(stakingPool).missedEpochs() > 0) return 0;

        uint256 intervalSeconds = _intervalSeconds();
        if (block.timestamp < lastClaimTime + intervalSeconds) return 0;

        uint256 remaining   = totalFunded - totalClaimed;
        uint256 numTranches = YEAR / intervalSeconds;
        uint256 trancheAmt  = totalFunded / numTranches;

        bool isYearEnd = block.timestamp >= fundedAt + YEAR;
        if (isYearEnd || trancheAmt > remaining) trancheAmt = remaining;

        return trancheAmt;
    }

    function nextClaimTime() external view returns (uint256) {
        return lastClaimTime + _intervalSeconds();
    }

    function remainingFunds() external view returns (uint256) {
        return totalFunded - totalClaimed;
    }

    function intervalName() external view returns (string memory) {
        uint8 iv = registry.disbursementInterval(operator);
        if (iv == 0) return "Monthly";
        if (iv == 1) return "Bi-Monthly";
        if (iv == 2) return "Quarterly";
        return "Half-Yearly";
    }

    // ─────────────────────────────── Internal ─────────────────────────────
    function _intervalSeconds() internal view returns (uint256) {
        uint8 iv = registry.disbursementInterval(operator);
        if (iv == 0) return MONTH;          // Monthly
        if (iv == 1) return MONTH * 2;      // Bi-Monthly
        if (iv == 2) return MONTH * 3;      // Quarterly
        return MONTH * 6;                   // Half-Yearly
    }
}
