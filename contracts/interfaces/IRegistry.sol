// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRegistry {
    // ── Roles ────────────────────────────────────────────────────────────────
    function admin() external view returns (address);
    function adminOperator() external view returns (address);
    function platformExec() external view returns (address);
    function factory() external view returns (address);
    function protocolTreasury() external view returns (address);

    // ── Project status / access ──────────────────────────────────────────────
    function isApprovedProject(address operator) external view returns (bool);
    function isProjectOperator(address addr) external view returns (bool);
    function isAdminOperator(address addr) external view returns (bool);
    function isPlatformExec(address addr) external view returns (bool);
    function projectStatus(address operator) external view returns (uint8);

    // ── Per-project convenience mappings ────────────────────────────────────
    function projectToken(address operator) external view returns (address);
    function projectSale(address operator) external view returns (address);
    function projectStaking(address operator) external view returns (address);
    function projectBurnVault(address operator) external view returns (address);
    function projectRevenueRouter(address operator) external view returns (address);
    function projectDisbursement(address operator) external view returns (address);
    function projectEmissionsVault(address operator) external view returns (address);
    function projectProductionOracle(address operator) external view returns (address);

    // ── Per-project admin flags ──────────────────────────────────────────────
    function isBanned(address addr) external view returns (bool);
    function tokenTransfersPaused(address operator) external view returns (bool);
    function emissionsPaused(address operator) external view returns (bool);
    function disbursementPaused(address operator) external view returns (bool);
    function disbursementInterval(address operator) external view returns (uint8);

    // ── Cancellation approval ────────────────────────────────────────────────
    function cancellationApprovedAO(address operator) external view returns (bool);
    function cancellationApprovedExec(address operator) external view returns (bool);

    // ── Access-control helpers ───────────────────────────────────────────────
    function requireNotBanned(address addr) external view;
    function requireAdmin(address addr) external view;
    function requireApprovedProject(address addr) external view;

    // ── Views ────────────────────────────────────────────────────────────────
    function getProjectContracts(address operator) external view returns (
        address token,
        address sale,
        address staking,
        address burnVault,
        address revenueRouter,
        address disbursement,
        address emissionsVault,
        address productionOracle
    );
    function getAllOperators() external view returns (address[] memory);

    // ── Factory registration ─────────────────────────────────────────────────
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
