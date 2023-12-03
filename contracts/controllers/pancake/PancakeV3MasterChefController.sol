// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../../interfaces/pancake/IMasterChefV3.sol";
import "../../interfaces/uniswap/INonfungiblePositionManager.sol";

/**
* Add/remove liquidity to Uniswap V2 Router pairs with optional deposit/withdraw to Masterchef
*/
contract PancakeV3MasterChefController {
    using SafeERC20 for IERC20;
    using Address for address;
    using Address for address payable;
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

    function getBalance(uint tokenId) internal view returns(uint){
        (uint amount,,,,,,,,) = masterChef.userPositionInfos(tokenId);
        return amount;
    }

    function _approve(IERC20 token, uint amount, address spender) internal {
        uint currentAllowance = token.allowance(address(this), address(spender));
        if (currentAllowance > 0) {
            token.safeDecreaseAllowance(address(spender), currentAllowance);
        }
        token.safeIncreaseAllowance(address(spender), amount);
    }

    /// @notice Deploys liq to VVS LP pool
    /// @dev Calls to external contract
    /// @param data Bytes containing token addrs, amounts, pool addr, deadline to interact with Uni router
    function deploy(bytes calldata data) external returns (uint, uint) {
        (
        bool mint,
        bytes memory params
        ) = abi.decode(
            data,
            (bool, bytes)
        );
        if (mint) {
            (INonfungiblePositionManager.MintParams memory mintParams) = abi.decode(
                params,
                (INonfungiblePositionManager.MintParams));
            _approve(IERC20(mintParams.token0), mintParams.amount0Desired, address(nftManager));
            _approve(IERC20(mintParams.token1), mintParams.amount1Desired, address(nftManager));
            (uint256 tokenId,,,) = nftManager.mint(mintParams);
            uint balanceBefore = getBalance(tokenId);
            IERC721(address(nftManager)).safeTransferFrom(address(this), address(masterChef), tokenId);
            uint balanceAfter = getBalance(tokenId);
            return (balanceBefore, balanceAfter);
        } else {
            (INonfungiblePositionManager.IncreaseLiquidityParams memory increaseLiquidityParams) = abi.decode(
                params,
                (INonfungiblePositionManager.IncreaseLiquidityParams));
            (,, address token0, address token1,,,,,,,,) = nftManager.positions(increaseLiquidityParams.tokenId);
            _approve(IERC20(token0), increaseLiquidityParams.amount0Desired, address(masterChef));
            _approve(IERC20(token1), increaseLiquidityParams.amount1Desired, address(masterChef));
            uint balanceBefore = getBalance(increaseLiquidityParams.tokenId);
            masterChef.increaseLiquidity(increaseLiquidityParams);
            uint balanceAfter = getBalance(increaseLiquidityParams.tokenId);
            return (balanceBefore, balanceAfter);
        }
    }

    /// @notice Withdraws liq from VVS LP pool
    /// @dev Calls to external contract
    /// @param data Bytes contains tokens addrs, amounts, liq, pool addr, dealine for Uni router
    function withdraw(bytes calldata data) external returns (uint, uint) {
        (INonfungiblePositionManager.DecreaseLiquidityParams memory decreaseLiquidityParams) = abi.decode(
            data,
            (INonfungiblePositionManager.DecreaseLiquidityParams));
        uint balanceBefore = getBalance(decreaseLiquidityParams.tokenId);
        (uint256 amount0, uint256 amount1) = masterChef.decreaseLiquidity(decreaseLiquidityParams);
        collect(decreaseLiquidityParams.tokenId, amount0, amount1);
        //        masterChef.harvest(decreaseLiquidityParams.tokenId, address(this));
        uint balanceAfter = getBalance(decreaseLiquidityParams.tokenId);
        return (balanceBefore, balanceAfter);
    }

    function castAmount(uint256 amount) internal pure returns (uint128) {
        if (amount <= type(uint128).max) {
            return uint128(amount);
        } else {
            revert("cast amount error");
        }
    }

    function collect(uint256 tokenId, uint256 amount0, uint256 amount1) internal {
        INonfungiblePositionManager.CollectParams memory collectParams = INonfungiblePositionManager.CollectParams({
            tokenId : tokenId,
            recipient: address(this),
            amount0Max: castAmount(amount0),
            amount1Max: castAmount(amount1)
        });
        masterChef.collect(collectParams);
    }
}

