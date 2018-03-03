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
            var address_index, step_1_search_wallet_sites, step_2_load_user_wallet_json, step_3_load_users_wallets_json, step_4_done ;

            address_index = {} ; // from wallet_address to row in self.wallets

            // callback chain:
            // - 1) check wallet.json from added wallet data hubs
            // - 2) merge info from user's wallets.json file (shared wallet rating and reviews)
            // - 3) done. update angularJS UI

            step_4_done = function() {
                safeApply($scope) ;
            } ; // step_4_done

            // load shared wallet info from other users
            step_3_load_users_wallets_json = function() {
                var pgm = controller + '.load_wallets.step_3_load_users_wallets_json: ';

                var mn_query_22, debug_seq ;

                // find wallet info. check latest updated and shared wallet.json files first (wallet_modified = last wallet.json sign and publish)
                mn_query_22 =
                    "select " +
                    "  wallets_json.directory,  ifnull(wallets_modified.value, content_modified.value) as wallets_modified, " +
                    "  wallets.address, wallets.wallet_address, wallets.wallet_domain,  wallets.wallet_title,   wallets.wallet_description, wallets.api_url, wallets.wallet_sha256, " +
                    "  wallets.wallet_modified, wallets.wallet_directory, " +
                    "  (select share.rate from share where share.json_id = wallets.json_id " +
                    "   and share.address = wallets.address) as rate, " +
                    "  (select share.review from share where share.json_id = wallets.json_id " +
                    "   and share.address = wallets.address) as review " +
                    "from wallets, json as wallets_json, json as content_json, keyvalue as content_modified, keyvalue as wallets_modified " +
                    "where wallets.wallet_modified is not null and wallets.json_id = wallets_json.json_id " +
                    "and content_json.directory = wallets_json.directory and content_json.file_name = 'content.json' " +
                    "and content_modified.json_id = content_json.json_id and content_modified.key = 'modified' " +
                    "and wallets_modified.json_id = wallets_json.json_id and wallets_modified.key = 'wallets_modified' " +
                    "order by wallets.wallet_modified desc" ;

                debug_seq = MoneyNetworkAPILib.debug_z_api_operation_start(pgm, 'mn query 22', 'dbQuery', MoneyNetworkHelper.show_debug('z_db_query')) ;
                ZeroFrame.cmd("dbQuery", [mn_query_22], function (res) {
                    var pgm = controller + '. load_wallets.step_3_load_users_wallets_json dbQuery callback 1: ';
                    var add_wallet, check_wallet ;
                    MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq, (!res || res.error) ? 'Failed. error = ' + JSON.stringify(res) : 'OK');
                    if (res.error) {
                        console.log(pgm + "wallets lookup failed: " + res.error);
                        console.log(pgm + 'mn_query_22 = ' + mn_query_22);
                        return;
                    }
                    console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                    //res = [{
                    //    "wallet_description": "Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro",
                    //    "wallet_title": "MoneyNetworkW2",
                    //    "api_url": "https://www.blocktrail.com/api/docs",
                    //    "wallet_directory": "1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
                    //    "wallets_modified": 1520093196,
                    //    "review": "OK test bitcoin wallet. Fine MN-W2 integration. Have tested send and receive money many times in MN UI. Send/receive operations takes some time to complete. Also tested backup in MN OK.",
                    //    "wallet_domain": null,
                    //    "wallet_sha256": "23823ecbc270ac395f20b068efa992d758988b85d570294d81434a463df3210c",
                    //    "wallet_modified": 1520005131,
                    //    "rate": 5,
                    //    "address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                    //    "directory": "1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
                    //    "wallet_address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1"
                    //}];

                    // todo: 1) calc avg rating for each wallet_address
                    // todo: 2) sum number of reviews
                    // todo: 3) lookup full wallet info
                    // todo: 4) insert missing wallets into self.wallets array. must get full wallet info from wallet_sha256 address. see MoneyNetworkAPI.get_wallet_info

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
                        var pgm = controller + '.load_wallets.step_3_load_users_wallets_json check_wallet 2: ';
                        var row, inner_path ;
                        row = res.shift() ;
                        if (!row) {
                            // done
                            console.log(pgm + 'self.wallets = ' + JSON.stringify(self.wallets)) ;
                            return step_4_done() ;
                        }
                        if (address_index.hasOwnProperty(row.wallet_address)) return check_wallet() ; // already checked
                        // two paths. either a wallet.json with full info (a) or a wallet.json with wallet_sha256 only (b)
                        if (row.wallet_address && row.wallet_title && row.wallet_description) {
                            // path a: looks like a wallet.json file with full info
                            // read wallets.json
                            inner_path = 'merged-' + MoneyNetworkAPILib.get_merged_type() + '/' + row.directory + '/wallets.json' ;
                            MoneyNetworkAPILib.z_file_get(pgm, {inner_path: inner_path}, function (wallets_str, extra) {
                                var pgm = controller + '. load_wallets.step_3_load_users_wallets_json z_file_get callback 3a: ';
                                var wallets, error, wallet, wallet_sha256 ;
                                if (!wallets_str) {
                                    console.log(pgm + 'error: ' + inner_path + ' fileGet failed') ;
                                    return check_wallet() ;
                                }
                                // check wallets
                                try {
                                    wallets = JSON.parse(wallets_str) ;
                                }
                                catch (e) {
                                    console.log(pgm + 'error: ' + inner_path + ' is invalid. error = ' + e.message) ;
                                    return check_wallet() ;
                                }
                                // json validate wallets.json file
                                error = MoneyNetworkAPILib.validate_json(pgm, wallets, null, 'api') ;
                                if (error) {
                                    console.log(pgm + 'error: ' + inner_path + ' is invalid. error = ' + error) ;
                                    return check_wallet() ;
                                }
                                wallet = wallets.wallets[row.wallet_address] ;
                                wallet_sha256 = MoneyNetworkAPILib.calc_wallet_sha256(wallet) ;
                                if (!wallet_sha256 || (wallet.wallet_sha256 != wallet_sha256)) {
                                    console.log(pgm + 'ignore ' + inner_path + '. ' + wallet_sha256 + ' != ' + wallet.wallet_sha256) ;
                                    return check_wallet() ;
                                }
                                // OK. full wallet info and wallet is valid
                                add_wallet(row, wallet) ;
                                check_wallet();
                            }) ;
                            return ;

                        }
                        else {
                            // path b: looks like a wallet.json with wallet_sha256 only
                            // todo: add wallets to get_wallet_info.
                            MoneyNetworkAPILib.get_wallet_info(row.wallet_sha256, function (wallet_info) {
                                var pgm = controller + '. load_wallets.step_3_load_users_wallets_json get_wallet_info callback 3b: ';
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

            } ; // step_3_load_users_wallets_json

            // load shared wallet info for this user.
            // todo: no user_seq in wallets.json file. user_seq in all other user files (data, status, like)
            step_2_load_user_wallet_json = function() {
                var pgm = controller + '. load_wallets.step_2_load_user_wallet_json: ';
                if (!self.is_logged_in()) return step_4_done() ;

                moneyNetworkService.get_my_user_hub(function(my_user_data_hub, other_user_hub, other_user_hub_title) {
                    var pgm = controller + '. load_wallets.step_2_load_user_wallet_json get_my_user_hub callback 1: ';
                    var user_path, inner_path, wallet_addresses ;
                    user_path = "merged-" + MoneyNetworkAPILib.get_merged_type() + "/" + my_user_data_hub + "/data/users/" + ZeroFrame.site_info.auth_address ;
                    inner_path = user_path + "/wallets.json"
                    MoneyNetworkAPILib.z_file_get(pgm, {inner_path: inner_path, required: false}, function (wallets_str, extra) {
                        var pgm = controller + '.load_wallets.step_2_load_user_wallet_json z_file_get callback 2: ';
                        var wallets, error, i, wallet, user_wallet_addresses, wallet_address, row, j ;
                        if (!wallets_str) return step_4_done() ; // no shared wallet information
                        try { wallets = JSON.parse(wallets_str); }
                        catch (e) {
                            console.log(pgm + 'error. ignore invalid wallets.json. error = ' + e.message) ;
                            return step_3_load_users_wallets_json() ;
                        }
                        error = MoneyNetworkAPILib.validate_json(pgm, wallets, null, 'api') ;
                        if (error) {
                            console.log(pgm + 'error. ignore invalid wallets.json. error = ' + error) ;
                            return step_4_done() ;
                        }

                        // check wallet addresses in wallets.wallets object hash. must be unique
                        user_wallet_addresses = {} ;
                        for (wallet_address in wallets.wallets) {
                            wallet = wallets.wallets[wallet_address] ;
                            error = MoneyNetworkAPILib.validate_json(pgm, wallet, null, 'api') ;
                            if (error) {
                                console.log(pgm + 'ignoring invalid wallet for ' + wallet_address + '. error = ' + error) ;
                                delete wallets.wallets[wallet_address]
                                continue ;
                            }
                            if (wallet.wallet_address && (wallet_address != wallet_address)) {
                                console.log(pgm + 'ignoring invalid wallet. key was ' + wallet_address + '. wallet_address is ' + wallet.wallet_address) ;
                                delete wallets.wallets[wallet_address]
                                continue ;
                            }
                            if (user_wallet_addresses[wallet.wallet_address]) {
                                console.log(pgm + 'error. ignore invalid wallets.json. doublet wallet address ' + wallet.wallet_address + ' in wallets.wallets object hash') ;
                                return step_4_done() ;
                            }
                            user_wallet_addresses[wallet_address] = true ;
                        }
                        if (!Object.keys(wallets.wallets).length) return step_4_done() ;

                        // check wallet addresses in wallets.share object. must be unique and must be in wallets.wallet object hash
                        for (wallet_address in user_wallet_addresses) delete user_wallet_addresses[wallet_address] ;
                        for (wallet_address in wallets.share) {
                            if (!wallets.wallets[wallet_address]) {
                                console.log(pgm + 'ignoring invalid share for ' + wallet_address + '. address is not in wallets.wallets objewct hash') ;
                                delete wallets.share[wallet_address] ;
                                continue ;
                            }
                            if (user_wallet_addresses[wallet_address]) {
                                console.log(pgm + 'error. ignore invalid wallets.json. doublet wallet address ' + wallet.wallet_address + ' in wallets.share object hash') ;
                                return step_4_done() ;
                            }
                            user_wallet_addresses[wallet_address] = true ;
                        }

                        // merge self.wallets and wallets.json info. add shared, rating and review
                        wallet_addresses = Object.keys(address_index) ;
                        for (wallet_address in wallets.wallets) {
                            if (wallet_addresses.indexOf(wallet_address) == -1) wallet_addresses.push(wallet_address) ;
                        }
                        console.log(pgm + 'address_index.keys = ' + JSON.stringify(Object.keys(address_index))) ;
                        console.log(pgm + 'wallets.wallets.keys = ' + JSON.stringify(Object.keys(wallets.wallets))) ;
                        console.log(pgm + 'wallet_addresses = ' + JSON.stringify(wallet_addresses)) ;

                        for (i=0 ; i<wallet_addresses.length ; i++) {
                            wallet_address = wallet_addresses[i] ;
                            if (!address_index.hasOwnProperty(wallet_address)) {
                                // wallet info is only in user wallets.json file. maybe info shared from other MN users or disconnected wallet
                                // add to self.wallets with share_wallet = true
                                wallet = wallets.wallets[wallet_address] ;
                                row = {
                                    wallet_address: wallet.wallet_address,
                                    wallet_domain: wallet.wallet_domain,
                                    wallet_url: '/' + (wallet.wallet_domain || wallet.wallet_address),
                                    wallet_title: wallet.wallet_title,
                                    wallet_description: wallet.wallet_description,
                                    wallet: wallet,
                                    share_wallet: true
                                } ;
                                if (wallets.share[wallet_address]) {
                                    row.rate_wallet = '' + wallets.share[wallet_address].rate ;
                                    row.wallet_review = '' + wallets.share[wallet_address].review ;
                                }
                                address_index[wallet_address] = self.wallets.length ;
                                self.wallets.push(row);
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
                                if (wallets.share[wallet_address]) {
                                    self.wallets[j].rate_wallet = '' + wallets.share[wallet_address].rate ;
                                    self.wallets[j].wallet_review = '' + wallets.share[wallet_address].review ;
                                }
                            }
                        }

                        step_3_load_users_wallets_json() ;

                    }) ; // z_file_get callback 2

                }) ; // get_my_user_hub callback 1

            } ; // step_2_load_user_wallet_json

            step_1_search_wallet_sites = function() {
                var pgm = controller + '. load_wallets.step_1_search_wallet_sites: ' ;
                var mn_query_21, debug_seq ;

                // find wallet info. latest updated content.json should contain latest info about wallet
                mn_query_21 =
                    "select " +
                    "  wallet.directory,  modified.value as wallet_modified," +
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
                            return step_2_load_user_wallet_json() ;
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
            var wallets, i, row1, row2, error, wallet, json_raw, j, rate, wallet_address ;
            wallets = {
                msgtype: 'wallets',
                wallets: {},
                share: {},
                wallets_modified: Math.floor(new Date().getTime()/1000)
            } ;
            // copy info from self.wallets to wallets.json file. Only rows with share_wallet = true ;
            // todo: add wallet_modified info. when was wallet.json last updated (signed+publish). Other MN without wallet data hub cannot check modified timestamp for wallet.json file
            for (i=0 ; i<self.wallets.length ; i++) {
                row1 = self.wallets[i] ;
                if (!row1.share_wallet) continue ;
                wallet_address = row1.wallet_address ;
                wallet = JSON.parse(JSON.stringify(row1.wallet)) ;
                delete wallet['$$hashKey'] ;
                for (j=0 ; j<wallet.currencies.length ; j++) {
                    delete wallet.currencies[j]['$$hashKey'] ;
                }
                // add extra wallet info only in wallets.json file. MN users must be able to see modified timestamp for wallet.json file for shared information. last updated info is used
                wallet.wallet_modified = row1.wallet_modified ;
                wallet.wallet_directory = row1.directory ;
                wallets.wallets[wallet_address] = wallet ;
                if (row1.rate_wallet || row1.wallet_review) {
                    // add user rating and review for wallets
                    rate = row1.rate_wallet ;
                    if (['1','2','3','4','5'].indexOf(rate) != -1) rate = parseInt(rate) ;
                    row2 = { } ;
                    if (rate) row2.rate = rate ;
                    if (row1.wallet_review) row2.review = row1.wallet_review ;
                    wallets.share[wallet_address] = row2 ;
                } 
            }
            // validate wallets.json before write. 
            // two validations: top level is validated with "wallets". wallets object hash is validated with "wallet"
            error = MoneyNetworkAPILib.validate_json(pgm, wallets, null, 'api') ;
            if (error) {
                console.log(pgm + 'error. cannot save invalid wallets.json file. error = ' + error) ;
                return ;
            }
            for (wallet_address in wallets.wallets) {
                wallet = wallets.wallets[wallet_address] ;
                error = MoneyNetworkAPILib.validate_json(pgm, wallet, null, 'api') ;
                if (error) {
                    console.log(pgm + 'error. cannot save invalid wallets.json file. wallet_address = ' + wallet_address + '. error = ' + error) ;
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