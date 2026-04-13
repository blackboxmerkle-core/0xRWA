// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ProductionOracle
/// @notice Stores project production estimates and daily output reports.
///         Used to determine oversubscription payback viability.
///         Commodity price is provided off-chain (via oracle or frontend) — only
///         the on-chain data (oz per day, operating days, daily actuals) is stored here.
contract ProductionOracle {
    // ── Enums / structs ───────────────────────────────────────────────────────
    enum OperatingSchedule { FiveDays, SevenDays }

    struct ProductionEstimate {
        uint256          ouncesPerDay;        // e.g. 10_000 = 0.01 troy oz (6-decimal fixed)
        OperatingSchedule schedule;           // 5-day or 7-day operation
        string           commodityName;       // "GOLD", "SILVER", "COPPER" etc.
        string           unit;               // "troy oz", "kg", "tonne"
        uint256          submittedAt;
        bool             set;
    }

    struct DailyReport {
        uint256 date;           // Unix timestamp (start of day)
        uint256 actualOunces;   // actual output in same 6-dec fixed-point unit
        string  evidenceCid;    // IPFS CID of daily output evidence (photos, assay reports)
        uint256 reportedAt;
    }

    // ── State ─────────────────────────────────────────────────────────────────
    address public immutable operator;
    address public immutable registry;

    ProductionEstimate private _estimate;
    DailyReport[]      private _dailyReports;

    // ── Events ────────────────────────────────────────────────────────────────
    event EstimateSet(uint256 ouncesPerDay, OperatingSchedule schedule, string commodity);
    event DailyOutputReported(uint256 indexed reportId, uint256 date, uint256 actualOunces);

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyOperator() {
        require(msg.sender == operator, "ProductionOracle: not operator");
        _;
    }

    constructor(address operator_, address registry_) {
        require(operator_ != address(0) && registry_ != address(0), "zero address");
        operator = operator_;
        registry = registry_;
    }

    // ── Project: set production estimate (onboarding) ─────────────────────────
    function setEstimate(
        uint256 ouncesPerDay,
        OperatingSchedule schedule,
        string calldata commodityName,
        string calldata unit
    ) external onlyOperator {
        require(ouncesPerDay > 0, "zero estimate");
        _estimate = ProductionEstimate({
            ouncesPerDay:   ouncesPerDay,
            schedule:       schedule,
            commodityName:  commodityName,
            unit:           unit,
            submittedAt:    block.timestamp,
            set:            true
        });
        emit EstimateSet(ouncesPerDay, schedule, commodityName);
    }

    // ── Project: daily output report ──────────────────────────────────────────
    function reportDailyOutput(
        uint256 date,
        uint256 actualOunces,
        string calldata evidenceCid
    ) external onlyOperator returns (uint256 reportId) {
        require(date <= block.timestamp, "future date");
        require(actualOunces > 0,        "zero output");
        reportId = _dailyReports.length;
        _dailyReports.push(DailyReport({
            date:        date,
            actualOunces: actualOunces,
            evidenceCid: evidenceCid,
            reportedAt:  block.timestamp
        }));
        emit DailyOutputReported(reportId, date, actualOunces);
    }

    // ── Views ─────────────────────────────────────────────────────────────────
    function getEstimate() external view returns (ProductionEstimate memory) {
        return _estimate;
    }

    function getDailyReport(uint256 id) external view returns (DailyReport memory) {
        require(id < _dailyReports.length, "not found");
        return _dailyReports[id];
    }

    function reportCount() external view returns (uint256) { return _dailyReports.length; }

    /// @notice Returns estimated annual output in the same fixed-point unit.
    ///         Caller multiplies by commodity price to get annual revenue estimate.
    function annualOutputEstimate() external view returns (uint256) {
        if (!_estimate.set) return 0;
        uint256 daysPerYear = _estimate.schedule == OperatingSchedule.SevenDays ? 365 : 260;
        return _estimate.ouncesPerDay * daysPerYear;
    }

    /// @notice Returns trailing 30-day average daily output based on submitted reports.
    function thirtyDayAvgOutput() external view returns (uint256) {
        uint256 count = _dailyReports.length;
        if (count == 0) return 0;
        uint256 cutoff    = block.timestamp - 30 days;
        uint256 total     = 0;
        uint256 validDays = 0;
        for (uint256 i = count; i > 0; i--) {
            DailyReport storage r = _dailyReports[i - 1];
            if (r.date >= cutoff) { total += r.actualOunces; validDays++; }
        }
        return validDays == 0 ? 0 : total / validDays;
    }
}
