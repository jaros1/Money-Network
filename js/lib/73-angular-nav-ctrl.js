angular.module('MoneyNetwork')

    .controller('NavCtrl', ['MoneyNetworkService', function (moneyNetworkService) {
        var self = this;
        var controller = 'NavCtrl';
        console.log(controller + ' loaded');
        self.texts = {appname: 'Money Network'};

        self.is_logged_in = function() {
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

        // end NavCtrl
    }])

;