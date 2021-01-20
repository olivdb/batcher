// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract Coolcoin is ERC20("Coolcoin", "COOL") {
    function mint(address account, uint amount) external {
        _mint(account, amount);
    }
    
}