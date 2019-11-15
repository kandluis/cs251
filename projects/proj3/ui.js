// ui.js
//    Defines qjuery function that can be used to change the ui of the
//    battleship page as we enter different stages of gameplay
// =============================================================================
//                    YOU DO NOT NEED TO EDIT THIS FILE
// =============================================================================
//     written by: Sean Kazuyuki Decker
// #############################################################################

// convertion functions
const eth_converstion_rate = 171.45;
const wei_to_dollars = wei => wei_to_eth(wei) * eth_converstion_rate;
const wei_to_eth = wei => wei / Math.pow(10, 18);
let player1_address = null, player2_address = null;
// Default account is the first one
async function init_accounts() {
  let accounts = await web3.eth.getAccounts();
  player1_address = accounts[0];
  player2_address = accounts[0];
}
init_accounts().then(() => {
  // set player's account balances
  web3.eth.getBalance(player1_address).then((res) => {
      $('#player1-account-balance').html(wei_to_eth(parseFloat(res)) + ' eth');
  });
  web3.eth.getBalance(player2_address).then((res) => {
      $('#player2-account-balance').html(wei_to_eth(parseFloat(res)) + ' eth');
  });
});
// setup game-controler area, where the game is set up
(function setup_page() {
  $(document).ready(() => {
    // SETUP ACCOUNT CHOOSING
    web3.eth.getAccounts().then((accounts) => {
      $('.account').html(accounts.map((a) => '<option value='+ a +'>'+ a +'</option>'));
    });
    // setup player choosing
    $('#player1-account').change(function() {
      player1_address = $(this).val();
      web3.eth.getBalance(player1_address).then((res) => {
        $('#player1-account-balance').html(wei_to_eth(parseFloat(res)) + ' eth');
      });
    });
    $('#player2-account').change(function() {
      player2_address = $(this).val();
      web3.eth.getBalance(player2_address).then((res) => {
        $('#player2-account-balance').html(wei_to_eth(parseFloat(res)) + ' eth');
      });
    });
    // start the game on click
    $('#subtitle').html('Initializing a Game');
    $('#start-stop').click(() => { setup_games(player1_address, player2_address); });
  });
  // setup_games();
})();

// build and set player boards
function enter_battleship_placing_ui() {
  function build_battleship_table(user, type) {
    table = '';
    for (let i = 0; i < BOARD_LEN; i++) {
      table += '<tr>';
      for (let j = 0; j < BOARD_LEN; j++) {
        table += '<td ';
        table += 'id=' + i + '-' + j + ' ';
        table += 'class=battleship-board-square>';
        table += '</td>';
      }
      table += '</tr>';
    }
    return table;
  }
  // update 
  $('#player1 .address').html(player1_address);
  $('#player2 .address').html(player2_address);
  $('#player1 > .my-board').html(build_battleship_table('player1', 'my'));
  $('#player2 > .my-board').html(build_battleship_table('player2', 'my'));
  $('#player1 > .their-board').html(build_battleship_table('player1', 'their'));
  $('#player2 > .their-board').html(build_battleship_table('player2', 'their'));

  function addShip() {
    let imageUrl = './media/boat.png'
    $(this).css('background-image', 'url(' + imageUrl + ')');
    $(this).attr('name', 'boat');
    $(this).click(removeShip);
  }
  function removeShip() {
    $(this).css('background-image', 'none');
    $(this).attr('name', '');
    $(this).click(addShip);
  } 
  $('.my-board .battleship-board-square').click(addShip);
  $('.my-board .battleship-board-square').hover(
    function() { $(this).css('background-color', 'blue'); },
    function() { $(this).css('background-color', 'transparent'); }
    );
  $('#subtitle').html('Players are Placing Boats');
  // add buttons to user controler
  $('.controler').html(
    '<button id="next-step">Submit Battleships</button>\
     <button id="timeout">Accuse Opponent of Timeout</button>\
     <button id="resign">Resign</button>'
    );
  // setup board submission buttons
  // unbind first since buttong is bound to finish_game.
  $('#player1 > .controler > #next-step').unbind();
  $('#player1 > .controler > #next-step').click(() => { start_game('player1', 0); });
  $('#player2 > .controler > #next-step').unbind();
  $('#player2 > .controler > #next-step').click(() => { start_game('player2', 1); });
  // setup timeout accusation buttons
  $('#player1 > .controler > #timeout').click(() => { accuse_timeout('player1', 0); });
  $('#player2 > .controler > #timeout').click(() => { accuse_timeout('player2', 1); });
  // setup timeout accusation buttons
  $('#player1 > .controler > #resign').click(() => { resign('player1', 0); });
  $('#player2 > .controler > #resign').click(() => { resign('player2', 1); });
}

function leave_battleship_placing_ui(player_name, index) {
  // stop hover and click on my-board
  $('#' + player_name + ' .my-board .battleship-board-square').unbind();
  $('#' + player_name + ' .my-board .battleship-board-square').off('hover');
  // setup board submission buttons
  // Must unbind first since the button is also bound to start_game!
  $('#' + player_name + ' > .controler > #next-step').html('Finish Game');
  $('#' + player_name + ' > .controler > #next-step').unbind();
  $('#' + player_name + ' > .controler > #next-step').click(() => { finish_game(player_name, index); });
}

// setup game ui after initial boards have been set
async function enter_playing_game_ui(player_name, index, guess_square) {
  // change subtitle
  $('#subtitle').html("Player 1's turn");
  // start hover style on their-board
  $('#' + player_name + ' .their-board .battleship-board-square').hover(
    function() { $(this).css('background-color', 'red'); },
    function() { $(this).css('background-color', 'transparent'); }
    );
  // get this player and their opponent's objects
  let player = players[index], opponent = players[(index + 1) % 2];
  // build commitment to initial board
  let [commitment, signature] = player.initialize_board(parse_my_board(player_name));
  // send this commitment to the opponent
  signature.then((sig) => {
    opponent.recieve_initial_board_commit(commitment, sig);
  });
  // click on opponent board is understood as a guess
  $('#' + player_name + ' .their-board .battleship-board-square').click(function () {
    if (index !== turn) return; // only parse guess if it is the player's turn
    // get the i, j of the guess
    let [i, j] = $(this).attr('id').split('-');
    guess_square(parseInt(i), parseInt(j), player, opponent, (hit) => {
      // update global variables and ui
      turn = (turn + 1) % 2;
      // change subtitle
      $('#subtitle').html("Player " + (turn + 1) + "'s turn");
      // update squares with splash or explosion
      $(this).css('background-image', 'url(' + (hit? EXPLOSION_IMG: SPLASH_IMG) + ')');
      $('#' + player_name + ' .their-board .battleship-board-square');
      // remove on click function and hover for chosen square
      $(this).unbind();
      $(this).off('hover');
      $(this).css('background-color', 'transparent');
    });
  });
}

// update UI after player guesses square
function guess_square_ui_update(hit, player_name, that) {
  
}


// 
function end_game_ui(player_name, index) {
  // unbind click and hover on both player's boards
  $('.their-board .battleship-board-square').unbind();
  $('.their-board .battleship-board-square').off('hover');
  // make all boards transparent
  $('.battleship-board-square').css('opacity', '0.4');
  $('#subtitle').html("Player " + (index + 1) + " has ended the game");
}