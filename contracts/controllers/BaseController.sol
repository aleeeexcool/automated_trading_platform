// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BaseController {

    address public immutable manager;

    constructor(address _manager) {
        require(_manager != address(0), "INVALID_ADDRESS");

        manager = _manager;
    }

    modifier onlyManager() {
        require(address(this) == manager, "NOT_MANAGER_ADDRESS");
        _;
    }
}

