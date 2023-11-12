// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

interface IStrategyManager {
    ///@notice Gets cycle rollover status, true for rolling false for not
    ///@return Bool representing whether cycle is rolling over or not
    function getRolloverStatus() external view returns (bool);
}

contract Accumulator is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;
    using Counters for Counters.Counter;

    uint256 constant public FEE_DENOMINATOR = 10000;
    uint256 public depositFee = 0;
    address public feeRecipient;  

    // token address => strategy manager address => counter
    mapping(address => mapping(address => Counters.Counter)) private balancesCounters;

    // token address => strategy manager address => counter => user address => balance
    mapping(address => mapping(address => mapping(uint256 => mapping(address => uint256)))) private balances;

    // token address => strategy manager address => balance
    mapping(address => mapping(address => uint256)) private consolidatedBalances;

    // token address => strategy manager address => counter => set of user addresses with balance > 0
    mapping(address => mapping(address => mapping(uint256 => EnumerableSet.AddressSet))) private tokenHolders;

    EnumerableSet.AddressSet private strategies;

    function registerStrategy(address strategy) external onlyOwner {
        require(address(strategy) != address(0), "INVALID_STRATEGY");
        require(strategies.add(strategy), "ADD_STRATEGY_FAIL");
    }

    function unRegisterStrategy(address strategy) external onlyOwner {
        require(strategies.remove(strategy), "REMOVE_STRATEGY_FAIL");
    }

    function setFee(uint _depositFee, address _feeRecipient) external onlyOwner {
        depositFee = _depositFee;
        feeRecipient = _feeRecipient;
    }

    function getStrategies() external view returns (address[] memory) {
        return strategies.values();
    }

    function balanceOf(address token, address strategy, address account) external view returns (uint256) {
        return balances[token][strategy][balancesCounters[token][strategy].current()][account];
    }

    function balanceOfStrategy(address token, address strategy) external view returns (uint256) {
        return consolidatedBalances[token][strategy];
    }

    function deposit(address token, address strategy, uint amount) external nonReentrant {
        require(strategies.contains(strategy), "INVALID_STRATEGY");
        require(!isStrategyOnPause(strategy), "STRATEGY_IS_UNAVAILABLE");
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        if (depositFee > 0 && feeRecipient != address(0)) {
            uint feeAmount = amount.mul(depositFee) / FEE_DENOMINATOR;
            amount = amount.sub(feeAmount);
            IERC20(token).safeTransfer(feeRecipient, feeAmount);
        }
        balances[token][strategy][balancesCounters[token][strategy].current()][msg.sender] = balances[token][strategy][balancesCounters[token][strategy].current()][msg.sender].add(amount);
        consolidatedBalances[token][strategy] = consolidatedBalances[token][strategy].add(amount);
        updateHolders(token, strategy, msg.sender, balances[token][strategy][balancesCounters[token][strategy].current()][msg.sender]);
    }

    function _withdraw(address token, address strategy, address user, address receiver, uint amount) internal {
        require(balances[token][strategy][balancesCounters[token][strategy].current()][user] >= amount, "Insufficient balance");
        balances[token][strategy][balancesCounters[token][strategy].current()][user] = balances[token][strategy][balancesCounters[token][strategy].current()][user].sub(amount);
        consolidatedBalances[token][strategy] = consolidatedBalances[token][strategy].sub(amount);
        updateHolders(token, strategy, user, balances[token][strategy][balancesCounters[token][strategy].current()][user]);
        IERC20(token).safeTransfer(receiver, amount);
    }

    function updateHolders(address token, address strategy, address account, uint balance) internal {
        if (tokenHolders[token][strategy][balancesCounters[token][strategy].current()].contains(account)) {
            if (balance == 0) {
                tokenHolders[token][strategy][balancesCounters[token][strategy].current()].remove(account);
            }
        } else if (balance > 0) {
            tokenHolders[token][strategy][balancesCounters[token][strategy].current()].add(account);
        }
    }

    function withdrawByStrategy(address token) external nonReentrant returns (uint256){
        require(strategies.contains(msg.sender), "INVALID_STRATEGY");
        uint amount = consolidatedBalances[token][msg.sender];
        consolidatedBalances[token][msg.sender] = 0;
        balancesCounters[token][msg.sender].increment();
        IERC20(token).safeTransfer(msg.sender, amount);
        return amount;
    }

    function withdrawByStrategyForUser(address token, address user, uint amount) external nonReentrant returns (uint256){
        require(strategies.contains(msg.sender), "INVALID_STRATEGY");
        _withdraw(token, msg.sender, user, msg.sender, amount);
        return amount;
    }

    function tokenHoldersLength(address token, address strategy) external view returns (uint) {
        return tokenHolders[token][strategy][balancesCounters[token][strategy].current()].length();
    }

    function tokenHoldersItemByIndex(address token, address strategy, uint index) external view returns (address) {
        return tokenHolders[token][strategy][balancesCounters[token][strategy].current()].at(index);
    }

    function tokenHoldersByStrategy(address token, address strategy) external view returns (address[] memory) {
        return tokenHolders[token][strategy][balancesCounters[token][strategy].current()].values();
    }

    function tokenHoldersLength(address token, address strategy, uint counter) external view returns (uint) {
        return tokenHolders[token][strategy][counter].length();
    }

    function tokenHoldersItemByIndex(address token, address strategy, uint counter, uint index) external view returns (address) {
        return tokenHolders[token][strategy][counter].at(index);
    }

    function tokenHoldersByStrategy(address token, address strategy, uint counter) external view returns (address[] memory) {
        return tokenHolders[token][strategy][counter].values();
    }

    function isStrategyOnPause(address strategy) public view returns (bool) {
        return IStrategyManager(strategy).getRolloverStatus();
    }
}
