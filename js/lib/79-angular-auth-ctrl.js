angular.module('MoneyNetwork')
    
    .controller('AuthCtrl', ['$location', '$timeout', 'MoneyNetworkService', function ($location, $timeout, moneyNetworkService) {
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
                var user_info = moneyNetworkService.get_user_info() ;
                var empty_user_info_str = JSON.stringify([moneyNetworkService.empty_user_info_line()]) ;
                if ((JSON.stringify(user_info) == empty_user_info_str) || create_guest_account) $location.path('/user');
                else {
                    var setup = moneyNetworkService.get_user_setup() ;
                    $location.path('/chat' + (setup.two_panel_chat ? '2' : ''));
                }
                $location.replace();
            }
            else ZeroFrame.cmd("wrapperNotification", ['error', 'Invalid password', 3000]);
        };
        self.keysize = "2048" ;

        // end AuthCtrl
    }])

;
