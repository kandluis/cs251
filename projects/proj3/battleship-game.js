// battleship-game.js
//    Defines the gameplay cycle for a game of battleship
// =============================================================================
//                    YOU DO NOT NEED TO EDIT THIS FILE
// =============================================================================
//     written by: Sean Kazuyuki Decker
// #############################################################################

// let game = null;
let players = [null, null];
let players_ready = [false, false];
let turn = -1;

// ===============================================================
//                          SETUP GAME
// ===============================================================
// initialize player1 and player2 variables and set up boards
function setup_games(player1_address, player2_address) {
  if (player1_address == player2_address)
    $('#game-controler #message').html('Player 1 and 2 cannot have the same address');
  else if (isNaN(parseInt($("#bet").val())) || parseInt($("#bet").val()) <= 0) 
    $('#game-controler #message').html('Bet must be some positive integer');
  else {
    enter_battleship_placing_ui();
    players[0] = new BattleshipPlayer('player1', player1_address, player2_address, $("#bet").val());
    players[1] = new BattleshipPlayer('player2', player2_address, player1_address, $("#bet").val());
  }
}

// ===============================================================
//                          PLAY GAME
// ===============================================================
// defines the inputs and outputs for an individual player's game board

function accuse_timeout(player_name, index) {
  players[index].claim_timeout();
}

// function called when a user guesses a square
async function guess_square(i, j, player, opponent, callback) {
  // build singature on the guess
  let signed_guess = await player.build_guess(i, j);
  // send guess and signature to opponent and recieve response
  let [opening, nonce, proof] = await opponent.respond_to_guess(i, j, signed_guess);
  // update my-board with the outcome of the guess (the update relies on the value of response)
    $('#' + opponent.my_name + ' > .my-board #' + i + '-' + j)
      .css('background-image', 'url(' + (opening? EXPLOSION_IMG: SPLASH_IMG) + ')');
  // interpret response
  await player.recieve_response_to_guess(i, j, [opening, nonce, proof]);
  // return if the guess hit a ship
  callback(opening);
}

function start_game(player_name, index) {
  leave_battleship_placing_ui(player_name, index);
  players_ready[index] = true;
  if (players_ready[index] && players_ready[(index + 1) % 2]) {
    turn = 0;
    enter_playing_game_ui('player1', 0, guess_square);
    enter_playing_game_ui('player2', 1, guess_square);
  }
}

// ===============================================================
//                          END GAME
// ===============================================================
// player: player ends their game
function finish_game(player_name, index) {
  end_game_ui(player_name, index);
  let [board_proof, result] = players[index].finish_game(player_name);
  players[(index + 1) % 2].verify_finish(board_proof, result);
  [board_proof, result] = players[(index + 1) % 2].finish_game(player_name);
  players[index].verify_finish(board_proof, result);
}

function resign(player_name, index) {
  end_game_ui(player_name, index);
  let resignation = players[index].resign();
  players[(index + 1) % 2].accept_resignation(resignation);
}


// Also, just to save me from a bit of embarrassment, I am a better webdev than this
// all the global variables and the use of jquery is for readability and simplicity