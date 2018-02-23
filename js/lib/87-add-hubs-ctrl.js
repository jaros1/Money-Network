angular.module('MoneyNetwork')

    // AddHubsCtrl. Used in addHubs template. add/remove user and wallet data hubs to/from MoneyNetwork merger site

    .controller('AddHubsCtrl', ['$scope', 'safeApply', 'MoneyNetworkService', function ($scope, safeApply, moneyNetworkService) {

        var self = this;
        var controller = 'AddHubsCtrl';
        console.log(controller + ' loaded');

        function hub_text (hub_info) {
            var text ;
            text = hub_info.title ? hub_info.title : 'n/a' ;
            if (hub_info.hasOwnProperty('no_users')) text += ' - ' + hub_info.no_users + ' users' ;
            if (hub_info.hasOwnProperty('peers')) text += ' - ' + hub_info.peers + ' peers' ;
            text += ' (' + hub_info.hub + ')' ;
            return text ;
        } // hub_text

        // get a list of all user and wallet data hubs. For add hub site(s) UI
        self.all_hubs = MoneyNetworkAPILib.get_all_hubs(false, function (all_hubs) {
            var pgm = controller + ' get_all_hubs callback: ';
            var i ;
            console.log(controller + ': self.all_hubs.length = ' + self.all_hubs.length);
            if (moneyNetworkService.get_user_id()) {
                // logged in. show change user hub input text
                for (i=0 ; i<all_hubs.length ; i++) {
                    if ((all_hubs[i].hub_type == 'user') && (all_hubs[i].hub_added)) {
                        self.user_data_hubs.push({hub: all_hubs[i].hub, text: hub_text(all_hubs[i])}) ;
                    }
                }
                moneyNetworkService.get_my_user_hub(function(my_user_hub, other_user_hub, other_user_hub_title) {
                    var i ;
                    for (i=0 ; i<all_hubs.length ; i++) {
                        if (all_hubs[i].hub == my_user_hub) self.my_user_data_hub = hub_text(all_hubs[i]) ;
                    }
                    self.old_user_data_hub = self.my_user_data_hub ;
                    self.show_my_user_data_hub = true ;
                    console.log(pgm + 'self.user_data_hubs = ' + JSON.stringify(self.user_data_hubs)) ;
                    console.log(pgm + 'self.show_my_user_data_hub = ' + JSON.stringify(self.show_my_user_data_hub)) ;
                    console.log(pgm + 'self.my_user_data_hub = ' + JSON.stringify(self.my_user_data_hub)) ;
                    safeApply($scope);

                }); // get_my_user_hub callback 2
            }
        }); // get_all_hubs callback 1

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
        self.help = moneyNetworkService.get_help() ;
        self.help_changed = function() {
            moneyNetworkService.set_help(self.help.bol) ;
        } ;

        // change user profile hub. only for logged in users
        self.show_my_user_data_hub = false ;
        self.my_user_data_hub = null ;
        self.old_user_data_hub = null ;
        self.user_data_hubs = [] ;
        self.my_user_data_hub_changed = function() {
            var pgm = controller + '.my_user_data_hub_changed: ' ;
            if (self.my_user_data_hub == self.old_user_data_hub) return ;
            console.log(pgm + 'self.my_user_data_hub = ' + self.my_user_data_hub) ;
            ZeroFrame.cmd("wrapperConfirm", ['Move user profile<br>from ' + self.old_user_data_hub + '<br>to ' + self.my_user_data_hub + '?', 'OK'], function (confirm) {
                var new_user_hub, pos1, pos2 ;
                console.log(pgm + 'confirm = ' + confirm) ;
                if (!confirm) {
                    self.my_user_data_hub = self.old_user_data_hub ;
                    return ;
                }
                // confirmed. move user profile to new user data hub
                pos1 = self.my_user_data_hub.lastIndexOf('(') ;
                pos2 = self.my_user_data_hub.lastIndexOf(')') ;
                new_user_hub = self.my_user_data_hub.substr(pos1+1,pos2-pos1-1) ;
                console.log(pgm + 'new_user_hub = ' + JSON.stringify(new_user_hub)) ;
                moneyNetworkService.move_user_hub(new_user_hub, function (res) {
                    console.log(pgm + 'move_user_hub. res = ' + JSON.stringify(res)) ;

                })


            })
        } ;

        // AddHubsCtrl
    }])

;
