// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Snapshot} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {IRegistry} from "../interfaces/IRegistry.sol";

interface IRegistryAdmin {
    function admin() external view returns (address);
    function tokenTransfersPaused(address operator) external view returns (bool);
    function projectStatus(address operator) external view returns (uint8);
}

/// @title RWAToken
/// @notice ERC20 with snapshot support. Transfer-gated until sale finalizes.
///         Admin can independently pause transfers per-project.
///         Cancelled project tokens can only be burned for compensation.
contract RWAToken is ERC20, ERC20Snapshot, ERC20Burnable {
    IRegistry public immutable registry;

    address public immutable operator;
    address public immutable factory;

    address public sale;
    address public stakingPool;
    address public burnReserve;

    bool public transfersEnabled;   // set by sale on finalize
    bool public transfersPaused;    // set by admin (overrides transfersEnabled)
    bool public cancelled;          // set by sale when admin cancels

    event TransfersEnabled();
    event TransfersPaused();
    event TransfersUnpaused();
    event ProjectCancelled();
    event SnapshotTaken(uint256 indexed snapshotId);

    modifier onlyFactory() {
        require(msg.sender == factory, "RWAToken: not factory");
        _;
    }

    modifier onlySale() {
        require(msg.sender == sale, "RWAToken: not sale");
        _;
    }

    modifier onlyStakingPool() {
        require(msg.sender == stakingPool, "RWAToken: not staking pool");
        _;
    }

    modifier onlyRegistryAdmin() {
        require(
            msg.sender == IRegistryAdmin(address(registry)).admin(),
            "RWAToken: not admin"
        );
        _;
    }

    constructor(
        string  memory name_,
        string  memory symbol_,
        address registry_,
        address factory_,
        address operator_,
        address sale_,
        uint256 totalSupply_
    ) ERC20(name_, symbol_) {
        require(registry_ != address(0) && factory_  != address(0), "zero address");
        require(operator_ != address(0) && sale_     != address(0), "zero address");
        registry = IRegistry(registry_);
        factory  = factory_;
        operator = operator_;
        sale     = sale_;
        _mint(sale_, totalSupply_);
    }

    // ─── Factory wiring ──────────────────────────────────────────────────────
    function setStakingPool(address _stakingPool) external onlyFactory {
        require(stakingPool == address(0), "already set");
        stakingPool = _stakingPool;
    }

    function setBurnReserve(address _burnReserve) external onlyFactory {
        require(burnReserve == address(0), "already set");
        burnReserve = _burnReserve;
    }

    // ─── Sale lifecycle ──────────────────────────────────────────────────────
    function enableTransfers() external onlySale {
        transfersEnabled = true;
        emit TransfersEnabled();
    }

    function markCancelled() external onlySale {
        cancelled = true;
        emit ProjectCancelled();
    }

    // ─── Admin controls ──────────────────────────────────────────────────────
    function pauseTransfers() external onlyRegistryAdmin {
        transfersPaused = true;
        emit TransfersPaused();
    }

    function unpauseTransfers() external onlyRegistryAdmin {
        transfersPaused = false;
        emit TransfersUnpaused();
    }

    // ─── Staking pool snapshot ────────────────────────────────────────────────
    function snapshot() external onlyStakingPool returns (uint256 snapshotId) {
        snapshotId = _snapshot();
        emit SnapshotTaken(snapshotId);
    }

    // ─── Burn reserve: burn investor tokens ──────────────────────────────────
    function burnFrom(address account, uint256 amount) public override(ERC20Burnable) {
        if (msg.sender == burnReserve) {
            _burn(account, amount);
        } else {
            super.burnFrom(account, amount);
        }
    }

    // ─── Transfer hook ────────────────────────────────────────────────────────
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Snapshot) {
        super._beforeTokenTransfer(from, to, amount);

        // Minting and burning are always allowed
        if (from == address(0) || to == address(0)) return;

        // If cancelled: only burn reserve allowed to move tokens (for compensation burns)
        if (cancelled) {
            require(
                from == burnReserve || to == burnReserve,
                "RWAToken: project cancelled, only burn allowed"
            );
            return;
        }

        // Admin pause: no transfers except staking pool moves and burn reserve
        if (transfersPaused) {
            require(
                from == stakingPool || to == stakingPool ||
                from == burnReserve || to == burnReserve,
                "RWAToken: transfers paused by admin"
            );
            return;
        }

        // Staking pool moves always allowed
        if (from == stakingPool || to == stakingPool) return;

        // Sale distributes tokens post-raise (pre-transfers-enabled phase)
        if (from == sale) return;

        require(transfersEnabled, "RWAToken: transfers not enabled");
        registry.requireNotBanned(from);
        registry.requireNotBanned(to);
    }
}
