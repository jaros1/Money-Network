angular.module('MoneyNetwork')

    // MoneyNetworkWService:
    // - wallet functions

    .factory('MoneyNetworkWService', ['$timeout', '$rootScope', '$window', '$location', 'dateFilter', 'MoneyNetworkHubService',
                             function($timeout, $rootScope, $window, $location, date, moneyNetworkHubService)
    {
        var service = 'MoneyNetworkWService' ;
        console.log(service + ' loaded') ;

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
            var sessions_str, sessions, sessionid, session_info, migrate, delete_sessions ;
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
            console.log(pgm + 'sessions = ' + JSON.stringify(sessions)) ;
            //sessions = {
            //    "acpo0lstqzcpkskad9olzvbm1xdmgx1zpqbr4cn1jsf39nfexbuaikgcndfe": {
            //        "_$session_info": {
            //            "password": "U2FsdGVkX18YSwwUOLQS9lMqivpF7ynNzNXBuOOFvy91i/JApuPUiFRH4ViMQvezXD6tS+4AXZYZJd7f98EeW4V74+RvcfjHg2VFmUQvS4U=",
            //            "pubkey": "-----BEGIN PUBLIC KEY-----\nMIGeMA0GCSqGSIb3DQEBAQUAA4GMADCBiAKBgHzoMPSwwM8z1P7eZzjNFe7Md6Ds\nkMhR0DlUvTlJOtxfZ/KENMsBIl45pize7sGJxpAmIJQG1JQzOp9R0qFW22geoK5q\nbn8WGHNHRyRObjpqDpRkwiovCz5DtP0AFvliawhFj60WEV56gL5sFoJ0/154MbZZ\nt2nA0/i76YJLfZHxAgMBAAE=\n-----END PUBLIC KEY-----",
            //            "pubkey2": "Ahn94vCUvT+S/nefej83M02n/hP8Jvqc8KbxMtdSsT8R",
            //            "last_request_at": 1501605913768,
            //            "done": {}
            //        },
            //        "login": "{\"encryption\":2,\"message\":\"[\\\"Dnef0YhfD7BjhXMkn6J1eALKACDwb/P2VcCNxmg8YZjZfnyfkqrEJeMi8Cs2yzpc66XAxgAgF0ixkr+/6RpVdh/RG9e3xc+BMazkPLC5ZPAnd+ruYtb2K6sa4Pbi53oycO+gpxi+ytH9H+M09FiPGJkeoXiZEBu7k8PnSCme6WdBayJREh6w7EAQiOtnTzlA9AgUNU/HEY7k4X7+w/LR+i6NS9kF/A==\\\",\\\"VJ3dEcnYYa5sqmFHUtPKcw==\\\",\\\"yUSuG8+U0pJ2uLFAoNpg1eNMg9V3xhpLUPc0oS+h4EOGxzhd9kHgD9nmsTop4DXBXFupBUxsL/WDaGeroxZSstySdlLkCOC7ZAz56VhLATUNCiF5KYetE+QFt+dFEdaUYCjEXONHKQAAcL8juPybkQ==\\\"]\"}"
            //    },
            //    "uzeptj8mlixhtbrhdnilhdvmxiujufrkk6lp0uj5wpglxsuktcrobm0s2i7n": {
            //        "_$session_info": {
            //            "password": "U2FsdGVkX1/5ItpxUyRH1ZiZuoyN1tCvLUKpSogDnVDvBNLcODVLijUC52N8WBSYf3hBxXzQZYjkRqKdk79oS5Rp/nJ3rq9bSgoodVJPxyU=",
            //            "pubkey": "-----BEGIN PUBLIC KEY-----\nMIGeMA0GCSqGSIb3DQEBAQUAA4GMADCBiAKBgHsgCP4qEflm0HEXYUO5dP+UOENN\n7C5K8H7aFVmhwc32PwySbLcdQDbWpFhX6cKODQOC5gJNSnzoEHqxrNeCO97yXe/P\nyzVVjHlq56a16IC2lB/SSnUh5ipjfC4grFK9ZlMUpHUDN/j5oxzUnK/QLd5L1wLO\nsITFawX1WuxB9FERAgMBAAE=\n-----END PUBLIC KEY-----",
            //            "pubkey2": "AjNp+TH4ho3DEmyfa73v447KWgv/W8t3R94/mY+ib/2+",
            //            "last_request_at": 1501597939326,
            //            "done": {}
            //        },
            //        "login": "{\"encryption\":2,\"message\":\"[\\\"WI3ge3bR3OZVOadRHc8AiwLKACAd2cWrwglaHK4iPWh7gfZbDxRo8q1HGI+GulQw5mN+aAAgeEqjcT52OIl/Dg+izATqSoc12gQxnnpE3jYX93oc+gdRMv8M6S0Z6LDKt1BbUo8UVtvizaa6UwXw/H4wGsjHnQ6Dihc/x06MpnLl8LHlb+m8onDHy4w7h+m3riKACnQUlnaIyHK6Vi2+996xzr0VQw==\\\",\\\"BjuhlcJk3ZCYmUbbefKJ5w==\\\",\\\"z1+K4KvYnepB5bO2K3lUB8o3V+IaYZtbuYmMapg7BJAGSFLipvegj501tF88orzgbaMMmUG9+Y6GuIl4MNaoqkWZBAIn896KeL/jiuzpaKri0Wlq3uydbQftWfBOGUkL5biZz3jC6MF/p92JOimpVg==\\\"]\"}"
            //    },
            //    "odcbtal2lclghgcezhf6vzpue46yuvfjskezvt9ixmgnjdziyzug09jrij16": {
            //        "_$session_info": {
            //            "password": "U2FsdGVkX18+bh2RYZzvbeLoCqsGvj12eTfL7T/3frFfO9VQbgLpGAEsO+5QZjH3JrRr9wmGjIe+O6SojshHm8XdgZvYV19msuyWh+HX0XE=",
            //            "pubkey": "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDjZGACcz2Swp07gN7+use66NvA\nIAxvMpykW7qcG3MP2DTDH3mKg1JlY40U4SwP5CE1LGmOJN7Saymoh2W9i0oHzxvR\n+b+bNcoG09eYZuinH1M7FB9wx8RxcfbNH+lzoAtU4HVnGrtrLG5X2SM9Cx+FN9cw\ncdVCdwU1IqwILPyDCwIDAQAB\n-----END PUBLIC KEY-----",
            //            "pubkey2": "Ahn94vCUvT+S/nefej83M02n/hP8Jvqc8KbxMtdSsT8R",
            //            "last_request_at": 1503050724533,
            //            "done": {}
            //        },
            //        "login": "{\"encryption\":2,\"message\":\"[\\\"Wl3rYLBR1WSWAn+gC1bRcwLKACCZMdIBYAa8hYLxRdZz8ELqw4/612JsIe4GdDyB0X5I9wAgk3y1RAr8kahveSo3O9S8McoRnTmhhxUY2RpVZRERyYiY2sNWwyu+9/CmY9f7vokh4eUkVC87Hoabvgboc0F+RwwH5gApwKcWvTEh4dRGjcLhxRQryv2TyK+57OiWGskNmQQwLmpXB30JgKFNPly/jw==\\\",\\\"FpR1Mtv9SUrC1CcrxVL/aQ==\\\",\\\"NZbluBmYtnf9vXy3ffUjbn18Dg7PgbtufA2TcRaMVU8a5XT7ZX4UNj/S9GFF+xm7VLc0C62L8ZJtLg1wa0tL7pSWaKd8TbuIVhzk/n/9J8sE1dFm9ttJawT6N19qyg9jQBTA9GuxikUSBUVFP+u3cQ==\\\"]\"}"
            //    },
            //    "z1a4wzejn0bifkglpblefqqedevpdiyissdstq5kbppardmbzdytbtrzkp2w": {
            //        "_$session_info": {
            //            "password": "U2FsdGVkX1+6+X4pSDQOf8/Bb+3xG+nFQDyhr3/7syi+wYXKEZ6UL49dB2ftq1gmC5/LKfI2XfJS2fEsEy5CYscRBDuoUxJEqKNwiiiiXBA=",
            //            "pubkey": "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCsOMfAvHPTp0K9qZfoItdJ9898\nU3S2gAZZSLuLZ1qMXr1dEnO8AwxS58UvKGwHObT1XQG8WT3Q1/6OGlJms4mYY1rF\nQXzYEV5w0RlcSrMpLz3+nJ7cVb9lYKOO8hHZFWudFRywkYb/aeNh6mAXqrulv92z\noX0S7YMeNd2YrhqefQIDAQAB\n-----END PUBLIC KEY-----",
            //            "pubkey2": "Ahn94vCUvT+S/nefej83M02n/hP8Jvqc8KbxMtdSsT8R",
            //            "last_request_at": 1503137602267,
            //            "done": {},
            //            "url": "/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1"
            //        }
            //    },
            //    "wslrlc5iomh45byjnblebpvnwheluzzdhqlqwvyud9mu8dtitus3kjsmitc1": {
            //        "_$session_info": {
            //            "url": "/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
            //            "password": "U2FsdGVkX18MyosYqdGVowB1nw/7Nm2nbzATu3TexEXMig7rjInIIr13a/w4G5TzFLFz9GE+rqGZsqRP+Ms0Ez3w8cA9xNhPjtrhOaOkT1M=",
            //            "pubkey": "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCuM/Sevlo2UYUkTVteBnnUWpsd\n5JjAUnYhP0M2o36da15z192iNOmd26C+UMg0U8hitK8pOJOLiWi8x6TjvnaipDjc\nIi0p0l3vGBEOvIyNEYE7AdfGqW8eEDzzl9Cezi1ARKn7gq1o8Uk4U2fjkm811GTM\n/1N9IwACfz3lGdAm4QIDAQAB\n-----END PUBLIC KEY-----",
            //            "pubkey2": "Ahn94vCUvT+S/nefej83M02n/hP8Jvqc8KbxMtdSsT8R",
            //            "last_request_at": 1503235635135,
            //            "done": {}
            //        }
            //    }
            //} ;

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
                        error = encrypt2.validate_json(pgm, request) ;
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
            create_sessions() ;
            get_my_user_hub(function (hub) {
                var user_path ;
                user_path = 'merged-MoneyNetwork/' + hub + '/data/users/' + ZeroFrame.site_info.auth_address + '/';
                MoneyNetworkAPILib.config({this_user_path: user_path});
            }) ;
        } // w_login

        // reset wallet service after client log out
        function w_logout () {
            ls_sessions = null ;
            MoneyNetworkAPILib.delete_all_sessions() ;
        }

        // export MoneyNetworkWService API
        return {
            get_session_info_key: get_session_info_key,
            ls_get_sessions: ls_get_sessions,
            ls_save_sessions: ls_save_sessions,
            w_login: w_login,
            w_logout: w_logout
        };

        // end MoneyNetworkWService
    }]) ;
