angular.module('MoneyNetwork')
    
    .controller('AuthCtrl', ['$rootScope', '$location', '$routeParams', '$timeout', 'MoneyNetworkService',
                    function ($rootScope, $location, $routeParams, $timeout, moneyNetworkService)
    {
        var self = this;
        var controller = 'AuthCtrl';
        console.log(controller + ' loaded');

        self.is_logged_in = function () {
            return MoneyNetworkHelper.getUserId();
        };

        // startup. ZeroFrame's localStorage API is a little slow.
        // Y is users in localStorage. N if users in localStorage.
        self.register = 'Y' ;
        function set_register_yn() {
            var pgm = controller + '.login_or_register: ' ;
            var passwords, no_users ;
            passwords = MoneyNetworkHelper.getItem('passwords') ;
            if (!passwords) no_users = 0 ;
            else no_users = JSON.parse(passwords).length ;
            self.register = (no_users == 0) ? 'Y' : 'N';
        }
        MoneyNetworkHelper.ls_bind(set_register_yn) ; // called when localStorage is ready

        // focus
        if (!self.is_logged_in()) {
            var set_focus = function () {
                document.getElementById('auth_password').focus()
            };
            $timeout(set_focus);
        }

        self.login_disabled = function () {
            if (self.register != 'N') return true;
            if (!self.device_password) return true;
            if (self.device_password.length < 10) return true;
            return false;
        };
        self.register_disabled = function () {
            if (self.register != 'Y') return true;
            if (!self.device_password) return true;
            if (self.device_password.length < 10) return true;
            if (!self.confirm_device_password) return true;
            return (self.device_password != self.confirm_device_password);
        };
        self.login_or_register = function () {
            var pgm = controller + '.login_or_register: ';
            var create_new_account = (self.register != 'N');
            var create_guest_account = (self.register == 'G');
            var unique_id, setup ;

            var login_or_register = function () {
                if (create_guest_account) {
                    self.device_password = MoneyNetworkHelper.generate_random_password(10) ;
                    MoneyNetworkHelper.delete_guest_account() ;
                }
                var userid = moneyNetworkService.client_login(self.device_password, create_new_account, create_guest_account, parseInt(self.keysize));
                // console.log(pgm + 'userid = ' + JSON.stringify(userid));
                if (userid) {
                    // log in OK - clear login form and redirect
                    ZeroFrame.cmd("wrapperNotification", ['done', 'Log in OK', 3000]);
                    self.device_password = '';
                    self.confirm_device_password = '';
                    self.register = 'N';
                    // log in with a deep link (unique_id in path)
                    unique_id = $routeParams.unique_id ;
                    if (unique_id === undefined) unique_id = '' ;
                    console.log(pgm + 'unique_id = ' + JSON.stringify(unique_id));
                    if (unique_id && (unique_id == moneyNetworkService.get_my_unique_id())) unique_id = '' ;
                    // empty user setup - go to Account page first
                    var user_info = moneyNetworkService.get_user_info() ;
                    var empty_user_info_str = JSON.stringify([moneyNetworkService.empty_user_info_line()]) ;
                    if ((JSON.stringify(user_info) == empty_user_info_str) || create_guest_account) $location.path('/user/' + unique_id);
                    else {
                        // check setup. one or two panel chat. unique_id = deep link
                        setup = moneyNetworkService.get_user_setup() ;
                        if (!setup.hasOwnProperty('two_panel_chat')) setup.two_panel_chat = true ; // loading?
                        $location.path('/chat' + (setup.two_panel_chat ? '2' : '') + '/' + unique_id);
                    }
                    $location.replace();
                }
                else ZeroFrame.cmd("wrapperNotification", ['error', 'Invalid password', 3000]);

            } ;

            // warning if user has selected a long key
            if ((self.register != 'N') && (self.keysize >= '4096')) {
                ZeroFrame.cmd("wrapperConfirm", ["Generating a " + self.keysize + " bits key will take some time.<br>Continue?", "OK"], function (confirm) {
                    if (confirm) login_or_register() ;
                })
            }
            else login_or_register() ;

        };

        // default. Use JSEncrypt and 2048 bits keys for ingoing messages
        self.keysize = "2048" ;

        // check site info and get current cert_user_id
        self.site_info = {} ;
        function get_site_info() {
            ZeroFrame.cmd("siteInfo", {}, function (site_info) {
                self.site_info = site_info ;
                $rootScope.$apply() ;
            }) ;
        }
        get_site_info() ;

        //// watch changes in site_info & cert_user_id
        //function zero_frame_events () {
        //    var pgm = controller + '.zero_frame_events: ' ;
        //    if (arguments[0] != "cert_changed") return ;
        //    get_site_info() ;
        //    $rootScope.$apply() ;
        //}
        //ZeroFrame.bind_event(zero_frame_events);

        // change cert_user_id
        self.select_zeronet_cert = function() {
            var pgm = controller + '.select_zeronet_cert: ' ;
            console.log(pgm + 'click');
            ZeroFrame.cmd("certSelect", [["moneynetwork", "nanasi", "zeroid.bit"]], function() {
                get_site_info() ;
            });
        };

        // callback from ZeroFrame. ZeroFrame.prototype.route
        // update Current ZeroNet ID user id
        self.zeronet_cert_changed = function () {
            get_site_info() ;
        };

        // end AuthCtrl
    }])

;
