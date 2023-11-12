// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

/**
 *  @title Controls the transition and execution of liquidity deployment cycles.
 *  Accepts instructions that can move assets from the Pools to the Exchanges
 *  and back. Can also move assets to the treasury when appropriate.
 */
interface IManagerV3 {
    // bytes can take on the form of deploying or recovering liquidity
    struct ControllerTransferData {
        bytes32 controllerId; // controller to target
        bytes data; // data the controller will pass
    }

    struct MaintenanceExecution {
        ControllerTransferData[] cycleSteps;
    }

    struct RolloverExecution {
        ControllerTransferData[] cycleSteps;
        bool complete; //Whether to mark the rollover complete
    }

    event ControllerRegistered(bytes32 id, address controller, bool isBalance);
    event ControllerUnregistered(bytes32 id, address controller);
    event Deposit(address user, address token, uint256 amount);
    event Withdraw(address user, address token, uint256 amount);

    /// @notice Registers controller
    /// @param id Bytes32 id of controller
    /// @param controller Address of controller
    function registerController(bytes32 id, address controller, bool isBalance) external;

    /// @notice Unregisters controller
    /// @param id Bytes32 controller id
    function unRegisterController(bytes32 id) external;

    ///@notice Gets ids of all controllers registered
    ///@return Memory array of Bytes32 controller ids
    function getControllers() external view returns (bytes32[] memory);

    /// @notice Registers token
    /// @param token Address
    function registerToken(address token) external;

    /// @notice Unregisters token
    /// @param token Address
    function unRegisterToken(address token) external;

    ///@notice Gets addresses of all tokens registered
    ///@return Memory array of Address tokens
    function getTokens() external view returns (address[] memory);

    ///@notice Starts cycle rollover
    ///@dev Sets rolloverStarted state boolean to true
    function startCycleRollover() external;

    ///@notice Allows for controller commands to be executed midcycle
    ///@param params Contains data for controllers and params
    function executeMaintenance(MaintenanceExecution calldata params) external;

    ///@notice Allows for withdrawals and deposits for pools along with liq deployment
    ///@param params Contains various data for executing against pools and controllers
    function executeRollover(RolloverExecution calldata params) external;

    ///@notice Completes cycle rollover, publishes rewards hash to ipfs
    function completeRollover() external;

    ///@notice Gets cycle rollover status, true for rolling false for not
    ///@return Bool representing whether cycle is rolling over or not
    function getRolloverStatus() external view returns (bool);

    /// @notice Setup a role using internal function _setupRole
    /// @param role keccak256 of the role keccak256("MY_ROLE");
    function setupRole(bytes32 role) external;
}
