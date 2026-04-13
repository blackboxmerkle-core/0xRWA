// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

interface IRWAToken {
    function enableTransfers() external;
    function snapshot() external returns (uint256 snapshotId);
    function balanceOfAt(address account, uint256 snapshotId) external view returns (uint256);
    function totalSupplyAt(uint256 snapshotId) external view returns (uint256);
    function mint(address to, uint256 amount) external;
    function burnFrom(address account, uint256 amount) external;
    function transfersEnabled() external view returns (bool);
    function operator() external view returns (address);
}
