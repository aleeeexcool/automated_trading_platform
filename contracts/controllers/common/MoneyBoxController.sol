// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../../interfaces/moneybox/IMoneyBox.sol";

/**
* Add liquidity to system owned MoneyBox
*/
contract MoneyBoxController {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    IMoneyBox public immutable moneyBox;

    constructor(
        IMoneyBox _moneyBox) {
        require(address(_moneyBox) != address(0), "INVALID_MONEY_BOX");
        moneyBox = _moneyBox;
    }

    function getBalance(address token, address owner) internal view returns(uint){
        return moneyBox.balanceOf(token, owner);
    }

    function _approve(IERC20 _token, uint amount, address spender) internal {
        uint currentAllowance = _token.allowance(address(this), address(spender));
        if (currentAllowance > 0) {
            _token.safeDecreaseAllowance(address(spender), currentAllowance);
        }
        _token.safeIncreaseAllowance(address(spender), amount);
    }

    /// @dev Calls to external contract
    /// @param data Bytes containing amount, pool id
    function deploy(bytes calldata data) external returns (uint, uint) {
        (
            address token,
            uint256 amount
        ) = abi.decode(
            data,
            (address, uint256)
        );
        return _deploy(token, amount);
    }

    /// @notice Deploys all possible liquidity
    /// @dev Calls to external contract
    function deployAll(bytes calldata data) external returns (uint, uint) {
        (
            address token
        ) = abi.decode(
            data,
            (address)
        );
        uint amount = IERC20(token).balanceOf(address(this));
        return _deploy(token, amount);
    }

    function _deploy(address token, uint amount) internal returns (uint, uint) {
        if (amount == 0) {
            uint b = getBalance(token, address(this));
            return (b, b);
        }
        _approve(IERC20(token), amount, address(moneyBox));
        uint balanceBefore = getBalance(token, address(this));

        moneyBox.deposit(token, amount);

        uint balanceAfter = getBalance(token, address(this));
        return (balanceBefore, balanceAfter);
    }

    /// @dev Calls to external contract
    /// @param data Bytes contains amount of token to withdraw
    function withdraw(bytes calldata data) external returns (uint, uint) {
        (
            address token,
            uint256 amount
        ) = abi.decode(data,
            (address, uint256)
        );

        uint balanceBefore = getBalance(token, address(this));

        moneyBox.withdraw(token, amount);

        uint balanceAfter = getBalance(token, address(this));
        return (balanceBefore, balanceAfter);
    }
}

