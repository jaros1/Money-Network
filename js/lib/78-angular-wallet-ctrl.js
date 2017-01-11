angular.module('MoneyNetwork')

    .controller('WalletCtrl', ['$window', 'MoneyNetworkService', function ($window, moneyNetworkService) {
        var self = this;
        var controller = 'WalletCtrl';
        console.log(controller + ' loaded');

        // JSEncrypt test
        (function () {
            var contacts = moneyNetworkService.get_contacts() ;

        })() ;


        // end WalletCtrl
    }])

;