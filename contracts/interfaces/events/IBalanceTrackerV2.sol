// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBalanceTrackerV2 {
    function updateBalances(
        address user,
        bytes32 controllerId,
        uint depositAmount,
        uint withdrawAmount
    ) external;
}

