// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "./Batcher.sol";

contract BatcherFactory {
    event Created(address indexed owner, address batcher);

    function build() external returns (address payable batcher) {
        batcher = build(msg.sender);
    }

    function build(address _owner) public returns (address payable batcher) {
        batcher = payable(new Batcher());
        Batcher(batcher).transferOwnership(_owner);
        emit Created(_owner, batcher);        
    }
}