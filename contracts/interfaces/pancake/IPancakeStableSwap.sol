// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IPancakeStableSwap {
    function A() external view returns (uint256);
    function get_virtual_price() external view returns (uint256);
    function calc_token_amount(uint256[2] memory amounts, bool deposit) external view returns (uint256);
    function calc_withdraw_one_coin(uint256 _token_amount, uint256 i) external view returns (uint256);
    function add_liquidity(uint256[2] memory amounts, uint256 min_mint_amount) external;
    function get_dy(
        uint256 i,
        uint256 j,
        uint256 dx
    ) external view returns (uint256);
    function get_dy_underlying(
        uint256 i,
        uint256 j,
        uint256 dx
    ) external view returns (uint256);
    function exchange(
        uint256 i,
        uint256 j,
        uint256 dx,
        uint256 min_dy
    ) external;
    function remove_liquidity(uint256 _amount, uint256[2] memory min_amounts) external;
    function remove_liquidity_imbalance(uint256[2] memory amounts, uint256 max_burn_amount) external;
    function remove_liquidity_one_coin(
        uint256 _token_amount,
        uint256 i,
        uint256 min_amount
    ) external;
    function token() external pure returns (address);
}

