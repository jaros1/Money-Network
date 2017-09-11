angular.module('MoneyNetwork')
    
    .controller('ChatCtrl', ['MoneyNetworkService', '$scope', '$rootScope', '$timeout', '$routeParams', '$location',
        'chatEditTextAreaIdFilter', 'chatEditImgIdFilter', 'formatChatMessageFilter', '$window', 'dateFilter',
        function (moneyNetworkService, $scope, $rootScope, $timeout, $routeParams, $location,
                  chatEditTextAreaId, chatEditImgId, formatChatMessage, $window, date)
        {
            
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
                if (self.group_chat) contact = find_group_chat_contact() ;
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
                self.show_money = false ;
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
                var i, j, participant, timestamp, last_updated, participants, participants_str, contact, password,
                    unique_id, public_avatars, index, avatar ;
                participants = [moneyNetworkService.get_my_unique_id()] ;
                for (i=0 ; i<self.group_chat_contacts.length ; i++) {
                    participant = self.group_chat_contacts[i] ;
                    participants.push(participant.unique_id) ;
                } // for i (participants)
                participants.sort() ;
                participants_str = JSON.stringify(participants) ;
                // console.log(pgm + 'group_chat_contact_unique_ids = ' + JSON.stringify(group_chat_contact_unique_ids)) ;

                // search for old chat group with identical participants
                contact = null ;
                last_updated = 0 ;
                for (i=0 ; i<self.contacts.length ; i++) {
                    if (self.contacts[i].type != 'group') continue ;
                    if (JSON.stringify(self.contacts[i].participants) != participants_str) continue ;
                    timestamp = MoneyNetworkHelper.get_last_online(self.contacts[i]) ;
                    if (timestamp > last_updated) {
                        contact = self.contacts[i] ;
                        last_updated = timestamp ;
                    }
                }
                if (contact) return contact ; // group contact already exists

                // console.log(pgm + 'group_unique_id = ' + group_unique_id) ;

                // create new pseudo chat group contact. assword will be send to group participants in send_msg
                password = moneyNetworkService.generate_random_password();
                unique_id = CryptoJS.SHA256(password).toString() ;
                public_avatars = MoneyNetworkHelper.get_public_avatars() ;
                index = Math.floor(Math.random() * public_avatars.length);
                avatar = public_avatars[index] ;
                contact = {
                    unique_id: unique_id,
                    cert_user_id: unique_id.substr(0,13) + '@moneynetwork',
                    type: 'group',
                    password: password,
                    participants: participants,
                    search: [],
                    messages: [],
                    avatar: avatar,
                    send_password: true
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
                    var contact = find_group_chat_contact() ;
                    console.log(pgm + 'contact = ' + JSON.stringify(contact)) ;
                    if (contact && (typeof contact == 'object')) self.contact = contact ;
                    self.show_money = false ;
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
                }, null, null) ;
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
                            self.contact.seen_at = new Date().getTime() ;
                            moneyNetworkService.update_chat_notifications() ;
                            moneyNetworkService.ls_save_contacts(false) ;
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
                        self.contact.seen_at = new Date().getTime() ;
                        moneyNetworkService.update_chat_notifications() ;
                        moneyNetworkService.ls_save_contacts(false) ;
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
                var pgm = controller + '.chat_hint_pubkey: ' ;
                var hint_pubkey, contact ;
                if (!self.chat_hint_chatting()) return false ;
                // missing public key for contact?
                hint_pubkey = (self.contact && (self.contact.type != 'group') && !self.contact.pubkey) ;
                if (hint_pubkey) {
                    contact = JSON.parse(JSON.stringify(self.contact)) ;
                    delete contact.messages ;
                    console.log(pgm + 'deleted contact? contact = ' + JSON.stringify(contact)) ;
                    //contact = {
                    //    "unique_id": "8d07e1d69db580cb7169f752bddff989129a47338d626685c32dad0633a35180",
                    //    "type": "new",
                    //    "guest": null,
                    //    "auth_address": "16SNxdSpUYVLdVQWx6azQjoZXsZJHJUzKN",
                    //    "cert_user_id": "jrotest8@zeroid.bit",
                    //    "avatar": "2.png",
                    //    "search": [{
                    //        "tag": "Online",
                    //        "value": null,
                    //        "privacy": "Search",
                    //        "debug_info": {},
                    //        "row": 1,
                    //        "$$hashKey": "object:702"
                    //    }, {
                    //        "tag": "%",
                    //        "value": "%",
                    //        "privacy": "Search",
                    //        "row": 2,
                    //        "$$hashKey": "object:703"
                    //    },
                    //    ... total 15 identical rows
                    //
                    //    ,  {
                    //        "tag": "Online",
                    //        "value": null,
                    //        "privacy": "Search",
                    //        "row": 15,
                    //        "$$hashKey": "object:716"
                    //    }, {"tag": "Online", "value": null, "privacy": "Search", "row": 16, "$$hashKey": "object:988"}],
                    //    "outbox_sender_sha256": {},
                    //    "inbox_zeronet_msg_id": [],
                    //    "inbox_last_sender_sha256": null,
                    //    "inbox_last_sender_sha256_at": 0,
                    //    "seen_at": 1486615160022,
                    //    "notifications": 0,
                    //    "$$hashKey": "object:125",
                    //    "user_seq": null,
                    //    "pubkey": null,
                    //    "pubkey2": "ApTPzNsPcN8XO3cRBwasO5MoX3D5UmYjAAYkIwVqVsvV",
                    //    "encryption": "1"
                    //};
                }
                return hint_pubkey ;
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
                if (self.chat_hint_start_chat()) return 'Click on an avatar to start PRIVATE CHAT';

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
            self.toggle_filter = function (filter, spam) {
                var pgm = controller + '.toggle_filter: ' ;
                clear_chat_filter_cache(spam) ;
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
                if (self.contact.outbox_sender_sha256) return true ;
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

            self.show_contact_mute_add = function () {
                if (!self.contact) return false ;
                if (self.contact.type == 'group') return false ;
                return !self.contact.muted_at ;
            };
            self.contact_mute_add = function () {
                moneyNetworkService.contact_mute_add(self.contact);
            };
            self.show_contact_mute_remove = function () {
                if (!self.contact) return false ;
                if (self.contact.type == 'group') return false ;
                return self.contact.muted_at ;
            };
            self.contact_mute_remove = function () {
                moneyNetworkService.contact_mute_remove(self.contact);
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

            self.show_edit_icon = function (message) {
                return ((message.message.folder == 'outbox') && (message.message.message.msgtype == 'chat msg'))
            };
            self.show_remove_icon = function (message) {
                return !self.show_edit_icon(message) ;
            };
            self.show_bullhorn_icon = function (message) {
                // bullhorn = spam. only ingoing public chat
                if (message.message.folder != 'inbox') return false ;
                if (!message.message.z_filename) return false ;
                if (message.contact.type == 'ignore') return false ;
                return true ;
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
                else if (message.message.message.hasOwnProperty('image')) show=true ; // image (base64), true or false
                else show=false ;
                // console.log(pgm + 'messsage = ' + JSON.stringify(message.message.message).substr(0,100) + ', show = ' + show);
                return show ;
            };
            self.get_image_src = function (message) {
                var pgm = controller + '.show_image: ' ;
                var src ;
                if (!self.show_image(message)) return null ;
                if (typeof message.message.message.image == 'string') src = message.message.message.image ;
                else if (message.message.message.image) src = 'public/images/image_loading.gif' ;
                else src = 'public/images/image_failed.gif' ;
                // console.log(pgm + 'messsage = ' + JSON.stringify(message.message.message).substr(0,100) + ', show = ' + show);
                return src ;
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
                var contact, debug_seq ;
                if (!self.contact || (self.contact.type == 'group')) return ;
                contact = self.contact ;

                // any files to delete? check content.json file
                var user_path = "data/users/" + contact.auth_address;
                debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + user_path + '/content.json fileGet') ;
                ZeroFrame.cmd("fileGet", {inner_path: user_path + '/content.json', required: false}, function (content) {
                    var pgm = controller + '.delete_user1 fileGet callback: ' ;
                    var error, files, file_names, total_size, file_name, file_texts, text, files_optional,
                        file_names_lng1, file_names_lng2, last_online, modified, dif ;
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                    if (!content) {
                        error = 'system error. content.json file was not found for auth_address ' + contact.auth_address ;
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

                    // check last online timestamp. Maybe user has selected "Show as offline" in Account setup
                    last_online = moneyNetworkService.get_last_online (contact) ;
                    modified = content.modified ; // unix timestamp
                    dif = Math.abs(last_online - modified) ;
                    // console.log(pgm + 'dif = ' + dif + ', content.modified = ' + modified + ', last_online = ' + last_online) ;

                    // admin dialog
                    text = "Delete user with auth_address " + contact.auth_address + "?<br>" ;
                    if (dif > 60) text += 'Maybe "show as offline" user. Last online ' + date(modified*1000, 'short') + '<br>' ;
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
                            delete contact.pubkey ;
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
                var pgm = controller + '.check_public_chat: ' ;
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
                debug('infinite_scroll || public_chat', pgm + 'calling moneyNetworkService.check_public_chat');
                moneyNetworkService.check_public_chat() ;
            } // check_public_chat

            // filter and order by used in ng-repeat messages filter
            function clear_chat_filter_cache (spam) {
                var pgm = controller + '.clear_chat_filter_cache: ' ;
                for (var i=0 ; i<self.messages.length ; i++) {
                    delete self.messages[i].chat_filter ;
                    delete self.messages[i].formatted_message ;
                    delete self.messages[i].show_feedback ;
                }
                if (!spam) self.chat_page_context.infinite_scroll_limit = 5 ;
                debug('infinite_scroll || public_chat', pgm + 'calling moneyNetworkService.reset_first_and_last_chat') ;
                moneyNetworkService.reset_first_and_last_chat() ;
                $timeout(check_public_chat, 100) ;
            } // clear_chat_filter_cache
            clear_chat_filter_cache() ;

            // keep track of first and last chat message in chat page
            // must check for public chat messages within actual chat page context when finished loading page
            self.set_first_and_last_chat = function(first,last,message) {
                var pgm = controller + '.set_first_and_last_chat: ' ;
                if (loading_contact) return ; // startup - checking contact in deep link - page not ready
                if (message.child) return ; // not relevant - not top level in message three - must be comment or nested comment in three
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
                else if ((message.message.msgtype == 'chat msg') && !message.message.message.message) {
                    // empty chat message = receive delete chat message
                    match = false ;
                    reason = 1.2 ;
                }
                else if (message.message.message.msgtype == 'received') {
                    // hide image receipts
                    match = false ;
                    reason = 1.3 ;
                }
                else if (message.message.message.msgtype == 'reaction') {
                    // hide private reaction messages
                    match = false ;
                    reason = 1.4 ;
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
                        // public chat outbox message. always show
                        //if (message.message.folder == 'outbox') {
                        // always show
                        reason = 2.3 ;
                        match = true ;
                        //}
                        //else {
                        //    reason = 2.4 ;
                        //    match = self.setup.public_chat ;
                        //}
                    }
                    else {
                        // private chat or public chat inbox messages
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
                debug('infinite_scroll || public_chat', pgm + 'calling moneyNetworkService.reset_first_and_last_chat') ;
                moneyNetworkService.reset_first_and_last_chat();
                moneyNetworkService.save_user_setup();
            };
            self.chat_order_by = function (message) {
                return moneyNetworkService.chat_order_by(message) ;
            }; // chat_order_by

            // start chat with contact
            self.chat_contact = function (contact) {
                var pgm = controller + '.chat_contact: ';
                if (self.contact && (self.contact.unique_id == contact.unique_id)) {
                    contact.seen_at = new Date().getTime() ;
                    moneyNetworkService.update_chat_notifications() ;
                    moneyNetworkService.ls_save_contacts(false) ;
                    return ;
                }
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
                contact.seen_at = new Date().getTime() ;
                moneyNetworkService.update_chat_notifications() ;
                moneyNetworkService.ls_save_contacts(false) ;
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
            self.new_chat_msg_disabled = false ; // disabled while sending chat message

            self.handleTextAreaHeight = function (e) {
                // see issue #34 Resend old messages?
                if (self.setup.debug && self.setup.debug.disable_autoexpand_textarea) return ;
                var element = e.target;
                element.style.overflow = 'hidden';
                element.style.height = 0;
                element.style.height = element.scrollHeight + 'px';
            };

            self.open_wallet = function (money_transaction) {
                var pgm = controller + '.open_wallet: ' ;
                console.log(pgm + 'money_transaction = ' + JSON.stringify(money_transaction)) ;
            } ; // open_wallet

            self.confirmed_send_chat = null ;
            self.send_chat_msg = function () {
                var pgm = controller + '.send_chat_msg: ';
                var i, j, contact, my_unique_id, message, error, warning, money_transactions;

                // disable form elements while checking and sending message
                self.new_chat_msg_disabled = true ;

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
                    contact = find_group_chat_contact() ;
                    if (!contact) {
                        self.new_chat_msg_disabled = false ;
                        return ;
                    }
                    if (contact.type != 'group') {
                        self.contact = contact ;
                        self.group_chat = false;
                        self.group_chat_contacts = [];
                    }
                }
                if (self.group_chat) {
                    if (contact.send_password) {
                        // new pseudo group chat contact. send password to participants
                        for (i = 0; i < self.group_chat_contacts.length; i++) {
                            message = {
                                msgtype: 'group chat',
                                participants: contact.participants,
                                password: contact.password
                            };
                            debug('outbox && unencrypted', pgm + 'message = ' + JSON.stringify(message));
                            // validate json
                            error = MoneyNetworkHelper.validate_json(pgm, message, message.msgtype, 'Could not send chat message');
                            if (error) {
                                ZeroFrame.cmd("wrapperNotification", ["Error", error]);
                                self.new_chat_msg_disabled = false ;
                                return;
                            }
                            // send group chat message
                            moneyNetworkService.add_msg(self.group_chat_contacts[i], message);
                        } // for i
                        delete contact.send_password ;
                    }
                }
                else contact = self.contact ;

                // money transaction?
                if (contact.type == 'group') self.show_money = false ;
                if (self.show_money) {
                    if (self.validate_money_transactions()) {
                        // error in money transaction(s)
                        self.new_chat_msg_disabled = false ;
                        return ;
                    }
                    // empty money transaction(s)?
                    money_transactions = false ;
                    for (i=0 ; i<self.money_transactions.length ; i++) {
                        if (!self.money_transaction_is_empty(self.money_transactions[i])) {
                            money_transactions = true ;
                            break ;
                        }
                    }
                    if (!money_transactions) self.show_money = false ;
                }

                if (self.show_money) {
                    // non empty money transaction(s)
                    console.log(pgm + 'todo: 1) add wallet status / error message to money transaction table') ;
                    console.log(pgm + 'todo: 2) add open wallet link to UI') ;
                    console.log(pgm + 'todo: 3) ping my wallet. show ping error message in UI') ;
                    console.log(pgm + 'todo: 4) validate money transaction. send to my wallet. returns error or a wallet specific json to be included in chat to other user') ;
                    console.log(pgm + 'todo: 5) send chat message.') ;
                    console.log(pgm + 'todo: 6) make money transactions table responsive? Not nice on small devices');
                }

                // callback function - send chat message
                var step_3_send_message = function () {
                    var pgm = controller + '.send_chat_msg.step_3_send_message: ';
                    // ready to send. hide any money transactions.
                    self.show_money = false ;
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
                        self.new_chat_msg_disabled = false ;
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
                    self.new_chat_msg_disabled = false ;
                    // console.log(pgm + 'contact = ' + JSON.stringify(contact));
                    // update localStorage and ZeroNet
                    // console.log(pgm + 'calling ls_save_contacts');
                    if (contact) contact.seen_at = new Date().getTime() ;
                    moneyNetworkService.update_chat_notifications() ;
                    moneyNetworkService.ls_save_contacts(true);
                } ; // step_3_send_message

                // callback function - optional money transaction
                var step_2_check_money = function () {
                    var pgm = controller + '.send_chat_msg.step_2_check_money: ';
                    var unique_texts, i, money_transaction, unique_text, sessions, j, balance, ping_wallet_session,
                        set_ping_error, wallet_link ;
                    console.log(pgm + 'show_money = ' + self.show_money) ;
                    if (!self.show_money) return step_3_send_message() ; // no money - continue

                    // ping wallet(s). fast response. relevant wallet(s) must be open before sending chat with money transaction(s)
                    // find unique_texts and sessionids before ping wallets
                    unique_texts = {} ;
                    for (i=0 ; i<self.money_transactions.length ; i++) {
                        money_transaction = self.money_transactions[i] ;
                        if (!money_transaction.message) money_transaction.message = {} ;
                        delete money_transaction.message.ping ; // delete any old ping error message
                        delete money_transaction.message.open_wallet ; // delete any old show wallet link
                        console.log(pgm + 'money_transaction = ' + JSON.stringify(money_transaction));
                        if (self.money_transaction_is_empty(money_transaction)) continue ;
                        unique_text = money_transaction.currency ;
                        if (!unique_texts[unique_text]) unique_texts[unique_text] = {
                            balance: null,
                            money_transactions: []
                        } ;
                        unique_texts[unique_text].money_transactions.push(money_transaction) ;
                    } // for i
                    console.log(pgm + 'unique_texts = ' + JSON.stringify(unique_texts)) ;
                    // unique_texts = ["tBTC Test Bitcoin from MoneyNetworkW2"]

                    sessions = [] ;
                    for (unique_text in unique_texts) {
                        for (j=0 ; j<self.currencies.length ; j++) {
                            balance = self.currencies[j] ;
                            if (balance.unique_text != unique_text) continue ;
                            sessions.push(balance) ;
                            unique_texts[unique_text].balance = balance ;
                            break ;
                        } // for j
                    } // for i
                    console.log(pgm + 'sessions = ' + JSON.stringify(sessions)) ;
                    // sessions = [{"code":"tBTC","amount":1.3,"balance_at":1504431366592,"sessionid":"wslrlc5iomh45byjnblebpvnwheluzzdhqlqwvyud9mu8dtitus3kjsmitc1","wallet_sha256":"6ef0247021e81ae7ae1867a685f0e84cdb8a61838dc25656c4ee94e4f20acb74","wallet_address":"1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1","wallet_title":"MoneyNetworkW2","wallet_description":"Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro","unique_id":"6ef0247021e81ae7ae1867a685f0e84cdb8a61838dc25656c4ee94e4f20acb74/tBTC","name":"Test Bitcoin","url":"https://en.bitcoin.it/wiki/Testnet","units":[{"unit":"BitCoin","factor":1},{"unit":"Satoshi","factor":1e-8}],"unique_text":"tBTC Test Bitcoin from MoneyNetworkW2"}]

                    set_ping_error = function (unique_text, error, show_wallet) {
                        var pgm = controller + '.send_chat_msg.step_2_check_money.set_ping_error: ';
                        var i, money_transaction ;
                        if (!unique_texts[unique_text]) throw pgm + 'System error. Unknown unique_text ' + unique_text ;
                        if (!unique_texts[unique_text].money_transactions || !unique_texts[unique_text].money_transactions.length) throw pgm + 'System error. No money transactions found for unique_text ' + unique_text ;
                        for (i=0 ; i<unique_texts[unique_text].money_transactions.length ; i++) {
                            money_transaction = unique_texts[unique_text].money_transactions[i] ;
                            if (!money_transaction.message) money_transaction.message = {} ;
                            money_transaction.message.ping = error ;
                            if (show_wallet) money_transaction.message.open_wallet = true ;
                            format_money_transaction_message(money_transaction) ;
                        }
                    } ; // set_ping_error

                    // any unknown unique_texts / sessions?
                    for (unique_text in unique_texts) {
                        if (!unique_texts[unique_text].balance) set_ping_error(unique_text, 'Cannot ping unknown wallet (unique_text)') ;
                    }

                    // ping wallet sessions. one loop for each session in sessions array
                    // results:
                    // a) ping OK. wallet is ready. ready to send money transaction(s) to wallet session for validation
                    // b) ping timeout. wallet not ready. user should open or reload wallet in an other browser tab
                    // c) ping error. system error. cannot send money transaction. stop send_chat_msg
                    ping_wallet_session = function () {
                        var pgm = controller + '.send_chat_msg.step_2_check_money.ping_session: ';
                        var balance, i, money_transaction, errors, error ;
                        if (!sessions.length) {
                            // done pinging sessions
                            errors = 0 ;
                            for (i=0 ; i<self.money_transactions.length ; i++) {
                                money_transaction = self.money_transactions[i] ;
                                if (money_transaction.message.ping) errors++ ;
                            }
                            if (errors) {
                                // one or more wallet ping errors. stop end chat message
                                self.new_chat_msg_disabled = false ;
                                $rootScope.$apply() ;
                                error = 'Sorry. Wallet ping error' + (errors > 1 ? 's' : '') + '<br>Cannot send chat message with money transaction' ;
                                ZeroFrame.cmd("wrapperNotification", ['error', error, 5000]) ;
                                return ;
                            }
                            // no wallet ping errors. continue
                            console.log(pgm + 'todo: done pinging wallet sessions. send transactions to wallets for validation');
                            return step_3_send_message() ;
                        }
                        balance = sessions.shift() ;
                        MoneyNetworkAPILib.get_session(balance.sessionid, function (session) {
                            var request, error, url ;
                            if (!session) {
                                error = 'error. could not ping ' + balance.unique_text + ' wallet. ' +
                                    'could not find any old session with sessionid ' + balance.sessionid +
                                    '. please check any previous error in log for sessionid ' + balance.sessionid ;
                                console.log(pgm + error) ;
                                set_ping_error(balance.unique_text, 'Cannot ping unknown wallet (sessionid)', false) ;
                                return ping_wallet_session() ; // next session (if any)
                            }
                            // send ping. timeout max 5 seconds. Expects Timeout or OK response
                            request = { msgtype: 'ping' };
                            session.encrypt.send_message(request, {response: 5000}, function (response) {
                                if (response && response.error && response.error.match(/^Timeout /)) {
                                    // OK. Timeout. Continue with next session
                                    set_ping_error(balance.unique_text, 'Wallet ping timeout', true) ;
                                    return ping_wallet_session(); // next session (if any)
                                }
                                if (!response || response.error) {
                                    // Unexpected error.
                                    error = 'error. ping sessionid ' + balance.sessionid + ' returned ' + JSON.stringify(response) ;
                                    console.log(pgm + error) ;
                                    set_ping_error(balance.unique_text, 'Wallet ping error ' + JSON.stringify(response), true) ;
                                    return ping_wallet_session(); // next session (if any)
                                }
                                // ping OK. wallet session
                                console.log(pgm + 'wallet session ping OK. balance = ' + JSON.stringify(balance)) ;
                                set_ping_error(balance.unique_text, null) ;
                                ping_wallet_session() ; // next session (if any)
                            }) ; // send_message

                        }) ; // get_session callback

                    } ; // ping_session
                    // start ping loop
                    ping_wallet_session() ;

                } ; // step_2_check_money

                var step_1_confirm_send = function () {
                    var pgm = controller + '.send_chat_msg.step_1_confirm_send: ';
                    // send msg. confirm send if chatting to an "old" contact
                    var warning ;
                    if (contact && (contact.type != 'group') &&
                        (warning=moneyNetworkService.is_old_contact(contact,true)) &&
                        (self.confirmed_send_chat != contact.unique_id)) {
                        ZeroFrame.cmd("wrapperConfirm", [warning + '<br>Send message anyway?', "Send"], function (confirm) {
                            if (!confirm) {
                                self.new_chat_msg_disabled = false ;
                                return ;
                            }
                            // only ask for confirmation once for contact
                            self.confirmed_send_chat = contact.unique_id ;
                            step_2_check_money() ;
                        }) ;
                        return ;
                    }
                    self.confirmed_send_chat = null ; // no warning
                    step_2_check_money() ;
                } ; // step_1_confirm_send

                // start callback chain
                step_1_confirm_send();

            }; // send_chat_msg

            self.changed_chat_msg = "";
            self.edit_chat_msg = function (message, spam) {
                var pgm = controller + '.edit_chat_msg: ';
                var textarea_id, img_id, focus_textarea, update_zeronet ;
                // console.log(pgm + 'message.message = ' + JSON.stringify(message.message));
                if ((message.message.folder == 'outbox') && (message.message.message.msgtype == 'chat msg')) {
                    // edit previously sent chat message. open edit/delete message dialog
                    message.edit_chat_message = true;
                    // angularJS cheat - ng-bind is too slow - using id for get/set textarea value. Maybe also a problem with handleTextAreaHeight?
                    textarea_id = chatEditTextAreaId(message);
                    document.getElementById(textarea_id).value = message.message.message.message;
                    console.log(pgm + 'textarea_id = ' + textarea_id +
                        ', message.message.message.message = ' + message.message.message.message +
                        ', document.getElementById(textarea_id).value = ' + document.getElementById(textarea_id).value) ;
                    img_id = chatEditImgId(message) ;
                    // console.log(pgm + 'img_id = ' + img_id);
                    if (message.message.message.image) {
                        message.message.message.original_image = message.message.message.image ;
                        document.getElementById(img_id).src = message.message.message.image ;
                    }
                    // focus to edit chat message textarea field
                    focus_textarea = function () {
                        console.log(pgm + 'focus_textarea start') ;
                        var id = textarea_id + '' ;
                        var elem = document.getElementById(id) ;
                        if (elem) {
                            console.log(pgm + 'id = ' + id + ', value = ' + elem.value) ;
                            elem.focus() ;
                            console.log(pgm + 'focus_textarea end') ;
                            $scope.$apply() ;
                        }
                        else console.log(pgm + 'textarea element with id ' + id + ' was not found in page') ;
                    };
                    $timeout(focus_textarea);
                }
                else {
                    //// just delete other type of messages from localStorage (ingoing chat messages, contact added, contact deleted etc)
                    //var msg_text = formatChatMessage(message);
                    //if (msg_text.length > 40) msg_text = msg_text.substring(0, 20) + "..." + msg_text.substring(msg_text.length - 15);
                    //// console.log(pgm + 'msg_text.length = ' + msg_text.length);
                    //ZeroFrame.cmd("wrapperConfirm", ['Delete "' + msg_text + '" message?', "Delete"], function (confirmed) {
                    //    if (!confirmed) return;

                    // console.log(pgm + 'delete message. message = ' + JSON.stringify(message));
                    // logical delete here. physical delete in ls_save_contacts
                    message.chat_filter = false ;
                    if (spam) {
                        // move contact to ignored list and hide ignored list
                        message.contact.type = 'ignore' ;
                        if (self.setup.contact_filters.ignore == 'green') self.toggle_filter('ignore', spam) ;
                        update_zeronet = false ;
                    }
                    else {
                        // message.message.deleted_at = new Date().getTime();
                        update_zeronet = moneyNetworkService.recursive_delete_message(message) ;
                    } // logical delete.
                    // if (apply) $scope.$apply();
                    // update localStorage and optional zeronet
                    // var update_zeronet = ((message.message.folder == 'outbox') && message.message.zeronet_msg_id) ;
                    moneyNetworkService.ls_save_contacts(update_zeronet); // physical delete
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
                delete document.getElementById(img_id).src ;
            }; // cancel_edit_chat_msg
            self.save_chat_msg = function (message) {
                var pgm = controller + '.save_chat_msg: ';
                // angularJS cheat - ng-bind is too slow - using id for get/set textarea value.
                var textarea_id, old_value, new_value, old_image, new_image, img_id, new_message, parent ;
                textarea_id = chatEditTextAreaId(message);
                old_value = message.message.message.message;
                new_value = document.getElementById(textarea_id).value;
                parent = message.message.message.parent ;
                document.getElementById(textarea_id).value = '' ;
                MoneyNetworkHelper.debug('outbox && unencrypted', pgm + 'old message = ' + JSON.stringify(message.message));
                MoneyNetworkHelper.debug('outbox && unencrypted', pgm + 'old value = ' + old_value);
                MoneyNetworkHelper.debug('outbox && unencrypted', pgm + 'new value = ' + new_value);
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
                    moneyNetworkService.recursive_delete_message(message) ;
                    //message.message.deleted_at = new Date().getTime() ;
                    //message.chat_filter = false ;

                    // create new message
                    // send chat message to contact
                    new_message = {
                        msgtype: 'chat msg',
                        message: new_value
                    };
                    if (new_image) new_message.image = new_image ;
                    if (parent) new_message.parent = parent ;
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
                if (parent) changed_message.parent = parent ;
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
                //message.message.deleted_at = new Date().getTime() ;
                //message.chat_filter = false ;
                moneyNetworkService.recursive_delete_message(message) ;
                // save localStorage and update ZeroNet
                moneyNetworkService.ls_save_contacts(true) ;
            }; // save_chat_msg
            self.delete_edit_chat_msg = function (message) {
                // called from edit chat message form. Always outbox message
                var pgm = controller + '.delete_edit_chat_msg: ';
                var msg_text, update_zeronet ;
                msg_text = formatChatMessage(message);
                if (!message.message.sent_at || !msg_text) {
                    console.log(pgm + 'error cleanup. deleting message without a sent_at timestamp / message. message.message = ' + JSON.stringify(message.message)) ;
                    moneyNetworkService.remove_message(message) ;
                    moneyNetworkService.ls_save_contacts(false);
                    return ;
                }
                if ((message.contact.type == 'public') || (message.message.z_filename)) {
                    // public unencrypted chat. just delete
                    //delete message.edit_chat_message;
                    //message.message.deleted_at = new Date().getTime(); // logical delete
                    //message.chat_filter = false ;
                    debug('public_chat', pgm + 'deleted public outbox message ' + JSON.stringify(message.message)) ;
                    // save localStorage and update ZeroNet
                    //update_zeronet = (message.contact.type == 'public') ; // my outgoing public chat
                    update_zeronet = moneyNetworkService.recursive_delete_message(message) ;
                    moneyNetworkService.ls_save_contacts(update_zeronet); // physical delete
                    return ;
                }
                // person or group chat. confirm dialog and send a special empty delete chat message
                if (msg_text.length > 40) msg_text = msg_text.substring(0, 20) + "..." + msg_text.substring(msg_text.length - 15);
                // console.log(pgm + 'msg_text.length = ' + msg_text.length);
                ZeroFrame.cmd("wrapperConfirm", ['Delete "' + msg_text + '" message?', "Delete"], function (confirmed) {
                    if (!confirmed) return;
                    moneyNetworkService.recursive_delete_message(message) ;
                    //// console.log(pgm + 'deleting message ' + JSON.stringify(message));
                    //delete message.message.message.original_image ;
                    //// outbox: send delete chat message. note empty chat message
                    //var delete_message = {
                    //    msgtype: 'chat msg',
                    //    old_local_msg_seq: message.message.local_msg_seq
                    //};
                    //// console.log(pgm + 'delete_message = ' + JSON.stringify(delete_message));
                    //// validate json
                    //var error = MoneyNetworkHelper.validate_json(pgm, delete_message, delete_message.msgtype, 'Could not send delete chat message');
                    //if (error) {
                    //    ZeroFrame.cmd("wrapperNotification", ["Error", error]);
                    //    return;
                    //}
                    //// console.log(pgm + 'last_sender_sha256 = ' + last_sender_sha256);
                    //// send message
                    //moneyNetworkService.add_msg(message.contact, delete_message, false);
                    //self.messages[self.messages.length-1].chat_filter = false ;
                    //// delete old message
                    //delete message.edit_chat_message;
                    //message.message.deleted_at = new Date().getTime(); // logical delete
                    //message.chat_filter = false ;
                    //delete message.message.image;
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
                    //var max_image_size = moneyNetworkService.get_max_image_size() ;
                    //if (image_base64uri.length * 0.75 > max_image_size) {
                    //    ZeroFrame.cmd("wrapperNotification", ["error", "Sorry. Image is too big. Max allowed size is about " + max_image_size + " bytes.", 5000]);
                    //    return;
                    //}

                    self.new_chat_src = image_base64uri ;
                    $scope.$apply() ;

                }, false);
                console.log($scope.uploadedFile) ;
                reader.readAsDataURL($scope.uploadedFile);

            }; // imageDropped

            // input file browse image - todo: refactor
            var new_chat_com_regexp = new RegExp('^new_chat_com_file_input_id_[0-9]+$') ;
            self.uploadImage = function(event){
                var pgm = controller + '.uploadImage: ' ;
                // what is the target for file upload? new_chat_src in top of page or edit chat message img scr
                var input_file_id = event.target.id ; // file-input, file-input2, edit_chat_file_input_id_115
                // console.log(pgm + 'input_file_id = ' + input_file_id);


                // https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL
                var reader  = new FileReader();
                reader.addEventListener("load", function () {
                    var image_base64uri = reader.result ;
                    var obj_id, hashkey, i, message ;
                    // console.log(pgm + 'reader.result = ' + image_base64uri);
                    var ext = moneyNetworkService.get_image_ext_from_base64uri(image_base64uri);
                    if (!ext) {
                        ZeroFrame.cmd("wrapperNotification", ["error", "Sorry. Only png, jpg, jpeg, gif and tif images can be used in chat", 5000]);
                        return;
                    }
                    //var max_image_size = moneyNetworkService.get_max_image_size() ;
                    //if (image_base64uri.length * 0.75 > max_image_size) {
                    //    ZeroFrame.cmd("wrapperNotification", ["error", "Sorry. Image is too big. Max allowed size is about " + max_image_size + " bytes.", 5000]);
                    //    return;
                    //}

                    if (['file-input', 'file-input2'].indexOf(input_file_id) != -1) {
                        // image upload in new chat message form
                        self.new_chat_src = image_base64uri ;
                        $scope.$apply() ;
                    }
                    else if (input_file_id.match(new_chat_com_regexp)) {
                        // image upload in new chat comment form. id = new_chat_com_file_input_id_<n>
                        input_file_id_array = input_file_id.split('_');
                        obj_id = input_file_id_array[input_file_id_array.length-1] ;
                        console.log(pgm + 'new comment image. input_file_id = ' + input_file_id + ', obj_id = ' + obj_id) ;
                        hashkey = 'object:' + obj_id ;
                        for (i=0 ; i<self.messages.length ; i++) {
                            if (self.messages[i]['$$hashKey'] != hashkey) continue ;
                            message = self.messages[i] ;
                            message.comment_src = image_base64uri ;
                            $scope.$apply() ;
                            break ;
                        }
                        // console.log(pgm + 'message = ' + JSON.stringify(message)) ;
                    }
                    else {
                        // image upload in edit outgoing message (messages ng-repeat section)
                        // now var id = 'edit_chat_file_input_id_' + object_id ;
                        // copy to id = 'edit_chat_msg_img_id_' + object_id ;
                        console.log(pgm + 'input_file_id = ' + input_file_id) ;
                        var input_file_id_array = input_file_id.split('_');
                        var edit_chat_msg_img_id = 'edit_chat_msg_img_id_' + input_file_id_array[input_file_id_array.length-1] ;
                        console.log(pgm + 'edit_chat_msg_img_id = ' + edit_chat_msg_img_id) ;
                        document.getElementById(edit_chat_msg_img_id).src = image_base64uri ;
                        $scope.$apply() ;
                    }

                }, false);
                reader.readAsDataURL(event.target.files[0]);

            }; // uploadImage

            self.new_chat_src_remove = function() {
                self.new_chat_src = '' ;
            } ;



            self.show_money = false ; // show/hide money fields in new chat

            self.money_actions = [ 'Send', 'Request'] ;

            self.currencies = null ; // list with currencies. initialize in first new_chat_add_money request

            self.new_chat_add_money = function() {
                var pgm = controller + '.new_chat_add_money: ' ;
                var contact, currencies ;

                // money transactions are only allowed from private chat.
                // check group chat? find/create pseudo contact for this chat group.
                self.editing_grp_chat = false ;
                console.log(pgm + 'group_chat = ' + JSON.stringify(self.group_chat));
                if (self.group_chat) {
                    contact = find_group_chat_contact() ;
                    if (!contact) return ;
                    if (contact.type != 'group') {
                        self.contact = contact ;
                        self.group_chat = false;
                        self.group_chat_contacts = [];
                    }
                }
                if (!self.contact || self.group_chat) {
                    ZeroFrame.cmd("wrapperNotification", ['info', 'Money transactions are only available in private chat<br>Click on an avatar to start a private chat', 5000]) ;
                    return ;
                }
                console.log(pgm + 'todo: Send, receive or donate money. Pay or receive payment. Not yet implemented') ;

                console.log(pgm + 'todo: currencies. must have a distributed currency list. Symbol 2-5 characters, name and description');

                // get list of currencies from connected wallets
                moneyNetworkService.get_currencies(function (currencies, delayed) {
                    console.log(pgm + 'currencies = ' + JSON.stringify(currencies));

                    if (!self.currencies) self.currencies = currencies ; // initialize currencies array used in UI

                    // show/hide money. always reset money transactions array
                    self.money_transactions.splice(0,self.money_transactions.length) ;
                    self.money_transactions.push({action: null, currency: null, amount: null, unit: null}) ;
                    self.show_money = !self.show_money ;
                    console.log(pgm + 'show_money = ' + self.show_money) ;

                    if (delayed) $rootScope.$apply() ;

                    //sessions = {
                    //    "wslrlc5iomh45byjnblebpvnwheluzzdhqlqwvyud9mu8dtitus3kjsmitc1": {
                    //        "_$session_info": {
                    //            "url": "/1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                    //            "password": "U2FsdGVkX18MyosYqdGVowB1nw/7Nm2nbzATu3TexEXMig7rjInIIr13a/w4G5TzFLFz9GE+rqGZsqRP+Ms0Ez3w8cA9xNhPjtrhOaOkT1M=",
                    //            "pubkey": "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCuM/Sevlo2UYUkTVteBnnUWpsd\n5JjAUnYhP0M2o36da15z192iNOmd26C+UMg0U8hitK8pOJOLiWi8x6TjvnaipDjc\nIi0p0l3vGBEOvIyNEYE7AdfGqW8eEDzzl9Cezi1ARKn7gq1o8Uk4U2fjkm811GTM\n/1N9IwACfz3lGdAm4QIDAQAB\n-----END PUBLIC KEY-----",
                    //            "pubkey2": "Ahn94vCUvT+S/nefej83M02n/hP8Jvqc8KbxMtdSsT8R",
                    //            "last_request_at": 1504424728387,
                    //            "done": {
                    //                "1503315223138": 1503315232562,
                    //                "1503916247431": 1503916247859,
                    //                "1504261657652": 1504261664116,
                    //                "1504261977720": 1504261982693
                    //            },
                    //            "balance": [{"code": "tBTC", "amount": 1.3}],
                    //            "balance_at": 1504265571720,
                    //            "wallet_sha256": "6ef0247021e81ae7ae1867a685f0e84cdb8a61838dc25656c4ee94e4f20acb74"
                    //        }
                    //    }
                    //};

                    //currencies = [{
                    //    "code": "tBTC",
                    //    "amount": 1.3,
                    //    "balance_at": 1504265571720,
                    //    "sessionid": "wslrlc5iomh45byjnblebpvnwheluzzdhqlqwvyud9mu8dtitus3kjsmitc1",
                    //    "wallet_sha256": "6ef0247021e81ae7ae1867a685f0e84cdb8a61838dc25656c4ee94e4f20acb74",
                    //    "wallet_address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                    //    "wallet_title": "MoneyNetworkW2",
                    //    "wallet_description": "Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro",
                    //    "name": "Test Bitcoin",
                    //    "url": "https://en.bitcoin.it/wiki/Testnet",
                    //    "units": [{"unit": "BitCoin", "factor": 1}, {"unit": "Satoshi", "factor": 1e-8}]
                    //}];

                    console.log(pgm + 'todo: send money. enter currency and amount. must known currencies and amounts from my connected wallets') ;
                    console.log(pgm + 'todo: send money. not required but should know contacts preferred or connected currencies') ;
                    console.log(pgm + 'todo: send money. receiver must accept send money transaction');

                }) ;

            } ; // new_chat_add_money

            self.money_get_units = function (money_transaction) {
                var pgm = controller + '.money_get_units: ' ;
                var i ;
                console.log(pgm + 'money_transaction = ' + JSON.stringify(money_transaction)) ;
                // money_transaction = {"action":"Send","currency":"tBTC Test Bitcoin from MoneyNetworkW2","amount":"1","$$hashKey":"object:140"}
                for (i=0 ; i<self.currencies.length ; i++) {
                    if (self.currencies[i].unique_text == money_transaction.currency) return self.currencies[i].units || ['n/a'] ;
                }
                return [] ;
            } ; // money_get_units

            // new money transaction. select currency for money transaction
            var empty_money_transaction = {action: null, currency: null, amount: null, unit: null} ;
            self.money_transactions = [ {action: null, currency: null, amount: null, unit: null} ] ;
            self.money_transaction_changed = function(name, money_transaction) {
                var pgm = controller + '.money_transaction_changed: ' ;
                var units ;
                console.log(pgm + 'name = ' + JSON.stringify(name) + ', money_transaction = ' + JSON.stringify(money_transaction) + ', self.money_transactions = ' + JSON.stringify(self.money_transactions)) ;
                if (name == 'currency') {
                    // currency changed. reset/set unit
                    money_transaction.unit = null ;
                    if (!money_transaction.currency) return ;
                    units = self.money_get_units(money_transaction) ;
                    if (units.length == 1) money_transaction.unit = units[0] ;
                } // currency change. reset unit

                console.log(pgm + 'todo: set money_transaction.message. error message and/or wallet balance') ;

            } ; // money_currency_changed

            // insert money transaction row. tab/enter
            self.money_insert_row = function (money_transaction) {
                var pgm = controller + '.money_insert_row: ' ;
                console.log(pgm + 'money_transaction = ' + JSON.stringify(money_transaction)) ;
                if (self.validate_money_transactions()) return ; // error. wait with new row
                if (self.money_transaction_is_empty(money_transaction)) return ; // wait. empty row
                var index ;
                for (var i=0 ; i<self.money_transactions.length ; i++) if (self.money_transactions[i].$$hashKey == money_transaction.$$hashKey) index = i ;
                index = index + 1 ;
                self.money_transactions.splice(index, 0, {action: null, currency: null, amount: null, unit: null});
                $scope.$apply();
            } ; // money_insert_row

            self.money_transaction_delete_row = function (money_transaction) {
                var index ;
                for (var i=0 ; i<self.money_transactions.length ; i++) if (self.money_transactions[i].$$hashKey == money_transaction.$$hashKey) index = i ;
                // console.log(pgm + 'row = ' + JSON.stringify(row)) ;
                self.money_transactions.splice(index, 1);
                if (self.money_transactions.length == 0) self.money_transactions.splice(index, 0, {action: null, currency: null, amount: null, unit: null});
            } ; // money_transaction_delete_row

            self.money_transaction_is_empty = function (money_transaction) {
                return (!money_transaction.action && !money_transaction.currency && !money_transaction.amount && !money_transaction.unit) ;
            } ; //money_transaction_is_empty
            
            self.money_amount_re = '^[+-]?[0-9]*(\.[0-9]+)?$' ;

            function format_money_transaction_message (money_transaction) {
                var messages = [] ;
                if (money_transaction.message.balance) messages.push(money_transaction.message.balance) ;
                if (money_transaction.message.required) messages.push(money_transaction.message.required) ;
                if (money_transaction.message.ping) messages.push(money_transaction.message.ping) ; // wallet ping error
                money_transaction.message.html = messages.join('. ') ;
            } // format_money_transaction_message

            // set money_transaction.message. return error message
            self.validate_money_transaction = function (money_transaction) {
                var pgm = controller + '.validate_money_transaction: ' ;
                var messages, amount, balances, balance, i, units, j, required ;
                if (!money_transaction.message) money_transaction.message = {} ;
                money_transaction.message.html = null ;
                if (self.money_transaction_is_empty(money_transaction)) return null ;
                // check (old) balance
                delete money_transaction.message.balance ;
                if (money_transaction.currency) {
                    // lookup balance
                    balances = [] ;
                    for (i=0 ; i<self.currencies.length ; i++) {
                        if (self.currencies[i].unique_text != money_transaction.currency) continue ;
                        amount = self.currencies[i].amount ;
                        // units": [{"unit": "BitCoin", "factor": 1}, {"unit": "Satoshi", "factor": 1e-8}]
                        units = self.currencies[i].units ;
                        for (j=0 ; j<units.length ; j++) {
                            balance = amount / units[j].factor + ' ' + units[j].unit ;
                            if (units[j].factor == 1) balances.unshift(balance) ;
                            else balances.push(balance) ;
                        } // for j
                    } // for k
                    if (balances.length) money_transaction.message.balance = 'Wallet balance ' + balances.join(' = ') ;
                }
                // validate row (required values)
                if (!money_transaction.action) required = 'Action (Send/Request) is required' ;
                else if (!money_transaction.currency) required = 'Currency is required' ;
                else if (!money_transaction.amount) required = 'Amount is required' ;
                else if (!money_transaction.unit) required = 'Unit is required' ;
                if (required) money_transaction.message.required = required ;
                else delete money_transaction.message.required ;
                // format message
                format_money_transaction_message(money_transaction) ;
                // return any required error message
                return required ;
            } ; // validate_money_transaction

            // validate money transaction(s). Empty money transaction = no money transaction
            // returns null (ok) or an error message
            self.validate_money_transactions = function (tab) {
                var pgm = controller + '.validate_money_transactions: ' ;
                var i, money_transaction, empty_rows, errors ;
                if (!self.show_money) return null ;
                empty_rows = false ;
                errors = 0 ;
                for (i=0 ; i<self.money_transactions.length ; i++) {
                    money_transaction = self.money_transactions[i] ;
                    if (self.money_transaction_is_empty(money_transaction)) {
                        empty_rows = true ;
                        continue ;
                    }
                    if (self.validate_money_transaction(money_transaction)) errors++ ;
                }
                if (errors) return 'Please enter requested information or delete money transaction' + (errors > 1 ? 's' : '');
                if (empty_rows || !tab) return null ;
                return 'Press <Tab> to insert extra rows' ;
            } ; // validate_money_transaction

            // public chat checkbox changed - add/remove public chat from UI
            self.public_chat_changed = function () {
                var pgm = controller + '.public_chat_changed: ' ;
                var i, contact, message, js_message_row, j ;
                moneyNetworkService.save_user_setup() ;
                MoneyNetworkHelper.load_user_setup() ;
                if (!self.setup.public_chat) {
                    // public chat changed from true or false. remove already loaded public chat messages
                    for (i=0 ; i<self.contacts.length ; i++) {
                        contact = self.contacts[i] ;
                        for (j=contact.messages.length-1 ; j >= 0 ; j--) {
                            message = contact.messages[j] ;
                            if ((contact.type == 'public') || message.z_filename) {
                                js_message_row = moneyNetworkService.get_message_by_seq(message.seq);
                                moneyNetworkService.remove_message(js_message_row);
                            }
                        }
                    }
                }
                moneyNetworkService.clear_files_optional_cache() ;
                debug('infinite_scroll || public_chat', pgm + 'calling moneyNetworkService.reset_first_and_last_chat') ;
                moneyNetworkService.reset_first_and_last_chat();
                $timeout(check_public_chat, 100) ;
            };

            // long texts. remove max height and show more text link from message
            self.hide_overflow = function (message) {
                message.overflow = false ;
            };

            //// click message. show/hide comment and reaction icons
            //self.click_message = function (message) {
            //    var pgm = controller + '.click_message: ' ;
            //    message.show_feedback = !message.show_feedback ;
            //    console.log(pgm + 'show_feedback = ' + message.show_feedback) ;
            //}; // self.click_message

            // add/update reaction. update like.json (public reaction) or send a private reaction message to other user
            self.react = function (message, new_index) {
                var pgm = controller + '.react: ' ;
                var old_index, i, symbols, hex_codes, contact, unique_id ;
                // console.log(pgm + 'message = ' + JSON.stringify(message) + ', index = ' + new_index) ;
                if (!message.reactions) {
                    console.log(pgm + 'error. reactions array was not found for message. see moneyNetworkService.add_message') ;
                    // console.log(pgm + 'local_msg_seq = ' + message.message.local_msg_seq + ', no reactions array') ;
                    return ;
                }
                // check. private_reactions and public key (deleted contacts)
                // todo: add this check to messageReact directive (move code to moneyNetworkService)
                if (self.setup.private_reactions && (message.message.folder == 'inbox')) {
                    // must send reaction as a private message. Check that pubkey is available
                    if (message.contact.type == 'group') {
                        // ingoing group chat message. info about sender should be in message
                        //console.log(pgm + 'ingoing group chat message. contact.participants = ' + JSON.stringify(message.contact.participants) +
                        //    ', message.participant = ' + JSON.stringify(message.message.participant)) ;
                        unique_id = message.contact.participants[message.message.participant-1] ;
                        // console.log(pgm + 'unique_id = ' + unique_id) ;
                        contact = moneyNetworkService.get_contact_by_unique_id(unique_id) ;
                        // console.log(pgm + 'contact = ' + JSON.stringify(contact)) ;
                        if (!contact) {
                            console.log(pgm + 'error. contact (sender of group chat message) was not found') ;
                            return ;
                        }
                    }
                    else contact = message.contact ;
                    if (!contact.pubkey) {
                        console.log(pgm + 'cannot send private reaction message to contact without a public key') ;
                        return ;
                    }
                }
                // update selected reaction
                old_index = -1 ;
                for (i=0 ; i<message.reactions.length ; i++) {
                    if (message.reactions[i].selected) {
                        old_index = i ;
                        break ;
                    }
                }
                if (old_index != -1) delete message.reactions[old_index].selected ;
                if (new_index != old_index) message.reactions[new_index].selected = true ;
                // console.log(pgm + 'local_msg_seq = ' + message.message.local_msg_seq + ', old_index = ' + old_index + ', new_index = ' + new_index) ;

                // save reaction:
                // - public chat and !user_setup.private_reactions: update like.json file (reaction is public)
                // todo: UI - disable reaction if no contact public key and private reaction is selected
                // - otherwise send a private message with reaction. update reactions in localStorage
                if (message.reactions[new_index].selected) {
                    hex_codes = message.reactions[new_index].unicode.split('_') ;
                    symbols = [] ;
                    for (i=0 ; i<hex_codes.length ; i++) symbols.push(parseInt(hex_codes[i],16)) ;
                    message.message.reaction = punycode.ucs2.encode(symbols) ;
                }
                else delete message.message.reaction ;
                // save reaction. in like.json, in reactions in localStorage and/or send a private reaction message
                message.message.reaction_at = new Date().getTime();
                moneyNetworkService.ls_save_contacts(true); // true: update ZeroNet (update like.json or send a private reaction message)

            }; // react


            // get reactions. from like.json on zeroNet and reactions hash in localStorage
            self.get_reactions = function (message) {
                var pgm = controller + '.get_reactions: ' ;
                var check_reactions ;
                if (message.message.reactions) return message.message.reactions ;
                // console.log(pgm + 'local_msg_seq = ' + message.message.local_msg_seq) ;
                message.message.reactions = [] ;
                check_reactions = function () {
                    moneyNetworkService.check_reactions(message)
                } ;
                $timeout(check_reactions) ; // lookup reactions
                return message.message.reactions ;
            }; // get_reactions
            self.get_reactions_count = function (message) {
                var pgm = controller + '.get_reactions_count: ' ;
                var sum, i ;
                if (!message.message.reactions) return null ;
                if (!message.message.reactions.length) return null ;
                sum = 0 ;
                for (i=0 ; i<message.message.reactions.length ; i++) sum += message.message.reactions[i].count ;
                return sum ;
            }; // get_reactions_count

            
            // comments
            self.show_comment = function (message) {
                message.show_comment = !message.show_comment ;
            };
            self.create_comment = function (message) {
                var pgm = controller + '.create_comment: ' ;
                var contact, auth4, parent, unique_id, sender, comment, error, my_unique_id, message_with_envelope, i ;
                MoneyNetworkHelper.debug('outbox && unencrypted', 'message.comment = ' + message.comment + ', message.comment_src = ' + (message.comment_src ? true : false)) ;

                // create chat comment within the correct context.
                // a) public chat, group chat or privat chat
                // b) remember parent message id (timestamp + first 4 characters of auth_address)

                // check image attachment
                if (message.comment_src && !moneyNetworkService.get_image_ext_from_base64uri(message.comment_src)) {
                    ZeroFrame.cmd(
                        "wrapperNotification", ["error", "Ups. Something is wrong here.<br>" +
                        "Only png, jpg, jpeg, gif and tif images can be used in chat<br>" +
                        "Sending chat comment without image", 5000]);
                    message.comment_src='';
                }
                if (!message.comment && !message.comment_src) return ;

                // parent index. "<sent_at>,<auth4>". special unique id used for comments and reference to parent message
                if (message.message.folder == 'outbox') auth4 = ZeroFrame.site_info.auth_address.substr(0, 4) ;
                else if (message.contact.type != 'group') auth4 = message.contact.auth_address.substr(0,4) ; // public chat inbox or private chat inbox message from contact
                else {
                    // group chat inbox message. find sender from contact.participants and message.participant
                    unique_id = message.contact.participants[message.message.participant-1] ;
                    sender = get_contact_by_unique_id(unique_id) ;
                    console.log(pgm + 'parent index for group chat. message.participant = ' + message.message.participant +
                        ', contact.participants = ' + JSON.stringify(message.contact.participants) + ', unique_id = ' + unique_id + ', sender = ' + (sender ? true : false)) ;
                    if (sender) auth4 = sender.auth_address.substr(0,4) ;
                }
                if (auth4) parent = message.message.sent_at + ',' + auth4 ;
                if (!parent) {
                    console.log(pgm + 'error. could not create parent index for ' + JSON.stringify(message.message)) ;
                    return ;
                }

                // create comment
                comment = {
                    msgtype: 'chat msg',
                    message: message.comment || ' ',
                    image: message.comment_src,
                    parent: parent
                } ;
                if (!comment.image) delete comment.image ;
                // validate json
                error = MoneyNetworkHelper.validate_json(pgm, comment, comment.msgtype, 'Could not send chat message');
                if (error) {
                    ZeroFrame.cmd("wrapperNotification", ["Error", error]);
                    console.log(pgm + 'comment = ' + JSON.stringify(comment)) ;
                    return;
                }
                MoneyNetworkHelper.debug('outbox && unencrypted', pgm + 'comment = ' + JSON.stringify(comment));
                // send message
                if (message.message.z_filename) contact = null ; // public chat
                else contact = message.contact ; // private or group chat
                moneyNetworkService.add_msg(contact, comment);
                if (contact && (contact.type == 'group') && comment.image) {
                    // sending a group chat message with an image.
                    // expects one receipt for each participant in chat group except me
                    // remove image chat message from zeronet (data.json) when all image receipts have been received
                    // see process_incoming_message - post processing of image receipts
                    // see z_update_data_json - data.json too big - xxxxxx
                    my_unique_id = moneyNetworkService.get_my_unique_id() ;
                    message_with_envelope = contact.messages[contact.messages.length-1] ;
                    message_with_envelope.image_receipts = [] ;
                    for (i=0 ; i<contact.participants.length ; i++) {
                        if (contact.participants[i] == my_unique_id) continue ;
                        message_with_envelope.image_receipts.push(contact.participants[i]) ;
                    }
                    debug('outbox && unencrypted', pgm + 'message_with_envelope = ' + JSON.stringify(message_with_envelope)) ;
                }

                // ready for next comment
                message.show_comment = false ;
                delete message.comment ;
                delete message.comment_src ;

                // sent/save new comment
                if (contact) contact.seen_at = new Date().getTime() ;
                moneyNetworkService.update_chat_notifications() ;
                moneyNetworkService.ls_save_contacts(true);
            }; // create_comment


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
                debug('infinite_scroll || public_chat', pgm + 'calling moneyNetworkService.reset_first_and_last_chat') ;
                moneyNetworkService.reset_first_and_last_chat() ;
            }; // self.get_more_messages

            // ChatCtrl
        }])

;
