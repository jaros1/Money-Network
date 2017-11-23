angular.module('MoneyNetwork')

    // MoneyNetworkWService:
    // - wallet functions

    .factory('MoneyNetworkWService', ['$timeout', '$rootScope', '$window', '$location', 'dateFilter', 'MoneyNetworkHubService', '$sanitize',
                             function($timeout, $rootScope, $window, $location, date, moneyNetworkHubService, $sanitize)
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

        // debug wrappers
        function show_debug (keys) {
            return MoneyNetworkHelper.show_debug(keys) ;
        } // show_debug
        function debug (keys, text) {
            MoneyNetworkHelper.debug(keys, text) ;
        } // debug
        function debug_z_api_operation_start (pgm, inner_path, cmd, debug_this) {
            return MoneyNetworkAPILib.debug_z_api_operation_start(pgm, inner_path, cmd, debug_this) ;
        }
        function debug_z_api_operation_end (debug_seq, res) {
            MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq, res) ;
        }
        function format_res (res) {
            return res == 'ok' ? 'OK' : 'Failed. error = ' + JSON.stringify(res) ;
        }

        // import functions from other services
        function z_file_get (pgm, options, cb) {
            moneyNetworkHubService.z_file_get(pgm, options, cb) ;
        }
        function get_my_user_hub (cb) {
            moneyNetworkHubService.get_my_user_hub(cb) ;
        }

        // setup MoneyNetworkLib. Most important. inject ZeroFrame into library
        MoneyNetworkAPILib.config({
            debug: z_cache.user_setup.debug && z_cache.user_setup.debug.money_network_api,
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
                if (!session_info[SESSION_INFO_KEY].last_request_at) {
                    delete_sessions.push(sessionid) ;
                    continue ;
                }
                if (!session_info[SESSION_INFO_KEY].url) {
                    delete_sessions.push(sessionid) ;
                    continue ;
                }
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
                        prvkey: prvkey,
                        pubkey: session_info.pubkey,
                        userid2: userid2,
                        pubkey2: session_info.pubkey2,
                        debug: z_cache.user_setup.debug && z_cache.user_setup.debug.money_network_api
                    }) ;
                }
                catch (e) {
                    console.log(pgm + 'error. could not create a session with sessionid ' + sessionid + '. error = ' + (e.message || 'see previous message in log')) ;
                }
            } // for sessionid

            // check sessions. incoming files. compare list of done files in ls_sessions with incoming files on file system (dbQuery)
            MoneyNetworkAPILib.get_sessions(function (sessions1) {
                var sessions2, sessions3, i, step_1_find_incoming_files, step_2_cleanup_ls_done_files, step_3_find_old_outgoing_files ;
                sessions2 = {} ; // from other_session_filename to hash with not deleted files (incoming files from other session)
                sessions3 = {} ; // from sessionid to hash with not deleted files (incoming files from other session)

                console.log(pgm + 'sessions1 = ' + JSON.stringify(sessions1)) ;
                //sessions1 = [
                //    {
                //        "other_session_filename": "1530742720",
                //        "sessionid": "z1a4wzejn0bifkglpblefqqedevpdiyissdstq5kbppardmbzdytbtrzkp2w",
                //        "session_at": 1505663493707,
                //        "this_session_filename": "ddbb4f18a7"
                //    },
                //    ...
                //    {
                //        "other_session_filename": "16276a26dc",
                //        "sessionid": "wslrlc5iomh45byjnblebpvnwheluzzdhqlqwvyud9mu8dtitus3kjsmitc1",
                //        "session_at": 1505663493709,
                //        "this_session_filename": "3f6561327a"
                //    }
                //];

                // My cert_user_id is jro@zeroid.bit, my auth address is 18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ,
                // my unique id be4e96172fe3a8cafdf30057a8e8f4409c7b538383b3d7e1b3c35603eaa076d5 and my user data hub is1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh

                // reformat sessions1 array
                for (i=0 ; i<sessions1.length ; i++) {
                    sessions2[sessions1[i].other_session_filename] = {sessionid: sessions1[i].sessionid, files: {}}
                }
                console.log(pgm + 'sessions2 = ' + JSON.stringify(sessions2)) ;

                // callback chain step 1-3

                // find old outgoing files. delete old outgoing files except offline transactions
                step_3_find_old_outgoing_files = function(){
                    var pgm = service + '.create_sessions.step_3_find_old_outgoing_files: ';
                    get_my_user_hub(function (hub) {
                        var pgm = service + '.create_sessions.step_3_find_old_outgoing_files get_my_user_hub callback 1: ';
                        var mn_query_20, debug_seq;

                        // query 1. simple get all optional files for current user directory
                        // todo: optional files and actual files on file system can be out of sync. Should delete files_optional + sign to be sure that optional files and file system matches
                        mn_query_20 =
                            "select files_optional.filename from json, files_optional " +
                            "where directory like '" + hub + "/data/users/" + ZeroFrame.site_info.auth_address + "' " +
                            "and file_name = 'content.json' " +
                            "and files_optional.json_id = json.json_id";
                        console.log(pgm + 'mn query 20 = ' + mn_query_20);
                        debug_seq = debug_z_api_operation_start(pgm, 'mn query 20', 'dbQuery', show_debug('z_db_query')) ;
                        ZeroFrame.cmd("dbQuery", [mn_query_20], function (res) {
                            var pgm = service + '.create_sessions.step_3_find_old_outgoing_files dbQuery callback 2: ';
                            var files, i, re, filename, this_session_filename, timestamp, session_info, sessionid,
                                session_at, delete_files, content_lock_pgm ;
                            debug_z_api_operation_end(debug_seq, (!res || res.error) ? 'Failed. error = ' + JSON.stringify(res) : 'OK') ;
                            if (res.error) {
                                console.log(pgm + 'query failed. error = ' + res.error);
                                console.log(pgm + 'query = ' + mn_query_20);
                                return;
                            }
                            // console.log(pgm + 'res = ' + JSON.stringify(res)) ;

                            // map from valid this_session_filename to session_info and list with any offline transactions
                            session_at = {} ;
                            session_info = {} ;
                            for (i=0 ; i<sessions1.length ; i++) {
                                this_session_filename = sessions1[i].this_session_filename ;
                                sessionid = sessions1[i].sessionid ;
                                if (!ls_sessions[sessionid]) continue ; // error
                                session_at[this_session_filename] = sessions1[i].session_at ;
                                session_info[this_session_filename] = ls_sessions[sessionid][SESSION_INFO_KEY] ;
                            } // i
                            console.log(pgm + 'session_at = ' + JSON.stringify(session_at)) ;
                            //session_at = {"ddbb4f18a7":1505752737688,"825c05a018":1505752737681,"3af9a70f1f":1505752737683,"02db2101c5":1505752737685,"3f6561327a":1505752737691};

                            console.log(pgm + 'session_info = ' + JSON.stringify(session_info)) ;
                            //session_info = {
                            //    "321d8862f5": {
                            //        "url": "/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                            //        "password": "U2FsdGVkX19iL6wnPP84sSo6TlOyQHdPsUqUtCKH3QoNaClcnDJkcPFE+ItPJynN5kxbIfIK0FsYax71sepSv3KMeY2dmR5cbktqPWIbrwA=",
                            //        "pubkey": "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCNumor5vV8pEHtE3FWhv9MmQME\naQep9KXbIiTmTiJGnWvmw1EC3kJva+1koqqlLYY/G21jz/Q3Gay8FBcnjeimBlJB\nledV/Bt691anangfwBvKgjalESUttW102IRLGtYtYeI81j21Un1jWoHQp6fBymXx\nmZ3B9rS3lp+M9DykEQIDAQAB\n-----END PUBLIC KEY-----",
                            //        "pubkey2": "Ahn94vCUvT+S/nefej83M02n/hP8Jvqc8KbxMtdSsT8R",
                            //        "last_request_at": 1507616030739,
                            //        "done": {},
                            //        "wallet_sha256": "e488d78dc26af343688045189a714658ed0f7975d4db158a7c0c5d0a218bfac7",
                            //        "balance": [{"code": "tBTC", "amount": 0}],
                            //        "balance_at": 1507568361090
                            //    },
                            //    "d945ff7e85": {
                            //        "url": "/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                            //        "password": "U2FsdGVkX1+IOSQPCF04ySBK8zhg60jVZzHnCjMbe//VNaPODlAgjkbvJxvalkrCnRtPO3X/f9oJL9idwczRaZnjTkJuW+Dzjch/tFqCBZ0=",
                            //        "pubkey": "-----BEGIN PUBLIC KEY-----\nMIGeMA0GCSqGSIb3DQEBAQUAA4GMADCBiAKBgGIQnT7AZjmmKJswjbDYeSv4V3D6\n3oNGaMT24VFTwyksQAzV3L+ghC5jo/UjOshRM7QlNw+W9eTV5hNgzvQqxkj4BAiS\nEw81FfKxXy9+oPubTNXC8uaxaMr7W7EG5Edfj51PENyB58fMdIoy4D7QOB2sB7LV\nvYOTzldDfyAdC3PLAgMBAAE=\n-----END PUBLIC KEY-----",
                            //        "pubkey2": "Ahn94vCUvT+S/nefej83M02n/hP8Jvqc8KbxMtdSsT8R",
                            //        "last_request_at": 1509609731349,
                            //        "done": {},
                            //        "balance": [{"code": "tBTC", "amount": 3.70329233}],
                            //        "balance_at": 1509293172666,
                            //        "wallet_sha256": "e488d78dc26af343688045189a714658ed0f7975d4db158a7c0c5d0a218bfac7"
                            //    },
                            //    "1eec760f38": {
                            //        "url": "/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                            //        "password": "U2FsdGVkX1+2EvM8Zz6AYIfySIXdzTH3UWCTGjfmLo5q79a5ASUaytMLV/WcSZ2Vo47MVxRo9Tb6vxDhSNEwb2aXc9za4ZLrxcCVK+Nz5nk=",
                            //        "pubkey": "-----BEGIN PUBLIC KEY-----\nMIGeMA0GCSqGSIb3DQEBAQUAA4GMADCBiAKBgGBVaZ72wO7d8ccK/u3LmafaKi4c\nVxYYcpqbsszzPOaeyv8lMLEWPGVadrLWi8EMo1FavyYqvoyz/26laHmtqiROU3m3\nLy6DoPWnJySp7YaUmRKZsPoLzGOWSypdJfDX67N+TB2QvBzvZsSIWGwBUZ33oGbw\nub5E7V947qif06yVAgMBAAE=\n-----END PUBLIC KEY-----",
                            //        "pubkey2": "Ahn94vCUvT+S/nefej83M02n/hP8Jvqc8KbxMtdSsT8R",
                            //        "last_request_at": 1509646582519,
                            //        "done": {},
                            //        "wallet_sha256": "e488d78dc26af343688045189a714658ed0f7975d4db158a7c0c5d0a218bfac7",
                            //        "balance": [{"code": "tBTC", "amount": 3.70329233}],
                            //        "balance_at": 1509611126583
                            //    }
                            //};

                            re = new RegExp('^[0-9a-f]{10}(-i|-e|-o|-io)\.[0-9]{13}$');
                            files = [] ;
                            for (i=0 ; i<res.length ; i++) if (res[i].filename.match(re)) files.push(res[i].filename) ;
                            console.log(pgm + 'files = ' + JSON.stringify(files)) ;
                            //files = ["3f6561327a.1474665067076", "3f6561327a.1472282567643", "3f6561327a.1475706471612", "3f6561327a.1475685146639", "3f6561327a.1472197202640", "3f6561327a.1471393354195", "3f6561327a.1475916076111", "3f6561327a.1473627685854", "3f6561327a.1475251057063", "3f6561327a.1472104626705", "3f6561327a.1471831583539", "3f6561327a.1474478812729", "3f6561327a.1474804539180", "3f6561327a.1476205886263", "3f6561327a.1473249405340", "3f6561327a.1472026664343", "3f6561327a.1476424181413", "3f6561327a.1471564536590", "3f6561327a.1473646753222", "3f6561327a.1471917524352", "3f6561327a.1471976592878", "3f6561327a.1474745414662", "3f6561327a.1476135581171", "3f6561327a.1474122722696", "3f6561327a.1476073867217", "3f6561327a.1473167872165", "3f6561327a.1476559711025", "3f6561327a.1472449416593", "3f6561327a.1473033703401", "3f6561327a.1475796712277", "3f6561327a.1471856461133", "3f6561327a.1473010786666", "3f6561327a.1474654532839", "3f6561327a.1474248258663", "3f6561327a.1471503749260", "3f6561327a.1471976734587", "3f6561327a.1475238729722", "3f6561327a.1473441766500", "3f6561327a.1473785926028", "3f6561327a.1476013919996", "3f6561327a.1472925485650", "3f6561327a.1473709828898", "3f6561327a.1473449375291", "3f6561327a.1474056537691", "3f6561327a.1471712354236", "3f6561327a.1473731777757", "3f6561327a.1475378942077", "3f6561327a.1473523004275", "3f6561327a.1474437441649", "3f6561327a.1475932891045", "3f6561327a.1476185082949", "3f6561327a.1476240602333", "3f6561327a.1472395916104", "3f6561327a.1473306586555"];

                            delete_files = [] ;
                            for (i=0 ; i<files.length ; i++) {
                                filename = files[i] ;
                                this_session_filename = filename.substr(0,10) ;
                                if (!session_info[this_session_filename]) {
                                    // unknown session
                                    delete_files.push(filename) ;
                                    continue ;
                                }
                                timestamp = parseInt(filename.substr(11)) ;
                                if (timestamp == 0) {
                                    // special file with timestamps for offline transactions (encrypted)
                                    if (!session_info[this_session_filename].offline || !session_info[this_session_filename].offline.length) {
                                        // no offline transactions. delete file with offline transactions
                                        delete_files.push(filename) ;
                                    }
                                }
                                else if (timestamp < session_at[this_session_filename]) {
                                    // old outgoing message
                                    if (!session_info[this_session_filename].offline || (session_info[this_session_filename].offline.indexOf(timestamp) == -1)) {
                                        // old outgoing message not in offline transactions
                                        delete_files.push(filename) ;
                                    }
                                }
                            } // i
                            console.log(pgm + 'delete_files = ' + JSON.stringify(delete_files)) ;
                            if (!delete_files.length) return ;

                            // start content update. publish and content update cannot run at the same time
                            // start long running transaction. Do not publish while updatering content and verse versa
                            MoneyNetworkAPILib.start_transaction(pgm, function(transaction_timestamp) {

                                var delete_ok, delete_failed, delete_file ;

                                // delete file loop
                                delete_ok = [] ;
                                delete_failed = [] ;
                                delete_file = function() {
                                    var pgm = service + '.create_sessions.step_3_find_old_outgoing_files.delete_file: ';
                                    var filename, inner_path, debug_seq ;
                                    if (!delete_files.length) {
                                        // finish deleting optional files
                                        if (!delete_ok.length) {
                                            // nothing to sign
                                            MoneyNetworkAPILib.end_transaction(transaction_timestamp) ;
                                            return ;
                                        }
                                        inner_path = 'merged-MoneyNetwork/' + hub + '/data/users/' + ZeroFrame.site_info.auth_address + '/content.json' ;
                                        // debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_site_publish', pgm + 'sign') ;
                                        debug_seq = debug_z_api_operation_start(pgm, inner_path, 'siteSign', show_debug('z_site_publish')) ;
                                        ZeroFrame.cmd("siteSign", {inner_path: inner_path}, function (res) {
                                            var pgm = service + '.create_sessions.step_3_find_old_outgoing_files.delete_file siteSign callback: ';
                                            // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                            debug_z_api_operation_end(debug_seq, format_res(res)) ;
                                            if (res != 'ok') console.log(pgm + inner_path + ' siteSign failed. error = ' + res) ;
                                            // done with or without errors. end content update.
                                            MoneyNetworkAPILib.end_transaction(transaction_timestamp) ;
                                        }) ;
                                        return ;
                                    }
                                    // delete next file
                                    filename = delete_files.shift() ;
                                    inner_path = 'merged-MoneyNetwork/' + hub + '/data/users/' + ZeroFrame.site_info.auth_address + '/' + filename ;
                                    // debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_delete', pgm + inner_path + ' fileDelete') ;
                                    debug_seq = debug_z_api_operation_start(pgm, inner_path, 'fileDelete', show_debug('z_file_delete')) ;
                                    ZeroFrame.cmd("fileDelete", inner_path, function (res) {
                                        // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                        debug_z_api_operation_end(debug_seq, format_res(res)) ;
                                        if (res == 'ok') delete_ok.push(filename) ;
                                        else {
                                            console.log(pgm + inner_path + ' fileDelete failed. error = ' + res) ;
                                            delete_failed.push(filename) ;
                                        }
                                        // continue with next file
                                        delete_file() ;
                                    }); // fileDelete
                                } ; // delete_file
                                // start delete file loop
                                delete_file() ;

                            }) ; // start_transaction callback 3

                        }); // dbQuery callback 2

                    }) ; // get_my_user_hub callback 1

                } ; // step_3_find_old_outgoing_files

                // step 2: cleanup done lists in ls_sessions
                step_2_cleanup_ls_done_files = function() {
                    var pgm = service + '.create_sessions.step_2_cleanup_ls_done_files: ';
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
                    // next step
                    step_3_find_old_outgoing_files() ;
                }; // step_2_cleanup_ls_done_files

                // step 1: dbQuery - find incoming not deleted messages
                step_1_find_incoming_files = function () {
                    var pgm = service + '.create_sessions.step_1_find_incoming_files: ';
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
                        var pgm = service + '.create_sessions.step_1_find_incoming_files dbQuery callback: ';
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
                        step_2_cleanup_ls_done_files() ;

                    }) ; // dbQuery callback

                }; // step_1_find_files

                // start callback chain step 1-2
                step_1_find_incoming_files() ;

            }) ; // get_sessions callback

        } // create_sessions

        // generic callback function to handle incoming messages from wallet session:
        // params:
        // - filename: full merger site inner path for received message
        // - encrypt: MoneyNetworkAPI instance for wallet session
        // - encrypted_json_str: string with encrypted json object (fileget = true in MoneyNetworkAPI setup)
        // - request: unencrypted json message (decrypt = true in MoneyNetworkAPI setup)
        // - extra: extra info about received file and operation. See MoneyNetworkAPI.message_demon
        function process_incoming_message(filename, encrypt, encrypted_json_str, request, extra) {
            var pgm = service + '.process_incoming_message: ';
            var pos, sessionid, session_info, file_timestamp, response_timestamp, request_timestamp, request_timeout_at,
                error, response, i, key, value, encryptions, done_and_send, group_debug_seq, now;

            try {
                // get a group debug seq. track all connected log messages. there can be many running processes
                if (extra && extra.group_debug_seq) group_debug_seq = extra.group_debug_seq ;
                else group_debug_seq = MoneyNetworkAPILib.debug_group_operation_start();
                pgm = service + '.process_incoming_message/' + group_debug_seq + ': ';
                console.log(pgm + 'Using group_debug_seq ' + group_debug_seq + ' for this ' + (request && request.msgtype ? 'receive ' + request.msgtype + ' message' : 'process_incoming_message') + ' operation');
                if (request && request.msgtype) MoneyNetworkAPILib.debug_group_operation_update(group_debug_seq, {msgtype: request.msgtype});

                if (detected_client_log_out(pgm)) return;
                if (encrypt.destroyed) {
                    // MoneyNetworkAPI instance has been destroyed. Maybe deleted session. Maybe too many invalid get_password requests?
                    console.log(pgm + 'ignoring incoming message ' + filename + '. session has been destroyed. reason = ' + encrypt.destroyed);
                    return;
                }
                console.log(pgm + 'filename = ' + filename);
                // filename = merged-MoneyNetwork/1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ/0d4002d16c.1499860158848

                // get session info. ignore already read messages
                sessionid = encrypt.sessionid;
                session_info = ls_sessions[sessionid] ? ls_sessions[sessionid][SESSION_INFO_KEY] : null;
                pos = filename.lastIndexOf('.');
                file_timestamp = parseInt(filename.substr(pos + 1));
                console.log(pgm + 'file_timestamp = ' + file_timestamp);

                if (session_info) {
                    if (!session_info.hasOwnProperty('done')) session_info.done = {};
                    if (session_info.done[file_timestamp]) {
                        console.log(pgm + 'ignoring incoming message ' + filename + '. already received');
                        return;
                    }
                }

                if (!encrypted_json_str) {
                    // OK. other session has deleted this message. normally deleted after a short time
                    if (session_info) session_info.done[file_timestamp] = true;
                    ls_save_sessions();
                    return;
                }

                // console.log(pgm + 'request = ' + JSON.stringify(request)) ;

                // default is 3 layers encryption
                encryptions = [1, 2, 3];

                // remove any response timestamp before validation (used in response filename)
                response_timestamp = request.response;
                delete request.response; // request received. must use response_timestamp in response filename
                request_timestamp = request.request;
                delete request.request; // response received. todo: must be a response to previous send request with request timestamp in request filename
                request_timeout_at = request.timeout_at;
                delete request.timeout_at; // request received. when does request expire. how long does other session wait for response

                // request timeout? check with and without "total_overhead"
                now = new Date().getTime() ;
                if (request_timeout_at < now) {
                    console.log(pgm + 'timeout. file_timestamp = ' + file_timestamp + ', request_timeout_at = ' + request_timeout_at + ', now = ' + now + ', total_overhead = ' + extra.total_overhead) ;
                    console.log(pgm + 'extra = ' + JSON.stringify(extra)) ;
                    if (request_timeout_at + extra.total_overhead < now) {
                        console.log(pgm + 'error. request timeout. ignoring request = ' + JSON.stringify(request) + ', filename = ' + filename);
                        MoneyNetworkAPILib.debug_group_operation_end(group_debug_seq, 'Timeout. Request is too old') ;
                        // sending timeout notification to other process
                        encrypt.send_timeout_message(filename, request.msgtype, 'MoneyNetwork: please resend ' + request.msgtype + ' request') ;
                        return;
                    }
                    else {
                        console.log(pgm + 'warning. request timeout. adding total_overhead ' + extra.total_overhead + ' ms to request_timeout_at. other session may reject response after timeout');
                        request_timeout_at = request_timeout_at + extra.total_overhead ;
                        console.log(pgm + 'new request_timeout_at = ' + request_timeout_at) ;
                    }
                }

                done_and_send = function (response, encryptions) {
                    pgm = service + '.process_incoming_message.done_and_send/' + group_debug_seq + ': ';
                    // marked as done. do not process same message twice
                    var now;
                    now = new Date().getTime();
                    if (session_info) {
                        session_info.done[file_timestamp] = now;
                        if (!response.error || (['pubkeys', 'get_password'].indexOf(request.msgtype) == -1)) {
                            // update last_request_at timestamp (exceptions are invalid pubkeys and get_password messages)
                            if (!session_info.last_request_at || (file_timestamp > session_info.last_request_at)) {
                                session_info.last_request_at = file_timestamp;
                                console.log(pgm + 'new last_request_at timestamp = ' + session_info.last_request_at) ;
                            }
                        }
                    }
                    ls_save_sessions();
                    console.log(pgm + 'sessionid = ' + encrypt.sessionid);
                    console.log(pgm + 'request = ' + JSON.stringify(request));
                    console.log(pgm + 'timestamps: file_timestamp = ' + file_timestamp + ', response_timestamp = ' + response_timestamp + ', request_timestamp = ' + request_timestamp + ', now = ' + now);
                    console.log(pgm + 'session_info = ' + JSON.stringify(session_info));
                    if (response_timestamp) {
                        // response was requested
                        console.log(pgm + 'response = ' + JSON.stringify(response));
                        console.log(pgm + 'encryptions = ' + JSON.stringify(encryptions));
                    }
                    else {
                        // exit. no response was requested
                        MoneyNetworkAPILib.debug_group_operation_end(group_debug_seq) ;
                        return;
                    }

                    // send response to other session
                    encrypt.send_message(response, {timestamp: response_timestamp, msgtype: request.msgtype, request: file_timestamp, subsystem: 'api', timeout_at: request_timeout_at, group_debug_seq: group_debug_seq, encryptions: encryptions}, function (res) {
                        var pgm = service + '.process_incoming_message send_message callback 3/' + group_debug_seq + ': ';
                        console.log(pgm + 'res = ' + JSON.stringify(res));
                        MoneyNetworkAPILib.debug_group_operation_end(group_debug_seq) ;
                    }); // send_message callback 3

                }; // done_and_send

                // validate and process incoming json message from wallet session and process message
                response = {msgtype: 'response'};
                error = MoneyNetworkAPILib.validate_json(pgm, request, null, 'api');
                if (error) response.error = 'message is invalid. ' + error;
                else if (request.msgtype == 'pubkeys') {
                    // first message from wallet. received public keys from wallet session
                    if (!request.password) response.error = 'Password is required in pubkeys message from wallet';
                    else if (session_info) response.error = 'Public keys have already been received. Keeping old session information';
                    else if (!encrypt.extra && encrypt.extra.url) response.error = 'No site url was found for this session';
                    else {
                        encrypt.setup_encryption({pubkey: request.pubkey, pubkey2: request.pubkey2});
                        console.log(pgm + 'saving session password. used for wallet session restore. See get_password and password messages');
                        // console.log(pgm + 'setting last_request_at: encrypt2.session_at = ' + encrypt2.session_at + ', file_timestamp = ' + file_timestamp);
                        session_info = {
                            url: encrypt.extra.url,
                            password: request.password, // encrypted session password pwd2
                            pubkey: encrypt.other_session_pubkey,
                            pubkey2: encrypt.other_session_pubkey2,
                            last_request_at: file_timestamp,
                            done: {}
                        };
                        if (!ls_sessions[sessionid]) ls_sessions[sessionid] = {};
                        ls_sessions[sessionid][SESSION_INFO_KEY] = session_info;
                    }
                }
                else if (request.msgtype == 'save_data') {
                    // received data_data request from wallet session.
                    console.log(pgm + 'save wallet data in MN localStorage');
                    if (!ls_sessions[sessionid]) ls_sessions[sessionid] = {};
                    for (i = 0; i < request.data.length; i++) {
                        key = request.data[i].key;
                        if (key == SESSION_INFO_KEY) continue;
                        value = request.data[i].value;
                        ls_sessions[sessionid][key] = value;
                    }
                }
                else if (request.msgtype == 'delete_data') {
                    // received delete_data request from wallet session.
                    console.log(pgm + 'delete wallet data saved in MN localStorage');
                    if (!ls_sessions[sessionid]) null; // OK - no data
                    else if (!request.keys) {
                        // OK - no keys array - delete all data
                        for (key in ls_sessions[sessionid]) {
                            if (key == SESSION_INFO_KEY) continue;
                            delete ls_sessions[sessionid][key];
                        }
                    }
                    else {
                        // keys array. deleted requested keys
                        for (i = 0; i < request.keys.length; i++) {
                            key = request.keys[i].key;
                            if (key == SESSION_INFO_KEY) continue;
                            delete ls_sessions[sessionid][key];
                        }
                    }
                }
                else if (request.msgtype == 'get_data') {
                    // received get_data request from wallet session. return data response
                    response = {msgtype: 'data', data: []};
                    if (ls_sessions[sessionid]) {
                        for (i = 0; i < request.keys.length; i++) {
                            key = request.keys[i];
                            if (key == SESSION_INFO_KEY) continue; // special key used for session restore
                            if (!ls_sessions[sessionid]) continue; // OK - no data - return empty data array
                            if (!ls_sessions[sessionid].hasOwnProperty(key)) continue; // OK - no data with this key
                            value = ls_sessions[sessionid][key];
                            response.data.push({key: key, value: value});
                        } // for i
                    }
                }
                else if (request.msgtype == 'get_password') {
                    // received get_password request from wallet session. return password if OK. Encrypt response with cryptMessage only
                    // console.log(pgm + 'request = ' + JSON.stringify(request)) ;
                    // get unlock_pwd2
                    encrypt.get_session_filenames({group_debug_seq: group_debug_seq}, function (this_session_filename, other_session_filename, unlock_pwd2) {
                        var pgm = service + '.process_incoming_message.' + request.msgtype + ' get_session_filenames callback/' + group_debug_seq + ': ';
                        encryptions = [2]; // only cryptMessage. Wallet session JSEncrypt prvkey is not yet restored from localStorage
                        if (!ls_sessions[sessionid]) response.error = 'Session has been deleted';
                        else if (!session_info) response.error = 'Session info was not found';
                        else if (session_info.invalid_get_password && (session_info.invalid_get_password > 6)) {
                            session_info = null;
                            delete ls_sessions[sessionid];
                            encrypt.destroy('Too many invalid get_password errors');
                            response.error = 'Too many get_password errors';
                        }
                        else if (session_info.invalid_get_password && (session_info.invalid_get_password > 3)) response.error = 'Too many get_password errors';
                        else if (encrypt.other_session_pubkey != request.pubkey) response.error = 'Not found pubkey';
                        else if (encrypt.other_session_pubkey2 != request.pubkey2) response.error = 'Not found pubkey2';
                        else if (encrypt.unlock_pwd2 != request.unlock_pwd2) response.error = 'Not found unlock_pwd2';
                        else {
                            // OK get_password request. Correct pubkeys and unlock_pwd2 password
                            response = {
                                msgtype: 'password',
                                password: session_info.password
                            }
                        }
                        // count no get_password errors. max 3/6
                        if (session_info) {
                            if (response.error) {
                                if (!session_info.invalid_get_password) session_info.invalid_get_password = 0;
                                session_info.invalid_get_password++;
                            }
                            else delete session_info.invalid_get_password;
                        }
                        // finish message processing. marked as done and send any response
                        done_and_send(response, encryptions);

                    }); // get_session_filenames callback
                    // stop and wait
                    return;

                }
                else if (request.msgtype == 'ping') {
                    // simple session ping. always OK response
                }
                else if (request.msgtype == 'balance') {
                    // received balance message from wallet. save + OK response
                    session_info.balance = request.balance;
                    session_info.balance_at = new Date().getTime();
                    ls_save_sessions();
                }
                else if (request.msgtype == 'notification') {
                    // received at notification from a wallet session. just display
                    // adding wallet_title to notification') ;
                    console.log(pgm + 'request = ' + JSON.stringify(request)) ;
                    MoneyNetworkAPILib.get_wallet_info(session_info.wallet_sha256, function (wallet_info, delayed) {
                        var pgm = service + '.process_incoming_message.' + request.msgtype + ' get_wallet_info callback/' + group_debug_seq + ': ';
                        var message;
                        if (!wallet_info || wallet_info.error || !wallet_info[session_info.wallet_sha256]) {
                            response.error = 'could not find wallet information for wallet_sha256 ' + session_info.wallet_sha256 + '. wallet_info = ' + JSON.stringify(wallet_info);
                            console.log(pgm + response.error);
                            console.log(pgm + 'ignoring notification = ' + JSON.stringify(request));
                            // normally no wait for response for notification messages
                            return done_and_send(response, encryptions);
                        }
                        message = $sanitize(wallet_info[session_info.wallet_sha256].wallet_title) + ':<br>' + $sanitize(request.message);
                        console.log(pgm + 'message = ' + message) ;
                        ZeroFrame.cmd("wrapperNotification", [request.type, message, request.timeout]);
                        done_and_send(response, encryptions);
                    });
                    return;
                }
                //else if (request.msgtype == 'published') {
                //    // wallet session has just published content OK.
                //    // minimum interval between publish is 16 seconds
                //    console.log(pgm + 'request = ' + JSON.stringify(request));
                //    MoneyNetworkAPILib.set_last_published(request.timestamp);
                //}
                else if (request.msgtype == 'timeout') {
                    // timeout message from wallet. wallet sent response after timeout. There may be a timeout failure in MN session
                    // merge MN process information and wallet process information.
                    MoneyNetworkAPILib.debug_group_operation_receive_stat(encrypt, request.stat) ;
                }
                else {
                    response.error = 'Unknown msgtype ' + request.msgtype;
                    console.log(pgm + 'request = ' + JSON.stringify(request));
                }

                // finish message processing. marked as done and send any response
                done_and_send(response, encryptions);

            } // try
            catch (e) {
                console.log(pgm + e.message);
                console.log(e.stack);
                throw(e);
            } // catch

        } // process_incoming_message

        // add callback for incoming messages from wallet session(s)
        MoneyNetworkAPILib.config({debug: true, cb: process_incoming_message, cb_fileget: true, cb_decrypt: true}) ;

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

        // open wallet url in a new browser tab
        // write warning in console.log. exception is raised in parent frame and cannot be catch here
        function open_window (pgm, url) {
            console.log(pgm + 'opening url ' + url + " in a new browser tab. open window maybe blocked in browser. chrome+opera: Uncaught TypeError: Cannot set property 'opener' of null") ;
            return ZeroFrame.cmd("wrapperOpenWindow", [url, "_blank"]);
        } // open_window

        // return list with currencies. currencies array is used in angularJS UI (minimum updates)
        var currencies = [] ;
        function get_currencies (options, cb) {
            var pgm = service + '.get_currencies: ' ;
            var pending_refresh_angular_ui, temp_currencies, wallet_sha256_values, sessionid, session_info, i, balance ;
            if (!ls_sessions) return [] ; // error?
            if (!options) options = {} ;
            pending_refresh_angular_ui = options.pending_refresh_angular_ui ;

            // copy all old known wallet balances from localStorage to temp_currencies array.
            // must lookup full wallet info with wallet_sha256 values. wallet_sha256 value may change and there has been added a workaround for this issue.
            temp_currencies = [] ;
            wallet_sha256_values = [] ;
            for (sessionid in ls_sessions) {
                session_info = ls_sessions[sessionid][SESSION_INFO_KEY];
                if (!session_info) continue;
                //if (!session_info.currencies) continue;
                if (!session_info.balance) continue;
                console.log(pgm + 'session_info = ' + JSON.stringify(session_info)) ;
                for (i=0 ; i<session_info.balance.length ; i++) {
                    balance = JSON.parse(JSON.stringify(session_info.balance[i])) ;
                    balance.last_request_at = session_info.last_request_at ;
                    balance.balance_at = session_info.balance_at ;
                    balance.sessionid = sessionid ;
                    balance.wallet_sha256 = session_info.wallet_sha256 ;
                    temp_currencies.push(balance) ;
                    // changed wallet_sha256 = null value here
                    if (session_info.wallet_sha256 && (wallet_sha256_values.indexOf(session_info.wallet_sha256) == -1)) wallet_sha256_values.push(session_info.wallet_sha256) ;
                } // for i
            }
            if (!temp_currencies.length) {
                // no wallet / no balance info was found
                while (currencies.length) currencies.shift() ;
                return cb(currencies, false) ;
            }
            // console.log(pgm + 'temp_currencies = ' + JSON.stringify(temp_currencies)) ;
            // todo: why has session with last_request_at": 1507616030739, == 2017-10-10T06:13:50+00:00 not been removed from ls_sessions?
            //temp_currencies = [{
            //    "code": "tBTC",
            //    "amount": 0,
            //    "last_request_at": 1507616030739, == 2017-10-10T06:13:50+00:00
            //    "balance_at":      1507568361090, == 2017-10-09T16:59:21+00:00
            //    "sessionid": "aznw4bpyyk1g19hc0u3ndigro2ew1pqyzqsnwfo3l6wja9dyidbmjetjkeog",
            //    "wallet_sha256": "e488d78dc26af343688045189a714658ed0f7975d4db158a7c0c5d0a218bfac7"
            //}, {
            //    "code": "tBTC",
            //    "amount": 0,
            //    "last_request_at": 1508511536094, == 2017-10-20T14:58:56+00:00
            //    "balance_at":      1507824156612, == 2017-10-12T16:02:36+00:00
            //    "sessionid": "jmy0rxlogb3dhapw5s0eq6jorcm51l9uw4vejmryeg1mlltts4x6bn7tfqzx",
            //    "wallet_sha256": "e488d78dc26af343688045189a714658ed0f7975d4db158a7c0c5d0a218bfac7"
            //}];

            // find full wallet info from sha256 values
            console.log(pgm + 'find full wallet info from wallet_sha256_values array = ' + JSON.stringify(wallet_sha256_values)) ;
            MoneyNetworkAPILib.get_wallet_info(wallet_sha256_values, function (wallet_info, refresh_angular_ui) {
                var wallet_sha256, i, key, balance, j, k, currency, unique_id, unique_ids, old_row, new_row, unique_texts,
                    sessionid, changed_wallet_sha256_values, status, step_1_get_session, step_2_ping_other_session,
                    step_3_other_user_path, step_n_done, doublet_wallet_sha256, non_unique_text, doublet_wallets ;
                if (pending_refresh_angular_ui) refresh_angular_ui = true ; // fixing problem with changed wallet_sha256 values
                // console.log(pgm + 'wallet_info = ' + JSON.stringify(wallet_info)) ;
                doublet_wallet_sha256 = {} ;
                doublet_wallets = false ;
                if (!wallet_info || (typeof wallet_info != 'object') || wallet_info.error) {
                    console.log(pgm + 'could not find wallet_info for sha256 values ' + JSON.stringify(wallet_sha256_values) + '. wallet_info = ' + JSON.stringify(wallet_info)) ;
                }
                else for (wallet_sha256 in wallet_info) {
                    for (i=0 ; i<temp_currencies.length ; i++) {
                        if (wallet_sha256 != temp_currencies[i].wallet_sha256) continue ;
                        // copy full wallet info to currency (wallet_address, wallet_title, wallet_description and currencies
                        for (key in wallet_info[wallet_sha256]) {
                            temp_currencies[i][key] = wallet_info[wallet_sha256][key] ;
                        } // for key
                        if (doublet_wallet_sha256[wallet_sha256]) {
                            // more that one session with this wallet_sha256. use session with last request_at timestamp
                            doublet_wallets = true ;
                            if (temp_currencies[i].last_request_at > doublet_wallet_sha256[wallet_sha256].last_request_at) doublet_wallet_sha256[wallet_sha256].last_request_at = temp_currencies[i].last_request_at ;
                        }
                        else doublet_wallet_sha256[wallet_sha256] = { last_request_at: temp_currencies[i].last_request_at, count: 0} ;
                        doublet_wallet_sha256[wallet_sha256].count++ ;
                    } // for i
                } // for wallet_sha256

                // same wallet_sha256 info for more than one session. keep session with last_request_at timestamp
                // console.log(pgm + 'temp_currencies = ' + JSON.stringify(temp_currencies)) ;
                if (doublet_wallets) {
                    // maybe using wrong sessionid in currencies array?
                    console.log(pgm + 'issue #253: doublet_wallet_sha256 = ' + JSON.stringify(doublet_wallet_sha256)) ;
                    //doublet_wallet_sha256 = {
                    //    "e488d78dc26af343688045189a714658ed0f7975d4db158a7c0c5d0a218bfac7": {
                    //        "last_request_at": 1511027234069,
                    //        "count": 2
                    //    }
                    //};
                    console.log(pgm + 'issue #253: temp_currencies (before) = ' + JSON.stringify(temp_currencies)) ;
                    // new session: bukuddycoq4ofc2amwxg5sapzniiftptwz5vogkpembqkzjysxqdjkbxw0tc
                    // old not restored session: pqohpdesc8vfnzhnmwhlvl8zkvfsydrz662vpjcl6mexbn6p2lx2uwr9ikfb
                    //temp_currencies (before) [{
                    //    "code": "tBTC",
                    //    "amount": 0,
                    //    "last_request_at": 1511027129067, == Saturday, November 18, 2017 6:45:29 PM GMT+01:00 (oldest session)
                    //    "balance_at": 1511013580438,
                    //    "sessionid": "pqohpdesc8vfnzhnmwhlvl8zkvfsydrz662vpjcl6mexbn6p2lx2uwr9ikfb",
                    //    "wallet_sha256": "e488d78dc26af343688045189a714658ed0f7975d4db158a7c0c5d0a218bfac7",
                    //    "wallet_address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                    //    "wallet_title": "MoneyNetworkW2",
                    //    "wallet_description": "Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro",
                    //    "currencies": [{
                    //        "code": "tBTC",
                    //        "name": "Test Bitcoin",
                    //        "url": "https://en.bitcoin.it/wiki/Testnet",
                    //        "fee_info": "Fee is calculated by external API (btc.com) and subtracted from amount. Calculated from the last X block in block chain. Lowest fee that still had more than an 80% chance to be confirmed in the next block.",
                    //        "units": [{"unit": "BitCoin", "factor": 1}, {"unit": "Satoshi", "factor": 1e-8}]
                    //    }],
                    //    "api_url": "https://www.blocktrail.com/api/docs"
                    //}, {
                    //    "code": "tBTC",
                    //    "amount": 0.001,
                    //    "last_request_at": 1511027234069, == Saturday, November 18, 2017 6:47:14 PM GMT+01:00 (newest session)
                    //    "balance_at": 1511027243659,
                    //    "sessionid": "bukuddycoq4ofc2amwxg5sapzniiftptwz5vogkpembqkzjysxqdjkbxw0tc",
                    //    "wallet_sha256": "e488d78dc26af343688045189a714658ed0f7975d4db158a7c0c5d0a218bfac7",
                    //    "wallet_address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                    //    "wallet_title": "MoneyNetworkW2",
                    //    "wallet_description": "Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro",
                    //    "currencies": [{
                    //        "code": "tBTC",
                    //        "name": "Test Bitcoin",
                    //        "url": "https://en.bitcoin.it/wiki/Testnet",
                    //        "fee_info": "Fee is calculated by external API (btc.com) and subtracted from amount. Calculated from the last X block in block chain. Lowest fee that still had more than an 80% chance to be confirmed in the next block.",
                    //        "units": [{"unit": "BitCoin", "factor": 1}, {"unit": "Satoshi", "factor": 1e-8}]
                    //    }],
                    //    "api_url": "https://www.blocktrail.com/api/docs"
                    //}];
                }
                for (wallet_sha256 in doublet_wallet_sha256) {
                    if (doublet_wallet_sha256.count == 1) continue ;
                    for (i=temp_currencies.length-1 ; i>=0 ; i--) {
                        if (temp_currencies[i].wallet_sha256 != wallet_sha256) continue ;
                        if (temp_currencies[i].last_request_at < doublet_wallet_sha256[wallet_sha256].last_request_at) temp_currencies.splice(i,1) ;
                    }
                }
                // console.log(pgm + 'temp_currencies = ' + JSON.stringify(temp_currencies)) ;
                if (doublet_wallets) console.log(pgm + 'issue #253: temp_currencies (after) = ' + JSON.stringify(temp_currencies)) ;
                //temp_currencies (after) = [{
                //    "code": "tBTC",
                //    "amount": 0.001,
                //    "last_request_at": 1511027234069, (OK newest sessionid)
                //    "balance_at": 1511027243659,
                //    "sessionid": "bukuddycoq4ofc2amwxg5sapzniiftptwz5vogkpembqkzjysxqdjkbxw0tc", (OK newest sessionid)
                //    "wallet_sha256": "e488d78dc26af343688045189a714658ed0f7975d4db158a7c0c5d0a218bfac7",
                //    "wallet_address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                //    "wallet_title": "MoneyNetworkW2",
                //    "wallet_description": "Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro",
                //    "currencies": [{
                //        "code": "tBTC",
                //        "name": "Test Bitcoin",
                //        "url": "https://en.bitcoin.it/wiki/Testnet",
                //        "fee_info": "Fee is calculated by external API (btc.com) and subtracted from amount. Calculated from the last X block in block chain. Lowest fee that still had more than an 80% chance to be confirmed in the next block.",
                //        "units": [{"unit": "BitCoin", "factor": 1}, {"unit": "Satoshi", "factor": 1e-8}]
                //    }],
                //    "api_url": "https://www.blocktrail.com/api/docs"
                //}];

                // copy full wallet info into currencies array
                changed_wallet_sha256_values = [] ;
                for (i=temp_currencies.length-1 ; i >= 0 ; i--) {
                    if (temp_currencies[i].wallet_address) continue ; // OK. Full wallet info found from wallet_sha256 address
                    // full wallet info could not be found from wallet_sha256 address. must try some workarounds to get new updated wallet_sha256 address. see step_1_get_session,
                    console.log(pgm + 'removing currency/balance info with unknown wallet_sha256. ' + JSON.stringify(temp_currencies[i])) ;
                    // removing currency/balance info with unknown wallet_sha256. {"code":"tBTC","amount":1.3,"balance_at":1504431366592,"sessionid":"wslrlc5iomh45byjnblebpvnwheluzzdhqlqwvyud9mu8dtitus3kjsmitc1","wallet_sha256":"6ef0247021e81ae7ae1867a685f0e84cdb8a61838dc25656c4ee94e4f20acb74"}
                    sessionid = temp_currencies[i].sessionid ;
                    changed_wallet_sha256_values.push({
                        sessionid: sessionid,
                        old_wallet_sha256: temp_currencies[i].wallet_sha256
                    }) ;
                    temp_currencies.splice(i,1) ;
                    delete ls_sessions[sessionid][SESSION_INFO_KEY].wallet_sha256 ;
                    ls_save_sessions() ;
                }
                console.log(pgm + 'sessions (after get_currencies) = ' + JSON.stringify(ls_sessions)) ;
                //sessions_after_get_currencies = {
                //    "pqohpdesc8vfnzhnmwhlvl8zkvfsydrz662vpjcl6mexbn6p2lx2uwr9ikfb": {
                //        "_$session_info": {
                //            "url": "/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                //            "password": "U2FsdGVkX1/pBgtEW2qYhGhw93HRsEksImi8na4cMFtEvEynBqNSW9EmOEhPK6A/dg2hk25XyYk8lUYmfVIqPC8BR3E7Ie4FvCwl8d2wBa0=",
                //            "pubkey": "-----BEGIN PUBLIC KEY-----\nMIGeMA0GCSqGSIb3DQEBAQUAA4GMADCBiAKBgF5KrTfm5XtqNr480ehs8T6Vc9Ey\nu4jDaYcYRm/CRuOqS2oI0Z18Ksb8HonFgBKDR49rmsLwJLfMw+tRKhsIhrlz6PLa\n4iAK6eEUXiTjVOifEckm36rdybCS0siPAUafwixb/eg8Fpxsb9zlGQe22OSRr/h8\n/OinFVQbRj6z4lqpAgMBAAE=\n-----END PUBLIC KEY-----",
                //            "pubkey2": "AiTobs/UzL7+mPYqmE0FvbtbinWwK/J15upHdjDEIm/+",
                //            "last_request_at": 1511027129067,
                //            "done": {
                //            },
                //            "currencies": [{
                //                "code": "tBTC",
                //                "name": "Test Bitcoin",
                //                "url": "https://en.bitcoin.it/wiki/Testnet",
                //                "fee_info": "Fee is calculated by external API (btc.com) and subtracted from amount. Calculated from the last X block in block chain. Lowest fee that still had more than an 80% chance to be confirmed in the next block.",
                //                "units": [{"unit": "BitCoin", "factor": 1}, {"unit": "Satoshi", "factor": 1e-8}]
                //            }],
                //            "wallet_sha256": "e488d78dc26af343688045189a714658ed0f7975d4db158a7c0c5d0a218bfac7",
                //            "balance": [{"code": "tBTC", "amount": 0}],
                //            "balance_at": 1511013580438
                //        }
                //    },
                //    "bukuddycoq4ofc2amwxg5sapzniiftptwz5vogkpembqkzjysxqdjkbxw0tc": {
                //        "_$session_info": {
                //            "url": "/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                //            "password": "U2FsdGVkX19/wYohFHcDtjyuAryFUAI+2zMGdmI/VybJHBVwxkUrdoNSiTqZk4qyxOgcFPGAimHdA7fJm0iigjiKqSM6CXpMPflNQk2hdAo=",
                //            "pubkey": "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCGiIdIhNQTXgKALyU5lqlPgqX2\nRKthstnt6WK/FO8eH+nbvfZQRtCf36S0Mdp6lCong3/B4f6QeIlQDXbJ8AoAcbRq\n9fRZGDJxXmD5Wz8M3wVbc8xMSSPDj/vEleZ72OLf2LkcSDzBMlvH3Qr4C1KcI2XT\nl+19BDH2fhHKDyTivQIDAQAB\n-----END PUBLIC KEY-----",
                //            "pubkey2": "AiTobs/UzL7+mPYqmE0FvbtbinWwK/J15upHdjDEIm/+",
                //            "last_request_at": 1511027234069,
                //            "done": {"1511027142453": 1511027152151, "1511027234069": 1511027243668},
                //            "balance": [{"code": "tBTC", "amount": 0.001}],
                //            "balance_at": 1511027243659,
                //            "wallet_sha256": "e488d78dc26af343688045189a714658ed0f7975d4db158a7c0c5d0a218bfac7"
                //        }
                //    }
                //};

                // move currency info (name, url and units) to currency rows for easy filter and sort
                for (i=temp_currencies.length-1 ; i>=0 ; i--) {
                    balance = temp_currencies[i] ;
                    if (!balance.currencies || !balance.currencies.length) {
                        console.log(pgm + 'no currencies array was found in ' + JSON.stringify(balance)) ;
                        temp_currencies.splice(i,1) ;
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
                        temp_currencies.splice(i,1) ;
                        continue ;
                    }
                    balance.unique_id = balance.wallet_sha256 + '/' + balance.code ;

                    // merge balance and currency information
                    currency = balance.currencies[j] ;
                    for (key in currency) {
                        if (!currency.hasOwnProperty(key)) continue ;
                        balance[key] = currency[key] ;
                    }
                    balance.wallet_name = balance.wallet_title ;
                    delete balance.currencies ;
                } // for i

                // wallet_name must be unique. starting with wallet_title and switching to wallet_address
                // console.log(pgm + 'temp_currencies = ' + JSON.stringify(temp_currencies)) ;
                while (true) {
                    unique_texts = {} ;
                    non_unique_text = null ;
                    for (i=0 ; i<temp_currencies.length ; i++) {
                        balance = temp_currencies[i] ;
                        balance.unique_text = balance.code + ' ' + balance.name + ' from ' + balance.wallet_name;
                        if (!unique_texts[balance.unique_text]) unique_texts[balance.unique_text] = 0 ;
                        unique_texts[balance.unique_text]++ ;
                        if (unique_texts[balance.unique_text]>1) non_unique_text =  balance.unique_text ;
                    }
                    if (!non_unique_text) break ; // OK. unique_text is unique
                    console.log(pgm + 'non unique text ' + non_unique_text + '. count = ' + unique_texts[balance.unique_text]) ;
                    // fix problem. used wallet_address instead of wallet_title.
                    for (i=0 ; i<temp_currencies.length ; i++) {
                        balance = temp_currencies[i] ;
                        if (balance.unique_text == non_unique_text) {
                            balance.wallet_name = balance.wallet_address ;
                            balance.unique_text = balance.code + ' ' + balance.name + ' from ' + balance.wallet_name;
                        }
                    }
                } // while true

                // merge new currencies array into old currencies array (insert, update, delete). used in angularJS UI
                console.log(pgm + 'issue #253: currencies before merge = ' + JSON.stringify(currencies)) ;
                //currencies before merge = [{
                //    "code": "tBTC",
                //    "amount": 0.001,
                //    "last_request_at": 1511087828991, == Sunday, November 19, 2017 11:37:08 AM GMT+01:00
                //    "balance_at": 1511087897708,
                //    "sessionid": "krmiz7rgui9n4waet0ugzxbzeoffoatxm74kfwtsbkj0edzhm5d8kijqscxd",
                //    "wallet_sha256": "e488d78dc26af343688045189a714658ed0f7975d4db158a7c0c5d0a218bfac7",
                //    "wallet_address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                //    "wallet_title": "MoneyNetworkW2",
                //    "wallet_description": "Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro",
                //    "api_url": "https://www.blocktrail.com/api/docs",
                //    "unique_id": "e488d78dc26af343688045189a714658ed0f7975d4db158a7c0c5d0a218bfac7/tBTC",
                //    "name": "Test Bitcoin",
                //    "url": "https://en.bitcoin.it/wiki/Testnet",
                //    "fee_info": "Fee is calculated by external API (btc.com) and subtracted from amount. Calculated from the last X block in block chain. Lowest fee that still had more than an 80% chance to be confirmed in the next block.",
                //    "units": [{"unit": "BitCoin", "factor": 1}, {"unit": "Satoshi", "factor": 1e-8}],
                //    "wallet_name": "MoneyNetworkW2",
                //    "unique_text": "tBTC Test Bitcoin from MoneyNetworkW2",
                //    "sesionid": "lxk2dp4tzeefgcajbrdxbpzd5y2zceshjahdmiczfg77os9dj7burz84bm61"
                //}];

                console.log(pgm + 'issue #253: temp_currencies = ' + JSON.stringify(temp_currencies)) ;
                //temp_currencies = [{
                //    "code": "tBTC",
                //    "amount": 0.001,
                //    "last_request_at": 1511087879736, == Sunday, November 19, 2017 11:37:59 AM GMT+01:00
                //    "balance_at": 1511087897708,
                //    "sessionid": "lxk2dp4tzeefgcajbrdxbpzd5y2zceshjahdmiczfg77os9dj7burz84bm61",
                //    "wallet_sha256": "e488d78dc26af343688045189a714658ed0f7975d4db158a7c0c5d0a218bfac7",
                //    "wallet_address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                //    "wallet_title": "MoneyNetworkW2",
                //    "wallet_description": "Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro",
                //    "api_url": "https://www.blocktrail.com/api/docs",
                //    "unique_id": "e488d78dc26af343688045189a714658ed0f7975d4db158a7c0c5d0a218bfac7/tBTC",
                //    "name": "Test Bitcoin",
                //    "url": "https://en.bitcoin.it/wiki/Testnet",
                //    "fee_info": "Fee is calculated by external API (btc.com) and subtracted from amount. Calculated from the last X block in block chain. Lowest fee that still had more than an 80% chance to be confirmed in the next block.",
                //    "units": [{"unit": "BitCoin", "factor": 1}, {"unit": "Satoshi", "factor": 1e-8}],
                //    "wallet_name": "MoneyNetworkW2",
                //    "unique_text": "tBTC Test Bitcoin from MoneyNetworkW2"
                //}];

                unique_ids = {} ;
                for (i=0 ; i<currencies.length ; i++) unique_ids[currencies[i].unique_id] = { in_old: currencies[i]} ;
                for (i=0 ; i<temp_currencies.length ; i++) {
                    unique_id = temp_currencies[i].unique_id ;
                    if (!unique_ids[unique_id]) unique_ids[unique_id] = {} ;
                    unique_ids[unique_id].in_new = i ; // index for insert and update operation
                } // for i
                // delete
                for (i=currencies.length-1 ; i>=0 ; i--) {
                    unique_id = currencies[i].unique_id ;
                    if (unique_ids[unique_id].hasOwnProperty('in_new')) continue ;
                    currencies.splice(i,1) ;
                }
                // insert or update
                for (unique_id in unique_ids) {
                    if (unique_ids[unique_id].in_old) {
                        // in old
                        if (unique_ids[unique_id].hasOwnProperty('in_new')) {
                            // in old and in new. update info. most info is readonly. only amount and balance_at can change
                            old_row = unique_ids[unique_id].in_old ;
                            i = unique_ids[unique_id].in_new ;
                            new_row = temp_currencies[i] ;
                            console.log(pgm + 'issue #253: merge rows: old_row = ' + JSON.stringify(old_row) + ', new_row = ' + JSON.stringify(new_row)) ;
                            for (key in new_row) {
                                if (!new_row.hasOwnProperty(key)) continue ;
                                if (old_row[key] != new_row[key]) old_row[key] = new_row[key] ;
                            }
                            console.log(pgm + 'issue #253: merged result: ' + JSON.stringify(old_row)) ;
                        }
                        else {
                            // in old and not in new. delete. already done
                            continue ;
                        }
                    }
                    else {
                        // not in old. must be a new record. insert
                        i = unique_ids[unique_id].in_new ;
                        currencies.push(temp_currencies[i]) ;
                        continue ;
                    }

                } // for unique_id
                console.log(pgm + 'issue #253: currencies after merge = ' + JSON.stringify(currencies)) ;
                //currencies after merge = [{
                //    "code": "tBTC",
                //    "amount": 0.001,
                //    "last_request_at": 1511087828991, == Sunday, November 19, 2017 11:37:08 AM GMT+01:00
                //    "balance_at": 1511087897708,
                //    "sessionid": "krmiz7rgui9n4waet0ugzxbzeoffoatxm74kfwtsbkj0edzhm5d8kijqscxd",
                //    "wallet_sha256": "e488d78dc26af343688045189a714658ed0f7975d4db158a7c0c5d0a218bfac7",
                //    "wallet_address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                //    "wallet_title": "MoneyNetworkW2",
                //    "wallet_description": "Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro",
                //    "api_url": "https://www.blocktrail.com/api/docs",
                //    "unique_id": "e488d78dc26af343688045189a714658ed0f7975d4db158a7c0c5d0a218bfac7/tBTC",
                //    "name": "Test Bitcoin",
                //    "url": "https://en.bitcoin.it/wiki/Testnet",
                //    "fee_info": "Fee is calculated by external API (btc.com) and subtracted from amount. Calculated from the last X block in block chain. Lowest fee that still had more than an 80% chance to be confirmed in the next block.",
                //    "units": [{"unit": "BitCoin", "factor": 1}, {"unit": "Satoshi", "factor": 1e-8}],
                //    "wallet_name": "MoneyNetworkW2",
                //    "unique_text": "tBTC Test Bitcoin from MoneyNetworkW2",
                //    "sesionid": "lxk2dp4tzeefgcajbrdxbpzd5y2zceshjahdmiczfg77os9dj7burz84bm61"
                //}];
                if (!changed_wallet_sha256_values.length) {
                    // return list of currencies to chat controller
                    cb(currencies, refresh_angular_ui) ;
                    return ;
                }

                // fix problems with lost/changed wallet_sha256 values:
                // 1) get session info
                // 2) optional ping wallet session
                // 3) use other_user_path to find wallet.wallet_sha256
                console.log(pgm + 'changed_wallet_sha256_values = ' + JSON.stringify(changed_wallet_sha256_values)) ;

                // create callback chain
                status = { refresh_currencies: false, no_done: 0 } ;

                step_n_done = function () {
                    if (status.refresh_currencies) {
                        console.log(pgm + 'running get_currencies request once more after fixing problem with changed wallet_sha256 value') ;
                        get_currencies({refresh_angular_ui: refresh_angular_ui}, cb) ;
                    }
                    else {
                        console.log(pgm + 'refresh wallet_sha256 failed') ;
                        cb(currencies, refresh_angular_ui) ;
                    }
                } ; // step_n_done

                // step 3 - check other_user_path - use z_file_get to get current wallet_sha256 value
                step_3_other_user_path = function (i) {
                    var pgm = service + '.get_currencies.step_3_other_user_path: ' ;
                    var encrypt, inner_path, debug_seq ;
                    if (i >= changed_wallet_sha256_values.length) {
                        // next step in callback chain
                        if (status.no_done == changed_wallet_sha256_values.length) return step_n_done();
                        else return step_n_done();
                    }
                    if (changed_wallet_sha256_values[i].done) return step_3_other_user_path(i+1) ;
                    encrypt = changed_wallet_sha256_values[i].session_info.encrypt ;
                    if (!encrypt.other_user_path) return step_3_other_user_path(i+1) ;
                    sessionid = changed_wallet_sha256_values[i].sessionid ;
                    console.log(pgm + 'found other_user_path for session ' + sessionid + '. reading wallet.json file') ;
                    inner_path = encrypt.other_user_path + 'wallet.json';
                    z_file_get(pgm, {inner_path: inner_path, required: false}, function (wallet_str) {
                        var pgm = service + '.get_currencies.step_3_other_user_path z_file_get callback: ' ;
                        var wallet, old_wallet_sha256 ;
                        if (!wallet_str) {
                            console.log(pgm + 'error. could not find wallet ' + inner_path + '. other_user_path must be invalid') ;
                            changed_wallet_sha256_values[i].done = true ;
                            status.no_done++ ;
                            return step_3_other_user_path(i+1) ;
                        }
                        // found wallet.json
                        wallet = JSON.parse(wallet_str) ;
                        // todo: validate wallet.json
                        // todo: check wallet_sha256
                        old_wallet_sha256 = changed_wallet_sha256_values[i].old_wallet_sha256 ;
                        if (old_wallet_sha256 && (wallet.wallet_sha256 == old_wallet_sha256)) {
                            console.log(pgm + 'system error for sessionid ' + sessionid + '. unchanged wallet_sha256 ' + old_wallet_sha256) ;
                            changed_wallet_sha256_values[i].done = true ;
                            status.no_done++ ;
                            return step_3_other_user_path(i+1) ;
                        }
                        // wallet_sha256 lookup ok
                        console.log(pgm + 'found wallet with changed wallet_sha256 value') ;
                        console.log(pgm + 'inner_path        = ' + inner_path) ;
                        console.log(pgm + 'sessionid         = ' + sessionid) ;
                        console.log(pgm + 'old wallet_sha256 = ' + ls_sessions[sessionid][SESSION_INFO_KEY].wallet_sha256) ;
                        console.log(pgm + 'new wallet_sha256 = ' + wallet.wallet_sha256) ;
                        ls_sessions[sessionid][SESSION_INFO_KEY].wallet_sha256 = wallet.wallet_sha256 ;
                        ls_save_sessions() ;
                        changed_wallet_sha256_values[i].done = true ;
                        status.no_done++ ;
                        status.refresh_currencies = true ;
                        // next row
                        step_3_other_user_path(i+1) ;
                    }) ; // z_file_get callback

                } ; // step_2_other_user_path

                // step 2 - optional ping other session
                step_2_ping_other_session = function(i) {
                    var pgm = service + '.get_currencies.step_2_ping_other_session: ' ;
                    var encrypt, request ;
                    if (i >= changed_wallet_sha256_values.length) {
                        // next step in callback chain
                        if (status.no_done == changed_wallet_sha256_values.length) return step_n_done();
                        else return step_3_other_user_path(0);
                    }
                    if (changed_wallet_sha256_values[i].done) return step_2_ping_other_session(i+1) ;
                    encrypt = changed_wallet_sha256_values[i].session_info.encrypt ;
                    if (encrypt.other_user_path) return step_2_ping_other_session(i+1) ;

                    // no other_user_path. ping other session. should respond with OK if up and running

                    // send ping. timeout max 5 seconds. Expects Timeout ... or OK response
                    request = { msgtype: 'ping' };
                    encrypt.send_message(request, {response: 5000}, function (response) {
                        var pgm = service + '.get_currencies.step_2_ping_other_session send_message callback: ' ;
                        var sessionid, session_info, message, refresh_job ;
                        sessionid = changed_wallet_sha256_values[i].sessionid ;
                        if (response && response.error && response.error.match(/^Timeout /)) {
                            // OK. Timeout. Continue with next session.
                            console.log(pgm + 'ping sessionid ' + sessionid + ' timeout');
                            session_info = ls_sessions[sessionid][SESSION_INFO_KEY] ;
                            if (session_info.url) {
                                // ask user to open wallet session
                                console.log(pgm + 'timeout. ask user to confirm open wallet ' + session_info.url) ;
                                message = 'Could not find wallet info<br>Open wallet ' + session_info.url + '<br>to update wallet information?<br>' ;
                                ZeroFrame.cmd("wrapperConfirm", [message, 'OK'], function (confirm) {
                                    if (!confirm) return ;
                                    // open wallet site
                                    console.log(pgm + 'confirmed. open wallet ' + session_info.url + ', wait 5 seconds and refresh currency information. ') ;
                                    open_window(pgm, session_info.url);
                                    ZeroFrame.cmd("wrapperNotification", ['info', 'Opened wallet ' + session_info.url + '<br>in a new browser tab', 5000]);
                                    // wait 5 seconds and run get_currencies once more.
                                    refresh_job = function() {
                                        var message = 'Updating wallet info for<br>wallet ' + session_info.url ;
                                        console.log(pgm + message) ;
                                        ZeroFrame.cmd("wrapperNotification", ['info', message, 5000]);
                                        get_currencies({}, function() {}) ;
                                    };
                                    $timeout(refresh_job, 5000) ;
                                }) ;
                                return ;
                            }
                            else console.log(pgm + 'Error. Cannot ask user to open wallet. No wallet URL was found in session info ' + JSON.stringify(session_info)) ;
                        }
                        else if (!response || response.error) {
                            // Unexpected error.
                            console.log(pgm + 'ping sessionid ' + sessionid + ' returned ' + JSON.stringify(response));
                            changed_wallet_sha256_values[i].done = true ;
                            status.no_done++ ;
                        }
                        else {
                            // ping OK. found other_user_path. To be used in step_3_other_user_path to lookup wallet.json file with correct wallet_sha256
                            console.log(pgm + 'other_user_path = ' + encrypt.other_user_path);
                        }
                        // next row
                        step_2_ping_other_session(i+1) ;
                    }) ;
                }; // step_2_ping_other_session

                // step 1 - get session info from MoneyNetworkAPI (sessions loaded from localStorage - see ls_sessions hash)
                step_1_get_session = function(i) {
                    var pgm = service + '.get_currencies.get_session: ' ;
                    var sessionid ;
                    if (i >= changed_wallet_sha256_values.length) {
                        // next step in callback chain
                        if (status.no_done == changed_wallet_sha256_values.length) return step_n_done();
                        return step_2_ping_other_session(0) ;
                    }
                    changed_wallet_sha256_values[i].done = false ;
                    sessionid = changed_wallet_sha256_values[i].sessionid ;
                    MoneyNetworkAPILib.get_session(sessionid, function (session_info) {
                        var pgm = service + '.get_currencies.step_1_get_session callback: ' ;
                        if (!session_info || !session_info.encrypt) {
                            // session lookup failed
                            console.log(pgm + 'error. could not find session info for sessionid ' + sessionid) ;
                            changed_wallet_sha256_values[i].done = true ;
                            status.no_done++ ;
                        }
                        else changed_wallet_sha256_values[i].session_info = session_info ;
                        // next row
                        step_1_get_session(i+1) ;
                    }) ; // get_session callback

                } ; // step_1_get_session
                // start callback chain
                step_1_get_session(0) ;

            }) ; // get_wallet_info

        } // get_currencies

        function get_currency_by_unique_text (unique_text) {
            var i ;
            for (i=0 ; i<currencies.length ; i++) {
                if (currencies[i].unique_text == unique_text) return currencies[i] ;
            }
            return null ;
        } // get_currency_by_unique_text

        // export MoneyNetworkWService API
        return {
            get_session_info_key: get_session_info_key,
            ls_get_sessions: ls_get_sessions,
            ls_save_sessions: ls_save_sessions,
            w_login: w_login,
            w_logout: w_logout,
            open_window: open_window,
            get_currencies: get_currencies,
            get_currency_by_unique_text: get_currency_by_unique_text
        };

        // end MoneyNetworkWService
    }]) ;
