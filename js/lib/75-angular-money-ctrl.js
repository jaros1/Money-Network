angular.module('MoneyNetwork')

    .controller('MoneyCtrl', ['$window', '$http', '$timeout', function ($window, $http, $timeout) {
        var self = this;
        var controller = 'MoneyCtrl';
        console.log(controller + ' loaded');
        console.log(controller + ': site_info = ' + JSON.stringify(ZeroFrame.site_info)) ;

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
            console.log(pgm + 'test 6 - use fileGet to read Money Network W2 file') ;

            // fileGet returns script=null. OK with a shortcut link from Money Metwork to Money Network W2
            ZeroFrame.cmd("fileGet", {inner_path: '/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1/js/all.js', required: false}, function (script) {
                console.log(pgm + 'script = ', script) ;
            }) ;


        }; // money_network_w2_6

        self.money_network_w2_7 = function () {
            var pgm = controller + '.money_network_w2_7: ' ;
            console.log(pgm + 'test 7 - merger sites - mergerSiteList') ;


            // fileGet returns script=null. OK with a shortcut link from Money Metwork to Money Network W2
            ZeroFrame.cmd("mergerSiteList", {}, function (merger_sites) {
                console.log(pgm + 'merger_sites = ', JSON.stringify(merger_sites)) ;
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
            MoneyNetworkHelper.debug('select', 'query = ' + query) ;
            var check_session = function(cb, count) {
                if (!count) count = 0;
                if (count > 60) return cb({ error: "timeout" }) ;
                ZeroFrame.cmd("dbQuery", [query], function (res) {
                    var pgm = controller + '.money_network_w2_11.check_session: ' ;
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

        // end MoneyCtrl
    }])

;