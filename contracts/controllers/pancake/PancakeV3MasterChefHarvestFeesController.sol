// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../../interfaces/pancake/IMasterChefV3.sol";
import "../../interfaces/uniswap/v3/INonfungiblePositionManager.sol";

contract PancakeV3MasterChefHarvestFeesController {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;
    INonfungiblePositionManager public immutable nftManager;
    IMasterChefV3 public immutable masterChef;

    constructor(
        INonfungiblePositionManager _nftManager,
        IMasterChefV3 _masterChef
    ) {
        require(address(_nftManager) != address(0), "INVALID_NFT_MANAGER");
        require(address(_masterChef) != address(0), "INVALID_MASTER_CHEF");
        nftManager = _nftManager;
        masterChef = _masterChef;
    }

    /// @notice Gets reward, swaps it into deposit token and deposits
    /// @dev Calls to external contract
    /// @param data Bytes containing reward token addr, router, swap path, pool addr, depositToken
    function deploy(bytes calldata data) external {
        (uint tokenId) = abi.decode(
            data,
            (uint));
        // collect fees
        INonfungiblePositionManager.CollectParams memory collectParams = INonfungiblePositionManager.CollectParams({
            tokenId : tokenId,
            recipient: address(this),
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        });
        (uint amount0, uint amount1)  = masterChef.collect(collectParams);
        INonfungiblePositionManager.IncreaseLiquidityParams memory increaseLiquidityParams = INonfungiblePositionManager.IncreaseLiquidityParams({
            tokenId : tokenId,
            amount0Desired: amount0,
            amount1Desired: amount1,
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp
        });
        (,, address token0, address token1,,,,,,,,) = nftManager.positions(increaseLiquidityParams.tokenId);
        _approve(IERC20(token0), increaseLiquidityParams.amount0Desired, address(masterChef));
        _approve(IERC20(token1), increaseLiquidityParams.amount1Desired, address(masterChef));
        masterChef.increaseLiquidity(increaseLiquidityParams);
    }

    function _approve(IERC20 token, uint amount, address spender) internal {
        uint currentAllowance = token.allowance(address(this), address(spender));
        if (currentAllowance > 0) {
            token.safeDecreaseAllowance(address(spender), currentAllowance);
        }
        token.safeIncreaseAllowance(address(spender), amount);
    }
}

