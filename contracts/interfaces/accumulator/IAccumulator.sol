// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IAccumulator {
    function withdrawByStrategy(address token) external returns (uint256);
    function withdrawByStrategyForUser(address token, address user, uint amount) external returns (uint256);
}

