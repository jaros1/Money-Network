// angularJS app
angular.module('MoneyNetwork', ['ngRoute', 'ngSanitize', 'ui.bootstrap', 'infinite-scroll', 'mdMarkdownIt', 'ngDialog']);

angular.module('MoneyNetwork')

    .config(['$routeProvider', function ($routeProvider) {

        var pgm = 'routeProvider: ';

        // resolve: check if user is logged. check is used in multiple routes
        var check_auth_resolve = ['$location', function ($location) {
            var pgm = 'routeProvider.check_auth_resolve: ';
            if (!MoneyNetworkHelper.getUserId()) {
                // notification and redirect to auth. remember path for redirect after log in
                var old_a_path, new_a_path, z_path, info;
                old_a_path = $location.path();
                info = 'Not allowed. Please log in ';
                if (old_a_path == '/money') info += 'to see your wallet';
                else if (old_a_path == '/network') info += 'to see your contacts';
                else if (old_a_path.substr(0, 5) == '/chat') info += 'to chat';
                else if (old_a_path == '/user') info += 'to see you user profile';
                new_a_path = '/auth';
                z_path = "?path=/user&redirect=" + old_a_path;
                ZeroFrame.cmd("wrapperNotification", ['info', info, 3000]);
                $location.path(new_a_path).search('redirect', old_a_path);
                $location.replace();
                ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Account", z_path]);
                // console.log(pgm + 'old angularjs path = ' + old_a_path + ', new angularjs path = ' + new_a_path + ', z_path = ' + z_path + ', info = ' + info) ;
            }
            else {
                var a_path, a_search, key;
                a_path = $location.path();
                a_search = $location.search();
                z_path = "?path=" + a_path;
                for (key in a_search) z_path += '&' + key + '=' + a_search[key];
                // console.log(pgm + 'z_path = ' + z_path) ;
                ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Money Network", z_path]);
                return z_path;
            }
        }];

        var set_z_path = ['$location', function ($location) {
            var pgm = 'routeProvider.set_z_path: ';
            var a_path, a_search, z_path, key;
            a_path = $location.path();
            a_search = $location.search();
            z_path = "?path=" + a_path;
            for (key in a_search) z_path += '&' + key + '=' + a_search[key];
            // console.log(pgm + 'z_path = ' + z_path) ;
            ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Money Network", z_path]);
            return z_path;
        }];

        // setup routes. see ng-template in index.html page. same sequence as in menu
        $routeProvider
            .when('/about', {
                templateUrl: 'about.html',
                controller: 'AboutCtrl as a',
                resolve: {check_auth: set_z_path}
            })
            .when('/money', {
                templateUrl: 'money.html',
                controller: 'MoneyCtrl as m',
                resolve: {check_auth: set_z_path} // todo: enable log in authorization
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
                resolve: {check_auth: set_z_path}
            })
            .when('/chat2/:unique_id', {
                templateUrl: 'chat2.html',
                controller: 'ChatCtrl as c',
                resolve: {check_auth: set_z_path}
            })
            .when('/chat2', {
                templateUrl: 'chat2.html',
                controller: 'ChatCtrl as c',
                resolve: {check_auth: set_z_path}
            })
            .when('/wallet', {
                templateUrl: 'wallet.html',
                controller: 'WalletCtrl as w',
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
                resolve: {check_auth: set_z_path}
            })
            .when('/auth', {
                templateUrl: 'auth.html',
                controller: 'AuthCtrl as a',
                resolve: {check_auth: set_z_path}
            })
            .otherwise({
                redirectTo: function () {
                    // error or startup. Check deep link. redirect to auth or deep link
                    var pgm = 'routeProvider.otherwise: ';
                    var search, a_path, z_path, i, new_wallet_site;
                    search = window.location.search;
                    // check for deep link (path)
                    i = search.indexOf('path=');
                    if (i == -1) a_path = '/auth'; // error or no path in startup url
                    else {
                        // deep link
                        a_path = search.substr(i + 5);
                        i = a_path.indexOf('&');
                        if (i != -1) a_path = a_path.substr(0, i);
                    }
                    // check for new_wallet_site (redirect from a MoneyNetwork wallet site)
                    i = search.indexOf('new_wallet_site=');
                    if (i != -1) {
                        new_wallet_site = search.substr(i + 16);
                        i = new_wallet_site.indexOf('&');
                        if (i != -1) new_wallet_site = new_wallet_site.substr(0, i);
                    }
                    if (new_wallet_site) a_path +='?new_wallet_site=' + new_wallet_site ;
                    z_path = "?path=" + a_path;
                    // check for new_wallet_site
                    // console.log(pgm + 'window.location.search = ' + search + ', angularjs_path = ' + a_path + ', z_path = ' + z_path) ;
                    ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Log in", z_path]);
                    return a_path;
                }
            });
        // end config (ng-routes)

        // old marked config (https://github.com/chjj/marked)
        //}]).config(['markedProvider', function (markedProvider) {
        //    markedProvider.setOptions({
        //        gfm: true,
        //        breaks: true
        //    });

        // new markdown-it config
    }]).config(['markdownItConverterProvider', function(markdownItConverter) {
        markdownItConverter
            .config('commonmark', {
                gfm: true,
                breaks: true,
                html: true,
                linkify: true,
                typographer: true
            })
            .use(window.markdownitEmoji);

    }])

;


