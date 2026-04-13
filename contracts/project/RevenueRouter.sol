// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IRegistry} from "../interfaces/IRegistry.sol";

interface IBurnReserveDeposit {
    function depositReserve(uint256 amount) external;
}

/// @title RevenueRouter
/// @notice Single entry point for a mining project operator to submit revenue.
///         Routes 10% to BurnReserve, 90% to operator wallet.
contract RevenueRouter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BURN_RESERVE_BPS = 1_000;  // 10%
    uint256 public constant BPS_DENOM        = 10_000;

    IRegistry public immutable registry;
    IERC20    public immutable usdc;
    address   public immutable operator;
    address   public immutable burnReserve;

    uint256 public totalRevenueSubmitted;

    event RevenueSubmitted(
        address indexed operator,
        uint256 gross,
        uint256 burnReserveShare,
        uint256 operatorShare,
        uint256 timestamp
    );

    modifier onlyOperator() {
        require(msg.sender == operator, "RevenueRouter: not operator");
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
        address burnReserve_
    ) {
        require(registry_    != address(0), "zero registry");
        require(usdc_        != address(0), "zero usdc");
        require(operator_    != address(0), "zero operator");
        require(burnReserve_ != address(0), "zero burnReserve");

        registry    = IRegistry(registry_);
        usdc        = IERC20(usdc_);
        operator    = operator_;
        burnReserve = burnReserve_;
    }

    /// @notice Operator submits gross revenue; 10% goes to BurnReserve, 90% returned to operator
    function submitRevenue(uint256 grossAmount) external nonReentrant onlyOperator notBanned {
        require(grossAmount > 0, "zero amount");

        uint256 burnShare   = (grossAmount * BURN_RESERVE_BPS) / BPS_DENOM;
        uint256 operatorNet = grossAmount - burnShare;

        totalRevenueSubmitted += grossAmount;

        // Pull full amount from operator
        usdc.safeTransferFrom(msg.sender, address(this), grossAmount);

        // Route burn share — first approve burnReserve to pull from this contract
        usdc.safeApprove(burnReserve, burnShare);
        IBurnReserveDeposit(burnReserve).depositReserve(burnShare);

        // Return net to operator
        usdc.safeTransfer(operator, operatorNet);

        emit RevenueSubmitted(operator, grossAmount, burnShare, operatorNet, block.timestamp);
    }
}
