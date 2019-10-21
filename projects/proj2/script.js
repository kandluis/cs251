// =============================================================================
//                                  Config 
// =============================================================================

// sets up web3.js
if (typeof web3 !== 'undefined')  {
	web3 = new Web3(web3.currentProvider);
} else {
	web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
}

// Default account is the first one
web3.eth.defaultAccount = web3.eth.accounts[0];
// Constant we use later
var GENESIS = '0x0000000000000000000000000000000000000000000000000000000000000000';

// This is the ABI for your contract (get it from Remix, in the 'Compile' tab)
// ============================================================
var abi = [
	{
		"constant": true,
		"inputs": [
			{
				"internalType": "address",
				"name": "debtor",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "creditor",
				"type": "address"
			}
		],
		"name": "lookup",
		"outputs": [
			{
				"internalType": "uint32",
				"name": "ret",
				"type": "uint32"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "address",
				"name": "creditor",
				"type": "address"
			},
			{
				"internalType": "uint32",
				"name": "amount",
				"type": "uint32"
			},
			{
				"internalType": "address[]",
				"name": "path",
				"type": "address[]"
			},
			{
				"internalType": "uint32",
				"name": "min_on_cycle",
				"type": "uint32"
			}
		],
		"name": "add_IOU",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	}
];

// ============================================================
abiDecoder.addABI(abi);
// call abiDecoder.decodeMethod to use this - see 'getAllFunctionCalls' for more

// Reads in the ABI
var BlockchainSplitwiseContractSpec = web3.eth.contract(abi);

// This is the address of the contract you want to connect to; copy this from Remix
var contractAddress = '0x9ae5520705E21E1cAD42fcdCe42810a39F373DBE'

var BlockchainSplitwise = BlockchainSplitwiseContractSpec.at(contractAddress)


// =============================================================================
//                            Functions To Implement 
// =============================================================================

// TODO: Add any helper functions here!
// Retrieves information from all calls in the block chain using the provided
// extractor. Extractor takes a single call as input and transforms it into
// a multiple values (a list), all of which are collected and de-duped.
// early_stop_fn is simply forward to getAllFunctionCalls.
function getCallData(extractor_fn, early_stop_fn) {
	const results = new Set();
	const all_calls = getAllFunctionCalls(contractAddress, 'add_IOU', early_stop_fn);
	for (var i = 0; i < all_calls.length; i++) {
		const extracted_values = extractor_fn(all_calls[i]);
		for (var j = 0; j < extracted_values.length; j++) {
			results.add(extracted_values[j]);
		}
	}
	return Array.from(results);
}
// Returns all creditors.
function getCreditors() {
	return getCallData((call) => {
		// call.args[0] is the creditor.
		return [call.args[0]];
	}, /*early_stop_fn=*/null);
}
// Get neighbors. Returns all neighbors of the given user (eg, people this user)
// owes money to.
function getCreditorsForUser(user) {
	var creditors = []
	const all_creditors = getCreditors()
	for (var i = 0; i < all_creditors.length; i++) {
		const amountOwed = BlockchainSplitwise.lookup(user, all_creditors[i]).toNumber();
		if (amountOwed > 0) {
			creditors.push(all_creditors[i])
		}
	}
	return creditors;
}

// Returns the minimum amount owed along the given path.
function findMinOnPath(path) {
	var minOwed = null;
	for (var i = 1; i < path.length; i++) {
		const debtor = path[i-1]
		const creditor = path[i];
		const amountOwed = BlockchainSplitwise.lookup(debtor, creditor).toNumber();
		if (minOwed == null || minOwed > amountOwed) {
			minOwed = amountOwed;
		}
	}
	return minOwed;
}


// TODO: Return a list of all users (creditors or debtors) in the system
// You can return either:
//   - a list of everyone who has ever sent or received an IOU
// OR
//   - a list of everyone currently owing or being owed money
function getUsers() {
	return getCallData((call) => {
		// call.from is debtor and call.args[0] is creditor.
		return [call.from, call.args[0]]
	}, /*early_stop_fn=*/null);
}

// TODO: Get the total amount owed by the user specified by 'user'
function getTotalOwed(user) {
	// We assume lookup is up-to-date (all cycles removed).
	var totalOwed = 0;
	const all_creditors = getCreditors();
	for (var i = 0; i < all_creditors.length; i++) {
		totalOwed += BlockchainSplitwise.lookup(user, all_creditors[i]).toNumber();
	}
	return totalOwed;
}

// TODO: Get the last time this user has sent or received an IOU, in seconds since Jan. 1, 1970
// Return null if you can't find any activity for the user.
// HINT: Try looking at the way 'getAllFunctionCalls' is written. You can modify it if you'd like.
function getLastActive(user) {
	const all_timestamps = getCallData((call) => {
		if (call.from == user || call.args[0] == user) {
			return [call.timestamp];
		}
		return [];
	}, (call) => {
		// Return early as soon as you find this user.
		return call.from == user || call.args[0] == user;
	});
	return Math.max(all_timestamps);

}

// TODO: add an IOU ('I owe you') to the system
// The person you owe money is passed as 'creditor'
// The amount you owe them is passed as 'amount'
function add_IOU(creditor, amount) {
	// Assume debtor is the one issuing the transaction.
	const debtor = web3.eth.defaultAccount;
	// If there's an existing path from creditor -> debtor (eg, creditor owes debtor),
	// rather than add the IOU immediately, find the path and find the minimum
	// along the path.
	const path = doBFS(creditor, debtor, getCreditorsForUser);
	if (path != null) {
		const min_on_cycle = Math.min(findMinOnPath(path), amount);
		// Now add the IOU, letting the contract know about any possible cycles.
		return BlockchainSplitwise.add_IOU(creditor, amount, path, min_on_cycle);
	}
	// There is no cycle, just add the IOU.
	var x = BlockchainSplitwise.add_IOU(creditor, amount, [], /*min_on_cycle=*/0);
	return;
	
}

// =============================================================================
//                              Provided Functions 
// =============================================================================
// Reading and understanding these should help you implement the above

// This searches the block history for all calls to 'functionName' (string) on the 'addressOfContract' (string) contract
// It returns an array of objects, one for each call, containing the sender ('from'), arguments ('args')
// and timestamp (unix micros) of block collation ('timestamp').
// Stops retrieving function calls as soon as the earlyStopFn is found. earlyStop takes
// as input a candidate function call and must return a truth value.
// The chain is processed from head to genesis block.
function getAllFunctionCalls(addressOfContract, functionName, earlyStopFn) {
	var curBlock = web3.eth.blockNumber;
	var function_calls = [];
	while (curBlock !== GENESIS) {
	  var b = web3.eth.getBlock(curBlock, true);
	  var txns = b.transactions;
	  for (var j = 0; j < txns.length; j++) {
	  	var txn = txns[j];
	  	// check that destination of txn is our contract
	  	if (txn.to === addressOfContract.toLowerCase()) {
	  		var func_call = abiDecoder.decodeMethod(txn.input);
	  		// check that the function getting called in this txn is 'functionName'
	  		if (func_call && func_call.name === functionName) {
	  			var args = func_call.params.map(function (x) {return x.value});
	  			function_calls.push({
	  				from: txn.from,
	  				args: args,
	  				timestamp: b.timestamp,
	  			})
	  			if (earlyStopFn &&
	  					earlyStopFn(function_calls[function_calls.length-1])) {
	  				return function_calls;
	  			}
	  		}
	  	}
	  }
	  curBlock = b.parentHash;
	}
	return function_calls;
}

// We've provided a breadth-first search implementation for you, if that's useful
// It will find a path from start to end (or return null if none exists)
// You just need to pass in a function ('getNeighbors') that takes a node (string) and returns its neighbors (as an array)
function doBFS(start, end, getNeighbors) {
	var queue = [[start]];
	while (queue.length > 0) {
		var cur = queue.shift();
		var lastNode = cur[cur.length-1]
		if (lastNode === end) {
			return cur;
		} else {
			var neighbors = getNeighbors(lastNode);
			for (var i = 0; i < neighbors.length; i++) {
				queue.push(cur.concat([neighbors[i]]));
			}
		}
	}
	return null;
}
// =============================================================================
//                                      UI 
// =============================================================================

// This code updates the 'My Account' UI with the results of your functions
$("#total_owed").html("$"+getTotalOwed(web3.eth.defaultAccount));
$("#last_active").html(timeConverter(getLastActive(web3.eth.defaultAccount)));
$("#myaccount").change(function() {
	web3.eth.defaultAccount = $(this).val();
	$("#total_owed").html("$"+getTotalOwed(web3.eth.defaultAccount));
	$("#last_active").html(timeConverter(getLastActive(web3.eth.defaultAccount)))
});

// Allows switching between accounts in 'My Account' and the 'fast-copy' in 'Address of person you owe
var opts = web3.eth.accounts.map(function (a) { return '<option value="'+a+'">'+a+'</option>' })
$(".account").html(opts);
$(".wallet_addresses").html(web3.eth.accounts.map(function (a) { return '<li>'+a+'</li>' }))

// This code updates the 'Users' list in the UI with the results of your function
$("#all_users").html(getUsers().map(function (u,i) { return "<li>"+u+"</li>" }));

// This runs the 'add_IOU' function when you click the button
// It passes the values from the two inputs above
$("#addiou").click(function() {
  add_IOU($("#creditor").val(), $("#amount").val());
  window.location.reload(false); // refreshes the page after
});

// This is a log function, provided if you want to display things to the page instead of the JavaScript console
// Pass in a discription of what you're printing, and then the object to print
function log(description, obj) {
	$("#log").html($("#log").html() + description + ": " + JSON.stringify(obj, null, 2) + "\n\n");
}


