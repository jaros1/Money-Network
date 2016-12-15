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
            var create_new_account, create_guest_account ;
            create_new_account = (self.register != 'N');
            create_guest_account = (self.register == 'G');

            // callback. warning if user has selected a long key
            var login_or_register_cb = function () {
                var pgm = controller + '.login_or_register_cb: ' ;
                var unique_id, setup, a_path, z_path, z_title ;
                if (create_guest_account) {
                    self.device_password = MoneyNetworkHelper.generate_random_password(10) ;
                    MoneyNetworkHelper.delete_guest_account() ;
                }
                // login or register
                if (moneyNetworkService.client_login(self.device_password, create_new_account, create_guest_account, parseInt(self.keysize))) {
                    // log in OK - clear login form and redirect
                    ZeroFrame.cmd("wrapperNotification", ['done', 'Log in OK', 3000]);
                    self.device_password = '';
                    self.confirm_device_password = '';
                    self.register = 'N';
                    // redirect to deep link?
                    a_path = $location.search('redirect') ;
                    if (a_path) {
                        z_path = "?path=" + a_path ;
                        $location.path(a_path) ;
                        $location.replace();
                        ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Money Network", z_path]) ;
                        return ;
                    }
                    // no deep link. redirect to Account or Chat pages
                    // empty user setup - go to Account page first
                    var user_info = moneyNetworkService.get_user_info() ;
                    var empty_user_info_str = JSON.stringify([moneyNetworkService.empty_user_info_line()]) ;
                    if ((JSON.stringify(user_info) == empty_user_info_str) || create_guest_account) {
                        // empty or new user
                        a_path = '/user';
                        z_title = 'Account' ;
                    }
                    else {
                        // old non empty user
                        setup = moneyNetworkService.get_user_setup() ;
                        if (!setup.hasOwnProperty('two_panel_chat')) setup.two_panel_chat = true ;
                        a_path = '/chat' + (setup.two_panel_chat ? '2' : '') ;
                        z_title = 'Chat' ;
                    }
                    z_path = "?path=" + a_path ;
                    // redirect to Account or Chat
                    $location.path(a_path) ;
                    $location.replace();
                    ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, z_title, z_path]) ;
                }
                else ZeroFrame.cmd("wrapperNotification", ['error', 'Invalid password', 3000]);
            } ; // login_or_register_cb

            // warning before login user has selected a long key for a new account
            if ((self.register != 'N') && (self.keysize >= '4096')) {
                ZeroFrame.cmd("wrapperConfirm", ["Generating a " + self.keysize + " bits key will take some time.<br>Continue?", "OK"], function (confirm) {
                    if (confirm) login_or_register_cb() ;
                })
            }
            else login_or_register_cb() ;

        }; // self.login_or_register

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
