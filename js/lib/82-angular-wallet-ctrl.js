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

        // setup MoneyNetworkLib. Most important. inject ZeroFrame into library
        MoneyNetworkAPILib.config({
            debug: true,
            ZeroFrame: ZeroFrame,
            optional: moneyNetworkHubService.get_z_content_optional()
        }) ;

        // create new sessionid for MoneyNetwork and MoneyNetwork wallet communication
        // sessionid: a "secret" sessionid URL parameter used when opening MoneyNetwork wallet site (only a secret when running ZeroNet local)
        // no event file done for "internal" cross site communication. dbQuery fetching will be used to detect new messages
        // using optional files and siteSign. sitePublish is not needed for "internal" cross site communication
        // message filenames:
        // - my messages: sha256.first(10).timestamp
        // - wallet messages: sha256.last(10).timestamp
        var encrypt2 ;
        function new_sessionid () {
            var pgm = controller + '.new_sessionid: ' ;
            test_sessionid = MoneyNetworkHelper.generate_random_password(60, true).toLowerCase();
            // monitor incoming messages from this new wallet session
            encrypt2 = new MoneyNetworkAPI({
                sessionid: test_sessionid,
                prvkey: MoneyNetworkHelper.getItem('prvkey'), // for JSEncrypt (decrypt incoming message)
                userid2: MoneyNetworkHelper.getUserId(), // for cryptMessage (decrypt incoming message)
                debug: true
            }) ;
        } // new_sessionid

        var SESSION_PASSWORD_KEY = '$session_password' ; // special key used for session restore password. see pubkeys, get_password and password messages

        // load/save sessions in ls
        function ls_get_sessions () {
            var sessions_str ;
            sessions_str = MoneyNetworkHelper.getItem('sessions') ;
            if (sessions_str) return JSON.parse(sessions_str) ;
            else return {} ;
        } // ls_get_sessions
        function ls_save_sessions () {
            var sessions_str ;
            sessions_str = JSON.stringify(ls_sessions) ;
            MoneyNetworkHelper.setItem('sessions', sessions_str) ;
            MoneyNetworkHelper.ls_save() ;
        } // ls_save_sessions ;

        // load old sessions and listen for incoming messages
        var ls_sessions = ls_get_sessions() ; // sessionid => hash with saved wallet data

        function create_sessions() {
            var pgm = controller + '.create_sessions: ';
            var sessionid, session_info, encrypt, prvkey, userid2, sessions1, sessions2, sessions3,
                step_1_other_session_filename, step_2_find_files, step_3_cleanup_done_files ;

            // create a MoneyNetworkAPI object for each session (listen for incoming messages)
            prvkey = MoneyNetworkHelper.getItem('prvkey') ;
            userid2 = MoneyNetworkHelper.getUserId() ;
            sessions1 = [] ;
            console.log(pgm + 'todo: move prvkey and userid2 setup to MoneyNetworkAPILib. No reason for prvkey and userid2 setup for each MoneyNetworkAPI instance') ;
            console.log(pgm + 'todo: pubkey+pubkey2 combinations (other session) should be unique. only one sessionid is being used by the other session. last used sessionid is the correct session');
            for (sessionid in ls_sessions) {
                session_info = ls_sessions[sessionid][SESSION_PASSWORD_KEY] ;
                if (!session_info) continue ;
                // initialize encrypt object. added to sessions in MoneyNetworkAPILib. incoming message from old sessions will be processed by "process_incoming_message"
                encrypt = new MoneyNetworkAPI({
                    sessionid: sessionid,
                    prvkey: prvkey,
                    userid2: userid2,
                    pubkey: session_info.pubkey,
                    pubkey2: session_info.pubkey2
                }) ;
                // for done list cleanup.
                sessions1.push(encrypt) ;
            } // for sessionid

            // checking done list for each loaded session. maybe some done timestamps can be removed from ls_sessions
            sessions2 = {} ; // from other_session_filename to hash with not deleted files (incoming files from other session)
            sessions3 = {} ; // from sessionid to hash with not deleted files (incoming files from other session)

            // callback chain.
            // step 1: find other session filename. used in filenames for incoming messages
            step_1_other_session_filename = function(cb2) {
                var pgm = controller + '.create_sessions.step_1_other_session_filename: ';
                console.log(pgm + 'cb2 = ', cb2) ;
                var encrypt ;
                if (!sessions1.length) return cb2() ; // next step
                encrypt = sessions1.shift() ;
                if (encrypt.destroyed) return step_1_other_session_filename() ; // next session
                encrypt.get_session_filenames(function (this_session_filename, other_session_filename, unlock_pwd2) {
                    sessions2[other_session_filename] = {sessionid: encrypt.sessionid, files: {}} ;
                    step_1_other_session_filename(cb2) ; // next session
                }) ;
            }; // step_1_other_session_filename

            // step 2: dbQuery - find not deleted incoming messages
            step_2_find_files = function (cb3) {
                var pgm = controller + '.create_sessions.step_2_find_files: ';
                var query, first, other_session_filename  ;
                if (!Object.keys(sessions2).length) return ; // no sessions

                // build query
                first = true;
                query =
                    "select json.directory, files_optional.filename " +
                    "from files_optional, json " +
                    "where ";
                for (other_session_filename in sessions2) {
                    query += first ? "(" : " or ";
                    query += "files_optional.filename like '" + other_session_filename + ".%'";
                    first = false ;
                }
                query +=
                    ") and json.json_id = files_optional.json_id " +
                    "order by substr(files_optional.filename, 12)";
                console.log(pgm + 'query = ' + query) ;

                ZeroFrame.cmd("dbQuery", [query], function (res) {
                    var pgm = controller + '.create_sessions.step_2_find_files dbQuery callback: ';
                    var i, filename, timestamp, timestamp_re, other_session_filename ;
                    if (res.error) {
                        console.log(pgm + 'query failed. error = ' + res.error);
                        console.log(pgm + 'query = ' + query);
                        return;
                    }
                    // console.log(pgm + 'res = ' + JSON.stringify(res));
                    //res = [{
                    //    "directory": "1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
                    //    "filename": "3c69e1b778.1500291521896"
                    //}, {
                    // ...
                    //}, {
                    //    "directory": "1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
                    //    "filename": "90ed57c290.1500649849934"
                    //}];
                    timestamp_re = /^[0-9]{13}$/ ;
                    for (i=0 ; i<res.length ; i++) {
                        filename = res[i].filename;
                        other_session_filename = filename.substr(0,10) ;
                        timestamp = filename.substr(11) ;
                        if (!timestamp.match(timestamp_re)) continue ;
                        timestamp = parseInt(timestamp) ;
                        sessions2[other_session_filename].files[timestamp] = true ;
                    } // for i
                    //console.log(pgm + 'sessions2 = ' + JSON.stringify(sessions2)) ;

                    // next step
                    cb3() ;

                }) ; // dbQuery callback

            }; // step_2_find_files

            // step 3: cleanup done lists in ls_sessions
            step_3_cleanup_done_files = function() {
                var pgm = controller + '.create_sessions.step_3_cleanup_done_files: ';
                var other_session_filename, sessionid, timestamp, session_info, delete_timestamps, no_done_deleted ;
                // console.log(pgm + 'ls_sessions = ' + JSON.stringify(ls_sessions)) ;
                // console.log(pgm + 'sessions2 = ' + JSON.stringify(sessions2)) ;
                for (other_session_filename in sessions2) {
                    sessionid = sessions2[other_session_filename].sessionid ;
                    sessions3[sessionid] = {} ;
                    for (timestamp in sessions2[other_session_filename].files) {
                        sessions3[sessionid][timestamp] = sessions2[other_session_filename].files[timestamp]
                    }
                }
                // console.log(pgm + 'sessions3 = ' + JSON.stringify(sessions3)) ;

                // check done files for each session in ls_sessions
                no_done_deleted = 0 ;
                for (sessionid in ls_sessions) {
                    session_info = ls_sessions[sessionid][SESSION_PASSWORD_KEY] ;
                    if (!session_info) continue ;
                    if (!session_info.done) continue ;
                    delete_timestamps = [] ;
                    for (timestamp in session_info.done) {
                        if (!sessions3[sessionid][timestamp]) {
                            // file in done list and has been deleted by other session. remove from done list
                            delete_timestamps.push(timestamp) ;
                        }
                    }
                    // remove from done list
                    while (delete_timestamps.length) {
                        timestamp = delete_timestamps.shift() ;
                        delete session_info.done[timestamp] ;
                        no_done_deleted++ ;
                    }
                } // for sessionid
                console.log(pgm + 'no_done_deleted = ' + no_done_deleted) ;
                // no deleted = 64
                // no deleted = 0
                if (no_done_deleted) ls_save_sessions() ;

            }; // step_3_cleanup_done_files

            // start callback chain step 1-3
            step_1_other_session_filename(function() {
                step_2_find_files(function() {
                    step_3_cleanup_done_files() ;
                }) ;
            }) ;

        } // create_sessions
        create_sessions() ;

        // generic callback function to handle incoming messages from wallet session(s):
        // - save_data message. save (encrypted) data in MoneyNetwork localStorage
        // - get_data message. return (encrypted) data saved in MoneyNetwork localStorage
        // - delete_data message. delete data saved in MoneyNetwork localStorage
        console.log(controller + ': todo: move process_incoming_message to moneyNetworkService') ;
        console.log(controller + ': todo: add done callback. demon should wait until finished before processing next message');

        function process_incoming_message (filename, encrypt2) {
            var pgm = controller + '.process_incoming_message: ' ;
            var debug_seq, pos, other_user_path, sessionid, session_info, file_timestamp ;

            if (encrypt2.destroyed) {
                // MoneyNetworkAPI instance has been destroyed. Maybe deleted session. Maybe too many invalid get_password requests?
                console.log(pgm + 'ignoring incoming message ' + filename + '. session has been destroyed. reason = ' + encrypt2.destroyed) ;
                return ;
            }

            console.log(pgm + 'filename = ' + filename) ;
            // filename = merged-MoneyNetwork/1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ/0d4002d16c.1499860158848

            // check other_user_path. all messages for this session must come from same user directory
            pos = filename.lastIndexOf('/') ;
            other_user_path = filename.substr(0,pos+1) ;
            // console.log(pgm + 'other_user_path = ' + other_user_path) ;
            encrypt2.setup_encryption({other_user_path: other_user_path}) ; // set and check

            // get session info. ignore already read messages
            sessionid = encrypt2.sessionid ;
            session_info = ls_sessions[sessionid] ? ls_sessions[sessionid][SESSION_PASSWORD_KEY] : null ;
            pos = filename.lastIndexOf('.') ;
            file_timestamp = parseInt(filename.substr(pos+1)) ;
            console.log(pgm + 'file_timestamp = ' + file_timestamp) ;

            if (session_info) {
                if (!session_info.hasOwnProperty('done')) session_info.done = {} ;
                if (session_info.done[file_timestamp]) {
                    console.log(pgm + 'ignoring incoming message ' + filename + '. already received');
                    return;
                }
            }

            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + filename + ' fileGet') ;
            ZeroFrame.cmd("fileGet", {inner_path: filename, required: false}, function (json_str) {
                var pgm = controller + '.process_incoming_message fileGet callback 1: ';
                var encrypted_json;
                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq);
                if (!json_str) {
                    // OK. other session has deleted this message. normally deleted after a short time
                    if (session_info) session_info.done[file_timestamp] = true ;
                    ls_save_sessions() ;
                    return ;
                }
                encrypted_json = JSON.parse(json_str) ;
                encrypt2.decrypt_json(encrypted_json, function (request) {
                    var pgm = controller + '.process_incoming_message decrypt_json callback 2: ';
                    var timestamp, error, response, i, key, value, encryptions, done_and_send ;
                    // console.log(pgm + 'request = ' + JSON.stringify(request)) ;
                    encryptions = [1,2,3] ;

                    // remove any response timestamp before validation (used in response filename)
                    timestamp = request.response ; delete request.response ;

                    done_and_send = function (response, encryptions) {
                        // marked as done. do not process same message twice
                        if (session_info) session_info.done[file_timestamp] = new Date().getTime() ;
                        ls_save_sessions() ;

                        console.log(pgm + 'request = ' + JSON.stringify(request)) ;
                        if (timestamp) {
                            // response was requested
                            console.log(pgm + 'response = ' + JSON.stringify(response)) ;
                            console.log(pgm + 'encryptions = ' + JSON.stringify(encryptions)) ;
                        }
                        else return ; // exit. no response was requested

                        // send response to other session
                        encrypt2.send_message(response, {timestamp: timestamp, msgtype: request.msgtype, encryptions: encryptions}, function (res)  {
                            var pgm = controller + '.process_incoming_message send_message callback 3: ';
                            console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                        }) ; // send_message callback 3

                    } ; // done_and_send

                    // validate and process incoming json message and process
                    response = { msgtype: 'response' } ;
                    error = encrypt2.validate_json(pgm, request) ;
                    if (error) response.error = 'message is invalid. ' + error ;
                    else if (request.msgtype == 'pubkeys') {
                        // first message from wallet. received public keys from wallet session
                        if (!request.password) response.error = 'Password is required in pubkeys message from wallet' ;
                        else if (session_info) response.error = 'Warning. Public keys have already been received. Keeping old public keys and old session password' ;
                        else {
                            encrypt2.setup_encryption({pubkey: request.pubkey, pubkey2: request.pubkey2}) ;
                            console.log(pgm + 'todo: remember wallet user_path. following messages must come from identical wallet user_path');
                            console.log(pgm + 'save session password. used for wallet session restore. See get_password and password messages');
                            session_info = {
                                password: request.password, // encrypted session password pwd2
                                pubkey: encrypt2.other_session_pubkey,
                                pubkey2: encrypt2.other_session_pubkey2,
                                done: {}
                            } ;
                            if (!ls_sessions[sessionid]) ls_sessions[sessionid] = {} ;
                            ls_sessions[sessionid][SESSION_PASSWORD_KEY] = session_info ;
                        }
                    }
                    else if (request.msgtype == 'save_data') {
                        // received data_data request from wallet session.
                        console.log(pgm + 'todo: save data in localStorage') ;
                        if (!ls_sessions[sessionid]) ls_sessions[sessionid] = {} ;
                        for (i=0 ; i<request.data.length ; i++) {
                            key = request.data[i].key ;
                            if (key == SESSION_PASSWORD_KEY) continue ;
                            value = request.data[i].value ;
                            ls_sessions[sessionid][key] = value ;
                        }
                    }
                    else if (request.msgtype == 'delete_data') {
                        // received delete_data request from wallet session.
                        console.log(pgm + 'todo: delete data saved in localStorage') ;
                        if (!ls_sessions[sessionid]) null ; // OK - no data
                        else if (!request.keys) {
                            // OK - no keys array - delete all data
                            for (key in ls_sessions[sessionid]) {
                                if (key == SESSION_PASSWORD_KEY) continue ;
                                delete ls_sessions[sessionid][key] ;
                            }
                        }
                        else {
                            // keys array. deleted requested keys
                            for (i=0 ; i<request.keys.length ; i++) {
                                key = request.keys[i].key ;
                                if (key == SESSION_PASSWORD_KEY) continue ;
                                delete ls_sessions[sessionid][key] ;
                            }
                        }
                    }
                    else if (request.msgtype == 'get_data') {
                        // received get_data request from wallet session. return data response
                        response = { msgtype: 'data', data: []} ;
                        if (ls_sessions[sessionid]) {
                            for (i=0 ; i<request.keys.length ; i++) {
                                key = request.keys[i] ;
                                if (key == SESSION_PASSWORD_KEY) continue ; // special key used for session restore
                                if (!ls_sessions[sessionid]) continue ; // OK - no data - return empty data array
                                if (!ls_sessions[sessionid].hasOwnProperty(key)) continue ; // OK - no data with this key
                                value = ls_sessions[sessionid][key] ;
                                response.data.push({key: key, value: value}) ;
                            } // for i
                        }
                    }
                    else if (request.msgtype == 'get_password') {
                        // received get_password request from wallet session. return password if OK. Encrypt response with cryptMessage only
                        // console.log(pgm + 'request = ' + JSON.stringify(request)) ;
                        // get unlock_pwd2
                        encrypt2.get_session_filenames(function (this_session_filename, other_session_filename, unlock_pwd2) {
                            var pgm = controller + '.process_incoming_message get_session_filenames callback 3: ';
                            encryptions = [2] ; // only cryptMessage. Wallet session JSEncrypt prvkey is not yet restored from localStorage
                            if (session_info.invalid_get_password &&
                                (session_info.invalid_get_password > 6)) {
                                session_info = null ;
                                delete ls_sessions[sessionid] ;
                                encrypt2.destroy('Too many invalid get_password errors') ;
                            }
                            if (!ls_sessions[sessionid]) response.error = 'Session has been deleted' ;
                            else if (!session_info) response.error = 'Session info was not found' ;
                            else if (session_info.invalid_get_password && (session_info.invalid_get_password > 3)) response.error = 'Too many get_password errors' ;
                            else if (encrypt2.other_session_pubkey != request.pubkey) response.error = 'Not found pubkey' ;
                            else if (encrypt2.other_session_pubkey2 != request.pubkey2) response.error = 'Not found pubkey2' ;
                            else if (encrypt2.unlock_pwd2 != request.unlock_pwd2) response.error = 'Not found unlock_pwd2' ;
                            else {
                                response = {
                                    msgtype: 'password',
                                    password: session_info.password
                                }
                            }
                            // count no get_password errors. max 3
                            if (session_info) {
                                if (response.error) {
                                    if (!session_info.invalid_get_password) session_info.invalid_get_password = 0 ;
                                    session_info.invalid_get_password++ ;
                                }
                                else if (session_info.invalid_get_password) {
                                    delete session_info.invalid_get_password ;
                                }
                            }
                            // finish message processing. marked as done and send any response
                            done_and_send(response, encryptions) ;

                        }) ; // get_session_filenames callback
                        // stop and wait
                        return ;

                    }
                    else response.error = 'Unknown msgtype ' + request.msgtype ;

                    // finish message processing. marked as done and send any response
                    done_and_send(response, encryptions) ;

                }) ; // decrypt_json callback 2
            }) ; // fileGet callback 1
        } // process_incoming_message

        // add callback for incoming messages from wallet session(s)
        MoneyNetworkAPILib.config({cb: process_incoming_message}) ;
        moneyNetworkService.get_my_user_hub(function (hub) {
            var user_path ;
            user_path = 'merged-MoneyNetwork/' + hub + '/data/users/' + ZeroFrame.site_info.auth_address + '/';
            MoneyNetworkAPILib.config({this_user_path: user_path});
        }) ;

        self.new_wallet_url = $location.search()['new_wallet_site'] ; // redirect from a MoneyNetwork wallet site?
        var tested_wallet_url = null ; // last tested url
        var test_sessionid ;
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
                var url, request ;
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

                    // send unencrypted pubkeys message to wallet session. Do not wait for any response.
                    // encrypted pubkeys response will be processed by process_incoming_message callback function
                    request = {
                        msgtype: 'pubkeys',
                        pubkey: MoneyNetworkHelper.getItem('pubkey'), // for JSEncrypt
                        pubkey2: MoneyNetworkHelper.getItem('pubkey2') // for cryptMessage
                    } ;
                    test_session_at = new Date().getTime() ;
                    encrypt2.send_message(request, {encryptions:[]}, function (response) {
                        var pgm = controller + '.test1.run send_message callback 2: ' ;
                        console.log(pgm + 'response = ' + JSON.stringify(response)) ;
                    }) ;

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
                    // wait for pubkeys information to be inserted into sessions hash. wait max 1 minute
                    var check_session = function(cb, count) {
                        var job ;
                        if (!count) count = 0;
                        if (count > 60) return cb({ error: "timeout" }) ;
                        if (!ls_sessions[test_sessionid] || !ls_sessions[test_sessionid][SESSION_PASSWORD_KEY]) {
                            // wait. pubkeys message not yet received
                            job = function () { check_session(cb, count+1) };
                            $timeout(job, 1000) ;
                            return ;
                        }
                        // done. pubkeys message from wallet session was received by process_incoming_message callback
                        cb(ls_sessions[test_sessionid][SESSION_PASSWORD_KEY]) ;
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