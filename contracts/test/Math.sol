// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


contract Math {
    function add(uint a, uint b) external pure returns (uint sum) {
        return a + b;
    }
    function sub(uint a, uint b) external pure returns (uint difference) {
        return a - b;
    }
    function mul(uint a, uint b) external pure returns (uint product) {
        return a * b;
    }
    function div(uint a, uint b) external pure returns (uint quotient) {
        return a / b;
    }
    function ethBalance() external view returns (uint balance) {
        return msg.sender.balance;
    }
}