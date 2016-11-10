angular.module('MoneyNetwork')

    .controller('NavCtrl', ['MoneyNetworkService', '$location', function (moneyNetworkService, $location) {
        var self = this;
        var controller = 'NavCtrl';
        console.log(controller + ' loaded');
        self.texts = {appname: 'Money Network'};

        self.is_logged_in = function() {
            if (MoneyNetworkHelper.getUserId()) return true ;
            else return false ;
        };

        self.logout = function() {
            moneyNetworkService.client_logout();
        };

        // end NavCtrl
    }])


    .controller('AboutCtrl', ['MoneyNetworkService', function (moneyNetworkService) {
        var self = this;
        var controller = 'AboutCtrl';
        console.log(controller + ' loaded');

        self.no_days_before_cleanup = moneyNetworkService.get_no_days_before_cleanup() ;

        // end AboutCtrl
    }])


    .controller('MoneyCtrl', [function () {
        var self = this;
        var controller = 'MoneyCtrl';
        console.log(controller + ' loaded');

        // end MoneyCtrl
    }])


    .controller('NetworkCtrl', ['MoneyNetworkService', '$scope', '$timeout', '$location', function (moneyNetworkService, $scope, $timeout, $location) {
        var self = this;
        var controller = 'NetworkCtrl';
        if (!MoneyNetworkHelper.getItem('userid')) return ; // not logged in - skip initialization of controller
        console.log(controller + ' loaded');

        // get contacts. two different types of contacts:
        // a) contacts stored in localStorage
        self.contacts = moneyNetworkService.local_storage_get_contacts() ; // array with contacts from localStorage
        // b) search for new ZeroNet contacts using user info (Search and Hidden keywords)
        self.zeronet_search_contacts = function() {
            MoneyNetworkHelper.z_contact_search(self.contacts, function () {$scope.$apply()}) ;
        };
        self.zeronet_search_contacts() ;

        // quick instructions for newcomers (no contacts)
        self.show_welcome_msg = function () {
            if (!self.contacts) return true ;
            return (self.contacts.length == 0) ;
        }; // show_welcome_msg

        // first column in contacts table. return user_id or type
        self.get_user_info = function (contact,search) {
            if (search.row == 1) {
                // return short cert_user_id or alias
                if (contact.alias) return '<b>' + contact.alias + '</b>';
                var i = contact.cert_user_id.indexOf('@') ;
                return '<b>' + contact.cert_user_id.substr(0,i) + '</b>';
            }
            if (search.row == 2) return '(' + contact.type + ')' ;
            return null ;
        };

        // edit alias functions
        // todo: almost identical code in Chat. Refactor to MoneyNetworkService
        self.edit_alias_title = "Edit alias. Press ENTER to save. Press ESC to cancel" ;
        var edit_alias_notifications = 1 ;
        self.edit_alias = function (contact, search) {
            var pgm = controller + '.edit_alias: ', i ;
            if (search.row != 1) return ;
            if (contact.alias) contact.new_alias = contact.alias ;
            else {
                i = contact.cert_user_id.indexOf('@') ;
                contact.new_alias = contact.cert_user_id.substr(0,i) ;
            }
            search.edit_alias = true ;
            if (edit_alias_notifications > 0) {
                ZeroFrame.cmd("wrapperNotification", ["info", self.edit_alias_title, 5000]);
                edit_alias_notifications-- ;
            }
            // set focus - in a timeout - wait for angularJS
            var id = contact.$$hashKey + ':alias' ;
            var set_focus = function () { document.getElementById(id).focus() } ;
            $timeout(set_focus) ;
        } ;
        self.cancel_edit_alias = function (contact, search) {
            var pgm = controller + '.cancel_edit_alias: ' ;
            delete contact.new_alias ;
            delete search.edit_alias ;
            $scope.$apply() ;
        } ;
        self.save_user_info = function (contact, search) {
            var pgm = controller + '.save_user_info: ';
            // update angular UI
            contact.alias = contact.new_alias ;
            delete search.edit_alias ;
            $scope.$apply() ;
            // save contacts in localStorage
            // console.log(pgm + 'calling local_storage_save_contacts') ;
            moneyNetworkService.local_storage_save_contacts(false) ;
        };

        // filter contacts. show contacts with green filter. hide contacts with red filter
        // saved in localStorage.setup.contact_filters (per user)
        // todo: refactor: same functions are used in chat controller
        self.filters = moneyNetworkService.get_contact_filters() || {
                all: 'red',
                new: 'green',
                unverified: 'green',
                verified: 'green',
                ignore: 'red'
            } ;
        self.toogle_filter = function (filter) {
            var pgm = controller + '.toogle_filter: ' ;
            if (self.filters[filter] == 'green') self.filters[filter] = 'red' ;
            else self.filters[filter] = 'green' ;
            // special action for all
            if (filter == 'all') {
                if (self.filters['all'] == 'green') {
                    // all: red => green. set all filters to green
                    for (filter in self.filters) self.filters[filter] = 'green' ;
                }
                else {
                    // all: green => red. set all filters to red if all filters are green
                    if (self.filters.new == 'red') return ;
                    if (self.filters.unverified == 'red') return ;
                    if (self.filters.verified == 'red') return ;
                    if (self.filters.ignore == 'red') return ;
                    for (filter in self.filters) self.filters[filter] = 'red' ;
                }
            }
            else if ((self.filters[filter] == 'red') && (self.filters.all == 'green')) self.filters.all = 'red' ;
            moneyNetworkService.set_contact_filters(self.filters) ;
        };
        self.filter_contacts = function (value, index, array) {
            var pgm = controller + '.filter_contacts: ' ;
            return (self.filters[value.type] == 'green');
        };

        // contacts sort options - typeahead auto complete functionality
        // todo: refactor - also used in chat controller
        self.contact_sort_options = ['Last updated', 'User name', 'Last chat msg', 'Number chat msg', 'ZeroNet disk usage', 'Browser disk usage'] ;
        self.contact_sort = moneyNetworkService.get_contact_sort() || self.contact_sort_options[0];
        self.contact_sort_title = self.contact_sort_options[0];
        for (var i=1 ; i<self.contact_sort_options.length ; i++) {
            if (i<self.contact_sort_options.length-1) self.contact_sort_title += ", " ;
            else self.contact_sort_title += " or " ;
            self.contact_sort_title += self.contact_sort_options[i] ;
        }
        self.contact_sort_changed = function () {
            var pgm = controller + '.sort_changed: ' ;
            // console.log(pgm + 'sort = ' + self.sort) ;
            moneyNetworkService.set_contact_sort(self.contact_sort);
        };

        self.contact_order_by = function (contact) {
            var pgm = controller + '.order_by: ';
            var i, last_updated, row, bytes, message ;
            if (self.contact_sort == 'Last updated') {
                for (i=0 ; i<contact.search.length ; i++) {
                    row = contact.search[i] ;
                    if (typeof row.value == 'number') return -row.value ;
                }
                return 0 ;
            }
            if (self.contact_sort == 'User name') {
                if (contact.alias) return '1' + contact.alias ;
                return '2' + contact.cert_user_id ;
            }
            if (self.contact_sort == 'Last chat msg') {
                if (!contact.messages || (contact.messages.length == 0)) return 0 ;
                return -contact.messages[contact.messages.length-1].sent_at ;
            }
            if (self.contact_sort == 'Number chat msg') {
                if (!contact.messages) return 0 ;
                return -contact.messages.length ;
            }
            if (self.contact_sort == 'ZeroNet disk usage') {
                if (!contact.messages) return 0 ;
                bytes = 0 ;
                for (i=0 ; i<contact.messages.length ; i++) {
                    message = contact.messages[i] ;
                    if ((message.folder == 'outbox') && message.zeronet_msg_size) bytes -= message.zeronet_msg_size ;
                }
                return bytes ;
            }
            if (self.contact_sort == 'Browser disk usage') { // localStorage
                if (!contact.messages) return 0 ;
                bytes = 0 ;
                for (i=0 ; i<contact.messages.length ; i++) {
                    message = contact.messages[i] ;
                    if (message.ls_msg_size) bytes -= message.ls_msg_size ;
                }
                return bytes ;
            }
            return 0 ;
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
        self.chat_contact = function (contact) {
            var pgm = controller + '.chat_contact: ' ;
            console.log(pgm + 'start');

            console.log(pgm + 'todo: must check if this contact is latest updated contact with identical cert_user_id or public key');
            var last_updated, last_updated2, i, j ;
            for (i=0 ; i<contact.search.length ; i++) if (typeof contact.search[i].value == 'number') last_updated = contact.search[i].value ;
            console.log(pgm + 'last_updated = ' + last_updated) ;

            $location.path('/chat/' + contact.unique_id);
            $location.replace();
        };
        self.contact_remove = function (contact) {
            moneyNetworkService.contact_remove(contact);
        };

        // end NetworkCtrl
    }])


    .controller('ChatCtrl', ['MoneyNetworkService', '$scope', '$timeout', '$routeParams', '$location', 'chatEditTextAreaIdFilter', 'chatEditImgIdFilter', 'formatChatMessageFilter', '$window',
        function (moneyNetworkService, $scope, $timeout, $routeParams, $location, chatEditTextAreaId, chatEditImgId, formatChatMessage, $window) {
            var self = this;
            var controller = 'ChatCtrl';
            if (!MoneyNetworkHelper.getItem('userid')) {
                // not logged in - skip initialization of controller
                return;
            }
            console.log(controller + ' loaded');
            $window.scrollTo(0, 0);

            // one (chat only) or two panel (network + chat) page?
            // console.log(controller + ': location.path = ' + $location.path());
            self.two_panel_chat = ($location.path().substr(0,6) == '/chat2') ;
            // console.log(controller + 'self.two_panel_chat = ' + self.two_panel_chat);
            self.two_panel_chat_changed = function () {
                var new_path ;
                if (self.two_panel_chat) new_path = $location.path().replace('chat','chat2');
                else new_path = $location.path().replace('chat2','chat');
                $location.path(new_path);
                $location.replace();
            };

            // get contacts. two different types of contacts:
            // a) contacts stored in localStorage
            self.contacts = moneyNetworkService.local_storage_get_contacts() ; // array with contacts from localStorage
            // b) search for new ZeroNet contacts using user info (Search and Hidden keywords)
            self.zeronet_search_contacts = function() {
                MoneyNetworkHelper.z_contact_search(self.contacts, function () {$scope.$apply()}) ;
            };
            self.zeronet_search_contacts() ;

            self.contact = null;
            self.messages = moneyNetworkService.javascript_get_messages();
            // console.log(controller + ': messages = ' + JSON.stringify(self.messages));

            // disabled chat. contact without public key. span with explanation about deleting old inactive accounts
            self.no_days_before_cleanup = moneyNetworkService.get_no_days_before_cleanup() ;

            // find contact. only relevant if chat is called from contact page
            function find_contact() {
                var pgm = controller + '.find_contact: ';
                var unique_id = $routeParams.unique_id;
                for (var i = 0; i < self.contacts.length; i++) {
                    if (self.contacts[i].unique_id == unique_id) {
                        self.contact = self.contacts[i];
                        if (!self.contact.messages) self.contact.messages = [];
                        // console.log(pgm + 'contact = ' + JSON.stringify(self.contact));
                        return
                    }
                }
                console.log(pgm + 'contact with unique id ' + unique_id + ' was not found');
            } // find_contact
            if ($routeParams.unique_id) find_contact();
            if (self.contact) {
                // set focus if chatting with a selected contact
                var focus_new_chat_msg = function() {
                    document.getElementById('new_chat_msg').focus() ;
                };
                $timeout(focus_new_chat_msg);
            }

            // my chat info
            var setup = JSON.parse(MoneyNetworkHelper.getItem('setup')) ;
            self.alias = setup.alias;
            self.avatar = moneyNetworkService.get_avatar();

            // quick instructions for newcomers
            self.show_welcome_msg1 = function () { // any contacts?
                if (!self.contacts) return true ;
                return (self.contacts.length == 0) ;
            }; // show_welcome_msg1
            self.show_welcome_msg2 = function () { // any messages?
                if (self.show_welcome_msg1()) return false ;
                if (self.contact) return false ;
                for (var i=0 ; i<self.contacts.length ; i++) {
                    if (self.contacts[i].messages && self.contacts[i].messages.length) return false ;
                }
                return true ;
            }; // show_welcome_msg2
            self.show_no_welcome = function() { // no special messages
                if (self.show_welcome_msg1()) return false ;
                if (self.show_welcome_msg2()) return false ;
                return true ;
            };

            // edit contact.alias functions
            // todo: almost identical code in NetworkCtrl. Refactor to MoneyNetworkService
            self.edit_alias_title = "Edit alias. Press ENTER to save. Press ESC to cancel" ;
            var edit_alias_notifications = 1 ;
            self.edit_alias = function (contact) {
                var pgm = controller + '.edit_alias: ', i, id ;
                if (contact) {
                    // left panel (network) edit contact alias
                    id = contact["$$hashKey"] + ":alias"
                }
                else {
                    // right panel (chat) edit contact alias
                    id = 'contact_alias_id';
                    contact = self.contact ;
                }
                if (contact.alias) contact.new_alias = contact.alias ;
                else {
                    i = contact.cert_user_id.indexOf('@') ;
                    contact.new_alias = contact.cert_user_id.substr(0,i) ;
                }
                contact.edit_alias = true ;
                if (edit_alias_notifications > 0) {
                    ZeroFrame.cmd("wrapperNotification", ["info", self.edit_alias_title, 5000]);
                    edit_alias_notifications-- ;
                }
                // set focus - in a timeout - wait for angularJS
                var set_focus = function () { document.getElementById(id).focus() } ;
                $timeout(set_focus) ;
            } ; // edit_alias
            self.cancel_edit_alias = function (contact) {
                var pgm = controller + '.cancel_edit_alias: ' ;
                console.log(pgm + 'contact = ' + JSON.stringify(contact));
                if (!contact) contact = self.contact ; // right panel
                delete contact.new_alias ;
                delete contact.edit_alias ;
                $scope.$apply() ;
            } ; // cancel_edit_alias
            self.save_user_info = function (contact) {
                var pgm = controller + '.save_user_info: ';
                if (!contact) contact = self.contact ; // right panel
                // update angular UI
                contact.alias = self.contact.new_alias ;
                delete contact.new_alias ;
                delete contact.edit_alias ;
                $scope.$apply() ;
                // save contacts in localStorage
                // console.log(pgm + 'calling local_storage_save_contacts') ;
                moneyNetworkService.local_storage_save_contacts(false) ;
            }; // save_user_info

            // filter contacts in chat. show chat from contacts with green filter. hide chat from contacts with red filter
            // saved in localStorage.setup.contact_filters (per user)
            // todo: refactor: same functions are used in network controller
            self.filters = moneyNetworkService.get_contact_filters() || {
                    all: 'red',
                    new: 'green',
                    unverified: 'green',
                    verified: 'green',
                    ignore: 'red'
                } ;
            self.toogle_filter = function (filter) {
                var pgm = controller + '.toogle_filter: ' ;
                if (self.filters[filter] == 'green') self.filters[filter] = 'red' ;
                else self.filters[filter] = 'green' ;
                // special action for all
                if (filter == 'all') {
                    if (self.filters['all'] == 'green') {
                        // all: red => green. set all filters to green
                        for (filter in self.filters) self.filters[filter] = 'green' ;
                    }
                    else {
                        // all: green => red. set all filters to red if all filters are green
                        if (self.filters.new == 'red') return ;
                        if (self.filters.unverified == 'red') return ;
                        if (self.filters.verified == 'red') return ;
                        if (self.filters.ignore == 'red') return ;
                        for (filter in self.filters) self.filters[filter] = 'red' ;
                    }
                }
                else if ((self.filters[filter] == 'red') && (self.filters.all == 'green')) self.filters.all = 'red' ;
                moneyNetworkService.set_contact_filters(self.filters) ;
            };

            // contact actions: add, ignore, verify, remove, chat
            self.contact_add = function () {
                moneyNetworkService.contact_add(self.contact);
            };
            self.contact_ignore = function () {
                moneyNetworkService.contact_ignore(self.contact);
            }; // unignore new contact
            self.contact_unplonk = function () {
                moneyNetworkService.contact_unplonk(self.contact);
            };
            self.contact_verify = function () {
                moneyNetworkService.contact_verify(self.contact);
            };
            self.show_contact_delete = function() {
                var pgm = controller + '.show_contact_delete: ' ;
                if (!self.contact) return false ;
                var no_msg = 0, i, message ;
                for (i=0 ; i<self.contact.messages.length ; i++) {
                    message = self.contact.messages[i];
                    if (!message.deleted_at) no_msg++ ;
                } // for i
                if (no_msg > 0) return true ;
                if (!self.contact.pubkey) return true ;
                return false ;
            };
            self.contact_delete = function () {
                var pgm = controller + '.contact_delete: ' ;
                if (moneyNetworkService.contact_delete(self.contact)) {
                    // contact deleted. show chat for all contacts
                    var location = $location.path('/chat');
                    console.log(pgm + 'old location = ' + location);
                    var index = location.lastIndexOf('/');
                    location = location.substr(0,index);
                    console.log(pgm + 'new location = ' + location);
                    $location.path(location);
                    $location.replace();
                }
            };
            self.show_verify_icon = function (message) {
                if (message.message.folder != 'inbox') return false ;
                if (message.message.message.msgtype != 'verify') return false ;
                if (!message.message.message.password_sha256) return false ;
                return true ;
            };
            self.show_image = function (message) {
                var pgm = controller + '.show_image: ' ;
                var show ;
                if (message.message.message.msgtype != 'chat msg') show=false ;
                else if (message.message.message.image) show=true ;
                else show=false ;
                // console.log(pgm + 'messsage = ' + JSON.stringify(message.message.message).substr(0,100) + ', show = ' + show);
                return show ;
            };
            self.enter_password = function (message) {
                ZeroFrame.cmd("wrapperPrompt", ["Enter verification password:", "text"], function (password) {
                    var pgm = controller + '.enter_password: ';
                    console.log(pgm + 'message.message = ' + JSON.stringify(message.message));
                    console.log(pgm + 'password = ' + password) ;
                    var expected_sha256 = message.message.message.password_sha256 ;
                    var found_sha256 = CryptoJS.SHA256(password).toString() ;
                    if (expected_sha256 != found_sha256) {
                        ZeroFrame.cmd("wrapperNotification", ["error", 'Invalid verification password. Try again', 3000]);
                        self.enter_password(message);
                        return ;
                    }
                    console.log(pgm + 'password is correct');
                    var verified_message = { msgtype: 'verified', password: password } ;
                    // validate json
                    var error = MoneyNetworkHelper.validate_json (pgm, verified_message, verified_message.msgtype, 'Password was correct but verification response was not sent to contact') ;
                    if (error) {
                        moneyNetworkService.local_storage_save_contacts(false);
                        ZeroFrame.cmd("wrapperNotification", ["Error", error]);
                        return ;
                    }
                    // send message
                    moneyNetworkService.add_msg(message.contact, verified_message) ;
                    moneyNetworkService.local_storage_save_contacts(true) ;
                    // notification
                    delete message.message.message.password_sha256 ;
                    ZeroFrame.cmd("wrapperNotification", ["info", "Verification OK", 3000]);
                });
            }; // enter_password

            self.contact_remove = function () {
                moneyNetworkService.contact_remove(self.contact);
            };

            // filter and order by used in ng-repeat filter
            self.filter = function (message, index, messages) {
                var pgm = controller + '.filter: ';
                var match ;
                if (message.message.deleted_at) match = false ;
                else if (!self.contact) {
                    // show chat for all contacts. Use green/red filter in top of page
                    match = (self.filters[message.contact.type] == 'green');
                }
                else match = (self.contact.unique_id == message.contact.unique_id); // show chat for one contact
                // console.log(pgm + 'local_msg_seq = ' + message.message.local_msg_seq + ', folder = ' + message.message.folder + ', match = ' + match);
                return match;
            };

            // contacts sort options - typeahead auto complete functionality
            // todo: refactor - also used in network controller
            self.contact_sort_options = ['Last updated', 'User name', 'Last chat msg', 'Number chat msg', 'ZeroNet disk usage', 'Browser disk usage'] ;
            self.contact_sort = moneyNetworkService.get_contact_sort() || self.contact_sort_options[0];
            self.contact_sort_title = self.contact_sort_options[0];
            for (var i=1 ; i<self.contact_sort_options.length ; i++) {
                if (i<self.contact_sort_options.length-1) self.contact_sort_title += ", " ;
                else self.contact_sort_title += " or " ;
                self.contact_sort_title += self.contact_sort_options[i] ;
            }
            self.contact_sort_changed = function () {
                var pgm = controller + '.sort_changed: ' ;
                // console.log(pgm + 'sort = ' + self.sort) ;
                moneyNetworkService.set_contact_sort(self.contact_sort);
            };

            self.contact_order_by = function (contact) {
                var pgm = controller + '.order_by: ';
                var i, last_updated, row, bytes, message ;
                if (self.contact_sort == 'Last updated') {
                    for (i=0 ; i<contact.search.length ; i++) {
                        row = contact.search[i] ;
                        if (typeof row.value == 'number') return -row.value ;
                    }
                    return 0 ;
                }
                if (self.contact_sort == 'User name') {
                    if (contact.alias) return '1' + contact.alias ;
                    return '2' + contact.cert_user_id ;
                }
                if (self.contact_sort == 'Last chat msg') {
                    if (!contact.messages || (contact.messages.length == 0)) return 0 ;
                    return -contact.messages[contact.messages.length-1].sent_at ;
                }
                if (self.contact_sort == 'Number chat msg') {
                    if (!contact.messages) return 0 ;
                    return -contact.messages.length ;
                }
                if (self.contact_sort == 'ZeroNet disk usage') {
                    if (!contact.messages) return 0 ;
                    bytes = 0 ;
                    for (i=0 ; i<contact.messages.length ; i++) {
                        message = contact.messages[i] ;
                        if ((message.folder == 'outbox') && message.zeronet_msg_size) bytes -= message.zeronet_msg_size ;
                    }
                    return bytes ;
                }
                if (self.contact_sort == 'Browser disk usage') { // localStorage
                    if (!contact.messages) return 0 ;
                    bytes = 0 ;
                    for (i=0 ; i<contact.messages.length ; i++) {
                        message = contact.messages[i] ;
                        if (message.ls_msg_size) bytes -= message.ls_msg_size ;
                    }
                    return bytes ;
                }
                return 0 ;
            }; // contact_order_by

            // chat sort options - typeahead auto complete functionality
            self.chat_sort_options = ['Last message', 'ZeroNet disk usage', 'Browser disk usage'] ;
            self.chat_sort = moneyNetworkService.get_chat_sort() || self.chat_sort_options[0];
            self.chat_sort_title = self.chat_sort_options[0];
            for (var i=1 ; i<self.chat_sort_options.length ; i++) {
                if (i<self.chat_sort_options.length-1) self.chat_sort_title += ", " ;
                else self.chat_sort_title += " or " ;
                self.chat_sort_title += self.chat_sort_options[i] ;
            }
            self.chat_sort_changed = function () {
                var pgm = controller + '.sort_changed: ' ;
                console.log(pgm + 'chat_sort = ' + self.chat_sort) ;
                moneyNetworkService.set_chat_sort(self.chat_sort);
            };
            self.chat_order_by = function (message) {
                var pgm = controller + '.order_by: ';
                // console.log(pgm + 'chat_sort = ' + self.chat_sort);
                if (self.chat_sort == 'Last message') {
                    return -message.message.sent_at ;
                }
                if (self.chat_sort == 'ZeroNet disk usage') {
                    if (!message.message.zeronet_msg_size) return 0 ;
                    return -message.message.zeronet_msg_size ;
                }
                if (self.chat_sort == 'Browser disk usage') {
                    if (!message.message.ls_msg_size) return 0 ;
                    return -message.message.ls_msg_size ;
                }
                return -message.message.sent_at
            };

            self.chat_contact = function (contact) {
                var pgm = controller + '.chat_contact: ';
                console.log(pgm + 'start');
                if (self.contact && !self.two_panel_chat) return; // already chatting with contact
                var new_path = '/chat' + (self.two_panel_chat ? '2' : '') + '/' + contact.unique_id ;
                console.log(pgm + 'new_path = ' + new_path);
                $location.path(new_path);
                $location.replace();
            }; // chat_contact

            self.new_chat_msg = '';
            self.new_chat_src = null ;

            self.handleTextAreaHeight = function (e) {
                var element = e.target;
                element.style.overflow = 'hidden';
                element.style.height = 0;
                element.style.height = element.scrollHeight + 'px';
            };
            self.send_chat_msg = function () {
                var pgm = controller + '.send_chat_msg: ';
                // check image attachment
                if (self.new_chat_src && !moneyNetworkService.get_image_ext_from_base64uri(self.new_chat_src)) {
                    ZeroFrame.cmd(
                        "wrapperNotification", ["error", "Ups. Something is wrong here.<br>" +
                        "Only png, jpg, jpeg, gif and tif images can be used in chat<br>" +
                        "Sending chat message without image", 5000]);
                    self.new_chat_src='';
                }
                // send chat message to contact
                var message = {
                    msgtype: 'chat msg',
                    message: self.new_chat_msg
                };
                if (self.new_chat_src) message.image = self.new_chat_src ;
                console.log(pgm + 'message = ' + JSON.stringify(message));
                // validate json
                var error = MoneyNetworkHelper.validate_json(pgm, message, message.msgtype, 'Could not send chat message');
                if (error) {
                    ZeroFrame.cmd("wrapperNotification", ["Error", error]);
                    return;
                }
                // console.log(pgm + 'last_sender_sha256 = ' + last_sender_sha256);
                // send message
                moneyNetworkService.add_msg(self.contact, message);
                // ready for next chat msg
                self.new_chat_msg = '';
                self.new_chat_src = null ;
                // console.log(pgm + 'contact = ' + JSON.stringify(contact));
                // update localStorage and ZeroNet
                // console.log(pgm + 'calling local_storage_save_contacts');
                moneyNetworkService.local_storage_save_contacts(true);
            }; // send_chat_msg

            self.changed_chat_msg = "";
            self.edit_chat_msg = function (message) {
                var pgm = controller + '.edit_chat_msg: ';
                console.log(pgm + 'message.message = ' + JSON.stringify(message.message));
                if ((message.message.folder == 'outbox') && (message.message.message.msgtype == 'chat msg')) {
                    // edit previously sent chat message. must send changed chat msg to contact
                    message.edit_chat_message = true;
                    // angularJS cheat - ng-bind is too slow - using id for get/set textarea value. Maybe also a problem with handleTextAreaHeight?
                    var textarea_id = chatEditTextAreaId(message);
                    document.getElementById(textarea_id).value = message.message.message.message;
                    var img_id = chatEditImgId(message) ;
                    // console.log(pgm + 'img_id = ' + img_id);
                    if (message.message.message.image) {
                        message.message.message.original_image = message.message.message.image ;
                        document.getElementById(img_id).src = message.message.message.image ;
                    }
                    // focus to edit chat message textarea field
                    var focus_textarea = function () {
                        var id = textarea_id + '' ;
                        document.getElementById(id).focus() ;
                    };
                    $timeout(focus_textarea);
                }
                else {
                    // just delete other type of messages from localStorage (ingoing chat messages, contact added, contact deleted etc)
                    var msg_text = formatChatMessage(message);
                    if (msg_text.length > 40) msg_text = msg_text.substring(0, 20) + "..." + msg_text.substring(msg_text.length - 15);
                    // console.log(pgm + 'msg_text.length = ' + msg_text.length);
                    ZeroFrame.cmd("wrapperConfirm", ['Delete "' + msg_text + '" message?', "Delete"], function (confirmed) {
                        if (!confirmed) return;
                        // console.log(pgm + 'delete message. message = ' + JSON.stringify(message));
                        //message = {
                        //    "contact": {
                        //        "unique_id": "1fd4b6355f6720f3288523026da0d84b4714c40baa764cf7263389f438bf845d",
                        //        "type": "unverified",
                        //        "auth_address": "1G6eMEv1AT9iGETcfvpLZayGHwS1DtU1rx",
                        //        "cert_user_id": "1G6eMEv1AT9iG@moneynetwork",
                        //        "avatar": "1.png",
                        //        "search": [{
                        //            "tag": "Last updated",
                        //            "value": 1478530860,
                        //            "privacy": "Search",
                        //            "row": 1
                        //        }, {"tag": "Name", "value": "onlyzero.net", "privacy": "Search", "row": 2}],
                        //        "messages": [{
                        //            "folder": "outbox",
                        //            "message": {"msgtype": "contact added", "search": []},
                        //            "local_msg_seq": 1,
                        //            "sender_sha256": "ce2dced194e600c54e348d32b64de85a3f2cf3e9a9ddd2bf0ee18b93a645df6a",
                        //            "zeronet_msg_id": "ae556fe598a1be5bebcbc3dcf716c358715a519a6a655e44a701a713f1980491",
                        //            "sent_at": 1478530721272,
                        //            "zeronet_msg_size": 792,
                        //            "msgtype": "chat msg",
                        //            "ls_msg_size": 322
                        //        }, {
                        //            "folder": "outbox",
                        //            "message": {"msgtype": "chat msg", "message": "hi"},
                        //            "msgtype": "chat msg",
                        //            "local_msg_seq": 4,
                        //            "sender_sha256": "ae0ab028c0ecb20a493d64fd0f28c343db8a6dd4376b7cfc9fdab4e0acf89ca4",
                        //            "sent_at": 1478530734549,
                        //            "ls_msg_size": 213
                        //        }, {
                        //            "local_msg_seq": 6,
                        //            "folder": "inbox",
                        //            "message": {"msgtype": "chat msg", "message": "Hi", "local_msg_seq": 5},
                        //            "zeronet_msg_id": "71fd10975d328724256aa80bb584dea0a5598525296a6e889111abc64895cc13",
                        //            "sender_sha256": "523aebd8f9a47f39fee01a9395afddf53bbae722825e5376a3e0bbb587c23f04",
                        //            "sent_at": 1478530859426,
                        //            "receiver_sha256": "ae0ab028c0ecb20a493d64fd0f28c343db8a6dd4376b7cfc9fdab4e0acf89ca4",
                        //            "received_at": 1478530860624,
                        //            "msgtype": "chat msg",
                        //            "ls_msg_size": 427
                        //        }, {
                        //            "folder": "outbox",
                        //            "message": {
                        //                "msgtype": "chat msg",
                        //                "message": "Money Network is a demo about money. With inspiration from Charles Eisenstein and Bernard Lietaer. Money is everywhere, money is everything and everything is money. This is an attempt to make money free. Make is easier to use complementare and alternative money. No more Hammerville.\n\n\nSummary:\n\nNo registration. User account is created in browser client. A anonymous ZeroNet cert is being for client communication.\nSearch for contacts in Money Network. Server returns possible contacts. Verify contacts.\nChat with contacts. Quick dialog. Small picture supported. todo: group chat.\nFree money definition. Use existing money definitions from network or create your own type of money.\nUse money to exchange goods and services. Transactions are stored encrypted in todo: block chains, clients or on ZeroNet.\nFull client side encryption. Only very little information is shared public and unencrypted.\nA client network. Data on clients. Minimum data on servers. Servers are used for communication between clients.\nOpen source. Feel free to clone, download, modify and make your own website or app.\nYou may want to use TOR when using Money Network on ZeroNet. You may NOT want to use a public ZeroNet proxy on clearnet.\nYou may want to make a backup todo: link of your local data. Everything is lost if you clear browser data or switches to an other browser client.\nYou may want to delete your data todo: link from ZeroNet and browser client when finished used this demo.\nData from inactive user accounts will be deleted from ZeroNet after 14 days. The data is still in client and will be restored from client to ZeroNet after next user login."
                        //            },
                        //            "msgtype": "chat msg",
                        //            "local_msg_seq": 7,
                        //            "sender_sha256": "5ebd760da144c8a1ec2801c12e89519c6509f04112246f38e983fba226927715",
                        //            "zeronet_msg_id": "e0931b2f2e561f5defa3b4de1a51296b7c3919cb6af14080cc5425b1f9264292",
                        //            "sent_at": 1478614714241,
                        //            "zeronet_msg_size": 2988,
                        //            "ls_msg_size": 1972
                        //        }, {
                        //            "folder": "outbox",
                        //            "message": {"msgtype": "chat msg", "message": "xxxx"},
                        //            "msgtype": "chat msg",
                        //            "local_msg_seq": 8,
                        //            "sender_sha256": "ef23446ae835de4674a0329f485f80a1ec1153004fe685fe0372a32963569dbd",
                        //            "zeronet_msg_id": "def5fb19b19f89f68285afa817eb5bd78fdc457a49d698d6a149830fece93677",
                        //            "sent_at": 1478670296121,
                        //            "zeronet_msg_size": 792,
                        //            "ls_msg_size": 322
                        //        }],
                        //        "outbox_sender_sha256": {
                        //            "ae0ab028c0ecb20a493d64fd0f28c343db8a6dd4376b7cfc9fdab4e0acf89ca4": {
                        //                "sent_at": 1478530734549,
                        //                "last_used_at": 1478530859426
                        //            }
                        //        },
                        //        "inbox_zeronet_msg_id": [],
                        //        "inbox_last_sender_sha256": "523aebd8f9a47f39fee01a9395afddf53bbae722825e5376a3e0bbb587c23f04",
                        //        "inbox_last_sender_sha256_at": 1478530859426,
                        //        "user_seq": 1,
                        //        "pubkey": "-----BEGIN PUBLIC KEY-----\nMIIBITANBgkqhkiG9w0BAQEFAAOCAQ4AMIIBCQKCAQB+WvexgFHjf9N7bkF7rnzi\n2SWpex7WfyuEiQc5dyi/HXJW1fXGCsVdBMuynFjUsj4Ka6+aX4bFfrE6OLhhYkZ/\nwrkOqlPp9I2USIoGl3Yy+xGMvkQzwKxiICZFtGcl9LBgJk3Zj6GlB8KxWFHveN9j\n1MAyEEntlsc5XP3z7kW9ECpIcn+3eXhSQYwZ9uhp6oWzlNSxx+JX3KVIb4dUisho\nlT1DpDvTqWukWkmiuJa2aiDmAkiiK5Hwnof+shJtpKRa/xnqVDOR6YOt1mw3CpiE\n8dMYStxSvsQryAecSHXi1D+ebzKX/tyF8gftzHoMqKK2Je8nsE2exxZSLGi1JDwZ\nAgMBAAE=\n-----END PUBLIC KEY-----"
                        //    },
                        //    "message": {
                        //        "local_msg_seq": 6,
                        //        "folder": "inbox",
                        //        "message": {"msgtype": "chat msg", "message": "Hi", "local_msg_seq": 5},
                        //        "zeronet_msg_id": "71fd10975d328724256aa80bb584dea0a5598525296a6e889111abc64895cc13",
                        //        "sender_sha256": "523aebd8f9a47f39fee01a9395afddf53bbae722825e5376a3e0bbb587c23f04",
                        //        "sent_at": 1478530859426,
                        //        "receiver_sha256": "ae0ab028c0ecb20a493d64fd0f28c343db8a6dd4376b7cfc9fdab4e0acf89ca4",
                        //        "received_at": 1478530860624,
                        //        "msgtype": "chat msg",
                        //        "ls_msg_size": 427
                        //    },
                        //    "$$hashKey": "object:71"
                        //};
                        message.message.deleted_at = new Date().getTime(); // logical delete
                        var index = null;
                        for (var i = 0; i < self.messages.length; i++) if (self.messages[i]["$$hashKey"] == message["$$hashKey"]) index = i;
                        // console.log(pgm + 'index = ' + index);
                        // remove from UI
                        self.messages.splice(index, 1);
                        $scope.$apply();
                        // update localStorage and optional zeronet
                        var update_zeronet = ((message.message.folder == 'outbox') && message.message.zeronet_msg_id) ;
                        moneyNetworkService.local_storage_save_contacts(update_zeronet);
                    }); // wrapperConfirm
                }
            }; // edit_chat_msg
            self.edit_chat_message_remove_image = function (message) {
                // remove from UI and message. old image is still in message.message.message.original_image ;
                var img_id = chatEditImgId(message) ;
                document.getElementById(img_id).src = '' ;
                delete message.message.message.image ;
            } ;
            self.cancel_edit_chat_msg = function (message) {
                var pgm = controller + '.cancel_edit_chat_msg: ';
                // angularJS cheat - ng-bind is too slow - using id for get/set textarea value. Maybe also a problem with handleTextAreaHeight?
                delete message.edit_chat_message ;
                var textarea_id = chatEditTextAreaId(message);
                textarea_id.value = '' ;
                if (message.message.message.original_image) {
                    message.message.message.image = message.message.message.original_image ;
                    delete message.message.message.original_image ;
                }
                var img_id = chatEditImgId(message) ;
                document.getElementById(img_id).src = null ;
            }; // cancel_edit_chat_msg
            self.save_chat_msg = function (message) {
                var pgm = controller + '.save_chat_msg: ';
                // angularJS cheat - ng-bind is too slow - using id for get/set textarea value. Maybe also a problem with handleTextAreaHeight?
                var textarea_id = chatEditTextAreaId(message);
                var old_value = message.message.message.message;
                var new_value = document.getElementById(textarea_id).value;
                document.getElementById(textarea_id).value = '' ;
                console.log(pgm + 'old message = ' + JSON.stringify(message.message));
                console.log(pgm + 'old value = ' + old_value);
                console.log(pgm + 'new value = ' + new_value);
                var old_image = message.message.message.original_image ;
                delete message.message.message.original_image ;
                var img_id = chatEditImgId(message) ;
                var new_image = document.getElementById(img_id).src ;
                if (new_image.match(/^http/)) new_image = null ;
                document.getElementById(img_id).src = '' ;
                delete message.edit_chat_message;
                if ((!new_value || (old_value == new_value)) && (old_image == new_image)) return;
                // send changed chat message
                var changed_message = {
                    msgtype: 'chat msg',
                    old_local_msg_seq: message.message.local_msg_seq,
                    message: new_value
                };
                if (new_image) changed_message.image = new_image ;
                console.log(pgm + 'changed_message = ' + JSON.stringify(changed_message));
                // validate json
                var error = MoneyNetworkHelper.validate_json(pgm, changed_message, changed_message.msgtype, 'Could not send changed chat message');
                if (error) {
                    ZeroFrame.cmd("wrapperNotification", ["Error", error]);
                    return;
                }
                // console.log(pgm + 'last_sender_sha256 = ' + last_sender_sha256);
                // send message
                moneyNetworkService.add_msg(message.contact, changed_message);
                // delete old message
                console.log(pgm + 'todo: keep old message in some kind of edit history?');
                message.message.deleted_at = new Date().getTime() ;
                // save localStorage and update ZeroNet
                moneyNetworkService.local_storage_save_contacts(true) ;
            }; // save_chat_msg
            self.delete_edit_chat_msg = function (message) {
                // called from edit chat message form. Always outbox message
                var pgm = controller + '.delete_edit_chat_msg: ';
                var msg_text = formatChatMessage(message);
                if (msg_text.length > 40) msg_text = msg_text.substring(0, 20) + "..." + msg_text.substring(msg_text.length - 15);
                console.log(pgm + 'msg_text.length = ' + msg_text.length);
                ZeroFrame.cmd("wrapperConfirm", ['Delete "' + msg_text + '" message?', "Delete"], function (confirmed) {
                    if (!confirmed) return;
                    console.log(pgm + 'deleting message ' + JSON.stringify(message));
                    // outbox: send delete chat message. note empty chat message
                    var delete_message = {
                        msgtype: 'chat msg',
                        old_local_msg_seq: message.message.local_msg_seq
                    };
                    console.log(pgm + 'delete_message = ' + JSON.stringify(delete_message));
                    // validate json
                    var error = MoneyNetworkHelper.validate_json(pgm, delete_message, delete_message.msgtype, 'Could not send delete chat message');
                    if (error) {
                        ZeroFrame.cmd("wrapperNotification", ["Error", error]);
                        return;
                    }
                    // console.log(pgm + 'last_sender_sha256 = ' + last_sender_sha256);
                    // send message
                    moneyNetworkService.add_msg(message.contact, delete_message);
                    // delete old message
                    delete message.edit_chat_message;
                    message.message.deleted_at = new Date().getTime();
                    delete message.message.image;
                    // delete new message (just created delete chat message message)
                    message.contact.messages[message.contact.messages.length - 1].deleted_at = new Date().getTime();
                    // save localStorage and update ZeroNet
                    moneyNetworkService.local_storage_save_contacts(true);
                }); // wrapperConfrm
            }; // delete_edit_chat_msg

            // catch drag and drop new chat message image. see imagedrop directive
            self.imageDropped = function () {
                var pgm = controller + '.imageDropped: ' ;

                // https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL
                var reader  = new FileReader();
                reader.addEventListener("load", function () {
                    var image_base64uri = reader.result ;
                    console.log(pgm + 'reader.result = ' + image_base64uri);
                    var ext = moneyNetworkService.get_image_ext_from_base64uri(image_base64uri);
                    if (!ext) {
                        ZeroFrame.cmd("wrapperNotification", ["error", "Sorry. Only png, jpg, jpeg, gif and tif images can be used in chat", 5000]);
                        return;
                    }
                    var max_image_size = moneyNetworkService.get_max_image_size() ;
                    if (image_base64uri.length * 0.75 > max_image_size) {
                        ZeroFrame.cmd("wrapperNotification", ["error", "Sorry. Image is too big. Max allowed size is about " + max_image_size + " bytes.", 5000]);
                        return;
                    }

                    self.new_chat_src = image_base64uri ;
                    $scope.$apply() ;

                }, false);
                reader.readAsDataURL($scope.uploadedFile);

            }; // imageDropped
            self.new_char_src_remove = function() {
                self.new_chat_src = '' ;
            } ;

            // ChatCtrl
        }])


    .controller('UserCtrl', ['$scope', '$rootScope', '$timeout', 'MoneyNetworkService', function($scope, $rootScope, $timeout, moneyNetworkService) {
        var self = this;
        var controller = 'UserCtrl';
        if (!MoneyNetworkHelper.getItem('userid')) return ; // not logged in - skip initialization of controller
        console.log(controller + ' loaded');

        self.user_info = moneyNetworkService.get_user_info() ; // array with tags and values from localStorage
        self.tags = moneyNetworkService.get_tags() ; // typeahead autocomplete functionality
        self.privacy_options = moneyNetworkService.get_privacy_options() ; // select options with privacy settings for user info
        self.show_privacy_title = moneyNetworkService.get_show_privacy_title() ; // checkbox - display column with privacy descriptions?


        // search for new ZeroNet contacts and add avatars for new contacts
        var contacts = moneyNetworkService.local_storage_get_contacts();
        self.zeronet_search_contacts = function () {
            MoneyNetworkHelper.z_contact_search(contacts, function () {
                $scope.$apply()
            });
        };
        self.zeronet_search_contacts();

        // quick instructions for newcomers
        self.show_welcome_msg = function () {
            if (!contacts) return true ;
            return (contacts.length == 0) ;
        }; // show_welcome_msg

        // add empty rows to user info table. triggered in privacy field. enter and tab (only for last row)
        self.insert_row = function(row) {
            var pgm = controller + '.insert_row: ' ;
            var index ;
            for (var i=0 ; i<self.user_info.length ; i++) if (self.user_info[i].$$hashKey == row.$$hashKey) index = i ;
            index = index + 1 ;
            self.user_info.splice(index, 0, moneyNetworkService.empty_user_info_line());
            $scope.$apply();
        };
        self.delete_row = function(row) {
            var pgm = controller + '.delete_row: ' ;
            var index ;
            for (var i=0 ; i<self.user_info.length ; i++) if (self.user_info[i].$$hashKey == row.$$hashKey) index = i ;
            // console.log(pgm + 'row = ' + JSON.stringify(row)) ;
            self.user_info.splice(index, 1);
            if (self.user_info.length == 0) self.user_info.splice(index, 0, moneyNetworkService.empty_user_info_line());
        };

        // user_info validations
        self.is_tag_required = function(row) {
            if (row.value) return true ;
            if (row.privary) return true ;
            return false ;
        };
        self.is_value_required = function(row) {
            if (!row.tag) return false ;
            if (row.tag == 'GPS') return false ;
            return true ;
        };
        self.is_privacy_required = function(row) {
            if (row.tag) return true ;
            if (row.value) return true ;
            return false ;
        };

        self.show_privacy_title_changed = function () {
            moneyNetworkService.set_show_privacy_title(self.show_privacy_title)
        };

        self.update_user_info = function () {
            var pgm = controller + '.update_user_info: ' ;
            // console.log(pgm + 'calling moneyNetworkService.save_user_info()');
            moneyNetworkService.save_user_info() ;
            // console.log(pgm) ;
        };
        self.revert_user_info = function () {
            var pgm = controller + '.revert_user_info: ' ;
            moneyNetworkService.load_user_info() ;
            // console.log(pgm) ;
        };

        // manage user avatar
        moneyNetworkService.load_avatar(function () {
            $scope.$apply() ;
        }) ;
        self.avatar = moneyNetworkService.get_avatar();
        // upload_avatar callback function. handle upload
        function handleAvatarUpload (image_base64uri) {
            var ext, image_base64, user_path;
            if (!image_base64uri) return ;
            user_path = "data/users/" + ZeroFrame.site_info.auth_address ;
            ext = moneyNetworkService.get_image_ext_from_base64uri(image_base64uri);
            if (['png','jpg'].indexOf(ext) == -1) {
                ZeroFrame.cmd("wrapperNotification", ["error", "Sorry. Only png, jpg and jpeg images can be used as avatar", 5000]);
                return ;
            }
            ZeroFrame.cmd("fileDelete", user_path + "/avatar.jpg", function (res) {});
            ZeroFrame.cmd("fileDelete", user_path + "/avatar.png", function (res) {});
            image_base64 = image_base64uri != null ? image_base64uri.replace(/.*?,/, "") : void 0;
            ZeroFrame.cmd("fileWrite", [user_path + "/avatar." + ext, image_base64], function(res) {
                var pgm = controller + '.handleAvatarUpload fileWrite callback: ';
                // console.log(pgm + 'res = ' + JSON.stringify(res));
                self.avatar.src = user_path + "/avatar." + ext + '?rev=' + MoneyNetworkHelper.generate_random_password(10);
                $scope.$apply() ;
                moneyNetworkService.zeronet_site_publish() ;
                //ZeroFrame.cmd("sitePublish", {inner_path: user_path + '/content.json'}, function (res) {
                //    // empty callback . no error handling. publish for avatar change is not important
                //}); // sitePublish
            }); // fileWrite
            // remove any previously random assigned avatar
            var setup ;
            setup = JSON.parse(MoneyNetworkHelper.getItem('setup'));
            if (setup.avatar) {
                delete setup.avatar ;
                MoneyNetworkHelper.setItem('setup', JSON.stringify(setup));
                MoneyNetworkHelper.ls_save();
            }
        } // handleAvatarUpload
        // avatar click using Uploadable class from ZeroMePlus
        self.upload_avatar = function () {
            var pgm = controller + '.upload_avatar: ';
            var uploadable_avatar = new Uploadable(handleAvatarUpload);
            uploadable_avatar.handleUploadClick() ;
        };

        // manage user alias
        var setup = JSON.parse(MoneyNetworkHelper.getItem('setup')) ;
        self.alias = setup.alias;
        self.editing_alias = false ;
        var edit_alias_notifications = 1 ;
        self.edit_alias = function () {
            self.editing_alias = true;
            if (edit_alias_notifications > 0) {
                ZeroFrame.cmd("wrapperNotification", ["info", "Edit alias. Press ENTER to save. Press ESC to cancel", 5000]);
                edit_alias_notifications--;
            }
            var set_focus = function () {
                document.getElementById('alias_id').focus()
            };
            $timeout(set_focus);
        };
        self.save_alias = function () {
            self.editing_alias = false ;
            $scope.$apply() ;
            setup.alias = self.alias ;
            MoneyNetworkHelper.setItem('setup', JSON.stringify(setup));
            MoneyNetworkHelper.ls_save() ;
        };
        self.cancel_edit_alias = function () {
            self.editing_alias = false ;
            self.alias = setup.alias;
            $scope.$apply() ;
        };

        // end UserCtrl
    }])


    .controller('AuthCtrl', ['$location', '$timeout', 'MoneyNetworkService', function ($location, $timeout, moneyNetworkService) {
        var self = this;
        var controller = 'AuthCtrl';
        console.log(controller + ' loaded');

        self.is_logged_in = function () {
            return MoneyNetworkHelper.getUserId();
        };
        self.register = 'N' ;
        function set_register_yn() {
            var pgm = controller + '.login_or_register: ' ;
            var passwords, no_users ;
            passwords = MoneyNetworkHelper.getItem('passwords') ;
            if (!passwords) no_users = 0 ;
            else no_users = JSON.parse(passwords).length ;
            self.register = (no_users == 0) ? 'Y' : 'N';
        }
        MoneyNetworkHelper.ls_bind(set_register_yn) ;

        // focus
        if (!self.is_logged_in()) {
            var set_focus = function () {
                document.getElementById('auth_password').focus()
            };
            $timeout(set_focus);
        }

        self.login_disabled = function () {
            if (self.register != 'N') return true;
            if (!self.device_password) return true;
            if (self.device_password.length < 10) return true;
            if (self.device_password.length > 50) return true;
            return false;
        };
        self.register_disabled = function () {
            if (self.register != 'Y') return true;
            if (!self.device_password) return true;
            if (self.device_password.length < 10) return true;
            if (self.device_password.length > 50) return true;
            if (!self.confirm_device_password) return true;
            return (self.device_password != self.confirm_device_password);
        };
        self.login_or_register = function () {
            var pgm = controller + '.login_or_register: ';
            var create_new_account = (self.register == 'Y');
            var userid = moneyNetworkService.client_login(self.device_password, create_new_account);
            // console.log(pgm + 'userid = ' + JSON.stringify(userid));
            if (userid) {
                // log in OK - clear login form and redirect
                ZeroFrame.cmd("wrapperNotification", ['done', 'Log in OK', 3000]);
                self.device_password = '';
                self.confirm_device_password = '';
                self.register = 'N';
                var user_info = moneyNetworkService.get_user_info() ;
                var empty_user_info_str = JSON.stringify([moneyNetworkService.empty_user_info_line()]) ;
                if (JSON.stringify(user_info) == empty_user_info_str) $location.path('/user');
                else $location.path('/home');
                $location.replace();
            }
            else ZeroFrame.cmd("wrapperNotification", ['error', 'Invalid password', 3000]);
        };

        // end AuthCtrl
    }])

;