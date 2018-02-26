angular.module('MoneyNetwork')
    
    .controller('UserCtrl', ['$scope', '$rootScope', '$timeout', 'MoneyNetworkService', '$location', 'dateFilter', '$sce', '$window',
                     function($scope, $rootScope, $timeout, moneyNetworkService, $location, date, $sce, $window)
    {
        var self = this;
        var controller = 'UserCtrl';
        if (!MoneyNetworkHelper.getItem('userid')) return ; // not logged in - skip initialization of controller
        console.log(controller + ' loaded');

        function get_merged_type() {
            return MoneyNetworkAPILib.get_merged_type() ;
        }

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
            return (!res || res.error) ? 'Failed. error = ' + JSON.stringify(res) : 'OK. ' +  + res.length + ' rows returned' ;
        }

        // insert <br> into long notifications. For example JSON.stringify
        function z_wrapper_notification (array) {
            moneyNetworkService.z_wrapper_notification(array) ;
        } // z_wrapper_notification

        // file get/write wrappers
        function z_file_get (pgm, options, cb) {
            moneyNetworkService.z_file_get(pgm, options, cb) ;
        }
        function z_file_write (pgm, inner_path, content, cb) {
            MoneyNetworkAPILib.z_file_write(pgm, inner_path, content, {}, cb) ;
        }

        self.user_info = moneyNetworkService.get_user_info() ; // array with tags and values from localStorage
        self.tags = moneyNetworkService.get_tags() ; // typeahead autocomplete functionality
        self.privacy_options = moneyNetworkService.get_privacy_options() ; // select options with privacy settings for user info
        self.show_privacy_title = moneyNetworkService.get_show_privacy_title() ; // checkbox - display column with privacy descriptions?

        // search for new ZeroNet contacts and add avatars for new contacts
        var contacts = moneyNetworkService.get_contacts(); // array with contacts from localStorage
        self.show_welcome_msg = (!contacts || !contacts.length) ;
        self.zeronet_search_contacts = function () {
            moneyNetworkService.z_contact_search(function(){
                if (self.show_welcome_msg && contacts.length) {
                    self.show_welcome_msg = false ;
                    $scope.$apply() ;
                }
            }, null, null);
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
                z_wrapper_notification(["error", "Sorry. Only png, jpg and jpeg images can be used as avatar", 5000]);
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
            z_file_write(pgm, user_path + "/avatar." + ext, image_base64, function (res) {
            //ZeroFrame.cmd("fileWrite", [user_path + "/avatar." + ext, image_base64], function(res) {
                var pgm = controller + '.handleAvatarUpload fileWrite callback: ';
                // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                debug_z_api_operation_end(debug_seq3, format_res(res)) ;
                // console.log(pgm + 'res = ' + JSON.stringify(res));
                self.avatar.src = user_path + "/avatar." + ext + '?rev=' + MoneyNetworkHelper.generate_random_password(10);
                $scope.$apply() ;
                moneyNetworkService.zeronet_site_publish({reason: user_path + "/avatar." + ext}) ;
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
                z_wrapper_notification(["info", "Edit alias. Press ENTER to save. Press ESC to cancel", 5000]);
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
                z_wrapper_notification(['error', 'No last outbox message was found. cannot create message lost in cyberspace testcase', 5000]) ;
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
            z_wrapper_notification(['info', 'created new outbox msg ' + local_msg_seq + '. Not sent, not on ZeroNet, no feedback info and marked as cleanup', 5000]);
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
                z_wrapper_notification(['info', 'Preferred encryption was changed.<br>Save user information or send a new message to publish change to peers', 5000]);
            }
            MoneyNetworkAPILib.config({debug: self.setup.debug && self.setup.debug.money_network_api}) ;

            copy_setup() ;
            moneyNetworkService.save_user_setup() ;
            MoneyNetworkHelper.load_user_setup(self.setup) ;
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
            try {
                passwords = JSON.parse(MoneyNetworkHelper.getItem('passwords')) ;
            }
            catch (e) {
                console.log(pgm + 'error. passwords was invalid. error = ' + e.message) ;
                passwords = [] ;
            }
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

                moneyNetworkService.get_my_user_hub(function (my_user_data_hub, other_user_hub, other_user_hub_title) {
                    var user_path ;

                    user_path = "merged-" + get_merged_type() + "/" + my_user_data_hub + "/data/users/" + ZeroFrame.site_info.auth_address;
                    var my_auth_address = ZeroFrame.site_info.auth_address ;

                    // create callbacks for cleanup operation

                    var step_6_logout_and_redirect = function () {
                        var pgm = controller + '.delete_user2.step_6_logout_and_redirect: ' ;
                        var text, a_path, z_path;
                        // done. log out, notification and redirect
                        moneyNetworkService.client_logout();
                        no_local_accounts--;
                        text = 'Your money network account has been deleted';
                        if (no_local_accounts == 1) text += '<br>There is one other local account in this browser';
                        if (no_local_accounts > 1) text += '<br>There is ' + no_local_accounts + ' other local accounts in this browser';
                        if (cert_user_ids.length == 1) text += '<br>Data on ZeroNet account ' + cert_user_ids[0] + ' has not been deleted';
                        if (cert_user_ids.length > 1) text += '<br>Data on ZeroNet accounts ' + cert_user_ids.join(', ') + ' has not been deleted';
                        z_wrapper_notification( ['info', text, 10000]);
                        // redirect
                        a_path = '/auth';
                        z_path = "?path=" + a_path;
                        $location.path(a_path);
                        $location.replace();
                        ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Log in", z_path]);
                        $scope.$apply();

                    }; // step_6_logout_and_redirect

                    var step_5_cleanup_localstorage = function () {
                        var pgm = controller + '.delete_user2.step_5_cleanup_localstorage: ' ;
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
                    }; // step_5_cleanup_localstorage


                    // step 4 - publish

                    var step_4_publish = function () {
                        var pgm = controller + '.delete_user2.step_4_publish: ' ;
                        // MoneyNetworkAPILib.z_site_publish({inner_path: user_path + '/content.json', reason: 'delete_user2'}, function (res) {
                        moneyNetworkService.zeronet_site_publish({inner_path: user_path + '/content.json', reason: 'delete_user2'}, function (res) {
                            var pgm = controller + '.delete_user2.step_4_publish sitePublish: ' ;
                            console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                            step_5_cleanup_localstorage() ;
                            step_6_logout_and_redirect();
                        }); // sitePublish
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
                        var debug_seq, inner_path ;
                        inner_path = user_path + '/' + 'status.json' ;
                        z_file_get(pgm, {inner_path: inner_path, required: false}, function (status) {
                            var pgm = controller + '.delete_user2.step_3_update_status_json z_file_get: ' ;
                            var i, json_raw ;
                            if (!status) return step_4_publish() ;
                            try {
                                status = JSON.parse(status) ;
                            }
                            catch (e) {
                                console.log(pgm + 'error. ' + inner_path + ' was invalid. error = ' + e.message) ;
                                return step_4_publish() ;
                            }
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
                            z_file_write(pgm, user_path + '/' + 'status.json', btoa(json_raw), function (res) {
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
                        var debug_seq, inner_path ;
                        inner_path = user_path + '/' + 'data.json' ;
                        z_file_get(pgm, {inner_path: inner_path, required: false}, function (data) {
                            var pgm = controller + '.delete_user2.step_2_update_data_json z_file_get callback: ' ;
                            var i, json_raw ;
                            if (!data) return step_3_update_or_delete_status_json(my_user_seq) ;
                            try {
                                data = JSON.parse(data) ;
                            }
                            catch (e) {
                                console.log(pgm + 'error. ' + inner_path + ' was invalid. error = ' + e.message) ;
                                return step_3_update_or_delete_status_json(my_user_seq) ;
                            }
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
                            z_file_write(pgm, user_path + '/' + 'data.json', btoa(json_raw), function (res) {
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
                                    z_file_write(pgm, inner_path, btoa(empty_json_raw), function (res) {
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
        self.export_chat = true ; // export uploaded optional files?
        self.export_wallets = true ; // export connected moneynetwork wallets?
        self.export_encrypt = false ; // create a password protected export file?
        self.export_password = null ;
        self.export_confirm_password = null ;
        self.export_import_test = null ; // testcase: import file = export file
        self.export_info = {} ; // object with export information
        self.wallets = [] ; // show info about wallets in export.

        function red (html) {
            return '<span style="color:red;">' + html + '</span>' ;
        }
        var ls_sessions = moneyNetworkService.ls_get_sessions() ;
        var SESSION_INFO_KEY = moneyNetworkService.get_session_info_key() ;

        function update_wallet_export_info () {
            var no_ok, no_error, i, msg ;
            // count no OK wallets. count no wallet with errors
            no_ok = 0 ; no_error = 0 ;
            for (i=0 ; i<self.wallets.length ; i++) {
                if (self.wallets[i].ping_error) no_error++ ;
                else no_ok++ ;
            }
            msg = [] ;
            if (no_ok) msg.push(no_ok + ' connected wallet' + (no_ok == 1 ? '' : 's')) ;
            if (no_error) msg.push(red(no_error + ' not connected wallet' + (no_error == 1 ? '' : 's'))) ;
            self.export_info.wallets = $sce.trustAsHtml(msg.join(', ')) ;
        } // update_wallet_export_info

        self.open_wallet = function (wallet) {
            var pgm = controller + '.open_wallet: ' ;
            var refresh_job, now, submit_refresh_job ;
            now = new Date().getTime() ;
            moneyNetworkService.open_window(pgm, wallet.wallet_url);

            // wait for wallet session and incoming get_password and ping requests - wait max 30 seconds
            // update self.export_info.wallets after incoming request from new wallet session
            refresh_job = function(k) {
                var sessionid2, session_info2 ;
                for (sessionid2 in ls_sessions) {
                    session_info2 = ls_sessions[sessionid2][SESSION_INFO_KEY] ;
                    if (session_info2.url != wallet.wallet_url) continue ;
                    if (!session_info2.last_request_at || (session_info2.last_request_at < now)) continue ;
                    console.log(pgm + 'received ping from ' + sessionid2 + '. refresh wallets now') ;
                    wallet.ping_error = null ;
                    update_wallet_export_info() ;
                    $rootScope.$apply() ;
                    // get session info. used in export/import
                    MoneyNetworkAPILib.get_session(sessionid2, function (session_info) {
                        wallet.session_info = session_info ;
                    }) ;
                    return ;
                }
                if (k > 0) {
                    // wait for ping
                    submit_refresh_job = function () { refresh_job(k-1)} ;
                    $timeout(submit_refresh_job, 1000) ;
                    return ;
                }
                wallet.ping_error = 'Timeout' ;
                $rootScope.$apply() ;
            };
            submit_refresh_job = function () { refresh_job(30)} ;
            $timeout(submit_refresh_job, 1000) ;

        }; // open_wallet

        var MONEY_API_RE = /^[0-9a-f]{10}(-i|-e|-o|-io|-p)?\.[0-9]{13}$/ ; // ignore temporary files & money transaction files in export


        // change user profile hub
        self.my_user_data_hub ;
        self.user_data_hubs = ['182Uot1yJ6mZEwQYE5LX1P5f6VPyJ9gUGe', ''] ;

        // get export info. show in export and import options sections
        (function() {
            var pgm = controller + ': ' ;
            var ls_size, passwords, i, no_users, user_path, debug_seq ;
            // localStorage info
            ls_size = JSON.stringify(MoneyNetworkHelper.ls_get()).length ;
            try {
                passwords = JSON.parse(MoneyNetworkHelper.getItem('passwords')) ;
            }
            catch (e) {
                console.log(pgm + 'error. passwords was invalid. error = ' + e.message) ;
                passwords = [] ;
            }
            no_users = 0 ;
            for (i=0 ; i<passwords.length ; i++) if (passwords[i]) no_users++ ;
            self.export_info.ls = no_users + ' account' + (no_users > 1 ? 's' : '') + ', ' + ls_size + ' bytes' ;
            // zeroNet info
            moneyNetworkService.get_my_user_hub(function (my_user_data_hub, other_user_hub, other_user_hub_title) {
                var pgm = controller + ' get_my_user_hub callback 1: ' ;
                var inner_path ;
                self.my_user_data_hub = my_user_data_hub ;
                user_path = "merged-" + get_merged_type() + "/" + my_user_data_hub + "/data/users/" + ZeroFrame.site_info.auth_address;
                inner_path = user_path + '/content.json' ;
                z_file_get(pgm, {inner_path: inner_path, required: false}, function (content) {
                    var pgm = controller + ' z_file_get callback 2: ' ;
                    var filename, z_files, z_bytes, chat_files, chat_bytes ;
                    if (!content) return ;
                    try {
                        content = JSON.parse(content) ;
                    }
                    catch (e) {
                        console.log(pgm + 'error. ' + inner_path + ' was invalid. error = ' + e.message) ;
                        return ;
                    }
                    z_files = 0 ; z_bytes = 0 ;
                    // user files (data.json, status.json and avatar)
                    if (content.files) for (filename in content.files) {
                        if (filename.match(MONEY_API_RE)) continue ;
                        z_files++ ;
                        z_bytes += content.files[filename].size ;
                    }
                    // optional files / public chat
                    chat_files = 0 ; chat_bytes = 0 ;
                    self.export_info.z = z_files + ' file' + (z_files > 1 ? 's' : '') + ', ' + z_bytes + ' bytes' ;
                    if (content.files_optional) for (filename in content.files_optional) {
                        if (filename.match(MONEY_API_RE)) continue ;
                        if (content.files_optional[filename].size <= 2) continue ;
                        chat_files++ ;
                        chat_bytes += content.files_optional[filename].size ;
                    }
                    self.export_info.chat = chat_files + ' file' + (chat_files > 1 ? 's' : '') + ', ' + chat_bytes + ' bytes' ;

                    console.log(pgm + 'todo: initialize self.export_info.wallets. information about # connected and not connected wallets') ;
                    console.log(pgm + 'todo: initialize list of all known wallets. ping wallets. update info about connected wallets') ;
                    moneyNetworkService.get_currencies({}, function (currencies, refresh_angular_ui) {
                        var pgm = controller + ' get_my_user_hub get_currencies callback 2: ' ;
                        var wallet_names, i, wallet_name, ping_wallet ;
                        console.log(pgm + 'currencies = ' + JSON.stringify(currencies)) ;
                        //currencies = [{
                        //    "code": "tBTC",
                        //    "amount": 3.69162808,
                        //    "last_request_at": 1516957627446,
                        //    "balance_at": 1516541483800,
                        //    "sessionid": "gxap1qz72thfwinhp7m6b9lnox4zqx99hx6jmqwlcfttpsln81vyhzythhwl",
                        //    "wallet_sha256": "23823ecbc270ac395f20b068efa992d758988b85d570294d81434a463df3210c",
                        //    "wallet_address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                        //    "wallet_title": "MoneyNetworkW2",
                        //    "wallet_description": "Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro",
                        //    "api_url": "https://www.blocktrail.com/api/docs",
                        //    "unique_id": "23823ecbc270ac395f20b068efa992d758988b85d570294d81434a463df3210c/tBTC",
                        //    "name": "Test Bitcoin",
                        //    "url": "https://en.bitcoin.it/wiki/Testnet",
                        //    "fee_info": "Fee is calculated by external API (btc.com) and subtracted from amount. Calculated from the last X block in block chain. Lowest fee that still had more than an 80% chance to be confirmed in the next block.",
                        //    "units": [{"unit": "BitCoin", "factor": 1, "decimals": 8}, {
                        //        "unit": "Satoshi",
                        //        "factor": 1e-8,
                        //        "decimals": 0
                        //    }],
                        //    "wallet_name": "MoneyNetworkW2",
                        //    "unique_text": "tBTC Test Bitcoin from MoneyNetworkW2"
                        //}];

                        // wallet_name is unique for each wallet. is either wallet_domain or wallet_address.
                        // initialize array with unique wallet names.
                        wallet_names = {} ;
                        self.wallets.splice(0,self.wallets.length) ;
                        for (i=0 ; i<currencies.length ; i++) {
                            wallet_name = currencies[i].wallet_name ;
                            if (wallet_names[wallet_name]) continue ;
                            wallet_names[wallet_name] = true ;
                            self.wallets.push({
                                wallet_name: wallet_name,
                                sessionid: currencies[i].sessionid,
                                last_request_at: currencies[i].last_request_at,
                                wallet_sha256: currencies[i].wallet_sha256,
                                wallet_url: '/' + (currencies[i].wallet_domain || currencies[i].wallet_address),
                                ping_error: 'Not tested',
                                export: true,
                                import_file_index: -1,
                                import: false
                            }) ;
                        }
                        console.log(pgm + 'wallets = ' + JSON.stringify(wallet_names)) ;
                        self.export_info.wallets = self.wallets.length + ' wallet' + (self.wallets.length == 1 ? '' : 's') ;
                        if (!self.wallets.length) return ;

                        // ping wallets to count # connected and # not connected wallets. can only export wallet ls data for connected wallet sessions
                        ping_wallet = function (index) {
                            var pgm = controller + ' get_my_user_hub get_currencies ping_wallet: ' ;
                            var sessionid, timeout_msg, no_ok, no_error, i, msg ;
                            if (index >= self.wallets.length) {
                                // console.log(pgm + 'done pinging wallets. wallets = ' + JSON.stringify(self.wallets)) ;
                                update_wallet_export_info() ;
                                $rootScope.$apply() ;
                                return ;
                            }
                            sessionid = self.wallets[index].sessionid ;
                            MoneyNetworkAPILib.get_session(sessionid, function (session_info) {
                                var request ;
                                if (!session_info) {
                                    self.wallets[index].ping_error = 'No session info was found for sessionid ' + sessionid ;
                                    return ping_wallet(index+1) ;
                                }
                                request = { msgtype: 'ping'} ;
                                timeout_msg = ['info', 'Issue with wallet ping may have been solved<br>Please try again (export data)', 10000] ;
                                session_info.encrypt.send_message(request, {response: 5000, timeout_msg: timeout_msg}, function (response) {

                                    if (response && response.error && response.error.match(/^Timeout /)) {
                                        self.wallets[index].ping_error = 'Timeout' ;
                                        return ping_wallet(index+1) ;
                                    }
                                    if (!response || response.error) {
                                        self.wallets[index].ping_error = 'Wallet ping error ' + (response ? response.error : '') ;
                                        return ping_wallet(index+1) ;
                                    }
                                    // OK wallet ping
                                    self.wallets[index].ping_error = null ;
                                    self.wallets[index].session_info = session_info ;
                                    ping_wallet(index+1) ;
                                }) ; // send_message

                            }) ; // get_session callback


                        } ; // ping_wallet
                        ping_wallet(0) ;


                    }) ; // get_currencies callback 2

                    // console.log(controller + ': self.export_info = ' + JSON.stringify(self.export_info)) ;
                }) ; // z_file_get callback 2

            }) ; // get_my_user_hub callback 1

        })() ;

        // export to txt file
        self.export = function() {
            var pgm = controller + '.export: ' ;
            var filename, now, data, user_path, step_1_check_wallets, step_2_get_password, step_3_read_content_json,
                step_4_read_zeronet_file, step_5_image_to_base64, step_6_get_ls, step_7_get_wallet_backup, step_8_encrypt_data,
                step_9_export;

            // check encrypt password
            if (self.export_encrypt) {
                if (!self.export_password) {
                    z_wrapper_notification(['error', 'export file password is missing', 5000]);
                    return ;
                }
                if (!self.export_confirm_password || (self.export_password != self.export_confirm_password)) {
                    z_wrapper_notification( ['error', 'export file password is not confirmed', 5000]);
                    return ;
                }
            }

            // check for wallets export
            now = new Date().getTime() ;
            filename = 'moneynetwork-' + date(now, 'yyyyMMdd-HHmmss') + '.txt' ;
            data = {
                timestamp: now,
                options: {
                    ls: true,
                    z: self.export_z,
                    chat: self.export_chat,
                    wallets_ls: self.export_wallets,
                    encrypt: self.export_encrypt
                }
            };

            // ready for export. callback sequence:
            // 1 - enter password if user has selected a password protected export file
            // 2 - read content.json - get list of files and files_optional
            // 3 - loop for each file and add to data
            // 4-6 - add localStorage, encrypt and export
            moneyNetworkService.get_my_user_hub(function (my_user_data_hub, other_user_hub, other_user_hub_title) {

                user_path = "merged-" + get_merged_type() + "/" + my_user_data_hub + "/data/users/" + ZeroFrame.site_info.auth_address;

                // callbacks:
                step_9_export = function () {
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
                    if (self.export_wallets) msg += '<br>- ' + self.wallets.length + ' wallet' + (self.wallets.length == 1 ? '' : 's') ;
                    msg += '<br>exported to ' ;
                    if (self.export_encrypt) msg += 'encrypted ' ;
                    msg += ' file ' + filename ;
                    if (self.export_encrypt) msg += '<br>Please remember export file password. Required for import' ;
                    z_wrapper_notification( ['done', msg]);
                }; // step_9_export

                step_8_encrypt_data = function () {
                    var options, timestamp, password, data_str, enc_data_str, key ;
                    if (!data.options.encrypt) return step_9_export() ;
                    password = data.password ;
                    delete data.password ;
                    data_str = JSON.stringify(data) ;
                    enc_data_str = MoneyNetworkHelper.encrypt(data_str, password);
                    for (key in data) delete data[key] ;
                    data.enc_data = enc_data_str ;
                    step_9_export() ;
                }; // step_8_encrypt_data

                step_7_get_wallet_backup = function (index) {
                    var pgm = controller + '.export.step_7_get_wallet_backup: ';
                    var session_info, error, request1 ;
                    if (index >= self.wallets.length) return step_8_encrypt_data(); // done
                    session_info = self.wallets[index].session_info;
                    if (!session_info) {
                        // abort export
                        error = 'Export failed. Could not find session info for:<br>wallet: ' + self.wallets[index].wallet_name;
                        z_wrapper_notification(['error', error, 10000]);
                        return;
                    }

                    // get wallet localStorage data
                    request1 = {msgtype: 'request_wallet_backup'};
                    session_info.encrypt.send_message(request1, {response: 60000}, function (response1) {
                        var pgm = controller + '.export.step_7_get_wallet_backup send_message callback 1: ';
                        var inner_path, error, filenames, files, read_file, re, m;

                        if (response1 && response1.error && response1.error.match(/^Timeout /)) {
                            error =
                                'Export failed. Timeout in wallet backup request<br>' +
                                'wallet: ' + self.wallets[index].wallet_name + '<br>' +
                                'Please check console log in wallet session' ;
                            z_wrapper_notification(['error', error]) ;
                            return ;
                        }

                        if (!response1 || response1.error || (response1.msgtype != 'wallet_backup')) {
                            error =
                                'Export failed. Could not get localStorage data for<br>' + // xxx
                                'wallet: ' + self.wallets[index].wallet_name + '<br>' +
                                JSON.stringify(response1);
                            z_wrapper_notification(['error', error]);
                            return;
                        }
                        // response1.data must be a stringify object (wallet localStorage data)
                        try {
                            JSON.parse(response1.ls);
                        }
                        catch (e) {
                            error =
                                'Export failed. localStorage data from<br>' +
                                'wallet: ' + self.wallets[index].wallet_name + '<br>' +
                                'is not a JSON.stringify object<br>' +
                                'error: ' + e.message;
                            z_wrapper_notification(['error', error]);
                            return;
                        }

                        // check optional list of files to be included in wallet backup
                        filenames = [] ;
                        if (response1.filenames) {
                            filenames = response1.filenames ;
                            console.log(pgm + 'reading wallet files to be included in wallet backup. filenames = ' + JSON.stringify(filenames)) ;
                        }
                        console.log(pgm + 'filenames = ' + JSON.stringify(filenames)) ;
                        re = new RegExp('^[0-9a-f]{10}(-i|-e|-o|-io|-p)\.[0-9]{13}$'); // pattern for MoneyNetworkAPI files.

                        // read file loop:
                        read_file = function () {
                            var filename ;
                            filename = filenames.shift() ;
                            if (!filename) {
                                // done.
                                // OK.
                                if (!index) {
                                    data.options.wallets_ls = true;
                                    data.wallets_ls = [];
                                }
                                data.wallets_ls.push({
                                    wallet_url: self.wallets[index].wallet_url,
                                    wallet_name: self.wallets[index].wallet_name,
                                    wallet_sha256: self.wallets[index].wallet_sha256,
                                    wallet_ls: response1.ls,
                                    wallet_files: files ? files : null
                                });

                                // next wallet
                                return step_7_get_wallet_backup(index + 1);
                            }
                            // ignore temporary MoneyNetworkAPI communication files
                            m = filename.match(re) ;
                            if (m && (['-i', '-e', '-p'].indexOf(m[1]) != -1)) {
                                console.log(pgm + 'ignoring temporary MoneyNetworkAPI file ' + filename + '. not included in wallet backup') ;
                                return read_file() ;
                            }
                            // read file
                            inner_path = session_info.encrypt.other_user_path + filename ;
                            // console.log(pgm + 'inner_path = ' + inner_path) ;
                            z_file_get(pgm, {inner_path: inner_path, required: false}, function (content, extra) {
                                var pgm = controller + '.export.step_7_get_wallet_backup z_file_get callback 2: ';
                                var error, wallet;

                                if (!content) {
                                    z_wrapper_notification(['info', 'file ' + filename + ' was not backup<br>wallet: ' + self.wallets[index].wallet_name]) ;
                                    return read_file() ;
                                }

                                if (!files) files = [] ;
                                files.push({filename: filename, content: content}) ;
                                read_file() ;

                            }); // z_file_get callback 2

                        } ; // read_file
                        read_file() ;

                    }); // send_message callback 1

                }; // step_7_get_wallet_backup

                step_6_get_ls = function() {
                    data.ls = MoneyNetworkHelper.ls_get() ;
                    if (self.export_wallets) step_7_get_wallet_backup(0) ;
                    else step_8_encrypt_data() ;
                }; // step_6_get_ls

                // http://stackoverflow.com/questions/6150289/how-to-convert-image-into-base64-string-using-javascript
                step_5_image_to_base64 = function (src, outputFormat, callback) {
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
                }; // step_5_image_to_base64

                step_4_read_zeronet_file = function () {
                    var pgm = controller + '.export.step_4_read_zeronet_file: ' ;
                    var filename, key, image_format, debug_seq, format ;

                    // find next file to download
                    for (key in data.z_files) {
                        if (data.z_files[key] == false) {
                            filename = key ;
                            break ;
                        }
                    }
                    if (!filename) return step_6_get_ls() ; // done with zeronet files. continue with localStorage

                    format = ['avatar.jpg', 'avatar.png'].indexOf(filename) != -1 ? 'base64' : 'text' ;

                    //if (['avatar.jpg', 'avatar.png'].indexOf(filename) != -1) {
                    //    // image file. fileGet cannot be used.
                    //    image_format = filename == 'avatar.jpg' ? 'image/jpg' : 'image/png' ;
                    //    step_5_image_to_base64(user_path + '/' + filename, image_format, function(content) {
                    //        data.z_files[filename] = content ;
                    //        // console.log(pgm + 'filename = ' + filename + ', content = ' + content) ;
                    //        step_4_read_zeronet_file() ;
                    //    })
                    //}
                    //else {
                        // json file. normal fileGet
                        z_file_get(pgm, {inner_path: user_path + '/' + filename, required: false, format: format}, function (content) {
                            var error ;
                            if (!content) {
                                error = 'Cannot export zeronet data. file ' + filename + ' was not found' ;
                                console.log(pgm + error) ;
                                z_wrapper_notification( ['error', error]);
                                return ;
                            }
                            if (format == 'text') {
                                // json
                                try {
                                    data.z_files[filename] = JSON.parse(content) ;
                                }
                                catch (e) {
                                    error = ['Cannot export zeronet data. ', 'file ' + filename + ' was invalid', 'error = ' + e.message] ;
                                    console.log(pgm + error.join('. ')) ;
                                    z_wrapper_notification(['error', error.join('<br>')]);
                                    return ;
                                }
                            }
                            else {
                                // avatar image
                                data.z_files[filename] = content ;
                            }
                            step_4_read_zeronet_file() ;
                        }) ; // z_file_get cb
                    //}
                }; // step_4_read_zeronet_file

                step_3_read_content_json = function () {
                    var pgm = controller + '.export.step_3_read_content_json: ' ;
                    var debug_seq ;
                    z_file_get(pgm, {inner_path: user_path + '/' + 'content.json', required: false}, function (content) {
                        var pgm = controller + '.export.step_3_read_content_json z_file_get callback: ' ;
                        var error, filename ;
                        if (!content) {
                            error = 'Cannot export zeronet data. content.json file was not found' ;
                            console.log(pgm + error) ;
                            z_wrapper_notification( ['error', error]);
                            return ;
                        }
                        try {
                            content = JSON.parse(content) ;
                        }
                        catch (e) {
                            error = ['Cannot export zeronet data', 'content.json was invalid', 'error = ' + e.message] ;
                            console.log(pgm + error.join('. ')) ;
                            z_wrapper_notification( ['error', error.join('<br>')]);
                            return ;
                        }
                        data.z_files = {} ;
                        if (data.options.z) {
                            // export user files (data.json. status.json and optional avatar image)
                            for (filename in content.files) {
                                if (!filename.match(MONEY_API_RE)) data.z_files[filename] = false ;
                            }
                        }
                        if (data.options.chat) {
                            // export user optional files (chat files)
                            for (filename in content.files_optional) {
                                if (content.files_optional[filename].size <= 2) continue ;
                                if (!filename.match(MONEY_API_RE)) data.z_files[filename] = false ;
                            }
                        }
                        // console.log(pgm + 'data.z_files = ' + JSON.stringify(data.z_files)) ;
                        step_4_read_zeronet_file() ;
                    }) ; // z_file_get cb
                }; // step_3_read_content_json cb

                step_2_get_password = function () {
                    if (data.options.encrypt) {
                        data.password = self.export_password ;
                        self.export_password = null ;
                        self.export_confirm_password = null ;
                    }
                    if (data.options.z || data.options.chat) step_3_read_content_json() ;
                    else step_6_get_ls() ;
                }; // step_2_get_password

                step_1_check_wallets = function() {
                    var i, error ;
                    if (!self.export_wallets) return step_2_get_password() ;
                    for (i=0 ; i<self.wallets.length ; i++) {
                        if (self.wallets[i].ping_error) {
                            // abort export
                            error =
                                'Cannot start export with wallet data<br>' +
                                'Wallet ' + self.wallets[i].wallet_name + ' error:<br>' +
                                self.wallets[i].ping_error + '<br>' +
                                'See "Export options" checkbox';
                            z_wrapper_notification(['error', error]) ;
                            self.export_show_options = true ;
                            return ;
                        }
                    } // for i
                    step_2_get_password() ;
                }; // step_1_check_wallets

                // start export callback sequence
                step_1_check_wallets();

            }) ; // get_my_user_hub callback 1

        }; // export


        // import from txt file
        self.import = function(event) {
            var pgm = controller + '.import_ls: ' ;
            var files, file, step_1_read_file, step_2_decrypt_data, step_3_check_wallets, step_4_confirm_import,
                step_5_get_user_path, step_6_restore_wallet, step_7_delete_z_file, step_8_write_z_file, step_9_publish,
                step_10_ls_write, step_11_done, user_path ;
            // console.log(pgm + 'event = ' + JSON.stringify(event));
            files = event.target.files;
            file = files[0] ;
            console.log(pgm + 'file.name = ' + file.name) ;

            // ready for import. callback sequence:
            // 1 - FileReader. read file, parse json and check json structure
            // 2 - decrypt data if encrypted
            // 3 - confirm import
            // 4 - get user path
            // 5 - write ZeroNet files
            // 6 - publish
            // 7 - overwrite localStorage
            // 8 - notification, log out and redirect

            // callbacks:

            // step 11. redirect. maybe better with a page reload?
            // https://github.com/jaros1/Money-Network/issues/318#issuecomment-362576413
            step_11_done = function () {
                var pgm = controller + '.import.step_11_done: ' ;
                var msg, job ;
                msg = 'MoneyNetwork was restored. Reloading page in 3 seconds' ;
                console.log(pgm + msg) ;
                z_wrapper_notification(['done', msg]) ;
                job = function() { $window.location.reload() } ;
                $timeout(job, 3000) ;
            }; // step_11_done

            step_10_ls_write = function (data) {
                var pgm = controller + '.import.step_10_ls_write: ' ;
                var ls, key ;
                console.log(pgm + 'client_logout') ;
                moneyNetworkService.client_logout() ;
                ls = MoneyNetworkHelper.ls_get() ;
                for (key in ls) delete ls[key] ;
                for (key in data.ls) ls[key] = data.ls[key] ;
                // restored message. displayed after page reload
                ls.moneynetwork_backup_restored = {
                    now: new Date().getTime(),
                    timestamp: data.timestamp,
                    filename: file.name
                } ;
                MoneyNetworkHelper.ls_save() ;
                console.log(pgm + 'ls overwritten and saved') ;
                step_11_done() ;
            }; // step_10_ls_write

            step_9_publish = function (data) {
                var pgm = controller + '.import.step_9_publish: ' ;
                // MoneyNetworkAPILib.z_site_publish({inner_path: user_path + 'content.json', reason: 'import'}, function (res) {
                moneyNetworkService.zeronet_site_publish({inner_path: user_path + 'content.json', reason: 'import'}, function (res) {
                    var pgm = controller + '.import.step_9_publish z_site_publish callback 1: ' ;
                    var error ;
                    if (res == "ok") return step_10_ls_write(data) ;

                    // publish failed. should be save to continue import anyway ...
                    error = 'Import error. Publish failed. error = ' + res ;
                    console.log(pgm + error);
                    ZeroFrame.cmd("wrapperConfirm", [error + '<br>Continue?', "Yes"], function (confirm) {
                        if (!confirm) return ;
                        step_10_ls_write(data) ;
                    }) ; // wrapperConfirm callback 2

                }); // z_site_publish callback 1

            }; // step_9_publish

            step_8_write_z_file = function (data) {
                var pgm = controller + '.import.step_8_write_z_file: ' ;
                var key, filename, json_raw, image_base64uri, post_data, debug_seq ;
                for (key in data.z_files) {
                    filename = key ;
                    break ;
                }
                if (!filename) return step_9_publish(data) ;

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

                z_file_write(pgm, user_path + filename, post_data, function (res) {
                    // console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                    var error ;
                    if (res == "ok") {
                        console.log(pgm + 'uploaded ZeroNet file ' + filename) ;
                        return step_8_write_z_file(data)
                    }
                    //
                    error = 'Import error. Failed to write ' + filename + '. error = ' + res ;
                    console.log(pgm + error);

                    ZeroFrame.cmd("wrapperConfirm", [error + '<br>Continue?', "Yes"], function (confirm) {
                        if (!confirm) return ;
                        step_8_write_z_file(data) ;
                    }) ;

                }); // fileWrite

            }; // step_8_write_z_file

            // step 7. delete old user directory files before writing new files
            step_7_delete_z_file = function (data) {
                var pgm = controller + '.import.step_7_delete_z_file: ' ;
                var inner_path ;

                inner_path = user_path + 'content.json' ;
                z_file_get(pgm, {inner_path: inner_path}, function (content_str) {
                    var content, delete_files, filename, delete_file ;
                    if (!content_str) {
                        console.log(pgm + 'error. ' + inner_path + ' was not found') ;
                        return step_8_write_z_file(data) ;
                    }
                    content = JSON.parse(content_str) ;
                    delete_files = [] ;
                    for (filename in content.files) delete_files.push(filename) ;
                    if (content.files_optional) for (filename in content.files_optional) delete_files.push(filename) ;

                    // delete file loop
                    delete_file = function() {
                        var filename, inner_path ;
                        filename = delete_files.shift() ;
                        if (!filename) return step_8_write_z_file(data) ; // done deleting files
                        inner_path = user_path + filename ;
                        ZeroFrame.cmd("fileDelete", [inner_path], function (res) {
                            if (!res || (res != 'ok')) console.log(pgm + inner_path + ' fileDelete failed. error = ' + JSON.stringify(res)) ;
                            delete_file() ;
                        })
                    } ; // delete_file
                    delete_file() ;

                }) ; // z_file_get callback

            } ; // step_7_delete_z_file

            // todo: must send restore wallet requests to wallet sessions before overwriting MN session data.
            // cannot receive restore_wallet_backup response.
            // - 1) wallet localStorage data does no longer matches MN localStorage data
            // - 2) MN session must log out +log in after MN localStorage restore
            // - 3) Wallet page must be reloaded after MN log in
            step_6_restore_wallet = function (data, index) {
                var pgm = controller + '.import.step_6_restore_wallet: ' ;
                var session_info, error, request, import_file_index ;
                if (typeof index != 'number') index = 0 ;
                if (!data.options.wallets_ls || !self.import_wallets) return step_7_delete_z_file(data) ;
                if (index >= self.wallets.length) return step_7_delete_z_file(data) ;
                // check wallet at index
                if (self.wallets[index].import_file_index == -1) return step_6_restore_wallet(data, index+1) ;
                if (!self.wallets[index].import) return step_6_restore_wallet(data, index+1) ;
                if (self.wallets[index].ping_error) return step_6_restore_wallet(data, index+1) ;

                session_info= self.wallets[index].session_info ;
                if (!session_info) {
                    error = 'Import failed. Could not find session info for<br>' +
                        'wallet: ' + self.wallets[index].wallet_name ;
                    z_wrapper_notification(['error', error]) ;
                    return ;
                }

                // send restore_wallet_backup message to wallet session
                // wallet will respond with a OK response and restore wallet after 10 seconds
                import_file_index = self.wallets[index].import_file_index ;
                request = {
                    msgtype: 'restore_wallet_backup',
                    ls: data.wallets_ls[import_file_index].wallet_ls,
                    timestamp: data.timestamp,
                    filename: file.name || 'n/a'
                } ;
                if (data.wallets_ls[import_file_index].wallet_files && data.wallets_ls[import_file_index].wallet_files.length) {
                    request.files = data.wallets_ls[import_file_index].wallet_files
                }
                console.log(pgm + 'request = ' + JSON.stringify(request)) ;
                session_info.encrypt.send_message(request, {response: 60000}, function (response) {
                    var pgm = controller + '.import.step_6_restore_wallet send_message callback 1: ' ;
                    var error ;

                    if (response && response.error && response.error.match(/^Timeout /)) {
                        error =
                            'Import failed. Timeout in wallet restore request<br>' +
                            'wallet: ' + self.wallets[index].wallet_name + '<br>' +
                            'Wallet session may or may not have been restored' ;
                        z_wrapper_notification(['error', error]) ;
                        return ;
                    }
                    if (!response || response.error) {
                        error =
                            'Import failed. Wallet restore failed:<br>' +
                            'wallet: ' + self.wallets[index].wallet_name + '<br>' +
                            'error:' + (response ? response.error : JSON.stringify(response)) ;
                        z_wrapper_notification(['error', error]) ;
                        return ;
                    }
                    // OK response to wallet restore request. wallet restore will begin within 10 seconds
                    console.log(pgm + 'response = ' + JSON.stringify(response)) ;

                    step_7_delete_z_file(data) ;

                }) ; // send_message callback 1

            } ; // step_6_import_wallet

            step_5_get_user_path = function (data) {
                moneyNetworkService.get_my_user_hub(function (my_user_data_hub, other_user_hub, other_user_hub_title) {
                    user_path = 'merged-' + MoneyNetworkAPILib.get_merged_type() + '/' + my_user_data_hub + "/data/users/" + ZeroFrame.site_info.auth_address + '/';
                    step_6_restore_wallet(data, 0) ;
                }) ;
            } ; // step_5_get_user_path

            function confirm_import_msg (data) {
                var no_z_files, no_chat_files, msg, filename, no_selected_wallets, i ;
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
                if (data.options.z && self.import_z) msg += '<br>- ZeroNet user files (' + no_z_files + ' files)' ;
                if (data.options.chat && self.import_chat) msg += '<br>- ZeroNet optional files (public chat) (' + no_chat_files + ' files)' ;
                if (data.options.wallets_ls && self.import_wallets) {
                    no_selected_wallets = 0 ;
                    for (i=0 ; i<self.wallets.length ; i++) {
                        if (self.wallets[i].import_file_index == -1) continue ;
                        if (!self.wallets[i].import) continue ;
                        if (self.wallets[i].ping_error) continue ; // error. import processing should have been aborted in step_3_check_wallets
                        no_selected_wallets++ ;
                    }
                    msg += '<br>- localStorage data for ' + no_selected_wallets + ' wallet' + (no_selected_wallets == 1 ? '' : 's') ;
                }
                msg += '<br>Use import options section to configurate import' ;
                msg += '<br>Import will overwrite all your Money Network data!' ;
                msg += '<br>Continue? No way back!' ;
                return msg ;
            } // confirm_import_msg

            step_4_confirm_import = function (data) {
                var pgm = controller + '.import.step_4_confirm_import: ' ;
                var old_msg ;
                old_msg = confirm_import_msg(data) ;
                ZeroFrame.cmd("wrapperConfirm", [old_msg, "Import"], function (confirm) {
                    var new_msg ;
                    if (!confirm) return ;
                    new_msg = confirm_import_msg(data) ;
                    if (old_msg != new_msg) {
                        console.log(pgm + 'user has changed import options. repeat confirm message') ;
                        console.log(pgm + 'old_msg = ' + old_msg) ;
                        console.log(pgm + 'new_msg = ' + new_msg) ;
                        return step_4_confirm_import(data) ;
                    }
                    step_5_get_user_path(data) ;
                }) ;

            }; // step_4_confirm_import

            step_3_check_wallets = function (data) {
                var key, passwords, i, no_users, z_files, z_bytes, filename, c_files, c_bytes, bytes, json_raw, found, j, error, element ;

                // display file import information to UI (import options). Allows user see and optional deselect parts of import
                // almost identical information in import confirm message
                if (!self.import_info) self.import_info = {} ;
                if (!self.import_info.timestamp && (data.timestamp != self.import_info.timestamp)) {
                    // first file or new file. Set import options = export options from file
                    self.import_show_options = true ;
                    // clear old data
                    for (key in self.import_info) delete self.import_info[key] ;
                    for (i=0 ; i<self.wallets.length ; i++) {
                        self.wallets[i].import_file_index = -1 ;
                        self.wallets[i].import = false ;
                    }
                    // insert new data
                    self.import_info.timestamp = data.timestamp ;
                    // localStorage
                    self.import_ls = true ;
                    passwords = JSON.parse(data.ls.passwords.substr(1)) ;
                    no_users = 0 ;
                    for (i=0 ; i < passwords.length ; i++) if (passwords[i]) no_users++ ;
                    console.log(pgm + 'no_users = ' + no_users) ;
                    self.import_info.ls = no_users + ' account' + (no_users == 1 ? '' : 's') + ', ' + JSON.stringify(data.ls).length + ' bytes' ;
                    // zeronet files (normal files and optional files (chat))
                    self.import_z = data.options.z ;
                    self.import_chat = data.options.chat ;
                    if (self.import_z || self.import_chat) {
                        z_files = 0 ; z_bytes = 0 ;
                        c_files = 0 ; c_bytes = 0 ;
                        for (filename in data.z_files) {
                            if (['avatar.jpg', 'avatar.png'].indexOf(filename) == -1) {
                                // binary / image
                                bytes = JSON.stringify(data.z_files[filename]).length ;
                            }
                            else {
                                // json object
                                json_raw = JSON.stringify(data.z_files[filename], null, "\t");
                                bytes = json_raw.length ;
                            }
                            console.log(pgm + filename + ' ' + bytes + ' bytes') ;
                            if (filename.match(/[0-9]/)) {
                                c_files++ ;
                                c_bytes += bytes ;
                            }
                            else {
                                z_files++ ;
                                z_bytes += bytes ;
                            }
                        }
                        // todo: size in bytes does not match export information. Small differences.
                        if (self.import_z) self.import_info.z = z_files + ' file' + (z_files == 1 ? '' : 's') + ', about ' + z_bytes + ' bytes' ;
                        else self.import_info.z = null ;
                        if (self.import_chat) self.import_info.chat = c_files + ' file' + (c_files == 1 ? '' : 's') + ', about ' + c_bytes + ' bytes' ;
                        else self.import_info.chat ;
                    }
                    else {
                        self.import_info.z = null ;
                        self.import_info.chat ;
                    }
                    // wallets
                    self.import_wallets = data.options.wallets_ls ;
                    if (self.import_wallets) {
                        self.import_info.wallets = data.wallets_ls.length + ' wallet' + (data.wallets_ls.length == 1 ? '' : 's');

                        // compare self.wallets array (from currencies) with data.wallets_ls array (from import file)
                        for (i=0 ; i<data.wallets_ls.length ; i++) {
                            found = false ;
                            // check wallet_sha256
                            for (j=0 ; j<self.wallets.length ; j++) {
                                if (self.wallets[j].wallet_sha256 = data.wallets_ls[i].wallet_sha256) {
                                    self.wallets[j].import_file_index = i ;
                                    self.wallets[j].import = true ;
                                    found = true ;
                                    break ;
                                }
                            }
                            if (found) continue ;
                            // check wallet url
                            for (j=0 ; j<self.wallets.length ; j++) {
                                if (self.wallets[j].wallet_url = data.wallets_ls[i].wallet_url) {
                                    self.wallets[j].import_file_index = i ;
                                    self.wallets[j].import = true ;
                                    found = true ;
                                    break ;
                                }
                            }
                            if (found) continue ;
                            // wallet in import file was not found in currencies / self.wallets array
                            self.wallets.push({
                                wallet_name: data.wallets_ls[i].wallet_name,
                                sessionid: null,
                                last_request_at: null,
                                wallet_sha256: data.wallets_ls[i].wallet_sha256,
                                wallet_url: data.wallets_ls[i].wallet_url,
                                ping_error: 'Not tested', // import will fail
                                export: false,
                                import_file_index: i,
                                import: true
                            }) ;
                        } // for i
                        // console.log(pgm + 'self.wallets (2) = ' + JSON.stringify(self.wallets)) ;
                    }
                    else self.import_info.wallets = null ;

                    $rootScope.$apply() ;
                }

                if (!data.options.wallets_ls) return step_4_confirm_import(data) ;

                for (i=0 ; i<self.wallets.length ; i++) {
                    if (self.wallets[i].import && self.wallets[i].ping_error) {
                        error =
                            'Cannot import file<br>' +
                            'Not connected wallet ' + self.wallets[i].wallet_name + '<br>' +
                            'error: ' + self.wallets[i].ping_error + '<br>' +
                            'See "Import options" in this page';
                        z_wrapper_notification(['error', error]) ;
                        element = document.getElementById('import') ;
                        if (element) element.value = null ;
                        return ;
                    }
                }

                step_4_confirm_import(data) ;

            } ; // step_3_check_wallets

            function is_data_ok (data) {
                var error ;
                if (!data.timestamp) error = 'Timestamp was not found in file' ;
                else if (!data.options) error = 'Export options were not found in file' ;
                else if (!data.options.hasOwnProperty('ls')) error = 'Export options.ls was not found' ;
                else if (!data.options.hasOwnProperty('z')) error = 'Export options.z was not found' ;
                else if (!data.options.hasOwnProperty('chat')) error = 'Export options.chat was not found' ;
                else if (!data.options.hasOwnProperty('encrypt')) error = 'Export options.encrypt was not found' ;
                else if (data.options.wallets_ls && (!data.wallets_ls || !data.wallets_ls.length)) error = 'Export options.wallets_ls is true but no wallet data in file' ;
                else if (data.wallets_ls && data.wallets_ls.length && !data.options.wallets_ls) error = 'Export options.wallets_ls is false but wallet data in file' ;
                else {
                    if (!data.ls) error = 'ls (localStorage) was not found' ;
                    else if ((data.options.z || data.options.chat) && !data.z_files) error = 'z_files (ZeroNet files) were not found';
                }
                if (error) {
                    error = 'Import failed. ' + error ;
                    console.log(pgm + error) ;
                    z_wrapper_notification(['error', error]);
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
                        z_wrapper_notification( ['info', 'Import cancelled. No password', 5000]);
                        return;
                    }
                    // decrypt data
                    enc_data_str = data.enc_data ;
                    try {
                        data_str = MoneyNetworkHelper.decrypt(enc_data_str, password) ;
                    }
                    catch (e) {
                        z_wrapper_notification(['info', 'Import cancelled. Invalid password or file<br>error = ' + e.message, 5000]);
                        return;
                    }
                    try {
                        data2 = JSON.parse(data_str) ;
                    }
                    catch (e) {
                        z_wrapper_notification(['info', 'Import cancelled. Invalid password or file<br>error = ' + e.message, 5000]);
                        return;
                    }
                    //
                    if (!is_data_ok(data2)) return ;
                    step_3_check_wallets(data2) ;
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
                    try {
                        data = JSON.parse (data_str) ;
                    }
                    catch (e) {
                        z_wrapper_notification( ['info', 'Import cancelled. Invalid file<br>error = ' + e.message, 5000]);
                        return;
                    }
                    // check json structure
                    if (data.enc_data) return step_2_decrypt_data(data) ; // encrypted. json check in next step
                    else if (is_data_ok(data))  step_3_check_wallets(data) ;

                }; // onload
                try {
                    reader.readAsText(file);
                }
                catch (err) {
                    error = 'import failed: ' + err.message ;
                    console.log(pgm + error) ;
                    z_wrapper_notification( ['error', error]);
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
                z_wrapper_notification( ['error', error, 10000]);
                return ;
            }
            if (self.change_password.old_password == self.change_password.new_password) {
                error = 'Password not changed. Old password and new password are identical' ;
                z_wrapper_notification( ['error', error, 10000]);
                return ;
            }
            error = MoneyNetworkHelper.change_password(self.change_password.old_password, self.change_password.new_password) ;
            if (error) {
                error = 'Password not changed. ' + error ;
                z_wrapper_notification( ['error', error, 10000]);
                return ;
            }
            z_wrapper_notification( ['done', 'Password was changed. Please remember your new password', 10000]);
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
                MoneyNetworkHelper.load_user_setup(self.setup) ;
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
