angular.module('MoneyNetwork')

    .controller('MoneyCtrl', ['$window', function ($window) {
        var self = this;
        var controller = 'MoneyCtrl';
        console.log(controller + ' loaded');

        var array = new Uint32Array(10);
        $window.crypto.getRandomValues(array);

        // end MoneyCtrl
    }])

;