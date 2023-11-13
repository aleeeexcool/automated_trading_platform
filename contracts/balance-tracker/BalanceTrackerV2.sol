// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import {DateTime} from "../utils/DateTime.sol";

/**
* Version is compatible with StrategyManagerV4
*/
contract BalanceTrackerV2 is Ownable {

    struct Balance {
        uint256 deposit;
        uint256 withdraw;
    }

    struct BalanceOutput {
        uint256 timestamp;
        uint256 deposit;
        uint256 withdraw;
    }

    uint256 public RECORD_PERIOD_IN_SECONDS = 300; // 5 minutes

    // callers' list
    mapping(address => bool) public registeredStrategies;

    // strategyManager_address => well_address => timestamp => balance
    mapping(
        address => mapping(
            address => mapping(uint256 => Balance)
        )
    ) public managerBalances;

    // strategyManager_address => user_account_address => well_address => timestamp => balance
    mapping(
        address => mapping(
            address => mapping(
                address => mapping(uint256 => Balance)
            )
        )
    ) public userBalances;

    /**
     * @dev Restiction of calling for all except Caller
     */
    modifier onlyRegistered {
        require(
            registeredStrategies[msg.sender],
            "ONLY_REGISTERED"
        );
        _;
    }

    /**
     * @dev Setting of strategies' addresses to caller's list
     */
    function setStrategies(address _strategy, bool _allowed) external onlyOwner {
        require(
            _strategy != address(0) && _strategy != address(this),
            "INVALID_ADDRESS"
        );
        registeredStrategies[_strategy] = _allowed;
    }

    /**
     * @dev Getting of start-period-dimestamp
     */
    function getPeriodTimestampInsideHour(uint256 _timestamp) private view returns (uint256 periodTimestamp) {
        DateTime._DateTime memory parsedDate = DateTime.getParsedTimestamp(_timestamp);
        uint256 hourTimestamp = DateTime.toTimestamp(parsedDate.year, parsedDate.month, parsedDate.day, parsedDate.hour);
        uint256 periodsAmount = (_timestamp - hourTimestamp) / RECORD_PERIOD_IN_SECONDS;
        periodTimestamp = hourTimestamp + (periodsAmount * RECORD_PERIOD_IN_SECONDS);
    }

    /**
     * @dev Updating balances
     */
    function updateBalances(
        address _user,
        address _well,
        uint256 _deposit,
        uint256 _withdraw
    ) external onlyRegistered {
        uint256 periodTimestamp = getPeriodTimestampInsideHour(block.timestamp);
        userBalances[msg.sender][_user][_well][periodTimestamp].deposit += _deposit;
        userBalances[msg.sender][_user][_well][periodTimestamp].withdraw += _withdraw;
        managerBalances[msg.sender][_well][periodTimestamp].deposit += _deposit;
        managerBalances[msg.sender][_well][periodTimestamp].withdraw += _withdraw;
    }

    /**
     * @dev Getting of balances' list by timestamps' diapason
     */
    function getWellBalances(
        address _strategyManager,
        address _user,
        address _well,
        uint256 _timestampFrom,
        uint256 _timestampTo
    ) private view returns (BalanceOutput[] memory) {
        uint256 diapasonLength = (_timestampTo - _timestampFrom) / RECORD_PERIOD_IN_SECONDS;

        BalanceOutput[] memory balances = new BalanceOutput[](0);

        if (diapasonLength > 0) {
            uint32 count = 0;
            for (uint32 i = 0; i < diapasonLength; i++) {
                uint256 periodTimestamp = _timestampFrom + (RECORD_PERIOD_IN_SECONDS * i);

                uint256 deposit =
                    _user != address(0)
                    ? userBalances[_strategyManager][_user][_well][periodTimestamp].deposit
                    : managerBalances[_strategyManager][_well][periodTimestamp].deposit;
                uint256 withdraw =
                    _user != address(0)
                    ? userBalances[_strategyManager][_user][_well][periodTimestamp].withdraw
                    : managerBalances[_strategyManager][_well][periodTimestamp].withdraw;

                if (deposit > 0 || withdraw > 0) {
                    count++;
                }
            }

            balances = new BalanceOutput[](count);

            uint32 index = 0;
            for (uint32 i = 0; i < diapasonLength; i++) {
                uint256 periodTimestamp = _timestampFrom + (RECORD_PERIOD_IN_SECONDS * i);

                uint256 deposit =
                    _user != address(0)
                    ? userBalances[_strategyManager][_user][_well][periodTimestamp].deposit
                    : managerBalances[_strategyManager][_well][periodTimestamp].deposit;
                uint256 withdraw =
                    _user != address(0)
                    ? userBalances[_strategyManager][_user][_well][periodTimestamp].withdraw
                    : managerBalances[_strategyManager][_well][periodTimestamp].withdraw;

                if (deposit > 0 || withdraw > 0) {
                    balances[index] = BalanceOutput({
                        timestamp: periodTimestamp,
                        deposit: deposit,
                        withdraw: withdraw
                    });

                    index++;
                }
            }
        }

        return balances;
    }

    /**
     * @dev Getting of common directed balances' list by timestamps' diapazone
     */
    function getManagerBalances(
        address _strategyManager,
        address _well,
        uint256 _timestampFrom,
        uint256 _timestampTo
    ) external view returns (BalanceOutput[] memory) {
        uint256 timestampFrom = getPeriodTimestampInsideHour(_timestampFrom);

        return getWellBalances(
            _strategyManager,
            address(0),
            _well,
            timestampFrom,
            _timestampTo
        );
    }

    /**
     * @dev Getting of users' directed balances' list by timestamps' diapazone
     */
    function getUserBalances(
        address _strategyManager,
        address _user,
        address _well,
        uint256 _timestampFrom,
        uint256 _timestampTo
    ) external view returns (BalanceOutput[] memory) {
        uint256 timestampFrom = getPeriodTimestampInsideHour(_timestampFrom);
        return getWellBalances(
            _strategyManager,
            _user,
            _well,
            timestampFrom,
            _timestampTo
        );
    }
}

