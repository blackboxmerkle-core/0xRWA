// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

interface ITokenSaleExecute {
    function executeCancellation() external;
}

/// @title RWARegistry
/// @notice Root authority. Tracks project status, roles, per-project admin controls,
///         and two-step operator-requested cancellation approval (AO → PlatformExec).
contract RWARegistry {
    // ─────────────────────────────────────────────────────────── Enums ───────
    enum ProjectStatus { Pending, Active, Paused, Cancelled, Withdrawn }

    enum DisbursementInterval { Monthly, BiMonthly, Quarterly, HalfYearly }

    // ─────────────────────────────────────────────────────────── State ───────
    address public admin;
    address public pendingAdmin;
    address public adminOperator;   // document reviewer / verifier
    address public platformExec;    // approves operator-proposed changes + cancellation

    address public factory;
    address public protocolTreasury;

    struct ProjectContracts {
        address token;
        address sale;
        address staking;
        address burnVault;
        address revenueRouter;
        address disbursement;
        address emissionsVault;
        address productionOracle;
        string  name;
        bool    active;
    }

    mapping(address => ProjectStatus)        public projectStatus;
    mapping(address => ProjectContracts)     private _projectContracts;
    mapping(address => bool)                 public isBanned;

    // Convenience mappings (mirror ProjectContracts fields)
    mapping(address => address) public projectToken;
    mapping(address => address) public projectSale;
    mapping(address => address) public projectStaking;
    mapping(address => address) public projectBurnVault;
    mapping(address => address) public projectRevenueRouter;
    mapping(address => address) public projectDisbursement;
    mapping(address => address) public projectEmissionsVault;
    mapping(address => address) public projectProductionOracle;

    // Per-project admin controls
    mapping(address => bool)                 public tokenTransfersPaused;
    mapping(address => bool)                 public emissionsPaused;
    mapping(address => bool)                 public disbursementPaused;
    mapping(address => DisbursementInterval) public disbursementInterval;

    // Operator-requested cancellation: requires AO approval then exec approval
    mapping(address => bool) public cancellationApprovedAO;
    mapping(address => bool) public cancellationApprovedExec;

    address[] private _operators;

    // ─────────────────────────────────────────────────────────── Events ──────
    event ProjectApproved(address indexed operator, string name);
    event ProjectRevoked(address indexed operator);
    event ProjectCancelled(address indexed operator);
    event ProjectWithdrawn(address indexed operator);
    event AddressBanned(address indexed target, address indexed by);
    event AddressUnbanned(address indexed target, address indexed by);
    event BulkBanned(uint256 count, address indexed by);
    event AdminTransferInitiated(address indexed newAdmin);
    event AdminTransferCompleted(address indexed newAdmin);
    event FactorySet(address factory);
    event TreasurySet(address treasury);
    event AdminOperatorSet(address indexed op);
    event PlatformExecSet(address indexed exec);
    event ProjectContractsRegistered(address indexed operator);
    event TokenTransfersPaused(address indexed operator);
    event TokenTransfersUnpaused(address indexed operator);
    event EmissionsPaused(address indexed operator);
    event EmissionsUnpaused(address indexed operator);
    event DisbursementPaused(address indexed operator);
    event DisbursementUnpaused(address indexed operator);
    event DisbursementIntervalChanged(address indexed operator, DisbursementInterval interval);
    event CancellationApprovedByAO(address indexed operator, address indexed by);
    event CancellationApprovedByExec(address indexed operator, address indexed by);
    event CancellationExecuted(address indexed operator);

    // ──────────────────────────────────────────────────────── Modifiers ──────
    modifier onlyAdmin() {
        require(msg.sender == admin, "RWARegistry: not admin");
        _;
    }

    modifier onlyAdminOperator() {
        require(msg.sender == adminOperator, "RWARegistry: not admin operator");
        _;
    }

    modifier onlyPlatformExec() {
        require(msg.sender == platformExec, "RWARegistry: not platform exec");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "RWARegistry: not factory");
        _;
    }

    // ─────────────────────────────────────────────────────── Constructor ──────
    constructor(address _admin) {
        require(_admin != address(0), "zero admin");
        admin = _admin;
    }

    // ──────────────────────────────────────────────── Admin management ──────
    function initiateAdminTransfer(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "zero address");
        pendingAdmin = newAdmin;
        emit AdminTransferInitiated(newAdmin);
    }

    function acceptAdminTransfer() external {
        require(msg.sender == pendingAdmin, "not pending admin");
        admin = pendingAdmin;
        pendingAdmin = address(0);
        emit AdminTransferCompleted(admin);
    }

    function setAdminOperator(address op) external onlyAdmin {
        require(op != address(0), "zero address");
        adminOperator = op;
        emit AdminOperatorSet(op);
    }

    function setPlatformExec(address exec) external onlyAdmin {
        require(exec != address(0), "zero address");
        platformExec = exec;
        emit PlatformExecSet(exec);
    }

    // ──────────────────────────────────────────── System configuration ──────
    function setFactory(address _factory) external onlyAdmin {
        require(_factory != address(0), "zero address");
        factory = _factory;
        emit FactorySet(_factory);
    }

    function setTreasury(address _treasury) external onlyAdmin {
        require(_treasury != address(0), "zero address");
        protocolTreasury = _treasury;
        emit TreasurySet(_treasury);
    }

    // ──────────────────────────────────────────── Project management ──────
    function registerPendingProject(address operator) external onlyAdmin {
        require(operator != address(0), "zero address");
        require(projectStatus[operator] == ProjectStatus.Pending || _isUnregistered(operator),
            "already registered");
        projectStatus[operator] = ProjectStatus.Pending;
    }

    function approveProject(address operator, string calldata name) external onlyAdmin {
        require(operator != address(0), "zero address");
        require(!isBanned[operator], "operator is banned");
        projectStatus[operator] = ProjectStatus.Active;
        _projectContracts[operator].name = name;

        // Only push to list if not already present
        bool found = false;
        for (uint256 i = 0; i < _operators.length; i++) {
            if (_operators[i] == operator) { found = true; break; }
        }
        if (!found) _operators.push(operator);
        _projectContracts[operator].active = true;
        emit ProjectApproved(operator, name);
    }

    function revokeProject(address operator) external onlyAdmin {
        require(_projectContracts[operator].active, "not active");
        _projectContracts[operator].active = false;
        projectStatus[operator] = ProjectStatus.Paused;
        emit ProjectRevoked(operator);
    }

    /// @notice Admin-immediate cancellation (no approval needed).
    function cancelProject(address operator) external onlyAdmin {
        ProjectStatus status = projectStatus[operator];
        require(
            status == ProjectStatus.Active || status == ProjectStatus.Paused,
            "cannot cancel"
        );
        projectStatus[operator] = ProjectStatus.Cancelled;
        _projectContracts[operator].active = false;
        emit ProjectCancelled(operator);
    }

    /// @notice Withdraws a project before launch (no funds received yet).
    function withdrawProject(address operator) external onlyAdmin {
        require(projectStatus[operator] == ProjectStatus.Active, "not active");
        projectStatus[operator] = ProjectStatus.Withdrawn;
        _projectContracts[operator].active = false;
        emit ProjectWithdrawn(operator);
    }

    // ─────────────────────────── Cancellation approval workflow ──────────────
    /// @notice Step 1: Admin Operator approves an operator-requested cancellation.
    function approveCancellationAO(address operator) external onlyAdminOperator {
        require(
            projectStatus[operator] == ProjectStatus.Active || projectStatus[operator] == ProjectStatus.Paused,
            "project not cancellable"
        );
        require(!cancellationApprovedAO[operator], "already approved by AO");
        cancellationApprovedAO[operator] = true;
        emit CancellationApprovedByAO(operator, msg.sender);
    }

    /// @notice Step 2: Platform Exec approves. If AO has already approved, cancellation executes.
    function approveCancellationExec(address operator) external onlyPlatformExec {
        require(
            projectStatus[operator] == ProjectStatus.Active || projectStatus[operator] == ProjectStatus.Paused,
            "project not cancellable"
        );
        require(cancellationApprovedAO[operator], "AO approval required first");
        require(!cancellationApprovedExec[operator], "already approved by exec");

        cancellationApprovedExec[operator] = true;
        emit CancellationApprovedByExec(operator, msg.sender);

        // Execute cancellation
        projectStatus[operator] = ProjectStatus.Cancelled;
        _projectContracts[operator].active = false;

        address sale = projectSale[operator];
        if (sale != address(0)) {
            ITokenSaleExecute(sale).executeCancellation();
        }
        emit CancellationExecuted(operator);
    }

    // ─────────────────────────── Per-project admin controls ──────────────────
    function pauseTokenTransfers(address operator) external onlyAdmin {
        tokenTransfersPaused[operator] = true;
        emit TokenTransfersPaused(operator);
    }

    function unpauseTokenTransfers(address operator) external onlyAdmin {
        tokenTransfersPaused[operator] = false;
        emit TokenTransfersUnpaused(operator);
    }

    function pauseEmissions(address operator) external onlyAdmin {
        emissionsPaused[operator] = true;
        emit EmissionsPaused(operator);
    }

    function unpauseEmissions(address operator) external onlyAdmin {
        emissionsPaused[operator] = false;
        emit EmissionsUnpaused(operator);
    }

    function pauseDisbursement(address operator) external onlyAdmin {
        disbursementPaused[operator] = true;
        emit DisbursementPaused(operator);
    }

    function unpauseDisbursement(address operator) external onlyAdmin {
        disbursementPaused[operator] = false;
        emit DisbursementUnpaused(operator);
    }

    function setDisbursementInterval(address operator, DisbursementInterval interval) external onlyAdmin {
        disbursementInterval[operator] = interval;
        emit DisbursementIntervalChanged(operator, interval);
    }

    // ────────────────────────────── Factory registration ─────────────────────
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
    ) external onlyFactory {
        require(projectStatus[operator] == ProjectStatus.Active, "operator not active");

        ProjectContracts storage pc = _projectContracts[operator];
        pc.token           = token;
        pc.sale            = sale;
        pc.staking         = staking;
        pc.burnVault       = burnVault;
        pc.revenueRouter   = revenueRouter;
        pc.disbursement    = disbursement;
        pc.emissionsVault  = emissionsVault;
        pc.productionOracle = productionOracle;
        pc.active          = true;

        // Convenience mappings
        projectToken[operator]           = token;
        projectSale[operator]            = sale;
        projectStaking[operator]         = staking;
        projectBurnVault[operator]       = burnVault;
        projectRevenueRouter[operator]   = revenueRouter;
        projectDisbursement[operator]    = disbursement;
        projectEmissionsVault[operator]  = emissionsVault;
        projectProductionOracle[operator] = productionOracle;

        emit ProjectContractsRegistered(operator);
    }

    // ────────────────────────────────────────────────── Ban management ──────
    function banAddress(address target) external onlyAdmin {
        require(!isBanned[target], "already banned");
        isBanned[target] = true;
        emit AddressBanned(target, msg.sender);
    }

    function unbanAddress(address target) external onlyAdmin {
        require(isBanned[target], "not banned");
        isBanned[target] = false;
        emit AddressUnbanned(target, msg.sender);
    }

    function bulkBan(address[] calldata targets) external onlyAdmin {
        for (uint256 i = 0; i < targets.length; i++) {
            isBanned[targets[i]] = true;
        }
        emit BulkBanned(targets.length, msg.sender);
    }

    function bulkUnban(address[] calldata targets) external onlyAdmin {
        for (uint256 i = 0; i < targets.length; i++) {
            isBanned[targets[i]] = false;
        }
    }

    // ───────────────────────────────────────────────── View / helpers ──────
    function requireNotBanned(address addr) external view {
        require(!isBanned[addr], "RWARegistry: address is banned");
    }

    function requireAdmin(address addr) external view {
        require(addr == admin, "RWARegistry: not admin");
    }

    function requireApprovedProject(address addr) external view {
        require(
            projectStatus[addr] == ProjectStatus.Active,
            "RWARegistry: not active project"
        );
    }

    function isProjectOperator(address addr) external view returns (bool) {
        return projectStatus[addr] == ProjectStatus.Active;
    }

    function isApprovedProject(address addr) external view returns (bool) {
        return projectStatus[addr] == ProjectStatus.Active;
    }

    function isAdminOperator(address addr) external view returns (bool) {
        return addr == adminOperator;
    }

    function isPlatformExec(address addr) external view returns (bool) {
        return addr == platformExec;
    }

    function getProjectContracts(address operator) external view returns (
        address token,
        address sale,
        address staking,
        address burnVault,
        address revenueRouter,
        address disbursement,
        address emissionsVault,
        address productionOracle
    ) {
        ProjectContracts storage pc = _projectContracts[operator];
        return (
            pc.token, pc.sale, pc.staking, pc.burnVault,
            pc.revenueRouter, pc.disbursement, pc.emissionsVault, pc.productionOracle
        );
    }

    function getProjectName(address operator) external view returns (string memory) {
        return _projectContracts[operator].name;
    }

    function isProjectActive(address operator) external view returns (bool) {
        return _projectContracts[operator].active;
    }

    function getAllOperators() external view returns (address[] memory) {
        return _operators;
    }

    // ─── Internal helpers ─────────────────────────────────────────────────
    function _isUnregistered(address operator) internal view returns (bool) {
        return projectStatus[operator] == ProjectStatus.Pending &&
               !_projectContracts[operator].active &&
               bytes(_projectContracts[operator].name).length == 0;
    }
}
