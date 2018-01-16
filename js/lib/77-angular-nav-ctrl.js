angular.module('MoneyNetwork')

    .controller('NavCtrl', ['MoneyNetworkService', '$location', '$rootScope', 'shortCertTitleFilter', function (moneyNetworkService, $location, $rootScope, shortCertTitle) {
        var self = this;
        var controller = 'NavCtrl';
        console.log(controller + ' loaded');
        self.texts = {appname: 'Money Network'};

        self.is_logged_in = function() {
            if (!ZeroFrame.site_info) return false ;
            if (!ZeroFrame.site_info.cert_user_id) return false ;
            if (MoneyNetworkHelper.getUserId()) return true ;
            else return false ;
        };
        self.chat_link = function() {
            if (!self.is_logged_in()) return "#/chat2" ;
            var setup = moneyNetworkService.get_user_setup() ;
            if (setup.two_panel_chat) return "#/chat2" ;
            else return "#/chat" ;
        };

        self.logout = function() {
            moneyNetworkService.client_logout();
        };
        self.chat_notifications = moneyNetworkService.get_chat_notifications ;

        // get site info and current cert_user_id
        self.z = ZeroFrame ;

        // click on ZeroNet user id or "select ..." in menu line
        // already on auth page. display cert select dialog
        // not in auth page. redirect to auth page without starting a cert select dialog
        self.select_zeronet_cert = function() {
            var pgm = controller + '.select_zeronet_cert: ' ;
            var old_path ;
            old_path = $location.path();
            console.log(pgm + 'click. old_path = ' + old_path);
            if (old_path != '/auth') return ; // route provider will redirect to auth page and start cert select dialog
            // already in auth page. start cert select dialog
            ZeroFrame.cmd("certSelect", [["moneynetwork.bit", "nanasi", "zeroid.bit", "kaffie.bit", "moneynetwork"]], function() {
                // moneyNetworkService.update_site_info() ;
                $rootScope.$apply() ;
            });
        };

        // callback from ZeroFrame. ZeroFrame.prototype.route
        // update Current ZeroNet ID user id
        self.zeronet_cert_changed = function () {
            // moneyNetworkService.update_site_info() ;
        };

        // menu: cert title mouseover text
        self.cert_title = shortCertTitle(ZeroFrame.site_info && ZeroFrame.site_info.cert_user_id) ;
        self.update_cert_title = function () {
            var pgm = controller + '.update_cert_title: ' ;
            self.cert_title = shortCertTitle(ZeroFrame.site_info && ZeroFrame.site_info.cert_user_id) ;
            // console.log(pgm + 'cert_title = ' + self.cert_title) ;
        } ;

        self.z_cache = moneyNetworkService.get_z_cache() ;

        // end NavCtrl
    }])

;