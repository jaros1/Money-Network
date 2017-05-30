angular.module('MoneyNetwork')

    .controller('WalletCtrl', ['$rootScope', '$window', '$location', 'MoneyNetworkService', function ($rootScope, $window, $location, moneyNetworkService) {
        var self = this;
        var controller = 'WalletCtrl';
        console.log(controller + ' loaded');

        self.new_wallet_url = $location.search()['new_wallet_site'] ; // redirect from a MoneyNetwork wallet site?
        var tested_wallet_url = null ; // last tested url

        var bitcoin_address_pattern = '1[a-km-zA-HJ-NP-Z1-9]{25,34}' ;

        function get_relative_url (url) {
            var pgm = controller + '.get_relative_url: ' ;
            var pos ;
            pos = url.indexOf('://') ;
            if (pos != -1) {
                // remove protocol (http, https etc)
                url = url.substr(pos+3) ;
                pos = url.indexOf('/') ;
                // remove domain from url
                if (pos == -1) return null ; // cannot be a ZeroNet site URL
                url = url.substr(pos) ;
                return url ;
            }
            if (url.substr(0,1) == '/') return url ;
            if (url.match(new RegExp('^' + bitcoin_address_pattern + '$'))) return '/' + url ;
            if (url.match(new RegExp('^' + bitcoin_address_pattern + '\/'))) return '/' + url ;
            return null ;
        } // get_relative_url

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

        var test1_open_url = (function () {
            var pgm = controller + '.test1: ' ;
            var info = {
                no: 1,
                text: 'Open wallet URL',
                status: 'Start test'
            }
            function feedback () {
                var relative_url ;
                console.log(pgm + 'arguments = ' + JSON.stringify(arguments)) ;
                if (arguments[0] == 'start test') {
                    info.status = 'Running' ;
                    relative_url = get_relative_url(self.new_wallet_url) ;
                    ZeroFrame.cmd("wrapperOpenWindow", [relative_url, "_blank"]) ;
                    return ;
                }
            }
            return {
                info: info,
                feedback: feedback
            };
        })(); // test1

        var test2_select_zeroid = (function () {
            var pgm = controller + '.test2: ' ;
            var info = {
                no: 2,
                text: 'ZeroID selected in wallet?',
                status: 'Not tested'
            }
            function feedback () {
                console.log(pgm + 'arguments = ' + JSON.stringify(arguments)) ;
            }
            return {
                info: info,
                feedback: feedback
            };
        })(); // test2

        var test3_merger_moneynetwork = (function () {
            var pgm = controller + '.test3: ' ;
            var info = {
                no: 3,
                text: 'Merger:MoneyNetwork permission granted in wallet?',
                status: 'Not tested'
            }
            function feedback () {
                console.log(pgm + 'arguments = ' + JSON.stringify(arguments)) ;
            }
            return {
                info: info,
                feedback: feedback
            };
        })(); // test2

        var test4_check_session = (function () {
            var pgm = controller + '.test2: ' ;
            var info = {
                no: 4,
                text: 'Checking session',
                status: 'Not tested'
            }
            function feedback () {
                console.log(pgm + 'arguments = ' + JSON.stringify(arguments)) ;
            }
            return {
                info: info,
                feedback: feedback
            };
        })(); // test4

        self.tests = [] ;
        function init_tests () {
            self.tests.splice(0, self.tests.length) ;
            self.tests.push(test1_open_url) ;
            self.tests.push(test2_select_zeroid) ;
            self.tests.push(test3_merger_moneynetwork) ;
            self.tests.push(test4_check_session) ;
        }
        init_tests();
        self.test_running = false ;

        function run_tests() {
            var relative_url ;
            self.test_running = true ;
            self.tests[0].feedback('start test') ;
            return ;
            //status = 'Running' ;
            //relative_url = get_relative_url(self.new_wallet_url) ;
            //ZeroFrame.cmd("wrapperOpenWindow", [relative_url, "_blank"]) ;
        } // run_tests


        self.test_feedback = function (test, result) {
            if (result) {
                test.status = 'Test OK' ;
                test.test_failed = false ;
            }
            else {
                test.status = 'Test failed' ;
                test.test_ok = false ;
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