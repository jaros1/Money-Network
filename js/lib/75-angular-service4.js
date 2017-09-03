angular.module('MoneyNetwork')

    // MoneyNetworkWService:
    // - wallet functions

    .factory('MoneyNetworkWService', ['$timeout', '$rootScope', '$window', '$location', 'dateFilter', 'MoneyNetworkHubService',
                             function($timeout, $rootScope, $window, $location, date, moneyNetworkHubService)
    {
        var service = 'MoneyNetworkWService' ;
        console.log(service + ' loaded') ;

        function debug (keys, text) {
            MoneyNetworkHelper.debug(keys, text) ;
        } // debug

        // cache some important informations from zeronet files
        // - user_seq: from users array in data.json file. using "pubkey" as index to users array
        // - user_seqs: from users array in data.json file.
        // - files_optional: from content.json file. loaded at startup and updated after every sign and publish
        var z_cache = moneyNetworkHubService.get_z_cache() ;

        function detected_client_log_out (pgm) {
            if (z_cache.user_id) return false ;
            console.log(pgm + 'stop. client log out. stopping ' + pgm + ' process') ;
            return true ;
        }

        // import functions from other services
        function get_my_user_hub (cb) {
            moneyNetworkHubService.get_my_user_hub(cb) ;
        }

        // setup MoneyNetworkLib. Most important. inject ZeroFrame into library
        MoneyNetworkAPILib.config({
            debug: true,
            ZeroFrame: ZeroFrame,
            optional: moneyNetworkHubService.get_z_content_optional()
        }) ;

        var SESSION_INFO_KEY = '_$session_info' ; // special key used for session restore password. see pubkeys, get_password and password messages
        function get_session_info_key() {
            return SESSION_INFO_KEY ;
        }

        // load/save sessions in ls
        var ls_sessions ;
        function ls_get_sessions () {
            var pgm = service + '.ls_get_sessions: ' ;
            var sessions_str, sessions, sessionid, session_info, migrate, delete_sessions, balance, i, balance_row, key ;
            if (ls_sessions) return ls_sessions ; // already loaded
            sessions_str = MoneyNetworkHelper.getItem('sessions') ;
            if (!sessions_str) return {} ;
            sessions = JSON.parse(sessions_str) ;
            delete_sessions = [] ;
            for (sessionid in sessions) {
                session_info = sessions[sessionid] ;
                if (session_info.hasOwnProperty('$session_password')) {
                    // migrate from old to new session info key
                    session_info[SESSION_INFO_KEY] = session_info['$session_password'] ;
                    delete session_info['$session_password'] ;
                }
                if (!session_info.hasOwnProperty(SESSION_INFO_KEY)) {
                    delete_sessions.push(sessionid) ;
                    continue ;
                }
                if (!session_info[SESSION_INFO_KEY].last_request_at) delete_sessions.push(sessionid) ;
            }
            while (delete_sessions.length) {
                sessionid = delete_sessions.shift() ;
                delete sessions[sessionid] ;
            }
            console.log(pgm + 'sessions (before cleanup) = ' + JSON.stringify(sessions)) ;
            //sessions = {
            //    "wslrlc5iomh45byjnblebpvnwheluzzdhqlqwvyud9mu8dtitus3kjsmitc1": {
            //        "_$session_info": {
            //            "url": "/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
            //            "password": "U2FsdGVkX18MyosYqdGVowB1nw/7Nm2nbzATu3TexEXMig7rjInIIr13a/w4G5TzFLFz9GE+rqGZsqRP+Ms0Ez3w8cA9xNhPjtrhOaOkT1M=",
            //            "pubkey": "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCuM/Sevlo2UYUkTVteBnnUWpsd\n5JjAUnYhP0M2o36da15z192iNOmd26C+UMg0U8hitK8pOJOLiWi8x6TjvnaipDjc\nIi0p0l3vGBEOvIyNEYE7AdfGqW8eEDzzl9Cezi1ARKn7gq1o8Uk4U2fjkm811GTM\n/1N9IwACfz3lGdAm4QIDAQAB\n-----END PUBLIC KEY-----",
            //            "pubkey2": "Ahn94vCUvT+S/nefej83M02n/hP8Jvqc8KbxMtdSsT8R",
            //            "last_request_at": 1504273096866,
            //            "done": {
            //                "1503315223138": 1503315232562,
            //                ...
            //                "1504273096866": 1504273097557
            //            },
            //            "balance": [{
            //                "code": "tBTC",
            //                "amount": 1.3,
            //                "balance_at": 1504265571720,
            //                "sessionid": "wslrlc5iomh45byjnblebpvnwheluzzdhqlqwvyud9mu8dtitus3kjsmitc1",
            //                "wallet_sha256": "6ef0247021e81ae7ae1867a685f0e84cdb8a61838dc25656c4ee94e4f20acb74",
            //                "name": "Test Bitcoin",
            //                "url": "https://en.bitcoin.it/wiki/Testnet",
            //                "units": [{"unit": "BitCoin", "factor": 1}, {"unit": "Satoshi", "factor": 1e-8}],
            //                "wallet_address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
            //                "wallet_title": "MoneyNetworkW2",
            //                "wallet_description": "Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro",
            //                "currencies": [{
            //                    "code": "tBTC",
            //                    "name": "Test Bitcoin",
            //                    "url": "https://en.bitcoin.it/wiki/Testnet",
            //                    "units": [{"unit": "BitCoin", "factor": 1}, {"unit": "Satoshi", "factor": 1e-8}]
            //                }]
            //            }],
            //            "currencies": [{
            //                "code": "tBTC",
            //                "name": "Test Bitcoin",
            //                "url": "https://en.bitcoin.it/wiki/Testnet",
            //                "units": [{"unit": "BitCoin", "factor": 1}, {"unit": "Satoshi", "factor": 1e-8}]
            //            }],
            //            "balance_at": 1504265571720,
            //            "wallet_sha256": "6ef0247021e81ae7ae1867a685f0e84cdb8a61838dc25656c4ee94e4f20acb74"
            //        }
            //    }
            //};
            for (sessionid in sessions) {
                session_info = sessions[sessionid][SESSION_INFO_KEY];
                delete session_info.currencies ;
                balance = session_info.balance ;
                if (!balance || !balance.length) continue ;
                for (i=0 ; i<balance.length ; i++) {
                    balance_row = balance[i] ;
                    for (key in balance_row) {
                        if (['code','amount'].indexOf(key) != -1) continue ;
                        delete balance_row[key] ;
                    } // for key
                } // for i
            } // for sessionid
            console.log(pgm + 'sessions (after cleanup) = ' + JSON.stringify(sessions)) ;
            //sessions = {
            //    "wslrlc5iomh45byjnblebpvnwheluzzdhqlqwvyud9mu8dtitus3kjsmitc1": {
            //        "_$session_info": {
            //            "url": "/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
            //            "password": "U2FsdGVkX18MyosYqdGVowB1nw/7Nm2nbzATu3TexEXMig7rjInIIr13a/w4G5TzFLFz9GE+rqGZsqRP+Ms0Ez3w8cA9xNhPjtrhOaOkT1M=",
            //            "pubkey": "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCuM/Sevlo2UYUkTVteBnnUWpsd\n5JjAUnYhP0M2o36da15z192iNOmd26C+UMg0U8hitK8pOJOLiWi8x6TjvnaipDjc\nIi0p0l3vGBEOvIyNEYE7AdfGqW8eEDzzl9Cezi1ARKn7gq1o8Uk4U2fjkm811GTM\n/1N9IwACfz3lGdAm4QIDAQAB\n-----END PUBLIC KEY-----",
            //            "pubkey2": "Ahn94vCUvT+S/nefej83M02n/hP8Jvqc8KbxMtdSsT8R",
            //            "last_request_at": 1504273096866,
            //            "done": {
            //                "1503315223138": 1503315232562,
            //                "1503916247431": 1503916247859,
            //                "1504261657652": 1504261664116,
            //                "1504261977720": 1504261982693,
            //                "1504273004817": 1504273005849,
            //                "1504273034505": 1504273035560,
            //                "1504273044607": 1504273045387,
            //                "1504273096866": 1504273097557
            //            },
            //            "balance": [{"code": "tBTC", "amount": 1.3}],
            //            "currencies": [{
            //                "code": "tBTC",
            //                "name": "Test Bitcoin",
            //                "url": "https://en.bitcoin.it/wiki/Testnet",
            //                "units": [{"unit": "BitCoin", "factor": 1}, {"unit": "Satoshi", "factor": 1e-8}]
            //            }],
            //            "balance_at": 1504265571720,
            //            "wallet_sha256": "6ef0247021e81ae7ae1867a685f0e84cdb8a61838dc25656c4ee94e4f20acb74"
            //        }
            //    }
            //};


            return sessions ;
        } // ls_get_sessions
        function ls_save_sessions () {
            var sessions_str ;
            sessions_str = JSON.stringify(ls_sessions) ;
            MoneyNetworkHelper.setItem('sessions', sessions_str) ;
            MoneyNetworkHelper.ls_save() ;
        } // ls_save_sessions ;

        // load old sessions from ls and listen to new incoming messages
        function create_sessions() {
            var pgm = service + '.create_sessions: ';
            var sessionid, session_info, encrypt, prvkey, userid2 ;

            console.log(pgm + 'todo: add callback to create_sessions. some tasks must run after sessions have been created (get_currencies)') ;

            // create a MoneyNetworkAPI object for each session (listen for incoming messages)
            prvkey = MoneyNetworkHelper.getItem('prvkey') ;
            userid2 = MoneyNetworkHelper.getUserId() ;

            // console.log(pgm + 'setting this_session_userid2 = ' + userid2) ;
            MoneyNetworkAPILib.config({this_session_prvkey: prvkey, this_session_userid2: userid2}) ;

            console.log(pgm + 'todo: pubkey+pubkey2 combinations (other session) should be unique. only one sessionid is being used by the other session. last used sessionid is the correct session');
            //session_info = {
            //    "password":"U2FsdGVkX1+6+X4pSDQOf8/Bb+3xG+nFQDyhr3/7syi+wYXKEZ6UL49dB2ftq1gmC5/LKfI2XfJS2fEsEy5CYscRBDuoUxJEqKNwiiiiXBA=",
            //    "pubkey":"-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCsOMfAvHPTp0K9qZfoItdJ9898\nU3S2gAZZSLuLZ1qMXr1dEnO8AwxS58UvKGwHObT1XQG8WT3Q1/6OGlJms4mYY1rF\nQXzYEV5w0RlcSrMpLz3+nJ7cVb9lYKOO8hHZFWudFRywkYb/aeNh6mAXqrulv92z\noX0S7YMeNd2YrhqefQIDAQAB\n-----END PUBLIC KEY-----",
            //    "pubkey2":"Ahn94vCUvT+S/nefej83M02n/hP8Jvqc8KbxMtdSsT8R",
            //    "last_request_at":1503051957877,
            //    "done":{"1503051957877":1503051958520},
            //    "url":"/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1"};
            // url and pubkey - should be a 1-1 relation. many pubkey => use last session and delete old session

            for (sessionid in ls_sessions) {
                session_info = ls_sessions[sessionid][SESSION_INFO_KEY] ;
                if (!session_info) continue ;
                // initialize encrypt object. added to sessions in MoneyNetworkAPILib. incoming message from old sessions will be processed by "process_incoming_message"
                console.log(pgm + 'create session with sessionid ' + sessionid + '. session_info = ' + JSON.stringify(session_info)) ;
                try {
                    encrypt = new MoneyNetworkAPI({
                        sessionid: sessionid,
                        pubkey: session_info.pubkey,
                        pubkey2: session_info.pubkey2,
                        debug: true
                    }) ;
                }
                catch (e) {
                    console.log(pgm + 'error. could not create a session with sessionid ' + sessionid + '. error = ' + (e.message || 'see previous message in log')) ;
                }
            } // for sessionid

            // check sessions. compare list of done files in ls_sessions with incoming files on file system (dbQuery)
            MoneyNetworkAPILib.get_sessions(function (sessions1) {
                var sessions2, sessions3, i, step_1_find_files, step_2_cleanup_done_files ;
                sessions2 = {} ; // from other_session_filename to hash with not deleted files (incoming files from other session)
                sessions3 = {} ; // from sessionid to hash with not deleted files (incoming files from other session)

                console.log(pgm + 'sessions1 = ' + JSON.stringify(sessions1)) ;
                //sessions1 = [{
                //    "other_session_filename": "5eb10feeca",
                //    "sessionid": "acpo0lstqzcpkskad9olzvbm1xdmgx1zpqbr4cn1jsf39nfexbuaikgcndfe",
                //    "session_at": 1503043546775
                //}, {
                //    "other_session_filename": "f1b4881fc5",
                //    "sessionid": "uzeptj8mlixhtbrhdnilhdvmxiujufrkk6lp0uj5wpglxsuktcrobm0s2i7n",
                //    "session_at": 1503043546780
                //}, {
                //    "other_session_filename": "c7c627af4d",
                //    "sessionid": "odcbtal2lclghgcezhf6vzpue46yuvfjskezvt9ixmgnjdziyzug09jrij16",
                //    "session_at": 1503043546784
                //}];

                // reformat sessions1 array
                for (i=0 ; i<sessions1.length ; i++) {
                    sessions2[sessions1[i].other_session_filename] = {sessionid: sessions1[i].sessionid, files: {}}
                }
                console.log(pgm + 'sessions2 = ' + JSON.stringify(sessions2)) ;

                // step 1: dbQuery - find not deleted incoming messages
                step_1_find_files = function (cb3) {
                    var pgm = service + '.create_sessions.step_1_find_files: ';
                    var query, first, other_session_filename  ;
                    if (!Object.keys(sessions2).length) return ; // no sessions
                    console.log(pgm + 'sessions2 = ' + JSON.stringify(sessions2)) ;

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
                    console.log(pgm + 'todo: add debug_seq to this query') ;

                    ZeroFrame.cmd("dbQuery", [query], function (res) {
                        var pgm = service + '.create_sessions.step_1_find_files dbQuery callback: ';
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

                }; // step_1_find_files

                // step 2: cleanup done lists in ls_sessions
                step_2_cleanup_done_files = function() {
                    var pgm = service + '.create_sessions.step_2_cleanup_done_files: ';
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
                        session_info = ls_sessions[sessionid][SESSION_INFO_KEY] ;
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

                }; // step_2_cleanup_done_files

                // start callback chain step 1-2
                step_1_find_files(function() {
                    step_2_cleanup_done_files() ;
                }) ;

            }) ; // get_sessions callback

        } // create_sessions

        // generic callback function to handle incoming messages from wallet session(s):
        // - save_data message. save (encrypted) data in MoneyNetwork localStorage
        // - get_data message. return (encrypted) data saved in MoneyNetwork localStorage
        // - delete_data message. delete data saved in MoneyNetwork localStorage
        console.log(service + ': todo: add done callback. demon process should wait until processing next message');

        function process_incoming_message (filename, encrypt2) {
            var pgm = service + '.process_incoming_message: ' ;
            var debug_seq, pos, other_user_path, sessionid, session_info, file_timestamp ;


            try {
                if (detected_client_log_out(pgm)) return ;
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
                session_info = ls_sessions[sessionid] ? ls_sessions[sessionid][SESSION_INFO_KEY] : null ;
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
                    var pgm = service + '.process_incoming_message fileGet callback 1: ';
                    var encrypted_json;
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq);
                    if (!json_str) {
                        // OK. other session has deleted this message. normally deleted after a short time
                        if (session_info) session_info.done[file_timestamp] = true ;
                        ls_save_sessions() ;
                        return ;
                    }
                    // console.log(pgm + 'this_session_userid2 = ' + encrypt2.this_session_userid2) ;
                    encrypted_json = JSON.parse(json_str) ;
                    encrypt2.decrypt_json(encrypted_json, function (request) {
                        var pgm = service + '.process_incoming_message decrypt_json callback 2: ';
                        var response_timestamp, request_timestamp, error, response, i, key, value, encryptions, done_and_send ;
                        // console.log(pgm + 'request = ' + JSON.stringify(request)) ;
                        encryptions = [1,2,3] ;

                        // remove any response timestamp before validation (used in response filename)
                        response_timestamp = request.response ; delete request.response ; // request received. must use response_timestamp in response filename
                        request_timestamp = request.request ; delete request.request ; // response received. todo: must be a response to previous send request with request timestamp in request filename

                        done_and_send = function (response, encryptions) {
                            // marked as done. do not process same message twice
                            var now ;
                            now = new Date().getTime() ;
                            if (session_info) {
                                session_info.done[file_timestamp] = now ;
                                if (!response.error || ['pubkeys','get_password'].indexOf(request.msgtype) == -1) {
                                    // update last_request_at timestamp (exceptions are invalid pubkeys and get_password messages)
                                    if (!session_info.last_request_at || (file_timestamp > session_info.last_request_at)) session_info.last_request_at = file_timestamp ;
                                }
                            }
                            ls_save_sessions() ;
                            console.log(pgm + 'request = ' + JSON.stringify(request)) ;
                            console.log(pgm + 'timestamps: file_timestamp = ' + file_timestamp + ', response_timestamp = ' + response_timestamp + ', request_timestamp = ' + request_timestamp + ', now = ' + now) ;
                            console.log(pgm + 'session_info = ' + JSON.stringify(session_info)) ;
                            if (response_timestamp) {
                                // response was requested
                                console.log(pgm + 'response = ' + JSON.stringify(response)) ;
                                console.log(pgm + 'encryptions = ' + JSON.stringify(encryptions)) ;
                            }
                            else return ; // exit. no response was requested

                            // send response to other session
                            encrypt2.send_message(response, {timestamp: response_timestamp, msgtype: request.msgtype, request: file_timestamp, encryptions: encryptions}, function (res)  {
                                var pgm = service + '.process_incoming_message send_message callback 3: ';
                                console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                            }) ; // send_message callback 3

                        } ; // done_and_send

                        // validate and process incoming json message and process
                        response = { msgtype: 'response' } ;
                        error = MoneyNetworkAPILib.validate_json(pgm, request) ;
                        if (error) response.error = 'message is invalid. ' + error ;
                        else if (request.msgtype == 'pubkeys') {
                            // first message from wallet. received public keys from wallet session
                            if (!request.password) response.error = 'Password is required in pubkeys message from wallet' ;
                            else if (session_info) response.error = 'Public keys have already been received. Keeping old session information' ;
                            else if (!encrypt2.extra && encrypt2.extra.url) response.error = 'No site url was found for this session' ;
                            else {
                                encrypt2.setup_encryption({pubkey: request.pubkey, pubkey2: request.pubkey2}) ;
                                console.log(pgm + 'saving session password. used for wallet session restore. See get_password and password messages');
                                // console.log(pgm + 'setting last_request_at: encrypt2.session_at = ' + encrypt2.session_at + ', file_timestamp = ' + file_timestamp);
                                session_info = {
                                    url: encrypt2.extra.url,
                                    password: request.password, // encrypted session password pwd2
                                    pubkey: encrypt2.other_session_pubkey,
                                    pubkey2: encrypt2.other_session_pubkey2,
                                    last_request_at: file_timestamp,
                                    done: {}
                                } ;
                                if (!ls_sessions[sessionid]) ls_sessions[sessionid] = {} ;
                                ls_sessions[sessionid][SESSION_INFO_KEY] = session_info ;
                            }
                        }
                        else if (request.msgtype == 'save_data') {
                            // received data_data request from wallet session.
                            console.log(pgm + 'save wallet data in MN localStorage') ;
                            if (!ls_sessions[sessionid]) ls_sessions[sessionid] = {} ;
                            for (i=0 ; i<request.data.length ; i++) {
                                key = request.data[i].key ;
                                if (key == SESSION_INFO_KEY) continue ;
                                value = request.data[i].value ;
                                ls_sessions[sessionid][key] = value ;
                            }
                        }
                        else if (request.msgtype == 'delete_data') {
                            // received delete_data request from wallet session.
                            console.log(pgm + 'delete wallet data saved in MN localStorage') ;
                            if (!ls_sessions[sessionid]) null ; // OK - no data
                            else if (!request.keys) {
                                // OK - no keys array - delete all data
                                for (key in ls_sessions[sessionid]) {
                                    if (key == SESSION_INFO_KEY) continue ;
                                    delete ls_sessions[sessionid][key] ;
                                }
                            }
                            else {
                                // keys array. deleted requested keys
                                for (i=0 ; i<request.keys.length ; i++) {
                                    key = request.keys[i].key ;
                                    if (key == SESSION_INFO_KEY) continue ;
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
                                    if (key == SESSION_INFO_KEY) continue ; // special key used for session restore
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
                                var pgm = service + '.process_incoming_message get_session_filenames callback 3: ';
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
                        else if (request.msgtype == 'ping') {
                            // simple session ping. always OK response
                        }
                        else if (request.msgtype == 'balance') {
                            // received balance message from wallet. save + OK response
                            session_info.balance = request.balance ;
                            session_info.balance_at = new Date().getTime() ;
                            ls_save_sessions() ;
                        }
                        else response.error = 'Unknown msgtype ' + request.msgtype ;

                        // finish message processing. marked as done and send any response
                        done_and_send(response, encryptions) ;

                    }) ; // decrypt_json callback 2
                }) ; // fileGet callback 1

            } // try
            catch (e) {
                console.log(pgm + e.message) ;
                console.log(e.stack);
                throw(e) ;
            } // catch

        } // process_incoming_message

        // add callback for incoming messages from wallet session(s)
        MoneyNetworkAPILib.config({cb: process_incoming_message}) ;

        // init wallet service after client log in
        function w_login () {
            var pgm = service + '.w_login: ' ;
            console.log(pgm + 'getting sessions ...') ;
            ls_sessions = ls_get_sessions() ; // sessionid => hash with saved wallet data
            //console.log(pgm + 'ls_sessions = ' + JSON.stringify(ls_sessions)) ;

            get_my_user_hub(function (hub) {
                var user_path ;
                user_path = 'merged-MoneyNetwork/' + hub + '/data/users/' + ZeroFrame.site_info.auth_address + '/';
                MoneyNetworkAPILib.config({this_user_path: user_path});
                // setup session instances and listen for incoming messages
                create_sessions() ;
            }) ;
        } // w_login

        // reset wallet service after client log out
        function w_logout () {
            ls_sessions = null ;
            MoneyNetworkAPILib.delete_all_sessions() ;
        }

        // return list with currencies.
        var js_currencies = [] ;
        function get_currencies (cb) {
            var pgm = service + '.get_currencies: ' ;
            var currencies, wallet_sha256_values, sessionid, session_info, i, balance ;
            if (!ls_sessions) return [] ; // error?
            currencies = [] ;
            wallet_sha256_values = [] ;
            for (sessionid in ls_sessions) {
                session_info = ls_sessions[sessionid][SESSION_INFO_KEY];
                if (!session_info) continue;
                //if (!session_info.currencies) continue;
                if (!session_info.balance) continue;
                // console.log(pgm + 'session_info = ' + JSON.stringify(session_info)) ;
                for (i=0 ; i<session_info.balance.length ; i++) {
                    balance = JSON.parse(JSON.stringify(session_info.balance[i])) ;
                    balance.balance_at = session_info.balance_at ;
                    balance.sessionid = sessionid ;
                    balance.wallet_sha256 = session_info.wallet_sha256 ;
                    currencies.push(balance) ;
                    wallet_sha256_values.push(session_info.wallet_sha256) ;
                } // for i
            }
            if (!currencies.length) return cb(currencies) ; // no wallet / no balance info was found

            // find full wallet info from sha256 values
            console.log(pgm + 'wallet_sha256_values = ' + JSON.stringify(wallet_sha256_values)) ;
            MoneyNetworkAPILib.get_wallet_info(wallet_sha256_values, function (wallet_info) {
                var wallet_sha256, i, key, balance, j, k, currency ;
                console.log(pgm + 'wallet_info = ' + JSON.stringify(wallet_info)) ;
                //wallet_info = {
                //    "6ef0247021e81ae7ae1867a685f0e84cdb8a61838dc25656c4ee94e4f20acb74": {
                //        "wallet_address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                //        "wallet_title": "MoneyNetworkW2",
                //        "wallet_description": "Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro",
                //        "currencies": [{
                //            "code": "tBTC",
                //            "name": "Test Bitcoin",
                //            "url": "https://en.bitcoin.it/wiki/Testnet",
                //            "units": [{"unit": "BitCoin", "factor": 1}, {"unit": "Satoshi", "factor": 1e-8}]
                //        }],
                //        "wallet_sha256": "6ef0247021e81ae7ae1867a685f0e84cdb8a61838dc25656c4ee94e4f20acb74"
                //    }
                //};
                if (!wallet_info || (typeof wallet_info != 'object') || wallet_info.error) {
                    console.log(pgm + 'could not find wallet_info for sha256 values ' + JSON.stringify(wallet_sha256_values) + '. wallet_info = ' + JSON.stringify(wallet_info)) ;
                }
                else for (wallet_sha256 in wallet_info) {
                    for (i=0 ; i<currencies.length ; i++) {
                        if (wallet_sha256 != currencies[i].wallet_sha256) continue ;
                        // copy wallet info to currency (wallet_address, wallet_title, wallet_description and currencies
                        for (key in wallet_info[wallet_sha256]) {
                            currencies[i][key] = wallet_info[wallet_sha256][key] ;
                        } // for key
                        break ;
                    } // for i
                } // for wallet_sha256

                // copy full wallet info into currencies array
                for (i=currencies.length-1 ; i >= 0 ; i--) {
                    if (currencies[i].wallet_address) continue ;
                    console.log(pgm + 'removing currency/balance info with unknown wallet_sha256. ' + JSON.stringify(currencies[i])) ;
                    currencies.splice(i,1) ;
                }
                console.log(pgm + 'sessions (after get_currencies) = ' + JSON.stringify(ls_sessions)) ;

                // move currency info (name, url and units) to currency rows for easy filter and sort
                for (i=currencies.length-1 ; i>=0 ; i--) {
                    balance = currencies[i] ;
                    if (!balance.currencies || !balance.currencies.length) {
                        console.log(pgm + 'no currencies array was found in ' + JSON.stringify(balance)) ;
                        currencies.splice(i,1) ;
                        continue ;
                    }
                    j = -1 ;
                    for (k=0 ; k<balance.currencies.length ; k++) {
                        if (balance.currencies[k].code != balance.code) continue ;
                        j = k ;
                        break ;
                    } // for k
                    if (j == -1) {
                        console.log(pgm + 'error in balance. Currency code ' + balance.code + ' was not found. balance = ' + JSON.stringify(balance)) ;
                        currencies.splice(i,1) ;
                        continue ;
                    }
                    // merge balance and currency information
                    currency = balance.currencies[j] ;
                    for (key in currency) {
                        if (!currency.hasOwnProperty(key)) continue ;
                        balance[key] = currency[key] ;
                    }
                    delete balance.currencies ;
                } // for i

                // todo: merge new currencies array into angularJS currencies array js_currencies (insert, update, delete)

                cb(currencies) ;

            }) ; // get_wallet_info


        } // get_currencies

        // export MoneyNetworkWService API
        return {
            get_session_info_key: get_session_info_key,
            ls_get_sessions: ls_get_sessions,
            ls_save_sessions: ls_save_sessions,
            w_login: w_login,
            w_logout: w_logout,
            get_currencies: get_currencies
        };

        // end MoneyNetworkWService
    }]) ;
