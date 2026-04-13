// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {IERC20}        from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20}     from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IRegistryBurnVault {
    function admin() external view returns (address);
    function requireNotBanned(address addr) external view;
}

interface IRWATokenBalance {
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function burnFrom(address account, uint256 amount) external;
}

/// @title BurnVault
/// @notice Funded at raise finalization with two fixed buckets:
///           • burnBucket     = 10 % of gross raise  (investors burn tokens to receive pro-rata share)
///           • compensationBucket = 5 % of gross raise (released on project cancellation)
///
///         Cancellation payout order (per spec):
///           1. burnBucket balance  → all token holders pro-rata by holding
///           2. compensationBucket  → all token holders pro-rata
///           3. Remaining DisbursementScheduler balance → investors (handled separately)
contract BurnVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BURN_BPS         = 1_000;   // 10 % of raise
    uint256 public constant COMPENSATION_BPS = 500;     // 5 %  of raise
    uint256 public constant BPS_DENOM        = 10_000;

    // ── Immutables ────────────────────────────────────────────────────────────
    IRegistryBurnVault public immutable registry;
    IERC20             public immutable usdc;
    address            public immutable operator;
    address            public immutable factory;

    // ── Wired by factory ─────────────────────────────────────────────────────
    IRWATokenBalance public token;
    address          public sale;    // only sale can fund + trigger cancellation

    // ── Buckets ───────────────────────────────────────────────────────────────
    uint256 public burnBucketBalance;           // USDC available for token burns
    uint256 public compensationBucketBalance;   // USDC reserved for cancellation
    uint256 public totalBurnedTokens;

    bool public cancellationActive;
    bool public burnBucketDistributed;
    bool public compensationDistributed;

    // ── Events ────────────────────────────────────────────────────────────────
    event Funded(uint256 burnAmount, uint256 compensationAmount);
    event TokensBurned(address indexed burner, uint256 tokenAmount, uint256 usdcPayout);
    event CancellationActivated();
    event BurnBucketDistributed(address indexed holder, uint256 amount);
    event CompensationDistributed(address indexed holder, uint256 amount);

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyFactory() {
        require(msg.sender == factory, "BurnVault: not factory");
        _;
    }

    modifier onlySale() {
        require(msg.sender == sale, "BurnVault: not sale");
        _;
    }

    modifier notBanned() {
        registry.requireNotBanned(msg.sender);
        _;
    }

    constructor(
        address registry_,
        address usdc_,
        address operator_,
        address factory_
    ) {
        require(registry_ != address(0) && usdc_     != address(0), "zero address");
        require(operator_ != address(0) && factory_  != address(0), "zero address");
        registry = IRegistryBurnVault(registry_);
        usdc     = IERC20(usdc_);
        operator = operator_;
        factory  = factory_;
    }

    // ── Factory wiring ────────────────────────────────────────────────────────
    function wireToken(address token_) external onlyFactory {
        require(address(token) == address(0), "already set");
        token = IRWATokenBalance(token_);
    }

    function wireSale(address sale_) external onlyFactory {
        require(sale == address(0), "already set");
        sale = sale_;
    }

    address public revenueRouter;

    function wireRevenueRouter(address router_) external onlyFactory {
        require(revenueRouter == address(0), "already set");
        revenueRouter = router_;
    }

    // ── Revenue router: top up burn bucket from ongoing revenue ───────────────
    /// @notice Called by RevenueRouter. Adds to the burn bucket so investors can
    ///         burn at increasing value as the project generates revenue.
    function depositReserve(uint256 amount) external nonReentrant {
        require(msg.sender == revenueRouter, "BurnVault: not revenue router");
        require(!cancellationActive, "BurnVault: cancelled");
        require(amount > 0, "zero amount");
        burnBucketBalance += amount;
        usdc.safeTransferFrom(msg.sender, address(this), amount);
    }

    // ── Funded at finalization ────────────────────────────────────────────────
    /// @notice Called by TokenSale.finalize().
    ///         grossRaise is sent; vault splits into burn (10%) + comp (5%) buckets.
    function fund(uint256 grossRaise) external onlySale {
        uint256 burnAmt = (grossRaise * BURN_BPS)         / BPS_DENOM;
        uint256 compAmt = (grossRaise * COMPENSATION_BPS) / BPS_DENOM;
        uint256 total   = burnAmt + compAmt;

        burnBucketBalance         = burnAmt;
        compensationBucketBalance = compAmt;

        usdc.safeTransferFrom(msg.sender, address(this), total);
        emit Funded(burnAmt, compAmt);
    }

    // ── Investor: burn tokens for USDC (normal operation) ─────────────────────
    /// @notice Investor burns tokens and receives proportional share of burnBucket.
    ///         payout = (tokenAmount / totalSupply) * burnBucketBalance
    function burn(uint256 tokenAmount) external nonReentrant notBanned {
        require(!cancellationActive, "BurnVault: use claimCancellationShare");
        require(burnBucketBalance > 0,  "BurnVault: empty burn bucket");
        require(tokenAmount > 0,        "zero amount");

        uint256 totalSupply = token.totalSupply();
        require(totalSupply > 0, "zero supply");

        uint256 payout = (tokenAmount * burnBucketBalance) / totalSupply;
        require(payout > 0, "zero payout");
        require(burnBucketBalance >= payout, "insufficient balance");

        burnBucketBalance -= payout;
        totalBurnedTokens += tokenAmount;

        token.burnFrom(msg.sender, tokenAmount);
        usdc.safeTransfer(msg.sender, payout);

        emit TokensBurned(msg.sender, tokenAmount, payout);
    }

    // ── Cancellation: triggered by TokenSale ─────────────────────────────────
    function activateCancellation() external onlySale {
        cancellationActive = true;
        emit CancellationActivated();
    }

    /// @notice Step 1: investor claims their share of the burn bucket on cancellation.
    ///         Pro-rata by token holdings (NOT burned — tokens transferred to vault instead).
    function claimBurnBucketShare() external nonReentrant notBanned {
        require(cancellationActive,       "not cancelled");
        require(!burnBucketDistributed,   "burn bucket fully distributed");
        require(burnBucketBalance > 0,    "empty");

        uint256 holderBalance = token.balanceOf(msg.sender);
        require(holderBalance > 0, "no tokens held");

        uint256 totalSupply = token.totalSupply();
        uint256 payout      = (holderBalance * burnBucketBalance) / totalSupply;
        require(payout > 0, "zero payout");

        burnBucketBalance -= payout;
        // Don't burn tokens here — tokens are already worthless/cancelled
        usdc.safeTransfer(msg.sender, payout);
        emit BurnBucketDistributed(msg.sender, payout);
    }

    /// @notice Step 2: investor claims their share of the compensation bucket.
    function claimCompensationShare() external nonReentrant notBanned {
        require(cancellationActive,         "not cancelled");
        require(compensationBucketBalance > 0, "empty");

        uint256 holderBalance = token.balanceOf(msg.sender);
        require(holderBalance > 0, "no tokens held");

        uint256 totalSupply = token.totalSupply();
        uint256 payout      = (holderBalance * compensationBucketBalance) / totalSupply;
        require(payout > 0, "zero payout");

        compensationBucketBalance -= payout;
        usdc.safeTransfer(msg.sender, payout);
        emit CompensationDistributed(msg.sender, payout);
    }

    // ── Views ─────────────────────────────────────────────────────────────────
    function burnPayout(uint256 tokenAmount) public view returns (uint256) {
        uint256 totalSupply = token.totalSupply();
        if (totalSupply == 0 || burnBucketBalance == 0) return 0;
        return (tokenAmount * burnBucketBalance) / totalSupply;
    }

    function cancellationShare(address holder) external view returns (uint256 burnShare, uint256 compShare) {
        uint256 totalSupply = token.totalSupply();
        if (totalSupply == 0) return (0, 0);
        uint256 bal  = token.balanceOf(holder);
        burnShare    = (bal * burnBucketBalance)         / totalSupply;
        compShare    = (bal * compensationBucketBalance) / totalSupply;
    }
}
