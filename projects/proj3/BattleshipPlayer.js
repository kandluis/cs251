// BattleshipPlayer.js
//    Defines a Battleship player and the functions that the player calls to
//    interact with the solidity contract
// =============================================================================
//                                EDIT THIS FILE
// =============================================================================
//      written by: Luis Perez
// #############################################################################

// sets up web3.js
if (typeof web3 !== 'undefined')  { web3 = new Web3(web3.currentProvider); }
else { web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545')); }

// This is the ABI for your contract (get it from Remix, in the 'Compile' tab)
// ============================================================
var abi = [
  {
    "constant": false,
    "inputs": [
      {
        "internalType": "uint8[4]",
        "name": "guesses",
        "type": "uint8[4]"
      },
      {
        "internalType": "uint32",
        "name": "seqno",
        "type": "uint32"
      },
      {
        "internalType": "bytes",
        "name": "opponent_sig",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "sig",
        "type": "bytes"
      }
    ],
    "name": "claim_timeout",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "internalType": "uint8[4]",
        "name": "guesses",
        "type": "uint8[4]"
      },
      {
        "internalType": "uint32",
        "name": "seqno",
        "type": "uint32"
      },
      {
        "internalType": "bytes",
        "name": "opponent_sig",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "sig",
        "type": "bytes"
      },
      {
        "internalType": "bool",
        "name": "opening",
        "type": "bool"
      },
      {
        "internalType": "uint32",
        "name": "nonce",
        "type": "uint32"
      },
      {
        "internalType": "bytes32[]",
        "name": "proof",
        "type": "bytes32[]"
      },
      {
        "internalType": "bytes32",
        "name": "opponent_board_commit",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "opponent_board_commit_signature",
        "type": "bytes"
      }
    ],
    "name": "claim_timeout",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [],
    "name": "end_timeout",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "internalType": "bool[6][6]",
        "name": "opponent_board",
        "type": "bool[6][6]"
      },
      {
        "internalType": "uint32[6][6]",
        "name": "opponent_nonces",
        "type": "uint32[6][6]"
      },
      {
        "internalType": "bytes32",
        "name": "opponent_board_commit",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "opponent_board_commit_signature",
        "type": "bytes"
      }
    ],
    "name": "report_cheating",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "internalType": "bytes",
        "name": "resignation",
        "type": "bytes"
      }
    ],
    "name": "resign",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [],
    "name": "resign",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [],
    "name": "resign_uninitialized_game",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "internalType": "bool",
        "name": "opening",
        "type": "bool"
      },
      {
        "internalType": "uint32",
        "name": "nonce",
        "type": "uint32"
      },
      {
        "internalType": "bytes32[]",
        "name": "proof",
        "type": "bytes32[]"
      },
      {
        "internalType": "bytes32",
        "name": "opponent_board_commit",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "opponent_board_commit_signature",
        "type": "bytes"
      }
    ],
    "name": "resolve_timeout",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "internalType": "uint8[4]",
        "name": "guesses",
        "type": "uint8[4]"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "resolve_timeout",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "internalType": "address",
        "name": "opponent",
        "type": "address"
      }
    ],
    "name": "start_or_join_game",
    "outputs": [],
    "payable": true,
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "check_timeout",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "get_game_id",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "msg_hash",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      },
      {
        "internalType": "address",
        "name": "addr",
        "type": "address"
      }
    ],
    "name": "verify_sig",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "pure",
    "type": "function"
  }
];

// ============================================================
abiDecoder.addABI(abi);

// This is the address of the contract you want to connect to; copy this from Remix
// TODO: fill this in with your contract's address/hash
let contractAddress = "0xDEcF33967029aF1EeADDe8154f1C4BBBE616e893";

// Reads in the ABI
var StatechannelBattleship = new web3.eth.Contract(abi, contractAddress,
  {gasLimit: 500000});

class BattleshipPlayer {
  /* constructor
    \brief
      constructor for both battleship players is called after the "start game" button is pressed
      both players are initialized with the following paramets
    \params:
      name          - string - either 'player1' or 'player2', for jquery only for the most part
      my_addr       - string - this player's address in hex
      opponent_addr - string - this player's opponent's address in hex for this game of battleship
      ante          - int    - amount of ether being wagered
  */
  constructor(name, my_addr, opponent_addr, ante) {
    this.my_name = name;
    this.my_addr = my_addr;
    this.opp_addr = opponent_addr;
    this.guesses = Array(BOARD_LEN).fill(Array(BOARD_LEN).fill(false));
    this.my_board = null;
    this.game_id = null;
    // Tracks whether this player is first mover. This prevents attacks
    // where the opponent tries to constantly guess scares out of turn.
    this.first_move = (name == 'player1')

    // Updated to my last issued guess.
    this.my_last_guess = null;
    // Updated to the last seen valid opponent guess.
    this.opponent_last_guess = null;
    // Updated to my last issued response.
    this.my_last_response = null;
    // Sequence number of moves. Increases by one each time a player makes
    // a move.
    this.seqno = 0;
    // Tracks if we've sent a guess but have not received response yet.
    this.waiting_for_response = false;

    this.opponent_commit = null;
    this.opponent_commit_sig = null;

    // Tracks the number of ships we've sunk on our opponent's board.
    this.hits_on_opponent = 0;
    // Tracks the number of fhips our opponent has sunk on our board.
    this.sunk_ships = 0;
    // Tracks how many guesses I've received a response to.
    this.responded_guesses = 0;

    // ##############################################################################
    //    TODO initialize a battleship game on your solidity contract
    // ##############################################################################
    const wei = web3.utils.toWei(ante, 'ether');
    // StatechannelBattleship.events.NewGame({}, (event) => {
    //  console.log(event);
    // });
    StatechannelBattleship.methods.start_or_join_game(this.opp_addr).send({
      from: this.my_addr, value: wei })
      .then((ignored) => {
        StatechannelBattleship.methods.get_game_id().call({from: this.my_addr})
          .then((result) => {
            this.game_id = parseInt(result);
          });
      });
  }

  /* initialize_board
    \brief
      sets class varible my_board and creates a commitment to the board, which is returned
      and sent to the opponent
    \params:
      initialize_board - [[bool]] - array of arrays where true represents a ship's presense
      callback - callback to call with commitment as argument
  */
  initialize_board(initial_board) {
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    //    DONE this function has been completed for you.
    //         But feel free to change or change anything
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // set my board
    this.my_board = initial_board;
    // set nonces to build our commitment with
    this.nonces = get_nonces(); // get_nonces defined in util.js
    // build commitment to our board
    const commit = build_board_commitment(this.my_board, this.nonces); // build_board_commitment defined in util.js
    // sign this commitment
    const sig = sign_msg(commit, this.my_addr);
    return [commit, sig];
  }

  /* recieve_initial_board_commit
    \brief
      called with the returned commitment from initialize_board() as argument
    \params:
      commitment - a commitment to an initial board state recieved from opponent
      signature - opponeng signature on commitment
  */
  recieve_initial_board_commit(commitment, signature) {
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    //    DONE this function has been completed for you.
    //         But feel free to change or change anything
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    if (!check_signature(commitment, signature, this.opp_addr)) {
      throw "recieved an invalid signature from opponent as initial board commit";
    }
    this.opponent_commit = commitment;
    this.opponent_commit_sig = signature;
  }

  /* build_guess
    \brief:
      build a guess to be sent to the opponent
    \params
      i - int - the row of the guessed board square
      j - int - the column of the guessed board square
    \return:
      signature - Promise - a signature on [i, j]
  */
  build_guess(i, j) {
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    //    DONE this function has been completed for you.
    //         But feel free to change or change anything
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // send signed guess to opponent
    const guess = {
      'i': i,
      'j': j,
      'seqno': this.seqno,
      'game_id': this.game_id
    };
    const guess_hashed = web3.utils.soliditySha3(
      {type: "uint8", value: guess.i },
      {type: "uint8", value: guess.j },
      {type: "uint32", value: guess.seqno},
      {type: "uint32", value: guess.game_id }
    );
    const signature = sign_msg(guess_hashed, this.my_addr);
    this.my_last_guess = [guess, signature];
    this.waiting_for_response = true;
    return signature;
  }


  /* respond_to_guess
    \brief:
      called when the opponent guesses a board squaure (i, j)
    \params:
      i - int - the row of the guessed board square
      j - int - the column of the guessed board square
      signature - signature that proves the opponent is guessing (i, j)
    \return:
      hit   - bool   - did the guess hit one of your ships?
      nonce - bytes32 - nonce for square [i, j]
      proof - object - proof that the guess hit or missed a ship
  */
  respond_to_guess(i, j, signature) {
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    //    DONE this function has been completed for you.
    //         But feel free to change or change anything
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // Check that we've started the game. If not, don't respond.
    if (this.opponent_commit == null || this.opponent_commit_sig == null) {
      throw "received guess before opponent provided commitment! will not respond."
    }
    // Only respond if it's your turn. Use local seqno to determine this.
    if ((this.first_move && this.seqno % 2 == 0) ||
        (!this.first_move && this.seqno % 2 == 1)) {
      throw "will not respond to guess until it is opponents turn";
    }
    if (i < 0 || j < 0 || i >= BOARD_LEN  || j >= BOARD_LEN ) {
      throw "invalid move out of bounds. will not respond."
    }
    // check first that the guess is signed, if not, we don't respond
    const guess_hashed = web3.utils.soliditySha3(
      {type: 'uint8', value: i },
      {type: 'uint8', value: j },
      {type: 'uint32', value: this.seqno }, 
      {type: 'uint32', value: this.game_id });
    if (!check_signature(guess_hashed, signature, this.opp_addr)) { //check_signature defined in util.js
      throw "recieved an invalid signature from opponent as initial board commit";
    }
    this.opponent_last_guess = [{
      'i': i,
      'j': j,
      'seqno': this.seqno,
      'game_id': this.game_id
    }, signature];
    // We've responded, so this move is over.
    this.seqno++;
    // get truth value for this cell along with the assocaited nonce
    const opening = this.my_board[i][j], nonce = this.nonces[i][j];
    // Opponent sunk our ship.
    if (opening) {
      this.sunk_ships++;
    }
    // write proof for this opening
    const proof = get_proof_for_board_guess(this.my_board, this.nonces, [i, j]);
    // return to opponent
    this.my_last_response = [opening, nonce, proof];
    return [opening, nonce, proof];
  }

  /* recieve_response_to_guess
    \brief:
      called with the response from respond_to_guess()
    \params:
      response - [hit, proof] - the object returned from respond_to_guess()
  */
  recieve_response_to_guess(i, j, response) {
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    //    DONE this function has been completed for you.
    //         But feel free to change or change anything
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // unpack response
    // Only accept a response if we're expecting one.
    if ((this.first_move && this.seqno % 2 == 1) ||
        (!this.first_move && this.seqno % 2 == 0)) {
      throw "did not expect response. will not increase seqno.";
    }

    if (i < 0 || j < 0 || i >= BOARD_LEN  || j >= BOARD_LEN ) {
      throw "invalid move out of bounds. will not respond."
    }
    let [opening, nonce, proof] = response;
    // verify that opponent responded to the query
    if (!verify_opening(opening, nonce, proof, this.opponent_commit, [i, j])) {
      throw "opponent's response is not an opening of the square I asked for";
    }
    if (opening) {
      // We sunk their ship.
      this.hits_on_opponent++;
    }
    this.responded_guess++;
    this.waiting_for_response = false;
    // We've received response from opponent and verified it. Next move.
    this.seqno++;
  }

  /* claim_timeout
    \brief:
      called when BattleshipPlayer believes the opponent has timed-out
      BattleshipPlayer should touch the solidity contract to enforce a
      timelimit for the move
  */
  claim_timeout() {
    // ##############################################################################
    //    TODO implement claim of a timeout
    // ##############################################################################
    console.log('they cheated!');
    if (this.my_last_guess == null || this.opponent_last_guess == null) {
      throw "claiming timeout within the first two moves of the game is not supported";
    }
    const [opp_guess, opp_sig] = this.opponent_last_guess;
    const [guess, sig_promise] = this.my_last_guess;
    const guesses = [opp_guess.i, opp_guess.j, guess.i, guess.j];
    sig_promise.then((sig) => {
      if (this.waiting_for_response) {
        const [opening, nonce, proof] = this.my_last_response; 
        StatechannelBattleship.methods.claim_timeout(
        guesses, opp_guess.seqno, opp_sig, sig, opening, nonce, proof,
        this.opponent_commit, this.opponent_commit_sig).send({from: this.my_addr});
      } else {
        StatechannelBattleship.methods.claim_timeout(
          guesses, opp_guess.seqno, opp_sig, sig).send({from: this.my_addr});
      }
    });
  }

  /* finish_game
    \brief:
      begin protocol to end current game.
      There are 3 possibilities for finish game:
        1 - The game is over, either player 1 or player 2's ships have all been sunk.
            In this case, then we reveal the our initial board state.
        2 - The game is not over, in which case, calling this function is equivalent to 
            a resignation by whoever called it.
        3 - You have decided the the other player is cheating (you have guessed enough
            squares to realize that the opponent didn't place enough boats). Tell the
            contract.
    \params:
      player_name - string - name of player who called finish game
    \reuturn:
      board_opening - opening of initial board state
      board_nonces  - nonces
  */
  finish_game(player_name) {
    // ##############################################################################
    //    TODO implement finish game
    // ##############################################################################
    if (this.sunk_ships > 10 || this.hits_on_opponent > 10) {
      throw "Should never have had more ships sunk than max.";
    }
    // Possibility 1.
    if (this.sunk_ships == 10 || this.hits_on_opponent == 10) {
      return [this.my_board, this.nonces];
    }
    // Possibility 2.
    if (this.sunk_ships < 10 && this.hits_on_opponent < 10) {
      resign();
      throw "resigning game.";
    }
    // Posibility 3 is handled in verify_finish once the opponent has provided
    // us with their board opening.
  }

  /* verify_finish
    \brief:
      Verify that the opponent set up their initial board legally. If the opponent didn't
      set up a legal board, report their cheating to the contract.
      Else if you lost, send the signed result to the solidity contract to finish the game.
    \params:
      board_opening - opening of initial board state of opponent
      board_nonces  - nonces
  */
  verify_finish(board_opening, board_nonces) {
    // ##############################################################################
    //    TODO touch your solidity contract if you won to claim prize
    //         or if you found that the opponent set up with an illegal
    //         board state, report this to the contract.
    // ##############################################################################
    // verify board_opening
    // Check that the board + nonces match our commit.
    if (build_board_commitment(board_opening, board_nonces) != this.opponent_commit) {
      throw "Attempting to finish with changed board from initial commit!";
    }
    const ships_on_opponent_board = board_opening.flat().reduce(
      (total, is_ship) => {
        if (is_ship) return total + 1;
        return total;
      }, 0);
    if (ships_on_opponent_board != 10) {
      StatechannelBattleship.methods.report_cheating(
        board_opening, board_nonces, this.opponent_commit,
        this.opponent_commit_sig).send({from: this.my_addr});
      throw "Opponent cheated!";
    }
    if (this.sunk_ships > 10 || this.hits_on_opponent > 10) {
      throw "Should never have had more ships sunk than max.";
    }
    if (this.sunk_ships < 10 || this.hits_on_opponent < 10) {
      throw "Cannot verify finish when game is not done. No one has won.";
    }
    if (this.sunk_ships == 10) {
      // I lost. Just resign to get a bit of money back.
      StatechannelBattleship.methods.resign().send({from: this.my_addr});
    }
    // Otherwise, I won. We will wait for the opponent to resign in this
    // case. Otherwise, we can claim_timeout on their unresigned.
  }

  /* resign
    \brief:
      resign the battleship game - send the opponent a signed resignation
  */
  resign() {
    // ##############################################################################
    //    TODO resign the battleship game
    // ##############################################################################
    StatechannelBattleship.methods.resign().send({from: this.my_addr});
    const hash = web3.utils.soliditySha3({type: 'bytes', value: 'I lost' });
    return sign_msg(hash, this.my_addr);
  }

  /* accept_resignation
    \brief:
      called when player recieves a resignation from the opponent. Send the resignation
      to the contract.
  */
  accept_resignation(resignation) {
    // ##############################################################################
    //    TODO complete the battleship game on the solidity contract
    // ##############################################################################
    const hash = web3.utils.soliditySha3({type: 'bytes', value: 'I lost'});
    resignation.then((signature) => {
      if (!check_signature(hash, signature, this.opp_addr)) {
        throw "resignation is not valid!";
      }
      StatechannelBattleship.methods.resign(signature).send({from: this.my_addr});
    });
  }
}

