// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract MasterChefStub {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct PoolInfo {
        IERC20 lpToken;           // Address of LP token contract.
    }

    struct UserInfo {
        uint256 amount;     // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
    }

    // Info of each pool.
    PoolInfo[] public poolInfo;
    // Info of each user that stakes LP tokens.
    mapping (uint256 => mapping (address => UserInfo)) public userInfo;

    function add(uint256 _allocPoint, IERC20 _lpToken) public {
        poolInfo.push(PoolInfo({
        lpToken: _lpToken
        }));
    }

    //Staking LPs
    function deposit(uint256 _pid, uint256 _amount) public {
//        require (_pid != 0, 'deposit VVS by staking');

        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        if (_amount > 0) {
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            user.amount = user.amount.add(_amount);
        }
    }

    function withdraw(uint256 _pid, uint256 _amount) public {
//        require (_pid != 0, 'withdraw VVS by unstaking');
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "withdraw: not good");

        if(_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.lpToken.safeTransfer(address(msg.sender), _amount);
        }
    }
}

