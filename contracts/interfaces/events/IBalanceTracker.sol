// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBalanceTracker {
    function updateBalances(
        address user,
        address controller,
        uint depositAmount,
        uint withdrawAmount
    ) external;
}

