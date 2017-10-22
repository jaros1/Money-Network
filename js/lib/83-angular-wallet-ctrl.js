angular.module('MoneyNetwork')

    .controller('WalletCtrl', ['$rootScope', '$window', '$location', '$timeout', 'MoneyNetworkService', 'MoneyNetworkHubService', 'MoneyNetworkWService',
                     function ($rootScope, $window, $location, $timeout, moneyNetworkService, moneyNetworkHubService, moneyNetworkWService)
    {
        var self = this;
        var controller = 'WalletCtrl';
        if (!MoneyNetworkHelper.getItem('userid')) {
            // not logged in - skip initialization of controller
            return;
        }
        console.log(controller + ' loaded');

        var BITCOIN_ADDRESS_PATTERN = '1[a-km-zA-HJ-NP-Z1-9]{25,34}' ;

        // cache some important informations from zeronet files
        // - user_seq: from users array in data.json file. using "pubkey" as index to users array
        // - user_seqs: from users array in data.json file.
        // - files_optional: from content.json file. loaded at startup and updated after every sign and publish
        var z_cache = moneyNetworkHubService.get_z_cache() ;

        // create new sessionid for MoneyNetwork and MoneyNetwork wallet communication
        // sessionid: a "secret" sessionid URL parameter used when opening MoneyNetwork wallet site (only a secret when running ZeroNet local)
        // no event file done for "internal" cross site communication. dbQuery fetching will be used to detect new messages
        // using optional files and siteSign. sitePublish is not needed for "internal" cross site communication
        // message filenames:
        // - my messages: sha256.first(10).timestamp
        // - wallet messages: sha256.last(10).timestamp
        var encrypt2 ;
        function new_sessionid (url) {
            var pgm = controller + '.new_sessionid: ' ;
            test_sessionid = MoneyNetworkHelper.generate_random_password(60, true).toLowerCase(); // to lower - used in url
            // monitor incoming messages from this new wallet session
            encrypt2 = new MoneyNetworkAPI({
                sessionid: test_sessionid,
                prvkey: MoneyNetworkHelper.getItem('prvkey'), // for JSEncrypt (decrypt incoming message)
                userid2: MoneyNetworkHelper.getUserId(), // for cryptMessage (decrypt incoming message)
                debug: z_cache.user_setup.debug && z_cache.user_setup.debug.money_network_api,
                extra: { url: url}
            }) ;
        } // new_sessionid

        var SESSION_INFO_KEY = moneyNetworkWService.get_session_info_key() ;

        // get sessions from ls
        var ls_sessions = moneyNetworkWService.ls_get_sessions() ;

        self.new_wallet_url = $location.search()['new_wallet_site'] ; // redirect from a MoneyNetwork wallet site?
        var tested_wallet_url = null ; // last tested url
        var test_sessionid ;
        var test_session_at = null ;
        // new_sessionid () ;

        function get_relative_url (url) {
            var pgm = controller + '.get_relative_url: ' ;
            var pos ;
            pos = url.indexOf('://') ;
            if (pos != -1) {
                // remove protocol (http, https etc)
                url = url.substr(pos+3) ;
                pos = url.indexOf('/') ;
                // remove domain from url (127.0.0.1 or proxy server)
                if (pos == -1) return null ; // cannot be a ZeroNet site URL
                url = url.substr(pos) ;
                return url ;
            }
            if (url.substr(0,1) == '/') return url ; // already a relative url ...
            if (url.match(new RegExp('^' + BITCOIN_ADDRESS_PATTERN + '$'))) return '/' + url ; // bitcoin address
            if (url.match(new RegExp('^' + BITCOIN_ADDRESS_PATTERN + '\/'))) return '/' + url ; // bitcoin address
            if (url.match(/\.bit$/)) return '/' + url ; // .bit domain
            if (url.match(/\.bit\//)) return '/' + url ; // .bit domain
            return null ;
        } // get_relative_url

        // https://stackoverflow.com/a/10997390/11236
        // https://stackoverflow.com/questions/1090948/change-url-parameters
        function updateURLParameter(url, param, paramVal){
            var newAdditionalURL = "";
            var tempArray = url.split("?");
            var baseURL = tempArray[0];
            var additionalURL = tempArray[1];
            var temp = "";
            if (additionalURL) {
                tempArray = additionalURL.split("&");
                for (var i=0; i<tempArray.length; i++){
                    if(tempArray[i].split('=')[0] != param){
                        newAdditionalURL += temp + tempArray[i];
                        temp = "&";
                    }
                }
            }
            var rows_txt = temp + "" + param + "=" + paramVal;
            return baseURL + "?" + newAdditionalURL + rows_txt;
        }

        self.show_test_new_wallet = function(context) {
            var pgm = controller + '.show_test_new_wallet: ' ;
            var show, relative_url ;
            if (!self.new_wallet_url) return false ;
            relative_url = get_relative_url(self.new_wallet_url) ;
            show = relative_url ? true : false ;
            //console.log(pgm + 'context = ' + context + ', show = ' + show + ', relative_url = ' + relative_url) ;
            return show ;
        };
        self.test_new_wallet = function() {
            var pgm = controller + '.test_new_wallet: ' ;
            if (!self.new_wallet_url) {
                ZeroFrame.cmd("wrapperNotification", ['error', 'Please enter new wallet URL', 5000]);
                return ;
            }
            tested_wallet_url = self.new_wallet_url ;
            run_tests() ;
        };
        self.reset_test = function () {
            var i ;
            // stop any running tests
            for (i=0 ; i<self.tests.length ; i++) {
                if (self.tests[i].info.text == 'Running') {
                    self.tests[i].info.test_failed = true ;
                    self.test_feedback(self.tests[i], 'failed') ;
                }
            }
            // test stopped
            self.test_running = false ;
            // reset test array
            init_tests() ;
            for (i=0 ; i<self.tests.length ; i++) {
                self.tests[i].info.status = 'Pending' ;
                delete self.tests[i].info.test_skipped ;
                delete self.tests[i].info.test_ok ;
                delete self.tests[i].info.test_failed ;
                delete self.tests[i].info.disabled ;
            }
            // new sessionid
            // new_sessionid() ;
        };

        var test1_ping_session = (function () {
            var pgm = controller + '.test1: ' ;
            var info = {
                no: 1,
                text: 'Ping existing wallet session',
                status: 'Pending'
            };
            function run() {
                var pgm = controller + '.test1.run: ' ;
                var url, request, old_sessions, sessionid, session_info, test_old_session ;
                if (['Test skipped', 'Test OK'].indexOf(info.status) != -1) {
                    // continue with next test
                    console.log(pgm + 'Skipping test ' + info.no + '. test' + info.no + ' status = ' + info.status + '. start test ' + (info.no + 1)) ;
                    info.disabled = true;
                    test2_open_url.run();
                }
                else {
                    // start test 1. send ping to old wallet session(s)
                    info.status = 'Running' ;
                    url = get_relative_url(self.new_wallet_url) ;
                    console.log(pgm + 'url = ' + url) ;

                    // find old sessions
                    old_sessions = [] ;
                    for (sessionid in ls_sessions) {
                        session_info = ls_sessions[sessionid][SESSION_INFO_KEY] ;
                        if (!session_info) continue ;
                        if (!session_info.last_request_at) continue ;
                        if (session_info.url != url) continue ;
                        console.log(pgm + 'sessionid = ' + sessionid + ', ls_sessions[sessionid] = ' + JSON.stringify(ls_sessions[sessionid])) ;
                        old_sessions.push({sessionid: sessionid, last_request_at: session_info.last_request_at}) ;
                    } // for
                    if (!old_sessions.length) {
                        // no old sessions were found. continue with test 2-6
                        info.status = 'Test skipped' ;
                        console.log(pgm + 'test ' + info.no + ' done. start test ' + (info.no + 1));
                        info.disabled = true;
                        test2_open_url.run();
                        return ;
                    }
                    // sort by descending last_request_at. Start with newest session
                    old_sessions.sort(function (a,b) {
                        return (b.last_request_at - a.last_request_at) ;
                    }) ;
                    // console.log(pgm + 'old_sessions = ' + JSON.stringify(old_sessions)) ;

                    // loop. test old sessions. timeout = 5 seconds
                    test_old_session = function () {
                        var pgm = controller + '.test1.run.test_old_session: ' ;
                        var old_session, sessionid ;
                        if (!old_sessions.length) {
                            // no response from old sessions
                            info.status = 'Test failed' ;
                            info.disabled = true;
                            console.log(pgm + 'test 1 failed. Ask user to continue test. Popup window in test 2');
                            // issue https://github.com/HelloZeroNet/ZeroNet/issues/1089
                            // chrome only. cannot run window.open call long time after test start. ask user to restart test
                            test2_open_url.run();
                            //ZeroFrame.cmd("wrapperConfirm", ['Ok', 'Test 1 failed<br>Press OK to continue test'], function (confirm) {
                            //    if (confirm) test2_open_url.run();
                            //});
                            return ;
                        }
                        old_session = old_sessions.shift() ;
                        sessionid = old_session.sessionid ;
                        MoneyNetworkAPILib.get_session(sessionid, function(session) {
                            var pgm = controller + '.test1.run.test_old_session get_session callback 1: ' ;
                            var request ;
                            console.log(pgm + 'sessionid = ', sessionid, ', session = ', session) ;
                            if (!session) {
                                console.log(pgm + 'Could not find session for old sessionid ' + sessionid) ;
                                return test_old_session() ;
                            }

                            // send ping. timeout max 5 seconds. Expects Timeout ... or OK response
                            request = { msgtype: 'ping' };
                            console.log(pgm + 'sending ping to wallet session with sessionid ' + sessionid) ;
                            session.encrypt.send_message(request, {response: 5000}, function (response) {
                                var pgm = controller + '.test1.run.test_old_session send_message callback 2: ' ;
                                if (response && response.error && response.error.match(/^Timeout /)) {
                                    // OK. Timeout. Continue with next session
                                    console.log(pgm + 'ping sessionid ' + sessionid + ' timeout') ;
                                    return test_old_session() ;
                                }
                                if (!response || response.error) {
                                    // Unexpected error.
                                    console.log(pgm + 'ping sessionid ' + sessionid + ' returned ' + JSON.stringify(response)) ;
                                    info.status = 'Test failed' ;
                                    info.disabled = true;
                                    return test2_open_url.run();
                                }
                                // ping OK. Save session
                                test_sessionid = session.encrypt.sessionid ;
                                encrypt2 = session.encrypt ;
                                // Skip test 2-6
                                info.status = 'Test OK' ;
                                info.disabled = true;
                                test2_open_url.info.status = 'Test skipped' ;
                                test3_allow_popup.info.status = test2_open_url.info.status ;
                                test4_select_zeroid.info.status = test2_open_url.info.status ;
                                test5_merger_moneynetwork.info.status = test2_open_url.info.status ;
                                test6_check_session.info.status = test2_open_url.info.status ;
                                test2_open_url.run();
                            }) ; // send_message callback 2
                        }) ; // get_session callback 1

                    }; // test_old_session
                    // start loop
                    test_old_session() ;

                } // if else
            } // run
            return {
                info: info,
                run: run
            };
        })(); // test1

        var test2_open_url = (function () {
            var pgm = controller + '.test2: ' ;
            var info = {
                no: 2,
                text: 'Create new wallet session',
                status: 'Pending'
            };
            function run() {
                var pgm = controller + '.test2.run: ' ;
                var url, request ;
                if (['Test skipped', 'Test OK'].indexOf(info.status) != -1) {
                    // continue with next test
                    console.log(pgm + 'Skipping test ' + info.no + '. test' + info.no + ' status = ' + info.status + '. start test ' + (info.no + 1)) ;
                    info.disabled = true;
                    test3_allow_popup.run();
                }
                else {
                    // start test 1. add sessionid to URL and open new window with wallet session
                    // sessionid: "secret" sessionid random 60 character password
                    // SHA256(sessionid).first(10).<timestamp>: MoneyNetwork session filename (optional file). this session
                    // SHA256(sessionid).last(10).<timestamp>: MoneyNetwork wallet session filename (optional file). other session
                    info.status = 'Running' ;
                    url = get_relative_url(self.new_wallet_url) ;
                    new_sessionid(url) ;
                    url = updateURLParameter(url, 'sessionid', test_sessionid) ;
                    moneyNetworkWService.open_window(pgm, url);
                    // send unencrypted pubkeys message to wallet session. Do not wait for any response.
                    // encrypted pubkeys response will be processed by process_incoming_message callback function
                    request = {
                        msgtype: 'pubkeys',
                        pubkey: MoneyNetworkHelper.getItem('pubkey'), // for JSEncrypt
                        pubkey2: MoneyNetworkHelper.getItem('pubkey2') // for cryptMessage
                    } ;
                    test_session_at = new Date().getTime() ;
                    encrypt2.send_message(request, {encryptions:[]}, function (response) {
                        var pgm = controller + '.test2.run send_message callback 2: ' ;
                        console.log(pgm + 'response = ' + JSON.stringify(response)) ;
                    }) ;

                } // if else
            } // run
            return {
                info: info,
                run: run
            };
        })(); // test2

        var test3_allow_popup = (function () {
            var pgm = controller + '.test3: ' ;
            var info = {
                no: 3,
                text: 'Popup allowed in browser',
                status: 'Pending'
            };
            function run () {
                if (['Test skipped', 'Test OK'].indexOf(info.status) != -1) {
                    // continue with next test
                    console.log(pgm + 'Skipping test ' + info.no + '. test' + info.no + ' status = ' + info.status + '. start test ' + (info.no + 1)) ;
                    info.disabled = true ;
                    test4_select_zeroid.run() ;
                }
                else {
                    // start test 3
                    info.status = 'Running' ;
                    ZeroFrame.cmd("wrapperConfirm", [info.text + '?'], function (ok) {
                        if (!ok) return ;
                        info.test_ok = true ;
                        self.test_feedback(test3_allow_popup, 'OK') ;
                        $rootScope.$apply() ;
                    }) ;
                }
            }
            return {
                info: info,
                run: run
            };
        })(); // test3

        var test4_select_zeroid = (function () {
            var pgm = controller + '.test4: ' ;
            var info = {
                no: 4,
                text: 'ZeroID selected in wallet',
                status: 'Pending'
            };
            function run () {
                if (['Test skipped', 'Test OK'].indexOf(info.status) != -1) {
                    // continue with next test
                    console.log(pgm + 'Skipping test ' + info.no + '. test' + info.no + ' status = ' + info.status + '. start test ' + (info.no + 1)) ;
                    info.disabled = true ;
                    test5_merger_moneynetwork.run() ;
                }
                else {
                    // start test 3
                    info.status = 'Running' ;
                    ZeroFrame.cmd('wrapperNotification', ['info', 'Please check that "ZeroId" is selected in wallet and click Test OK', 5000]);
                }
            }
            return {
                info: info,
                run: run
            };
        })(); // test4

        var test5_merger_moneynetwork = (function () {
            var pgm = controller + '.test5: ' ;
            var info = {
                no: 5,
                text: 'Merger:MoneyNetwork permission granted in wallet',
                status: 'Pending'
            };
            function run () {
                if (['Test skipped', 'Test OK'].indexOf(info.status) != -1) {
                    // continue with next test
                    console.log(pgm + 'Skipping test ' + info.no + '. test' + info.no + ' status = ' + info.status + '. start test ' + (info.no + 1)) ;
                    info.disabled = true ;
                    test6_check_session.run() ;
                }
                else {
                    // start test 5
                    info.status = 'Running' ;
                    ZeroFrame.cmd('wrapperNotification', ['info', 'Please check that "Merger:MoneyNetwork permission" is granted in wallet and click Test OK', 5000]);
                }
            }
            return {
                info: info,
                run: run
            };
        })(); // test5

        var test6_check_session = (function () {
            var pgm = controller + '.test6: ' ;
            var info = {
                no: 6,
                text: 'Checking session',
                status: 'Pending'
            };
            function run () {
                var pgm = controller + '.test6.run: ' ;
                if (['Test skipped', 'Test OK'].indexOf(info.status) != -1) {
                    // next test
                    console.log(pgm + 'Skipping test ' + info.no + '. test' + info.no + ' status = ' + info.status + '. start test ' + (info.no + 1)) ;
                    info.disabled = true ;
                    test7_check_wallet.run() ;
                }
                else {
                    // start test 6. wait for wallet feedback
                    // - new wallet session : wait for pubkeys message using test_sessionid
                    // - old wallet session : wait for ping request using old sessionid
                    info.status = 'Running' ;

                    // wait for session to start. expects a pubkeys message from MoneyNetwork wallet session
                    // incoming messages are received by MoneyNetworkAPI.demon process in process_incoming_message callback
                    // wait for pubkeys information to be inserted into sessions hash. wait max 1 minute
                    var check_session = function(cb, count) {
                        var pgm = controller + '.test6.check_session: ' ;
                        var url, old_sessionid, old_session_info, job, old_sessionids, wait, get_old_session ;
                        if (!count) count = 0;
                        if (count > 60) return cb({ error: "timeout. pubkeys message or ping was not received from wallet session" }) ;
                        // checking for new wallet session (incoming pubkeys message)
                        if (ls_sessions[test_sessionid] && ls_sessions[test_sessionid][SESSION_INFO_KEY]) {
                            // received pubkeys message from new wallet session
                            cb(ls_sessions[test_sessionid][SESSION_INFO_KEY]) ;
                            return ;
                        }
                        wait = function() {
                            // wait one second. pubkeys message or ping not yet received
                            job = function () { check_session(cb, count+1) };
                            $timeout(job, 1000) ;
                        }; // wait
                        // checking for old wallet session (incoming ping request)
                        if (test_session_at) {
                            // test_session_at = timestamp for wrapperWindowOpen. start for new wallet session
                            // check for incoming requests from wallet session (for example ping) after wrapperOpenWindow cmd
                            url = get_relative_url(self.new_wallet_url) ;
                            old_sessionids = [] ;
                            for (old_sessionid in ls_sessions) {
                                old_session_info = ls_sessions[old_sessionid][SESSION_INFO_KEY] ;
                                if (!old_session_info) continue ;
                                if (old_session_info.url != url) continue ;
                                if (!old_session_info.last_request_at) continue ;
                                if (old_session_info.last_request_at < test_session_at) continue ;
                                old_sessionids.push(old_sessionid) ;
                                // received an incoming request from wallet session after wrapperWindowOpen in test2
                                console.log(pgm + 'found old_sessionid = ' + old_sessionid + ', ls_sessions[old_sessionid] = ' + JSON.stringify(ls_sessions[old_sessionid])) ;
                            } // for
                            if (old_sessionids.length) {
                                // found new incoming requests from old wallet session(s)
                                if (old_sessionids.length != 1) console.log(pgm + 'warning. found ' + old_sessionids.length + ' new incoming requests for more that one wallet session with url ' + url + '. old_sessionids = ' + JSON.stringify(old_sessionids)) ;
                                // get session info. MoneyNetworkAPI instance. loop. there could be more that one active wallet session
                                get_old_session = function() {
                                    var pgm = controller + '.test6.get_old_session: ' ;
                                    var old_sessionid ;
                                    if (!old_sessionids.length) return wait() ; // get_session call failed for all old sessions in old_sessionids array
                                    old_sessionid = old_sessionids.shift() ;
                                    MoneyNetworkAPILib.get_session(old_sessionid, function(old_session) {
                                        if (!old_session) return get_old_session() ;
                                        // test ok. found valid session info for old sessionid
                                        encrypt2 = old_session.encrypt ;
                                        test_sessionid = old_sessionid ;
                                        cb({
                                            session_at: ls_sessions[old_sessionid][SESSION_INFO_KEY].last_request_at,
                                            pubkey2: encrypt2.other_session_pubkey2
                                        }) ;
                                    }) ;
                                }; // get_old_session
                                // start get_session call/loop
                                get_old_session() ;
                            } // if
                        }
                        // wait. pubkeys message or ping not yet received
                        wait() ;
                    }; // check_session

                    // start session check. should wait for max 60 seconds for session handshake (pubkeys or ping message)
                    check_session(function (res) {
                        var elapsed ;
                        if (res.error) {
                            console.log(pgm + 'wallet session was not found. error = ' + res.error) ;
                            info.status = 'Test failed' ;
                            info.disabled = true ;
                        }
                        else {
                            elapsed = res.session_at - test_session_at ;
                            console.log(pgm + 'wallet session was found. pubkey2 = ' + res.pubkey2 + ', waited ' + Math.round(elapsed / 1000) + ' seconds') ;
                            info.status = 'Test OK' ;
                            info.disabled = true ;
                            test7_check_wallet.run() ;
                        }
                        console.log(pgm + 'check_session. res = ' + JSON.stringify(res)) ;

                        //res = {
                        //    "msgtype": "pubkeys",
                        //    "pubkey": "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCIsVzGN462DlwPYxJ+ZvLKWxIL\ndEYLhjMOrwRA91yd/9toIlBMjGy4wEvYgSn2bZKcymiCOHBl63Zx8o7XDBrM+v4e\nl6iHVeGPyui+vYneCY+4dez+DJeZFyAGvYuELXaEJCCmeXItQdpZgZZC9Kx7QmrB\nXA2/72e63uKPI47gfQIDAQAB\n-----END PUBLIC KEY-----",
                        //    "pubkey2": "Ahn94vCUvT+S/nefej83M02n/hP8Jvqc8KbxMtdSsT8R"
                        //};
                        //$rootScope.$apply();
                    }) ; // check_session callback
                } // end if else
            } // run
            return {
                info: info,
                run: run
            };
        })(); // test6

        // read wallet.json file
        var test7_check_wallet = (function () {
            var pgm = controller + '.test7: ' ;
            var info = {
                no: 7,
                text: 'Check wallet.json',
                status: 'Pending'
            };
            function run () {
                var pgm = controller + '.test7.run: ' ;
                var inner_path, debug_seq0, test_done, test_wallet_address, url, test_ok  ;
                // test finished (OK or error)
                test_done = function (status) {
                    if (status) info.status = status ;
                    info.disabled = true ;
                    // next test
                    test8_get_balance.run() ;
                } ;
                test_ok = function (wallet) {
                    var session_info, codes, i, code ;
                    // check currencies. must be unique
                    codes = [] ;
                    for (i=0 ; i<wallet.currencies.length ; i++) {
                        code = wallet.currencies[i].code ;
                        if (codes.indexOf(code) != -1) {
                            console.log(pgm + 'Test failed. code ' + code + ' is not unique in wallet.json. wallet = ' + JSON.stringify(wallet)) ;
                            //wallet = {
                            //    "msgtype": "wallet",
                            //    "wallet_address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                            //    "wallet_title": "MoneyNetworkW2",
                            //    "wallet_description": "Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro",
                            //    "currencies": [{
                            //        "code": "tBTC",
                            //        "name": "Test Bitcoin",
                            //        "url": "https://en.bitcoin.it/wiki/Testnet",
                            //        "units": [{"unit": "BitCoin", "factor": 1}, {"unit": "Satoshi", "factor": 1e-8}]
                            //    }],
                            //    "hub": "1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ",
                            //    "wallet_sha256": "6ef0247021e81ae7ae1867a685f0e84cdb8a61838dc25656c4ee94e4f20acb74"
                            //};
                            return test_done('Test failed') ;
                        }
                        codes.push(code) ;
                    }

                    // save list of supported currencies
                    session_info = ls_sessions[encrypt2.sessionid][SESSION_INFO_KEY] ;
                    session_info.currencies = wallet.currencies ; // todo: skip? save only wallet_sha256 in session_info? currencies can always be loaded later
                    session_info.wallet_sha256 = wallet.wallet_sha256 ; // link to full wallet information (address, title, description etc)
                    moneyNetworkWService.ls_save_sessions() ;

                    return test_done('Test OK') ;
                } ;
                // test url and wallet infomation must match (address or domain)
                url = get_relative_url(self.new_wallet_url) ;
                test_wallet_address = function (wallet) {
                    var pgm = controller + '.test7.run.test_wallet_address: ' ;
                    // url = /1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1, wallet_address = 1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1
                    if ([wallet.wallet_address, wallet.wallet_domain].indexOf(url.substr(1)) != -1) return true ;
                    console.log(pgm + 'error. no match between test url ' + url + ' and wallet ' + JSON.stringify(wallet)) ;
                    return false ;
                } ;
                if (['Test skipped', 'Test OK'].indexOf(info.status) != -1) {
                    console.log(pgm + 'Skipping test ' + info.no + '. test' + info.no + ' status = ' + info.status + '. start test ' + (info.no + 1)) ;
                    return test_done() ;
                }
                else {
                    // start test 7. read wallet.json
                    info.status = 'Running' ;

                    inner_path = encrypt2.other_user_path + 'wallet.json' ;
                    moneyNetworkHubService.z_file_get(pgm, {inner_path: inner_path, required: false}, function (wallet_str) {
                        var pgm = controller + '.test7.run z_file_get callback 1: ' ;
                        var wallet, error, calc_wallet_sha256, query, debug_seq1, session_info ;
                        if (!wallet_str) {
                            console.log(pgm + 'wallet.json was not found. inner_path = ' + inner_path) ;
                            return test_done('Test failed') ;
                        }
                        wallet = JSON.parse(wallet_str) ;
                        console.log(pgm + 'wallet = ' + JSON.stringify(wallet)) ;
                        // validate wallet.json after read
                        error = MoneyNetworkAPILib.validate_json(pgm, wallet) ;
                        if (error) {
                            console.log(pgm + 'wallet.json was found but is invalid. error = ' + error + ', wallet = ' + JSON.stringify(wallet));
                            return test_done('Test failed') ;
                        }
                        // partial (wallet_sha256 only) or full wallet information.
                        if (wallet.wallet_address && wallet.wallet_title && wallet.wallet_description) {
                            // full wallet info. test wallet_sha256 signature
                            calc_wallet_sha256 = MoneyNetworkAPILib.calc_wallet_sha256(wallet);
                            if (!calc_wallet_sha256 || (wallet.wallet_sha256 != calc_wallet_sha256)) {
                                console.log(pgm + 'wallet.json was found but is invalid. expected calc_wallet_sha256 = ' + calc_wallet_sha256 + '. found wallet.wallet_sha256 = ' + wallet.wallet_sha256 + ', wallet = ' + JSON.stringify(wallet));
                                return test_done('Test failed') ;
                            }
                            if (!test_wallet_address(wallet)) return test_done('Test failed') ;
                            // test OK. save
                            return test_ok(wallet) ;
                        }

                        // wallet_sha256 signature only. find and read an other wallet.json file with full wallet information
                        MoneyNetworkAPILib.get_wallet_info(wallet.wallet_sha256, function (wallet_info) {
                            var pgm = controller + '.test7.run get_wallet_info callback 2: ' ;
                            var wallet2 ;
                            if (!wallet_info || wallet_info.error || (typeof wallet_info != 'object')) {
                                console.log(pgm + 'cannot find wallet info for wallet_sha256 ' + wallet.wallet_sha256 + '. wallet_info = ' + JSON.stringify(wallet_info)) ;
                                return test_done('Test failed') ;
                            }
                            wallet2 = wallet_info[wallet.wallet_sha256] ;
                            if (!wallet2) {
                                console.log(pgm + 'cannot find wallet info for wallet_sha256 ' + wallet.wallet_sha256) ;
                                return test_done('Test failed') ;
                            }
                            console.log(pgm + 'wallet2 = ' + JSON.stringify(wallet2));
                            // test OK. save
                            return test_ok(wallet2) ;
                        }) ; // get_wallet_info callback 1

                    }) ; // z_file_get callback 1

                } // end if else
            } // run
            return {
                info: info,
                run: run
            };
        })(); // test7

        // get wallet balance
        var test8_get_balance = (function () {
            var pgm = controller + '.test8: ' ;
            var info = {
                no: 8,
                text: 'Get wallet balance',
                status: 'Pending'
            };
            function run () {
                var pgm = controller + '.test8.run: ' ;
                var inner_path, debug_seq0, test_done, test_wallet_address, request ;
                // test finished (OK or error)
                test_done = function (status) {
                    if (status) info.status = status ;
                    info.disabled = true ;
                    self.test_running = false ;
                    // finish. update UI just to be sure everything is OK
                    $rootScope.$apply();
                } ;
                if (['Test skipped', 'Test OK'].indexOf(info.status) != -1) {
                    console.log(pgm + 'Skipping test ' + info.no + '. test' + info.no + ' status = ' + info.status) ;
                    return test_done() ;
                }
                else {
                    // start test 8. send get_balance request. expects a balance response. long timeout. wallet operations may take some time
                    info.status = 'Running' ;

                    request = {
                        msgtype: 'get_balance',
                        open_wallet: true,
                        close_wallet: true
                    } ;
                    // timeout 60 seconds. communication with external money APIs can take some time
                    encrypt2.send_message(request, {response: 60000}, function (response) {
                        var pgm = controller + '.test8.run send_message callback 1: ' ;
                        var session_info, i, code, found, j ;
                        console.log(pgm + 'response = ' + JSON.stringify(response)) ;
                        if (!response || response.error) {
                            console.log(pgm + 'test8 failed. get_balance response was ' + JSON.stringify(response)) ;
                            return test_done('Test failed') ;
                        }

                        console.log(pgm + 'validate currency codes in get_balance response') ;
                        session_info = ls_sessions[encrypt2.sessionid][SESSION_INFO_KEY] ;
                        //session_info = {
                        //    "url": "/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                        //    "password": "U2FsdGVkX18MyosYqdGVowB1nw/7Nm2nbzATu3TexEXMig7rjInIIr13a/w4G5TzFLFz9GE+rqGZsqRP+Ms0Ez3w8cA9xNhPjtrhOaOkT1M=",
                        //    "pubkey": "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCuM/Sevlo2UYUkTVteBnnUWpsd\n5JjAUnYhP0M2o36da15z192iNOmd26C+UMg0U8hitK8pOJOLiWi8x6TjvnaipDjc\nIi0p0l3vGBEOvIyNEYE7AdfGqW8eEDzzl9Cezi1ARKn7gq1o8Uk4U2fjkm811GTM\n/1N9IwACfz3lGdAm4QIDAQAB\n-----END PUBLIC KEY-----",
                        //    "pubkey2": "Ahn94vCUvT+S/nefej83M02n/hP8Jvqc8KbxMtdSsT8R",
                        //    "last_request_at": 1504101920976,
                        //    "done": {"1503315223138": 1503315232562, "1503916247431": 1503916247859},
                        //    "balance": [{"code": "tBTC", "amount": 1.3}],
                        //    "currencies": [{
                        //        "code": "tBTC",
                        //        "name": "Test Bitcoin",
                        //        "url": "https://en.bitcoin.it/wiki/Testnet",
                        //        "units": [{"unit": "BitCoin", "factor": 1}, {"unit": "Satoshi", "factor": 1e-8}]
                        //    }],
                        //    "balance_at": 1504103285798,
                        //    "wallet_sha256": "6ef0247021e81ae7ae1867a685f0e84cdb8a61838dc25656c4ee94e4f20acb74"
                        //};
                        if (!session_info.currencies) {
                            console.log(pgm + 'test8 failed. no currencies list found. cannot validates codes in get_balance response ' + JSON.stringify(response)) ;
                            return test_done('Test failed') ;
                        }
                        for (i=0 ; i<response.balance.length ; i++) {
                            code = response.balance[i].code ;
                            found = false ;
                            for (j=0 ; j<session_info.currencies.length ; j++) {
                                if (session_info.currencies[j].code != code) continue ;
                                found = true ;
                                break ;
                            }
                            if (!found) {
                                console.log(pgm + 'test8 failed. unknown currency code ' + code + ' in get_balance response ' + JSON.stringify(response)) ;
                                return test_done('Test failed') ;
                            }
                        }

                        console.log(pgm + 'Test8 OK. response was ' + JSON.stringify(response)) ;
                        // Test8 OK. response was {"msgtype":"balance","balance":[{"code":"tBTC","amount":0}]}

                        // save balance
                        console.log(pgm + 'session_info = ' + JSON.stringify(session_info)) ;
                        session_info.balance = response.balance ;
                        session_info.balance_at = new Date().getTime() ;
                        moneyNetworkWService.ls_save_sessions() ;

                        test_done('Test OK') ;

                    }) ; // send_message callback 1

                } // end if else
            } // run
            return {
                info: info,
                run: run
            };
        })(); // test8

        self.tests = [] ;
        function init_tests () {
            self.tests.splice(0, self.tests.length) ;
            self.tests.push(test1_ping_session) ;
            self.tests.push(test2_open_url) ;
            self.tests.push(test3_allow_popup) ;
            self.tests.push(test4_select_zeroid) ;
            self.tests.push(test5_merger_moneynetwork) ;
            self.tests.push(test6_check_session) ;
            self.tests.push(test7_check_wallet) ;
            self.tests.push(test8_get_balance) ;
        }
        init_tests();
        self.test_running = false ;

        function run_tests() {
            self.test_running = true ;
            self.tests[0].run() ;
        } // run_tests

        self.test_feedback = function (test, checkbox) {
            var checked ;
            if (checkbox=='skipped') checked = test.info.test_skipped ;
            if (checkbox=='OK') checked = test.info.test_ok ;
            if (checkbox=='failed') checked = test.info.test_failed ;

            // checkbox feedback (skip, ok or failed)
            if (checked) {
                // check
                test.info.old_status = test.info.status ; // save system status
                test.info.status = 'Test ' + checkbox ;
                if (checkbox == 'skipped') {
                    test.info.test_ok = false ;
                    test.info.test_failed = false ;
                    if (test.info.old_status == 'Running') test.run() ; // next test
                }
                if (checkbox == 'OK') {
                    test.info.test_skipped = false ;
                    test.info.test_failed = false ;
                    if (test.info.old_status == 'Running') test.run() ; // next test
                }
                if (checkbox == 'failed') {
                    test.info.test_skipped = false ;
                    test.info.test_ok = false ;
                }
            }
            else {
                // uncheck
                test.info.status = test.info.old_status ; // restore system status
                delete test.info.old_status ;
            }
        };

        self.show_add_new_wallet = function() {
            return (self.new_wallet_url && (self.new_wallet_url == tested_wallet_url)) ;

        };
        self.add_new_wallet = function () {
            var pgm = controller + '.add_new_wallet: ' ;
            console.log(pgm + 'new wallet url = ' + self.new_wallet_url) ;
        };

        // end WalletCtrl
    }])

;