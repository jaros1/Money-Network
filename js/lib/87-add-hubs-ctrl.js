angular.module('MoneyNetwork')

    // AddHubsCtrl. Used in addHubs template. add/remove user and wallet data hubs to/from MoneyNetwork merger site

    .controller('AddHubsCtrl', ['$scope', 'safeApply', 'MoneyNetworkService', function ($scope, safeApply, moneyNetworkService) {

        var self = this;
        var controller = 'AddHubsCtrl';
        console.log(controller + ' loaded');

        // get a list of all user and wallet data hubs. For add hub site(s) UI
        self.all_hubs = MoneyNetworkAPILib.get_all_hubs(false, function () {
            var pgm = controller + ' get_all_hubs callback: ';
            safeApply($scope);
            console.log(controller + ': self.all_hubs.length = ' + self.all_hubs.length);
        });

        // add/remove data hubs.
        self.add_remove_hub = function (hub_row) {
            var pgm = controller + '.add_remove_hub: ';
            if (hub_row.hub_added) {
                moneyNetworkService.z_merger_site_add(hub_row.hub, function (res) {
                    // ZeroFrame.cmd("mergerSiteAdd", [hub_row.hub], function (res) {
                    console.log(pgm + 'mergerSiteAdd. res = ', JSON.stringify(res));
                    if (res == 'ok') hub_row.hub_added = true;
                });
            }
            else {
                ZeroFrame.cmd("mergerSiteDelete", [hub_row.hub], function (res) {
                    console.log(pgm + 'mergerSiteDelete. res = ', JSON.stringify(res));
                    if (res == 'ok') hub_row.hub_added = false;
                });
            }
        };
        self.open_hub_url = function (hub_row) {
            var pgm = controller + '.open_hub_url: ';
            moneyNetworkService.open_window(pgm, hub_row.url);
        };

        // download and help distribute all files? (user data hubs). used for public chat

        // todo: move get/set help to moneyNetworkService. See set_register_yn() and set_use_login()

        self.help = moneyNetworkService.get_help() ;
        self.help_changed = function() {
            moneyNetworkService.set_help(self.help.bol) ;
        } ;

        // AddHubsCtrl
    }])

;
