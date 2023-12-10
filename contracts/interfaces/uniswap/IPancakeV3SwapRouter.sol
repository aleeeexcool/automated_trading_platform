// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./IV3SwapRouter.sol";

interface IPancakeV3SwapRouter is IV3SwapRouter {
    /// @notice Unwraps the contract's WETH9 balance and sends it to recipient as ETH.
    /// @dev The amountMinimum parameter prevents malicious contracts from stealing WETH9 from users.
    /// @param amountMinimum The minimum amount of WETH9 to unwrap
    /// @param recipient The address receiving ETH
    function unwrapWETH9(uint256 amountMinimum, address recipient) external payable;

    /// @notice Refunds any ETH balance held by this contract to the `msg.sender`
    /// @dev Useful for bundling with mint or increase liquidity that uses ether, or exact output swaps
    /// that use ether for the input amount. And in PancakeSwap Router, this would be called
    /// at the very end of swap
    function refundETH() external payable;

    /// @notice Transfers the full amount of a token held by this contract to recipient
    /// @dev The amountMinimum parameter prevents malicious contracts from stealing the token from users
    /// @param token The contract address of the token which will be transferred to `recipient`
    /// @param amountMinimum The minimum amount of token required for a transfer
    /// @param recipient The destination address of the token
    function sweepToken(
        address token,
        uint256 amountMinimum,
        address recipient
    ) external payable;

    /// @notice Wraps the contract's ETH balance into WETH9
    /// @dev The resulting WETH9 is custodied by the router, thus will require further distribution
    /// @param value The amount of ETH to wrap
    function wrapETH(uint256 value) external payable;

    /// @notice Transfers the full amount of a token held by this contract to msg.sender
    /// @dev The amountMinimum parameter prevents malicious contracts from stealing the token from users
    /// @param token The contract address of the token which will be transferred to msg.sender
    /// @param amountMinimum The minimum amount of token required for a transfer
    function sweepToken(address token, uint256 amountMinimum) external payable;

    /// @notice Transfers the specified amount of a token from the msg.sender to address(this)
    /// @param token The token to pull
    /// @param value The amount to pay
    function pull(address token, uint256 value) external payable;
}
