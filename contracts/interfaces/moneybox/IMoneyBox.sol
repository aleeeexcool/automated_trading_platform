// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IMoneyBox {
    function deposit(address token, uint256 amount) external;
    function withdraw(address token, uint256 amount) external;
    function balanceOf(address token, address account) external view returns (uint256);
}
