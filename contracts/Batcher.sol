// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "openzeppelin-solidity/contracts/access/Ownable.sol";

contract Batcher is Ownable {

    struct Call {
        address to;
        uint value;
        bytes data;

        uint outVarIndex; // 0 => output is ignored. N => output assigned to variable at index N-1
        uint[] varPositions; // varIndex => varPosition in data, e.g. [0 (UNUSED_VAR), 60, 0 (UNUSED_VAR), 0 (UNUSED_VAR)]
    }

    receive() external payable {}

    function execute(Call[] memory calls, uint numVars) external payable onlyOwner /*returns (uint[] memory vars)*/ {
        uint[] memory vars = new uint[](numVars);
        for(uint i = 0; i < calls.length; i++) {
            bytes memory data = calls[i].data;

            if(i > 0) {
                uint[] memory varPositions = calls[i].varPositions;
                for(uint varId = 0; varId < numVars; varId++) {
                    uint varPos = varPositions[varId];
                    if(varPos > 3) {
                        uint varValue = vars[varId];
                        assembly {
                            mstore(add(data, add(0x20, varPos)), varValue)
                        }
                    }
                }
            }

            (bool success, bytes memory out) = calls[i].to.call{ value: calls[i].value }(data);
            if (!success) {
                // solhint-disable-next-line no-inline-assembly
                assembly {
                    returndatacopy(0, 0, returndatasize())
                    revert(0, returndatasize())
                }
            }

            uint outVarId = calls[i].outVarIndex;
            if(outVarId > 0) {
                vars[outVarId - 1] = abi.decode(out, (uint256));
            }
        }
    }

}