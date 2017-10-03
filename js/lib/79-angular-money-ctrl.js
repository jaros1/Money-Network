angular.module('MoneyNetwork')

    .controller('MoneyCtrl', ['$window', '$http', '$timeout', 'MoneyNetworkService', function ($window, $http, $timeout, moneyNetworkService) {
        var self = this;
        var controller = 'MoneyCtrl';
        console.log(controller + ' loaded');

        // check site info. Merger:MoneyNetwork permission is required
        console.log(controller + ': site_info (1) = ' + JSON.stringify(ZeroFrame.site_info)) ;
        ZeroFrame.cmd("siteInfo", {}, function (site_info) {
            console.log(controller + ': site_info (2) = ' + JSON.stringify(site_info)) ;
        }) ;

        self.money_network_w2_1 = function () {
            var pgm = controller + '.money_network_w2_1: ' ;
            console.log(pgm + 'test 1 - add iframe to body') ;

            // not working - replaces money network with /1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1
            var iframe = document.createElement('iframe');
            iframe.src = '/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1' ;
            iframe.sandbox="allow-forms allow-scripts allow-top-navigation allow-popups allow-modals" ;
            iframe.id = 'money_network_w2_1' ;
            document.body.appendChild(iframe);

        }; // money_network_w2_1

        self.money_network_w2_2 = function () {
            var pgm = controller + '.money_network_w2_2: ' ;
            console.log(pgm + 'test 2 - use ZeroNet wrapperOpenWindow') ;

            //// not working - no window object is returned. cannot start communication from money network app
            var x = ZeroFrame.cmd("wrapperOpenWindow", ["/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1", "_blank"], function (res) {
                console.log(pgm +'res = ' + JSON.stringify(res)) ;
            }) ;
            console.log(pgm + 'x = ' + JSON.stringify(x)) ;

        }; // money_network_w2_2

        self.money_network_w2_3 = function () {
            var pgm = controller + '.money_network_w2_3: ' ;
            console.log(pgm + 'test 3 - use window.open') ;

            var x = window.open("/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1", "_blank") ;
            console.log(pgm + 'x = ' + CircularJSON.stringify(x)) ;


        }; // money_network_w2_3

        self.money_network_w2_4 = function () {
            var pgm = controller + '.money_network_w2_4: ' ;
            console.log(pgm + 'test 4 - use XMLHttpRequest - not implemented') ;
            $http.get('/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1',{ headers: { accept: 'text/html'}}).
                then(function successCallback(response) {
                    var pgm = controller + '.money_network_w2_4.successCallback: ' ;
                    console.log('response = ' + CircularJSON.stringify(response)) ;
                // this callback will be called asynchronously
                // when the response is available
            }, function errorCallback(response) {
                    var pgm = controller + '.money_network_w2_4.errorCallback: ' ;
                    console.log('response = ' + CircularJSON.stringify(response)) ;
                // called asynchronously if an error occurs
                // or server returns response with an error status.
            }) ;

        }; // money_network_w2_4

        self.money_network_w2_5 = function () {
            var pgm = controller + '.money_network_w2_5: ' ;
            console.log(pgm + 'test 5 - add iframe without a src to body') ;

            // add no src iframe to body. OK. No redirect
            var iframe = document.createElement('iframe');
            iframe.sandbox="allow-forms allow-scripts allow-top-navigation allow-popups allow-modals" ;
            iframe.id = 'money_network_w2_5' ;
            iframe.style.display = 'none' ;
            document.body.appendChild(iframe);
            // add html content. fails with Blocked a frame with origin "null" from accessing a cross-origin frame.
            var html = '<body><script type="text/javascript" src="/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1/js/all.js"></script></body>';
            iframe.contentWindow.document.open();
            iframe.contentWindow.document.write(html);
            iframe.contentWindow.document.close();
        }; // money_network_w2_5

        self.money_network_w2_6 = function () {
            var pgm = controller + '.money_network_w2_6: ' ;
            console.log(pgm + 'test 6 - use z_file_get to read Money Network W2 file') ;

            // z_file_get returns script=null. OK with a shortcut link from Money Metwork to Money Network W2
            moneyNetworkService.z_file_get(pgm, {inner_path: '/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1/js/all.js', required: false}, function (script) {
                console.log(pgm + 'script = ', script) ;
            }) ;


        }; // money_network_w2_6

        self.money_network_w2_7 = function () {
            var pgm = controller + '.money_network_w2_7: ' ;
            console.log(pgm + 'test 7 - merger sites - mergerSiteList') ;


            // fileGet returns script=null. OK with a shortcut link from Money Metwork to Money Network W2
            ZeroFrame.cmd("mergerSiteList", [true], function (merger_sites) {
                console.log(pgm + 'merger_sites = ', JSON.stringify(merger_sites)) ;
                //merger_sites = {
                //    "1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh": {
                //        "tasks": 0,
                //        "size_limit": 10,
                //        "address": "1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh",
                //        "next_size_limit": 10,
                //        "auth_address": "18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
                //        "feed_follow_num": null,
                //        "content": {
                //            "files": 3,
                //            "description": "Money Network - U3 - User data hub - runner jro",
                //            "cloned_from": "1JeHa67QEvrrFpsSow82fLypw8LoRcmCXk",
                //            "address": "1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh",
                //            "clone_root": "",
                //            "favicon": "favicon.ico",
                //            "cloneable": true,
                //            "includes": 1,
                //            "viewport": "width=device-width, initial-scale=1.0",
                //            "inner_path": "content.json",
                //            "merged_type": "MoneyNetwork",
                //            "title": "U3 User data hub",
                //            "files_optional": 0,
                //            "signs_required": 1,
                //            "modified": 1497251747,
                //            "ignore": "(.idea|.git|data/users/.*/.*)",
                //            "zeronet_version": "0.5.5",
                //            "postmessage_nonce_security": true,
                //            "address_index": 21770330
                //        },
                //        "peers": 6,
                //        "auth_key": "2e6660337d0efeaca1cd6ee4b3b3dbfcabe30693f37d483a497c38fe322547f8",
                //        "settings": {
                //            "peers": 4,
                //            "added": 1495634355,
                //            "bytes_recv": 2088756,
                //            "optional_downloaded": 811278,
                //            "bytes_sent": 1293583,
                //            "ajax_key": "a2eac98ba827b84747354ac863f114cf25fcdc326fc604f85a96ffee5f567bbf",
                //            "modified": 1503392135,
                //            "cache": {},
                //            "serving": true,
                //            "own": true,
                //            "permissions": [],
                //            "size_optional": 892015,
                //            "size": 187371
                //        },
                //        "bad_files": 0,
                //        "workers": 0,
                //        "privatekey": false,
                //        "cert_user_id": "jro@zeroid.bit",
                //        "started_task_num": 0,
                //        "content_updated": null
                //    },
                //    "182Uot1yJ6mZEwQYE5LX1P5f6VPyJ9gUGe": {
                //        "tasks": 0,
                //        "size_limit": 10,
                //        "address": "182Uot1yJ6mZEwQYE5LX1P5f6VPyJ9gUGe",
                //        "next_size_limit": 10,
                //        "auth_address": "18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
                //        "feed_follow_num": null,
                //        "content": {
                //            "files": 2,
                //            "description": "Money Network - U1 - User data hub - runner jro",
                //            "address": "182Uot1yJ6mZEwQYE5LX1P5f6VPyJ9gUGe",
                //            "includes": 1,
                //            "cloneable": true,
                //            "inner_path": "content.json",
                //            "merged_type": "MoneyNetwork",
                //            "title": "U1 User data hub",
                //            "files_optional": 0,
                //            "signs_required": 1,
                //            "modified": 1497250805,
                //            "ignore": "(.idea|.git|data/users/.*/.*)",
                //            "zeronet_version": "0.5.5",
                //            "postmessage_nonce_security": true
                //        },
                //        "peers": 3,
                //        "auth_key": "2e6660337d0efeaca1cd6ee4b3b3dbfcabe30693f37d483a497c38fe322547f8",
                //        "settings": {
                //            "peers": 2,
                //            "added": 1497250023,
                //            "bytes_recv": 731810,
                //            "optional_downloaded": 775,
                //            "bytes_sent": 262231,
                //            "ajax_key": "fb135ca9d5c773addd4539e9f60c75abd4a53c11f469d0b33502ba934aedcdec",
                //            "modified": 1503190684,
                //            "cache": {},
                //            "serving": true,
                //            "own": true,
                //            "permissions": [],
                //            "size_optional": 32761,
                //            "size": 542789
                //        },
                //        "bad_files": 0,
                //        "workers": 0,
                //        "privatekey": false,
                //        "cert_user_id": "jro@zeroid.bit",
                //        "started_task_num": 0,
                //        "content_updated": null
                //    },
                //    "16RMEZXFTLXcWFUA5vCEaw2vGpYVZ6iJtN": {
                //        "tasks": 0,
                //        "size_limit": 10,
                //        "address": "16RMEZXFTLXcWFUA5vCEaw2vGpYVZ6iJtN",
                //        "next_size_limit": 10,
                //        "auth_address": "14imEyXrDeDDrZb51miohUveniyP4vMkTM",
                //        "feed_follow_num": null,
                //        "content": {
                //            "files": 8,
                //            "description": "Complementary & alternative money demo - Wallet 1 - BitCoins (https://greenaddress.it/en/)",
                //            "includes": 0,
                //            "address": "16RMEZXFTLXcWFUA5vCEaw2vGpYVZ6iJtN",
                //            "favicon": "favicon.ico",
                //            "viewport": "width=device-width, initial-scale=1.0",
                //            "inner_path": "content.json",
                //            "merged_type": "MoneyNetwork",
                //            "title": "W1 Bitcoin Greenaddress.it",
                //            "files_optional": 0,
                //            "signs_required": 1,
                //            "modified": 1493993640,
                //            "ignore": "((js|css)/(?!all.(js|css))|.idea|.git)",
                //            "zeronet_version": "0.5.4",
                //            "postmessage_nonce_security": true
                //        },
                //        "peers": 20,
                //        "auth_key": "2e6660337d0efeaca1cd6ee4b3b3dbfcabe30693f37d483a497c38fe322547f8",
                //        "settings": {
                //            "peers": 19,
                //            "added": 1492417547,
                //            "bytes_recv": 6063314,
                //            "optional_downloaded": 0,
                //            "bytes_sent": 23292632,
                //            "ajax_key": "9ef51f9a9dafa22e44390c6bba868a42e5271ff8e59aa47c918d46b43b792b4b",
                //            "modified": 1493993640,
                //            "cache": {},
                //            "serving": true,
                //            "own": true,
                //            "permissions": [],
                //            "size_optional": 0,
                //            "size": 4934644
                //        },
                //        "bad_files": 0,
                //        "workers": 0,
                //        "privatekey": false,
                //        "cert_user_id": "14imEyXrDeDDr@moneynetwork.bit",
                //        "started_task_num": 0,
                //        "content_updated": null
                //    },
                //    "1922ZMkwZdFjKbSAdFR1zA5YBHMsZC51uc": {
                //        "tasks": 0,
                //        "size_limit": 10,
                //        "address": "1922ZMkwZdFjKbSAdFR1zA5YBHMsZC51uc",
                //        "next_size_limit": 10,
                //        "auth_address": "14imEyXrDeDDrZb51miohUveniyP4vMkTM",
                //        "feed_follow_num": null,
                //        "content": {
                //            "files": 2,
                //            "description": "Money Network - U2 - User data hub - runner jro",
                //            "address": "1922ZMkwZdFjKbSAdFR1zA5YBHMsZC51uc",
                //            "clone_root": "",
                //            "includes": 1,
                //            "cloneable": true,
                //            "inner_path": "content.json",
                //            "merged_type": "MoneyNetwork",
                //            "title": "U2 User data hub",
                //            "files_optional": 0,
                //            "signs_required": 1,
                //            "modified": 1495974144,
                //            "ignore": "((js|css)/(?!all.(js|css))|.idea|.git|data/users/.*/.*)",
                //            "zeronet_version": "0.5.5",
                //            "postmessage_nonce_security": true,
                //            "address_index": 41805500
                //        },
                //        "peers": 19,
                //        "auth_key": "2e6660337d0efeaca1cd6ee4b3b3dbfcabe30693f37d483a497c38fe322547f8",
                //        "settings": {
                //            "peers": 18,
                //            "added": 1495614835,
                //            "bytes_recv": 1118,
                //            "optional_downloaded": 0,
                //            "bytes_sent": 9550,
                //            "ajax_key": "18ba629a2075b92e19af2ac1d28145c6548d1971b5ac8603413966124d4eda22",
                //            "modified": 1495974144,
                //            "cache": {},
                //            "serving": true,
                //            "own": true,
                //            "permissions": [],
                //            "size_optional": 0,
                //            "size": 2452
                //        },
                //        "bad_files": 0,
                //        "workers": 0,
                //        "privatekey": false,
                //        "cert_user_id": "14imEyXrDeDDr@moneynetwork.bit",
                //        "started_task_num": 0,
                //        "content_updated": null
                //    },
                //    "1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ": {
                //        "tasks": 0,
                //        "size_limit": 10,
                //        "address": "1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ",
                //        "next_size_limit": 10,
                //        "auth_address": "18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
                //        "feed_follow_num": null,
                //        "content": {
                //            "files": 3,
                //            "description": "Money Network - W2 - Wallet data hub - runner jro",
                //            "cloned_from": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                //            "address": "1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ",
                //            "clone_root": "",
                //            "favicon": "favicon.ico",
                //            "cloneable": true,
                //            "includes": 1,
                //            "inner_path": "content.json",
                //            "merged_type": "MoneyNetwork",
                //            "title": "W2 Wallet data hub",
                //            "files_optional": 0,
                //            "signs_required": 1,
                //            "modified": 1495987095,
                //            "ignore": "((js|css)/(?!all.(js|css))|.idea|.git|data/users/.*/.*)",
                //            "zeronet_version": "0.5.5",
                //            "postmessage_nonce_security": true,
                //            "address_index": 80726747
                //        },
                //        "peers": 30,
                //        "auth_key": "2e6660337d0efeaca1cd6ee4b3b3dbfcabe30693f37d483a497c38fe322547f8",
                //        "settings": {
                //            "peers": 29,
                //            "added": 1495960709,
                //            "bytes_recv": 1015239,
                //            "optional_downloaded": 507632,
                //            "bytes_sent": 668516,
                //            "ajax_key": "25cebf473bbfe3a497adebc997788fd0f6e63742bbbcdf7c78197d86c83859db",
                //            "modified": 1503387148,
                //            "cache": {},
                //            "serving": true,
                //            "own": true,
                //            "permissions": [],
                //            "size_optional": 579978,
                //            "size": 34486
                //        },
                //        "bad_files": 0,
                //        "workers": 0,
                //        "privatekey": false,
                //        "cert_user_id": "jro@zeroid.bit",
                //        "started_task_num": 0,
                //        "content_updated": null
                //    }
                //};
            }) ;


        }; // money_network_w2_7

        self.money_network_w2_8 = function () {
            var pgm = controller + '.money_network_w2_8: ' ;
            console.log(pgm + 'test 8 - merger sites - wrapperPermissionAdd') ;

            // fileGet returns script=null. OK with a shortcut link from Money Metwork to Money Network W2
            ZeroFrame.cmd("wrapperPermissionAdd", "Merger:MoneyNetwork", function (res) {
                if (res != "Granted") {
                    console.log(pgm + 'res = ', JSON.stringify(res)) ;
                    return ;
                }
                ZeroFrame.cmd("siteInfo", {}, function (site_info) {
                    console.log(pgm + 'res = ', JSON.stringify(res) + ', site_info = ' + JSON.stringify(ZeroFrame.site_info)) ;
                }) ;
            }) ;

        }; // money_network_w2_8

        self.money_network_w2_9 = function () {
            var pgm = controller + '.money_network_w2_9: ' ;
            console.log(pgm + 'test 9 - merger sites - mergerSiteAdd') ;

            //ZeroFrame.cmd("mergerSiteAdd", ["1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh"], function (res) {
            //    console.log(pgm + 'res = ', JSON.stringify(res) + ', site_info = ' + JSON.stringify(ZeroFrame.site_info)) ;
            //}) ;
            ZeroFrame.cmd("mergerSiteAdd", ["1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ"], function (res) {
                console.log(pgm + 'res = ', JSON.stringify(res) + ', site_info = ' + JSON.stringify(ZeroFrame.site_info)) ;
            }) ;

        }; // money_network_w2_9

        self.money_network_w2_10 = function () {
            var pgm = controller + '.money_network_w2_10: ' ;
            console.log(pgm + 'test 10 - merger sites - mergerSitedelete') ;

            // fileGet returns script=null. OK with a shortcut link from Money Metwork to Money Network W2
            ZeroFrame.cmd("mergerSiteDelete", "1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh", function (res) {
                console.log(pgm + 'res = ', JSON.stringify(res) + ', site_info = ' + JSON.stringify(ZeroFrame.site_info)) ;
            }) ;

        }; // money_network_w2_10

        self.money_network_w2_11 = function () {
            var pgm = controller + '.money_network_w2_11: ' ;
            var session_at, sessionid, url, query, sessionid_sha256, check_session ;
            session_at = new Date().getTime() ;
            sessionid = MoneyNetworkHelper.generate_random_password(60, true).toLowerCase();
            url = "/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1?sessionid=" + sessionid ;
            console.log(pgm + 'test 11 - use ZeroNet wrapperOpenWindow. url = ' + url) ;
            ZeroFrame.cmd("wrapperOpenWindow", [url, "_blank"]) ;

            // wait for session to start. no event file done event. wait for db update. max 1 minute
            sessionid_sha256 = CryptoJS.SHA256(sessionid).toString();
            query =
                "select keyvalue2.value as session_at, keyvalue3.value as pubkey2 " +
                "from keyvalue as keyvalue1, keyvalue as keyvalue2, keyvalue as keyvalue3 " +
                "where keyvalue1.key = 'sessionid_sha256' " +
                "and keyvalue1.value = '" + sessionid_sha256 + "' " +
                "and keyvalue2.json_id = keyvalue1.json_id " +
                "and keyvalue2.key = 'session_at' " +
                "and keyvalue3.json_id = keyvalue1.json_id " +
                "and keyvalue3.key = 'pubkey2' " +
                "and keyvalue2.value > '" + session_at + "'"  ;
            MoneyNetworkHelper.debug('select', 'query 18 = ' + query) ;
            var check_session = function(cb, count) {
                var debug_seq ;
                if (!count) count = 0;
                if (count > 60) return cb({ error: "timeout" }) ;
                debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 18') ;
                ZeroFrame.cmd("dbQuery", [query], function (res) {
                    var pgm = controller + '.money_network_w2_11.check_session: ' ;
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                    if (res.error) {
                        console.log(pgm + 'Error when checking for new wallet session. error = ' + res.error) ;
                        console.log(pgm + 'query = ' + query) ;
                        return cb({ error: res.error }) ;
                    }
                    if (res.length == 0) {
                        var job = function () { check_session(cb, count+1) };
                        $timeout(job, 1000) ;
                        return ;
                    }
                    cb({session_at: res[0].session_at, pubkey2: res[0].pubkey2 }) ;
                }); // dbQuery callback 1
            } // check_session
            check_session(function (res) {
                var elapsed ;
                if (res.error) console.log(pgm + 'wallet session was not found. error = ' + res.error) ;
                else {
                    elapsed = res.session_at - session_at ;
                    console.log(pgm + 'new wallet session was found. pubkey2 = ' + res.pubkey2 + ', waited ' + Math.round(elapsed / 1000) + ' seconds') ;
                }
                console.log(pgm + 'check_session. res = ' + JSON.stringify(res)) ;
            }) ;

        }; // money_network_w2_11

        self.money_network_w2_12 = function () {
            var pgm = controller + '.money_network_w2_12: ';
            console.log(pgm + 'Test siteList') ;
            ZeroFrame.cmd("siteList", [true], function (site_list) {
                console.log(pgm + 'site_list = ' + JSON.stringify(site_list));
            }) ;
        } ; // money_network_w2_12

        // end MoneyCtrl
    }])

;