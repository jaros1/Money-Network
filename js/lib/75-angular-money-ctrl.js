angular.module('MoneyNetwork')

    .controller('MoneyCtrl', ['$window', function ($window) {
        var self = this;
        var controller = 'MoneyCtrl';
        console.log(controller + ' loaded');

        for (var i=0 ; i<10 ; i++) {
            console.log(controller + ': i = ' + i) ;
            ZeroFrame.cmd("userPublickey", [i], function (publickey) {
                console.log(controller + ': public key = ' + publickey) ;
            });
        }

        // end MoneyCtrl
    }])

;