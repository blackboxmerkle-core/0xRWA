// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IRegistry} from "../interfaces/IRegistry.sol";

interface IRWATokenBurnFrom {
    function burnFrom(address account, uint256 amount) external;
}

/// @title BurnReserve
/// @notice Holds USDC from project revenue (10% of submissions).
///         Normal burn:       10% of ICO price per token.
///         Cancellation burn: 15% of ICO price per token (50% premium over normal).
///         When cancelled, the admin must ensure this contract is topped up with enough USDC.
contract BurnReserve is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BURN_PAYOUT_BPS         = 1_000;   // 10 % — normal
    uint256 public constant CANCEL_PAYOUT_BPS       = 1_500;   // 15 % — cancellation (50 % on top)
    uint256 public constant PLATFORM_DEDUCTION_BPS  = 1_000;   // 10 % platform cut on undistributed funds
    uint256 public constant BPS_DENOM               = 10_000;

    IRegistry public immutable registry;
    IERC20    public immutable usdc;
    address   public immutable operator;
    address   public immutable factory;

    // Wired by factory
    IRWATokenBurnFrom public token;
    address public sale;
    address public revenueRouter;
    address public protocolTreasury;

    uint256 public icoPricePerToken;
    uint256 public totalReserve;
    uint256 public totalBurned;

    bool public cancellationActive;  // set by sale when admin cancels post-finalize

    event IcoPriceSet(uint256 price);
    event TokenWired(address token);
    event ReserveDeposited(uint256 amount, uint256 newTotal);
    event TokensBurned(address indexed burner, uint256 tokenAmount, uint256 usdcPayout);
    event CancellationBurn(address indexed burner, uint256 tokenAmount, uint256 usdcPayout);
    event CancellationActivated();
    event UndistributedFundsSettled(uint256 toInvestors, uint256 toPlatform);

    modifier notBanned() {
        registry.requireNotBanned(msg.sender);
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "BurnReserve: not factory");
        _;
    }

    modifier onlySale() {
        require(msg.sender == sale, "BurnReserve: not sale");
        _;
    }

    modifier onlyRevenueRouter() {
        require(msg.sender == revenueRouter, "BurnReserve: not revenue router");
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
        registry = IRegistry(registry_);
        usdc     = IERC20(usdc_);
        operator = operator_;
        factory  = factory_;
    }

    // ─── Factory wiring ──────────────────────────────────────────────────────
    function wireToken(address token_) external onlyFactory {
        require(address(token) == address(0), "already wired");
        token = IRWATokenBurnFrom(token_);
        emit TokenWired(token_);
    }

    function setSale(address _sale) external onlyFactory {
        require(sale == address(0), "already set");
        sale = _sale;
    }

    function setRevenueRouter(address _router) external onlyFactory {
        require(revenueRouter == address(0), "already set");
        revenueRouter = _router;
    }

    function setTreasury(address _treasury) external onlyFactory {
        require(protocolTreasury == address(0), "already set");
        protocolTreasury = _treasury;
    }

    // ─── Sale calls at finalization ───────────────────────────────────────────
    function setIcoPrice(uint256 price) external onlySale {
        require(price > 0, "zero price");
        icoPricePerToken = price;
        emit IcoPriceSet(price);
    }

    /// @notice Called by TokenSale.cancelSale() when raise was already finalized.
    ///         Switches payouts to cancellation rate (15%).
    function activateCancellation() external onlySale {
        cancellationActive = true;
        emit CancellationActivated();
    }

    // ─── Revenue router deposits ──────────────────────────────────────────────
    function depositReserve(uint256 amount) external onlyRevenueRouter {
        require(amount > 0, "zero amount");
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        totalReserve += amount;
        emit ReserveDeposited(amount, totalReserve);
    }

    // ─── Normal investor burn ─────────────────────────────────────────────────
    function burn(uint256 tokenAmount) external nonReentrant notBanned {
        require(!cancellationActive, "BurnReserve: use cancellationBurn");
        require(icoPricePerToken > 0, "BurnReserve: ICO price not set");
        require(tokenAmount > 0, "zero amount");

        uint256 payout = burnPayout(tokenAmount);
        require(payout > 0, "zero payout");
        require(totalReserve >= payout, "BurnReserve: insufficient reserve");

        totalReserve -= payout;
        totalBurned  += tokenAmount;

        token.burnFrom(msg.sender, tokenAmount);
        usdc.safeTransfer(msg.sender, payout);

        emit TokensBurned(msg.sender, tokenAmount, payout);
    }

    /// @notice Cancellation burn: 150% of normal payout (15% of ICO price).
    ///         Only available after admin cancels a finalized project.
    function cancellationBurn(uint256 tokenAmount) external nonReentrant notBanned {
        require(cancellationActive, "BurnReserve: not in cancellation mode");
        require(icoPricePerToken > 0, "BurnReserve: ICO price not set");
        require(tokenAmount > 0, "zero amount");

        uint256 payout = cancellationPayout(tokenAmount);
        require(payout > 0, "zero payout");
        require(totalReserve >= payout, "BurnReserve: insufficient reserve");

        totalReserve -= payout;
        totalBurned  += tokenAmount;

        token.burnFrom(msg.sender, tokenAmount);
        usdc.safeTransfer(msg.sender, payout);

        emit CancellationBurn(msg.sender, tokenAmount, payout);
    }

    // ─── Views ────────────────────────────────────────────────────────────────
    /// @notice Normal payout = tokenAmount * icoPricePerToken * 10% / 1e18
    function burnPayout(uint256 tokenAmount) public view returns (uint256) {
        return (tokenAmount * icoPricePerToken * BURN_PAYOUT_BPS) / (1e18 * BPS_DENOM);
    }

    /// @notice Cancellation payout = tokenAmount * icoPricePerToken * 15% / 1e18
    function cancellationPayout(uint256 tokenAmount) public view returns (uint256) {
        return (tokenAmount * icoPricePerToken * CANCEL_PAYOUT_BPS) / (1e18 * BPS_DENOM);
    }

    function reserveBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
