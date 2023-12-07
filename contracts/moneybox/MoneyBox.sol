// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MoneyBox is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // token address => user address => balance
    mapping(address => mapping(address => uint256)) private balances;

    function balanceOf(address token, address account) public view returns (uint256) {
        return balances[token][account];
    }

    function deposit(address token, uint256 amount) external nonReentrant {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        balances[token][msg.sender] = balances[token][msg.sender].add(amount);
    }

    function withdraw(address token, uint256 amount) external nonReentrant {
        require(balances[token][msg.sender] >= amount, "Insufficient balance");
        balances[token][msg.sender] = balances[token][msg.sender].sub(amount);
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}

