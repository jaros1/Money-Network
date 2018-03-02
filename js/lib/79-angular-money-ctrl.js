angular.module('MoneyNetwork')

    .controller('MoneyCtrl', ['$window', '$http', '$timeout', '$scope', 'safeApply', 'MoneyNetworkService',
        function ($window, $http, $timeout, $scope, safeApply, moneyNetworkService)
    {
        var self = this;
        var controller = 'MoneyCtrl';
        console.log(controller + ' loaded');

        self.is_logged_in = function() {
            if (!ZeroFrame.site_info) return false ;
            if (!ZeroFrame.site_info.cert_user_id) return false ;
            if (MoneyNetworkHelper.getUserId()) return true ;
            else return false ;
        };


        self.wallets = [] ;
        (function load_wallets() {
            var pgm = controller + '. load_wallets: ' ;
            var address_index, step_1_search_wallet_sites, step_2_load_wallet_json, step_3_search_wallets_json, step_4_done ;

            address_index = {} ; // from wallet_address to row in self.wallets

            // callback chain:
            // - 1) check wallet.json from added wallet data hubs
            // - 2) merge info from user's wallets.json file (shared wallet rating and reviews)
            // - 3) done. update angularJS UI

            step_4_done = function() {
                safeApply($scope) ;
            } ; // step_4_done

            step_3_search_wallets_json = function() {

                // dbQuery. load info from MN wallets.json files
                // -

                step_4_done() ;
            } ; // step_3_search_wallets_json

            step_2_load_wallet_json = function() {
                if (!self.is_logged_in()) return step_4_done() ;

                moneyNetworkService.get_my_user_hub(function(my_user_data_hub, other_user_hub, other_user_hub_title) {
                    var pgm = controller + '. load_wallets.step_2_load_wallet_json get_my_user_hub callback 1: ';
                    var user_path, inner_path, wallet_addresses ;
                    user_path = "merged-" + MoneyNetworkAPILib.get_merged_type() + "/" + my_user_data_hub + "/data/users/" + ZeroFrame.site_info.auth_address ;
                    inner_path = user_path + "/wallets.json"
                    MoneyNetworkAPILib.z_file_get(pgm, {inner_path: inner_path, required: false}, function (wallets_str, extra) {
                        var pgm = controller + '.load_avatar z_file_get callback 2: ';
                        var wallets, error, i, wallet, user_wallet_addresses, wallet_address, row, j ;
                        if (!wallets_str) return step_4_done() ; // no shared wallet information
                        try { wallets = JSON.parse(wallets_str); }
                        catch (e) {
                            console.log(pgm + 'error. ignore invalid wallets.json. error = ' + e.message) ;
                            return step_3_search_wallets_json() ;
                        }
                        error = MoneyNetworkAPILib.validate_json(pgm, wallets, null, 'api') ;
                        if (error) {
                            console.log(pgm + 'error. ignore invalid wallets.json. error = ' + error) ;
                            return step_4_done() ;
                        }
                        // check rows in wallets array
                        user_wallet_addresses = {} ;
                        for (i=wallets.wallets.length-1 ; i>=0 ; i--) {
                            row = wallets.wallets[i] ;
                            wallet = row.wallet ;
                            error = MoneyNetworkAPILib.validate_json(pgm, wallet, null, 'api') ;
                            if (error) {
                                console.log(pgm + 'ignoring wallets[' + i + '] in ' + inner_path + '. error = ' + error) ;
                                wallets.wallets.splice(i,1) ;
                                continue ;
                            }
                            if (user_wallet_addresses[wallet.wallet_address]) {
                                console.log(pgm + 'error. ignore invalid wallets.json. doublet wallet address ' + wallet.wallet_address + ' in wallets array') ;
                                return step_4_done() ;
                            }
                            user_wallet_addresses[wallet.wallet_address] = row ;
                        }
                        if (!wallets.wallets.length) return step_4_done() ;

                        // todo: merge self.wallets and wallets.json info. add shared, rating and review
                        wallet_addresses = Object.keys(address_index) ;
                        for (wallet_address in user_wallet_addresses) {
                            if (wallet_addresses.indexOf(wallet_address) == -1) wallet_addresses.push(wallet_address) ;
                        }
                        console.log(pgm + 'address_index.keys = ' + JSON.stringify(Object.keys(address_index))) ;
                        console.log(pgm + 'user_wallet_addresses.keys = ' + JSON.stringify(Object.keys(user_wallet_addresses))) ;
                        console.log(pgm + 'wallet_addresses = ' + JSON.stringify(wallet_addresses)) ;

                        for (i=0 ; i<wallet_addresses.length ; i++) {
                            wallet_address = wallet_addresses[i] ;
                            if (!address_index.hasOwnProperty(wallet_address)) {
                                // wallet info is only in user wallets.json file. maybe info shared from other MN users or disconnected wallet
                                // add to self.wallets with share_wallet = true
                                row = user_wallet_addresses[wallet_address] ;
                                wallet = row.wallet ;
                                address_index[wallet_address] = self.wallets.length ;
                                self.wallets.push({
                                    wallet_address: wallet.wallet_address,
                                    wallet_domain: wallet.wallet_domain,
                                    wallet_url: '/' + (wallet.wallet_domain || wallet.wallet_address),
                                    wallet_title: wallet.wallet_title,
                                    wallet_description: wallet.wallet_description,
                                    wallet: wallet,
                                    share_wallet: true,
                                    rate_wallet: '' + row.rate,
                                    wallet_review: row.review
                                });
                            }
                            else if (!user_wallet_addresses[wallet_address]) {
                                // wallet not in user wallets.json file
                                j = address_index[wallet_address] ;
                                self.wallets[j].share_wallet = false ;
                                self.wallets[j].rate_wallet = null ;
                                self.wallets[j].wallet_review = null ;
                            }
                            else {
                                // shared wallet rate and review in user wallets.json file. add info to self.wallets
                                row = user_wallet_addresses[wallet_address] ;
                                j = address_index[wallet_address] ;
                                self.wallets[j].share_wallet = true ;
                                self.wallets[j].rate_wallet = '' + row.rate ;
                                self.wallets[j].wallet_review = row.review ;
                            }
                        }

                        step_4_done() ;

                    }) ; // z_file_get callback 2

                }) ; // get_my_user_hub callback 1

            } ; // step_2_load_wallet_json

            step_1_search_wallet_sites = function() {
                var pgm = controller + '. load_wallets.step_1_search_wallet_sites: ' ;
                var mn_query_21, debug_seq ;

                // find wallet info. latest updated content.json should contain latest info about wallet
                mn_query_21 =
                    "select " +
                    "  wallet.directory,  modified.value as modified," +
                    "  wallet_address.value as wallet_address, wallet_title.value as wallet_title, wallet_description.value as wallet_description, wallet_sha256.value as wallet_sha256 " +
                    "from json as wallet, json as content, keyvalue as modified, keyvalue as wallet_address, keyvalue as wallet_title, keyvalue as wallet_description, keyvalue as wallet_sha256 " +
                    "where wallet.file_name = 'wallet.json' " +
                    "and content.directory = wallet.directory and content.file_name  = 'content.json' " +
                    "and modified.json_id = content.json_id and modified.key = 'modified' " +
                    "and wallet_address.json_id = wallet.json_id and wallet_address.key = 'wallet_address' " +
                    "and wallet_title.json_id = wallet.json_id and wallet_title.key = 'wallet_title' " +
                    "and wallet_description.json_id = wallet.json_id and wallet_description.key = 'wallet_description' " +
                    "and wallet_sha256.json_id = wallet.json_id and wallet_sha256.key = 'wallet_sha256' " +
                    "order by modified.value desc" ;

                debug_seq = MoneyNetworkAPILib.debug_z_api_operation_start(pgm, 'mn query 21', 'dbQuery', MoneyNetworkHelper.show_debug('z_db_query')) ;
                ZeroFrame.cmd("dbQuery", [mn_query_21], function (res) {
                    var pgm = controller + '. load_wallets.step_1_search_wallet_sites dbQuery callback 1: ';
                    var add_wallet, check_wallet, inner_path ;
                    MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq, (!res || res.error) ? 'Failed. error = ' + JSON.stringify(res) : 'OK');
                    if (res.error) {
                        console.log(pgm + "wallets lookup failed: " + res.error);
                        console.log(pgm + 'mn_query_21 = ' + mn_query_21);
                        return ;
                    }
                    // console.log(pgm + 'res = ' + JSON.stringify(res)) ;

                    add_wallet = function (row, wallet) {
                        address_index[wallet.wallet_address] = self.wallets.length ;
                        row.wallet = wallet ;
                        row.wallet_address = wallet.wallet_address ;
                        if (wallet.wallet_domain) row.wallet_domain = wallet.wallet_domain ;
                        row.wallet_url = '/' + (row.wallet_domain || row.wallet_address) ;
                        if (wallet.wallet_description) row.wallet_description = wallet.wallet_description ;
                        self.wallets.push(row) ;
                    } ; // add_wallet

                    check_wallet = function () {
                        var pgm = controller + '.load_wallets.step_1_search_wallet_sites check_wallet 2: ';
                        var row ;
                        row = res.shift() ;
                        if (!row) {
                            // done
                            console.log(pgm + 'self.wallets = ' + JSON.stringify(self.wallets)) ;
                            //self.wallets = [{
                            //    "wallet_description": "Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro",
                            //    "wallet_title": "MoneyNetworkW2",
                            //    "modified": 1519831915,
                            //    "wallet_sha256": "23823ecbc270ac395f20b068efa992d758988b85d570294d81434a463df3210c",
                            //    "directory": "1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
                            //    "wallet_address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                            //    "wallet": {
                            //        "msgtype": "wallet",
                            //        "wallet_address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                            //        "wallet_title": "MoneyNetworkW2",
                            //        "wallet_description": "Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro",
                            //        "currencies": [{
                            //            "code": "tBTC",
                            //            "name": "Test Bitcoin",
                            //            "url": "https://en.bitcoin.it/wiki/Testnet",
                            //            "fee_info": "Fee is calculated by external API (btc.com) and subtracted from amount. Calculated from the last X block in block chain. Lowest fee that still had more than an 80% chance to be confirmed in the next block.",
                            //            "units": [{"unit": "BitCoin", "factor": 1, "decimals": 8}, {
                            //                "unit": "Satoshi",
                            //                "factor": 1e-8,
                            //                "decimals": 0
                            //            }]
                            //        }],
                            //        "api_url": "https://www.blocktrail.com/api/docs",
                            //        "hub": "1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ",
                            //        "hub_title": "W2 Wallet data hub 1",
                            //        "json_schemas": {
                            //            "w2_pubkeys": {
                            //                "type": "object",
                            //                "title": "Send pubkeys (JSEncrypt and cryptMessage) to other wallet session",
                            //                "description": "Sent from send_mt and start_mt post processing",
                            //                "properties": {
                            //                    "msgtype": {"type": "string", "pattern": "^w2_pubkeys$"},
                            //                    "pubkey": {"type": "string"},
                            //                    "pubkey2": {"type": "string"}
                            //                },
                            //                "required": ["msgtype", "pubkey", "pubkey2"],
                            //                "additionalProperties": false
                            //            },
                            //            "w2_check_mt": {
                            //                "type": "object",
                            //                "title": "Return bitcoin addresses and check money transactions",
                            //                "description": "From receiver to sender. Workflow: pubkeys => w2_check_mt. Use this message to exchange bitcoin addresses and crosscheck money transaction information. Identical=execute transactions. Different=abort transactions",
                            //                "properties": {
                            //                    "msgtype": {"type": "string", "pattern": "^w2_check_mt$"},
                            //                    "money_transactions": {
                            //                        "type": "array",
                            //                        "items": {
                            //                            "type": "object",
                            //                            "properties": {
                            //                                "action": {
                            //                                    "type": "string",
                            //                                    "pattern": "^(Send|Request)$"
                            //                                },
                            //                                "code": {"type": "string", "minLength": 2, "maxLength": 5},
                            //                                "amount": {
                            //                                    "type": ["number", "string"],
                            //                                    "description": "number or string with a formatted number (number.toFixed)"
                            //                                },
                            //                                "json": {
                            //                                    "type": "object",
                            //                                    "properties": {
                            //                                        "address": {"type": "string"},
                            //                                        "return_address": {"type": "string"}
                            //                                    },
                            //                                    "required": ["address", "return_address"],
                            //                                    "additionalProperties": false
                            //                                }
                            //                            },
                            //                            "required": ["action", "code", "amount", "json"],
                            //                            "additionalProperties": false
                            //                        },
                            //                        "minItems": 1
                            //                    }
                            //                },
                            //                "required": ["msgtype", "money_transactions"],
                            //                "additionalProperties": false
                            //            },
                            //            "w2_start_mt": {
                            //                "type": "object",
                            //                "title": "start or abort money transactions",
                            //                "description": "From sender to receiver. Workflow: w2_check_mt => w2_start_mt. Start or abort money transaction",
                            //                "properties": {
                            //                    "msgtype": {"type": "string", "pattern": "^w2_start_mt$"},
                            //                    "pay_results": {
                            //                        "type": "array",
                            //                        "items": {"type": ["undefined", "null", "string"]},
                            //                        "description": "null (receiver is sending), bitcoin transactionid or an error message). One row with each row in w2_check_mt.money_transactions array",
                            //                        "minItems": 1
                            //                    },
                            //                    "error": {
                            //                        "type": "string",
                            //                        "description": "w2_check_mt errors. Inconsistency between transaction in the two wallets."
                            //                    }
                            //                },
                            //                "required": ["msgtype"],
                            //                "additionalProperties": false
                            //            },
                            //            "w2_end_mt": {
                            //                "type": "object",
                            //                "title": "end or abort money transactions",
                            //                "description": "From receiver to sender. Workflow: w2_start_mt => w2_end_mt. End (pay_results) or abort money transaction (error)",
                            //                "properties": {
                            //                    "msgtype": {"type": "string", "pattern": "^w2_end_mt$"},
                            //                    "pay_results": {
                            //                        "type": "array",
                            //                        "items": {"type": ["undefined", "null", "string"]},
                            //                        "description": "null (sender is sending) or btc.pay result (transaction id or error message). One row with each row in w2_check_mt.money_transactions array",
                            //                        "minItems": 1
                            //                    },
                            //                    "error": {
                            //                        "type": "string",
                            //                        "description": "w2_start_mt errors. Inconsistency between w2_start_mt and saved transaction info"
                            //                    }
                            //                },
                            //                "required": ["msgtype"],
                            //                "additionalProperties": false
                            //            },
                            //            "w2_cleanup_mt": {
                            //                "type": "object",
                            //                "title": "cleanup file and data after completed or aborted money transaction",
                            //                "description": "From sender to to receiver. Workflow: w2_end_mt => w2_cleanup_mt. Cleanup data in file system and in Ls",
                            //                "properties": {
                            //                    "msgtype": {"type": "string", "pattern": "^w2_cleanup_mt$"},
                            //                    "error": {
                            //                        "type": "string",
                            //                        "description": "w2_end_mt errors. Inconsistency between w2_end_mt and saved transaction info"
                            //                    }
                            //                },
                            //                "required": ["msgtype"],
                            //                "additionalProperties": false
                            //            }
                            //        },
                            //        "message_workflow": {
                            //            "sender": {
                            //                "start": "w2_pubkeys",
                            //                "w2_check_mt": "w2_start_mt",
                            //                "w2_end_mt": "w2_cleanup_mt"
                            //            },
                            //            "receiver": {
                            //                "start": "w2_pubkeys",
                            //                "w2_pubkeys": "w2_check_mt",
                            //                "w2_start_mt": "w2_end_mt",
                            //                "w2_cleanup_mt": "end"
                            //            }
                            //        },
                            //        "wallet_sha256": "23823ecbc270ac395f20b068efa992d758988b85d570294d81434a463df3210c"
                            //    }
                            //}];
                            return step_2_load_wallet_json() ;
                        }
                        if (address_index.hasOwnProperty(row.wallet_address)) return check_wallet() ; // already checked
                        // two paths. either a wallet.json with full info (a) or a wallet.json with wallet_sha256 only (b)
                        if (row.wallet_address && row.wallet_title && row.wallet_description) {
                            // path a: looks like a wallet.json file with full info
                            // read wallet.json
                            inner_path = 'merged-' + MoneyNetworkAPILib.get_merged_type() + '/' + row.directory + '/wallet.json' ;
                            MoneyNetworkAPILib.z_file_get(pgm, {inner_path: inner_path}, function (wallet_str, extra) {
                                var pgm = controller + '. load_wallets.step_1_search_wallet_sites z_file_get callback 3a: ';
                                var wallet, wallet_sha256 ;
                                if (!wallet_str) {
                                    console.log(pgm + 'error: ' + inner_path + ' fileGet failed') ;
                                    return check_wallet() ;
                                }
                                // check wallet
                                try {
                                    wallet = JSON.parse(wallet_str) ;
                                }
                                catch (e) {
                                    console.log(pgm + 'error: ' + inner_path + ' is invalid. error = ' + e.message) ;
                                    return check_wallet() ;
                                }
                                wallet_sha256 = MoneyNetworkAPILib.calc_wallet_sha256(wallet) ;
                                if (!wallet_sha256 || (wallet.wallet_sha256 != wallet_sha256)) {
                                    console.log(pgm + 'ignore ' + inner_path + '. ' + wallet_sha256 + ' != ' + wallet.wallet_sha256) ;
                                    // ignore merged-MoneyNetwork/1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ/wallet.json. null != undefined
                                    return check_wallet() ;
                                }
                                // OK. full wallet info and wallet is valid
                                add_wallet(row, wallet) ;
                                check_wallet();
                            }) ;
                            return ;

                        }
                        else {
                            // path b: looks like a wallet.json file with wallet_sha256 only
                            MoneyNetworkAPILib.get_wallet_info(row.wallet_sha256, function (wallet_info) {
                                var pgm = controller + '. load_wallets.step_1_search_wallet_sites get_wallet_info callback 3b: ';
                                if (!wallet_info || !wallet_info[row.wallet_sha256]) {
                                    console.log(pgm + 'ignore ' + inner_path + '. could not find any wallet info for wallet_sha256 ' + row.wallet_sha256) ;
                                    return check_wallet() ;
                                }
                                // OK. found valid wallet with full wallet info
                                add_wallet(row, wallet_info[row.wallet_sha256]) ;
                                check_wallet();
                            }) ;
                            return ;
                        }

                    } ; // check_wallet 2
                    // start check_wallet loop
                    check_wallet() ;

                }) ; // dbQuery callback 1

            } ; // step_1_search_wallet_sites

            step_1_search_wallet_sites() ;


        })() ; // load_wallets

        self.open_wallet_url = function(wallet) {
            var pgm = controller + '.open_wallet_url: ' ;
            moneyNetworkService.open_window(pgm, wallet.wallet_url);
        } ;

        // rate and review wallets helpers:

        // save wallets.json file. only rows with share_wallet = true. share checkbox checked
        function update_wallets_json () {
            var pgm = controller + '.update_wallets_json: ' ;
            var wallets, i, row, error, wallet, json_raw, j, rate ;
            wallets = {
                msgtype: 'wallets',
                wallets: []
            } ;
            // copy info from self.wallets to wallets. Only rows with share_wallet = true ;
            for (i=0 ; i<self.wallets.length ; i++) {
                row = self.wallets[i] ;
                if (!row.share_wallet) continue ;
                wallet = JSON.parse(JSON.stringify(row.wallet)) ;
                delete wallet['$$hashKey'] ;
                rate = row.rate_wallet ;
                if (['1','2','3','4','5'].indexOf(rate) != -1) rate = parseInt(rate) ;
                for (j=0 ; j<wallet.currencies.length ; j++) {
                    delete wallet.currencies[j]['$$hashKey'] ;
                }
                wallets.wallets.push({
                    wallet: wallet,
                    rate: rate,
                    review: row.wallet_review
                });
            }
            error = MoneyNetworkAPILib.validate_json(pgm, wallets, null, 'api') ;
            if (error) {
                console.log(pgm + 'error. cannot save invalid wallets.json file. error = ' + error) ;
                return ;
            }
            for (i=0 ; i<wallets.wallets.length ; i++) {
                wallet = wallets.wallets[i].wallet ;
                error = MoneyNetworkAPILib.validate_json(pgm, wallet, null, 'api') ;
                if (error) {
                    console.log(pgm + 'error. cannot save invalid wallets.json file. row + ' + i + '. error = ' + error) ;
                    return ;
                }
            }


            // todo: full wallet info or only wallet_sha256 in wallets array?
            // same check as in W2 update_wallet_json. there should always be 5 wallets with identical full wallet information


            // wallets json is OK. write and publish file
            moneyNetworkService.get_my_user_hub(function(my_user_data_hub, other_user_hub, other_user_hub_title) {
                var pgm = controller + '. update_wallets_json get_my_user_hub callback 1: ';
                var user_path, inner_path1;
                user_path = "merged-" + MoneyNetworkAPILib.get_merged_type() + "/" + my_user_data_hub + "/data/users/" + ZeroFrame.site_info.auth_address;
                inner_path1 = user_path + "/wallets.json" ;
                json_raw = unescape(encodeURIComponent(JSON.stringify(wallets, null, "\t")));
                MoneyNetworkAPILib.z_file_write(pgm, inner_path1, btoa(json_raw), {}, function (res) {
                    var pgm = controller + '. update_wallets_json z_file_write callback 2: ';
                    var inner_path2 ;
                    if (res != 'ok') {
                        console.log(pgm + 'error: ' + inner_path1 + ' fileWrite failed. error = ' + JSON.stringify(res)) ;
                        return ;
                    }
                    inner_path2 = user_path + '/content.json' ;
                    moneyNetworkService.zeronet_site_publish({inner_path: inner_path2}, function (res) {
                        var pgm = controller + '. update_wallets_json zeronet_site_publish callback 3: ';
                        if (res != 'ok') console.log(pgm + 'error. wallets.json publish failed. error = ' + JSON.stringify(res)) ;
                    }) ; // zeronet_site_publish callback 3

                }) ; // z_file_write callback 2

            }) ; // get_my_user_hub callback 1

        } // update_wallets_json

        // share/unshare wallet with other MN users
        self.share_wallet_changed = function (wallet) {
            var pgm = controller + '.share_wallet_changed: ' ;
            console.log(pgm + 'wallet.share_wallet = ' + wallet.share_wallet);
            update_wallets_json() ;
        } ;

        // review text helper
        self.handleTextAreaHeight = function (e) {
            var element = e.target;
            element.style.overflow = 'hidden';
            element.style.height = 0;
            element.style.height = element.scrollHeight + 'px';
        };

        self.rating_changed = function (wallet) {
            var pgm = controller + '.rating_changed: ' ;
            console.log(pgm + 'rate_wallet = ' + wallet.rate_wallet) ;
            update_wallets_json() ;
        } ;

        // save updated review
        self.review_updated = function (wallet) {
            var pgm = controller + '.review_updated: ' ;
            console.log(pgm + 'wallet_review = ' + wallet.wallet_review) ;
            update_wallets_json() ;
        };

        // end MoneyCtrl
    }])

;