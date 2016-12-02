angular.module('MoneyNetwork')
    
    .controller('NetworkCtrl', ['MoneyNetworkService', '$scope', '$timeout', '$location', 'dateFilter',
                        function (moneyNetworkService, $scope, $timeout, $location, date)
    {
        var self = this;
        var controller = 'NetworkCtrl';
        if (!MoneyNetworkHelper.getItem('userid')) return ; // not logged in - skip initialization of controller
        console.log(controller + ' loaded');

        // get contacts. two different types of contacts:
        // a) contacts stored in localStorage
        self.contacts = moneyNetworkService.get_contacts() ; // array with contacts from localStorage
        // b) search for new ZeroNet contacts using user info (Search and Hidden keywords)
        self.zeronet_search_contacts = function() {
            moneyNetworkService.z_contact_search(function () {$scope.$apply()}, null) ;
        };
        self.zeronet_search_contacts() ;

        // quick instructions for newcomers (no contacts)
        self.show_welcome_msg = function () {
            if (!self.contacts) return true ;
            return (self.contacts.length == 0) ;
        }; // show_welcome_msg

        //// first column in contacts table. return user_id or type
        //self.get_user_info = function (contact,search) {
        //    if (search.row == 1) return '<b>' + moneyNetworkService.get_contact_name(contact) + '</b>';
        //    if (search.row == 2) return '(' + contact.type + ')' ;
        //    return null ;
        //};

        // edit contact alias functions
        // todo: almost identical code in Chat. Refactor to MoneyNetworkService
        self.edit_alias_title = "Edit alias. Press ENTER to save. Press ESC to cancel" ;
        var edit_alias_notifications = 1 ;
        self.edit_alias = function (contact) {
            var pgm = controller + '.edit_alias: ', i ;
            contact.new_alias = moneyNetworkService.get_contact_name(contact);
            contact.edit_alias = true ;
            if (edit_alias_notifications > 0) {
                ZeroFrame.cmd("wrapperNotification", ["info", self.edit_alias_title, 5000]);
                edit_alias_notifications-- ;
            }
            // set focus - in a timeout - wait for angularJS
            var id = contact.$$hashKey + ':alias' ;
            var set_focus = function () { document.getElementById(id).focus() } ;
            $timeout(set_focus) ;
        } ;
        self.cancel_edit_alias = function (contact) {
            var pgm = controller + '.cancel_edit_alias: ' ;
            delete contact.new_alias ;
            delete contact.edit_alias ;
            $scope.$apply() ;
        } ;
        self.save_user_info = function (contact) {
            var pgm = controller + '.save_user_info: ';
            // update angular UI
            contact.alias = contact.new_alias ;
            delete contact.edit_alias ;
            $scope.$apply() ;
            // save contacts in localStorage
            // console.log(pgm + 'calling ls_save_contacts') ;
            moneyNetworkService.ls_save_contacts(false) ;
        };

        // get user setup. contact_filters and contact_sort are used in this controller
        self.setup = moneyNetworkService.get_user_setup() ;

        // toggle contact filter. red <=> green
        self.toggle_filter = function (filter) {
            var pgm = controller + '.toggle_filter: ' ;
            if (self.setup.contact_filters[filter] == 'green') self.setup.contact_filters[filter] = 'red' ;
            else self.setup.contact_filters[filter] = 'green' ;
            // special action for all
            if (filter == 'all') {
                if (self.setup.contact_filters['all'] == 'green') {
                    // all: red => green. set all filters to green
                    for (filter in self.setup.contact_filters) self.setup.contact_filters[filter] = 'green' ;
                }
                else {
                    // all: green => red. set all filters to red if all filters are green
                    if (self.setup.contact_filters.new == 'red') return ;
                    if (self.setup.contact_filters.unverified == 'red') return ;
                    if (self.setup.contact_filters.verified == 'red') return ;
                    if (self.setup.contact_filters.ignore == 'red') return ;
                    for (filter in self.setup.contact_filters) self.setup.contact_filters[filter] = 'red' ;
                }
            }
            else if ((self.setup.contact_filters[filter] == 'red') && (self.setup.contact_filters.all == 'green')) self.setup.contact_filters.all = 'red' ;
            moneyNetworkService.save_user_setup() ;
        };
        self.filter_contacts = function (value, index, array) {
            var pgm = controller + '.filter_contacts: ' ;
            return (self.setup.contact_filters[value.type] == 'green');
        };

        // contacts sort options - typeahead auto complete functionality
        // todo: refactor - also used in chat controller
        self.contact_sort_options = moneyNetworkService.get_contact_sort_options() ;
        self.contact_sort_title = moneyNetworkService.get_contact_sort_title() ;
        self.contact_sort_changed = function () {
            var pgm = controller + '.sort_changed: ' ;
            // console.log(pgm + 'sort = ' + self.sort) ;
            moneyNetworkService.save_user_setup();
        };

        self.contact_order_by = function (contact) {
            return moneyNetworkService.contact_order_by(contact) ;
        }; // contact_order_by

        // contact actions: add, ignore, verify, remove, chat
        self.contact_add = function (contact) {
            moneyNetworkService.contact_add(contact) ;
        };
        self.contact_ignore = function (contact) {
            moneyNetworkService.contact_ignore(contact);
        }; // contact_ignore
        self.contact_unplonk = function (contact) {
            moneyNetworkService.contact_unplonk(contact);
        };
        self.contact_verify = function (contact) {
            moneyNetworkService.contact_verify(contact);
        };
        // todo: also chat_contact method in chat controller. refactor
        self.chat_contact = function (contact) {
            // notification if starting chat with an older contact (Last online timestamp)
            moneyNetworkService.notification_if_old_contact(contact);
            $location.path('/chat2/' + contact.unique_id);
            $location.replace();
        };
        self.contact_remove = function (contact) {
            moneyNetworkService.contact_remove(contact);
        };

        // end NetworkCtrl
    }])

;
