// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20}         from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20}      from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IRegistry}      from "../interfaces/IRegistry.sol";

interface IBurnVaultSale {
    function fund(uint256 grossRaise) external;
    function activateCancellation() external;
}

interface IProtocolTreasuryReceive {
    function receiveFee(address operator, uint256 amount) external;
}

interface IRWATokenSale {
    function enableTransfers() external;
    function markCancelled() external;
    function balanceOf(address account) external view returns (uint256);
}

interface IDisbursementFund {
    function fund(uint256 amount) external;
}

interface IProductionOracle {
    function annualOutputEstimate() external view returns (uint256);
}

/// @title TokenSale
/// @notice Manages the public token raise. Enforces $3M minimum.
///         Tokens are held pending until raise limit is met (claimable post-finalize).
///         Oversubscription: operator must choose target-only or full-raise (with payback check).
///         Operator-requested cancellation requires Admin Operator + Platform Exec approval.
///         Fund stops accepting contributions after the closing date (deadline).
///
/// Finalize fund flow (on effectiveRaise):
///   10 % → protocolTreasury
///   15 % → BurnVault (10 % burn bucket + 5 % compensation bucket)
///   75 % → DisbursementScheduler (tranche releases to operator)
contract TokenSale is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MIN_RAISE_USDC   = 3_000_000e6;
    uint256 public constant PROTOCOL_FEE_BPS = 1_000;   // 10 %
    uint256 public constant BURN_VAULT_BPS   = 1_500;   // 15 % (10 % burn + 5 % comp)
    uint256 public constant BPS_DENOM        = 10_000;

    IRegistry public immutable registry;
    IERC20    public immutable usdc;
    address   public immutable operator;
    address   public immutable burnVault;
    address   public immutable factory;

    uint256   public immutable pricePerToken;
    uint256   public immutable deadline;   // closing date — contributions rejected after this

    // ─── Wired by factory ────────────────────────────────────────────────────
    IRWATokenSale public token;
    address        public disbursement;
    address        public productionOracle;

    // ─── Lifecycle state ─────────────────────────────────────────────────────
    uint256 public totalRaised;
    uint256 public totalTokensSold;

    bool public finalized;
    bool public failed;
    bool public cancelled;

    // Oversubscription
    bool public oversubscribed;   // set in finalize() when totalRaised > MIN_RAISE_USDC

    enum FinalizeChoice { None, TargetOnly, FullRaise }
    FinalizeChoice public finalizeChoice;

    // Operator-requested cancellation (requires AO + exec approval)
    bool public cancellationPending;

    // ─── Investor accounting ─────────────────────────────────────────────────
    mapping(address => uint256) public contributions;
    mapping(address => uint256) public pendingTokens;
    mapping(address => bool)    public tokensClaimed;
    mapping(address => bool)    public excessClaimed;   // TargetOnly: excess USDC refund claimed

    // ─── Events ──────────────────────────────────────────────────────────────
    event TokensPurchased(address indexed buyer, uint256 usdcAmount, uint256 tokenAmount);
    event SaleFinalized(uint256 indexed effectiveRaise, uint256 fee, uint256 burnVaultAmt, uint256 netToDisbursement);
    event SaleFailed(uint256 totalRaised);
    event SaleCancelled(bool raiseMet);
    event CancellationRequested(address indexed operator);
    event OversubscriptionDetected(uint256 totalRaised, uint256 target);
    event FinalizeChoiceMade(FinalizeChoice choice, uint256 effectiveRaise);
    event TokensClaimed(address indexed buyer, uint256 tokenAmount);
    event RefundClaimed(address indexed buyer, uint256 usdcAmount);
    event ExcessRefundClaimed(address indexed buyer, uint256 usdcAmount);
    event TokenWired(address token);
    event DisbursementWired(address disbursement);
    event ProductionOracleWired(address oracle);

    // ─── Modifiers ───────────────────────────────────────────────────────────
    modifier notBanned() {
        registry.requireNotBanned(msg.sender);
        _;
    }

    modifier notSettled() {
        require(!finalized && !failed && !cancelled, "TokenSale: already settled");
        _;
    }

    modifier withinDeadline() {
        require(block.timestamp <= deadline, "TokenSale: sale closed");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "TokenSale: not factory");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == _registryAdmin(), "TokenSale: not admin");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator, "TokenSale: not operator");
        _;
    }

    modifier onlyRegistry() {
        require(msg.sender == address(registry), "TokenSale: not registry");
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────────
    constructor(
        address registry_,
        address usdc_,
        address operator_,
        address burnVault_,
        address factory_,
        uint256 pricePerToken_,
        uint256 deadline_
    ) {
        require(registry_    != address(0), "zero registry");
        require(usdc_        != address(0), "zero usdc");
        require(operator_    != address(0), "zero operator");
        require(burnVault_   != address(0), "zero burnVault");
        require(factory_     != address(0), "zero factory");
        require(pricePerToken_ > 0,         "zero price");
        require(deadline_    > block.timestamp, "deadline in past");

        registry      = IRegistry(registry_);
        usdc          = IERC20(usdc_);
        operator      = operator_;
        burnVault     = burnVault_;
        factory       = factory_;
        pricePerToken = pricePerToken_;
        deadline      = deadline_;
    }

    // ─── Factory wiring ──────────────────────────────────────────────────────
    function wireToken(address token_) external onlyFactory {
        require(address(token) == address(0), "already wired");
        require(token_ != address(0), "zero address");
        token = IRWATokenSale(token_);
        emit TokenWired(token_);
    }

    function wireDisbursement(address disbursement_) external onlyFactory {
        require(disbursement == address(0), "already wired");
        require(disbursement_ != address(0), "zero address");
        disbursement = disbursement_;
        emit DisbursementWired(disbursement_);
    }

    function wireProductionOracle(address oracle_) external onlyFactory {
        require(productionOracle == address(0), "already wired");
        require(oracle_ != address(0), "zero address");
        productionOracle = oracle_;
        emit ProductionOracleWired(oracle_);
    }

    // ─── Investor: contribute USDC ────────────────────────────────────────────
    /// @notice Records contribution. Tokens held pending until claimTokens() post-finalize.
    ///         Blocked after deadline, cancellationPending, or oversubscription detected.
    function buy(uint256 usdcAmount) external nonReentrant notBanned notSettled withinDeadline {
        require(!cancellationPending, "TokenSale: cancellation pending");
        require(!oversubscribed,      "TokenSale: oversubscribed, await operator choice");
        require(address(token) != address(0), "token not wired");
        require(usdcAmount > 0, "zero amount");

        uint256 tokenAmount = (usdcAmount * 1e18) / pricePerToken;
        require(tokenAmount > 0, "amount too small");
        require(token.balanceOf(address(this)) >= tokenAmount + totalTokensSold, "insufficient tokens");

        contributions[msg.sender]  += usdcAmount;
        pendingTokens[msg.sender]  += tokenAmount;
        totalRaised                += usdcAmount;
        totalTokensSold            += tokenAmount;

        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        emit TokensPurchased(msg.sender, usdcAmount, tokenAmount);
    }

    // ─── Investor: claim allocated tokens post-finalize ────────────────────
    /// @notice In TargetOnly mode tokens are scaled pro-rata to the effective raise.
    function claimTokens() external nonReentrant notBanned {
        require(finalized, "TokenSale: not finalized");
        require(!tokensClaimed[msg.sender], "already claimed");

        uint256 toks = pendingTokens[msg.sender];
        require(toks > 0, "no tokens pending");

        // TargetOnly: proportionally reduce tokens to match effective raise
        if (finalizeChoice == FinalizeChoice.TargetOnly && totalRaised > 0) {
            toks = (toks * MIN_RAISE_USDC) / totalRaised;
        }
        require(toks > 0, "zero tokens after adjustment");

        tokensClaimed[msg.sender] = true;
        IERC20(address(token)).safeTransfer(msg.sender, toks);
        emit TokensClaimed(msg.sender, toks);
    }

    // ─── Investor: claim excess USDC refund after TargetOnly choice ────────
    /// @notice When operator chose TargetOnly, each investor receives:
    ///         refund = contributions[i] * excessPool / totalRaised
    function claimExcessRefund() external nonReentrant {
        require(finalizeChoice == FinalizeChoice.TargetOnly, "no excess refund");
        require(!excessClaimed[msg.sender], "already claimed excess");

        uint256 contrib = contributions[msg.sender];
        require(contrib > 0, "no contribution");

        uint256 excessPool = totalRaised - MIN_RAISE_USDC;
        uint256 refund     = (contrib * excessPool) / totalRaised;
        require(refund > 0, "zero refund");

        excessClaimed[msg.sender] = true;
        usdc.safeTransfer(msg.sender, refund);
        emit ExcessRefundClaimed(msg.sender, refund);
    }

    // ─── Finalize: detect oversubscription or complete ────────────────────
    /// @notice Callable by anyone after deadline or when raise target exactly met.
    ///         If oversubscribed, sets flag and waits for operator to call
    ///         claimTargetFunds() or claimFullRaise().
    function finalize() external nonReentrant notSettled {
        require(
            block.timestamp > deadline || totalRaised >= MIN_RAISE_USDC,
            "TokenSale: raise not complete"
        );
        require(!oversubscribed, "TokenSale: awaiting operator oversubscription choice");
        require(address(token) != address(0), "token not wired");

        if (totalRaised < MIN_RAISE_USDC) {
            failed = true;
            emit SaleFailed(totalRaised);
        } else if (totalRaised > MIN_RAISE_USDC) {
            oversubscribed = true;
            emit OversubscriptionDetected(totalRaised, MIN_RAISE_USDC);
            // Operator must now call claimTargetFunds() or claimFullRaise()
        } else {
            // Exact minimum
            _executeFinalize(MIN_RAISE_USDC);
        }
    }

    // ─── Operator: take only the minimum raise (refund excess to investors) ─
    function claimTargetFunds() external nonReentrant onlyOperator notSettled {
        require(oversubscribed,                         "not oversubscribed");
        require(finalizeChoice == FinalizeChoice.None,  "choice already made");

        finalizeChoice = FinalizeChoice.TargetOnly;
        emit FinalizeChoiceMade(FinalizeChoice.TargetOnly, MIN_RAISE_USDC);

        // Excess USDC stays in contract; investors call claimExcessRefund() to retrieve it.
        // We finalize on MIN_RAISE_USDC only.
        _executeFinalize(MIN_RAISE_USDC);
    }

    // ─── Operator: claim full raise (requires oracle payback viability check) ─
    /// @param commodityPricePerUnit Current price in 6-decimal USD
    ///        (same fixed-point as ProductionOracle output, e.g. gold USD per troy oz).
    function claimFullRaise(uint256 commodityPricePerUnit) external nonReentrant onlyOperator notSettled {
        require(oversubscribed,                         "not oversubscribed");
        require(finalizeChoice == FinalizeChoice.None,  "choice already made");
        require(productionOracle != address(0),         "oracle not wired");
        require(commodityPricePerUnit > 0,              "zero price");

        uint256 annualOutput = IProductionOracle(productionOracle).annualOutputEstimate();
        require(annualOutput > 0, "no production estimate set");

        // annualOutput is in 6-dec fixed-point (e.g. 1e6 = 1 troy oz).
        // commodityPrice is 6-dec USD per unit (e.g. 2000_000000 = $2,000/oz).
        // annualRevenue (6-dec USD) = annualOutput * commodityPrice / 1e6
        uint256 annualRevenue = (annualOutput * commodityPricePerUnit) / 1e6;
        require(annualRevenue >= totalRaised, "payback not viable at current commodity price");

        finalizeChoice = FinalizeChoice.FullRaise;
        emit FinalizeChoiceMade(FinalizeChoice.FullRaise, totalRaised);
        _executeFinalize(totalRaised);
    }

    // ─── Internal: execute finalization at effectiveRaise ─────────────────
    function _executeFinalize(uint256 effectiveRaise) internal {
        finalized = true;

        uint256 fee          = (effectiveRaise * PROTOCOL_FEE_BPS) / BPS_DENOM;  // 10 %
        uint256 burnVaultAmt = (effectiveRaise * BURN_VAULT_BPS)   / BPS_DENOM;  // 15 %
        uint256 net          = effectiveRaise - fee - burnVaultAmt;               // 75 %

        // 10 % → protocol treasury
        usdc.safeTransfer(registry.protocolTreasury(), fee);

        // 15 % → BurnVault  (fund() pulls via safeTransferFrom; we pre-approve)
        usdc.safeApprove(burnVault, burnVaultAmt);
        IBurnVaultSale(burnVault).fund(effectiveRaise);

        // 75 % → DisbursementScheduler
        usdc.safeApprove(disbursement, net);
        IDisbursementFund(disbursement).fund(net);

        // Enable secondary-market token transfers
        token.enableTransfers();

        // Return unsold + oversubscription tokens to operator
        uint256 held      = IERC20(address(token)).balanceOf(address(this));
        uint256 claimable = finalizeChoice == FinalizeChoice.TargetOnly
            ? (totalTokensSold * MIN_RAISE_USDC) / totalRaised
            : totalTokensSold;
        uint256 returnAmt = held > claimable ? held - claimable : 0;
        if (returnAmt > 0) {
            IERC20(address(token)).safeTransfer(operator, returnAmt);
        }

        emit SaleFinalized(effectiveRaise, fee, burnVaultAmt, net);
    }

    // ─── Operator: request sale cancellation ─────────────────────────────
    /// @notice Initiates the two-step AO + exec approval. Sale is paused for new
    ///         contributions while approval is pending.
    function requestCancellation() external onlyOperator notSettled {
        require(!cancellationPending, "already pending");
        cancellationPending = true;
        emit CancellationRequested(operator);
    }

    // ─── Registry: execute approved cancellation ──────────────────────────
    /// @notice Called by RWARegistry once both AO and exec have approved.
    function executeCancellation() external onlyRegistry {
        require(!cancelled, "already cancelled");
        bool raiseMet = finalized;
        cancelled         = true;
        cancellationPending = false;
        token.markCancelled();
        if (raiseMet) {
            IBurnVaultSale(burnVault).activateCancellation();
        }
        emit SaleCancelled(raiseMet);
    }

    // ─── Admin: immediate cancel (bypasses approval) ──────────────────────
    function cancelSale() external nonReentrant onlyAdmin {
        require(!cancelled, "already cancelled");
        bool raiseMet = finalized;
        cancelled           = true;
        cancellationPending = false;
        token.markCancelled();
        if (raiseMet) {
            IBurnVaultSale(burnVault).activateCancellation();
        }
        emit SaleCancelled(raiseMet);
    }

    // ─── Investor: refund after failed raise or pre-finalize cancel ───────
    function claimRefund() external nonReentrant {
        require(failed || (cancelled && !finalized), "not refundable");
        uint256 amount = contributions[msg.sender];
        require(amount > 0, "no contribution");
        contributions[msg.sender] = 0;
        pendingTokens[msg.sender] = 0;
        usdc.safeTransfer(msg.sender, amount);
        emit RefundClaimed(msg.sender, amount);
    }

    // ─── Views ───────────────────────────────────────────────────────────
    function getIcoPrice() external view returns (uint256) { return pricePerToken; }

    function remainingTokens() external view returns (uint256) {
        if (address(token) == address(0)) return 0;
        return token.balanceOf(address(this));
    }

    function raiseProgress() external view returns (uint256 raised, uint256 target) {
        return (totalRaised, MIN_RAISE_USDC);
    }

    /// @notice Projected excess refund for an investor if TargetOnly is chosen.
    function previewExcessRefund(address investor) external view returns (uint256) {
        if (totalRaised <= MIN_RAISE_USDC) return 0;
        uint256 excess = totalRaised - MIN_RAISE_USDC;
        return (contributions[investor] * excess) / totalRaised;
    }

    /// @notice Checks whether the full raise is viable at the given commodity price.
    function paybackViable(uint256 commodityPricePerUnit) external view returns (bool, uint256 annualRevenue) {
        if (productionOracle == address(0) || commodityPricePerUnit == 0) return (false, 0);
        uint256 annualOutput = IProductionOracle(productionOracle).annualOutputEstimate();
        annualRevenue = (annualOutput * commodityPricePerUnit) / 1e6;
        return (annualRevenue >= totalRaised, annualRevenue);
    }

    // ─── Internal helpers ────────────────────────────────────────────────
    function _registryAdmin() internal view returns (address) {
        (bool ok, bytes memory data) = address(registry).staticcall(
            abi.encodeWithSignature("admin()")
        );
        require(ok, "registry admin call failed");
        return abi.decode(data, (address));
    }
}
