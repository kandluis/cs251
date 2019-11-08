// BattleshipPlayer.js
//    Defines a Battleship player and the functions that the player calls to
//    interact with the solidity contract
// =============================================================================
//                                EDIT THIS FILE
// =============================================================================
//      written by: [your name]
// #############################################################################

// sets up web3.js
if (typeof web3 !== 'undefined')  { web3 = new Web3(web3.currentProvider); }
else { web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545')); }

// This is the ABI for your contract (get it from Remix, in the 'Compile' tab)
// ============================================================
var abi = [
  {
    "constant": true,
    "inputs": [
      {
        "name": "input",
        "type": "bytes"
      }
    ],
    "name": "get_hash_keccak",
    "outputs": [
      {
        "name": "",
        "type": "bytes32"
      }
    ],
    "payable": false,
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "",
        "type": "address"
      },
      {
        "name": "",
        "type": "address"
      }
    ],
    "name": "ious",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
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
        "name": "opening_nonce",
        "type": "bytes"
      },
      {
        "name": "proof",
        "type": "bytes32[]"
      },
      {
        "name": "guess",
        "type": "uint256[]"
      },
      {
        "name": "commit",
        "type": "bytes32"
      }
    ],
    "name": "veryify_commit",
    "outputs": [
      {
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
    "inputs": [
      {
        "name": "a",
        "type": "bytes32"
      },
      {
        "name": "b",
        "type": "bytes32"
      }
    ],
    "name": "MergeBytes",
    "outputs": [
      {
        "name": "",
        "type": "bytes"
      }
    ],
    "payable": false,
    "stateMutability": "pure",
    "type": "function"
  }
]; // TODO: replace this with your contract's ABI
// ============================================================
abiDecoder.addABI(abi);

// This is the address of the contract you want to connect to; copy this from Remix
// TODO: fill this in with your contract's address/hash
let contractAddress = "0x63c030E1881eA3306DD57928D51DfFD2cA9e0cef";

// Reads in the ABI
var StatechannelBattleship = new web3.eth.Contract(abi, contractAddress);

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
    // ##############################################################################
    //    TODO initialize a battleship game on your solidity contract
    // ##############################################################################
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
    return sign_msg(JSON.stringify([i, j]), this.my_addr); // sign_msg defined in util.js
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
    // check first that the guess is signed, if not, we don't respond
    if (!check_signature(JSON.stringify([i, j]), signature, this.opp_addr)) { //check_signature defined in util.js
      throw "recieved an invalid signature from opponent as initial board commit";
    }
    // get truth value for this cell along with the assocaited nonce
    const opening = this.my_board[i][j], nonce = this.nonces[i][j];
    // write proof for this opening
    const proof = get_proof_for_board_guess(this.my_board, this.nonces, [i, j]);
    // return to opponent
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
    let [opening, nonce, proof] = response;
    // verify that opponent responded to the query
    if (!verify_opening(opening, nonce, proof, this.opponent_commit, [i, j])) {
      throw "opponent's response is not an opening of the square I asked for";
    }
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
      board_proof - opening of initial board state
      result      - what is the result of the game
  */
  finish_game(player_name) {
    let board_proof = this.my_board;
    // ##############################################################################
    //    TODO implement finish game
    // ##############################################################################
    return [board_proof, result]
  }

  /* verify_finish
    \brief:
      Verify that the opponent set up their initial board legally. If the opponent didn't
      set up a legal board, report their cheating to the contract.
      Else if you lost, send the signed result to the solidity contract to finish the game.
    \params:
      board_proof - opening of initial board state of opponent
      result      - what is the result of the game
      signature   - signature by opponent on result
  */
  verify_finish(board_proof, result) {
    // ##############################################################################
    //    TODO touch your solidity contract if you won to claim prize
    //         or if you found that the opponent set up with an illegal
    //         board state, report this to the contract.
    // ##############################################################################
    // verify board_proof

    // the below code signs the message 'I lost'
    // the .then() is required because signatures from web3 are Promises.
    // If you'd like to learn more about Promises, come to office hours!
    sign_msg('I lost', this.my_addr).then((signature) => {
      // send signed loss - signature - to the contract
    });
  }

  /* resign
    \brief:
      resign the battleship game - send the opponent a signed resignation
  */
  resign() {
    // ##############################################################################
    //    TODO resign the battleship game
    // ##############################################################################
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
  }
}

