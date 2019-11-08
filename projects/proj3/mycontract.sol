pragma solidity ^0.4.15;
contract Battleship {
    uint BOARD_LEN = 6;
    
    function merge_bytes32(bytes32 a, bytes32 b) pure public returns (bytes memory) {
        bytes memory result = new bytes(64);
        assembly {
            mstore(add(result, 32), a)
            mstore(add(result, 64), b)
        }
        return result;
    }
        
    // veryify_commit - verifies that a given opening of a commitment and proof correspond to commit
    // \args:
    //      opening_nonce - corresponds to web3.utils.fromAscii(JSON.stringify(opening) + JSON.stringify(nonce)));
    //      proof - list of sha256 hashes that correspond to output from get_proof_for_board_guess()
    //      guess - [i, j] - guess that opening corresponds to
    //      commit - sha256 hash
    function veryify_commit(bytes opening_nonce, bytes32[] proof, uint[] guess, bytes32 commit) public view returns (bool) {
        bytes32 curr_commit = keccak256(opening_nonce);
        uint index_in_leaves = guess[0] * BOARD_LEN + guess[1];
        uint curr_proof_index = 0;
        uint i = 0;
        while (curr_proof_index < proof.length) {
            // index of which group guess is in for current this level of Merkle
            // equivalent to index of parent in next level of Merkle
            uint group_in_level_of_merkle = index_in_leaves / (2**i);
            // index in Merkle group \in (0, 1)
            uint index_in_group = group_in_level_of_merkle % 2;
            // max node index for curr Merkle level
            uint max_node_index = ((BOARD_LEN * BOARD_LEN + 2** i - 1) / 2** i) - 1;
            // index of sibling of curr_commit
            uint sibling = group_in_level_of_merkle - index_in_group + (index_in_group + 1) % 2;
            i++;
            if (sibling > max_node_index) continue;
            if (index_in_group % 2 == 0) {
                curr_commit = keccak256(merge_bytes32(curr_commit, proof[curr_proof_index]));
                curr_proof_index++;
            } else {
                curr_commit = keccak256(merge_bytes32(proof[curr_proof_index], curr_commit));
                curr_proof_index++;
            }
        }
        return (curr_commit == commit);
    }

}