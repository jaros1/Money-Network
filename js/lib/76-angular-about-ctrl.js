angular.module('MoneyNetwork')

    .controller('AboutCtrl', ['MoneyNetworkService', function (moneyNetworkService) {
        var self = this;
        var controller = 'AboutCtrl';
        console.log(controller + ' loaded');

        self.no_days_before_cleanup = moneyNetworkService.get_no_days_before_cleanup() ;

        // end AboutCtrl
    }])

;

