angular.module('MoneyNetwork')
    
    .controller('UserCtrl', ['$scope', '$rootScope', '$timeout', 'MoneyNetworkService', '$location', 'dateFilter',
                     function($scope, $rootScope, $timeout, moneyNetworkService, $location, date)
    {
        var self = this;
        var controller = 'UserCtrl';
        if (!MoneyNetworkHelper.getItem('userid')) return ; // not logged in - skip initialization of controller
        console.log(controller + ' loaded');

        // debug wrappers
        function show_debug (keys) {
            return MoneyNetworkHelper.show_debug(keys) ;
        } // show_debug
        function debug (keys, text) {
            MoneyNetworkHelper.debug(keys, text) ;
        } // debug
        function debug_z_api_operation_start (pgm, inner_path, cmd, debug_this) {
            return MoneyNetworkAPILib.debug_z_api_operation_start(pgm, inner_path, cmd, debug_this) ;
        }
        function debug_z_api_operation_end (debug_seq, res) {
            MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq, res) ;
        }
        function format_res (res) {
            return res == 'ok' ? 'OK' : 'Failed. error = ' + JSON.stringify(res) ;
        }
        function format_q_res (res) {
            return (!res || res.error) ? 'Failed. error = ' + JSON.stringify(res) : 'OK' ;
        }

        // file get/write wrappers
        function z_file_get (pgm, options, cb) {
            moneyNetworkService.z_file_get(pgm, options, cb) ;
        }
        function z_file_write (inner_path, content, cb) {
            MoneyNetworkAPILib.z_file_write(inner_path, content, cb) ;
        }

        self.user_info = moneyNetworkService.get_user_info() ; // array with tags and values from localStorage
        self.tags = moneyNetworkService.get_tags() ; // typeahead autocomplete functionality
        self.privacy_options = moneyNetworkService.get_privacy_options() ; // select options with privacy settings for user info
        self.show_privacy_title = moneyNetworkService.get_show_privacy_title() ; // checkbox - display column with privacy descriptions?

        // search for new ZeroNet contacts and add avatars for new contacts
        var contacts = moneyNetworkService.get_contacts(); // array with contacts from localStorage
        self.zeronet_search_contacts = function () {
            moneyNetworkService.z_contact_search(null, null, null);
            // moneyNetworkService.z_contact_search(function () { $scope.$apply() }, null, null);
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
        self.avatar = moneyNetworkService.get_avatar();
        // console.log(controller + ': self.avatar (1) = ' + JSON.stringify(self.avatar)) ;

        // upload_avatar callback function. handle upload
        function handleAvatarUpload (image_base64uri) {
            var pgm = controller + '.handleAvatarUpload: ' ;
            var ext, image_base64, user_path, debug_seq1, debug_seq2, debug_seq3;
            if (!image_base64uri) return ;
            user_path = "data/users/" + ZeroFrame.site_info.auth_address ;
            ext = moneyNetworkService.get_image_ext_from_base64uri(image_base64uri);
            if (['png','jpg'].indexOf(ext) == -1) {
                ZeroFrame.cmd("wrapperNotification", ["error", "Sorry. Only png, jpg and jpeg images can be used as avatar", 5000]);
                return ;
            }
            console.log(pgm + 'todo: move the 3 ZeroFrame calls into a callback chain');
            debug_seq1 = debug_z_api_operation_start(pgm, user_path + "/avatar.jpg", 'fileDelete', show_debug('z_file_delete'));
            ZeroFrame.cmd("fileDelete", user_path + "/avatar.jpg", function (res) {
                debug_z_api_operation_end(debug_seq1, res == 'ok' ? 'OK' : 'Failed. error = ' + JSON.stringify(res));
            });
            debug_seq2 = debug_z_api_operation_start(pgm, user_path + "/avatar.png", 'fileDelete', show_debug('z_file_delete'));
            ZeroFrame.cmd("fileDelete", user_path + "/avatar.png", function (res) {
                debug_z_api_operation_end(debug_seq2, res == 'ok' ? 'OK' : 'Failed. error = ' + JSON.stringify(res));
            });
            image_base64 = image_base64uri != null ? image_base64uri.replace(/.*?,/, "") : void 0;
            // debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + user_path + "/avatar." + ext + ' fileWrite') ;
            debug_seq3 = debug_z_api_operation_start(pgm, user_path + "/avatar." + ext, 'fileWrite', show_debug('z_file_write')) ;
            z_file_write(user_path + "/avatar." + ext, image_base64, function (res) {
            //ZeroFrame.cmd("fileWrite", [user_path + "/avatar." + ext, image_base64], function(res) {
                var pgm = controller + '.handleAvatarUpload fileWrite callback: ';
                // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                debug_z_api_operation_end(debug_seq3, format_res(res)) ;
                // console.log(pgm + 'res = ' + JSON.stringify(res));
                self.avatar.src = user_path + "/avatar." + ext + '?rev=' + MoneyNetworkHelper.generate_random_password(10);
                $scope.$apply() ;
                moneyNetworkService.zeronet_site_publish() ;
                self.setup.avatar = ext ;
                moneyNetworkService.save_user_setup() ;
                //ZeroFrame.cmd("sitePublish", {inner_path: user_path + '/content.json'}, function (res) {
                //    // empty callback . no error handling. publish for avatar change is not important
                //}); // sitePublish
            }); // fileWrite
        } // handleAvatarUpload
        // avatar click using Uploadable class from ZeroMePlus
        self.upload_avatar = function () {
            var pgm = controller + '.upload_avatar: ';
            var uploadable_avatar = new Uploadable(handleAvatarUpload);
            uploadable_avatar.handleUploadClick() ;
        };

        // get setup with alias and spam settings
        function load_setup () {
            self.setup = moneyNetworkService.get_user_setup();
        }
        load_setup() ;
        function copy_setup() {
            self.setup_copy = JSON.parse(JSON.stringify(self.setup)) ;
        }
        copy_setup() ;

        // manage user alias
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
            self.setup.alias = self.setup_copy.alias ;
            moneyNetworkService.save_user_setup() ;
            copy_setup() ;
            $scope.$apply() ;
        };
        self.cancel_edit_alias = function () {
            self.editing_alias = false ;
            copy_setup();
            $scope.$apply() ;
        };

        // manage spam filter settings: block messages from guests and/or list of ignored contacts
        self.spam_settings_changed = function () {
            var pgm = controller + '.spam_settings_changed: ' ;
            if (self.setup_copy.block_guests != self.setup.block_guests) self.setup.block_guests_at = new Date().getTime() ;
            if (self.setup_copy.block_ignored != self.setup.block_ignored) self.setup.block_ignored_at = new Date().getTime() ;
            if (self.setup_copy.emoji_folder != self.setup.emoji_folder) moneyNetworkService.init_emojis_short_list() ;
            moneyNetworkService.save_user_setup() ;
            // console.log(pgm + 'setup = ' + JSON.stringify(self.setup));
            //setup = {
            //    ...
            //    "block_guests": false,
            //    "block_ignored": false,
            //    "block_guests_at": 1479033958082,
            //    "block_ignored_at": 1479033949514
            //};
            copy_setup() ;
        };

        function testcase_message_lost_in_cyberspace() {
            var pgm = controller + '.testcase_message_lost_in_cyberspace: ' ;
            var last_sent_at, last_contact, i, contact, j, message ;
            // insert test data for message lost in cyberspace testcase
            // create outbox message with local_msg_seq 999, status sent, not on zeronet (cleanup) and no feedback from contact
            // next outbox message will request feedback info for message lost in cyberspace
            last_sent_at = 0 ;
            last_contact = null ;
            for (i=0 ; i<contacts.length ; i++) {
                contact = contacts[i] ;
                if (!contact.messages) continue ;
                for (j=0 ; j<contact.messages.length ; j++) {
                    message = contact.messages[j] ;
                    if (message.folder != 'outbox') continue ;
                    if (message.sent_at < last_sent_at) continue ;
                    last_contact = contact ;
                    last_sent_at = message.sent_at ;
                }
            }
            if (!last_contact) {
                ZeroFrame.cmd('wrapperNotification', ['error', 'No last outbox message was found. cannot create message lost in cyberspace testcase', 5000]) ;
                return ;
            }
            // create test data. status sent, no zeronet_msg_id and status cleanup
            var local_msg_seq, sender_sha256, lost_message_with_envelope, js_messages ;
            local_msg_seq = moneyNetworkService.next_local_msg_seq() ;
            sender_sha256 = CryptoJS.SHA256(moneyNetworkService.generate_random_password()).toString();
            lost_message_with_envelope =
            {
                "folder": "outbox",
                "message": {"msgtype": "chat msg", "message": "message " + local_msg_seq + " lost in cyberspace"},
                "local_msg_seq": local_msg_seq,
                "sender_sha256": sender_sha256,
                "sent_at": new Date().getTime(),
                "cleanup_at": new Date().getTime()
            } ;
            lost_message_with_envelope.ls_msg_size = JSON.stringify(lost_message_with_envelope).length ;
            debug('lost_message', pgm + 'lost_message = ' + JSON.stringify(lost_message_with_envelope));
            // add message
            moneyNetworkService.add_message(last_contact, lost_message_with_envelope, false) ;
            moneyNetworkService.ls_save_contacts(false) ;
            ZeroFrame.cmd('wrapperNotification', ['info', 'created new outbox msg ' + local_msg_seq + '. Not sent, not on ZeroNet, no feedback info and marked as cleanup', 5000]);
        } // testcase_message_lost_in_cyberspace

        function testcase_image_file_done () {
            var pgm = controller + '.testcase_image_file_done: ' ;
            // find inbox messages with image_download_failed object
            var contacts, i, contact, j, message, filename, no_tests ;
            contacts = moneyNetworkService.get_contacts() ;
            no_tests = 0 ;
            for (i=0 ; i<contacts.length ; i++) {
                contact = contacts[i] ;
                if (!contact.messages) continue ;
                for (j=contact.messages.length-1 ; j >= 0 ; j--) {
                    message = contact.messages[j] ;
                    if (message.folder != 'inbox') continue ;
                    if (!message.image_download_failed) continue ;
                    // create file done event for this failed image download
                    filename = "data/users/" + contact.auth_address + "/" + message.sent_at + '-image.json' ;
                    moneyNetworkService.event_file_done('file_done', filename) ;
                    no_tests++ ;
                } // for j (messages)
            } // for i (contacts)
            console.log(pgm + 'found ' + no_tests + ' messages with image_download_failed objects' );

        } // testcase_image_file_done

        self.debug_settings_changed = function () {
            // create test data
            // create a lost message
            var old_force_lost_message = self.setup_copy.test && self.setup_copy.test.force_lost_message ;
            var new_force_lost_message = self.setup.test && self.setup.test.force_lost_message ;
            if (!old_force_lost_message && new_force_lost_message) testcase_message_lost_in_cyberspace() ;
            // simulate a file_done event after a image download timeout error
            var old_image_file_done = self.setup_copy.test && self.setup_copy.test.image_file_done ;
            var new_image_file_done = self.setup.test && self.setup.test.image_file_done ;
            if (!old_image_file_done && new_image_file_done) testcase_image_file_done() ;

            if (self.setup.encryption != self.setup_copy.encryption) {
                ZeroFrame.cmd('wrapperNotification', ['info', 'Preferred encryption was changed.<br>Save user information or send a new message to publish change to peers', 5000]);
            }
            MoneyNetworkAPILib.config({debug: self.setup.debug && self.setup.debug.money_network_api}) ;

            copy_setup() ;
            moneyNetworkService.save_user_setup() ;
            MoneyNetworkHelper.load_user_setup() ;
        };

        if (self.setup.guest) self.guest_password = MoneyNetworkHelper.getItem('password') ;

        // find JSEncrypt keysize. Used in mouse over title
        self.keysize = 2048 ;
        (function(){
            var encrypt = new JSEncrypt();
            encrypt.setPublicKey(MoneyNetworkHelper.getItem('pubkey'));
            self.keysize = encrypt.key.n.bitLength() ;
        })() ;
        self.keysize_disabled = !MoneyNetworkHelper.ls_get_private_data() ;

        // deep chat link
        self.my_chat_url = $location.protocol() + '://' + $location.host() + ':' + $location.port() + '/moneynetwork.bit/?path=/chat2/' + ZeroFrame.site_info.cert_user_id ;
        // console.log(controller + ': my_chat_url = ' + self.my_chat_url) ;

        ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Account", "?path=/user"]) ;

        // admin link section

        // soft delete current user account
        self.delete_user2 = function(all_accounts) {
            var pgm = controller + '.delete_user2: ' ;
            var passwords, i, no_local_accounts, pubkey, current_cert_user_id, cert_user_ids, contact, text;

            // number local accounts. has other local user accounts been created including guest accounts?
            passwords = JSON.parse(MoneyNetworkHelper.getItem('passwords')) ;
            no_local_accounts = 0 ;
            for (i=0 ; i<passwords.length ; i++) if (passwords[i]) no_local_accounts++ ;

            // has current user other ZeroNet accounts?
            // number of ZeroNet accounts with identical pubkey
            pubkey = MoneyNetworkHelper.getItem('pubkey') ;
            current_cert_user_id = ZeroFrame.site_info.cert_user_id ;
            contacts = moneyNetworkService.get_contacts() ;
            cert_user_ids = [] ;
            for (i=0 ; i<contacts.length ; i++) {
                contact = contacts[i] ;
                if (contact.pubkey != pubkey) continue ;
                if (contact.cert_user_id == current_cert_user_id) continue ;
                cert_user_ids.push(contact.cert_user_id) ;
            }
            console.log(pgm + 'no_local_accounts = ' + no_local_accounts + ', cert_user_ids = ' + cert_user_ids.join(', '));

            // delete account text. multiple ZeroNet accounts and/or multiple local accounts warnings
            text = 'Delete all ZeroNet data for ' + current_cert_user_id + '<br>and all local browser data' ;
            if ((no_local_accounts > 1) && !all_accounts) text += '  for this account' ;
            text += '?' ;
            if (cert_user_ids.length) text +=
                '<br>Note that you also have data stored under ZeroNet certificate ' + cert_user_ids.join(', ') +
                '<br>You may after delete wish to change ZeroNet certificate, log in again and delete the other data too' ;
            if (no_local_accounts > 1) {
                text +=
                    '<br>Local browser data for ' + (no_local_accounts-1) + ' other account' +
                    ((no_local_accounts-1) > 1 ? 's' : '') + ' will' ;
                if (!all_accounts) text += ' not' ;
                text += ' be deleted' ;
            }
            text += '<br>No way back! Are you sure?' ;

            ZeroFrame.cmd("wrapperConfirm", [text, "Delete"], function (confirm) {
                var pgm = controller + '.delete_user2 wrapperConfirm callback 1: ' ;
                if (!confirm) return ;

                moneyNetworkService.get_my_user_hub(function (hub) {
                    var user_path ;

                    user_path = "merged-MoneyNetwork/" + hub + "/data/users/" + ZeroFrame.site_info.auth_address;
                    var my_auth_address = ZeroFrame.site_info.auth_address ;

                    // create callbacks for cleanup operation

                    var step_6_logout_and_redirect = function () {
                        var text, a_path, z_path;
                        // done. log out, notification and redirect
                        moneyNetworkService.client_logout();
                        no_local_accounts--;
                        text = 'Your money network account has been deleted';
                        if (no_local_accounts == 1) text += '<br>There is one other local account in this browser';
                        if (no_local_accounts > 1) text += '<br>There is ' + no_local_accounts + ' other local accounts in this browser';
                        if (cert_user_ids.length == 1) text += '<br>Data on ZeroNet account ' + cert_user_ids[0] + ' has not been deleted';
                        if (cert_user_ids.length > 1) text += '<br>Data on ZeroNet accounts ' + cert_user_ids.join(', ') + ' has not been deleted';
                        ZeroFrame.cmd("wrapperNotification", ['info', text, 10000]);
                        // redirect
                        a_path = '/auth';
                        z_path = "?path=" + a_path;
                        $location.path(a_path);
                        $location.replace();
                        ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Log in", z_path]);
                        $scope.$apply();

                    }; // logout_and_redirect

                    var step_5_cleanup_localstorage = function () {
                        var pgm = controller + '.delete_user2 cleanup_localstorage callback: ' ;
                        // delete all localStorage data for this user.
                        if ((no_local_accounts == 1) || all_accounts) {
                            // only/last local account - simple JS + localStorage overwrite
                            MoneyNetworkHelper.ls_clear();
                        }
                        else {
                            // remove user data
                            MoneyNetworkHelper.removeItem('contacts');
                            MoneyNetworkHelper.removeItem('user_info');
                            MoneyNetworkHelper.removeItem('msg_seq');
                            MoneyNetworkHelper.removeItem('avatar');
                            MoneyNetworkHelper.removeItem('alias');
                            MoneyNetworkHelper.removeItem('setup');
                            // remove account
                            MoneyNetworkHelper.removeItem('pubkey2');
                            MoneyNetworkHelper.removeItem('pubkey');
                            MoneyNetworkHelper.removeItem('prvkey');
                            MoneyNetworkHelper.removeItem('key');
                            // null password
                            user_id = moneyNetworkService.get_user_id() ;
                            passwords[user_id-1] = null ;
                            MoneyNetworkHelper.setItem('passwords', JSON.stringify(passwords)) ;
                            MoneyNetworkHelper.ls_save() ;
                        }
                    }; // cleanup_localstorage


                    // step 4 - publish

                    var step_4_publish = function () {
                        ZeroFrame.cmd("sitePublish", {inner_path: user_path + '/content.json'}, function (res) {
                            var pgm = controller + '.delete_user2.step_4_publish sitePublish: ' ;
                            console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                            step_5_cleanup_localstorage() ;
                            step_6_logout_and_redirect();
                        }) // sitePublish
                    }; // step_4_publish


                    // step 3 - cleanup status.json
                    var step_3_delete_status_json = function () {
                        var pgm = controller + '.delete_user2.step_3_delete_status_json: ' ;
                        var inner_path, debug_seq ;
                        inner_path = user_path + '/' + 'status.json' ;
                        debug_seq = debug_z_api_operation_start(pgm, inner_path, 'fileDelete', show_debug('z_file_delete'));
                        ZeroFrame.cmd("fileDelete", inner_path, function (res) {
                            var pgm = controller + '.delete_user2.step_3_delete_status_json: ' ;
                            debug_z_api_operation_end(debug_seq, res == 'ok' ? 'OK' : 'Failed. error = ' + JSON.stringify(res));
                            console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                            step_4_publish();
                        }) ;
                    }; // step_3_delete_status_json
                    var step_3_update_status_json = function (my_user_seq) {
                        var pgm = controller + '.delete_user2.step_3_update_status_json: ' ;
                        var debug_seq ;
                        z_file_get(pgm, {inner_path: user_path + '/' + 'status.json', required: false}, function (status) {
                            var pgm = controller + '.delete_user2.step_3_update_status_json z_file_get: ' ;
                            var i, json_raw ;
                            if (!status) { step_4_publish() ; return }
                            status = JSON.parse(status) ;
                            if (!status.status) status.status = [] ;
                            for (i=status.status.length-1 ; i >= 0 ; i--) if (status.status[i].user_seq == my_user_seq) status.status.splice(i,1);
                            if (status.status.length == 0) {
                                // no more data. simple data
                                step_3_delete_status_json() ;
                                return ;
                            }
                            json_raw = unescape(encodeURIComponent(JSON.stringify(status, null, "\t")));
                            // debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + user_path + '/' + 'status.json fileWrite') ;
                            debug_seq = debug_z_api_operation_start(pgm, user_path + '/' + 'status.json', 'fileWrite', show_debug('z_file_write')) ;
                            z_file_write(user_path + '/' + 'status.json', btoa(json_raw), function (res) {
                            // ZeroFrame.cmd("fileWrite", [user_path + '/' + 'status.json', btoa(json_raw)], function (res) {
                                var pgm = controller + '.delete_user2.step_3_update_status_json fileWrite: ' ;
                                // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                debug_z_api_operation_end(debug_seq, format_res(res)) ;
                                console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                                step_4_publish() ;
                            }) ; // fileWrite
                        }) ; // z_file_get

                    }; // step_3_update_delete_status_json
                    var step_3_update_or_delete_status_json = function (my_user_seq) {
                        if (all_accounts) step_3_delete_status_json() ;
                        else step_3_update_status_json(my_user_seq) ;
                    }; // step_3_update_or_delete_status_json


                    // step 2 - cleanup data.json

                    var step_2_delete_data_json = function (user_seq) {
                        var pgm = controller + '.delete_user2.step_2_delete_data_json: ' ;
                        var debug_seq ;
                        debug_seq = debug_z_api_operation_start(pgm, user_path + '/' + 'data.json', 'fileDelete', show_debug('z_file_delete'));
                        ZeroFrame.cmd("fileDelete", user_path + '/' + 'data.json', function (res) {
                            var pgm = controller + '.delete_user2.step_2_delete_data_json: ' ;
                            debug_z_api_operation_end(debug_seq, res == 'ok' ? 'OK' : 'Failed. error = ' + JSON.stringify(res));
                            console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                            step_3_update_or_delete_status_json(user_seq);
                        }) ;
                    };
                    var step_2_update_data_json = function (my_user_seq) {
                        var pgm = controller + '.delete_user2.step_2_update_data_json: ' ;
                        var debug_seq ;
                        z_file_get(pgm, {inner_path: user_path + '/' + 'data.json', required: false}, function (data) {
                            var pgm = controller + '.delete_user2.step_2_update_data_json z_file_get callback: ' ;
                            var i, json_raw ;
                            if (!data) { step_3_update_or_delete_status_json(user_seq) ; return }
                            data = JSON.parse(data) ;
                            if (!data.users) data.users = [] ;
                            for (i=data.users.length-1 ; i >= 0 ; i--) if (data.users[i].user_seq == my_user_seq) data.users.splice(i,1);
                            if (!data.search) data.search = [] ;
                            for (i=data.search.length-1 ; i >= 0 ; i--) if (data.search[i].user_seq == my_user_seq) data.search.splice(i,1);
                            if (!data.msg) data.msg = [] ;
                            for (i=data.msg.length-1 ; i >= 0 ; i--) if (data.msg[i].user_seq == my_user_seq) data.msg.splice(i,1);
                            if ((data.users.length == 0) && (data.search.length == 0) && (data.msg.length == 0)) {
                                // no more data. simple data
                                step_2_delete_data_json(my_user_seq) ;
                                return ;
                            }
                            json_raw = unescape(encodeURIComponent(JSON.stringify(data, null, "\t")));
                            // debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + user_path + '/' + 'data.json fileWrite') ;
                            debug_seq = debug_z_api_operation_start(pgm, user_path + '/' + 'data.json', 'fileWrite', show_debug('z_file_write')) ;
                            z_file_write(user_path + '/' + 'data.json', btoa(json_raw), function (res) {
                            // ZeroFrame.cmd("fileWrite", [user_path + '/' + 'data.json', btoa(json_raw)], function (res) {
                                var pgm = controller + '.delete_user2.step_2_update_data_json fileWrite: ' ;
                                // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                debug_z_api_operation_end(debug_seq, format_res(res)) ;
                                console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                                step_3_update_or_delete_status_json(my_user_seq) ;
                            }) ; // fileWrite callback
                        }) ; // z_file_get callback

                    }; // step_2_update_delete_data_json
                    var step_2_update_or_delete_data_json = function (my_user_seq) {
                        if (all_accounts) step_2_delete_data_json(my_user_seq) ;
                        else step_2_update_data_json(my_user_seq) ;

                    }; // update_or_delete_data_json_2


                    // step 1 - cleanup optional files

                    // 1) delete all downloaded optional files from other users
                    // 2) overwrite all uploaded optional files with empty jsons
                    var step_1_cleanup_optional_files = function (my_user_seq) {
                        ZeroFrame.cmd("optionalFileList", { limit: 99999}, function (list) {
                            var pgm = controller + '.delete_user2.step_1_cleanup_optional_files: ';
                            var i, file_auth_address, file_user_seq, inner_path, empty_json, empty_json_raw, user_path,
                                debug_seq;
                            // console.log(pgm + 'list = ' + JSON.stringify(list)) ;
                            empty_json = {};
                            empty_json_raw = unescape(encodeURIComponent(JSON.stringify(empty_json, null, "\t")));
                            for (i = 0; i < list.length; i++) {
                                inner_path = list[i].inner_path;
                                file_auth_address = inner_path.split('/')[2];
                                file_user_seq = parseInt(inner_path.split('-')[2]);
                                if ((file_auth_address == my_auth_address) && ((file_user_seq == my_user_seq) || all_accounts)) {
                                    // overwrite uploaded optional file with empty json.
                                    // empty json will be distributed to other ZeroNet users before physical delete
                                    // debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + inner_path + ' fileWrite') ;
                                    debug_seq = debug_z_api_operation_start(pgm, inner_path, 'fileWrite', show_debug('z_file_write')) ;
                                    z_file_write(inner_path, btoa(empty_json_raw), function (res) {
                                    // ZeroFrame.cmd("fileWrite", [inner_path, btoa(empty_json_raw)], function (res) {
                                        // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                        debug_z_api_operation_end(debug_seq, format_res(res)) ;
                                    });
                                }
                                else if (file_auth_address == my_auth_address) {
                                    // keep uploaded optional file. from this ZeroNet account but from an other local account
                                }
                                else {
                                    // delete downloaded optional file from user zeronet accounts. maybe already done
                                    ZeroFrame.cmd("optionalFileDelete", {inner_path: inner_path}, function () {
                                    });
                                }
                            } // for i

                            step_2_update_or_delete_data_json(my_user_seq) ;
                        }) ;
                    } ; // step_1_cleanup_optional_files


                    // delete account process:
                    // 1) delete all downloaded optional files from other users
                    // 2) overwrite all uploaded optional files with empty jsons
                    // 3) delete user files from zeroNet (data.json, status.json, avatar.jpg, avatar.png)
                    // 4) delete data from localStorage
                    // 5) delete user from sessionStorage
                    // 6) log out, notification and redirect
                    // run all callbacks for cleanup operation
                    if (all_accounts) {
                        (function() {
                            var debug_seq1, debug_seq2 ;
                            debug_seq1 = debug_z_api_operation_start(pgm, user_path + "/avatar.jpg", 'fileDelete', show_debug('z_file_delete'));
                            ZeroFrame.cmd("fileDelete", user_path + "/avatar.jpg", function (res) {
                                debug_z_api_operation_end(debug_seq1, res == 'ok' ? 'OK' : 'Failed. error = ' + JSON.stringify(res));
                            });
                            debug_seq2 = debug_z_api_operation_start(pgm, user_path + "/avatar.png", 'fileDelete', show_debug('z_file_delete'));
                            ZeroFrame.cmd("fileDelete", user_path + "/avatar.png", function (res) {
                                debug_z_api_operation_end(debug_seq2, res == 'ok' ? 'OK' : 'Failed. error = ' + JSON.stringify(res));
                            });
                        })() ;
                    }
                    moneyNetworkService.get_user_seq(function (my_user_seq) {
                        step_1_cleanup_optional_files(my_user_seq);
                    }) ;

                }) ; // get_my_user_hub callback 2

            }) ; // wrapperConfirm callback 1

        }; // delete_user2

        // export/import options
        self.export_ls = true ; // localStorage data always included in export
        self.export_z = true ; // export user files? data.json, status.json and any uploaded avatar
        self.export_chat = false ; // export uploaded optional files?
        self.export_encrypt = false ; // create a password protected export file?
        self.export_password = null ;
        self.export_confirm_password = null ;
        self.export_import_test = null ; // testcase: import file = export file
        self.export_info = {} ; // object with export informations

        // get export info. show in export options section
        (function() {
            var pgm = controller + ': ' ;
            var ls_size, passwords, i, no_users, user_path, debug_seq ;
            // localStorage info
            ls_size = JSON.stringify(MoneyNetworkHelper.ls_get()).length ;
            passwords = JSON.parse(MoneyNetworkHelper.getItem('passwords')) ;
            no_users = 0 ;
            for (i=0 ; i<passwords.length ; i++) if (passwords[i]) no_users++ ;
            self.export_info.ls = no_users + ' account' + (no_users > 1 ? 's' : '') + ', ' + ls_size + ' bytes' ;
            // zeroNet info
            moneyNetworkService.get_my_user_hub(function (hub) {
                var pgm = controller + ' get_my_user_hub callback 1: ' ;
                user_path = "merged-MoneyNetwork/" + hub + "/data/users/" + ZeroFrame.site_info.auth_address;
                z_file_get(pgm, {inner_path: user_path + '/content.json', required: false}, function (content) {
                    var pgm = controller + ' z_file_get callback 2: ' ;
                    var filename, z_files, z_bytes, chat_files, chat_bytes ;
                    if (!content) return ;
                    content = JSON.parse(content) ;
                    z_files = 0 ; z_bytes = 0 ;
                    // user files (data.json, status.json and avatar)
                    if (content.files) for (filename in content.files) {
                        z_files++ ;
                        z_bytes += content.files[filename].size ;
                    }
                    // optional files / public chat
                    chat_files = 0 ; chat_bytes = 0 ;
                    self.export_info.z = z_files + ' file' + (z_files > 1 ? 's' : '') + ', ' + z_bytes + ' bytes' ;
                    if (content.files_optional) for (filename in content.files_optional) {
                        if (content.files_optional[filename].sizer <= 2) continue ;
                        chat_files++ ;
                        chat_bytes += content.files_optional[filename].size ;
                    }
                    self.export_info.chat = chat_files + ' file' + (chat_files > 1 ? 's' : '') + ', ' + chat_bytes + ' bytes' ;
                    // console.log(controller + ': self.export_info = ' + JSON.stringify(self.export_info)) ;
                }) ; // z_file_get callback 2

            }) ; // get_my_user_hub callback 1

        })() ;

        // export to txt file
        self.export = function() {
            var pgm = controller + '.export: ' ;
            var filename, now, data, user_path, step_1_get_password, step_2_read_content_json, step_3_read_zeronet_file,
                step_3_image_to_base64, step_4_get_ls, step_5_encrypt_data, step_6_export;

            // check encrypt password
            if (self.export_encrypt) {
                if (!self.export_password) {
                    ZeroFrame.cmd("wrapperNotification", ['error', 'export file password is missing', 5000]);
                    return ;
                }
                if (!self.export_confirm_password || (self.export_password != self.export_confirm_password)) {
                    ZeroFrame.cmd("wrapperNotification", ['error', 'export file password is not confirmed', 5000]);
                    return ;
                }
            }

            now = new Date().getTime() ;
            filename = 'moneynetwork-' + date(now, 'yyyyMMdd-HHmmss') + '.txt' ;
            data = {
                timestamp: now,
                options: {
                    ls: true,
                    z: self.export_z,
                    chat: self.export_chat,
                    encrypt: self.export_encrypt
                }
            };

            // ready for export. callback sequence:
            // 1 - enter password if user has selected a password protected export file
            // 2 - read content.json - get list of files and files_optional
            // 3 - loop for each file and add to data
            // 4-6 - add localStorage, encrypt and export
            moneyNetworkService.get_my_user_hub(function (hub) {

                user_path = "merged-MoneyNetwork/" + hub + "/data/users/" + ZeroFrame.site_info.auth_address;

                // callbacks:
                step_6_export = function () {
                    var data_str, data_str64, blob, msg ;
                    data_str = JSON.stringify(data) ;
                    self.export_import_test = data_str ;
                    // console.log(pgm + 'ls_str = ' + ls_str) ;
                    data_str64 = MoneyNetworkHelper.utoa(data_str) ;
                    blob = new Blob([data_str64], {type: "text/plain;charset=utf-8"});
                    // console.log(pgm + 'filename = ' + filename) ;
                    saveAs(blob, filename);
                    msg = 'Money Network data:' ;
                    msg += '<br>- localStorage (local browser data)' ;
                    if (self.export_z) msg += '<br>- ZeroNet user files data.json, status.json and avatar' ;
                    if (self.export_chat) msg += '<br>- ZeroNet optional files (public chat)' ;
                    msg += '<br>exported to ' ;
                    if (self.export_encrypt) msg += 'encrypted ' ;
                    msg += ' file ' + filename ;
                    if (self.export_encrypt) msg += '<br>Please remember export file password. Required for import' ;
                    ZeroFrame.cmd("wrapperNotification", ['done', msg]);
                }; // step_6_export

                step_5_encrypt_data = function () {
                    var options, timestamp, password, data_str, enc_data_str, key ;
                    if (!data.options.encrypt) return step_6_export() ;
                    password = data.password ;
                    delete data.password ;
                    data_str = JSON.stringify(data) ;
                    enc_data_str = MoneyNetworkHelper.encrypt(data_str, password);
                    for (key in data) delete data[key] ;
                    data.enc_data = enc_data_str ;
                    step_6_export() ;
                }; // step_5_encrypt_data

                step_4_get_ls = function() {
                    data.ls = MoneyNetworkHelper.ls_get() ;
                    step_5_encrypt_data() ;
                }; // step_4_get_ls

                // http://stackoverflow.com/questions/6150289/how-to-convert-image-into-base64-string-using-javascript
                step_3_image_to_base64 = function (src, outputFormat, callback) {
                    var img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.onload = function() {
                        var canvas = document.createElement('CANVAS');
                        var ctx = canvas.getContext('2d');
                        var dataURL;
                        canvas.height = this.height;
                        canvas.width = this.width;
                        ctx.drawImage(this, 0, 0);
                        dataURL = canvas.toDataURL(outputFormat);
                        callback(dataURL);
                    };
                    img.src = src;
                    if (img.complete || img.complete === undefined) {
                        img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
                        img.src = src;
                    }
                };

                step_3_read_zeronet_file = function () {
                    var pgm = controller + '.export.3_read_zeronet_file: ' ;
                    var filename, key, image_format, debug_seq ;

                    // find next file to download
                    for (key in data.z_files) {
                        if (data.z_files[key] == false) {
                            filename = key ;
                            break ;
                        }
                    }
                    if (!filename) return step_4_get_ls() ; // done with zeronet files. continue with localStorage

                    if (['avatar.jpg', 'avatar.png'].indexOf(filename) != -1) {
                        // image file. fileGet cannot be used.
                        image_format = filename == 'avatar.jpg' ? 'image/jpg' : 'image/png' ;
                        step_3_image_to_base64(user_path + '/' + filename, image_format, function(content) {
                            data.z_files[filename] = content ;
                            // console.log(pgm + 'filename = ' + filename + ', content = ' + content) ;
                            step_3_read_zeronet_file() ;
                        })
                    }
                    else {
                        // json file. normal fileGet
                        z_file_get(pgm, {inner_path: user_path + '/' + filename, required: false}, function (content) {
                            var error ;
                            if (!content) {
                                error = 'Cannot export zeronet data. file ' + filename + ' was not found' ;
                                console.log(pgm + error) ;
                                ZeroFrame.cmd("wrapperNotification", ['error', error]);
                                return ;
                            }
                            data.z_files[filename] = JSON.parse(content) ;
                            step_3_read_zeronet_file() ;
                        }) ; // z_file_get cb
                    }
                }; // step_3_read_zeronet_file

                step_2_read_content_json = function () {
                    var pgm = controller + '.export.step_2_read_content_json: ' ;
                    var debug_seq ;
                    moneyNetworkService.z_get_file(pgm, {inner_path: user_path + '/' + 'content.json', required: false}, function (content) {
                        var pgm = controller + '.export.step_2_read_content_json z_file_get callback: ' ;
                        var error, filename ;
                        if (!content) {
                            error = 'Cannot export zeronet data. content.json file was not found' ;
                            console.log(pgm + error) ;
                            ZeroFrame.cmd("wrapperNotification", ['error', error]);
                            return ;
                        }
                        content = JSON.parse(content) ;
                        data.z_files = {} ;
                        if (data.options.z) {
                            // export user files (data.json. status.json and optional avatar image)
                            for (filename in content.files) {
                                data.z_files[filename] = false ;
                            }
                        }
                        if (data.options.chat) {
                            // export user optional files (chat files)
                            for (filename in content.files_optional) {
                                if (content.files_optional[filename].size <= 2) continue ;
                                data.z_files[filename] = false ;
                            }
                        }
                        // console.log(pgm + 'data.z_files = ' + JSON.stringify(data.z_files)) ;
                        step_3_read_zeronet_file() ;
                    }) ; // z_file_get cb
                }; // step_2_read_content_json cb

                step_1_get_password = function () {
                    if (data.options.encrypt) {
                        data.password = self.export_password ;
                        self.export_password = null ;
                        self.export_confirm_password = null ;
                    }
                    if (data.options.z || data.options.chat) step_2_read_content_json() ;
                    else step_4_get_ls() ;
                }; // step_1_get_password

                // start export callback sequence
                step_1_get_password();

            }) ; // get_my_user_hub callback 1

        }; // export


        // import from txt file
        self.import = function(event) {
            var pgm = controller + '.import_ls: ' ;
            var files, file, step_1_read_file, step_2_decrypt_data, step_3_confirm_import, step_4_write_z_file,
                step_5_publish, step_6_ls_write, step_7_notification_and_redirect, user_path ;
            // console.log(pgm + 'event = ' + JSON.stringify(event));
            files = event.target.files;
            file = files[0] ;

            // ready for import. callback sequence:
            // 1 - FileReader. read file, parse json and check json structure
            // 2 - decrypt data if encrypted
            // 3 - confirm import
            // 4 - write ZeroNet files
            // 5 - publish
            // 6 - overwrite localStorage
            // 7 - notification, log out and redirect
            user_path = "data/users/" + ZeroFrame.site_info.auth_address;

            // callbacks:

            step_7_notification_and_redirect = function () {
                var pgm = controller + '.import.step_7_notification_and_redirect: ' ;
                var text, a_path, z_path ;
                text = 'MoneyNetwork data has been imported from file. Please log in';
                ZeroFrame.cmd("wrapperNotification", ['info', text, 10000]);
                // redirect
                a_path = '/auth';
                z_path = "?path=" + a_path;
                console.log(pgm + 'redirect') ;
                $location.path(a_path);
                $location.replace();
                ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Log in", z_path]);
                $scope.$apply();
            };

            step_6_ls_write = function (data) {
                var pgm = controller + '.import.step_6_ls_write: ' ;
                var ls, key ;
                console.log(pgm + 'client_logout') ;
                moneyNetworkService.client_logout() ;
                ls = MoneyNetworkHelper.ls_get() ;
                for (key in ls) delete ls[key] ;
                for (key in data.ls) ls[key] = data.ls[key] ;
                MoneyNetworkHelper.ls_save() ;
                console.log(pgm + 'ls overwritten and saved') ;
                step_7_notification_and_redirect() ;
            }; // step_6_ls_write


            step_5_publish = function (data) {
                var pgm = controller + '.import.step_5_publish: ' ;
                ZeroFrame.cmd("sitePublish", {inner_path: user_path + '/content.json'}, function (res) {
                    if (res == "ok") return step_6_ls_write(data) ;

                    error = 'Import error. Publish failed. error = ' + res ;
                    console.log(pgm + error)

                    ZeroFrame.cmd("wrapperConfirm", [error + '<br>Continue?', "Yes"], function (confirm) {
                        if (!confirm) return ;
                        step_6_ls_write(data) ;
                    }) ;

                });
            };

            step_4_write_z_file = function (data) {
                var pgm = controller + '.import.step_4_write_z_file: ' ;
                var key, filename, json_raw, image_base64uri, post_data, debug_seq ;
                for (key in data.z_files) {
                    filename = key ;
                    break ;
                }
                if (!filename) return step_5_publish(data) ;

                if (['avatar.jpg','avatar.png'].indexOf(filename) != -1) {
                    // image (avatar)
                    image_base64uri = data.z_files[filename] ;
                    post_data = image_base64uri != null ? image_base64uri.replace(/.*?,/, "") : void 0;
                }
                else {
                    // json (data.json or status.json)
                    json_raw = unescape(encodeURIComponent(JSON.stringify(data.z_files[filename], null, "\t")));
                    post_data = btoa(json_raw) ;
                }
                delete data.z_files[filename] ;

                // debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + user_path + '/' + filename + ' fileWrite') ;
                debug_seq = debug_z_api_operation_start(pgm, user_path + '/' + filename, 'fileWrite', show_debug('z_file_write')) ;
                z_file_write(user_path + '/' + filename, post_data, function (res) {
                // ZeroFrame.cmd("fileWrite", [user_path + '/' + filename, post_data], function (res) {
                    // console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                    var error ;
                    // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                    debug_z_api_operation_end(debug_seq, format_res(res)) ;
                    if (res == "ok") {
                        console.log(pgm + 'uploaded ZeroNet file ' + filename) ;
                        return step_4_write_z_file(data)
                    }
                    //
                    error = 'Import error. Failed to write ' + filename + '. error = ' + res ;
                    console.log(pgm + error)

                    ZeroFrame.cmd("wrapperConfirm", [error + '<br>Continue?', "Yes"], function (confirm) {
                        if (!confirm) return ;
                        step_4_write_z_file(data) ;
                    }) ;

                }); // fileWrite

            }; // step_4_write_z_file

            step_3_confirm_import = function (data) {
                var pgm = controller + '.import.step_3_confirm_import: ' ;
                var msg, filename, no_z_files, no_chat_files ;
                no_z_files = 0 ;
                no_chat_files = 0 ;
                if (data.z_files) {
                    for (filename in data.z_files) {
                        if (filename.match(/-chat\.json$/)) no_chat_files++ ;
                        else no_z_files++ ;
                    }
                }
                else data.z_files = {} ;
                msg = 'Money Network export file looks OK:' ;
                msg += '<br>- localStorage data from ' + date(data.timestamp, 'short') ;
                if (data.options.z) msg += '<br>- ZeroNet user files data.json, status.json and avatar (' + no_z_files + ' files)' ;
                if (data.options.chat) msg += '<br>- ZeroNet optional files (public chat) (' + no_chat_files + ' files)' ;
                msg += '<br>Import will overwrite all your Money Network data!' ;
                msg += '<br>Continue? No way back!' ;

                ZeroFrame.cmd("wrapperConfirm", [msg, "Import"], function (confirm) {
                    if (!confirm) return ;
                    step_4_write_z_file(data) ;
                }) ;

            }; // step_3_confirm_import

            function is_data_ok (data) {
                var error ;
                if (!data.timestamp) error = 'Timestamp was not found in file' ;
                else if (!data.options) error = 'Export options were not found in file' ;
                else if (!data.options.hasOwnProperty('ls')) error = 'Export options.ls was not found' ;
                else if (!data.options.hasOwnProperty('z')) error = 'Export options.z was not found' ;
                else if (!data.options.hasOwnProperty('chat')) error = 'Export options.chat was not found' ;
                else if (!data.options.hasOwnProperty('encrypt')) error = 'Export options.encrypt was not found' ;
                else {
                    if (!data.ls) error = 'ls (localStorage) was not found' ;
                    else if ((data.options.z || data.options.chat) && !data.z_files) error = 'z_files (ZeroNet files) were not found';
                }
                if (error) {
                    error = 'Import failed. ' + error ;
                    console.log(pgm + error) ;
                    ZeroFrame.cmd("wrapperNotification", ['error', error]);
                    return false ;
                }
                else return true ;
            } // is_data_ok

            step_2_decrypt_data = function (data) {
                var pgm = controller + '.import.step_2_decrypt_data: ' ;
                var enc_data_str, data_str, data2, error ;

                // request password
                ZeroFrame.cmd("wrapperPrompt", ["Import a password protected file<br>Enter password"], function (password) {
                    if (!password) {
                        ZeroFrame.cmd("wrapperNotification", ['info', 'Import cancelled. No password', 5000]);
                        return;
                    }
                    enc_data_str = data.enc_data ;
                    data_str = MoneyNetworkHelper.decrypt(enc_data_str, password) ;
                    data2 = JSON.parse(data_str) ;
                    if (!is_data_ok(data2)) return ;
                    step_3_confirm_import(data2) ;
                }); // wrapperPrompt

            }; // step_2_decrypt_data


            step_1_read_file = function (file) {
                var pgm = controller + '.import.step_1_read_file: ' ;
                var reader, data_str64, data_str, data, error ;
                reader = new FileReader();
                reader.onload = function () {
                    data_str64 = reader.result;
                    data_str = MoneyNetworkHelper.atou(data_str64) ;
                    // console.log(pgm + 'ls_str = ' + ls_str) ;
                    if (self.export_import_test) {
                        if (data_str == self.export_import_test) console.log(pgm + 'Test OK. import == export') ;
                        else console.log(pgm + 'Test failed. import != export') ;
                    }
                    data = JSON.parse (data_str) ;
                    // check json structure
                    if (data.enc_data) return step_2_decrypt_data(data) ; // encrypted. json check in next step
                    else if (is_data_ok(data)) step_3_confirm_import(data) ;

                }; // onload
                try {
                    reader.readAsText(file);
                }
                catch (err) {
                    error = 'import failed: ' + err.message ;
                    console.log(pgm + error) ;
                    ZeroFrame.cmd("wrapperNotification", ['error', error]);
                    return ;
                }

            }; // step_1_read_file

            step_1_read_file(file) ;


            //MoneyNetworkHelper.ls_import(file, function() {
            //    var text ;
            //    // localStorage data changed.
            //    moneyNetworkService.client_logout();
            //    //
            //    text = 'LocalStorage data has been imported from file. Please log in';
            //    ZeroFrame.cmd("wrapperNotification", ['info', text, 10000]);
            //    // redirect
            //    a_path = '/auth';
            //    z_path = "?path=" + a_path;
            //    $location.path(a_path);
            //    $location.replace();
            //    ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Log in", z_path]);
            //    $scope.$apply();
            //});

        }; // import

        self.change_password = { show: false};
        self.show_passwords_fields = function (show) {
            self.change_password.show = show ;
        };
        self.change_password.submit = function () {
            var pgm = controller + '.change_password.submit: ' ;
            var error ;
            //console.log(pgm + 'old password = ' + self.change_password.old_password +
            //    ', new password = ' + self.change_password.new_password +
            //    ', confirm new password = ' + self.change_password.confirm_new_password) ;
            if (self.change_password.new_password != self.change_password.confirm_new_password) {
                error = 'Password not changed. New password and confirm password does not match' ;
                ZeroFrame.cmd("wrapperNotification", ['error', error, 10000]);
                return ;
            }
            if (self.change_password.old_password == self.change_password.new_password) {
                error = 'Password not changed. Old password and new password are identical' ;
                ZeroFrame.cmd("wrapperNotification", ['error', error, 10000]);
                return ;
            }
            error = MoneyNetworkHelper.change_password(self.change_password.old_password, self.change_password.new_password) ;
            if (error) {
                error = 'Password not changed. ' + error ;
                ZeroFrame.cmd("wrapperNotification", ['error', error, 10000]);
                return ;
            }
            ZeroFrame.cmd("wrapperNotification", ['done', 'Password was changed. Please remember your new password', 10000]);
            delete self.change_password.old_password ;
            delete self.change_password.new_password ;
            delete self.change_password.confirm_new_password ;
            self.show_passwords_fields(false) ;
        };

        // show/edit list of reactions
        self.emoji_folders = moneyNetworkService.get_emoji_folders() ;
        self.user_reactions = moneyNetworkService.get_user_reactions() ;
        self.reaction_list = null ;
        self.editing_reactions = false ; // open/close edit reactions area
        self.new_reaction = null ;
        self.full_emoji_support = true ; // true: only emojis supported by all 8 emoji providers + available online at .....

        // todo: edit reactions on a copy of self.setup.reactions. save to self.setup.reactions without src and $$hashKey
        self.edit_reactions = function (edit) {
            var i ;
            if (edit) {
                // open edit reactions area
                if (!self.setup.reactions) self.setup.reactions = JSON.parse(JSON.stringify(moneyNetworkService.get_standard_reactions())) ;
                self.user_reactions = JSON.parse(JSON.stringify(self.setup.reactions)) ; // work copy
                if (!self.reaction_list) self.reaction_list = moneyNetworkService.get_reaction_list(self.full_emoji_support) ;
            }
            self.editing_reactions = edit ;
            if (!edit) {
                // save/done. close reaction area
                self.setup.reactions.splice(0,self.setup.reactions.length) ;
                for (i=0 ; i<self.user_reactions.length ; i++) {
                    self.setup.reactions.push({
                        unicode: self.user_reactions[i].unicode,
                        title: self.user_reactions[i].title
                    }) ;
                }
                moneyNetworkService.save_user_setup() ;
                MoneyNetworkHelper.load_user_setup() ;
            }
        };
        function find_reaction (reaction) {
            var i ;
            for (i=0 ; i<self.user_reactions.length ; i++) if (self.user_reactions[i]["$$hashKey"] == reaction["$$hashKey"]) return i ;
        }
        self.move_reaction_up = function (reaction) {
            var index ;
            index = find_reaction(reaction) ;
            self.user_reactions.splice(index,1) ;
            // console.log('reaction = ' + JSON.stringify(reaction) + ', index = ' + index) ;
            index = index - 1 ;
            if (index < 0) self.user_reactions.push(reaction) ;
            else self.user_reactions.splice(index, 0, reaction) ;
        };
        self.move_reaction_down = function (reaction) {
            var index ;
            index = find_reaction(reaction) ;
            self.user_reactions.splice(index,1) ;
            // console.log('reaction = ' + JSON.stringify(reaction) + ', index = ' + index) ;
            index = index + 1 ;
            if (index > self.user_reactions.length) self.user_reactions.unshift(reaction) ;
            else self.user_reactions.splice(index, 0, reaction) ;
        };
        self.delete_reaction = function (reaction) {
            var index ;
            index = find_reaction(reaction) ;
            self.user_reactions.splice(index,1) ;
        };
        self.toogle_full_emoji_support = function() {
            self.reaction_list = moneyNetworkService.get_reaction_list(self.full_emoji_support) ;
        };
        self.insert_new_reaction = function () {
            var pgm = controller + '.insert_new_reaction: ' ;
            var seq, code, name, emoji_folder ;
            if (!self.new_reaction) return ;
            seq = parseInt(self.new_reaction.split(':')[0]) ;
            code = emoji_names[seq-1].code ;
            name = emoji_names[seq-1].name ;
            // console.log(pgm + 'insert_new_reaction. seq = ' + seq + ', code = ' + code + ', name = ' + name) ;
            self.user_reactions.push({unicode: code, title: name}) ;
            // console.log(pgm + 'self.user_reactions = ' + JSON.stringify(self.user_reactions)) ;
            self.new_reaction = null ;
            moneyNetworkService.init_emojis_short_list() ; // add emoji folder
        }; // insert_new_reaction

        // end UserCtrl
    }])

;
