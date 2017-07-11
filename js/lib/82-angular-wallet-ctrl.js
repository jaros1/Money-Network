angular.module('MoneyNetwork')

    .controller('WalletCtrl', ['$rootScope', '$window', '$location', '$timeout', 'MoneyNetworkService', 'MoneyNetworkHubService',
                     function ($rootScope, $window, $location, $timeout, moneyNetworkService, moneyNetworkHubService)
    {
        var self = this;
        var controller = 'WalletCtrl';
        if (!MoneyNetworkHelper.getItem('userid')) {
            // not logged in - skip initialization of controller
            return;
        }
        console.log(controller + ' loaded');

        var BITCOIN_ADDRESS_PATTERN = '1[a-km-zA-HJ-NP-Z1-9]{25,34}' ;

        // create new sessionid for MoneyNetwork and MoneyNetwork wallet communication
        // sessionid: a "secret" sessionid URL parameter used when opening MoneyNetwork wallet site (only a secret when running ZeroNet local)
        // no event file done for "internal" cross site communication. dbQuery fetching will be used to detect new messages
        // using optional files and siteSign. sitePublish is not needed for "internal" cross site communication
        // message filenames:
        // - my messages: sha256.first(10).timestamp
        // - wallet messages: sha256.last(10).timestamp
        function new_sessionid () {
            var pgm = controller + '.new_sessionid: ' ;
            var sha256 ;
            test_sessionid = MoneyNetworkHelper.generate_random_password(60, true).toLowerCase();
            encrypt2.setup_encryption({sessionid: test_sessionid, debug: true});
            sha256 = CryptoJS.SHA256(test_sessionid).toString() ;
            moneynetwork_session_filename = sha256.substr(0,10) ; // first 10 characters of sha256 signature
            wallet_session_filename = sha256.substr(sha256.length-10); // last 10 characters of sha256 signature
            console.log(pgm + 'moneynetwork_session_filename = ' + moneynetwork_session_filename);
            console.log(pgm + 'wallet_session_filename = ' + wallet_session_filename);
            // monitor incoming messages from this wallet session
            MoneyNetworkAPILib.add_session(test_sessionid) ;
        } // new_sessionid


        // todo: save data received from wallet sessions in localStorage
        var todo_saved_data = {} ; // sessionid => hash with saved wallet data

        // generic callback function to handle incoming messages from wallet session(s):
        // - save_data message. save (encrypted) data in MoneyNetwork localStorage
        // - get_data message. return (encrypted) data saved in MoneyNetwork localStorage
        // - delete_data message. delete data saved in MoneyNetwork localStorage
        var SESSION_PASSWORD_KEY = '$session_password' ; // special key used for session restore password. see pubkeys, get_password and password messages
        function process_incoming_message (filename, encrypt2) {
            var pgm = controller + '.process_incoming_message: ' ;
            var debug_seq ;
            console.log(pgm + 'filename = ' + filename) ;

            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + filename + ' fileGet') ;
            ZeroFrame.cmd("fileGet", {inner_path: filename, required: false}, function (json_str) {
                var pgm = controller + '.process_incoming_message fileGet callback 1: ';
                var encrypted_json;
                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq);
                if (!json_str) {
                    console.log(pgm + 'fileGet ' + filename + ' failed') ;
                    return ;
                }
                encrypted_json = JSON.parse(json_str) ;
                encrypt2.decrypt_json(encrypted_json, function (request) {
                    var pgm = controller + '.process_incoming_message decrypt_json callback 2: ';
                    var timestamp, error, response, i, key, value, encryptions ;
                    console.log(pgm + 'request = ' + JSON.stringify(request)) ;
                    encryptions = [1,2,3] ;
                    // remove any response timestamp before validation (used in response filename)
                    timestamp = request.response ; delete request.response ;
                    // validate and process incoming json message and process
                    response = { msgtype: 'response' } ;
                    error = encrypt2.validate_json(pgm, request) ;
                    if (error) response.error = 'message is invalid. ' + error ;
                    else if (request.msgtype == 'pubkeys') {
                        // received public keys from wallet session (test5)
                        if (!request.password) response.error = 'Password is required in pubkeys message from wallet' ;
                        else if (encrypt2.other_session_pubkey || encrypt2.other_session_pubkey2) {
                            response.error = 'Warning. Public keys have already been received. Keeping old public keys and old session password' ;
                        }
                        else {
                            encrypt2.setup_encryption({pubkey: request.pubkey, pubkey2: request.pubkey2}) ;
                            console.log(pgm + 'save session password. used for wallet session restore. See get_password and password messages');
                            if (!todo_saved_data[test_sessionid]) todo_saved_data[test_sessionid] = {} ;
                            todo_saved_data[test_sessionid][SESSION_PASSWORD_KEY] = {
                                password: request.password, // encrypted session password pwd2
                                pubkey: encrypt2.other_session_pubkey,
                                pubkey2: encrypt2.other_session_pubkey2
                            };
                        }
                    }
                    else if (request.msgtype == 'save_data') {
                        // received data_data request from wallet session.
                        console.log(pgm + 'todo: save data in localStorage') ;
                        if (!todo_saved_data[test_sessionid]) todo_saved_data[test_sessionid] = {} ;
                        for (i=0 ; i<request.data.length ; i++) {
                            key = request.data[i].key ;
                            if (key == SESSION_PASSWORD_KEY) continue ;
                            value = request.data[i].value ;
                            todo_saved_data[test_sessionid][key] = value ;
                        }
                    }
                    else if (request.msgtype == 'delete_data') {
                        // received delete_data request from wallet session.
                        console.log(pgm + 'todo: delete data saved in localStorage') ;
                        if (!todo_saved_data[test_sessionid]) null ; // OK - no data
                        else if (!request.keys) {
                            // OK - no keys array - delete all data
                            for (key in todo_saved_data[test_sessionid]) {
                                if (key == SESSION_PASSWORD_KEY) continue ;
                                delete todo_saved_data[test_sessionid][key] ;
                            }
                        }
                        else {
                            // keys array. deleted requested keys
                            for (i=0 ; i<request.keys.length ; i++) {
                                key = request.keys[i].key ;
                                if (key == SESSION_PASSWORD_KEY) continue ;
                                delete todo_saved_data[test_sessionid][key] ;
                            }
                        }
                    }
                    else if (request.msgtype == 'get_data') {
                        // received get_data request from wallet session. return data response
                        console.log(pgm + 'todo: get data saved in localStorage') ;
                        response = { msgtype: 'data', data: []} ;
                        for (i=0 ; i<request.keys.length ; i++) {
                            key = request.keys[i].key ;
                            if (!todo_saved_data[test_sessionid]) continue ; // OK - no data - return empty data array
                            if (!todo_saved_data[test_sessionid].hasOwnProperty(key)) continue ; // OK - no data with this key
                            value = todo_saved_data[test_sessionid][key] ;
                            response.data.push({key: key, value: value}) ;
                        } // for i
                    }
                    else if (request.msgtype == 'get_password') {
                        // received get_password request from wallet session. return password is any. Encrypt response with cryptMessage only
                        console.log(pgm + 'todo_saved_data[test_sessionid] = ' + JSON.stringify(todo_saved_data[test_sessionid])) ;
                        console.log(pgm + 'todo: max number invalid get_password requests') ;
                        // console.log(pgm + 'request = ' + JSON.stringify(request)) ;
                        encryptions = [2] ; // only cryptMessage. Wallet session JSEncrypt prvkey is not yet restored from localStorage
                        if (!todo_saved_data[test_sessionid] || !todo_saved_data[test_sessionid][SESSION_PASSWORD_KEY]) response.error = 'Not found' ;
                        else if (todo_saved_data[test_sessionid][SESSION_PASSWORD_KEY].pubkey != request.pubkey) response.error = 'Not found pubkey' ;
                        else if (todo_saved_data[test_sessionid][SESSION_PASSWORD_KEY].pubkey2 != request.pubkey2) response.error = 'Not found pubkey2' ;
                        else if (encrypt2.unlock_pwd2 != request.unlock_pwd2) response.error = 'Not found unlock_pwd2' ;
                        else {
                            response = {
                                msgtype: 'password',
                                password: todo_saved_data[test_sessionid][SESSION_PASSWORD_KEY].password
                            }
                        }
                    }
                    else error = 'Unknown msgtype ' + request.msgtype ;
                    console.log(pgm + 'request = ' + JSON.stringify(request)) ;
                    console.log(pgm + 'response = ' + JSON.stringify(response)) ;
                    console.log(pgm + 'encryptions = ' + JSON.stringify(encryptions)) ;

                    // send response
                    if (!timestamp) return ; // exit. no response requested
                    if (error) response.error = error ;
                    encrypt2.send_message(response, {timestamp: timestamp, msgtype: request.msgtype, encryptions: encryptions}, function (res)  {
                        var pgm = controller + '.process_incoming_message send_message callback 3: ';
                        console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                    }) ; // send_message callback 3

                }) ; // decrypt_json callback 2
            }) ; // fileGet callback 1
        } // process_incoming_message

        // config MoneyNetworkAPI. add callback for incoming messages from wallet sessions
        MoneyNetworkAPILib.config({
            debug: true,
            ZeroFrame: ZeroFrame,
            optional: moneyNetworkHubService.get_content_optional(),
            cb: process_incoming_message
        }) ;
        moneyNetworkService.get_my_user_hub(function (hub) {
            var user_path ;
            user_path = 'merged-MoneyNetwork/' + hub + '/data/users/' + ZeroFrame.site_info.auth_address + '/';
            MoneyNetworkAPILib.config({user_path: user_path});
        }) ;

        // messages between MoneyNetwork and MoneyNetwork wallet (session) will be encrypted with cryptMessage, JSEncrypt and sessionid
        // todo: messages will be deleted when read and processed
        var encrypt2 = new MoneyNetworkAPI({
            prvkey: MoneyNetworkHelper.getItem('prvkey'), // for JSEncrypt (decrypt incoming message)
            userid2: MoneyNetworkHelper.getUserId() // for cryptMessage (decrypt incoming message)
        }) ;

        self.new_wallet_url = $location.search()['new_wallet_site'] ; // comming from a MoneyNetwork wallet site?
        var tested_wallet_url = null ; // last tested url
        var test_sessionid ;
        var moneynetwork_session_filename ; // MoneyNetwork (main windows/this session)
        var wallet_session_filename ; // MoneyNetwork wallet session (popup window)
        var test_session_at = null ;
        new_sessionid () ;

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
            new_sessionid() ;
        };
        var test1_open_url = (function () {
            var pgm = controller + '.test1: ' ;
            var info = {
                no: 1,
                text: 'Open wallet URL',
                status: 'Pending'
            };
            function run() {
                var pgm = controller + '.test1.run: ' ;
                var url, json, inner_path ;
                if (['Test skipped', 'Test OK'].indexOf(info.status) != -1) {
                    // continue with next test
                    console.log(pgm + 'test ' + info.no + ' done. start test ' + (info.no + 1));
                    info.disabled = true;
                    test2_allow_popup.run();
                }
                else {
                    // start test 1. add sessionid to URL and open new window with wallet session
                    // sessionid: "secret" sessionid random 60 character password
                    // SHA256(sessionid).first(10).<timestamp>: MoneyNetwork session filename (optional file). this session
                    // SHA256(sessionid).last(10).<timestamp>: MoneyNetwork wallet session filename (optional file). other session
                    info.status = 'Running' ;
                    url = get_relative_url(self.new_wallet_url) ;
                    url = updateURLParameter(url, 'sessionid', test_sessionid) ;
                    console.log(pgm + 'url = ' + url) ;
                    ZeroFrame.cmd("wrapperOpenWindow", [url, "_blank"]);

                    // msg 1: MoneyNetwork: send my public keys unencrypted to MoneyNetwork wallet session
                    moneyNetworkService.get_my_user_hub(function (hub) {
                        var pgm = controller + '.test1.run get_my_user_hub callback 1: ' ;
                        var user_path, json, inner_path, json_raw, debug_seq1, userid ;
                        json = {
                            msgtype: 'pubkeys',
                            pubkey: MoneyNetworkHelper.getItem('pubkey'), // for JSEncrypt
                            pubkey2: MoneyNetworkHelper.getItem('pubkey2') // for cryptMessage
                        } ;

                        // debug. output userid2, pubkey2 and get pubkey2 from cryptmessage. pubkey2 must be correct!
                        userid =  MoneyNetworkHelper.getUserId() ;
                        ZeroFrame.cmd("userPublickey", [userid], function (pubkey2) {
                            console.log(pgm + 'userid = ' + userid + ', pubkey2 (ls) = ' + json.pubkey2 + ', pubkey2 (userPublickey) = ' + pubkey2) ;
                        }) ;

                        // todo: validate json. API with msgtypes and validating rules
                        json_raw = unescape(encodeURIComponent(JSON.stringify(json, null, "\t")));
                        user_path = 'merged-MoneyNetwork/' + hub + '/data/users/' + ZeroFrame.site_info.auth_address + '/' ;
                        inner_path = user_path + moneynetwork_session_filename + '.' + (new Date().getTime()) ;
                        // write file
                        debug_seq1 = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + inner_path + ' fileWrite') ;
                        ZeroFrame.cmd("fileWrite", [inner_path, btoa(json_raw)], function (res) {
                            var pgm = controller + '.test1.run fileWrite callback 2: ' ;
                            var inner_path, debug_seq2 ;
                            MoneyNetworkHelper.debug_z_api_operation_end(debug_seq1) ;
                            console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                            // sign. should update wallet database. publish is not needed.
                            inner_path = user_path + 'content.json' ;
                            debug_seq2 = MoneyNetworkHelper.debug_z_api_operation_start('z_site_publish', pgm + inner_path + ' siteSign') ;
                            ZeroFrame.cmd("siteSign", {inner_path: inner_path}, function (res) {
                                var pgm = controller + '.test1.run siteSign callback 3: ' ;
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq2) ;
                                console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                                test_session_at = new Date().getTime() ;
                            }) ; // siteSign callback 3

                        }) ; // writeFile callback 2

                    }) ; // get_my_user_hub callback 1

                } // if else
            } // run
            return {
                info: info,
                run: run
            };
        })(); // test1

        var test2_allow_popup = (function () {
            var pgm = controller + '.test2: ' ;
            var info = {
                no: 2,
                text: 'Popup allowed in browser',
                status: 'Pending'
            };
            function run () {
                var relative_url ;
                if (['Test skipped', 'Test OK'].indexOf(info.status) != -1) {
                    // continue with next test
                    console.log(pgm + 'test ' + info.no + ' done. start test ' + (info.no+1)) ;
                    info.disabled = true ;
                    test3_select_zeroid.run() ;
                }
                else {
                    // start test 2
                    info.status = 'Running' ;
                    ZeroFrame.cmd("wrapperConfirm", [info.text + '?'], function (ok) {
                        if (!ok) return ;
                        info.test_ok = true ;
                        self.test_feedback(test2_allow_popup, 'OK') ;
                        $rootScope.$apply() ;
                    }) ;
                }
            }
            return {
                info: info,
                run: run
            };
        })(); // test2

        var test3_select_zeroid = (function () {
            var pgm = controller + '.test3: ' ;
            var info = {
                no: 3,
                text: 'ZeroID selected in wallet',
                status: 'Pending'
            };
            function run () {
                var relative_url ;
                if (['Test skipped', 'Test OK'].indexOf(info.status) != -1) {
                    // continue with next test
                    console.log(pgm + 'test ' + info.no + ' done. start test ' + (info.no+1)) ;
                    info.disabled = true ;
                    test4_merger_moneynetwork.run() ;
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
        })(); // test3

        var test4_merger_moneynetwork = (function () {
            var pgm = controller + '.test4: ' ;
            var info = {
                no: 4,
                text: 'Merger:MoneyNetwork permission granted in wallet',
                status: 'Pending'
            };
            function run () {
                var relative_url ;
                if (['Test skipped', 'Test OK'].indexOf(info.status) != -1) {
                    // continue with next test
                    console.log(pgm + 'test ' + info.no + ' done. start test ' + (info.no+1)) ;
                    info.disabled = true ;
                    test5_check_session.run() ;
                }
                else {
                    // start test 4
                    info.status = 'Running' ;
                    ZeroFrame.cmd('wrapperNotification', ['info', 'Please check that "Merger:MoneyNetwork permission" is granted in wallet and click Test OK', 5000]);
                }
            }
            return {
                info: info,
                run: run
            };
        })(); // test4

        var test5_check_session = (function () {
            var pgm = controller + '.test5: ' ;
            var info = {
                no: 5,
                text: 'Checking session',
                status: 'Pending'
            };
            function run () {
                var relative_url, sessionid_sha256, query, json ;
                if (['Test skipped', 'Test OK'].indexOf(info.status) != -1) {
                    // test done
                    info.disabled = true ;
                    self.test_running = false ;
                }
                else {
                    // start test 5. wait for wallet feedback (pubkeys message)
                    info.status = 'Running' ;

                    // wait for session to start. expects a pubkeys message from MoneyNetwork wallet session
                    // incoming messages are received by MoneyNetworkAPI.demon process in process_incoming_message callback
                    // wait for pubkeys information to be inserted into todo_saved_data hash. wait max 1 minute
                    var check_session = function(cb, count) {
                        var job ;
                        if (!count) count = 0;
                        if (count > 60) return cb({ error: "timeout" }) ;
                        if (!todo_saved_data[test_sessionid] || !todo_saved_data[test_sessionid][SESSION_PASSWORD_KEY]) {
                            // wait. pubkeys message not yet received
                            job = function () { check_session(cb, count+1) };
                            $timeout(job, 1000) ;
                            return ;
                        }
                        // done. pubkeys message from wallet session was received by process_incoming_message callback
                        cb(todo_saved_data[test_sessionid][SESSION_PASSWORD_KEY]) ;
                    }; // check_session

                    // start session check. should wait for max 60 seconds for session handshake
                    check_session(function (res) {
                        var elapsed ;
                        if (res.error) {
                            console.log(pgm + 'wallet session was not found. error = ' + res.error) ;
                            info.status = 'Test failed' ;
                            info.disabled = true ;
                            self.test_running = false ;
                        }
                        else {
                            elapsed = res.session_at - test_session_at ;
                            console.log(pgm + 'new wallet session was found. pubkey2 = ' + res.pubkey2 + ', waited ' + Math.round(elapsed / 1000) + ' seconds') ;
                            info.status = 'Test OK' ;
                            info.disabled = true ;
                            self.test_running = false ;
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
        })(); // test5

        self.tests = [] ;
        function init_tests () {
            self.tests.splice(0, self.tests.length) ;
            self.tests.push(test1_open_url) ;
            self.tests.push(test2_allow_popup) ;
            self.tests.push(test3_select_zeroid) ;
            self.tests.push(test4_merger_moneynetwork) ;
            self.tests.push(test5_check_session) ;
        }
        init_tests();
        self.test_running = false ;

        function run_tests() {
            self.test_running = true ;
            self.tests[0].run() ;
            return ;
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