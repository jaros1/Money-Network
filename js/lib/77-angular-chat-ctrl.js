angular.module('MoneyNetwork')
    
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

            function debug (key, text) { MoneyNetworkHelper.debug(key, text) }

            // get user setup.
            self.setup = moneyNetworkService.get_user_setup() ;

            // two panel chat?
            (function(){
                var two_panel_chat = ($location.path().substr(0,6) == '/chat2') ;
                if (self.setup.two_panel_chat != two_panel_chat) {
                    // must be a direct link. update user setup
                    self.setup.two_panel_chat = two_panel_chat ;
                    moneyNetworkService.save_user_setup() ;
                }
            })() ;
            self.two_panel_chat_changed = function () {
                var pgm = controller + '.two_panel_chat_changed: ' ;
                moneyNetworkService.save_user_setup() ;
                // keep contact / group chat context when redirect between one and two panel chat pages
                console.log(pgm + '$location.path = ' + $location.path()) ;
                var contact, path1, path2, a_path, z_path ;
                if (self.group_chat) contact = find_group_chat_contact(true) ;
                else contact = self.contact ;
                // redirect to other chat page (chat / chat2 ). keep chat context and update angularJS and ZeroNet path
                path1 = self.setup.two_panel_chat ? '/chat2' : '/chat' ;
                if (!contact) path2 = '' ;
                else if ((contact.type == 'group') || (moneyNetworkService.is_old_contact(contact, true))) path2 = '/' + contact.unique_id ;
                else path2 = '/' + contact.cert_user_id ;
                a_path = path1 + path2 ;
                z_path = "?path=" + a_path ;
                $location.path(a_path);
                $location.replace();
                ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Chat", z_path]) ;
            };

            // contact removed from top of chat. see all chat messages
            self.see_all_chat = function () {
                var a_path, z_path ;
                clear_chat_filter_cache() ;
                self.contact = null ;
                self.group_chat = false ;
                self.group_chat_contacts.splice(self.group_chat_contacts.length) ;
                self.editing_grp_chat = false ;
                a_path = self.setup.two_panel_chat ? '/chat2' : '/chat' ;
                z_path = "?path=" + a_path ;
                ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Chat", z_path]) ;
            }; // self.see_all_chat

            // group contact functions.
            // click on glyphicon-pushpin to edit participants in group chat
            // click on glyphicon-ok or send chat message when done editing chat group
            self.group_chat = false ;
            self.group_chat_contacts = [] ;
            self.editing_grp_chat = false ;

            // find group chat contact from self.group_chat_contacts array
            // params (create):
            // - false (default) - do not create pseudo group contact
            // - true - create pseudo group chat contact if pseudo group chat contact does not exists
            // returns:
            // - null - not group chat
            // - string - group chat unique_id - pseudo group chat contact does not exists (create != true)
            // - contact - contact or pseudo group chat contact
            function find_group_chat_contact (create) {
                var pgm = controller + '.find_group_chat_unique_id: ' ;
                if (self.group_chat_contacts.length == 0) return null ;
                if (self.group_chat_contacts.length == 1) return self.group_chat_contacts[0] ;
                // calculate group chat unique_id from participants in group chat
                // calculate last updated as max last updated for participants in group chat
                var i, j, participant, timestamp ;
                var last_updated = 0 ;
                var group_chat_contact_unique_ids = [moneyNetworkService.get_my_unique_id()] ;
                for (i=0 ; i<self.group_chat_contacts.length ; i++) {
                    participant = self.group_chat_contacts[i] ;
                    group_chat_contact_unique_ids.push(participant.unique_id) ;
                    timestamp = MoneyNetworkHelper.get_last_online(participant) ;
                    if (timestamp > last_updated) last_updated = timestamp ;
                } // for i (participants)
                group_chat_contact_unique_ids.sort() ;
                // console.log(pgm + 'group_chat_contact_unique_ids = ' + JSON.stringify(group_chat_contact_unique_ids)) ;
                var group_unique_id = CryptoJS.SHA256(JSON.stringify(group_chat_contact_unique_ids)).toString() ;
                // console.log(pgm + 'group_unique_id = ' + group_unique_id) ;
                var contact = moneyNetworkService.get_contact_by_unique_id(group_unique_id) ;
                if (contact) return contact ; // group contact already exists
                if (!create) return group_unique_id ;
                // create pseudo chat group contact without password. password will be added later when sending first chat message in this group
                var public_avatars = MoneyNetworkHelper.get_public_avatars() ;
                var index = Math.floor(Math.random() * public_avatars.length);
                var avatar = public_avatars[index] ;
                contact = {
                    unique_id: group_unique_id,
                    cert_user_id: group_unique_id.substr(0,13) + '@moneynetwork',
                    type: 'group',
                    password: null,
                    participants: group_chat_contact_unique_ids,
                    search: [],
                    messages: [],
                    avatar: avatar
                };
                // add search info
                if (last_updated) contact.search.push({tag: 'Online', value: last_updated, privacy: 'Search', row: 1}) ;
                contact.search.push({
                    tag: 'Group',
                    value: contact.participants.length + ' participants',
                    privacy: 'Search',
                    row: contact.search.length+1
                });
                moneyNetworkService.add_contact(contact) ;
                moneyNetworkService.ls_save_contacts(false);
                return contact ;
            } // find_group_chat_contact

            self.start_editing_grp_chat = function () {
                var pgm = controller + 'start_edit_grp_chat: ';
                if (!self.chat_hint_pushpin()) {
                    console.log(pgm + 'pushpin not allowed') ;
                    return ;
                }
                var info;
                if (self.setup.two_panel_chat) info = "Click on avatars to add/remove participants in this group chat" ;
                else info = "Click on avatars to remove participants from this group chat" ;
                if (self.group_chat) {
                    // start, stop, start editing group chat. just continue already group
                    // console.log(pgm + 'start, stop, start editing group chat. just continue already group') ;
                    self.editing_grp_chat = true ;
                    ZeroFrame.cmd("wrapperNotification", ["info", info , 5000]);
                    return ;
                }
                if (!self.contact.pubkey) {
                    ZeroFrame.cmd("wrapperNotification", ["error", "Cannot start group chat with this contact. Public key is missing", 5000]);
                    return ;
                }
                ZeroFrame.cmd("wrapperNotification", ["info", info , 5000]);
                self.group_chat = true ;
                self.editing_grp_chat = true ;
                for (var i=0 ; i<self.contacts.length ; i++) {
                    if (self.contacts[i].unique_id == self.contact.unique_id) {
                        self.group_chat_contacts = [self.contacts[i]] ;
                        return ;
                    }
                }
            }; // start_editing_grp_chat

            self.stop_editing_grp_chat = function () {
                var pgm = controller + '.stop_edit_grp_chat: ' ;
                var contact, path1, path2, a_path, z_path ;
                clear_chat_filter_cache() ;
                if (self.group_chat_contacts.length == 0) {
                    ZeroFrame.cmd("wrapperNotification", ["error", "Please some participants to chat first", 5000]);
                    return ;
                }
                else if (self.group_chat_contacts.length == 1) {
                    // one and only one contact in chat group. display normal contact info
                    self.editing_grp_chat = false ;
                    self.contact = self.group_chat_contacts[0] ;
                    self.group_chat = false ;
                    self.group_chat_contacts = [] ;
                }
                else {
                    // calc new unique id for this chat group and find/create pseudo group chat contact
                    // do not create pseudo group chat contact yet
                    self.editing_grp_chat = false ;
                    var contact = find_group_chat_contact(true) ;
                    console.log(pgm + 'contact = ' + JSON.stringify(contact)) ;
                    if (contact && (typeof contact == 'object')) self.contact = contact ;
                }
                contact = self.contact ;

                // update ZeroNet Url
                path1 = self.setup.two_panel_chat ? '/chat2' : '/chat' ;
                if (!contact) path2 = '' ;
                else if ((contact.type == 'group') || (moneyNetworkService.is_old_contact(contact, true))) path2 = '/' + contact.unique_id ;
                else path2 = '/' + contact.cert_user_id ;
                a_path = path1 + path2 ;
                z_path = "?path=" + a_path ;
                ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Chat", z_path]) ;
            }; // stop_editing_grp_chat

            self.grp_chat_add = function (contact) {
                var pgm = controller + '.grp_chat_add: ' ;
                if (!self.editing_grp_chat) {
                    // not editing chat grp. simple redirect
                    self.chat_contact(contact) ;
                    return ;
                }
                if (contact.type == 'group') return ; // todo: allow adding a old chat group to new chat group?
                // is contact already in self.group_chat_contacts array?
                var index = -1 ;
                for (var i=0 ; i<self.group_chat_contacts.length ; i++) {
                    if (self.group_chat_contacts[i].unique_id == contact.unique_id) index = i ;
                }
                if (index == -1) {
                    // console.log(pgm + 'adding contact with hashkey ' + contact["$$hashKey"] + ' to this group chat') ;
                    if (!contact.pubkey) {
                        ZeroFrame.cmd("wrapperNotification", ["error", "Cannot add this contact to group chat. Public key is missing", 5000]);
                        return ;
                    }
                    self.group_chat_contacts.push(contact) ;
                }
                else {
                    // console.log(pgm + 'removing contact with hashkey ' + contact["$$hashKey"] + ' from this group chat') ;
                    self.group_chat_contacts.splice(index,1) ;
                    if (!self.setup.two_panel_chat && (self.group_chat_contacts.length == 0)) {
                        // one panel chat and participant has been removed
                        self.see_all_chat() ;
                    }
                }
                // console.log(pgm + 'self.group_chat_contacts = ' + JSON.stringify(self.group_chat_contacts)) ;
            }; // grp_chat_add

            // chat group participants - aquamarine background color for selected participants.
            self.contact_background_color = function (contact) {
                var pgm = controller + '.background_color: ' ;
                var style ;
                if (!self.editing_grp_chat) return {} ;
                var index = -1 ;
                for (var i=0 ; i<self.group_chat_contacts.length ; i++) {
                    if (self.group_chat_contacts[i].unique_id == contact.unique_id) index = i ;
                }
                if (index == -1) return {} ;
                else return {'background-color':'aquamarine'};
            }; // contact_background_color

            // get contacts. two different types of contacts:
            // a) contacts stored in localStorage
            self.contacts = moneyNetworkService.get_contacts() ; // array with contacts from localStorage
            // b) search for new ZeroNet contacts using user info (Search and Hidden keywords)
            var loading_contact = $routeParams.unique_id ;
            self.zeronet_search_contacts = function() {
                moneyNetworkService.z_contact_search(function () {
                    if ($routeParams.unique_id) find_contact();
                    $scope.$apply();
                }, null) ;
            };
            self.zeronet_search_contacts() ;

            self.contact = null;
            self.messages = moneyNetworkService.js_get_messages();
            // console.log(controller + ': messages = ' + JSON.stringify(self.messages));

            // disabled chat. contact without public key. span with explanation about deleting old inactive accounts
            self.no_days_before_cleanup = moneyNetworkService.get_no_days_before_cleanup() ;

            // find contact. relevant if chat is called from contact page or when using deep link to start chat
            function find_contact() {
                var pgm = controller + '.find_contact: ';
                var unique_id, i, contact, online, last_online, last_contact, a_path, z_path ;
                unique_id = $routeParams.unique_id;
                if (unique_id === undefined) return ;
                if (!unique_id) return ;
                if (unique_id.match(/^[0-9a-f]{64}$/)) {
                    // valid unique id
                    // console.log(pgm + 'unique_id is a valid sha256 address');
                    for (i = 0; i < self.contacts.length; i++) {
                        if (self.contacts[i].unique_id == unique_id) {
                            self.contact = self.contacts[i];
                            if (!self.contact.messages) self.contact.messages = [];
                            // console.log(pgm + 'contact = ' + JSON.stringify(self.contact));
                            if (self.contact.type == 'group') init_group_chat_contacts(self.contact) ; // xxx
                            else {
                                moneyNetworkService.is_old_contact(self.contact);
                                self.group_chat = false ;
                                self.group_chat_contacts.splice(0,self.group_chat_contacts.length) ;
                            }
                            // console.log(pgm + 'self.group_chat = ' + self.group_chat) ;
                            // console.log(pgm + 'self.contact = ' + (self.contact ? true : false)) ;
                            loading_contact = false ;
                            clear_chat_filter_cache() ;
                            return
                        }
                    }
                    console.log(pgm + 'contact with unique id ' + unique_id + ' was not found');
                    loading_contact = false ;
                    // remove invalid deep link from z_url
                    a_path = self.setup.two_panel_chat ? '/chat2' : '/chat' ;
                    z_path = "?path=" + a_path ;
                    ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Chat", z_path]) ;
                    return ;
                }
                else if ((unique_id.indexOf('@') != -1) && (unique_id != ZeroFrame.site_info.cert_user_id)) {
                    // check if unique_id is a known cert_user_id
                    // console.log(pgm + 'check if unique_id is a known cert_user_id') ;
                    for (i=0 ; i<self.contacts.length ; i++) {
                        if (self.contacts[i].type == 'group') continue ;
                        if (self.contacts[i].cert_user_id == unique_id) {
                            contact = self.contacts[i] ;
                            online =  MoneyNetworkHelper.get_last_online(contact) ;
                            if (!last_online || (online > last_online)) {
                                last_contact = contact ;
                                last_online = online ;
                            }
                        }
                    }
                    if (last_contact) {
                        self.contact = last_contact ;
                        if (!self.contact.messages) self.contact.messages = [];
                        self.group_chat = false ;
                        self.group_chat_contacts.splice(0,self.group_chat_contacts.length) ;
                        loading_contact = false ;
                        clear_chat_filter_cache() ;
                        return ;
                    }
                    console.log(pgm + 'contact with cert_user_id ' + unique_id + ' was not found');
                    loading_contact = false ;
                    // remove invalid deep link from z_url
                    a_path = self.setup.two_panel_chat ? '/chat2' : '/chat' ;
                    z_path = "?path=" + a_path ;
                    ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Chat", z_path]) ;
                    return ;
                }
                // remove invalid deep link from z_url
                a_path = self.setup.two_panel_chat ? '/chat2' : '/chat' ;
                z_path = "?path=" + a_path ;
                ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Chat", z_path]) ;
                console.log(pgm + 'contact with id ' + unique_id + ' was not found');
            } // find_contact

            function init_group_chat_contacts (contact) {
                var pgm = controller + '.init_group_chat_contacts: ' ;
                // this function should only be used for group contacts
                if (contact.type != 'group') {
                    console.log(pgm + 'not a pseudo chat contact') ;
                    return ;
                }
                // initialize group_chat
                var i, unique_id, index, j, my_unique_id, participant ;
                // console.log(controller + ': initialise group chat from group chat pseudo contact');
                my_unique_id = moneyNetworkService.get_my_unique_id() ;
                self.group_chat_contacts.splice(0, self.group_chat_contacts.length) ;
                for (i=0 ; i<self.contact.participants.length ; i++) {
                    unique_id = self.contact.participants[i] ;
                    if (unique_id == my_unique_id) continue ;
                    participant = moneyNetworkService.get_contact_by_unique_id(unique_id) ;
                    if (participant) self.group_chat_contacts.push(participant) ;
                    else console.log(controller + ': contact with unique id ' + unique_id + ' was not found') ;
                } // for i
                self.group_chat = true ;
                // console.log(controller + ': initialize group_chat_contacts. self.group_chat_contacts = ' + JSON.stringify(self.group_chat_contacts)) ;
            }

            if (self.contact) {
                (function () {
                    if (self.contact.type == 'group') init_group_chat_contacts(self.contact) ;
                    var focus_new_chat_msg = function() {
                        document.getElementById('new_chat_msg').focus() ;
                    };
                    $timeout(focus_new_chat_msg);

                })() ;
            }

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

            // hints to guide user to next step in chat process + show/hide pushpin, ok and remove glyphicon
            function chat_hint_account_page () {
                return (!self.contacts || (self.contacts.length == 0))
            }
            function chat_hint_network_page () {
                return (!self.setup.two_panel_chat && !self.contact && (self.messages.length == 0))
            }
            self.chat_hint_start_chat = function () {
                return (!self.contact && !self.group_chat)
            };
            self.chat_hint_chatting = function () {
                if (chat_hint_account_page() || chat_hint_network_page() || self.chat_hint_start_chat()) return false ;
                else return true ;
            };
            self.chat_hint_send = function () {
                if (!self.chat_hint_chatting()) return false ;
                // send chat message?
                return ((self.contact && self.contact.pubkey && !self.group_chat) ||
                        (self.group_chat && (self.group_chat_contacts.length > 0))) ;

            };
            self.chat_hint_pubkey = function () {
                if (!self.chat_hint_chatting()) return false ;
                // missing public key for contact?
                return (self.contact && (self.contact.type != 'group') && !self.contact.pubkey) ;
            };
            self.chat_hint_pushpin = function () {
                if (self.editing_grp_chat) return false ;
                if (self.setup.two_panel_chat) return (!self.chat_hint_pubkey()) ;
                else return (self.group_chat_contacts.length > 1) ;
            } ;
            self.chat_hint = function () {
                // start up hints - user is not chatting
                if (chat_hint_account_page()) return 'No contacts were found. Please go to "Account" page and enter/update search tags.' ;
                if (chat_hint_network_page()) return 'Click on "Network page" or enable "Two panel chat" to see contacts' ;
                if (self.chat_hint_start_chat()) return 'Click on an avatar to start private chat';

                // user is chatting - concatenate hints
                var send, pubkey, avatar, pushpin, ok, x  ;
                if (self.chat_hint_send()) send = true ;
                if (self.chat_hint_pubkey()) pubkey = true ;
                if (self.editing_grp_chat) avatar = true ;
                if (self.chat_hint_pushpin()) pushpin = true ;
                if (self.editing_grp_chat && (self.group_chat_contacts.length > 0)) ok = true ;
                x = true ;

                var msg = [] ;
                if (send) msg.push('Send message') ;
                if (pubkey) msg.push('Cannot chat with this contact. Public key was not found');
                if (self.group_chat && (self.group_chat_contacts.length == 0)) msg.push('Empty chat group');
                if (avatar) {
                    if (self.setup.two_panel_chat) msg.push('Click on avatars to update participants') ;
                    else msg.push('Click on avatars to remove participants') ;
                }
                if (pushpin) {
                    if (self.setup.two_panel_chat) msg.push('Click pushpin to update participants');
                    else msg.push('Click pushpin to remove participants');
                }
                if (ok) msg.push('Click OK when done');
                if (x) msg.push('X = all messages') ;
                return msg.join(' / ') ;
            };

            // edit contact.alias functions
            // todo: almost identical code in NetworkCtrl. Refactor to MoneyNetworkService
            self.edit_alias_title = "Edit alias. Press ENTER to save. Press ESC to cancel" ;
            var edit_alias_notifications = 1 ;
            self.edit_alias = function (contact) {
                var pgm = controller + '.edit_alias: ', i, id ;
                debug('edit_alias', pgm + 'contact = ' + JSON.stringify(contact));
                if (contact) {
                    // left panel (network) edit contact alias
                    id = contact["$$hashKey"] + ":alias"
                }
                else {
                    // right panel (chat) edit contact alias
                    id = 'contact_alias_id';
                    contact = self.contact ;
                }
                contact.new_alias = moneyNetworkService.get_contact_name(contact);
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
                debug('edit_alias', pgm + 'contact = ' + JSON.stringify(contact));
                if (!contact) contact = self.contact ; // right panel
                delete contact.new_alias ;
                delete contact.edit_alias ;
                $scope.$apply() ;
            } ; // cancel_edit_alias
            self.save_user_info = function (contact) {
                var pgm = controller + '.save_user_info: ';
                debug('edit_alias', pgm + 'contact = ' + JSON.stringify(contact));
                if (!contact) contact = self.contact ; // right panel
                // update angular UI
                contact.alias = contact.new_alias ;
                delete contact.new_alias ;
                delete contact.edit_alias ;
                $scope.$apply() ;
                // save contacts in localStorage
                // console.log(pgm + 'calling ls_save_contacts') ;
                moneyNetworkService.ls_save_contacts(false) ;
            }; // save_user_info


            // filter contacts in chat. show chat from contacts with green filter. hide chat from contacts with red filter
            // saved in localStorage.setup.contact_filters (per user)
            // todo: refactor: same functions are used in network controller
            self.toggle_filter = function (filter) {
                var pgm = controller + '.toggle_filter: ' ;
                clear_chat_filter_cache() ;
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

            self.contact_add = function () {
                clear_chat_filter_cache() ;
                moneyNetworkService.contact_add(self.contact);
            };
            self.contact_ignore = function () {
                clear_chat_filter_cache() ;
                moneyNetworkService.contact_ignore(self.contact);
            }; // unignore new contact
            self.contact_unplonk = function () {
                clear_chat_filter_cache() ;
                moneyNetworkService.contact_unplonk(self.contact);
            };
            self.contact_verify = function () {
                clear_chat_filter_cache() ;
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
                moneyNetworkService.contact_delete(self.contact, function () {
                    // contact deleted. show chat for all contacts
                    clear_chat_filter_cache() ;
                    self.contact = null ;
                }) ;
            };

            self.show_group_delete = function () {
                if (self.editing_grp_chat) return false ;
                return true ;
            };
            self.group_delete = function () {
                var pgm = controller + '.group_delete: ';
                moneyNetworkService.contact_delete(self.contact, function () {
                    // group contact deleted. show chat for all contacts
                    clear_chat_filter_cache() ;
                    self.contact = null ;
                    self.group_chat = false ;
                }) ;
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
                        moneyNetworkService.ls_save_contacts(false);
                        ZeroFrame.cmd("wrapperNotification", ["Error", error]);
                        return ;
                    }
                    // send message
                    moneyNetworkService.add_msg(message.contact, verified_message) ;
                    moneyNetworkService.ls_save_contacts(true) ;
                    // notification
                    delete message.message.message.password_sha256 ;
                    ZeroFrame.cmd("wrapperNotification", ["info", "Verification OK", 3000]);
                });
            }; // enter_password
            self.contact_remove = function () {
                clear_chat_filter_cache() ;
                moneyNetworkService.contact_remove(self.contact);
            };

            // admin functions. should only be used for deleting test user accounts
            self.show_delete_user1 = moneyNetworkService.is_admin() ;
            self.delete_user1 = function () {
                var pgm = controller + '.delete_user1: ' ;
                if (!self.contact || (self.contact.type == 'group')) return ;

                // any files to delete?
                var user_path = "data/users/" + self.contact.auth_address;
                ZeroFrame.cmd("fileGet", {inner_path: user_path + '/content.json', required: false}, function (content) {
                    var pgm = controller + '.delete_user1 fileGet callback: ' ;
                    var error, files, file_names, total_size, file_name, file_texts, text, files_optional,
                        file_names_lng1, file_names_lng2 ;
                    if (!content) {
                        error = 'system error. content.json file was not found for auth_address ' + self.contact.auth_address ;
                        console.log(pgm + error) ;
                        ZeroFrame.cmd("wrapperNotification", ["error", error, 5000]);
                        return ;
                    }
                    content = JSON.parse(content) ;
                    files = content.files ;
                    file_names = [] ;
                    file_texts = [] ;
                    total_size = 0 ;
                    for (file_name in files) {
                        file_names.push(file_name) ;
                        file_texts.push(file_name) ;
                        total_size += files[file_name].size ;
                    }
                    file_names_lng1 = file_names.length ;
                    files_optional = content.files_optional ;
                    if (files_optional) {
                        for (file_name in files_optional) {
                            file_names.push(file_name) ;
                            total_size += files_optional[file_name].size ;
                        }
                        file_names_lng2 = file_names.length ;
                        if (file_names_lng2 - file_names_lng1 == 1) file_texts.push('1 optional file.') ;
                        else if (file_names_lng2 - file_names_lng1 > 1) file_texts.push((file_names_lng2 - file_names_lng1) + ' optional files.') ;
                    }
                    if (file_names.length == 0) {
                        ZeroFrame.cmd("wrapperNotification", ["info", "User has already been deleted. No files were found", 5000]);
                        return ;
                    }

                    // admin dialog
                    text = "Delete user with auth_address " + self.contact.auth_address + "?<br>" ;
                    text += "This function should only be used for test accounts!<br>" ;
                    if (file_texts.size == 1) text += file_texts[0] + ' file.' ;
                    else for (var i=0 ; i<file_texts.length ; i++) {
                        if (i==0) text += '' ;
                        else if (i==file_texts.length-1) text += ' and ' ;
                        else text += ', ' ;
                        text += file_texts[i] ;
                    }
                    text += ' Total ' + total_size + ' bytes' ;
                    moneyNetworkService.confirm_admin_task(text, function (private_key) {
                        if (!private_key) return ;

                        // delete files
                        for (i=0 ; i<file_names.length ; i++) {
                            file_name = user_path + "/" + file_names[i] ;
                            ZeroFrame.cmd("fileDelete", file_name, function (res) {});
                        }

                        // sign and publish
                        var file_name = user_path + '/content.json';
                        ZeroFrame.cmd("sitePublish", {privatekey: private_key, inner_path: file_name}, function (res) {
                            var pgm = controller + '.delete_user1 callback: ', error;
                            if (res != "ok") {
                                error = "Failed to publish " + file_name + " : " + res.error;
                                console.log(pgm + error);
                                ZeroFrame.cmd("wrapperNotification", ["error", error, 3000]);
                                return ;
                            }

                            // remove public key. rest of cleanup job can be done with normal delete function
                            delete self.contact.pubkey ;
                        }); // sitePublish

                    }) ; // confirm_admin_task

                }) ; // fileGet

            }; // delete_user1

            // chat page context object shared with moneyNetworkService
            // information used when fetching optional files with public chat relevant for actual page
            self.chat_page_context = moneyNetworkService.get_chat_page_context() ;

            // check public chat after startup and after updates in chat page.
            // called in a $timeout as timestamps for first and last row in chat page are used as filter for public chat messages
            var startup_public_chat_check = true ;
            function check_public_chat () {
                var no_msg, i, end_of_page ;
                if (!self.setup.public_chat) return ;
                if (startup_public_chat_check && (self.setup.chat_sort != 'Last message')) {
                    // warning. public chat selected and sort is NOT Last message. Any public chat messages will be in bottom of page
                    no_msg = 0 ;
                    for (i=0 ; i<self.messages.length ; i++) if (self.messages[i].chat_filter) no_msg = no_msg + 1 ;
                    end_of_page = (self.chat_page_context.infinite_scroll_limit >= no_msg) ;
                    if (!end_of_page) {
                        ZeroFrame.cmd("wrapperNotification",
                            ["info", "Public chat is enabled and messages are sorted by " + self.setup.chat_sort +
                            "<br>Scroll down to see public chat", 10000]);
                    }
                }
                startup_public_chat_check = false ;
                moneyNetworkService.check_public_chat() ;
            }

            // filter and order by used in ng-repeat messages filter
            function clear_chat_filter_cache () {
                for (var i=0 ; i<self.messages.length ; i++) {
                    delete self.messages[i].chat_filter ;
                }
                self.chat_page_context.infinite_scroll_limit = 5 ;
                moneyNetworkService.reset_first_and_last_chat() ;
                $timeout(check_public_chat, 100) ;
            }
            clear_chat_filter_cache() ;

            // keep track of first and last chat message in chat page
            // must check for public chat messages within actual chat page context when finished loading page
            self.set_first_and_last_chat = function(first,last,message) {
                var pgm = controller + '.set_first_and_last_chat: ' ;
                if (loading_contact) return ; // startup - checking contact in deep link - page not ready
                // send chat page context info to service. service will start public chat download if needed
                moneyNetworkService.set_first_and_last_chat(first, last, message, self.contact) ;
            }; // set_first_and_last_chat

            self.chat_filter = function (message, index, messages) {
                var pgm = controller + '.chat_filter: ';
                // check cache
                if (message.hasOwnProperty('chat_filter')) return message.chat_filter ;
                // not in cache
                var match, reason, image, i, unique_id, participant, remote_msg_seq, message2 ;
                image = message.message.message.image? true : false ;
                if (message.message.deleted_at) {
                    // logical deleted message
                    match = false ;
                    reason = 1.1 ;
                }
                else if (message.message.message.msgtype == 'received') {
                    // hide image receipts
                    match = false ;
                    reason = 1.2 ;
                }
                else if (!self.contact && !self.group_chat) {
                    // no context - show chat for all contacts. Use green/red filter in top of page
                    if (message.contact.type == 'group') {
                        // group chat
                        if (self.setup.contact_filters['all'] == 'green')  {
                            // always show - including empty chat groups
                            reason = 2.1 ;
                            match = true ;
                        }
                        else {
                            reason = 2.2 ;
                            match = false ;
                            // no group filter. check participants in group chat
                            for (i=0 ; i<message.contact.participants.length ; i++) {
                                unique_id = message.contact.participants[i] ;
                                participant = moneyNetworkService.get_contact_by_unique_id(unique_id) ;
                                if (!participant) continue ;
                                if (self.setup.contact_filters[participant.type] == 'green') {
                                    match = true ;
                                    break ;
                                }
                            } // for i (participants)
                        }
                    }
                    else if (message.contact.type == 'public') {
                        // unencrypted public chat
                        if (message.message.folder == 'outbox') {
                            // always show
                            reason = 2.3 ;
                            match = true ;
                        }
                        else {
                            reason = 2.4 ;
                            match = self.setup.public_chat ;
                        }
                    }
                    else {
                        // private chat
                        match = (self.setup.contact_filters[message.contact.type] == 'green');
                        reason = 2.5 ;
                    }
                }
                else if (self.contact.unique_id == message.contact.unique_id) {
                    // show chat for one contact or one group chat contact
                    match = true ;
                    reason = 3 ;
                }
                else if (self.contact.type == 'group') {
                    // group chat contact: show "Started group chat" messages to participants in group chat
                    // console.log(pgm + 'self.contact.password = ' + self.contact.password) ;
                    // console.log(pgm + 'message.message.message.msgtype = ' + message.message.message.msgtype) ;
                    reason = 4.2 ;
                    if (message.message.message.msgtype == 'received') {
                        // receipt for image. Check if image was  in a group chat message
                        remote_msg_seq = message.message.message.remote_msg_seq;
                        for (i = 0; i < messages.length; i++) if (messages[i].message.local_msg_seq == remote_msg_seq) {
                            message2 = messages[i];
                            // debug('chat_filter', pgm + 'remote_msg_seq = ' + remote_msg_seq + ', message2.message = ' + JSON.stringify(message2.message));
                            break;
                        }
                        if (message2) {
                            // image belongs to this group chat?
                            reason = 4.1 ;
                            match = (self.contact.unique_id == message2.contact.unique_id) ;
                        }
                        else {
                            // image must have been deleted
                            reason = 4.2 ;
                            match = false ;
                        }
                    }
                    else if (message.message.message.msgtype == 'group chat') {
                        // group chat started message
                        reason = 4.3 ;
                        match = (message.message.message.password == self.contact.password) ;
                    }
                    else if (message.message.message.msgtype == 'chat msg') {
                        // group chat message. receiver_sha256 = SHA256(group chat password?)
                        // old errors. Messages should have been under 3 instead
                        reason = 4.4 ;
                        match = false ;
                    }
                }
                else {
                    // normal contact: show group chat involving this contact.
                    match = ((message.contact.type == 'group') && (message.contact.participants.indexOf(self.contact.unique_id) != -1)) ;
                    reason = 5 ;
                }

                var message_x ;
                try {
                    message_x = message.message.message.message ? ', message = ' + message.message.message.message.substr(0,40) : '' ;
                }
                catch (err) {
                    message_x = ''
                }
                debug('chat_filter',
                    pgm + 'local_msg_seq = ' + message.message.local_msg_seq + ', folder = ' + message.message.folder +
                    ', match = ' + match + ', reason = ' + reason + ', image = ' + image + ', msgtype = ' + message.message.message.msgtype +
                    message_x);
                // debug('chat_filter', pgm + 'message.message = ' + JSON.stringify(message.message)) ;

                // if ([200, 201, 202].indexOf(message.message.local_msg_seq) != -1) debug('chat_filter', pgm + 'message.message = ' + JSON.stringify(message.message)) ;
                message.chat_filter = match ;
                return match;
            }; // chat_filter

            self.contact_filter = function (contact, index, contacts) {
                var pgm = controller + '.contact_filter: ';
                var i, unique_id, j ;
                if (contact.type == 'group') {
                    if (self.setup.contact_filters['all'] == 'green') return true ;
                    // display group if one participant is within current filter
                    for (i=0 ; i<contact.participants.length ; i++) {
                        unique_id = contact.participants[i] ;
                        for (j=0 ; j<contacts.length ; j++) {
                            if (contacts[j].unique_id == unique_id) {
                                if (self.setup.contact_filters[contacts[j].type] == 'green') return true ;
                                break ;
                            }
                        }
                    }
                    return false ;
                }
                else {
                    // simpel contact filter
                    return (self.setup.contact_filters[contact.type] == 'green');
                }
            }; // contact_filter

            // contacts sort options - typeahead auto complete functionality
            self.contact_sort_options = moneyNetworkService.get_contact_sort_options();
            self.contact_sort_title = moneyNetworkService.get_contact_sort_title();
            self.contact_sort_changed = function () {
                var pgm = controller + '.sort_changed: ' ;
                moneyNetworkService.save_user_setup();
            };

            self.contact_order_by = function (contact) {
                return moneyNetworkService.contact_order_by(contact);
            }; // contact_order_by

            // chat sort options - typeahead auto complete functionality
            self.chat_sort_options = moneyNetworkService.get_chat_sort_options() ; 
            self.chat_sort_title = moneyNetworkService.get_chat_sort_title() ;
            self.chat_sort_changed = function () {
                var pgm = controller + '.sort_changed: ' ;
                console.log(pgm + 'chat_sort = ' + self.setup.chat_sort) ;
                moneyNetworkService.reset_first_and_last_chat();
                moneyNetworkService.save_user_setup();
            };
            self.chat_order_by = function (message) {
                return moneyNetworkService.chat_order_by(message) ;
            }; // chat_order_by

            // start chat with contact
            self.chat_contact = function (contact) {
                var pgm = controller + '.chat_contact: ';
                if (self.contact && (self.contact.unique_id == contact.unique_id)) return ;
                // console.log(pgm + 'contact = ' + JSON.stringify(contact));
                var old_contact, a_path, z_path ;
                clear_chat_filter_cache() ;
                // console.log(pgm + 'contact.unique_id = ' + contact.unique_id);
                // clear any old not sent chat
                self.new_chat_msg = '';
                self.new_chat_src = null ;
                // new contact
                self.contact = contact ;
                if (contact.type == 'group') init_group_chat_contacts(contact) ;
                else {
                    old_contact = moneyNetworkService.is_old_contact(contact);
                    self.group_chat = false ;
                    self.group_chat_contacts.splice(0,self.group_chat_contacts.length) ;
                }
                // update zeronet path - no angularJS redirect
                // console.log(pgm + '$location.path = ' + $location.path()) ;
                a_path = self.setup.two_panel_chat ? '/chat2' : '/chat' ;
                if ((contact.type == 'group') || old_contact) a_path += '/' + contact.unique_id ;
                else a_path += '/' + contact.cert_user_id ;
                z_path = "?path=" + a_path ;
                ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Chat", z_path]) ;
            }; // chat_contact

            self.new_chat_msg = '';
            self.new_chat_src = null ;

            self.handleTextAreaHeight = function (e) {
                // see issue #34 Resend old messages?
                if (self.setup.debug && self.setup.debug.disable_autoexpand_textarea) return ;
                var element = e.target;
                element.style.overflow = 'hidden';
                element.style.height = 0;
                element.style.height = element.scrollHeight + 'px';
            };

            self.confirmed_send_chat = null ;
            self.send_chat_msg = function () {
                var pgm = controller + '.send_chat_msg: ';
                var i, j, contact, password, my_unique_id, message, error, warning;

                // check image attachment
                if (self.new_chat_src && !moneyNetworkService.get_image_ext_from_base64uri(self.new_chat_src)) {
                    ZeroFrame.cmd(
                        "wrapperNotification", ["error", "Ups. Something is wrong here.<br>" +
                        "Only png, jpg, jpeg, gif and tif images can be used in chat<br>" +
                        "Sending chat message without image", 5000]);
                    self.new_chat_src='';
                }

                // group chat? find/create pseudo contact for this chat group.
                self.editing_grp_chat = false ;
                if (self.group_chat) {
                    contact = find_group_chat_contact(true) ; // create pseudo group chat contact if not found
                    if (!contact) return ;
                    if (contact.type != 'group') {
                        self.contact = contact ;
                        self.group_chat = false;
                        self.group_chat_contacts = [];
                    }
                }
                if (self.group_chat) {
                    if (!contact.password) {
                        // new pseudo group chat contact. generate password and send password to participants
                        password = MoneyNetworkHelper.generate_random_password(200);
                        contact.password = password;
                        moneyNetworkService.update_contact_add_password(contact) ; // update password_sha256 index
                        // send password to participants
                        for (i = 0; i < self.group_chat_contacts.length; i++) {
                            message = {
                                msgtype: 'group chat',
                                participants: contact.participants,
                                password: password
                            };
                            debug('outbox && unencrypted', pgm + 'message = ' + JSON.stringify(message));
                            // validate json
                            error = MoneyNetworkHelper.validate_json(pgm, message, message.msgtype, 'Could not send chat message');
                            if (error) {
                                ZeroFrame.cmd("wrapperNotification", ["Error", error]);
                                return;
                            }
                            // send group chat message
                            moneyNetworkService.add_msg(self.group_chat_contacts[i], message);
                        } // for i
                    }
                }
                else contact = self.contact ;

                // callback function - send chat message
                var cb = function () {
                    // send chat message to contact
                    message = {
                        msgtype: 'chat msg',
                        message: self.new_chat_msg
                    };
                    if (self.new_chat_src) message.image = self.new_chat_src ;
                    MoneyNetworkHelper.debug('outbox && unencrypted', pgm + 'message = ' + JSON.stringify(message));
                    // validate json
                    error = MoneyNetworkHelper.validate_json(pgm, message, message.msgtype, 'Could not send chat message');
                    if (error) {
                        ZeroFrame.cmd("wrapperNotification", ["Error", error]);
                        return;
                    }
                    // console.log(pgm + 'last_sender_sha256 = ' + last_sender_sha256);
                    // send message
                    moneyNetworkService.add_msg(contact, message);
                    if (self.group_chat && self.new_chat_src) {
                        // sending a group chat message with an image.
                        // expects one receipt for each participant in chat group except me
                        // remove image chat message from zeronet (data.json) when all image receipts have been received
                        // see process_incoming_message - post processing of image receipts
                        // see z_update_data_json - data.json too big - xxxxxx
                        my_unique_id = moneyNetworkService.get_my_unique_id() ;
                        var message_with_envelope = contact.messages[contact.messages.length-1] ;
                        message_with_envelope.image_receipts = [] ;
                        for (i=0 ; i<contact.participants.length ; i++) {
                            if (contact.participants[i] == my_unique_id) continue ;
                            message_with_envelope.image_receipts.push(contact.participants[i]) ;
                        }
                        debug('outbox && unencrypted', pgm + 'message_with_envelope = ' + JSON.stringify(message_with_envelope)) ;
                    }

                    // ready for next chat msg
                    self.new_chat_msg = '';
                    self.new_chat_src = null ;
                    // console.log(pgm + 'contact = ' + JSON.stringify(contact));
                    // update localStorage and ZeroNet
                    // console.log(pgm + 'calling ls_save_contacts');
                    moneyNetworkService.ls_save_contacts(true);

                } ; // cb

                // send msg. confirm send if chatting to an "old" contact
                if (contact && (contact.type != 'group') &&
                    (warning=moneyNetworkService.is_old_contact(contact,true)) &&
                    (self.confirmed_send_chat != contact.unique_id)) {
                    ZeroFrame.cmd("wrapperConfirm", [warning + '<br>Send message anyway?', "Send"], function (confirm) {
                        if (!confirm) return ;
                        // only ask for confirmation once for contact
                        self.confirmed_send_chat = contact.unique_id ;
                        cb() ;
                    }) ;
                }
                else cb() ;
                if (!warning) self.confirmed_send_chat = null ;

            }; // send_chat_msg

            self.changed_chat_msg = "";
            self.edit_chat_msg = function (message) {
                var pgm = controller + '.edit_chat_msg: ';
                // console.log(pgm + 'message.message = ' + JSON.stringify(message.message));
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
                        var elem = document.getElementById(id) ;
                        if (elem) document.getElementById(id).focus() ;
                        else console.log(pgm + 'textarea element with id ' + id + ' was not found in page') ;
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
                        // logical delete here. physical delete in ls_save_contacts
                        message.message.deleted_at = new Date().getTime(); // logical delete
                        message.chat_filter = false ;
                        // remove from UI
                        var index = -1;
                        for (var i = 0; i < self.messages.length; i++) if (self.messages[i]["$$hashKey"] == message["$$hashKey"]) index = i;
                        // console.log(pgm + 'index = ' + index + ', message = ' + JSON.stringify(message));
                        if (index != -1) self.messages.splice(index, 1);
                        $scope.$apply();
                        // update localStorage and optional zeronet
                        var update_zeronet = ((message.message.folder == 'outbox') && message.message.zeronet_msg_id) ;
                        moneyNetworkService.ls_save_contacts(update_zeronet); // physical delete
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
                // angularJS cheat - ng-bind is too slow - using id for get/set textarea value.
                var textarea_id, old_value, new_value, old_image, new_image, img_id, new_message ;
                textarea_id = chatEditTextAreaId(message);
                old_value = message.message.message.message;
                new_value = document.getElementById(textarea_id).value;
                document.getElementById(textarea_id).value = '' ;
                console.log(pgm + 'old message = ' + JSON.stringify(message.message));
                console.log(pgm + 'old value = ' + old_value);
                console.log(pgm + 'new value = ' + new_value);
                old_image = message.message.message.original_image ;
                delete message.message.message.original_image ;
                img_id = chatEditImgId(message) ;
                new_image = document.getElementById(img_id).src ;
                if (new_image.match(/^http/)) new_image = null ;
                document.getElementById(img_id).src = '' ;
                delete message.edit_chat_message;
                if ((!new_value || (old_value == new_value)) && (old_image == new_image)) return;
                if (message.contact.type == 'public') {
                    // delete old message
                    message.message.deleted_at = new Date().getTime() ;
                    message.chat_filter = false ;
                    // create new message
                    // send chat message to contact
                    new_message = {
                        msgtype: 'chat msg',
                        message: new_value
                    };
                    if (new_image) new_message.image = new_image ;
                    MoneyNetworkHelper.debug('outbox && unencrypted', pgm + 'new_message = ' + JSON.stringify(new_message));
                    // validate json
                    error = MoneyNetworkHelper.validate_json(pgm, new_message, new_message.msgtype, 'Could not send chat message');
                    if (error) {
                        ZeroFrame.cmd("wrapperNotification", ["Error", error]);
                        return;
                    }
                    // console.log(pgm + 'last_sender_sha256 = ' + last_sender_sha256);
                    // send message
                    moneyNetworkService.add_msg(null, new_message);
                    moneyNetworkService.ls_save_contacts(true);
                    return ;
                    // update public outbox message
                }
                // send changed chat message
                var changed_message = {
                    msgtype: 'chat msg',
                    old_local_msg_seq: message.message.local_msg_seq,
                    message: new_value
                };
                // add image.
                // unchanged image will be replaced with a "x" in communication. See z_update_data_json and process_incoming_message
                if (new_image) changed_message.image = new_image ;
                console.log(pgm + 'changed_message = ' + JSON.stringify(changed_message));
                // validate json
                var error = MoneyNetworkHelper.validate_json(pgm, changed_message, changed_message.msgtype, 'Could not send changed chat message');
                if (error) {
                    ZeroFrame.cmd("wrapperNotification", ["Error", error]);
                    return;
                }
                if (new_image && (old_image == new_image)) changed_message.replace_unchanged_image_with_x = true ;
                // console.log(pgm + 'last_sender_sha256 = ' + last_sender_sha256);
                // send message
                moneyNetworkService.add_msg(message.contact, changed_message);
                // delete old message
                console.log(pgm + 'todo: keep old message in some kind of edit history?');
                message.message.deleted_at = new Date().getTime() ;
                message.chat_filter = false ;
                // save localStorage and update ZeroNet
                moneyNetworkService.ls_save_contacts(true) ;
            }; // save_chat_msg
            self.delete_edit_chat_msg = function (message) {
                // called from edit chat message form. Always outbox message
                var pgm = controller + '.delete_edit_chat_msg: ';
                var msg_text = formatChatMessage(message);
                if (!message.message.sent_at || !msg_text) {
                    console.log(pgm + 'error cleanup. deleting message without a sent_at timestamp / message. message.message = ' + JSON.stringify(message.message)) ;
                    moneyNetworkService.remove_message(message) ;
                    moneyNetworkService.ls_save_contacts(false);
                    return ;
                }
                if ((message.contact.type == 'public') || (message.message.z_filename)) {
                    // public unencrypted chat. just delete
                    delete message.edit_chat_message;
                    message.message.deleted_at = new Date().getTime(); // logical delete
                    message.chat_filter = false ;
                    debug('public_chat', pgm + 'deleted public outbox message ' + JSON.stringify(message.message)) ;
                    // save localStorage and update ZeroNet
                    moneyNetworkService.ls_save_contacts(true);
                    return ;
                }
                // person or group chat. confirm dialog and send a special empty delete chat message
                if (msg_text.length > 40) msg_text = msg_text.substring(0, 20) + "..." + msg_text.substring(msg_text.length - 15);
                // console.log(pgm + 'msg_text.length = ' + msg_text.length);
                ZeroFrame.cmd("wrapperConfirm", ['Delete "' + msg_text + '" message?', "Delete"], function (confirmed) {
                    if (!confirmed) return;
                    // console.log(pgm + 'deleting message ' + JSON.stringify(message));
                    // outbox: send delete chat message. note empty chat message
                    var delete_message = {
                        msgtype: 'chat msg',
                        old_local_msg_seq: message.message.local_msg_seq
                    };
                    // console.log(pgm + 'delete_message = ' + JSON.stringify(delete_message));
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
                    message.message.deleted_at = new Date().getTime(); // logical delete
                    message.chat_filter = false ;
                    delete message.message.image;
                    // save localStorage and update ZeroNet
                    moneyNetworkService.ls_save_contacts(true);
                    // new empty chat message (delete message) will be logical delete marked in z_update_data_json and physical deleted in next ls_save_contacts call
                }); // wrapperConfrm
            }; // delete_edit_chat_msg

            // catch drag and drop new chat message image. see imagedrop directive. todo: refactor
            self.imageDropped = function () {
                var pgm = controller + '.imageDropped: ' ;

                // https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL
                var reader  = new FileReader();
                reader.addEventListener("load", function () {
                    var image_base64uri = reader.result ;
                    // console.log(pgm + 'reader.result = ' + image_base64uri);
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
                console.log($scope.uploadedFile) ;
                reader.readAsDataURL($scope.uploadedFile);

            }; // imageDropped

            // input file browse image - todo: refactor
            self.uploadImage = function(event){
                var pgm = controller + '.uploadImage: ' ;
                // what is the target for file upload? new_chat_src in top of page or edit chat message img scr
                var input_file_id = event.target.id ; // file-input, file-input2 or edit_chat_file_input_id_115
                // console.log(pgm + 'input_file_id = ' + input_file_id);

                // https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL
                var reader  = new FileReader();
                reader.addEventListener("load", function () {
                    var image_base64uri = reader.result ;
                    // console.log(pgm + 'reader.result = ' + image_base64uri);
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

                    if (['file-input', 'file-input2'].indexOf(input_file_id) != -1) {
                        // image upload in new chat message form
                        self.new_chat_src = image_base64uri ;
                        $scope.$apply() ;
                    }
                    else {
                        // image upload in edit outgoing message (messages ng-repeat section)
                        // now var id = 'edit_chat_file_input_id_' + object_id ;
                        // copy to id = 'edit_chat_msg_img_id_' + object_id ;
                        var input_file_id_array = input_file_id.split('_');
                        var edit_chat_msg_img_id = 'edit_chat_msg_img_id_' + input_file_id_array[input_file_id_array.length-1] ;
                        console.log(pgm + 'edit_chat_msg_img_id = ' + edit_chat_msg_img_id) ;
                        document.getElementById(edit_chat_msg_img_id).src = image_base64uri ;
                        $scope.$apply() ;
                    }

                }, false);
                reader.readAsDataURL(event.target.files[0]);

            }; // uploadImage

            self.new_char_src_remove = function() {
                self.new_chat_src = '' ;
            } ;

            // add/remove public chat
            self.debug_settings_changed = function () {
                moneyNetworkService.save_user_setup() ;
                MoneyNetworkHelper.load_user_setup() ;
                moneyNetworkService.reset_first_and_last_chat();
                $timeout(check_public_chat, 100) ;
            };

            // infinite scroll
            // startup with infinite_scroll_limit = 5.
            // public_chat = false. No nothing after page startup
            // public_chat = true:
            // -
            // -
            // -

            self.get_more_messages = function () {
                var pgm = controller + '.get_more_messages: ' ;
                self.chat_page_context.infinite_scroll_limit = self.chat_page_context.infinite_scroll_limit + 5;
                debug('infinite_scroll', pgm + 'self.chat_page_context.infinite_scroll_limit = ' + self.chat_page_context.infinite_scroll_limit) ;
                moneyNetworkService.reset_first_and_last_chat() ;
            }; // self.get_more_messages



            // ChatCtrl
        }])

;
