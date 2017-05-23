angular.module('MoneyNetwork')

    .controller('MoneyCtrl', ['$window', '$http', function ($window, $http) {
        var self = this;
        var controller = 'MoneyCtrl';
        console.log(controller + ' loaded');
        console.log(controller + ': site_info = ' + JSON.stringify(ZeroFrame.site_info)) ;

        self.money_network_w2_1 = function () {
            var pgm = controller + '.money_network_w2_1: ' ;
            console.log(pgm + 'test 1 - add iframe to body') ;

            // not working - replaces money network with /1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1
            var iframe = document.createElement('iframe');
            iframe.src = '/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1' ;
            iframe.sandbox="allow-forms allow-scripts allow-top-navigation allow-popups allow-modals" ;
            iframe.id = 'money_network_w2_1' ;
            document.body.appendChild(iframe);

        }; // money_network_w2_1


        self.money_network_w2_2 = function () {
            var pgm = controller + '.money_network_w2_2: ' ;
            console.log(pgm + 'test 2 - use ZeroNet wrapperOpenWindow') ;

            //// not working - no window object is returned. cannot start communication from money network app
            var x = ZeroFrame.cmd("wrapperOpenWindow", ["/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1", "_blank"], function (res) {
                console.log(pgm +'res = ' + JSON.stringify(res)) ;
            }) ;
            console.log(pgm + 'x = ' + JSON.stringify(x)) ;


        }; // money_network_w2_2

        self.money_network_w2_3 = function () {
            var pgm = controller + '.money_network_w2_3: ' ;
            console.log(pgm + 'test 3 - use window.open') ;

            var x = window.open("/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1", "_blank") ;
            console.log(pgm + 'x = ' + CircularJSON.stringify(x)) ;


        }; // money_network_w2_3

        self.money_network_w2_4 = function () {
            var pgm = controller + '.money_network_w2_4: ' ;
            console.log(pgm + 'test 4 - use XMLHttpRequest - not implemented') ;
            $http.get('/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1',{ headers: { accept: 'text/html'}}).
                then(function successCallback(response) {
                    var pgm = controller + '.money_network_w2_4.successCallback: ' ;
                    console.log('response = ' + CircularJSON.stringify(response)) ;
                // this callback will be called asynchronously
                // when the response is available
            }, function errorCallback(response) {
                    var pgm = controller + '.money_network_w2_4.errorCallback: ' ;
                    console.log('response = ' + CircularJSON.stringify(response)) ;
                // called asynchronously if an error occurs
                // or server returns response with an error status.
            }) ;

        }; // money_network_w2_4

        self.money_network_w2_5 = function () {
            var pgm = controller + '.money_network_w2_5: ' ;
            console.log(pgm + 'test 5 - add iframe without a src to body') ;

            // add no src iframe to body. OK. No redirect
            var iframe = document.createElement('iframe');
            iframe.sandbox="allow-forms allow-scripts allow-top-navigation allow-popups allow-modals" ;
            iframe.id = 'money_network_w2_5' ;
            iframe.style.display = 'none' ;
            document.body.appendChild(iframe);
            // add html content. fails with Blocked a frame with origin "null" from accessing a cross-origin frame.
            var html = '<body><script type="text/javascript" src="/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1/js/all.js"></script></body>';
            iframe.contentWindow.document.open();
            iframe.contentWindow.document.write(html);
            iframe.contentWindow.document.close();
        }; // money_network_w2_5

        self.money_network_w2_6 = function () {
            var pgm = controller + '.money_network_w2_6: ' ;
            console.log(pgm + 'test 6 - use fileGet to read Money Network W2 file') ;

            // fileGet returns script=null. OK with a shortcut link from Money Metwork to Money Network W2
            ZeroFrame.cmd("fileGet", {inner_path: '/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1/js/all.js', required: false}, function (script) {
                console.log(pgm + 'script = ', script) ;
            }) ;


        }; // money_network_w2_6

        self.money_network_w2_7 = function () {
            var pgm = controller + '.money_network_w2_7: ' ;
            console.log(pgm + 'test 7 - merger sites - mergerSiteList') ;


            // fileGet returns script=null. OK with a shortcut link from Money Metwork to Money Network W2
            ZeroFrame.cmd("mergerSiteList", {}, function (merger_sites) {
                console.log(pgm + 'merger_sites = ', merger_sites) ;
            }) ;


        }; // money_network_w2_7

        self.money_network_w2_8 = function () {
            var pgm = controller + '.money_network_w2_8: ' ;
            console.log(pgm + 'test 8 - merger sites - wrapperPermissionAdd') ;


            // fileGet returns script=null. OK with a shortcut link from Money Metwork to Money Network W2
            ZeroFrame.cmd("wrapperPermissionAdd", "Merger:MoneyNetwork", function (res) {
                console.log(pgm + 'res = ', res) ;
            }) ;

        }; // money_network_w2_8

        self.money_network_w2_9 = function () {
            var pgm = controller + '.money_network_w2_9: ' ;
            console.log(pgm + 'test 9 - merger sites - mergerSiteAdd') ;


            // fileGet returns script=null. OK with a shortcut link from Money Metwork to Money Network W2
            ZeroFrame.cmd("mergerSiteAdd", ["182Uot1yJ6mZEwQYE5LX1P5f6VPyJ9gUGe"], function (res) {
                console.log(pgm + 'res = ', res) ;
                console.log(pgm + 'site_info = ' + JSON.stringify(ZeroFrame.site_info)) ;
            }) ;

        }; // money_network_w2_9

        self.money_network_w2_10 = function () {
            var pgm = controller + '.money_network_w2_10: ' ;
            console.log(pgm + 'test 10 - merger sites - mergerSitedelete') ;


            // fileGet returns script=null. OK with a shortcut link from Money Metwork to Money Network W2
            ZeroFrame.cmd("mergerSiteDelete", "182Uot1yJ6mZEwQYE5LX1P5f6VPyJ9gUGe", function (res) {
                console.log(pgm + 'res = ', res) ;
                console.log(pgm + 'site_info = ' + JSON.stringify(ZeroFrame.site_info)) ;
            }) ;

        }; // money_network_w2_10

        // end MoneyCtrl
    }])

;