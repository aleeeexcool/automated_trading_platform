// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import {SafeMathUpgradeable as SafeMath} from "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import {AccessControlUpgradeable as AccessControl} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "../interfaces/IManagerV3.sol";
import "../interfaces/events/IEventSender.sol";
import "../interfaces/events/IBalanceTrackerV2.sol";
import "../multicall/payable/Multicall.sol";
import {Signature} from "../signature/Signature.sol";

/**
* @title StrategyManagerV5
* @dev Contract is responsible for managing users shares in different storing contracts own and third party
* @dev Main difference from StrategyManagerV3 is that it's Multicall and  it uses bytes32 controller id instead
   of address to allow using same controller contract for different purposes, e.g. one controller to deposit into different UniswapV3 pools
*/
contract StrategyManagerV5 is IManagerV3, IEventSenderV2, Initializable, AccessControl, Multicall {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Address for address;
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ROLLOVER_ROLE = keccak256("ROLLOVER_ROLE");
    bytes32 public constant MID_CYCLE_ROLE = keccak256("MID_CYCLE_ROLE");
    bytes32 public constant START_ROLLOVER_ROLE = keccak256("START_ROLLOVER_ROLE");

    bool public rolloverStarted;

    // Bytes32 controller id => controller address
    mapping(bytes32 => address) public registeredControllers;

    // Bytes32 controller id => controller address, IMPORTANT: controllers, which operations affects user balances
    mapping(bytes32 => address) public balanceControllers;

    // Bytes32 controller id -> balance
    mapping(bytes32 => uint) public tokenTotalSupplies;
    // user account address -> bytes32 controller id -> balance
    mapping(address => mapping(bytes32 => uint)) public accountTokenBalances;

    // bytes32 controller id -> set of user addresses with balance > 0
    mapping (bytes32 => EnumerableSet.AddressSet) private shareHolders;

    EnumerableSet.AddressSet private tokens;

    EnumerableSet.Bytes32Set private controllerIds;

    // Reentrancy Guard
    bool private _entered;
    bool public _eventSend;
    IBalanceTrackerV2 public balanceTracker;

    enum OperationType {
        DEPOSIT,
        WITHDRAW,
        OTHER
    }

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, _msgSender()), "NOT_ADMIN_ROLE");
        _;
    }

    modifier onlyRollover() {
        require(hasRole(ROLLOVER_ROLE, _msgSender()), "NOT_ROLLOVER_ROLE");
        _;
    }

    modifier onlyMidCycle() {
        require(hasRole(MID_CYCLE_ROLE, _msgSender()), "NOT_MID_CYCLE_ROLE");
        _;
    }

    modifier nonReentrant() {
        require(!_entered, "ReentrancyGuard: reentrant call");
        _entered = true;
        _;
        _entered = false;
    }

    modifier onlyStartRollover() {
        require(hasRole(START_ROLLOVER_ROLE, _msgSender()), "NOT_START_ROLLOVER_ROLE");
        _;
    }

    modifier whenNotPaused() {
        require(!rolloverStarted, "Pausable: paused");
        _;
    }

    address public signer;
    //fee values
    address public feeRecipient;
    uint constant public FEE_DENOMINATOR = 1000;
    uint public depositFee = 0;
    uint public withdrawFee = 0;

    constructor() {
        signer = msg.sender;
    }

    function initialize() public initializer {
        __Context_init_unchained();
        __AccessControl_init_unchained();

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());

        _setupRole(ADMIN_ROLE, _msgSender());
        _setupRole(ROLLOVER_ROLE, _msgSender());
        _setupRole(MID_CYCLE_ROLE, _msgSender());
        _setupRole(START_ROLLOVER_ROLE, _msgSender());

    }

    function setDestination(address _balanceTracker)
        external
        override
        onlyAdmin
    {
        require(_balanceTracker != address(0), "INVALID_ADDRESS");
        balanceTracker = IBalanceTrackerV2(_balanceTracker);
    }

    function setEventSend(bool _eventSendSet) external override onlyAdmin {
        require(address(balanceTracker) != address(0), "DESTINATIONS_NOT_SET");

        _eventSend = _eventSendSet;

        emit EventSendSet(_eventSendSet);
    }

    function registerController(bytes32 id, address controller, bool isBalance) external override onlyAdmin {
        registeredControllers[id] = controller;
        if (isBalance) {
            balanceControllers[id] = controller;
        }
        require(controllerIds.add(id), "ADD_FAIL");
        emit ControllerRegistered(id, controller, isBalance);
    }

    function unRegisterController(bytes32 id) external override onlyAdmin {
        emit ControllerUnregistered(id, registeredControllers[id]);

        delete registeredControllers[id];
        delete balanceControllers[id];

        require(controllerIds.remove(id), "REMOVE_FAIL");
    }

    function getControllers() external view override returns (bytes32[] memory) {
        uint256 controllerIdsLength = controllerIds.length();
        bytes32[] memory returnData = new bytes32[](controllerIdsLength);
        for (uint256 i = 0; i < controllerIdsLength; i++) {
            returnData[i] = controllerIds.at(i);
        }
        return returnData;
    }

    function registerToken(address token) external override onlyAdmin {
        require(address(token) != address(0), "INVALID_TOKEN");
        require(tokens.add(token), "ADD_TOKEN_FAIL");
    }

    function unRegisterToken(address token) external override onlyAdmin {
        require(tokens.remove(token), "REMOVE_TOKEN_FAIL");
    }

    function getTokens() external view override returns (address[] memory) {
        return tokens.values();
    }

    function completeRollover() external override onlyRollover {
        _completeRollover();
    }

    function executeControllerCommands(ControllerTransferData[] calldata cycleSteps, OperationType opType, uint withdrawPercent) private {
        for (uint256 x = 0; x < cycleSteps.length; x++) {
            _executeControllerCommand(cycleSteps[x], opType, withdrawPercent);
        }
    }

    /// @notice Used for mid-cycle adjustments
    function executeMaintenance(MaintenanceExecution calldata params)
        external
        override
        onlyMidCycle
        nonReentrant
    {
        executeControllerCommands(params.cycleSteps, OperationType.OTHER, 0);
    }

    function executeRollover(RolloverExecution calldata params) external override onlyRollover nonReentrant {
        // Deploy or withdraw liquidity
        executeControllerCommands(params.cycleSteps, OperationType.OTHER, 0);

        if (params.complete) {
            _completeRollover();
        }
    }

    function decodeBalances(bytes memory data) pure public returns (uint first, uint second) {
        (first, second) = abi.decode(data, (uint, uint));
    }

    function updateHolders(bytes32 controllerId, address account, uint sharesAmount) internal {
        if (shareHolders[controllerId].contains(account)) {
            if (sharesAmount == 0) {
                shareHolders[controllerId].remove(account);
            }
        } else if (sharesAmount > 0) {
            shareHolders[controllerId].add(account);
        }
    }

    function _executeControllerCommand(ControllerTransferData calldata transfer, OperationType opType, uint withdrawPercent) private {
        address controllerAddress = registeredControllers[transfer.controllerId];
        require(controllerAddress != address(0), "INVALID_CONTROLLER");
        bytes memory _data = controllerAddress.functionDelegateCall(transfer.data, "CYCLE_STEP_EXECUTE_FAILED");
        if (opType == OperationType.DEPOSIT && balanceControllers[transfer.controllerId] != address(0)) {
            (uint balanceBefore, uint balanceAfter) = decodeBalances(_data);//TODO handle balanceBefore zero for non-first deposit
            uint balanceDiff = balanceAfter.sub(balanceBefore);
            uint256 shares = 0;
            if (tokenTotalSupplies[transfer.controllerId] == 0) {
                shares = balanceDiff;
            } else {
                shares = (balanceDiff.mul(tokenTotalSupplies[transfer.controllerId])).div(balanceBefore);
            }
            tokenTotalSupplies[transfer.controllerId] = tokenTotalSupplies[transfer.controllerId].add(shares);
            accountTokenBalances[msg.sender][transfer.controllerId] = accountTokenBalances[msg.sender][transfer.controllerId].add(shares);
            updateHolders(transfer.controllerId, msg.sender, accountTokenBalances[msg.sender][transfer.controllerId]);
            sendBalanceUpdate(msg.sender, transfer.controllerId, balanceDiff, 0);
        }
        if (opType == OperationType.WITHDRAW && balanceControllers[transfer.controllerId] != address(0)) {
            (uint balanceBefore, uint balanceAfter) = decodeBalances(_data);
            uint balanceDiff = balanceBefore.sub(balanceAfter);
            uint sharesByPercent = accountTokenBalances[msg.sender][transfer.controllerId].mul(withdrawPercent).div(100);
            uint shares = balanceDiff.mul(tokenTotalSupplies[transfer.controllerId]).div(balanceBefore);
            require(shares <= sharesByPercent, "PERCENT_SHARES_MISMATCH");
            // à la burn
            uint sharesToBurn = withdrawPercent == 100 ? accountTokenBalances[msg.sender][transfer.controllerId] : shares;
            accountTokenBalances[msg.sender][transfer.controllerId] = accountTokenBalances[msg.sender][transfer.controllerId].sub(sharesToBurn, "INVALID_SHARES");
            tokenTotalSupplies[transfer.controllerId] = tokenTotalSupplies[transfer.controllerId].sub(sharesToBurn);
            updateHolders(transfer.controllerId, msg.sender, accountTokenBalances[msg.sender][transfer.controllerId]);
            sendBalanceUpdate(msg.sender, transfer.controllerId, 0, balanceDiff);
        }
    }

    function sendBalanceUpdate(address user, bytes32 controllerId, uint depositAmount, uint withdrawAmount) internal {
        if (_eventSend) {
            balanceTracker.updateBalances(user, controllerId, depositAmount, withdrawAmount);
        }
    }

    function startCycleRollover() external override onlyStartRollover {
        rolloverStarted = true;
    }

    function _completeRollover() private {
        rolloverStarted = false;
    }

    function getRolloverStatus() external view override returns (bool) {
        return rolloverStarted;
    }

    function setupRole(bytes32 role) external override onlyAdmin {
        _setupRole(role, _msgSender());
    }

    function deposit(uint amount, address token, ControllerTransferData[] calldata cycleSteps, bytes memory signature) external whenNotPaused nonReentrant {
        Signature.checkSignature(token, amount, cycleSteps, signature, signer);
        require(tokens.contains(token), "INVALID_TOKEN");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        if (depositFee > 0 && feeRecipient != address(0)) {
            uint feeAmount = amount.mul(depositFee) / FEE_DENOMINATOR;
            IERC20(token).safeTransfer(feeRecipient, feeAmount);
        }
        executeControllerCommands(cycleSteps, OperationType.DEPOSIT, 0);
        emit Deposit(msg.sender, token, amount);
    }

    function withdraw(address token, uint withdrawPercent, ControllerTransferData[] calldata cycleSteps, bytes memory signature) external whenNotPaused nonReentrant {
        Signature.checkSignature(token, withdrawPercent, cycleSteps, signature, signer);
        require(tokens.contains(token), "INVALID_TOKEN");
        require(0 < withdrawPercent && withdrawPercent <= 100, "INVALID_PERCENT");
        executeControllerCommands(cycleSteps, OperationType.WITHDRAW, withdrawPercent);
        uint amount = IERC20(token).balanceOf(address(this));
        if (withdrawFee > 0 && feeRecipient != address(0)) {
            uint feeAmount = amount.mul(withdrawFee) / FEE_DENOMINATOR;
            IERC20(token).safeTransfer(feeRecipient, feeAmount);
            amount = amount.sub(feeAmount);
        }
        IERC20(token).transfer(msg.sender, amount);
        emit Withdraw(msg.sender, token, amount);
    }

    function copyTotalSupply(bytes32 sourceControllerId, bytes32 destinationControllerId) external onlyRollover {
        require(registeredControllers[sourceControllerId] != address(0), "Invalid source controller");
        require(registeredControllers[destinationControllerId] != address(0), "Invalid destination controller");
        tokenTotalSupplies[destinationControllerId] = tokenTotalSupplies[sourceControllerId];
    }

    function copyShares(bytes32 sourceControllerId, bytes32 destinationControllerId, address[] calldata users) external onlyRollover {
        require(registeredControllers[sourceControllerId] != address(0), "Invalid source controller");
        require(registeredControllers[destinationControllerId] != address(0), "Invalid destination controller");
        for (uint256 i = 0; i < users.length; i++) {
            accountTokenBalances[users[i]][destinationControllerId] = accountTokenBalances[users[i]][sourceControllerId];
        }
    }

    function setTotalSupply(bytes32 controllerId, uint totalSupply) external onlyRollover {
        require(registeredControllers[controllerId] != address(0), "Invalid controller");
        require(totalSupply > 0, "Invalid total supply");
        tokenTotalSupplies[controllerId] = totalSupply;
    }

    function setShares(bytes32 controllerId, address[] calldata users, uint[] calldata shares) external onlyRollover {
        require(registeredControllers[controllerId] != address(0), "Invalid controller");
        require(users.length == shares.length, "Invalid user shares");
        for (uint256 i = 0; i < users.length; i++) {
            accountTokenBalances[users[i]][controllerId] = shares[i];
            updateHolders(controllerId, users[i], accountTokenBalances[users[i]][controllerId]);
        }
    }

    function tokenHoldersLength(bytes32 controllerId) external view returns (uint) {
        return shareHolders[controllerId].length();
    }

    function tokenHoldersItemByIndex(bytes32 controllerId, uint index) external view returns (address) {
        return shareHolders[controllerId].at(index);
    }

    function tokenHoldersByController(bytes32 controllerId) external view returns (address[] memory) {
        return shareHolders[controllerId].values();
    }

    function setSigner(address _signer) external onlyAdmin {
        require(address(_signer) != address(0), "INVALID_ADDRESS");
        signer = _signer;
    }

    function setFees(uint _depositFee, uint _withdrawFee, address _feeRecipient) external onlyAdmin {
        depositFee = _depositFee;
        withdrawFee = _withdrawFee;
        feeRecipient = _feeRecipient;
    }

    receive() external payable {}
}

