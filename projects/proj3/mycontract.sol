pragma solidity ^0.5.12;

// Contract-level notes.
//  - Simultaneous battleship games between the same players are not supported
//    by this contract.
contract Battleship {
    // The possible states of an single battleship game.
    //  INITIALIZING - This state is set when Player A has proposed a game with
    //    Player B, but player B has not yet agreed to the game.
    //  STARTED - This state is triggered once both players have paid the ante.
    //    A game in this state is valid an on-going off-chain.
    //  TIMEOUT - A game enters this state when either participant claims
    //      that the other has timed-out (eg, refused to play off-chain).
    //      In that scenario, the moves must be resolved on-chain by the contract.
    enum GameState { NONE, INITIALIZING, STARTED, TIMEOUT }
    // Describes the type of timeout. We can either:
    //  (1) claim the opponent has not proposed a GUESS
    //  (2) claim the oppnent has not responded to our guess.
    enum TimeoutClass { NONE, GUESS, RESPONSE }
    
    // Struct to track information about a game in TIMEOUT state.
    struct Timeout {
        // The player that initiated the timeout. This is the only
        // player that can end it (and will receive the ante).
        address player;
        // The player on whom the timeout was called.
        address opponent;
        // The start time of the timeout, in block timestamp.
        uint start_time;
        // The class of timeout.
        TimeoutClass class;
        // The sequence number of the guess or response which is valid.
        uint32 seqno;
        
        // These fields are only set when class == RESPONSE
        // and the contract uses them to validate exit timeout setting.
        // See DesignDoc.txt for details on why this is needed.
        // All of these fields must be provided by the player claiming a
        //  timeout. 
        uint8[2] player_guess;  // Gueses are already validated.
        uint8[2] opponent_guess;  // Guesses are already validated.
        bool player_opening;
        uint32 player_nonce;
        bytes32[] player_proof;
        bytes32 opponent_board_commit; // Commit is validated.
    }
    
    // Represents a single on-going (or initializing) battleship game as tracked
    // by the contract.
    struct Game {
        // The state of the game. See GameState enum for details.
        GameState state;
        // The unique id of a battle ship game. All actions are referenced using
        // this id. game_id != 0;
        uint32 game_id;
        
        // The address of the player whom initialized this game.
        address player;
        // The address of the opponent (whom joined after the game was initialized).
        address opponent;
        // The amount put up to play this game. This is equivalent to the ante put
        // up by 'player' when we're in an INITIALIZING state, but will be equal to
        // min(<player ante>, <opponent ante>) once an opponent has 
        // This value will always be > 0, to incentivize play.
        // units: wei
        uint ante;
    
        // Only set if a game is in TIMEOUT state.
        Timeout timeout;
        
        // The most up-to-date seqno knows to the contract.
        uint latest_seqno;
    }
    
    // Constant keeping track of the size of the board for a battleship game.
    uint8 constant BOARD_LEN  = 6;
    uint8 constant MIN_ANTE = 2;
    uint8 constant RESIGN_REWARD = MIN_ANTE / 2;
    uint constant MAX_WAIT_TIME = 1 hours;
    
    // Mapping from player address to their corresponding game id. Note that a
    // value player_to_game_id[address] == 0 implies the game is non-existent.
    mapping(address => uint32) player_to_game_id;
    // Mapping from unique game ids to their corresponding game.
    mapping(uint32 => Game) game_id_to_game;
    
    // This should be called by players seeking to start or join an existing
    // game.
    // The first player to call this function will initialize the game, while
    // the second player to call will join the game at the minimum of the antes
    // with any amount refunded. See Design Doc for more details.
    // 
    // Arguments:
    //  opponent_address: The address of the opponent.
    //  ante: This value is based on msg.value and is the ante propsoed by this
    //          player for the game.
    function start_or_join_game(address opponent) public payable {
        uint ante = msg.value;
        address player = msg.sender;
        
        require(ante >= MIN_ANTE, "Game ante must be at least minimum.");
        require(player != opponent, "Cannot play against yourself");
        
        uint32 game_id = player_to_game_id[player];
        // Initialize a new game.
        if (game_id == 0) {
            // Neither player must already be in a game.
            require(player_to_game_id[player] == 0 && player_to_game_id[opponent] == 0,
                "Player and Opponent must not already be in a game.");
            
            // Convert to uint32 to reduce space usage.
            game_id = uint32(bytes4(keccak256(abi.encodePacked(player, opponent, now))));
            require(game_id != 0, "Internal error. Generated invalid game id.");
            
            // Game must not have already been initialized.
            Game storage game = game_id_to_game[game_id];
            require(game.state == GameState.NONE,
                "Internal error. Non-existent game must be newly initialized.");
            
            // Store information about the game.
            game.state = GameState.INITIALIZING;
            game.game_id = game_id;
            game.player = player;
            game.opponent = opponent;
            game.ante = ante;
            
            // Associate this game with each player. We've already verified we're not overriding.
            player_to_game_id[player] = game_id;
            player_to_game_id[opponent] = game_id;
        }
        // Complete game set-up since a game already exists.
        else {
            // Game must be in INITIALIZING state and fields must be valid.
            // Note that in this if-statement we expect 'player' to be the 'opponent' who is
            // joining an already INITIALIZING game. We verify these assumptions.
            Game storage game = game_id_to_game[game_id];
            // Both players must already be part of the same INITIALIZING game (honest).
            require(game_id == player_to_game_id[opponent],
                "Joining an INITIALIZING game requires both players to be part of the same game.");
            // Change game state to started before refunding (avoid possible attacks).
            game.state = GameState.STARTED;
            
            // Find the minimum ante. game.ante is that put up by the original 'player' (
            // in this context) and ante is that put up by the original 'opponent' (player now).
            uint256 min_ante = min(game.ante, ante); // We know this is non-zero.
            uint256 refund = 0; // To be set in statements below.
            address payable refund_address = address(0x0); // To be set in statements below.
            if (game.ante > min_ante) {
                // Refund 'game.player' ('opponent' in this context).
                refund = game.ante - min_ante;
                // Requires casting.
                refund_address = address(uint160(opponent));
                game.ante = min_ante;
            }
            else if (ante > min_ante) {
                // Refund 'game.opponent' ('player' in this context)
                refund = ante - min_ante;
                refund_address = msg.sender;
                game.ante = min_ante;
            }
            if (refund > 0) {
                // Do this at the end of the contract to avoid any possible attacks.
                refund_address.transfer(refund);
            }
        }
    }
    
    // Returns the game_id of the game the sender is participating within.
    function get_game_id() public view returns (uint32) {
        uint32 game_id = player_to_game_id[msg.sender];
        return game_id;
    }
    
    // Allows any player to resign any games to which they have not committed to play.
    function resign_uninitialized_game() public {
        address player = msg.sender;
        
        // Find the game and verify it is between player and opponent and is initialized.
        uint32 game_id = player_to_game_id[player];
        require(game_id != 0, "Cannot resign a game if player is not involved in any game.");
        Game memory game = game_id_to_game[game_id];
        require(game.state == GameState.INITIALIZING, "Cannot resign game which has already started.");
        
        address payable payee = address(uint160(game.player));
        uint payment_amout = game.ante;
        
        // Reset the game and pay the ante back to the player.
        delete player_to_game_id[game.player];
        delete player_to_game_id[game.opponent];
        delete game_id_to_game[game_id];
        
        // Do this *after* resetting the game.
        payee.transfer(payment_amout);
    }
    
    // Allows a player to resign a game that's already on-going. The resigning player is
    // given some amount of money to encourage resigning when they've lost.
    function resign() public {
        address player = msg.sender;
        uint32 game_id = player_to_game_id[player];
        require(game_id != 0, "Cannot resign a game if player is not involved");
        Game memory game = game_id_to_game[game_id];
        require(game.state != GameState.INITIALIZING,
            "Use resign_uninitialized_game game to resing a game that's not started already.");
        address opponent = (game.player == player) ? game.opponent : game.player;
        
        address payable winner = address(uint160(opponent));
        address payable loser = address(uint160(player));
        uint winner_amount = 2*game.ante - RESIGN_REWARD;
        
        // Reset the game and pay the ante back to the player.
        delete player_to_game_id[game.player];
        delete player_to_game_id[game.opponent];
        delete game_id_to_game[game_id];
        
        // Do this *after* resetting the game.
        winner.transfer(winner_amount);
        loser.transfer(RESIGN_REWARD);
    }
    // Allows a player to proof that an opponent has resigned.
    function resign(bytes memory resignation) public {
        address player = msg.sender;
        uint32 game_id = player_to_game_id[player];
        
        if (game_id == 0) {
            // Don't throw error. It is valid for opponent to call this after game is deleted.
            return;
        }
        
        Game memory game = game_id_to_game[game_id];
        
        require(game.state != GameState.INITIALIZING,
            "Use resign_uninitialized_game game to resing a game that's not started already.");
        
        address opponent = (game.player == player) ? game.opponent : game.player;
        
        // Verify resignation is signed by opponent.
        bytes memory resignation_msg = 'I lost';
        require(verify_sig(keccak256(abi.encodePacked(resignation_msg)), resignation, opponent));
        
        address payable winner = address(uint160(player));
        address payable loser = address(uint160(opponent));
        uint winner_amount = 2*game.ante - RESIGN_REWARD;
        
        // Reset the game and pay the ante back to the player.
        delete player_to_game_id[game.player];
        delete player_to_game_id[game.opponent];
        delete game_id_to_game[game_id];
        
        // Do this *after* resetting the game.
        winner.transfer(winner_amount);
        // Loser also gets a bit since they voluntarily resigned.
        loser.transfer(RESIGN_REWARD);
        
    }
    
    // This function can be used by a player to claim that the opposing player has
    // timed out and is not providing a guess (when it is their turn).
    // Params:
    //  (guesses[0], guesses[1], seqno, game_id), opponent_sig: The most recent guess by our opponent.
    //  (guesses[2], guesses[3], seqno + 1, game_id), signature: Our most recent guess.
    function claim_timeout(uint8[4] memory guesses, uint32 seqno,
        bytes memory opponent_sig, bytes memory sig) public {
    
        address player = msg.sender;
        uint32 game_id = player_to_game_id[player];
        
        require(game_id > 0);
        
        Game storage game = game_id_to_game[game_id];
        
        require(game.state == GameState.STARTED, "Only on-going games can be in timeout.");
        // Can only be called on moves we haven't already verified.
        require(game.latest_seqno < seqno + 1, "seqno failed");
        
        address opponent = (game.player == player) ? game.opponent : game.player;
        
        require(verify_guesses(guesses, seqno, opponent_sig, sig , opponent, player),
            "Guesses did not verify.");

        
        // If everything has checked out till this point, the game enters timeout.
        game.state = GameState.TIMEOUT;
        game.timeout.player = player;
        game.timeout.opponent = opponent;
        game.timeout.start_time = now;
        game.timeout.class = TimeoutClass.GUESS;
        game.timeout.seqno = seqno + 2;
        game.latest_seqno = seqno + 1;
    }
    // The pair function to the above claim_timeout. This should be called by the
    // player who is being accused of timing out with his guess.
    function resolve_timeout(uint8[2] memory guess, bytes memory signature) public {
        address player = msg.sender;
        uint32 game_id = player_to_game_id[player];
        require(game_id > 0);
        Game storage game = game_id_to_game[game_id];
        
        require(game.state == GameState.TIMEOUT, "Can only exist a game that's in timeout.");
        
        Timeout storage timeout = game.timeout;
        require(timeout.class == TimeoutClass.GUESS, "Must provide guess to resolve a GUESS timeout.");
        
        bytes32 guess_hash = keccak256(abi.encodePacked(guess[0], guess[1], timeout.seqno, game_id));
        
        // The guess must be signed by the player attempting to resolve the game.
        require(verify_sig(guess_hash, signature, player), "Invalid signature provided on guess");
        
        // We can now exist the timeout since the player has provided a valid guess.
        // Note that we allow timeouts to last indefinitely if the player that triggered
        // it decides never to exit.
        game.state = GameState.STARTED;
        delete game.timeout;
    }
    
    // This function provides the same functionality as above, but should be called
    // when the opposing players has timed-out in responding to our move.
    // We provide the opponents guess at seqno,
    // And we provide our response to their guess (at seqno)
    // And we provide our guess at seqno + 1. 
    // We expect a response at seqno + 1 (to our guess).
    // In order to enter this timeout, the caller must provide the opponents
    //  signed commitment to the board (this is used later when exiting the timeout).
    function claim_timeout(uint8[4] memory guesses, uint32 seqno,
        bytes memory opponent_sig, bytes memory sig,
        bool opening, uint32 nonce, bytes32[] memory proof,
        bytes32 opponent_board_commit, bytes memory opponent_board_commit_signature) public {
        
        address player = msg.sender;
        uint32 game_id = player_to_game_id[player];
        
        require(game_id > 0);
        Game storage game = game_id_to_game[game_id];
        
        require(game.state == GameState.STARTED, "Only on-going games can be in timeout.");
        // Can only be called on moves we haven't already verified.
        require(game.latest_seqno < seqno + 1);
        
        address opponent = (game.player == player) ? game.opponent : game.player;
        
        require(verify_guesses(guesses, seqno, opponent_sig, sig , opponent, player));
        
        // Verify the opponent board commit (eg, player can't fake a board commit).
        // We will use this later to verify the response the opponent sends is
        // valid.
        require(verify_sig(opponent_board_commit, opponent_board_commit_signature, opponent));
        
        // If everything has checked out till this point, the game enters timeout.
        // Note that a RESPONSE timeout is somewhat tentative, since it's possible
        // that the provided [opening, nonce, proof] is invalid. 
        // However, we can't know right now since we don't have a trusted way 
        // to get access to the players' initial commit.
        game.state = GameState.TIMEOUT;
        game.timeout.player = player;
        game.timeout.opponent = opponent;
        game.timeout.start_time = now;
        game.timeout.class = TimeoutClass.RESPONSE;
        game.timeout.seqno = seqno + 1;
    
        game.timeout.opponent_guess = [guesses[0], guesses[1]];
        game.timeout.player_guess = [guesses[1], guesses[2]];
        game.timeout.player_opening = opening;
        game.timeout.player_nonce = nonce;
        game.timeout.player_proof = proof;
        game.timeout.opponent_board_commit = opponent_board_commit;
        
        game.latest_seqno = seqno;
    }
    // The pair function to the above claim_timeout. This should be called by the
    // player who is being accused of timing out with his response to a guess.
    // This player provides his response as well as the opponent's baord commit so
    // we can verify the timeout is valid. If the player suspects this timeout is
    // invalid, he can call this method with an invalid response and the contract
    // but valid opponent commits/signature and the contract will exit the timeout.
    function resolve_timeout(bool opening, uint32 nonce, bytes32[] memory proof,
        bytes32 opponent_board_commit, bytes memory opponent_board_commit_signature) public {
        address player = msg.sender;
        uint32 game_id = player_to_game_id[player];
        require(game_id > 0);
        Game storage game = game_id_to_game[game_id];
        
        require(game.player == player || game.opponent == player);
        require(game.state == GameState.TIMEOUT, "Can only exist a game that's in timeout.");
        
        Timeout storage timeout = game.timeout;
        
        require(timeout.class == TimeoutClass.RESPONSE, "Must provide response to resolve a RESPONSE timeout.");
        require(player != timeout.player, "Only the opponent can resolve the timeout.");
        
        // Verify the signature on the commit from the player that claimed the timeout.
        require(verify_sig(opponent_board_commit, opponent_board_commit_signature, timeout.player),
            "Provided board commit and signature are invalid");
            
        // Verify that the response the player sent originally was valid! Otherwise this timeout
        // is invalid and we immediately exit it (withut requring the player to reveal valid opening).
        if (!veryify_commit(timeout.player_opening, timeout.player_nonce, timeout.player_proof, opponent_board_commit, timeout.opponent_guess)) {
            // The timeout was entered with an invalid response. Exit immediately.
            game.state = GameState.STARTED;
            // Decrease the latest sequence number since the claimed response by the player was incorrect.
            game.latest_seqno -= 1;
            delete game.timeout;
            return;
        }
        
        // Otherwise, the timeout is valid and we must have the reponse match the player guess.
        require(veryify_commit(opening, nonce, proof, timeout.opponent_board_commit, timeout.player_guess),
            "Must provide valid response to opponent guess.");
            
        // With a valid response, we can exist the timeout.
        game.state = GameState.STARTED;
        delete game.timeout;
    }
    
    // This function ends a timeout'ed game if enough time has passed.
    // Otherwise it is a no-op. Only the player that claimed the timeout
    // can end it.
    function end_timeout() public {
        address payable player = msg.sender;
        uint32 game_id = player_to_game_id[player];
        require(game_id != 0, 'Cannot end non-existent game');
        Game storage game = game_id_to_game[game_id];
        require(game.state == GameState.TIMEOUT,
        "Cannot end timeout of a game that is not in timeout.");
        Timeout storage timeout = game.timeout;
        require(timeout.start_time + MAX_WAIT_TIME > now,
            "Cannot end timeout until 1 hour has passed.");
        require(timeout.player == player,
            "Only the player that initiated the timeout can end it.");
        
        uint payment_amout = 2 * game.ante;
        
        // End the game.
        delete player_to_game_id[game.player];
        delete player_to_game_id[game.opponent];
        delete game_id_to_game[game_id];
        
        // Do this at the end to avoid any possible attacks.
        player.transfer(payment_amout);
    }
    
    // Public function that allows the caller to check if the game they
    // participate in is currently in time-out phase.
    function check_timeout() public view returns (bool) {
        address player = msg.sender;
        uint32 game_id = player_to_game_id[player];
        require(game_id != 0, 'Non-existent game cannot be in timeout.');
        Game storage game = game_id_to_game[game_id];
        return game.state == GameState.TIMEOUT;
    }
    
    // This should be called by a player when a game is ending but the opponent has been
    // found to be cheating.
    function report_cheating(bool[BOARD_LEN][BOARD_LEN] memory opponent_board,
        uint32[BOARD_LEN][BOARD_LEN] memory opponent_nonces,
        bytes32 opponent_board_commit, bytes memory opponent_board_commit_signature) public {
            address payable player = msg.sender;
            uint32 game_id = player_to_game_id[player];
            require(game_id > 0, "Game must exists.");
            
            Game storage game = game_id_to_game[game_id];
            
            require(game.state == GameState.STARTED);
            
            address opponent = (game.player == player) ? game.opponent : game.player;
            // Board matches commit.
            require(opponent_board_commit == build_board_commitment(opponent_board, opponent_nonces),
                "Board did not validate.");
            // Signature matches opponent.
            require(verify_sig(opponent_board_commit, opponent_board_commit_signature, opponent),
                "Signature did not validate.");
            
            // Check to see if the opponent cheated.
            require(count_ships(opponent_board) != 10, "Opponent did not cheat with placement");
            
            // The opponent cheated so give all the $$ back to the reporting player.
            uint payment_amout = 2 * game.ante;
        
             // End the game.
            delete player_to_game_id[game.player];
            delete player_to_game_id[game.opponent];
            delete game_id_to_game[game_id];
            
            // Do this at the end to avoid any possible attacks.
            player.transfer(payment_amout);
        }
    
    
    /*********************************** PRIVATE ***********************************/
    // Counts the number of ships on the given board.
    function count_ships(bool[BOARD_LEN][BOARD_LEN] memory board) pure private returns (uint8) {
        uint8 count = 0;
        for (uint8 i = 0; i < BOARD_LEN; i++) {
            for (uint8 j = 0; j < BOARD_LEN; j++) {
                if (board[j][i]) count++;
            }
        }
        return count;
    }
    // Returns the merkle commitment for the given board + nonces.
    function build_board_commitment(bool[BOARD_LEN][BOARD_LEN] memory initial_board,
        uint32[BOARD_LEN][BOARD_LEN] memory nonces) pure private returns (bytes32) {
            bytes32[] memory curr_level = new bytes32[](BOARD_LEN * BOARD_LEN);
            // add all leaf nodes
            for (uint8 i = 0; i < BOARD_LEN; i++) {
                for (uint8 j = 0; j < BOARD_LEN; j++) {
                    // Note that array indexing is reversed in solidity.
                    curr_level[BOARD_LEN * j + i] = keccak256(abi.encodePacked(initial_board[j][i], nonces[j][i]));
                }
            }
            // build tree from leaves
            // while, current level of merkle has length > 1, add more levels
            uint8 curr_length = BOARD_LEN * BOARD_LEN;
            while (curr_length > 1) {
                curr_length = (curr_length % 2 == 0) ? curr_length / 2 : (curr_length / 2) + 1;
                bytes32[] memory next_level = new bytes32[](curr_length);
                // build new layer of tree
                for (uint8 i = 0; i + 1 < curr_level.length; i += 2) {
                    next_level[i / 2] = keccak256(abi.encodePacked(curr_level[i], curr_level[i+1]));
                }
                // if this most recent merkle level has an odd length, we need
                // to just hoist the last element into the next level
                if (curr_level.length % 2 != 0) {
                    next_level[curr_level.length / 2] = curr_level[curr_level.length - 1];
                }
                curr_level = next_level;
          }
          return curr_level[0];
        }
    
    
    // Function that verifies opponent and my guess where the oppon
    function verify_guesses(uint8[4] memory guesses, uint32 seqno,
        bytes memory first_sig, bytes memory second_sig,
        address first_player, address second_player) private view returns (bool) {
            require(first_player != second_player, "Players cannot be the same");
            require(
                guesses[0] >= 0 && guesses[0] < BOARD_LEN &&
                guesses[1] >= 0 && guesses[1] < BOARD_LEN &&
                guesses[2] >= 0 && guesses[2] < BOARD_LEN &&
                guesses[3] >= 0 && guesses[3] < BOARD_LEN, "Guesses are out of bounds.");
                
            uint32 game_id = player_to_game_id[first_player];
            require(game_id != 0, "Game must exists");
            
            Game storage game = game_id_to_game[game_id];
            
            require(
                (game.player == first_player || game.opponent == first_player) &&
                (game.player == second_player || game.opponent == second_player),
                "Players must be in the same game.");
            require(game.state == GameState.STARTED, "Game must be on-going.");
            // Verify first_player guess.
            bytes32 first_guess_hash = keccak256(abi.encodePacked(guesses[0], guesses[1], seqno, game_id));
            require(verify_sig(first_guess_hash, first_sig, first_player), "First player sig fails.");
            // Verify second_player signature.
            bytes32 second_guess_hash = keccak256(abi.encodePacked(guesses[2], guesses[3], seqno + 1, game_id));
            require(verify_sig(second_guess_hash, second_sig, second_player), "Second player sig fails.");
            return true;
    }
    
    // Private functions.
    // Returns the minimum of the two given values.
    function min(uint256 a, uint256 b) pure private returns (uint256) {
        if (a < b) return a;
        return b;
    }
        
    // veryify_commit - verifies that a given opening of a commitment and proof correspond to commit
    // \args:
    //      opening_nonce - corresponds to web3.utils.fromAscii(JSON.stringify(opening) + JSON.stringify(nonce)));
    //      proof - list of sha256 hashes that correspond to output from get_proof_for_board_guess()
    //      guess - [i, j] - guess that opening corresponds to
    //      commit - sha256 hash
    function veryify_commit(bool opening, uint32 nonce, bytes32[] memory proof, 
        bytes32 commit, uint8[2] memory guess) private pure returns (bool) {
        bytes32 curr_commit = keccak256(abi.encodePacked(opening, nonce));
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
                curr_commit = keccak256(abi.encodePacked(curr_commit, proof[curr_proof_index]));
                curr_proof_index++;
            } else {
                curr_commit = keccak256(abi.encodePacked(proof[curr_proof_index], curr_commit));
                curr_proof_index++;
            }
        }
        return (curr_commit == commit);
    }
    
    // Verifies the given msg_hash and signature were produced by the given address.
    function verify_sig(bytes32 msg_hash, bytes memory signature, address addr) private pure returns (bool) {
        // note that we need need to append a header to our hashed_guess because this is how web3 signs messages
        // the header consists of a string "\x19Ethereum Signed Message:" a new line and then the length of the message.
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, msg_hash));// split up the signature into components
        (uint8 v, bytes32 r, bytes32 s) = split_signature(signature);
        address signer_of_guess = ecrecover(prefixedHash, v, r, s);
        return (addr == signer_of_guess);
    }
    
    // split_signature
    // \args:
    //      signature - bytes - signature of any signed message
    // \returns:
    //      r - first 32 bytes, after the length prefix.
    //      s - second 32 bytes
    //      v final byte (first byte of the next 32 bytes).
    function split_signature(bytes memory sig) private pure returns (uint8 v, bytes32 r, bytes32 s) {
        require(sig.length == 65);
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        // this is strangeness to align with geth signatures //!!!!!!!!!!!!!
        v = (v == 0 || v == 1) ? v + 27 : v;
        // !!!!!! THIS is the line of interest
        return (v, r, s);
    }
}