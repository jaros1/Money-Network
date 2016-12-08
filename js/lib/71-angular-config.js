// angularJS app
angular.module('MoneyNetwork', ['ngRoute', 'ngSanitize', 'ui.bootstrap']);

angular.module('MoneyNetwork')

    .config(['$routeProvider', function ($routeProvider) {

        var pgm = 'routeProvider: ' ;

        // resolve: check if user is logged. check is used in multiple routes
        var check_auth_resolve = ['$location', '$routeParams', function ($location, $routeParams) {
            if (!MoneyNetworkHelper.getUserId()) {
                var pgm = 'routeProvider.check_auth_resolve: ';
                var path = $location.path() ;
                var unique_id = path.split('/')[2] ;
                console.log(pgm + 'unique_id = ' + JSON.stringify(unique_id));
                if (!unique_id) unique_id = '' ;
                var info ;
                info = 'Not allowed. Please log in ' ;
                if (path == '/money') info += 'to see your wallet' ;
                else if (path == '/network') info += 'to see your contacts' ;
                else if (path.substr(0,5) == '/chat') info += 'to chat' ;
                else if (path == '/user') info += 'to see you user profile' ;
                ZeroFrame.cmd("wrapperNotification", ['info', info , 3000]);
                $location.path('/auth/' + unique_id);
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
                controller: 'MoneyCtrl as m',
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
            .when('/auth/:unique_id', {
                templateUrl: 'auth.html',
                controller: 'AuthCtrl as a',
            })
            .when('/auth', {
                templateUrl: 'auth.html',
                controller: 'AuthCtrl as a',
            })
            .otherwise({
                redirectTo: function () {
                    // error or startup
                    var pgm = 'routeProvider.otherwise: ' ;
                    var search, i, path ;
                    // start url was http://127.0.0.1:43110/1JeHa67QEvrrFpsSow82fLypw8LoRcmCXk/?path=/chat/d313edf9b48b930c5e2c8d0f5c9914ddcf62d9b3904dfc25bffb4d7dbae45f88
                    search = window.location.search ;
                    i = search.indexOf('path=') ;
                    if (i==-1) return '/auth' ; // error or no path in startup url
                    // redirect to startup path
                    path = search.substr(i+5) ;
                    i = path.indexOf('&') ;
                    if (i!=-1) path = path.substr(0,i) ;
                    return path;
                }
            });
        // end config (ng-routes)
    }]) ;
