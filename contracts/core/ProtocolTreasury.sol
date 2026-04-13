// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IRegistry} from "../interfaces/IRegistry.sol";

/// @title ProtocolTreasury
/// @notice Receives 10% protocol fees from every successful TokenSale.
contract ProtocolTreasury {
    using SafeERC20 for IERC20;

    IRegistry public immutable registry;
    IERC20    public immutable usdc;

    uint256 public totalCollected;

    event FeeReceived(address indexed operator, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    modifier onlyAdmin() {
        registry.requireAdmin(msg.sender);
        _;
    }

    modifier onlyTokenSale() {
        // Any registered sale contract may call this
        require(_isRegisteredSale(msg.sender), "ProtocolTreasury: not a sale contract");
        _;
    }

    constructor(address _registry, address _usdc) {
        require(_registry != address(0) && _usdc != address(0), "zero address");
        registry = IRegistry(_registry);
        usdc     = IERC20(_usdc);
    }

    /// @notice Called by TokenSale during finalization. Transfers fee from caller.
    function receiveFee(address operator, uint256 amount) external onlyTokenSale {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        totalCollected += amount;
        emit FeeReceived(operator, amount);
    }

    function withdraw(address to, uint256 amount) external onlyAdmin {
        require(to != address(0), "zero address");
        usdc.safeTransfer(to, amount);
        emit Withdrawn(to, amount);
    }

    function balance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function _isRegisteredSale(address addr) internal view returns (bool) {
        address[] memory operators = registry.getAllOperators();
        for (uint256 i = 0; i < operators.length; i++) {
            if (registry.projectSale(operators[i]) == addr) return true;
        }
        return false;
    }
}
