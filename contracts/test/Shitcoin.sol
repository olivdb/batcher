// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract Shitcoin is ERC20("Shitcoin", "SHIT") {
    function mint(address account, uint amount) external {
        _mint(account, amount);
    }
    
}