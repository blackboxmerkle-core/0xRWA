// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {IRegistry}              from "../interfaces/IRegistry.sol";
import {RWAToken}               from "../project/RWAToken.sol";
import {TokenSale}              from "../project/TokenSale.sol";
import {StakingPool}            from "../project/StakingPool.sol";
import {BurnVault}              from "../project/BurnVault.sol";
import {EmissionsVault}         from "../project/EmissionsVault.sol";
import {ProductionOracle}       from "../project/ProductionOracle.sol";
import {RevenueRouter}          from "../project/RevenueRouter.sol";
import {DisbursementScheduler}  from "../project/DisbursementScheduler.sol";
import {ProjectDocuments}       from "../project/ProjectDocuments.sol";

interface IRegistryFactory {
    function protocolTreasury() external view returns (address);
    function registerProjectContracts(
        address operator,
        address token,
        address sale,
        address staking,
        address burnVault,
        address revenueRouter,
        address disbursement,
        address emissionsVault,
        address productionOracle
    ) external;
}

/// @title ProjectFactory
/// @notice Atomically deploys the full per-project contract suite and wires cross-references.
///
/// Deploy order:
///   1. BurnVault
///   2. TokenSale  (takes burnVault address)
///   3. RWAToken   (mints totalSupply → sale)
///   4. StakingPool
///   5. DisbursementScheduler
///   6. EmissionsVault
///   7. ProductionOracle
///   8. RevenueRouter
///   9. ProjectDocuments
///  10. Wire cross-references
///  11. Register in registry
contract ProjectFactory {
    IRegistry public immutable registry;
    address   public immutable usdc;

    event ProjectDeployed(
        address indexed operator,
        address token,
        address sale,
        address staking,
        address burnVault,
        address revenueRouter,
        address disbursement,
        address emissionsVault,
        address productionOracle,
        address documents
    );

    modifier onlyApprovedProject() {
        registry.requireApprovedProject(msg.sender);
        _;
    }

    modifier notBanned() {
        registry.requireNotBanned(msg.sender);
        _;
    }

    constructor(address registry_, address usdc_) {
        require(registry_ != address(0) && usdc_ != address(0), "zero address");
        registry = IRegistry(registry_);
        usdc     = usdc_;
    }

    /// @notice Called by an approved mining project operator to deploy their contract suite.
    /// @param tokenName         ERC20 name
    /// @param tokenSymbol       ERC20 symbol
    /// @param totalSupply       Total tokens to mint (18 decimals)
    /// @param salePricePerToken USDC (6 dec) per 1e18 token units
    /// @param saleDeadline      Unix timestamp when sale closes (closing date)
    function deployProject(
        string calldata tokenName,
        string calldata tokenSymbol,
        uint256 totalSupply,
        uint256 salePricePerToken,
        uint256 saleDeadline
    ) external onlyApprovedProject notBanned returns (
        address tokenAddr,
        address saleAddr,
        address stakingAddr,
        address burnVaultAddr,
        address revenueRouterAddr,
        address disbursementAddr,
        address emissionsVaultAddr,
        address productionOracleAddr,
        address documentsAddr
    ) {
        address operator    = msg.sender;
        address factoryAddr = address(this);

        // ── 1: BurnVault ──────────────────────────────────────────────────
        // token + sale wired after deployment
        BurnVault burnVaultContract = new BurnVault(
            address(registry),
            usdc,
            operator,
            factoryAddr
        );

        // ── 2: TokenSale (takes burnVault address) ────────────────────────
        TokenSale saleContract = new TokenSale(
            address(registry),
            usdc,
            operator,
            address(burnVaultContract),
            factoryAddr,
            salePricePerToken,
            saleDeadline
        );

        // ── 3: RWAToken (mints totalSupply to sale) ───────────────────────
        RWAToken tokenContract = new RWAToken(
            tokenName,
            tokenSymbol,
            address(registry),
            factoryAddr,
            operator,
            address(saleContract),
            totalSupply
        );

        // ── 4: StakingPool ────────────────────────────────────────────────
        StakingPool stakingContract = new StakingPool(
            address(registry),
            address(tokenContract),
            usdc,
            operator
        );

        // ── 5: DisbursementScheduler ──────────────────────────────────────
        DisbursementScheduler disbursementContract = new DisbursementScheduler(
            address(registry),
            usdc,
            operator,
            address(stakingContract),
            factoryAddr
        );

        // ── 6: EmissionsVault ─────────────────────────────────────────────
        EmissionsVault emissionsVaultContract = new EmissionsVault(
            address(registry),
            usdc,
            operator,
            address(stakingContract)
        );

        // ── 7: ProductionOracle ───────────────────────────────────────────
        ProductionOracle productionOracleContract = new ProductionOracle(
            operator,
            address(registry)
        );

        // ── 8: RevenueRouter ──────────────────────────────────────────────
        // Routes mining revenue: portion → BurnVault, remainder → operator
        RevenueRouter revenueRouterContract = new RevenueRouter(
            address(registry),
            usdc,
            operator,
            address(burnVaultContract)
        );

        // ── 9: ProjectDocuments ───────────────────────────────────────────
        ProjectDocuments documentsContract = new ProjectDocuments(
            address(registry),
            operator
        );

        // ── 10: Wire cross-references ─────────────────────────────────────
        // BurnVault: wire token, sale, and revenue router
        burnVaultContract.wireToken(address(tokenContract));
        burnVaultContract.wireSale(address(saleContract));
        burnVaultContract.wireRevenueRouter(address(revenueRouterContract));

        // TokenSale: wire token, disbursement, production oracle
        saleContract.wireToken(address(tokenContract));
        saleContract.wireDisbursement(address(disbursementContract));
        saleContract.wireProductionOracle(address(productionOracleContract));

        // RWAToken: wire staking pool + burn vault
        tokenContract.setStakingPool(address(stakingContract));
        tokenContract.setBurnReserve(address(burnVaultContract));

        // ── 11: Register in registry ──────────────────────────────────────
        IRegistryFactory(address(registry)).registerProjectContracts(
            operator,
            address(tokenContract),
            address(saleContract),
            address(stakingContract),
            address(burnVaultContract),
            address(revenueRouterContract),
            address(disbursementContract),
            address(emissionsVaultContract),
            address(productionOracleContract)
        );

        emit ProjectDeployed(
            operator,
            address(tokenContract),
            address(saleContract),
            address(stakingContract),
            address(burnVaultContract),
            address(revenueRouterContract),
            address(disbursementContract),
            address(emissionsVaultContract),
            address(productionOracleContract),
            address(documentsContract)
        );

        return (
            address(tokenContract),
            address(saleContract),
            address(stakingContract),
            address(burnVaultContract),
            address(revenueRouterContract),
            address(disbursementContract),
            address(emissionsVaultContract),
            address(productionOracleContract),
            address(documentsContract)
        );
    }
}
