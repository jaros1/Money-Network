# MoneyNetwork
Demo with complementary and alternative money. Implemented in ZeroFrame and AngularJS. Focus on privacy, encryption, max data on client and min data on server. 

Money is everything. MoneyNetwork is a demo about money. With inspiration from Charles Eisenstein, Bernard Lietaer and others.

Our world has one serious error. Our current monetary system. Almost all problems on our planet is caused by this error.
This is an attempt to make money free. To build a bridge between our present traditional monetary system and an ecosystem of complementare and alternative money systems. A monetary ecosystem will solve many of the problems the world are facing today.

The vision here is one wallet with easy access to any kind of money.
Use the money systems you like and not only our outdated money system.
Choose your money in the same way you choose clothes, food, housing, work, boyfriend, etc.
We are only free if our money systems are also free.
No more time for bullshit. Be free.

Here is the demo. Someone more skilled than I may bring the vision into real existence.

## Project status
Spare time project, work in progress, no money in here yet. For now just a chat app on a very promising platform (ZeroNet). 

Implemented:
- End-2-end encryption. Data in localStorage and on ZeroNet is encrypted. Only search tags and public chat are stored in clear on ZeroNet. 
- Contact list: Categories: new, guest, unverified, verified and ignored.
- Chat: One and two panel chat, encrypted personal and group chat & unencrypted public chat, markdown, emojis, reactions and comments

Todo:
- API for ZeroNet communication between MoneyNetwork and wallet sites using ZeroNet merger site plugin. One ZeroNet merger site for each external money system. Starting with a test BitCoins wallet (blocktrail.com).
- Wallet page: Test, add, use, rate and remove wallet sites.
- Chat page: Add money transactions to chat ($). Send money, receive money, pay, receive payment etc.

## MoneyNetwork Demo
- http://127.0.0.1:43110/moneynetwork.bit/ ([ZeroNet](https://zeronet.readthedocs.io/en/latest/using_zeronet/installing/) required)
- https://www.zerogate.tk/moneynetwork.bit/
- https://fuckcf.cf/moneynetwork.bit/
- https://zeronet.maxweiss.io/moneynetwork.bit/
- https://proxy.th3nd.com/moneynetwork.bit/

This demo should be safe to check out on a ZeroNet proxy server. 
You can see all ZeroNet sites on proxy servers but do not use your normal ZeroNet cert on a ZeroNet proxy server. An Anonymous moneynetwork.bit certificate can be used instead. And do not use real money on a proxy server.

## Wallets
- https://github.com/jaros1/Money-Network-W2 (test Bitcoins/Blocktrail API)

## API

Two layers API between MoneyNetwork and external moneysystems. MoneyNetwork <=> API1 <=> MoneyNetwork wallet <=> API2 <=> external money system.

API1: Used inside ZeroNet only. See below.

API2: Used between Money Network wallet sites and external money systems.
Specific for each external API. For example https://www.blocktrail.com/api/docs that is a BitCoin API. See https://github.com/jaros1/Money-Network-W2/


API1 is at present time very unstable. Json validation for in- and outgoing messages:

json_schemas = {

    "pubkeys": {
        "type": 'object',
        "title": 'Send pubkeys (JSEncrypt and cryptMessage) to other session',
        "description": 'MoneyNetwork: sends unencrypted pubkeys message to Wallet without a session password. Wallet: returns an encrypted pubkeys message to MoneyNetwork including a session password. pubkey is public key from JSEncrypt. pubkey2 is public key from cryptMessage. Password used for session restore. See get_password and password messages',
        "properties": {
            "msgtype": {"type": 'string', "pattern": '^pubkeys$'},
            "pubkey": {"type": 'string'},
            "pubkey2": {"type": 'string'},
            "password": {"type": 'string'}
        },
        "required": ['msgtype', 'pubkey', 'pubkey2'],
        "additionalProperties": false
    }, // pubkeys

    "save_data": {
        "type": 'object',
        "title": 'Wallet: Save encrypted wallet data in MoneyNetwork',
        "description": "Optional message. Can be used to save encrypted data in an {key:value} object in MoneyNetwork localStorage.",
        "properties": {
            "msgtype": {"type": 'string', "pattern": '^save_data$'},
            "data": {
                "type": 'array',
                "items": {
                    "type": 'object',
                    "properties": {
                        "key": {"type": 'string'},
                        "value": {"type": 'string'}
                    },
                    "required": ['key'],
                    "additionalProperties": false
                },
                "minItems": 1
            }
        },
        "required": ['msgtype', 'data'],
        "additionalProperties": false
    }, // save_data

    "get_data": {
        "type": 'object',
        "title": 'Wallet: Get encrypted data from MoneyNetwork',
        "description": "Optional message. Can be used to request encrypted wallet data from MoneyNetwork localStorage",
        "properties": {
            "msgtype": {"type": 'string', "pattern": '^get_data$'},
            "keys": {
                "type": 'array',
                "items": {"type": 'string'},
                "minItems": 1
            }
        },
        "required": ['msgtype', 'keys'],
        "additionalProperties": false
    }, // get_data

    "data": {
        "type": 'object',
        "title": 'MoneyNetwork: get_data response to with requested encrypted wallet data',
        "description": "Optional message. Return requested encrypted data to wallet",
        "properties": {
            "msgtype": {"type": 'string', "pattern": '^data$'},
            "data": {
                "type": 'array',
                "items": {
                    "type": 'object',
                    "properties": {
                        "key": {"type": 'string'},
                        "value": {"type": 'string'}
                    },
                    "required": ['key'],
                    "additionalProperties": false
                }
            }
        }
    }, // data

    "delete_data": {
        "type": 'object',
        "title": 'Wallet: Delete encrypted data saved in MoneyNetwork',
        "description": "Optional message. Delete encrypted wallet data from MoneyNetwork localStorage. No keys property = delete all data",
        "properties": {
            "msgtype": {"type": 'string', "pattern": '^delete_data$'},
            "keys": {
                "type": 'array',
                "items": {"type": 'string'},
                "minItems": 1
            }
        },
        "required": ['msgtype'],
        "additionalProperties": false
    }, // delete_data

    "get_password": {
        "type": 'object',
        "title": 'Wallet: Restore old session. Request pwd2 from MN',
        "description": 'Pwd2 was sent to MN in first pubkeys message. Session restore. Unlock and return pwd2 to wallet session',
        "properties": {
            "msgtype": {"type": 'string', "pattern": '^get_password$'},
            "pubkey": {"type": 'string'},
            "pubkey2": {"type": 'string'},
            "unlock_pwd2": {"type": 'string'}
        },
        "required": ["msgtype", "pubkey", "pubkey2", "unlock_pwd2"],
        "additionalProperties": false
    }, // get_password

    "password": {
        "type": 'object',
        "title": 'MN: Restore old session. Return unlocked password pwd2 to wallet session',
        "properties": {
            "msgtype": {"type": 'string', "pattern": '^password$'},
            "password": {"type": 'string'}
        },
        "required": ["msgtype", "password"],
        "additionalProperties": false
    }, // password

    "response": {
        "type": 'object',
        "title": 'Generic response with an optional error message/code',
        "properties": {
            "msgtype": {"type": 'string', "pattern": '^response$'},
            "error": {"type": 'string'}
        },
        "required": ['msgtype'],
        "additionalProperties": false
    }, // response

    "ping": {
        "type": 'object',
        "title": 'Simple session ping. Expects Timeout or OK response',
        "properties": {
            "msgtype": {"type": 'string', "pattern": '^ping$'},
        },
        "required": ['msgtype'],
        "additionalProperties": false
    }, // ping

    "get_balance": {
        "type": 'object',
        "title": 'MN: send get_balance request to wallet session',
        "description": 'Wallet session must return a balance (OK) or response (error) message. Boolean flags: Open and/or close wallet before/after get_balance request',
        "properties": {
            "msgtype": {"type": 'string', "pattern": '^get_balance$'},
            "open_wallet": {"type": 'boolean'},
            "close_wallet": {"type": 'boolean'}
        },
        "required": ['msgtype'],
        "additionalProperties": false
    }, // get_balance

    "balance": {
        "type": 'object',
        "title": 'Wallet: response. return balance info to MN',
        "properties": {
            "msgtype": {"type": 'string', "pattern": '^balance$'},
            "balance": {
                "type": 'array',
                "items": {
                    "type": 'object',
                    "properties": {
                        "code": {"type": 'string', "minLength": 2, "maxLength": 5},
                        "amount": {"type": 'number'}
                    },
                    "required": ['code', 'amount'],
                    "additionalProperties": false
                }
            }
        },
        "required": ['msgtype'],
        "additionalProperties": false
    }, // balance

    "wallet": {
        "type": 'object',
        "title": 'Public wallet information in wallet.json files',
        "description": 'wallet_* fields from site_info. currencies is a list of supported currencies and hub is a random wallet data hub address. wallet_sha256 is sha256 signature for {wallet_address, wallet_domain, wallet_title, wallet_description, currencies} hash',
        "properties": {
            "msgtype": {"type": 'string', "pattern": '^wallet$'},
            "wallet_address": { "type": 'string'},
            "wallet_domain": { "type": 'string'},
            "wallet_title": { "type": 'string'},
            "wallet_description": { "type": 'string'},
            "currencies": {
                "type": 'array',
                "description": 'List if supported currencies. code is a (pseudo) currency iso code. Optional URL to currency information on the www',
                "items": {
                    "type": 'object',
                    "properties": {
                        "code": {"type": 'string', "minLength": 2, "maxLength": 5},
                        "name": {"type": 'string'},
                        "url": {"type": 'string'}
                    },
                    "required": ['code', 'name'],
                    "additionalProperties": false
                }
            },
            "wallet_sha256": { "type": 'string', "pattern": '^[0-9a-f]{64}$' },
            "hub": { "type": 'string'}

        },
        "required": ['msgtype', 'wallet_sha256'],
        "additionalProperties": false
    } // wallet
}


## Software 
- html5, ccs3, javascript and some sql. Simple code, lots of comments and code should be "easy"" to follow. 
- [AngularJS v1.5.8](https://angularjs.org/) (very well documented).
- [ZeroNet 5.0](https://zeronet.readthedocs.io/en/latest/site_development/zeroframe_api_reference/) (documentation could be better).
- Test: for now no testing framework. Just testing manually.

## Help
Test help would by nice. Create an issue if you find something that should be fixed.

Ideas and inspiration are welcome. Specially on wallet and money API parts that have not yet been started. Fell free to create an issue with your inputs,

