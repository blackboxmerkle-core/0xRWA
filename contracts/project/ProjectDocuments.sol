// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ProjectDocuments
/// @notice Stores IPFS content hashes for project documents.
///         Projects upload proofs; Admin Operator verifies; Platform Exec approves changes.
///         Documents are stored encrypted off-chain (IPFS); only hashes recorded here.
///
///         Roles (read from registry):
///           - operator      : uploads project proofs and team data
///           - adminOperator : uploads government verifications; marks docs as verified
///           - platformExec  : approves pending metadata changes proposed by adminOperator
///           - anyone        : can read verified status

interface IRegistryRoles {
    function admin() external view returns (address);
    function adminOperator() external view returns (address);
    function platformExec() external view returns (address);
}

contract ProjectDocuments {
    // ─────────────────────────────── Enums ────────────────────────────────
    enum DocType {
        OwnershipProof,         // uploaded by project operator
        GovernmentVerification, // uploaded by admin operator
        TeamPhoto,              // uploaded by project (team + platform staff together)
        TeamBio,                // uploaded by project per team member
        WebsiteEvidence,        // URL screenshot / proof
        Other
    }

    enum VerificationStatus { Pending, Verified, Rejected }

    // ─────────────────────────────── Structs ──────────────────────────────
    struct Document {
        string      ipfsHash;       // CIDv1 of encrypted file on IPFS
        DocType     docType;
        address     uploadedBy;
        uint256     uploadedAt;
        VerificationStatus status;
        string      notes;          // admin operator notes on verification
        bool        pendingApproval; // adminOperator proposed change, waiting platformExec
    }

    struct TeamMember {
        string  name;
        string  role;
        string  bioCid;       // IPFS CID of encrypted bio document
        string  photoCid;     // IPFS CID of photo
        bool    verified;
    }

    struct PendingChange {
        string   field;       // which field is being changed
        string   oldValue;
        string   newValue;
        address  proposedBy;
        uint256  proposedAt;
        bool     executed;
    }

    // ─────────────────────────────── State ────────────────────────────────
    IRegistryRoles public immutable registry;
    address        public immutable operator;  // project operator
    string         public projectWebsite;

    Document[]     private _documents;
    TeamMember[]   private _team;
    PendingChange[] private _pendingChanges;

    // ─────────────────────────────── Events ───────────────────────────────
    event DocumentUploaded(uint256 indexed docId, DocType docType, address uploadedBy, string ipfsHash);
    event DocumentVerified(uint256 indexed docId, VerificationStatus status, address by);
    event TeamMemberAdded(uint256 indexed memberId, string name, address by);
    event TeamMemberUpdated(uint256 indexed memberId, address by);
    event ChangeProposed(uint256 indexed changeId, string field, address by);
    event ChangeApproved(uint256 indexed changeId, address by);
    event ChangeRejected(uint256 indexed changeId, address by);
    event WebsiteUpdated(string newUrl, address by);

    // ─────────────────────────────── Modifiers ────────────────────────────
    modifier onlyOperator() {
        require(msg.sender == operator, "ProjectDocs: not operator");
        _;
    }

    modifier onlyAdminOperator() {
        require(
            msg.sender == registry.adminOperator(),
            "ProjectDocs: not admin operator"
        );
        _;
    }

    modifier onlyPlatformExec() {
        require(
            msg.sender == registry.platformExec(),
            "ProjectDocs: not platform exec"
        );
        _;
    }

    modifier onlyOperatorOrAdminOperator() {
        require(
            msg.sender == operator || msg.sender == registry.adminOperator(),
            "ProjectDocs: not authorised"
        );
        _;
    }

    constructor(address registry_, address operator_) {
        require(registry_ != address(0) && operator_ != address(0), "zero address");
        registry = IRegistryRoles(registry_);
        operator = operator_;
    }

    // ─────────────────────────────── Document upload ──────────────────────
    /// @notice Project operator uploads a proof document.
    function uploadDocument(string calldata ipfsHash, DocType docType)
        external
        onlyOperatorOrAdminOperator
        returns (uint256 docId)
    {
        docId = _documents.length;
        _documents.push(Document({
            ipfsHash:        ipfsHash,
            docType:         docType,
            uploadedBy:      msg.sender,
            uploadedAt:      block.timestamp,
            status:          VerificationStatus.Pending,
            notes:           "",
            pendingApproval: false
        }));
        emit DocumentUploaded(docId, docType, msg.sender, ipfsHash);
    }

    // ─────────────────────────────── Verification ─────────────────────────
    /// @notice Admin operator verifies or rejects a document (offline review process).
    function verifyDocument(uint256 docId, VerificationStatus status, string calldata notes)
        external
        onlyAdminOperator
    {
        require(docId < _documents.length, "doc not found");
        require(status != VerificationStatus.Pending, "must verify or reject");
        Document storage doc = _documents[docId];
        doc.status = status;
        doc.notes  = notes;
        emit DocumentVerified(docId, status, msg.sender);
    }

    // ─────────────────────────────── Team management ──────────────────────
    /// @notice Project operator adds a team member with bio and photo CIDs.
    function addTeamMember(
        string calldata name,
        string calldata role,
        string calldata bioCid,
        string calldata photoCid
    ) external onlyOperator returns (uint256 memberId) {
        memberId = _team.length;
        _team.push(TeamMember({
            name:     name,
            role:     role,
            bioCid:   bioCid,
            photoCid: photoCid,
            verified: false
        }));
        emit TeamMemberAdded(memberId, name, msg.sender);
    }

    /// @notice Admin operator marks a team member as verified (after in-person meeting).
    function verifyTeamMember(uint256 memberId) external onlyAdminOperator {
        require(memberId < _team.length, "member not found");
        _team[memberId].verified = true;
        emit TeamMemberUpdated(memberId, msg.sender);
    }

    // ─────────────────────────────── Website ──────────────────────────────
    function setWebsite(string calldata url) external onlyOperator {
        projectWebsite = url;
        emit WebsiteUpdated(url, msg.sender);
    }

    // ─────────────────────────────── Change proposals (Admin Op → Exec) ───
    /// @notice Admin operator proposes a change to project metadata.
    ///         Must be approved by platform exec before taking effect.
    function proposeChange(
        string calldata field,
        string calldata oldValue,
        string calldata newValue
    ) external onlyAdminOperator returns (uint256 changeId) {
        changeId = _pendingChanges.length;
        _pendingChanges.push(PendingChange({
            field:      field,
            oldValue:   oldValue,
            newValue:   newValue,
            proposedBy: msg.sender,
            proposedAt: block.timestamp,
            executed:   false
        }));
        emit ChangeProposed(changeId, field, msg.sender);
    }

    /// @notice Platform exec approves a pending change.
    function approveChange(uint256 changeId) external onlyPlatformExec {
        require(changeId < _pendingChanges.length, "change not found");
        PendingChange storage ch = _pendingChanges[changeId];
        require(!ch.executed, "already executed");
        ch.executed = true;
        emit ChangeApproved(changeId, msg.sender);
    }

    function rejectChange(uint256 changeId) external onlyPlatformExec {
        require(changeId < _pendingChanges.length, "change not found");
        PendingChange storage ch = _pendingChanges[changeId];
        require(!ch.executed, "already executed");
        ch.executed = true;  // mark done to prevent re-processing
        emit ChangeRejected(changeId, msg.sender);
    }

    // ─────────────────────────────── Views ────────────────────────────────
    function getDocument(uint256 docId) external view returns (Document memory) {
        require(docId < _documents.length, "doc not found");
        return _documents[docId];
    }

    function documentCount() external view returns (uint256) {
        return _documents.length;
    }

    function getTeamMember(uint256 memberId) external view returns (TeamMember memory) {
        require(memberId < _team.length, "member not found");
        return _team[memberId];
    }

    function teamCount() external view returns (uint256) {
        return _team.length;
    }

    function getPendingChange(uint256 changeId) external view returns (PendingChange memory) {
        require(changeId < _pendingChanges.length, "not found");
        return _pendingChanges[changeId];
    }

    function pendingChangeCount() external view returns (uint256) {
        return _pendingChanges.length;
    }

    /// @notice Returns count of unexecuted pending changes
    function openChangeCount() external view returns (uint256 count) {
        for (uint256 i = 0; i < _pendingChanges.length; i++) {
            if (!_pendingChanges[i].executed) count++;
        }
    }
}
