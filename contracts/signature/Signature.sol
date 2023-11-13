// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../interfaces/IManagerV3.sol";

library Signature {

    function concat(address token, uint amount, IManagerV3.ControllerTransferData[] calldata cycleSteps) internal pure returns (bytes memory) {
        bytes memory output;
        output = abi.encodePacked(output, token);
        output = abi.encodePacked(output, amount);
        for (uint256 i = 0; i < cycleSteps.length; i++) {
            output = abi.encodePacked(output, cycleSteps[i].controllerId);
            output = abi.encodePacked(output, cycleSteps[i].data);
        }
        return output;
    }

    function splitSignature(bytes memory sig)
    internal
    pure
    returns (uint8 v, bytes32 r, bytes32 s)
    {
        require(sig.length == 65);
        assembly {
        // first 32 bytes, after the length prefix.
            r := mload(add(sig, 32))
        // second 32 bytes.
            s := mload(add(sig, 64))
        // final byte (first byte of the next 32 bytes).
            v := byte(0, mload(add(sig, 96)))
        }
        return (v, r, s);
    }

    function recoverSigner(bytes32 message, bytes memory sig)
    internal
    pure
    returns (address)
    {
        (uint8 v, bytes32 r, bytes32 s) = splitSignature(sig);
        return ecrecover(message, v, r, s);
    }

    /// builds a prefixed hash to mimic the behavior of eth_sign.
    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    function checkSignature(address token, uint amount, IManagerV3.ControllerTransferData[] calldata cycleSteps, bytes memory signature, address validSigner) internal pure {
        bytes memory concatenated = concat(token, amount, cycleSteps);
        bytes32 message = keccak256(concatenated);
        address _signer = recoverSigner(prefixed(message), signature);
        require(_signer == validSigner, "INVALID_SIGNER");
    }
}

