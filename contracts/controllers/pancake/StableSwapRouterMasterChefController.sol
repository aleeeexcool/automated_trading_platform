// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./../BaseController.sol";
import "../../interfaces/crona/IMasterChef.sol";
import "../../interfaces/pancake/IPancakeStableSwap.sol";

/**
* Add/remove liquidity to Uniswap V2 Router pairs with optional deposit/withdraw to Masterchef
*/
contract StableSwapRouterMasterChefController is BaseController {
    using SafeERC20 for IERC20;
    using Address for address;
    using Address for address payable;
    using SafeMath for uint256;
    IPancakeStableSwap public immutable router;
    IMasterChef public immutable masterChef;

    constructor(
        IPancakeStableSwap _router,
        IMasterChef _masterChef,
        address manager
    ) BaseController(manager){
        require(address(_router) != address(0), "INVALID_ROUTER");
        require(address(_masterChef) != address(0), "INVALID_MASTER_CHEF");
        router = _router;
        masterChef = _masterChef;
    }

    function getBalance(address owner, uint poolId) internal view returns(uint){
        (uint amount,) = masterChef.userInfo(poolId, owner);
        return amount;
    }

    function _approve(IERC20 token, uint amount, address spender) internal {
        uint currentAllowance = token.allowance(address(this), address(spender));
        if (currentAllowance > 0) {
            token.safeDecreaseAllowance(address(spender), currentAllowance);
        }
        token.safeIncreaseAllowance(address(spender), amount);
    }

    /// @notice Deploys liq to Pancake Masterchef
    /// @dev Calls to external contract
    /// @param data Bytes containing token addrs, amounts, pool id
    function deploy(bytes calldata data) external onlyManager returns (uint, uint) {
        (
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 minToMint,
        address to,
        uint256 poolId
        ) = abi.decode(
            data,
            (address, address, uint256, uint256, uint256, address, uint256)
        );
        require(to == manager, "MUST_BE_MANAGER");

        _approve(IERC20(tokenA), amountA, address(router));
        _approve(IERC20(tokenB), amountB, address(router));
        uint balanceBefore = getBalance(address(this), poolId);

        router.add_liquidity([amountA, amountB], minToMint);
        IERC20 pair = IERC20(router.token());
        uint liquidity = pair.balanceOf(address(this));
        _approve(pair, liquidity, address(masterChef));
        masterChef.deposit(poolId, liquidity);

        uint balanceAfter = getBalance(address(this), poolId);
        require(balanceAfter > balanceBefore, "MUST_INCREASE");
        return (balanceBefore, balanceAfter);
    }

    /// @notice Withdraws liq from Pancake Masterchef
    /// @dev Calls to external contract
    /// @param data Bytes contains tokens addrs, amounts, liq, pool addr, dealine for Uni router
    function withdraw(bytes calldata data) external onlyManager returns (uint, uint) {
        (
        address tokenA,
        address tokenB,
        uint256 amount,
        uint256 amountA,
        uint256 amountB,
        address to,
        uint256 poolId
        ) = abi.decode(data, (address, address, uint256, uint256, uint256, address, uint256));

        require(to == manager, "MUST_BE_MANAGER");

        uint balanceBefore = getBalance(address(this), poolId);
        masterChef.withdraw(poolId, amount);
        uint balanceAfter = getBalance(address(this), poolId);
        require(balanceBefore > balanceAfter, "MUST_REDUCE");

        IERC20 pair = IERC20(router.token());
        _approve(pair, amount, address(router));

        uint256 tokenABalanceBefore = IERC20(tokenA).balanceOf(address(this));
        uint256 tokenBBalanceBefore = IERC20(tokenB).balanceOf(address(this));

        router.remove_liquidity(amount, [amountA, amountB]);

        require(IERC20(tokenA).balanceOf(address(this)) > tokenABalanceBefore, "MUST_INCREASE");
        require(IERC20(tokenB).balanceOf(address(this)) > tokenBBalanceBefore, "MUST_INCREASE");
        return (balanceBefore, balanceAfter);
    }
}

