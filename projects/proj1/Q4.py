from bitcoin.core.script import *

######################################################################
# These functions will be used by Alice and Bob to send their respective
# coins to a utxo that is redeemable either of two cases:
# 1) Recipient provides x such that hash(x) = hash of secret
#    and recipient signs the transaction.
# 2) Sender and recipient both sign transaction
#
# TODO: Fill these in to create scripts that are redeemable by both
#       of the above conditions.
# See this page for opcode documentation: https://en.bitcoin.it/wiki/Script

# This is the ScriptPubKey for the swap transaction
def coinExchangeScript(public_key_sender, public_key_recipient, hash_of_secret):
    return [
      OP_IF,
        OP_HASH160,
        hash_of_secret,
        OP_EQUALVERIFY,
      OP_ELSE,
        public_key_sender,
        OP_CHECKSIGVERIFY,
      OP_ENDIF,
      public_key_recipient,
      OP_CHECKSIG
    ]

# This is the ScriptSig that the receiver will use to redeem coins
def coinExchangeScriptSig1(sig_recipient, secret):
    return [
        sig_recipient, secret, OP_TRUE
    ]

# This is the ScriptSig for sending coins back to the sender if unredeemed
def coinExchangeScriptSig2(sig_sender, sig_recipient):
    return [
        sig_recipient, sig_sender, OP_FALSE
    ]
######################################################################

######################################################################
#
# Configured for your addresses
#
# TODO: Fill in all of these fields
#

alice_txid_to_spend     = "abda277a844c5fdf5b15c1395e9cb7360161f3bcff4ab14e9f485722b6ed2e0c"
alice_utxo_index        = 0
alice_amount_to_send    = 0.0028645

bob_txid_to_spend       = "1fbdf01a54807b464d237cdce9abde7c9d8401d24460b6da87772457f2d99881"
bob_utxo_index          = 0
bob_amount_to_send      = 0.0009

# Get current block height (for locktime) in 'height' parameter for each blockchain (and put it into swap.py):
#  curl https://api.blockcypher.com/v1/btc/test3
btc_test3_chain_height  = 1580543

#  curl https://api.blockcypher.com/v1/bcy/test
bcy_test_chain_height   = 2559229

# Parameter for how long Alice/Bob should have to wait before they can take back their coins
## alice_locktime MUST be > bob_locktime
alice_locktime = 5
bob_locktime = 3

tx_fee = 0.0001

# While testing your code, you can edit these variables to see if your
# transaction can be broadcasted succesfully.
broadcast_transactions = True
alice_redeems = True

######################################################################
