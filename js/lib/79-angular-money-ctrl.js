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
            var pgm = controller + '.load_wallets: ' ;
            var address_index, step_1_search_wallet_sites, step_2_load_user_wallet_json, step_3_load_users_wallets_json,
                step_4_done, rating_index_by_address, reviews_index_by_address ;

            address_index = {} ; // from wallet_address to row in self.wallets
            // rating_index_by_address = {} ; // from wallet_address to ratings object
            // reviews_index_by_address = {} ; // from wallet_address to ratings object

            // callback chain:
            // - 1) check wallet.json from added wallet data hubs
            // - 2) merge info from user's wallets.json file (shared wallet rating and reviews)
            // - 3) done. update angularJS UI

            step_4_done = function() {
                safeApply($scope) ;
            } ; // step_4_done

            // load shared wallet info from MN users (ratings and reviews)
            step_3_load_users_wallets_json = function() {
                var pgm = controller + '.load_wallets.step_3_load_users_wallets_json: ';

                var mn_query_22, debug_seq ;

                // find wallet info. check latest updated and shared wallet.json files first (wallet_modified = last wallet.json sign and publish)
                mn_query_22 =
                    "select " +
                    "  wallets_json.directory as wallets_directory, " +
                    "  ifnull(wallets_modified.value, content_modified.value) as wallets_modified, " +
                    "  content_cert_user_id.value as wallets_cert_user_id, " +
                    "  wallets.address, wallets.wallet_address, wallets.wallet_domain,  wallets.wallet_title, wallets.wallet_description, " +
                    "  wallets.api_url, wallets.wallet_sha256,   wallets.wallet_modified, wallets.wallet_directory, " +
                    "  share.user_seq, share.rate, share.review, " +
                    "  (select avatar from users where users.json_id = data.json_id and users.user_seq = share.user_seq) as avatar " +
                    "from wallets, json as wallets_json, json as content_json, keyvalue as content_modified, " +
                    "     keyvalue as wallets_modified, share, keyvalue as content_cert_user_id, json as data " +
                    "where wallets.wallet_modified is not null and wallets.json_id = wallets_json.json_id " +
                    "and content_json.directory = wallets_json.directory and content_json.file_name = 'content.json' " +
                    "and content_modified.json_id = content_json.json_id and content_modified.key = 'modified' " +
                    "and wallets_modified.json_id = wallets_json.json_id and wallets_modified.key = 'wallets_modified' " +
                    "and share.address = wallets.address and share.json_id = wallets.json_id " +
                    "and content_cert_user_id.json_id = content_json.json_id and content_cert_user_id.key = 'cert_user_id' " +
                    "and data.directory = wallets_json.directory and data.file_name = 'data.json' " +
                    "order by wallets.wallet_modified desc" ;

                console.log(pgm + 'mn_query_22 = ' + mn_query_22) ;
                debug_seq = MoneyNetworkAPILib.debug_z_api_operation_start(pgm, 'mn query 22', 'dbQuery', MoneyNetworkHelper.show_debug('z_db_query')) ;
                ZeroFrame.cmd("dbQuery", [mn_query_22], function (res) {
                    var pgm = controller + '.load_wallets.step_3_load_users_wallets_json dbQuery callback 1: ';
                    var add_wallet, check_wallet, save_rate_and_review ;
                    MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq, (!res || res.error) ? 'Failed. error = ' + JSON.stringify(res) : 'OK');
                    if (res.error) {
                        console.log(pgm + "error. wallets lookup failed: " + res.error);
                        console.log(pgm + 'mn_query_22 = ' + mn_query_22);
                        return step_4_done();
                    }
                    console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                    //res = [
                    //    {
                    //        "wallet_description": "Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro",
                    //        "wallets_directory": "1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
                    //        "wallet_title": "MoneyNetworkW2",
                    //        "api_url": "https://www.blocktrail.com/api/docs",
                    //        "wallet_directory": "1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
                    //        "wallet_address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                    //        "review": "Very nice test bitcoin wallet with fine MN-wallet integration. Have tested many send/receive money transaction OK from MN chat. Not fast but is working. Also tested backup (export & import) from MN.",
                    //        "wallet_domain": null,
                    //        "wallet_sha256": "23823ecbc270ac395f20b068efa992d758988b85d570294d81434a463df3210c",
                    //        "wallets_cert_user_id": "jro@zeroid.bit",
                    //        "rate": 4,
                    //        "address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                    //        "wallet_modified": 1520440207,
                    //        "user_seq": 1,
                    //        "wallets_modified": 1520505250
                    //    }, {
                    //        "wallet_description": "Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro",
                    //        "wallets_directory": "182Uot1yJ6mZEwQYE5LX1P5f6VPyJ9gUGe/data/users/16nDbDocFiEsuBn91SknhYFbA33DVdxMQ9",
                    //        "wallet_title": "MoneyNetworkW2",
                    //        "api_url": "https://www.blocktrail.com/api/docs",
                    //        "wallet_directory": "1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ/data/users/16nDbDocFiEsuBn91SknhYFbA33DVdxMQ9",
                    //        "wallet_address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                    //        "review": null,
                    //        "wallet_domain": null,
                    //        "wallet_sha256": "23823ecbc270ac395f20b068efa992d758988b85d570294d81434a463df3210c",
                    //        "wallets_cert_user_id": "16nDbDocFiEsu@moneynetwork.bit",
                    //        "rate": 4,
                    //        "address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                    //        "wallet_modified": 1520324127,
                    //        "user_seq": 1,
                    //        "wallets_modified": 1520505432
                    //    }];


                    // todo: 1) calc avg rating for each wallet_address
                    // todo: 2) sum number of reviews

                    add_wallet = function (row, wallet) {
                        address_index[wallet.wallet_address] = self.wallets.length ;
                        row.wallet = wallet ;
                        row.wallet_address = wallet.wallet_address ;
                        if (wallet.wallet_domain) row.wallet_domain = wallet.wallet_domain ;
                        row.wallet_url = '/' + (row.wallet_domain || row.wallet_address) ;
                        if (wallet.wallet_description) row.wallet_description = wallet.wallet_description ;
                        self.wallets.push(row) ;
                    } ; // add_wallet

                    save_rate_and_review = function (row) {
                        var i, wallet, found_i, details, row2 ;
                        i = address_index[row.address] ;
                        wallet = self.wallets[i] ;
                        if (!wallet.ratings) wallet.ratings = { details: [] } ;
                        details = wallet.ratings.details ;
                        found_i = -1 ;
                        for (i=0 ; i<details.length ; i++) {
                            if (row.rate == details[i].rate) {
                                found_i = i ;
                                break ;
                            }
                        } // for i
                        if (found_i == -1) {
                            found_i = details.length ;
                            details.push({ rate: row.rate, ratings: [], no_reviews: 0, show_hide: 'show' }) ;
                        }
                        // row2:
                        // from MN user data hub: wallets_directory, wallets_modified, rate and review (MN user review)
                        // from wallet data hub: wallet_directory and wallet_modified (when was wallet info updated and by whom)
                        row2 = {
                            wallets_directory: row.wallets_directory,
                            wallets_modified: row.wallets_modified*1000,
                            wallets_cert_user_id: row.wallets_cert_user_id,
                            user_seq: row.user_seq,
                            avatar: row.avatar,
                            rate: row.rate
                        } ;
                        if (row.review) row2.review = row.review ;
                        row2.wallet_directory = row.wallet_directory ;
                        row2.wallet_modified = row.wallet_modified ;
                        details[found_i].ratings.push(row2) ;
                        if (row.review) details[found_i].no_reviews++ ;
                    } ; // save_rate_and_review

                    check_wallet = function () {
                        var pgm = controller + '.load_wallets.step_3_load_users_wallets_json check_wallet 2: ';
                        var row, inner_path, get_wallet_info, i, no_ratings, sum_ratings, address, rating, wallet, details, rate ;
                        row = res.shift() ;
                        if (!row) {
                            // done
                            // console.log(pgm + 'rating_index_by_address = ' + JSON.stringify(rating_index_by_address)) ;
                            // console.log(pgm + 'reviews_index_by_address = ' + JSON.stringify(reviews_index_by_address)) ;
                            // add summary for ratings and reviews
                            for (i=0 ; i<self.wallets.length ; i++) {
                                wallet = self.wallets[i] ;
                                if (!wallet.ratings) wallet.ratings = { details: [], no_ratings: 0, no_reviews: 0, avg_rating: 'n/a' } ;
                                else {
                                    wallet.ratings.no_ratings = 0 ;
                                    wallet.ratings.no_reviews = 0 ;
                                    sum_ratings = 0 ;
                                    details = wallet.ratings.details || [] ;
                                    for (i=0 ; i<details.length ; i++) {
                                        wallet.ratings.no_ratings += details[i].ratings.length ;
                                        sum_ratings += details[i].rate * details[i].ratings.length ;
                                        wallet.ratings.no_reviews += details[i].no_reviews ;
                                    }
                                    if (wallet.ratings.no_ratings) wallet.ratings.avg_rating = sum_ratings / wallet.ratings.no_ratings ;
                                    else wallet.ratings.avg_rating = 'n/a' ;
                                }
                                wallet.ratings.show_hide = 'show' ;
                            }
                            // console.log(pgm + 'self.wallets = ' + CircularJSON.stringify(self.wallets)) ;

                            return step_4_done() ;
                        }

                        // save rating and review.
                        //if (row.rate) {
                        //    if (!rating_index_by_address[row.address]) rating_index_by_address[row.address] = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0} ;
                        //    rating_index_by_address[row.address][row.rate]++ ;
                        //    if (row.review) {
                        //        if (!reviews_index_by_address[row.address]) reviews_index_by_address[row.address] = [] ;
                        //        reviews_index_by_address[row.address].push(row) ;
                        //    }
                        //}

                        if (address_index.hasOwnProperty(row.wallet_address)) {
                            // already checked
                            save_rate_and_review(row) ;
                            return check_wallet() ;
                        }
                        // two paths. either a wallet.json with full info (a) or a wallet.json with wallet_sha256 only (b)

                        // path b: looks like a wallet.json with wallet_sha256 only. also used as fallback in path a
                        get_wallet_info = function (row) {
                            MoneyNetworkAPILib.get_wallet_info(row.wallet_sha256, function (wallet_info) {
                                var pgm = controller + '.load_wallets.step_3_load_users_wallets_json get_wallet_info callback 3b: ';
                                if (!wallet_info || !wallet_info[row.wallet_sha256]) {
                                    console.log(pgm + 'ignore ' + inner_path + '. could not find any wallet info for wallet_sha256 ' + row.wallet_sha256) ;
                                    return check_wallet() ;
                                }
                                // OK. found valid wallet with full wallet info
                                add_wallet(row, wallet_info[row.wallet_sha256]) ;
                                save_rate_and_review(row) ;
                                check_wallet();
                            }) ;
                        } ; // get_wallet_info

                        if (row.wallet_address && row.wallet_title && row.wallet_description) {
                            // path a: looks like a wallet.json file with full info
                            // read wallets.json
                            inner_path = 'merged-' + MoneyNetworkAPILib.get_merged_type() + '/' + row.wallets_directory + '/wallets.json' ;
                            MoneyNetworkAPILib.z_file_get(pgm, {inner_path: inner_path}, function (wallets_str, extra) {
                                var pgm = controller + '.load_wallets.step_3_load_users_wallets_json z_file_get callback 3a: ';
                                var wallets, error, wallet, wallet_sha256 ;
                                if (!wallets_str) {
                                    console.log(pgm + 'error: ' + inner_path + ' fileGet failed') ;
                                    return get_wallet_info() ;
                                }
                                // check wallets
                                try {
                                    wallets = JSON.parse(wallets_str) ;
                                }
                                catch (e) {
                                    console.log(pgm + 'error: ' + inner_path + ' is invalid. error = ' + e.message) ;
                                    return get_wallet_info() ;
                                }
                                // json validate wallets.json file
                                error = MoneyNetworkAPILib.validate_json(pgm, wallets, null, 'api') ;
                                if (error) {
                                    console.log(pgm + 'error: ' + inner_path + ' is invalid. error = ' + error) ;
                                    return get_wallet_info() ;
                                }
                                wallet = wallets.wallets[row.wallet_address] ;
                                wallet_sha256 = MoneyNetworkAPILib.calc_wallet_sha256(wallet) ;
                                if (!wallet_sha256 || (wallet.wallet_sha256 != wallet_sha256)) {
                                    console.log(pgm + 'ignore ' + inner_path + '. ' + wallet_sha256 + ' != ' + wallet.wallet_sha256) ;
                                    return get_wallet_info() ;
                                }
                                // OK. full wallet info and wallet is valid
                                add_wallet(row, wallet) ;
                                save_rate_and_review(row) ;
                                check_wallet();
                            }) ;

                        }
                        else {
                            // path b: looks like a wallet.json with wallet_sha256 only
                            get_wallet_info() ;
                        }

                    } ; // check_wallet 2
                    // start check_wallet loop
                    check_wallet() ;

                }) ; // dbQuery callback 1

            } ; // step_3_load_users_wallets_json

            // todo: step 2.5. load not shared rating and review from localStorage
            //       including review without rating. not in wallets.json file.

            // load shared wallet info saved by this user.
            step_2_load_user_wallet_json = function() {
                var pgm = controller + '.load_wallets.step_2_load_user_wallet_json: ';
                if (!self.is_logged_in()) return step_3_load_users_wallets_json() ;

                moneyNetworkService.get_my_user_hub(function(my_user_data_hub, other_user_hub, other_user_hub_title) {
                    var pgm = controller + '.load_wallets.step_2_load_user_wallet_json get_my_user_hub callback 1: ';
                    var user_path, inner_path, wallet_addresses ;
                    user_path = "merged-" + MoneyNetworkAPILib.get_merged_type() + "/" + my_user_data_hub + "/data/users/" + ZeroFrame.site_info.auth_address ;
                    inner_path = user_path + "/wallets.json";
                    MoneyNetworkAPILib.z_file_get(pgm, {inner_path: inner_path, required: false}, function (wallets_str, extra) {
                        var pgm = controller + '.load_wallets.step_2_load_user_wallet_json z_file_get callback 2: ';
                        var wallets, error, i, wallet, user_wallet_addresses, wallet_address, row, j, my_shared_wallets ;
                        if (!wallets_str) return step_3_load_users_wallets_json() ; // no shared wallet information
                        try { wallets = JSON.parse(wallets_str); }
                        catch (e) {
                            console.log(pgm + 'error. ignore invalid wallets.json. error = ' + e.message) ;
                            return step_3_load_users_wallets_json() ;
                        }
                        error = MoneyNetworkAPILib.validate_json(pgm, wallets, null, 'api') ;
                        if (error) {
                            console.log(pgm + 'error. ignore invalid wallets.json. error = ' + error) ;
                            return step_3_load_users_wallets_json() ;
                        }

                        // find shared wallets for local user.
                        my_shared_wallets = {} ;
                        for (i=0 ; i<wallets.share.length ; i++) {
                            if (z_cache.user_seq == wallets.share[i].user_seq) my_shared_wallets[wallets.share[i].address] = 0 ;
                        }

                        // check wallet addresses in wallets.wallets object hash. must be unique
                        for (wallet_address in wallets.wallets) {
                            if (!my_shared_wallets.hasOwnProperty(wallet_address)) continue ; // shared by other local user account
                            wallet = wallets.wallets[wallet_address] ;
                            error = MoneyNetworkAPILib.validate_json(pgm, wallet, null, 'api') ;
                            if (error) {
                                console.log(pgm + 'ignoring invalid wallet for ' + wallet_address + '. error = ' + error) ;
                                delete my_shared_wallets[wallet_address];
                                continue ;
                            }
                            // extra validations:
                            if (wallet.wallet_address && (wallet.wallet_address != wallet_address)) {
                                console.log(pgm + 'ignoring invalid wallet. address key = ' + wallet_address + '. wallet_address = ' + wallet.wallet_address) ;
                                delete my_shared_wallets[wallet_address];
                                continue ;
                            }
                            if (!wallet.wallet_modified || !wallet.wallet_directory) {
                                console.log(pgm + 'ignoring invalid wallet. wallet_modified and/or wallet_directory is missing for ' + wallet_address) ;
                                delete my_shared_wallets[wallet_address];
                                continue ;
                            }
                            my_shared_wallets[wallet_address]++ ;
                            if (my_shared_wallets[wallet_address] > 1) {
                                console.log(pgm + 'ignoring invalid wallet for ' + wallet_address + '. error. doublet wallet address') ;
                                delete my_shared_wallets[wallet_address];
                            }
                        } // for wallet_address
                        if (!Object.keys(wallets.wallets).length) return step_3_load_users_wallets_json() ;

                        // add info from wallets.json file (only this user_seq / this local account)
                        for (wallet_address in my_shared_wallets) {
                            if (address_index.hasOwnProperty(wallet_address)) {
                                i = address_index[wallet_address] ;
                                row = self.wallets[i] ;
                            }
                            else {
                                // wallet info is only in user wallets.json file. maybe info shared from other MN users or disconnected wallet
                                // add to self.wallets with share_wallet = true
                                wallet = wallets.wallets[wallet_address] ;
                                row = {
                                    wallet_address: wallet.wallet_address,
                                    wallet_domain: wallet.wallet_domain,
                                    wallet_url: '/' + (wallet.wallet_domain || wallet.wallet_address),
                                    wallet_title: wallet.wallet_title,
                                    wallet_description: wallet.wallet_description,
                                    wallet: wallet
                                } ;
                                address_index[wallet_address] = self.wallets.length ;
                                self.wallets.push(row);
                            }
                            row.share_wallet = true ;
                            // add info from share array (rating and review)
                            for (i=0 ; i<wallets.share.length ; i++) {
                                if ((wallets.share[i].user_seq == z_cache.user_seq) && (wallets.share[i].address == wallet_address)) {
                                    if (wallets.share[i].rate) {
                                        row.rate_wallet = wallets.share[i].rate ;
                                        if (wallets.share[i].review) row.wallet_review = wallets.share[i].review ;
                                    }
                                }
                            } // for i
                        } // for wallet_address

                        step_3_load_users_wallets_json() ;

                    }) ; // z_file_get callback 2

                }) ; // get_my_user_hub callback 1

            } ; // step_2_load_user_wallet_json

            step_1_search_wallet_sites = function() {
                var pgm = controller + '.load_wallets.step_1_search_wallet_sites: ' ;
                var mn_query_21, debug_seq ;

                // find wallet info. latest updated content.json should contain latest info about wallet
                mn_query_21 =
                    "select " +
                    "  wallet.directory as wallet_directory, modified.value as wallet_modified," +
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
                    var pgm = controller + '.load_wallets.step_1_search_wallet_sites dbQuery callback 1: ';
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
                        var row, get_wallet_info ;
                        row = res.shift() ;
                        if (!row) {
                            // done
                            console.log(pgm + 'self.wallets = ' + JSON.stringify(self.wallets)) ;
                            return step_2_load_user_wallet_json() ;
                        }
                        if (address_index.hasOwnProperty(row.wallet_address)) return check_wallet() ; // already checked
                        // two paths. either a wallet.json with full info (a) or a wallet.json with wallet_sha256 only (b)

                        // path b: looks like a wallet.json with wallet_sha256 only. also used as fallback in path a
                        get_wallet_info = function (row) {
                            MoneyNetworkAPILib.get_wallet_info(row.wallet_sha256, function (wallet_info) {
                                var pgm = controller + '.load_wallets.step_1_search_wallet_sites get_wallet_info callback 3b: ';
                                if (!wallet_info || !wallet_info[row.wallet_sha256]) {
                                    console.log(pgm + 'ignore ' + inner_path + '. could not find any wallet info for wallet_sha256 ' + row.wallet_sha256) ;
                                    return check_wallet() ;
                                }
                                // OK. found valid wallet with full wallet info
                                add_wallet(row, wallet_info[row.wallet_sha256]) ;
                                check_wallet();
                            }) ;
                        } ; // get_wallet_info

                        if (row.wallet_address && row.wallet_title && row.wallet_description) {
                            // path a: looks like a wallet.json file with full info
                            // read wallet.json
                            inner_path = 'merged-' + MoneyNetworkAPILib.get_merged_type() + '/' + row.wallet_directory + '/wallet.json' ;
                            MoneyNetworkAPILib.z_file_get(pgm, {inner_path: inner_path}, function (wallet_str, extra) {
                                var pgm = controller + '.load_wallets.step_1_search_wallet_sites z_file_get callback 3a: ';
                                var wallet, wallet_sha256 ;
                                if (!wallet_str) {
                                    console.log(pgm + 'error: ' + inner_path + ' fileGet failed') ;
                                    return get_wallet_info() ;
                                }
                                // check wallet
                                try {
                                    wallet = JSON.parse(wallet_str) ;
                                }
                                catch (e) {
                                    console.log(pgm + 'error: ' + inner_path + ' is invalid. error = ' + e.message) ;
                                    return get_wallet_info() ;
                                }
                                wallet_sha256 = MoneyNetworkAPILib.calc_wallet_sha256(wallet) ;
                                if (!wallet_sha256 || (wallet.wallet_sha256 != wallet_sha256)) {
                                    console.log(pgm + 'ignore ' + inner_path + '. ' + wallet_sha256 + ' != ' + wallet.wallet_sha256) ;
                                    // ignore merged-MoneyNetwork/1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ/wallet.json. null != undefined
                                    return get_wallet_info() ;
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
                                var pgm = controller + '.load_wallets.step_1_search_wallet_sites get_wallet_info callback 3b: ';
                                if (!wallet_info || !wallet_info[row.wallet_sha256]) {
                                    console.log(pgm + 'ignore ' + inner_path + '. could not find any wallet info for wallet_sha256 ' + row.wallet_sha256 + ', row = ' + JSON.stringify(row)) ;
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

        var z_cache = moneyNetworkService.get_z_cache() ;

        // save wallets.json file. only rows with share_wallet = true. share checkbox checked
        function update_wallets_json () {
            var pgm = controller + '.update_wallets_json: ' ;

            // read old wallets.json. must keep shared info from other local users
            // wallets json is OK. write and publish file
            moneyNetworkService.get_my_user_hub(function(my_user_data_hub, other_user_hub, other_user_hub_title) {
                var pgm = controller + '.update_wallets_json get_my_user_hub callback 1: ';
                var user_path, inner_path1;
                user_path = "merged-" + MoneyNetworkAPILib.get_merged_type() + "/" + my_user_data_hub + "/data/users/" + ZeroFrame.site_info.auth_address;
                inner_path1 = user_path + "/wallets.json";

                // read old wallets.json file.
                MoneyNetworkAPILib.z_file_get(pgm, {inner_path: inner_path1}, function (old_wallets_str) {
                    var pgm = controller + '.update_wallets_json z_file_get callback 2: ';
                    var old_wallets, error, new_wallets, keep_addresses, i, row1, wallet_address, wallet, j, rate, row2,
                        identical, old_addresses, new_addresses, old_wallet, new_wallet, sort_fnc, now, json_raw ;
                    if (old_wallets_str) {
                        try {
                            old_wallets = JSON.parse(old_wallets_str);
                        }
                        catch (e) {
                            old_wallets = {msgtype: 'wallets', wallets: {}, share: []};
                        }
                    }
                    else {
                        old_wallets = {msgtype: 'wallets', wallets: {}, share: []};
                    }
                    // is old wallet valid?
                    error = MoneyNetworkAPILib.validate_json(pgm, old_wallets, null, 'api') ;
                    if (error) {
                        console.log(pgm + 'error. ignoring invalid old wallets.json file ' + inner_path1 + '. error = ' + error) ;
                        old_wallets = {msgtype: 'wallets', wallets: {}, share: []};
                    }
                    if (old_wallets.msgtype != 'wallets') {
                        console.log(pgm + 'error. ignoring old wallets.json file ' + inner_path1 + '. expected msgtype = wallets') ;
                        old_wallets = {msgtype: 'wallets', wallets: {}, share: []};
                    }

                    // copy share info from other local users
                    new_wallets = {msgtype: 'wallets', wallets: {}, share: []};
                    keep_addresses = {} ;
                    for (i=0 ; i < old_wallets.share.length ; i++) {
                        if (old_wallets.share[i].user_seq != z_cache.user_seq) {
                            keep_addresses[old_wallets.share[i].address] = true ;
                            new_wallets.share.push(old_wallets.share[i]) ;
                        }
                    }

                    // todo: save not shared rating and review in ls

                    for (i=0 ; i<self.wallets.length ; i++) {
                        row1 = self.wallets[i] ;
                        wallet_address = row1.wallet_address ;
                        // save wallet info in wallets hash
                        if (row1.share_wallet || keep_addresses[wallet_address]) {
                            wallet = JSON.parse(JSON.stringify(row1.wallet)) ;
                            delete wallet['$$hashKey'] ;
                            for (j=0 ; j<wallet.currencies.length ; j++) {
                                delete wallet.currencies[j]['$$hashKey'] ;
                            }
                            // add extra wallet info only in wallets.json file. MN users must be able to see modified timestamp for wallet.json file for shared information. last updated info is used
                            wallet.wallet_modified = row1.wallet_modified ;
                            wallet.wallet_directory = row1.wallet_directory ;
                            if (!wallet.wallet_modified || !wallet.wallet_directory) {
                                error = ['Cannot save wallets.json file', 'Required wallet_modified and/or wallet_directory information is missing for wallet', 'wallet_info = ' + JSON.stringify(row1)] ;
                                console.log(pgm + 'error: ' + error.join('. ')) ;
                                moneyNetworkService.z_wrapper_notification(['error', error.join('<br>')]) ;
                                return ;
                            }
                            new_wallets.wallets[wallet_address] = wallet ;
                        }
                        if (!row1.share_wallet) continue ;
                        // add share info to share array
                        rate = row1.rate_wallet ;
                        if (['1','2','3','4','5'].indexOf(rate) != -1) rate = parseInt(rate) ;
                        if (rate) {
                            row2 = { user_seq: z_cache.user_seq, address: wallet_address, rate: rate } ;
                            if (row1.wallet_review) row2.review = row1.wallet_review ;
                            new_wallets.share.push(row2) ;
                        }
                    }
                    now = new Date().getTime() ;
                    now = Math.floor(now/1000) ;
                    new_wallets.wallets_modified = now ;

                    // validate wallets.json before write.
                    // two validations: top level is validated with "wallets". wallets object hash is validated with "wallet"
                    error = MoneyNetworkAPILib.validate_json(pgm, new_wallets, null, 'api') ;
                    if (error) {
                        console.log(pgm + 'error. cannot save invalid wallets.json file. error = ' + error) ;
                        console.log(pgm + 'wallets = ' + JSON.stringify(wallets)) ;
                        return ;
                    }
                    for (wallet_address in new_wallets.wallets) {
                        wallet = new_wallets.wallets[wallet_address] ;
                        error = MoneyNetworkAPILib.validate_json(pgm, wallet, null, 'api') ;
                        if (error) {
                            console.log(pgm + 'error. cannot save invalid wallets.json file. wallet_address = ' + wallet_address + '. error = ' + error) ;
                            return ;
                        }
                    }

                    // todo: compare old and new wallets
                    identical = true ;
                    old_addresses = Object.keys(old_wallets.wallets).sort() ;
                    new_addresses = Object.keys(new_wallets.wallets).sort() ;
                    if (JSON.stringify(old_addresses) != JSON.stringify(new_addresses)) identical = false ;
                    if (identical) {
                        for (wallet_address in old_wallets.wallets) {
                            old_wallet = old_wallets.wallets[wallet_address] ;
                            new_wallet = new_wallets.wallets[wallet_address] ;
                            if (JSON.stringify(old_wallet) != JSON.stringify(new_wallet)) {
                                identical = false ;
                                break ;
                            }
                        }
                    }
                    if (identical) {
                        sort_fnc = function (a,b) {
                            var a_str, b_str ;
                            a_str = JSON.stringify(a) ;
                            b_str = JSON.stringify(b) ;
                            if (a_str == b_str) return 0 ;
                            if (a_str < b_str) return -1 ;
                            else return 1 ;

                        };
                        old_wallets.share.sort(sort_fnc) ;
                        new_wallets.share.sort(sort_fnc) ;
                        if (JSON.stringify(old_wallets.share) != JSON.stringify(new_wallets.share)) identical = false ;
                    }
                    if (identical) {
                        console.log(pgm + 'no change to wallets.json file') ;
                        return ;
                    }

                    json_raw = unescape(encodeURIComponent(JSON.stringify(new_wallets, null, "\t")));
                    MoneyNetworkAPILib.z_file_write(pgm, inner_path1, btoa(json_raw), {}, function (res) {
                        var pgm = controller + '. update_wallets_json z_file_write callback 3: ';
                        var inner_path2 ;
                        if (res != 'ok') {
                            console.log(pgm + 'error: ' + inner_path1 + ' fileWrite failed. error = ' + JSON.stringify(res)) ;
                            return ;
                        }

                        // heck for pending MN publish.
                        if (moneyNetworkService.is_publish_running()) {
                            console.log(pgm + 'wallets.json file was updated. Other publish operation is already running') ;
                            return ;
                        }

                        // publish
                        inner_path2 = user_path + '/content.json' ;
                        moneyNetworkService.zeronet_site_publish({inner_path: inner_path2}, function (res) {
                            var pgm = controller + '. update_wallets_json zeronet_site_publish callback 4: ';
                            if (res != 'ok') console.log(pgm + 'error. wallets.json publish failed. error = ' + JSON.stringify(res)) ;
                        }) ; // zeronet_site_publish callback 4

                    }) ; // z_file_write callback 3

                }); // z_file_get callback 2

            }) ; // get_my_user_seq callback 1

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

        // show/hide overview. number of rating and reviews for reach rate / number of hearts
        self.show_details1 = function (wallet) {
            var pgm = controller + '.show_details1: ' ;
            var details, i ;
            console.log(pgm + 'wallet = ' + CircularJSON.stringify(wallet)) ;
            //wallet = {
            //    "wallet_description": "Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro",
            //    "wallet_title": "MoneyNetworkW2",
            //    "wallet_directory": "1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
            //    "wallet_sha256": "23823ecbc270ac395f20b068efa992d758988b85d570294d81434a463df3210c",
            //    "wallet_modified": 1520005131,
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
            //            }],
            //            "$$hashKey": "object:18"
            //        }],
            //        "api_url": "https://www.blocktrail.com/api/docs",
            //        "hub": "17k1QzQRhpkJubxCxaCcD6ytqnp8cqUkXe",
            //        "hub_title": "W2 Wallet data hub 2",
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
            //                                "action": {"type": "string", "pattern": "^(Send|Request)$"},
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
            //    },
            //    "wallet_url": "/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
            //    "$$hashKey": "object:4",
            //    "ratings": {
            //        "details": [{
            //            "rate": 4,
            //            "ratings": [{
            //                "wallet_description": "Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro",
            //                "wallets_directory": "182Uot1yJ6mZEwQYE5LX1P5f6VPyJ9gUGe/data/users/16nDbDocFiEsuBn91SknhYFbA33DVdxMQ9",
            //                "wallet_title": "MoneyNetworkW2",
            //                "api_url": "https://www.blocktrail.com/api/docs",
            //                "wallet_directory": "1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ/data/users/16nDbDocFiEsuBn91SknhYFbA33DVdxMQ9",
            //                "wallets_modified": 1520160191,
            //                "review": "test",
            //                "wallet_domain": null,
            //                "wallet_sha256": "23823ecbc270ac395f20b068efa992d758988b85d570294d81434a463df3210c",
            //                "rate": 4,
            //                "address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
            //                "wallet_modified": 1520159403,
            //                "wallet_address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
            //                "$$hashKey": "object:41"
            //            }, {
            //                "wallet_description": "Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro",
            //                "wallets_directory": "1922ZMkwZdFjKbSAdFR1zA5YBHMsZC51uc/data/users/1NJwoHjm67QWvD47DchbeHt7JvyaZ95CWK",
            //                "wallet_title": "MoneyNetworkW2",
            //                "api_url": "https://www.blocktrail.com/api/docs",
            //                "wallet_directory": "182Uot1yJ6mZEwQYE5LX1P5f6VPyJ9gUGe/data/users/16nDbDocFiEsuBn91SknhYFbA33DVdxMQ9",
            //                "wallets_modified": 1520163544,
            //                "review": "test opera",
            //                "wallet_domain": null,
            //                "wallet_sha256": "23823ecbc270ac395f20b068efa992d758988b85d570294d81434a463df3210c",
            //                "rate": 4,
            //                "address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
            //                "wallet_modified": 1520159403,
            //                "wallet_address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
            //                "$$hashKey": "object:42"
            //            }],
            //            "no_reviews": 2,
            //            "show_hide": "show",
            //            "$$hashKey": "object:32"
            //        }, {
            //            "rate": 3,
            //            "ratings": [{
            //                "wallet_description": "Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro",
            //                "wallets_directory": "1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
            //                "wallet_title": "MoneyNetworkW2",
            //                "api_url": "https://www.blocktrail.com/api/docs",
            //                "wallet_directory": "1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
            //                "wallets_modified": 1520269830,
            //                "review": "test",
            //                "wallet_domain": null,
            //                "wallet_sha256": "23823ecbc270ac395f20b068efa992d758988b85d570294d81434a463df3210c",
            //                "rate": 3,
            //                "address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
            //                "wallet_modified": 1520005131,
            //                "wallet_address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
            //                "$$hashKey": "object:51"
            //            }],
            //            "no_reviews": 1,
            //            "show_hide": "show",
            //            "$$hashKey": "object:33"
            //        }], "no_ratings": 3, "no_reviews": 3, "avg_rating": 3.6666666666666665, "show_hide": "show"
            //    }
            //};
            wallet.ratings.show_hide = wallet.ratings.show_hide == 'show' ? 'hide' : 'show' ;
            details = wallet.ratings.details ;
            if (details && (wallet.ratings.show_hide == 'show')) {
                // collapse details level 2 (individual rating and reviews)
                for (i=0 ; i<details.length ; i++) details[i].show_hide = 'show' ;
            }
        }; // show_details1


        var ls_contacts = moneyNetworkService.get_contacts() ;

        // show/hide individual rating and reviews
        // todo: not logged in: can only show hub and auth_address for MN users
        // todo: logged in: missing user_seq in wallets.json to translate to a contact
        self.show_details2 = function (detail) {
            var pgm = controller + '.show_details2: ' ;
            var missing_contact_info, i, row, wallets_directory_a, hub, auth_address, user_seq, avatar_obj, avatar_a, avatar ;
            console.log(pgm + 'detail = ' + JSON.stringify(detail)) ;

            // just hide
            if (detail.show_hide == 'hide') {
                detail.show_hide = 'show' ;
                return ;
            }

            // check/add contact info
            missing_contact_info = [] ;
            for (i=0 ; i<detail.ratings.length ; i++) if (!detail.ratings[i].contact) missing_contact_info.push(detail.ratings[i]) ;
            if (!missing_contact_info.length) {
                // already OK
                detail.show_hide = 'hide' ;
                return ;
            }

            while (missing_contact_info.length) {
                row = missing_contact_info.shift() ;
                wallets_directory_a = row.wallets_directory.split('/') ;
                user_seq = row.user_seq ;
                hub = wallets_directory_a[0] ;
                auth_address = wallets_directory_a[3] ;

                if (self.is_logged_in() && (hub == z_cache.my_user_hub) && (auth_address == ZeroFrame.site_info.auth_address) && (user_seq == z_cache.user_seq)) {
                    // logged in user
                    avatar_obj = moneyNetworkService.get_avatar();
                    //avatar = {
                    //    "src": "merged-MoneyNetwork/1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ/avatar.jpg",
                    //    "loaded": true
                    //};
                    if (avatar_obj.src) {
                        avatar_a = avatar_obj.src.split('/') ;
                        if (['avatar.jpg','avatar.png'].indexOf(avatar_a[avatar_a.length-1]) != -1) {
                            // uploaded avatar. avatar = jpg/png
                            avatar = avatar_a[avatar_a.length-1].split('.')[1] ;
                        }
                        else {
                            // random assigned public avatar.
                            avatar = avatar_obj.src.substr(20) ;
                        }
                    }
                    else avatar = z_cache.user_setup.avatar ;
                    row.contact = {
                        hub: hub,
                        auth_address: auth_address,
                        cert_user_id: row.wallets_cert_user_id,
                        user_seq: user_seq,
                        alias: z_cache.user_setup.alias,
                        avatar: avatar,
                        pubkey: MoneyNetworkHelper.getItem('pubkey')
                    } ;
                    console.log(pgm + 'row.contact = ' + JSON.stringify(row.contact)) ;
                    continue ;
                }
                if (self.is_logged_in()) {
                    // get contact info from ls_contacts
                    for (i=0 ; i<ls_contacts.length ; i++) {
                        if ((ls_contacts[i].hub == hub) && (ls_contacts[i].auth_address == auth_address) && (ls_contacts[i].user_seq == user_seq)) {
                            row.contact = ls_contacts[i] ;
                            break ;
                        }
                    }
                }
                if (!row.contact) {
                    // not logged in - or contact not found in ls_contacts.
                    // todo: add better last online info. maybe only one user with this auth_address.
                    row.contact = {
                        hub: hub,
                        auth_address: auth_address,
                        cert_user_id: row.wallets_cert_user_id,
                        user_seq: user_seq,
                        search: [{ tag: 'Online', value: row.wallets_modified, privacy: 'Search', row: 1, debug_info: {}}],
                        avatar: row.avatar || 'z.png'
                    } ;
                }
            } // while

            // console.log(pgm + 'detail with contact info = ' + JSON.stringify(detail)) ;
            //info = {
            //    "rate": 4,
            //    "ratings": [{
            //        "wallets_directory": "1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
            //        "wallets_modified": 1520505250000,
            //        "wallets_cert_user_id": "jro@zeroid.bit",
            //        "user_seq": 1,
            //        "rate": 4,
            //        "review": "Very nice test bitcoin wallet with fine MN-wallet integration. Have tested many send/receive money transaction OK from MN chat. Not fast but is working. Also tested backup (export & import) from MN.",
            //        "wallet_directory": "1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
            //        "wallet_modified": 1520440207,
            //        "$$hashKey": "object:5892",
            //        "contact": {
            //            "hub": "1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh",
            //            "auth_address": "18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
            //            "cert_user_id": "jro@zeroid.bit",
            //            "user_seq": 1,
            //            "alias": "jro torando"
            //        }
            //    }, {
            //        "wallets_directory": "182Uot1yJ6mZEwQYE5LX1P5f6VPyJ9gUGe/data/users/16nDbDocFiEsuBn91SknhYFbA33DVdxMQ9",
            //        "wallets_modified": 1520505432000,
            //        "wallets_cert_user_id": "16nDbDocFiEsu@moneynetwork.bit",
            //        "user_seq": 1,
            //        "rate": 4,
            //        "wallet_directory": "1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ/data/users/16nDbDocFiEsuBn91SknhYFbA33DVdxMQ9",
            //        "wallet_modified": 1520324127,
            //        "$$hashKey": "object:5893",
            //        "contact": {
            //            "unique_id": "a18c172d49b60cdad7b006ab6cc1d56175c41ddf1b0785b7a5077764e718b876",
            //            "type": "new",
            //            "guest": null,
            //            "auth_address": "16nDbDocFiEsuBn91SknhYFbA33DVdxMQ9",
            //            "cert_user_id": "16nDbDocFiEsu@moneynetwork.bit",
            //            "avatar": "6.png",
            //            "search": [{
            //                "tag": "Online",
            //                "value": 1520508709,
            //                "privacy": "Search",
            //                "row": 1,
            //                "debug_info": {},
            //                "unique_id": "a18c172d49b60cdad7b006ab6cc1d56175c41ddf1b0785b7a5077764e718b876",
            //                "$$hashKey": "object:1333"
            //            }, {
            //                "tag": "%",
            //                "value": "%",
            //                "privacy": "Search",
            //                "row": 2,
            //                "$$hashKey": "object:1334"
            //            }, {
            //                "tag": "Name",
            //                "value": "jro test arch linux",
            //                "privacy": "Search",
            //                "row": 3,
            //                "$$hashKey": "object:1335"
            //            }],
            //        }
            //    }],
            //    "no_reviews": 1,
            //    "show_hide": "hide",
            //    "$$hashKey": "object:5861"
            //};

            // not logged in: detail with contact info = {
            //    "rate": 4,
            //    "ratings": [{
            //        "wallets_directory": "1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
            //        "wallets_modified": 1520422697,
            //        "wallets_cert_user_id": "jro@zeroid.bit",
            //        "user_seq": 1,
            //        "rate": 4,
            //        "review": "test2",
            //        "wallet_directory": "1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
            //        "wallet_modified": 1520005131,
            //        "$$hashKey": "object:5975",
            //        "contact": {
            //            "hub": "1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh",
            //            "auth_address": "18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
            //            "cert_user_id": "jro@zeroid.bit",
            //            "user_seq": 1
            //        }
            //    }],
            //    "no_reviews": 1,
            //    "show_hide": "hide",
            //    "$$hashKey": "object:5969"
            //};

            // logged in user: detail with contact info = {
            //    "rate": 4,
            //    "ratings": [{
            //        "wallets_directory": "1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
            //        "wallets_modified": 1520422697,
            //        "wallets_cert_user_id": "jro@zeroid.bit",
            //        "user_seq": 1,
            //        "rate": 4,
            //        "review": "test2",
            //        "wallet_directory": "1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
            //        "wallet_modified": 1520005131,
            //        "$$hashKey": "object:5980",
            //        "contact": {
            //            "hub": "1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh",
            //            "auth_address": "18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
            //            "cert_user_id": "jro@zeroid.bit",
            //            "user_seq": 1,
            //            "alias": "jro torando"
            //        }
            //    }],
            //    "no_reviews": 1,
            //    "show_hide": "hide",
            //    "$$hashKey": "object:5959"
            //};

            // update angularJS
            detail.show_hide = 'hide' ;

        }; // show_details2

        // end MoneyCtrl
    }])

;