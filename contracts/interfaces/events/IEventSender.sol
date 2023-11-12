// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IEventSenderV2 {
    event DestinationsSet(address fxStateSender);
    event EventSendSet(bool eventSendSet);

    function setDestination(address messageProcessor) external;

    /// @notice Enables or disables the sending of events
    function setEventSend(bool eventSendSet) external;
}

