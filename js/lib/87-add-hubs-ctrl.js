angular.module('MoneyNetwork')

    // AddHubsCtrl. Used in addHubs template. add/remove user and wallet data hubs to/from MoneyNetwork merger site

    .controller('AddHubsCtrl', ['$scope', 'safeApply', 'MoneyNetworkService',
        function ($scope, safeApply,  moneyNetworkService) {

        var self = this;
        var controller = 'AddHubsCtrl';
        console.log(controller + ' loaded');

        // get a list of all user and wallet data hubs. For add hub site(s) UI
        self.all_hubs = [] ;
        moneyNetworkService.get_all_hubs(false, function (all_hubs) {
            var pgm = controller + ' get_all_hubs callback: ' ;
            var retry ;
            self.all_hubs = all_hubs ;
            try {
                safeApply($scope) ;
            }
            catch (e) {
                console.log(pgm + 'safeApply failed. error = ' + e.message) ;
                console.log(e.stack);
            }
        }) ;

        // add/remove data hubs.
        self.add_remove_hub = function (hub_row) {
            var pgm = controller + '.add_remove_hub: ' ;
            if (hub_row.hub_added) {
                ZeroFrame.cmd("mergerSiteAdd", [hub_row.hub], function (res) {
                    console.log(pgm + 'mergerSiteAdd. res = ', JSON.stringify(res)) ;
                    if (res == 'ok') hub_row.hub_added = true ;
                }) ;
            }
            else {
                ZeroFrame.cmd("mergerSiteDelete", [hub_row.hub], function (res) {
                    console.log(pgm + 'mergerSiteDelete. res = ', JSON.stringify(res)) ;
                    if (res == 'ok') hub_row.hub_added = false ;
                }) ;
            }
        } ;
        self.open_hub_url = function (hub_row) {
            var pgm = controller + '.open_hub_url: ' ;
            moneyNetworkService.open_window(pgm, hub_row.url) ;
        };

        // AddHubsCtrl
    }])

;
