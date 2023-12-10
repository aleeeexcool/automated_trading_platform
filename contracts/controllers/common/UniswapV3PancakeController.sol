// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../../interfaces/uniswap/IPancakeV3SwapRouter.sol";
import "../../interfaces/pancake/IWETH.sol";

contract UniswapV3PancakeController {

    using SafeERC20 for IERC20;
    using Address for address;
    using Address for address payable;
    using SafeMath for uint256;
    IPancakeV3SwapRouter public immutable router;
    IWETH immutable WETH9 = IWETH(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);

    constructor(IPancakeV3SwapRouter _router) {
        require(address(_router) != address(0), "INVALID_ROUTER");
        router = _router;
    }

    function _approve(IERC20 token, uint amount, address spender) internal {
        uint currentAllowance = token.allowance(address(this), address(spender));
        if (currentAllowance > 0) {
            token.safeDecreaseAllowance(address(spender), currentAllowance);
        }
        token.safeIncreaseAllowance(address(spender), amount);
    }

    function decodePath(bytes memory path) internal pure returns (address) {
        address addr;
        assembly {
            addr := mload(add(path, 20))
        }
        return addr;
    }

    struct ExactInputParamsWithoutPath {
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function _deploy(bytes calldata data, bool isDeployAll) internal {
        (
            bool exactInputSingle,
            bytes memory swapData,
            bytes memory path,
            bool unwrapETH,
            uint ethAmountMin
        ) = abi.decode(
            data,
            (bool, bytes, bytes, bool, uint)
        );
        if (exactInputSingle) {
            (
                IV3SwapRouter.ExactInputSingleParams memory paramsSingle
            ) = abi.decode(
                swapData,
                (IV3SwapRouter.ExactInputSingleParams)
            );
            if (isDeployAll) {
                uint amountIn = IERC20(paramsSingle.tokenIn).balanceOf(address(this));
                paramsSingle.amountIn = amountIn;
            }
            _approve(IERC20(paramsSingle.tokenIn), paramsSingle.amountIn, address(router));
            router.exactInputSingle(paramsSingle);
        } else {
            (
                ExactInputParamsWithoutPath memory paramsMultiWithoutPath
            ) = abi.decode(
                swapData,
                (ExactInputParamsWithoutPath)
            );
            IV3SwapRouter.ExactInputParams memory paramsMulti = IV3SwapRouter.ExactInputParams(
                path,
                paramsMultiWithoutPath.recipient,
                paramsMultiWithoutPath.amountIn,
                paramsMultiWithoutPath.amountOutMinimum);
            address tokenIn = decodePath(paramsMulti.path);
            if (isDeployAll) {
                uint amountIn = IERC20(tokenIn).balanceOf(address(this));
                paramsMulti.amountIn = amountIn;
            }
            _approve(IERC20(tokenIn), paramsMulti.amountIn, address(router));
            router.exactInput(paramsMulti);
        }
        if (unwrapETH && ethAmountMin > 0) {
            WETH9.withdraw(ethAmountMin);
        }
    }

    /// @notice Performs swap on Uniswap v2 router according to data passed
    /// @dev Calls to external contract
    /// @param data Bytes containing token amounts, path to interact with Uni router
    function deploy(bytes calldata data) external {
        _deploy(data, false);
    }

    /// @notice Performs swap on Uniswap v2 router of all available balance of input token
    /// @dev Calls to external contract
    /// @param data Bytes containing token amounts, path to interact with Uni router
    function deployAll(bytes calldata data) external {
        _deploy(data, true);
    }
}
