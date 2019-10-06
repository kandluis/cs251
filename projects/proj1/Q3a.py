from sys import exit
from bitcoin.core.script import *
from bitcoin.wallet import CBitcoinSecret

from lib.utils import *
from lib.config import (my_private_key, my_public_key, my_address,
                    faucet_address, network_type)
from Q1 import send_from_P2PKH_transaction


cust1_private_key = CBitcoinSecret(
    'cTM9kukhsyMTYbdhU7MobnrW6ouCv7QoF5XzxhxpGD4csGsmBgbd')
cust1_public_key = cust1_private_key.pub
cust2_private_key = CBitcoinSecret(
    'cUEeYRskh4girsJA9HuuxEKu6g85J5YWHDHnqsvhFfiQWh7Et7vf')
cust2_public_key = cust2_private_key.pub
cust3_private_key = CBitcoinSecret(
    'cVeCjRVXUYni8Tk5Lo1iL63pvNAdF5VkduR55SofEmk4QnE9SZQg')
cust3_public_key = cust3_private_key.pub


######################################################################
# TODO: Complete the scriptPubKey implementation for Exercise 3

# You can assume the role of the bank for the purposes of this problem
# and use my_public_key and my_private_key in lieu of bank_public_key and
# bank_private_key.

Q3a_txout_scriptPubKey = [
    my_public_key,
    OP_CHECKSIGVERIFY,
    1,
    cust1_public_key,
    cust2_public_key,
    cust3_public_key,
    3,
    OP_CHECKMULTISIG
]
######################################################################

if __name__ == '__main__':
    ######################################################################
    # TODO: set these parameters correctly
    amount_to_send = 0.00263379 - 0.0005 # amount of BTC in the output you're splitting minus fee
    txid_to_spend = (
        'd55335bb08a67bf7eb456ffbed6d548efe109740e590613c34003636546b20ec')
    utxo_index = 9 # index of the output you are spending, indices start at 0
    ######################################################################

    response = send_from_P2PKH_transaction(amount_to_send, txid_to_spend, 
        utxo_index, Q3a_txout_scriptPubKey, my_private_key, network_type)
    print(response.status_code, response.reason)
    print(response.text)
