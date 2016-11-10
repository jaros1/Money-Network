// angularJS app
angular.module('MoneyNetwork', ['ngRoute', 'ngSanitize', 'ui.bootstrap']);

angular.module('MoneyNetwork')

    .config(['$routeProvider', function ($routeProvider) {

        // resolve: check if user is logged. check is used in multiple routes
        var check_auth_resolve = ['$location', function ($location) {
            if (!MoneyNetworkHelper.getUserId()) {
                var pgm = 'routeProvider: ' ;
                var path = $location.path() ;
                var info ;
                info = 'Not allowed. Please log in ' ;
                if (path == '/money') info += 'to see your wallet' ;
                else if (path == '/network') info += 'to see your contacts' ;
                else if (path.substr(0,5) == '/chat') info += 'to chat' ;
                else if (path == '/user') info += 'to see you user profile' ;
                ZeroFrame.cmd("wrapperNotification", ['info', info , 3000]);
                $location.path('/auth');
                $location.replace();
            }
        }];

        // setup routes. see ng-template in index.html page. same sequence as in menu
        $routeProvider
            .when('/about', {
                templateUrl: 'about.html',
                controller: 'AboutCtrl as a'
            })
            .when('/money', {
                templateUrl: 'money.html',
                resolve: {check_auth: check_auth_resolve}
            })
            .when('/network', {
                templateUrl: 'network.html',
                controller: 'NetworkCtrl as c',
                resolve: {check_auth: check_auth_resolve}
            })
            .when('/chat/:unique_id', {
                templateUrl: 'chat.html',
                controller: 'ChatCtrl as c',
                resolve: {check_auth: check_auth_resolve}
            })
            .when('/chat', {
                templateUrl: 'chat.html',
                controller: 'ChatCtrl as c',
                resolve: {check_auth: check_auth_resolve}
            })
            .when('/chat2/:unique_id', {
                templateUrl: 'chat2.html',
                controller: 'ChatCtrl as c',
                resolve: {check_auth: check_auth_resolve}
            })
            .when('/chat2', {
                templateUrl: 'chat2.html',
                controller: 'ChatCtrl as c',
                resolve: {check_auth: check_auth_resolve}
            })
            .when('/user', {
                templateUrl: 'user.html',
                controller: 'UserCtrl as u',
                resolve: {check_auth: check_auth_resolve}
            })
            .when('/auth', {
                templateUrl: 'auth.html',
                controller: 'AuthCtrl as a',
            })
            .otherwise({
                redirectTo: function (routeParams, path, search) {
                    return '/auth';
                }
            });
        // end config (ng-routes)
    }]) ;
