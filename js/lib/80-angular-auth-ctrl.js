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

        // startup. set register
        // Y is users in localStorage. N if users in localStorage.
        self.register = 'Y' ;
        function set_register_yn() {
            var pgm = controller + '.set_register_yn: ' ;
            var passwords, no_users ;
            passwords = MoneyNetworkHelper.getItem('passwords') ;
            if (!passwords) no_users = 0 ;
            else no_users = JSON.parse(passwords).length ;
            self.register = (no_users == 0) ? 'Y' : 'N';
        }

        // startup. Set use_private_data
        self.use_private_data = MoneyNetworkHelper.ls_get_private_data() ;
        self.use_private_data_changed = function () {
            MoneyNetworkHelper.ls_set_private_data(self.use_private_data) ;
        };
        // startup. Set use_login
        self.use_login = true ;
        function set_use_login() {
            var pgm = controller + '.set_use_login: ' ;
            var login ;
            login = MoneyNetworkHelper.getItem('login') ;
            if (!login) {
                // still waiting for moneyNetworkService to be initialized ...
                $timeout(set_use_login, 100) ;
                return ;
            }
            login = JSON.parse(login) ;
            self.use_login = login ;
            // console.log(pgm + 'login = ' + login + ', self.use_login = ' + self.use_login) ;
        }
        self.use_login_changed = function () {
            var pgm = controller + '.use_login_changed: ' ;
            // console.log(pgm + 'click. use_login = ' + self.use_login) ;
            moneyNetworkService.client_logout(true) ; // true: disable notification and redirect
            MoneyNetworkHelper.setItem('login', JSON.stringify(self.use_login)) ;
            MoneyNetworkHelper.ls_save() ;
            MoneyNetworkHelper.use_login_changed() ;
            // warning
            if (self.use_login) {
                ZeroFrame.cmd("wrapperNotification", ['done',
                    'Password log in was enabled. No data was moved.<br>' +
                    'Note that private data from the unprotected<br>' +
                    'account still is in localStorage', 10000]);
            }
            else {
                ZeroFrame.cmd("wrapperNotification", ['done',
                    'Password log in was disabled. No data was moved.<br>' +
                    'Note that private data from password protected<br>' +
                    'account(s) still is in localStorage', 10000]);
            }
        } ;

        // callback when localStorage is ready (ZeroFrame's localStorage API is a little slow)
        var ls_was_loading = MoneyNetworkHelper.ls_is_loading();
        MoneyNetworkHelper.ls_bind(function() {
            set_register_yn() ;
            set_use_login() ;
            moneyNetworkService.load_server_info() ;
            if (ls_was_loading) $rootScope.$apply() ; // workaround. Only needed after page start/reload
        }) ;

        // focus
        if (!self.is_logged_in()) {
            var set_focus = function () {
                var id ;
                if (self.is_logged_in()) return ;
                id = document.getElementById('auth_password') ;
                if (id) id.focus() ;
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
            var create_new_account, create_guest_account, verb, msg ;

            // check ZeroFrame status before client log in
            if (!ZeroFrame.site_info) {
                ZeroFrame.cmd("wrapperNotification", ['info', 'Please wait. ZeroFrame is loading', 5000]);
                return ;
            }
            if (!ZeroFrame.site_info.cert_user_id) {
                ZeroFrame.cmd("wrapperNotification", ['info', 'Please select ZeroNet ID before log in', 5000]);
                return ;
            }
            if (self.use_private_data && MoneyNetworkHelper.ls_is_loading()) {
                ZeroFrame.cmd("wrapperNotification", ['info', 'Please wait. Loading localStorage data', 5000]);
                return ;
            }

            if (!self.use_private_data) {
                // login/register without saving any data in localStorage as Guest and using cryptMessage
                self.register = 'G' ;
                self.device_password = '';
                self.confirm_device_password = '';
                self.keysize = '256' ;
            }
            else if (!self.use_login) {
                // login/register without a password and minimum keysize
                self.register = 'Y' ;
                self.device_password = '';
                self.confirm_device_password = '';
                self.keysize = moneyNetworkService.is_proxy_server() ? '1024' : '256' ;
            }
            create_new_account = (self.register != 'N');
            create_guest_account = (self.register == 'G');

            // callback. warning if user has selected a long key
            var login_or_register_cb = function () {
                var pgm = controller + '.login_or_register_cb: ' ;
                var register, redirect, setup, a_path, z_path, z_title, verb ;
                if (create_guest_account) {
                    self.device_password = MoneyNetworkHelper.generate_random_password(10) ;
                    MoneyNetworkHelper.delete_guest_account() ;
                }

                // login or register
                if (moneyNetworkService.client_login(self.device_password, create_new_account, create_guest_account, parseInt(self.keysize))) {
                    // log in OK - clear login form and redirect
                    register = self.register ;
                    ZeroFrame.cmd("wrapperNotification", ['done', 'Log in OK', 3000]);
                    self.device_password = '';
                    self.confirm_device_password = '';
                    self.register = 'N';

                    // register new account? Ignore deep link
                    if (register == 'Y') {
                        // user must review user information.
                        a_path = '/user' ;
                        z_path = "?path=" + a_path ;
                        $location.path(a_path);
                        $location.replace() ;
                        ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Account", z_path]) ;
                        if (self.use_login) ZeroFrame.cmd("wrapperNotification", ["info", "Welcome to Money Network. Please update your user info", 10000]);
                        return ;
                    }

                    // deep link?
                    a_path = $location.search()['redirect'] ;
                    if (a_path) {
                        z_path = "?path=" + a_path ;
                        $location.path(a_path) ;
                        $location.replace();
                        ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Money Network", z_path]) ;
                        // console.log(pgm + 'login with a deep link: a_path = ' + a_path + ', z_path = ' + z_path) ;
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
                    // console.log(pgm + 'login without a deep link: a_path = ' + a_path + ', z_path = ' + z_path + ', z_title = ' + z_title) ;
                }
                else ZeroFrame.cmd("wrapperNotification", ['error', 'Invalid password', 3000]);
            } ; // login_or_register_cb


            if ((self.register != 'N') && (self.keysize >= '4096')) {
                // warning before login user has selected a long key for a new account
                verb = self.keysize == '4096' ? 'some' : 'long' ;
                ZeroFrame.cmd("wrapperConfirm", ["Generating a " + self.keysize + " bits key will take " + verb + " time.<br>Continue?", "OK"], function (confirm) {
                    if (confirm) login_or_register_cb() ;
                })
            }
            else if ((self.register != 'N') && (self.keysize == '256') && moneyNetworkService.is_proxy_server()) {
                // warning using cryptMessage on proxy servers
                msg = 'Warning. Using CryptMessage 256 bits encryption on a proxy server' +
                    '<br>Certificate is saved on proxy server (not secure),' +
                    '<br>certificate will be deleted after a short period' +
                    '<br>and message encrypted to this certificate will be lost.' +
                    '<br>Recommend instead using JSEncrypt with 1024 bits key. ' +
                    '<br>Private key will be saved encrypted in browser (localStorage).' +
                    '<br>Continue with CryptMessage and 256 bits key?';
                ZeroFrame.cmd("wrapperConfirm", [msg, "OK"], function (confirm) {
                    if (confirm) login_or_register_cb();
                })
            }
            else login_or_register_cb() ;

        }; // self.login_or_register

        self.logout = function() {
            moneyNetworkService.client_logout();
        }; // self.logout


        // private key keysize. It takes long time to generate keys > 2048 bits
        self.keysize = "2048" ;
        self.set_keysize = function () {
            if (self.register == 'Y') self.keysize = "2048" ;
            else if (self.register == 'G') self.keysize = "1024" ;
        };

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
            ZeroFrame.cmd("certSelect", [["moneynetwork.bit", "nanasi", "zeroid.bit", "kaffie.bit", "moneynetwork"]], function() {
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
