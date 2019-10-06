from sys import exit
from bitcoin.core.script import *

from lib.utils import *
from lib.config import (my_private_key, my_public_key, my_address,
                    faucet_address, network_type)
from Q1 import send_from_P2PKH_transaction


######################################################################
# TODO: Complete the scriptPubKey implementation for Exercise 2
Q2a_txout_scriptPubKey = [
        OP_2DUP,
        OP_ADD,
        579,
        OP_EQUALVERIFY,
        OP_SUB,
        4739,
        OP_EQUAL
    ]
######################################################################

if __name__ == '__main__':
    ######################################################################
    # TODO: set these parameters correctly
    amount_to_send = 0.00263379 - 0.0001 # amount of BTC in the output you're splitting minus fee
    txid_to_spend = (
        'd55335bb08a67bf7eb456ffbed6d548efe109740e590613c34003636546b20ec')
    utxo_index = 6 # index of the output you are spending, indices start at 0
    ######################################################################

    response = send_from_P2PKH_transaction(
        amount_to_send, txid_to_spend, utxo_index,
        Q2a_txout_scriptPubKey, my_private_key, network_type)
    print(response.status_code, response.reason)
    print(response.text)
