// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Address.sol";
import "../../interfaces/accumulator/IAccumulator.sol";

contract AccumulatorController {
    using Address for address;
    IAccumulator public immutable accumulator;

    constructor(IAccumulator _accumulator) {
        require(address(_accumulator) != address(0), "INVALID_ACCUMULATOR");
        accumulator = _accumulator;
    }

    /// @notice Withdraw liquidity from accumulator
    /// @dev Calls to external contract
    /// @param data Bytes contains amount of token to withdraw
    function withdraw(bytes calldata data) external {
        (
            address token,
            address user,
            uint256 amount
        ) = abi.decode(
            data,
            (address, address, uint256)
        );
        accumulator.withdrawByStrategyForUser(token, user, amount);
    }

    /// @notice Withdraw all liquidity from accumulator
    /// @dev Calls to external contract
    /// @param data Bytes contains amount of token to withdraw
    function withdrawAll(bytes calldata data) external {
        (
            address token
        ) = abi.decode(
            data,
            (address)
        );
        accumulator.withdrawByStrategy(token);
    }
}

