angular.module('MoneyNetwork')
    
    .controller('AuthCtrl', ['$scope', '$rootScope', 'safeApply', '$location', '$routeParams', '$timeout', 'MoneyNetworkService',
                    function ($scope, $rootScope, safeApply, $location, $routeParams, $timeout, moneyNetworkService)
    {
        var self = this;
        var controller = 'AuthCtrl';
        console.log(controller + ' loaded');

        self.is_logged_in = function () {
            if (!ZeroFrame.site_info) return false ;
            if (!ZeroFrame.site_info.cert_user_id) return false ;
            return MoneyNetworkHelper.getUserId();
        };

        // used in auth page. set register = Y/N
        // Y if no users in localStorage. N if users in localStorage.
        // var register = { yn: 'Y' } ;
        self.register = moneyNetworkService.get_register() ;

        // startup. Set use_private_data
        self.use_private_data = MoneyNetworkHelper.ls_get_private_data() ;
        self.use_private_data_changed = function () {
            MoneyNetworkHelper.ls_set_private_data(self.use_private_data) ;
        };
        // startup. Set use_login
        self.use_login = moneyNetworkService.get_use_login() ;
        self.use_login_changed = moneyNetworkService.use_login_changed ;

        // check merger site permission + one user hub before log in
        // todo: what about auto log in?
        function check_merger_permission(cb) {
            var pgm = controller + '.check_merger_permission: ' ;
            if (!cb) cb = function (ok) {} ;
            var request1 = function (cb) {
                var pgm = controller + '.check_merger_permission.request1: ' ;
                ZeroFrame.cmd("wrapperPermissionAdd", "Merger:MoneyNetwork", function (res) {
                    if (res == "Granted") request2(cb) ;
                    else {
                        console.log(pgm + 'res = ', JSON.stringify(res)) ;
                        cb(false) ;
                    }
                }) ;
            } ; // request1
            var request2 = function (cb) {
                var pgm = controller + '.check_merger_permission.request2: ' ;
                return cb(true);
                ZeroFrame.cmd("mergerSiteAdd", ["1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh"], function (res) {
                    if (res == 'ok') cb(true) ;
                    else {
                        console.log(pgm + 'res = ', JSON.stringify(res)) ;
                        cb(false);
                    }
                }) ;
            }; // request2
            ZeroFrame.cmd("siteInfo", {}, function (site_info) {
                var pgm = controller + '.check_merger_permission siteInfo callback 1: ' ;
                // console.log(pgm , 'site_info = ' + JSON.stringify(site_info)) ;
                if (site_info.settings.permissions.indexOf("Merger:MoneyNetwork") == -1) return request1(cb);
                ZeroFrame.cmd("mergerSiteList", {}, function (merger_sites) {
                    var pgm = controller + '.check_merger_permission mergerSiteList callback 2: ' ;
                    // console.log(pgm + 'merger_sites = ', JSON.stringify(merger_sites)) ;
                    if (merger_sites["1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh"] == "MoneyNetwork") cb(true) ;
                    else request2(cb) ;
                }) ; // mergerSiteList callback 2
            }) ; // siteInfo callback 1
        } // check_merger_permission

        // callback when localStorage is ready (ZeroFrame's localStorage API is a little slow)
        var ls_was_loading = MoneyNetworkHelper.ls_is_loading();
        MoneyNetworkHelper.ls_bind(function() {
            check_merger_permission() ;
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
            if (self.register.yn != 'N') return true;
            if (!self.device_password) return true;
            if (self.device_password.length < 10) return true;
            return false;
        };
        self.register_disabled = function () {
            if (self.register.yn != 'Y') return true;
            if (!self.device_password) return true;
            if (self.device_password.length < 10) return true;
            if (!self.confirm_device_password) return true;
            return (self.device_password != self.confirm_device_password);
        };

        function get_no_passwords() {
            var passwords ;
            passwords = MoneyNetworkHelper.getItem('passwords') ;
            if (!passwords) return 0 ;
            try { passwords = JSON.parse(passwords)}
            catch (e) { return 0 }
            if (!Array.isArray(passwords)) return 0 ;
            else return passwords.length ;
        }

        self.login_or_register = function () {
            var pgm = controller + '.login_or_register: ';
            var create_new_account, create_guest_account, verb, msg ;
            console.log(pgm + 'click') ;

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
                self.register.yn = 'G' ;
                self.device_password = '';
                self.confirm_device_password = '';
                self.keysize = '256' ;
            }
            else if (!self.use_login.bol) {
                // login/register without a password and minimum keysize
                self.register.yn = 'Y' ;
                self.device_password = '';
                self.confirm_device_password = '';
                self.keysize = moneyNetworkService.is_proxy_server() ? '1024' : '256' ;
            }
            create_new_account = (self.register.yn != 'N');
            create_guest_account = (self.register.yn == 'G');

            // callback. warning if user has selected a long key
            var login_or_register_cb = function () {
                var pgm = controller + '.login_or_register_cb: ' ;
                var register, redirect, setup, a_path, z_path, z_title, old_no_accounts ;
                if (create_guest_account) {
                    self.device_password = MoneyNetworkHelper.generate_random_password(10) ;
                    MoneyNetworkHelper.delete_guest_account() ;
                }
                old_no_accounts = get_no_passwords() ;

                // login or register
                if (moneyNetworkService.client_login(self.device_password, create_new_account, create_guest_account, parseInt(self.keysize))) {
                    // log in OK - clear login form and redirect
                    register = self.register.yn ;
                    if (get_no_passwords() == old_no_accounts) ZeroFrame.cmd("wrapperNotification", ['done', 'Log in OK', 3000]);
                    else ZeroFrame.cmd("wrapperNotification", ['done', 'Log in with new account OK', 3000]);

                    self.device_password = '';
                    self.confirm_device_password = '';
                    self.register.yn = 'N';

                    // register new account? Ignore deep link
                    if (register == 'Y') {
                        // user must review user information.
                        a_path = '/user' ;
                        z_path = "?path=" + a_path ;
                        $location.path(a_path);
                        $location.replace() ;
                        ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Account", z_path]) ;
                        if (self.use_login.bol) ZeroFrame.cmd("wrapperNotification", ["info", "Welcome to Money Network. Please update your user info", 10000]);
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

            // check merger site permission before login
            check_merger_permission(function (ok) {
                if (!ok) {
                    ZeroFrame.cmd("wrapperNotification", ['info', 'Please grant Merger:MoneyNetwork permission', 5000]);
                    return ;
                }

                // login
                if ((self.register.yn != 'N') && (self.keysize >= '4096')) {
                    // warning before login user has selected a long key for a new account
                    verb = self.keysize == '4096' ? 'some' : 'long' ;
                    ZeroFrame.cmd("wrapperConfirm", ["Generating a " + self.keysize + " bits key will take " + verb + " time.<br>Continue?", "OK"], function (confirm) {
                        if (confirm) login_or_register_cb() ;
                    })
                }
                else if ((self.register.yn != 'N') && (self.keysize == '256') && moneyNetworkService.is_proxy_server()) {
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

            }) ; // check_merger_permission callback 1

        }; // self.login_or_register

        self.logout = function() {
            moneyNetworkService.client_logout();
        }; // self.logout


        // private key keysize. It takes long time to generate keys > 2048 bits
        self.keysize = "2048" ;
        self.set_keysize = function () {
            if (self.register.yn == 'Y') self.keysize = "2048" ;
            else if (self.register.yn == 'G') self.keysize = "1024" ;
        };

        // get site info and current cert_user_id
        // self.site_info = moneyNetworkService.get_site_info() ;
        self.z = ZeroFrame ;

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
                // moneyNetworkService.update_site_info() ;
            });
        };

        // get a list of all user and wallet data hubs. For add hub site(s) UI
        self.all_hubs = [] ;
        moneyNetworkService.get_all_hubs(false, function (all_hubs) {
            self.all_hubs = all_hubs ;
            safeApply($scope) ;
        }) ;

        // add/remove data hubs.
        self.add_remove_hub = function (hub_row) {
            var pgm = controller + '.add_remove_hub: ' ;
            if (hub_row.hub_added) {
                ZeroFrame.cmd("mergerSiteAdd", [hub_row.hub], function (res) {
                    console.log(pgm + 'mergerSiteAdd. res = ', JSON.stringify(res)) ;
                    if (res == 'ok') hub_row.hub_added = true ;
                }) ;
            }
            else {
                ZeroFrame.cmd("mergerSiteDelete", [hub_row.hub], function (res) {
                    console.log(pgm + 'mergerSiteDelete. res = ', JSON.stringify(res)) ;
                    if (res == 'ok') hub_row.hub_added = false ;
                }) ;
            }
        } ;
        self.open_hub_url = function (hub_row) {
            var pgm = controller + '.open_hub_url: ' ;
            moneyNetworkService.open_window(pgm, hub_row.url) ;
        };

        // end AuthCtrl
    }])

;
