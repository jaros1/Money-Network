angular.module('MoneyNetwork')

    // MoneyNetworkZService:
    // - update user directory in ZeroNet (z_update_xxx functions)

    .factory('MoneyNetworkZService', ['$timeout', '$rootScope', '$window', '$location', 'dateFilter', 'MoneyNetworkHubService', 'MoneyNetworkEmojiService',
                             function($timeout, $rootScope, $window, $location, date, moneyNetworkHubService, moneyNetworkEmojiService)
    {
        var service = 'MoneyNetworkZService' ;
        console.log(service + ' loaded') ;

        // cache some important informations from zeronet files
        // - user_seq: from users array in data.json file. using "pubkey" as index to users array
        // - user_seqs: from users array in data.json file.
        // - files_optional: from content.json file. loaded at startup and updated after every sign and publish
        //   todo: add option to enable/disable files_optional cache. must be disabled if multiple users are using same zeronet cert at the same time
        var z_cache = moneyNetworkHubService.get_z_cache() ;

        function detected_client_log_out (pgm, userid) {
            return moneyNetworkHubService.detected_client_log_out(pgm, userid);
        }

        function set_last_online (contact, last_online) {
            MoneyNetworkHelper.set_last_online(contact, last_online) ;
        }

        function get_merged_type() {
            return MoneyNetworkAPILib.get_merged_type();
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

        // insert <br> into long notifications. For example JSON.stringify
        function z_wrapper_notification (array) {
            moneyNetworkHubService.z_wrapper_notification(array) ;
        } // z_wrapper_notification


        // administrator helpers.
        function is_admin () {
            return moneyNetworkHubService.is_admin() ;
        }
        function get_admin_key() {
            return moneyNetworkHubService.get_admin_key() ;
        }

        var ls_contacts = moneyNetworkHubService.get_ls_contacts() ; // array with contacts
        var ls_reactions = moneyNetworkHubService.get_ls_reactions() ;
        var js_messages = moneyNetworkHubService.get_js_messages() ; // array with { :contact => contact, :message => message } - one row for each message
        var files_optional_cache = moneyNetworkHubService.get_files_optional_cache() ;
        var watch_receiver_sha256 = [] ; // listen for sha256 addresses
        function get_watch_receiver_sha256 () {
            return watch_receiver_sha256 ;
        }


        //// wrappers for data.json, status.json and like.json fileGet and fileWrite operations
        function z_file_get (pgm, options, cb) {
            moneyNetworkHubService.z_file_get(pgm, options, cb) ;
        }
        function z_file_write (pgm, inner_path, content, cb) {
            MoneyNetworkAPILib.z_file_write(pgm, inner_path, content, {}, cb) ;
        }
        function get_data_json (cb) {
            moneyNetworkHubService.get_data_json(cb) ;
        }
        function write_data_json (cb) {
            moneyNetworkHubService.write_data_json(cb) ;
        }
        function get_status_json (cb) {
            moneyNetworkHubService.get_status_json(cb) ;
        }
        function write_status_json (cb) {
            moneyNetworkHubService.write_status_json(cb) ;
        }
        function get_like_json(cb) {
            moneyNetworkHubService.get_like_json(cb);
        }
        function write_like_json (cb) {
            moneyNetworkHubService.write_like_json(cb)
        }
        function update_like_index (like, like_index) {
            moneyNetworkHubService.update_like_index(like, like_index)
        }
        function get_my_user_hub (cb) {
            moneyNetworkHubService.get_my_user_hub(cb) ;
        }
        function save_my_files_optional (files_optional) {
            moneyNetworkHubService.save_my_files_optional(files_optional)
        }
        function get_public_contact (create) {
            return moneyNetworkHubService.get_public_contact(create)
        }
        function zeronet_site_publish(options, cb) { moneyNetworkHubService.zeronet_site_publish(options, cb)}
        function get_my_unique_id() { return moneyNetworkHubService.get_my_unique_id()}
        function get_message_by_seq(seq) { return moneyNetworkHubService.get_message_by_seq(seq)}
        function message_add_local_msg_seq(js_messages_row, local_msg_seq) {
            return moneyNetworkHubService.message_add_local_msg_seq(js_messages_row, local_msg_seq)
        }
        function message_add_sender_sha256(js_messages_row, sender_sha256) {
            return moneyNetworkHubService.message_add_sender_sha256(js_messages_row, sender_sha256)
        }
        function add_message_parent_index (message) {
            return moneyNetworkHubService.add_message_parent_index (message)
        }
        function add_message(contact, message, load_contacts) {
            return moneyNetworkHubService.add_message(contact, message, load_contacts) ;
        }

        /// optional files format:
        //// - public chat        : <to unix timestamp>-<from unix timestamp>-<user seq>-chat.json (timestamps are timestamp for last and first message in file)
        //// - old encrypted image: <unix timestamp>-image.json (not used but old files may still exist)
        //// - new encrypted image: <unix timestamp>-<user seq>-image.json
        var Z_CONTENT_OPTIONAL = moneyNetworkHubService.get_z_content_optional() ;

        // inject functions from calling services
        var ls_save_contacts, next_local_msg_seq, check_reactions, add_msg ;
        function inject_functions (hash) {
            if (hash.ls_save_contacts) ls_save_contacts = hash.ls_save_contacts ;
            if (hash.next_local_msg_seq) next_local_msg_seq = hash.next_local_msg_seq ;
            if (hash.check_reactions) check_reactions = hash.check_reactions ;
            if (hash.add_msg) add_msg = hash.add_msg ;
        }

        // find max size of user directory
        var user_contents_max_size = null ; // max size of user directory. from data/users/content
        function clear_user_contents_max_size() {
            user_contents_max_size = null
        }
        function load_user_contents_max_size (lock_pgm) {
            var pgm = service + '.load_user_contents_max_size: ' ;
            console.log(lock_pgm + 'calling get_my_user_hub');
            get_my_user_hub(function (my_user_data_hub, other_user_hub, other_user_hub_title) {
                var pgm = service + ".load_user_contents_max_size get_my_user_hub callback 1: " ;
                var inner_path, debug_seq ;
                inner_path = 'merged-' + get_merged_type() + '/' + my_user_data_hub + '/data/users/content.json' ;
                z_file_get(pgm, {inner_path: inner_path, required: false}, function (data, extra) {
                    var pgm = service + ".load_user_contents_max_size z_file_get callback 2: " ;
                    var msg ;
                    if (!data) {
                        // fatal error. maybe problem with hub?
                        msg = ['Error. Cannot find max user directory size', ' for user data hub = ' + my_user_data_hub] ;
                        if (extra) {
                            if (extra.error) msg.push(extra.error) ;
                            else msg.push(JSON.stringify(extra)) ;
                        }
                        console.log(pgm + msg.join('. ')) ;
                        z_wrapper_notification(['error', msg.join('<br>')]) ;
                        user_contents_max_size = -1 ;
                        if (lock_pgm) z_update_1_data_json (lock_pgm) ;
                        return
                    }
                    try {
                        data = JSON.parse(data) ;
                    }
                    catch (e) {
                        console.log(pgm + 'Error. ' + inner_path + ' was invalid. error = ' + e.message) ;
                        user_contents_max_size = -1 ;
                        if (lock_pgm) z_update_1_data_json (lock_pgm) ;
                        return
                    }
                    // console.log(pgm + 'data = ' + JSON.stringify(data));
                    user_contents_max_size = 0 ;
                    var user_contents = data['user_contents'] ;
                    if (!user_contents) { z_update_1_data_json (lock_pgm) ; return }
                    // check per user permissions first
                    var permissions = user_contents.permissions ;
                    var cert_user_id = ZeroFrame.site_info.cert_user_id;
                    if (permissions && permissions.hasOwnProperty(cert_user_id)) {
                        if (!permissions[cert_user_id]) return ; //  banned user
                        if (!permissions[cert_user_id].hasOwnProperty('max_size')) { z_update_1_data_json (lock_pgm) ; return } // no max size?
                        user_contents_max_size = permissions[cert_user_id].max_size ;
                        if (lock_pgm) z_update_1_data_json (lock_pgm) ;
                        return ;
                    }
                    // check generel user permissions
                    var permission_rules = user_contents['permission_rules'] ;
                    if (!permission_rules) { z_update_1_data_json (lock_pgm) ; return }
                    if (!permission_rules[".*"]) { z_update_1_data_json (lock_pgm) ; return }
                    if (!permission_rules[".*"].hasOwnProperty('max_size')) { z_update_1_data_json (lock_pgm) ; return }
                    user_contents_max_size = permission_rules[".*"].max_size ;
                    if (lock_pgm) z_update_1_data_json (lock_pgm) ; // called from z_update_1_data_json. continue data.json update
                }) ; // z_file_get callback 2

            }) ; // get_my_user_hub callback 1

        } // load_user_contents_max_size

        function get_max_image_size () {
            if (!user_contents_max_size) return 0 ;
            return Math.round(user_contents_max_size * 0.9) ;
        } // get_max_image_size


        // issue #199: angularJS $$hashKey is added to money_transactions in chat msg before send
        // https://github.com/jaros1/Money-Network/issues/262#issuecomment-352670914 Test 15a
        // must be removed again before JSON validation and before encryption
        function remove_hashkey (message) {
            var i ;
            if (message.msgtype != 'chat msg') return message ;
            if (!message.money_transactions) return message ;
            message = JSON.parse(JSON.stringify(message)) ;
            for (i=0 ; i<message.money_transactions.length ; i++) delete message.money_transactions[i]['$$hashKey'] ;
            delete message.this_money_transaction_status;
            delete message.other_money_transaction_status;
            return message ;
        } //  remove_hashkey


        // feedback section. two parts:
        // - a) feedback hash inside the sent/received messages
        //      feedback.sent array - array with sent messages where sender is waiting for feedback (has the message been received or not?)
        //      feedback.received array - array with received messages. negative local_msg_seq if a message has not been received (message lost in cyberspace).
        // - b) feedback info in message envelopes (feedback status for the message)
        //      null - waiting for feedback info
        //      normal chat. unix timestamp - contact has received the message
        //      group chat. hash with unix timestamps - for example {"1":1480699332201} - participant 1 has received the message
        // chat types:
        // - normal chat. sent/received arrays are just list of local_msg_seq
        // - group chat. sent/received arrays are list of strings with format "<participant>,<local_msg_seq>"
        //   participant is a number from 1 to number of participant in group chat. See contact.participants array
        //   example: feedback:{received:["2,890","2,891","1,4"]}

        // add feedback info to outgoing message
        function add_feedback_info (receiver_sha256, message_with_envelope, contact) {
            var pgm = service + '.add_feedback_info: ' ;
            var feedback, i, message, local_msg_seqs, local_msg_seq, factor, now, key, j, my_unique_id, participant,
                show_receiver_sha256, error, contact2, message2, contact3, participant_no, k ;
            now = new Date().getTime() ;

            // check that json still is valid before adding feedback information to outgoing messages
            // problem with null values in sent and received arrays
            message = remove_hashkey(message_with_envelope.message) ;
            error = MoneyNetworkHelper.validate_json(pgm, message, message.msgtype, 'cannot add feedback info to invalid outgoing message');
            if (error) {
                console.log(pgm , error) ;
                return;
            }
            message = null ;

            feedback = {} ;

            if (contact.type == 'group') {
                // encrypted group chat
                // debug('feedback_info', pgm + 'group = ' + JSON.stringify(contact)) ;

                // check inbox. messages received in group chat
                local_msg_seqs = [] ;
                for (i=0 ; i<contact.messages.length ; i++) {
                    message = contact.messages[i] ;
                    if ((message.folder != 'inbox') || !message.message.local_msg_seq) continue ;
                    // inbox message with a local_msg_seq (contacts local_msg_seq for this message)
                    if (message.feedback) {
                        // feedback loop complete - contact knows that this message has been received
                        continue ;
                    }
                    message.feedback = now ;
                    if (message.msgtype == 'reaction') message.deleted_at = now ;
                    // factor = -1. received feedback request for unknown message. lost msg was created in UI. tell contact that message has never been received
                    factor = message.message.msgtype == 'lost msg' ? -1 : 1 ;
                    local_msg_seqs.push(message.participant + ',' + (factor*message.message.local_msg_seq)) ;
                } // for i (contact.messages)
                // check deleted inbox messages. key = "participant,local_msg_seq", where participant was sender of deleted chat message
                if (contact.deleted_inbox_messages) for (key in contact.deleted_inbox_messages) {
                    if (contact.deleted_inbox_messages[key]) {
                        // feedback loop complete - contact knows that this deleted message has been received
                        continue ;
                    }
                    // feedback loop not finished. tell contact that this deleted inbox message has been received
                    contact.deleted_inbox_messages[key] = now ;
                    local_msg_seqs.push(key);
                } // for local_msg_seq (deleted_inbox_messages)
                if (local_msg_seqs.length > 0) feedback.received = local_msg_seqs ;

                // check outbox. messages sent in group chat
                // check outbox. messages sent to contact without having received feedback. request feedback info for outbox messages.
                // only feedback.received array in ingoing messages.
                local_msg_seqs = [] ;
                my_unique_id = get_my_unique_id();
                for (i=0 ; i<contact.messages.length ; i++) {
                    message = contact.messages[i] ;
                    if (message.folder != 'outbox') continue ;
                    if (!message.local_msg_seq) continue ; // not yet sent
                    if (message.local_msg_seq == message_with_envelope.local_msg_seq) continue ; // sending current outbox message
                    // request feedback info from contact. has this outbox message been received?
                    if (!message.feedback) message.feedback = {} ;
                    for (j=0 ; j<contact.participants.length ; j++) {
                        participant = contact.participants[j] ;
                        if (participant == my_unique_id) continue ; // me
                        if (message.feedback[j+1]) continue ; // feedback loop complete for this participant
                        // request feedback info from participant. has this outbox message been received?
                        key = (j+1) + ',' + message.local_msg_seq ;
                        if (local_msg_seqs.indexOf(key) == -1) local_msg_seqs.push(key) ;
                    } // j
                } // for i (contact.messages)
                // check deleted outbox messages - todo: any reason to ask for feedback info for deleted outbox messages?
                if (contact.deleted_outbox_messages) {
                    debug('feedback_info', pgm + 'contact.deleted_outbox_messages = ' + JSON.stringify(contact.deleted_outbox_messages));
                    debug('feedback_info', pgm + 'Object.keys(contact.deleted_outbox_messages) = ' + JSON.stringify(Object.keys(contact.deleted_outbox_messages)));
                    for (key in contact.deleted_outbox_messages) {
                        debug('feedback_info', pgm + 'key = ' + key) ;
                        if (contact.deleted_outbox_messages[key]) continue ; // feedback loop complete - deleted outbox message have been received by participant
                        // request feedback info from participant. has this deleted outbox message been received?
                        if (local_msg_seqs.indexOf(key) == -1) local_msg_seqs.push(key) ;
                    }
                } // for local_msg_seq (deleted_outbox_messages)
                if (local_msg_seqs.length > 0) feedback.sent = local_msg_seqs ;

                // end group chat
            }
            else {
                // encrypted private chat.
                // - always adding a random sender_sha256 address to outgoing message
                // - listening for any response to this address (receiver_sha256) and remove message from ZeroNet (data.json) after having received response
                // - see section b) in data.json cleanup routine (z_update_1_data_json)

                local_msg_seqs = [] ;
                show_receiver_sha256 = true ;

                // loop through inbox and deleted inbox messages for contacts with identical pubkey = identical localStorage
                for (i=0 ; i<ls_contacts.length ; i++) {
                    contact2 = ls_contacts[i] ;
                    if (contact2.pubkey != contact.pubkey) continue ;

                    // check inbox. messages received from contact2
                    for (j=0 ; j<contact2.messages.length ; j++) {
                        message = contact2.messages[j] ;
                        if (message.message.msgtype == 'lost msg2') debug('lost_message', pgm + 'lost msg2 in inbox. message = ' + JSON.stringify(message));
                        if (message.folder != 'inbox') continue ;
                        if (!message.message.local_msg_seq && !message.message.message_sha256) continue ;
                        //  inbox message with a local_msg_seq (contacts local_msg_seq for this message)
                        // console.log(pgm + 'inbox message.sender_sha256 = ' + message.sender_sha256);
                        if (message.feedback) {
                            // feedback loop complete - contact knows that this message has been received
                            continue ;
                        }
                        message.feedback = now ;
                        if (message.msgtype == 'reaction') message.deleted_at = now ;
                        if (message.sender_sha256 == receiver_sha256) {
                            // current outbox message.receiver_sha256 = inbox message.sender_sha256.
                            // no reason also to add this inbox message to feedback.received
                            if (show_receiver_sha256) {
                                debug('feedback_info', pgm + 'receiver_sha256 = ' + receiver_sha256) ;
                                show_receiver_sha256 = false ;
                            }
                            continue ;
                        }
                        // notice special format in feedback.received for lost messages
                        // - positive local_msg_seq: tell contact that message has been received
                        // - negative local_msg_seq: tell contact that message has not been received (please resend)
                        // - sha256 address: tell contact that message with sha256 address was received with a decrypt error (please resend)
                        if (message.message.msgtype == 'lost msg2') local_msg_seq = message.message.message_sha256 ; // decrypt error
                        else if (message.message.msgtype == 'lost msg') local_msg_seq = -message.message.local_msg_seq ; // lost message
                        else local_msg_seq = message.message.local_msg_seq ; // OK message
                        if (local_msg_seqs.indexOf(local_msg_seq) == -1) local_msg_seqs.push(local_msg_seq) ;
                    } // for i (contact2.messages)

                    // check deleted inbox messages from contact2
                    if (contact2.deleted_inbox_messages) for (local_msg_seq in contact2.deleted_inbox_messages) {
                        if (contact2.deleted_inbox_messages[local_msg_seq]) {
                            // feedback loop complete - contact knows that this deleted message has been received
                            continue ;
                        }
                        // feedback loop not finished. tell contact that this deleted inbox message has been received
                        contact2.deleted_inbox_messages[local_msg_seq] = now ;
                        local_msg_seqs.push(parseInt(local_msg_seq));
                    } // for local_msg_seq (deleted_inbox_messages)

                    // check encrypted group chat messages from contact2
                    console.log(pgm + 'checking encrypted group chat messages received from contact2');
                    participant = contact2.unique_id ;
                    console.log(pgm + 'contact2.unique_id / participant = ' + participant);
                    for (j=0 ; j<ls_contacts.length ; j++) {
                        contact3 = ls_contacts[j] ;
                        if (contact3.type != 'group') continue ;
                        participant_no = contact3.participants.indexOf(participant) ;
                        if (participant_no == -1) continue ;
                        participant_no++ ;
                        debug('feedback_info', pgm + 'found relevant group chat contact = ' + JSON.stringify(contact3)) ;
                        // check group chat inbox messages received from this participant
                        for (k=0 ; k<contact3.messages.length ; k++) {
                            message = contact3.messages[k] ;
                            if (message.folder != 'inbox') continue ;
                            if (!message.message.local_msg_seq) continue ;
                            if (message.participant != participant_no) continue ;
                            debug('feedback_info', pgm + 'found relevant group chat inbox message = ' + JSON.stringify(message)) ;
                            //message = {
                            //    "local_msg_seq": 967,
                            //    "folder": "inbox",
                            //    "message": {
                            //        "msgtype": "chat msg", "message": "group chat msg 1", "local_msg_seq": 18,
                            //        "feedback": {"received": ["1,963"]}
                            //    },
                            //    "zeronet_msg_id": "e0b42bcab8fdaa15c1bb8b80fa6e83ac6f7b111b5712d58348f978ad5d0ade22",
                            //    "sent_at": 1484289111523,
                            //    "received_at": 1484289111595,
                            //    "participant": 3,
                            //    "ls_msg_size": 305,
                            //    "seq": 26
                            //};

                            if (message.feedback) {
                                // feedback loop complete - contact knows (or should know) that this message has been received
                                continue ;
                            }
                            message.feedback = now ;
                            // notice special format in feedback.received for lost messages
                            // - positive local_msg_seq: tell contact that message has been received
                            // - negative local_msg_seq: tell contact that message has not been received (please resend)
                            if (message.message.msgtype == 'lost msg') local_msg_seqs.push(-message.message.local_msg_seq) ;
                            else local_msg_seqs.push(message.message.local_msg_seq) ;

                        } // for k (messages)
                    } // for j (contacts)

                } // i (contacts)

                if (local_msg_seqs.length > 0) feedback.received = local_msg_seqs ;


                // check outbox. messages sent to contact without having received feedback. request feedback info for outbox messages.
                // two kind of feedback.
                //   a) inbox.receiver_sha256 = outbox.sender_sha256. have received an inbox message with sha256 address sent in a outbox message
                //   b) feedback.received array in ingoing messages.
                local_msg_seqs = [] ;

                // loop trough outbox and deleted outbox messages from contacts with identical pubkey = identical localStorage
                for (i=0 ; i<ls_contacts.length ; i++) {
                    contact2 = ls_contacts[i] ;
                    if (contact2.pubkey != contact.pubkey) continue ;

                    // check outbox messages
                    for (j=0 ; j<contact2.messages.length ; j++) {
                        message = contact2.messages[j] ;
                        if (message.folder != 'outbox') continue ;
                        if (message.local_msg_seq == message_with_envelope.local_msg_seq) continue ; // sending current outbox message
                        if (!message.local_msg_seq) continue ; // other not yet sent outbox messages (error or pending)
                        if (message.feedback) continue ; // feedback loop complete - outbox message have been received by contact
                        // request feedback info from contact. has this outbox message been received?
                        local_msg_seqs.push(message.local_msg_seq) ;
                        if (!local_msg_seqs[local_msg_seqs.length-1]) {
                            // debugging. todo: why null in sent array sometimes?
                            console.log(
                                pgm + 'error. added null to feedback.sent array (1). message.local_msg_seq = ' + message.local_msg_seq +
                                ', message_with_envelope.local_msg_seq = ' + message_with_envelope.local_msg_seq +
                                ', message = ' + JSON.stringify(message));
                        }
                    } // for j (contact2.messages)

                    // check deleted outbox messages - todo: any reason to ask for feedback info for deleted outbox messages?
                    if (contact2.deleted_outbox_messages) {
                        debug('feedback_info', pgm + 'contact2.deleted_outbox_messages = ' + JSON.stringify(contact2.deleted_outbox_messages));
                        debug('feedback_info', pgm + 'Object.keys(contact2.deleted_outbox_messages) = ' + JSON.stringify(Object.keys(contact2.deleted_outbox_messages)));
                        for (local_msg_seq in contact2.deleted_outbox_messages) {
                            // debug('feedback_info', pgm + 'local_msg_seq = ' + local_msg_seq) ;
                            if (contact2.deleted_outbox_messages[local_msg_seq]) continue ; // feedback loop complete - deleted outbox message have been received by contact
                            // request feedback info from contact. has this deleted outbox message been received?
                            local_msg_seqs.push(parseInt(local_msg_seq)) ;
                            // todo: why is null added to sent array?
                            if (!local_msg_seqs[local_msg_seqs.length-1]) console.log(pgm + 'error. added null to feedback.sent array (2).');
                        }
                    } // for local_msg_seq (deleted_outbox_messages)

                } // for i (contacts)

                if (local_msg_seqs.length > 0) feedback.sent = local_msg_seqs ;

            }

            // any feedback info to add?
            if (message.feedback) {
                // must be message lost in cyberspace processing. resending old previously sent message
                debug('lost_message || feedback_info', pgm + 'resending old message. removing old feedback = ' + JSON.stringify(message.feedback)) ;
                delete message.feedback ;
            }
            if (Object.keys(feedback).length > 0) {
                // feedback = {"received":[1],"sent":[445,447,448,449,450]} ;
                message_with_envelope.message.feedback = feedback ;
                debug('feedback_info', pgm + 'feedback = ' + JSON.stringify(feedback) + ', message_with_envelope = ' + JSON.stringify(message_with_envelope));

                // check that json still is valid after adding feedback information to outgoing messages
                // problem with null values in sent and received arrays
                message = remove_hashkey(message_with_envelope.message) ;
                error = MoneyNetworkHelper.validate_json(pgm, message, message.msgtype, 'cannot add invalid feedback info to outgoing message');
                if (error) {
                    console.log(pgm , error) ;
                    delete message_with_envelope.message.feedback ;
                }
            }

        } // add_feedback_info

        // return avatar for user or assign a random avatar to user
        var avatar = { src: "public/images/avatar1.png", loaded: false } ;
        function load_avatar () {
            var pgm = service + '.load_avatar: ';
            if (avatar.loaded) return ; // already loaded

            // set previous avatar from setup before checking zeronet
            // console.log(pgm + 'user_setup.avatar = ' + user_setup.avatar) ;
            if (z_cache.user_setup.avatar && (['jpg','png'].indexOf(z_cache.user_setup.avatar) == -1)) {
                // public avatar found in user setup
                avatar.src = 'public/images/avatar' + z_cache.user_setup.avatar ;
                // console.log(pgm + 'from user setup. temporary setting user avatar to ' + avatar.src);
            }
            // check ZeroFrame status
            var retry_load_avatar = function () {
                load_avatar();
            };
            if (!ZeroFrame.site_info) {
                // ZeroFrame websocket connection not ready. Try again in 5 seconds
                console.log(pgm + 'ZeroFrame.site_info is not ready. Try again in 5 seconds. Refresh page (F5) if problem continues') ;
                $timeout(retry_load_avatar, 5000);
                return ;
            }
            if (!ZeroFrame.site_info.cert_user_id) {
                console.log(pgm + 'Auto login process to ZeroNet not finished. Maybe user forgot to select cert. Recheck avatar in 1 minute');
                ZeroFrame.cmd("certSelect", [["moneynetwork.bit", "nanasi", "zeroid.bit", "kaffie.bit", "moneynetwork"]]);
                $timeout(retry_load_avatar,60000);
                return ;
            }
            console.log(pgm + 'calling get_my_user_hub');

            get_my_user_hub(function(my_user_data_hub, other_user_hub, other_user_hub_title) {
                var pgm = service + '.load_avatar get_my_user_hub callback 1: ';
                var user_path, inner_path ;

                if (z_cache.user_setup.avatar && (['jpg','png'].indexOf(z_cache.user_setup.avatar) != -1)) {
                    // uploaded avatar found in user setup
                    avatar.src = 'merged-' + get_merged_type() + '/' + my_user_data_hub + '/data/users/' + ZeroFrame.site_info.auth_address + '/avatar.' + z_cache.user_setup.avatar ;
                    // console.log(pgm + 'from user setup. temporary setting user avatar to ' + avatar.src);
                }

                // 1) get content.json - check if user already has uploaded an avatar
                user_path = "merged-" + get_merged_type() + "/" + my_user_data_hub + "/data/users/" + ZeroFrame.site_info.auth_address ;
                inner_path = user_path + "/content.json"
                z_file_get(pgm, {inner_path: inner_path, required: false}, function (content, extra) {
                    var pgm = service + '.load_avatar z_file_get callback 2: ';
                    var ls_avatar, public_avatars, index ;
                    if (content) {
                        try {
                            content = JSON.parse(content);
                        }
                        catch (e) {
                            console.log(pgm + 'error. ' + inner_path + ' was invalid. error = ' + e.message) ;
                            content = { files: {} } ;
                        }
                    }
                    else content = { files: {} } ;
                    // console.log(pgm + 'content = ' + JSON.stringify(content));

                    // remember actual list of actual files. Used in public chat
                    if (content.optional == Z_CONTENT_OPTIONAL) save_my_files_optional(content.files_optional || {}) ;

                    // console.log(pgm + 'res = ' + JSON.stringify(res));
                    if (content.files["avatar.jpg"]) {
                        // console.log(pgm + 'found avatar.jpg') ;
                        avatar.src = user_path + '/avatar.jpg';
                        avatar.loaded = true ;
                        $rootScope.$apply() ;
                        return ;
                    }
                    if (content.files["avatar.png"]) {
                        // console.log(pgm + 'found avatar.png') ;
                        avatar.src = user_path + '/avatar.png';
                        avatar.loaded = true ;
                        $rootScope.$apply() ;
                        return ;
                    }
                    // 2) no user avatar found - use previous selection in localStorage
                    ls_avatar = z_cache.user_setup.avatar ;
                    if (ls_avatar && (['jpg','png'].indexOf(ls_avatar) == -1)) {
                        // console.log(pgm + 'found from user_setup. ls_avatar = ' + JSON.stringify(ls_avatar)) ;
                        avatar.src = "public/images/avatar" + ls_avatar;
                        avatar.loaded = true ;
                        $rootScope.$apply() ;
                        return ;
                    }
                    // 3) assign random avatar from public/images/avatar
                    // console.log(pgm + 'assigned random avatar') ;
                    public_avatars = MoneyNetworkHelper.get_public_avatars() ;
                    if (!public_avatars.length) {
                        console.log(pgm + 'warning. public_avatars array is empty. Maybe not finished loading? Using avatar1.png') ;
                        avatar.src = "public/images/avatar1.png" ;
                        z_cache.user_setup.avatar = '1.png' ;
                    }
                    else {
                        index = Math.floor(Math.random() * (public_avatars.length-1)); // avatarz.png is used for public contact
                        avatar.src = "public/images/avatar" + public_avatars[index] ;
                        z_cache.user_setup.avatar = public_avatars[index] ;
                    }
                    avatar.loaded = true ;
                    $rootScope.$apply() ;
                    MoneyNetworkHelper.ls_save();
                }); // z_file_get callback 2

            }) ; // get_my_user_hub callback 1

        } // load_avatar

        function get_avatar () {
            return avatar ;
        }

        function generate_random_password () {
            return MoneyNetworkHelper.generate_random_password(200);
        }


        // action table used when updating group chat reaction.
        // see z_update_1_data_json (create private reaction messages before encrypt and send)
        // keys: dim 1) message folder, dim 2) old reaction and dim 3) new reaction
        // values (actions). 0-2 messages. array with:
        // - g (group reaction) or g0 (cancel group reaction). reaction group 2
        // - p (private reaction), p0 (cancel private reaction). reaction group 3
        // - a (anonymous reaction). reaction group 2
        var grp_reaction_action_table = {
            inbox: {
                none:    { none: [,],     group: [,'g'],     private: [,'p'] },
                group:   { none: [,'g'],  group: [,'g'],     private: ['g0', 'p'] },
                private: { none: ['p0',], group: ['p0','g'], private: [,'p'] }
            },
            outbox: {
                none:    { none: [,],     group: [,'g'],     private: [,'a'] },
                group:   { none: [,'g'],  group: [,'g'],     private: ['g0', 'a'] },
                private: { none: ['a',],  group: ['a','g'],  private: ['a', 'a'] }
            }
        } ;


        // prevent multiple z_update processes
        var z_update_1_data_json_cbs = null ;
        function z_update_7_done () {
            var cb ;
            if (!z_update_1_data_json_cbs) return ;
            cb = z_update_1_data_json_cbs.shift() ;
            if (!cb) {
                z_update_1_data_json_cbs = null ;
                return ;
            }
            if (!z_update_1_data_json_cbs.length) z_update_1_data_json_cbs = null ;
            cb() ;
        }

        // update zeronet step 1. update "data.json" file. update users, search and msg (delete only) arrays
        // params:
        // - lock_pgm - pgm from calling process. write warning if multiple z_update_1_data_json running calls
        // - publish - optional param. true: force publish when finish even if there is no changes to data.json
        //             for example after update to optional files
        function z_update_1_data_json (lock_pgm, publish) {
            var pgm = service + '.z_update_1_data_json: ' ;
            var mn_query_1, old_userid ;
            console.log(pgm + 'start. lock_pgm = ' + lock_pgm + ', publish = ' + publish) ;
            if (!ZeroFrame.site_info || !ZeroFrame.site_info.cert_user_id) throw 'debug. no cert_user_id' ;

            // check login status - client and ZeroNet
            if (!z_cache.user_id) {
                z_wrapper_notification(["error", "Ups. Something is wrong. Not logged in Money Network. Cannot post search words in Zeronet. User_id is null", 10000]);
                return ;
            }
            old_userid = z_cache.user_id ;
            if (!ZeroFrame.site_info.cert_user_id) {
                z_wrapper_notification(["error", "Ups. Something is wrong. Not logged in on ZeroNet. Cannot post search words in Zeronet. siteInfo.cert_user_id is null", 10000]);
                console.log(pgm + 'site_info = ' + JSON.stringify(ZeroFrame.site_info));
                return ;
            }
            if (publish) z_cache.publish = true ;

            if (user_contents_max_size == null) {
                // find max_size and call z_update_1_data_json with not null file_size
                load_user_contents_max_size(lock_pgm);
                return ;
            }
            if (user_contents_max_size == -1) {
                // fatal error. hub content.json file was not found.
                console.log(pgm + 'abort processing. hub content.json file was not found. problem with hub') ;
                return moneyNetworkHubService.reset_my_user_hub();
            }
            // console.log(pgm + 'user_contents_max_size = ' + user_contents_max_size) ;

            // prevent multiple running z_update processes
            if (z_update_1_data_json_cbs) {
                console.log(pgm + 'wait for previous z_update_1_data_json request to finish') ;
                z_update_1_data_json_cbs.push(function() { z_update_1_data_json (lock_pgm, publish)}) ;
                return ;
            }
            // mark as running
            z_update_1_data_json_cbs = [] ;

            // find current user data hub
            console.log(pgm + 'calling get_my_user_hub');
            get_my_user_hub(function (my_user_data_hub, other_user_hub, other_user_hub_title) {
                var pgm = service + '.z_update_1_data_json get_my_user_hub callback 1: ';
                if (detected_client_log_out(pgm, old_userid)) return z_update_7_done();
                console.log(pgm + 'hub = ' + my_user_data_hub + ', other_user_hub = ' + other_user_hub) ;

                // cache like.json file. Check for old public reactions
                get_like_json(function (like, like_index, empty) {
                    var pgm = service + '.z_update_1_data_json get_like_json callback 2: ';
                    var debug_seq ;
                    if (detected_client_log_out(pgm, old_userid)) return z_update_7_done();

                    // check current user disk usage. must keep total file usage <= user_contents_max_size
                    mn_query_1 =
                        "select files.filename, files.size " +
                        "from json, files " +
                        "where json.directory = '" + my_user_data_hub + "/" + ZeroFrame.site_info.auth_address + "' " +
                        "and json.file_name = 'content.json' " +
                        "and files.json_id = json.json_id" ;
                    debug('select', pgm + 'mn query 1 = ' + mn_query_1);
                    // debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 1') ;
                    debug_seq = debug_z_api_operation_start(pgm, 'mn query 1', 'dbQuery', show_debug('z_db_query')) ;
                    ZeroFrame.cmd("dbQuery", [mn_query_1], function (res) {
                        var pgm = service + '.z_update_1_data_json dbQuery callback 3: ';
                        // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                        debug_z_api_operation_end(debug_seq, (!res || res.error) ? 'Failed. error = ' + JSON.stringify(res) : 'OK') ;
                        if (detected_client_log_out(pgm, old_userid)) return z_update_7_done() ;
                        // console.log(pgm + 'res = ' + JSON.stringify(res));
                        var data_json_max_size, i ;
                        // calculate data.json max size - reserve 1700 (2200 * 0.75) bytes for avatar - reserve 100 bytes for status
                        data_json_max_size = user_contents_max_size - 1800;
                        for (i=0 ; i<res.length ; i++) {
                            if (['data.json','avatar.png','avatar.jpg'].indexOf(res[i].filename) != -1) continue ;
                            data_json_max_size = data_json_max_size - res[i].size ;
                        }
                        // console.log(pgm + 'site_info = ' + JSON.stringify(ZeroFrame.site_info)) ;

                        // update json table with public key and search words
                        console.log(pgm + 'calling get_data_json');
                        get_data_json(function (data) {
                            var pgm = service + '.z_update_1_data_json get_data_json callback 4: ' ;
                            var local_storage_updated, data_str, row, pubkey, pubkey2, short_avatar, max_user_seq, i,
                                my_user_i, my_user_seq, new_user_row, guest_id, guest, old_guest_user_seq, old_guest_user_index ;
                            if (detected_client_log_out(pgm, old_userid)) {
                                console.log(pgm + 'stop. detected_client_log_out') ;
                                return z_update_7_done();
                            }
                            console.log(pgm + 'received data.json file');

                            // keep track of updates.
                            local_storage_updated = false ; // write localStorage?
                            data_str = JSON.stringify(data) ; // write data.json?

                            // for list of user hubs (add all hubs function)
                            if (!data.hub || (data.hub == "1JeHa67QEvrrFpsSow82fLypw8LoRcmCXk")) {
                                data.hub = other_user_hub ;
                                data.hub_title = other_user_hub_title ;
                            }
                            console.log(pgm + 'data.hub = ' + data.hub) ;

                            // check avatar. Full path in avatar.src. short path in data.users array in ZeroNet
                            // src:
                            // - data/users/1CCiJ97XHgVeJrkbnzLgfXvYRr8QEWxnWF/avatar.jpg => jpg
                            // - data/users/1CCiJ97XHgVeJrkbnzLgfXvYRr8QEWxnWF/avatar.png => png
                            // - public/images/avatar1.png                                => 1.png
                            // - public/images/avatar1.png                                => 1.png
                            // uploaded avatars will be found in files table (from contents.json files)
                            // random assigned avatar in data.users array
                            if (avatar.src.substr(0,20) == 'public/images/avatar') short_avatar = avatar.src.substr(20,avatar.src.length-20);

                            pubkey = MoneyNetworkHelper.getItem('pubkey') ; // used in JSEncrypt
                            pubkey2 = MoneyNetworkHelper.getItem('pubkey2') ; // used in ZeroNet CryptMessage plugin
                            // console.log(pgm + 'pubkey = ' + pubkey, ', pubkey2 = ' + pubkey);

                            // find current user in users array
                            max_user_seq = 0 ;
                            for (i=0 ; i<data.users.length ; i++) {
                                if (pubkey == data.users[i].pubkey) {
                                    my_user_i = i ;
                                    my_user_seq = data.users[my_user_i].user_seq
                                }
                                else if (data.users[i].user_seq > max_user_seq) max_user_seq = data.users[i].user_seq ;
                            }
                            if (my_user_seq) {
                                data.users[my_user_i].pubkey2 = pubkey2 ;
                                data.users[my_user_i].encryption = z_cache.user_setup.encryption ;
                                if (short_avatar) data.users[my_user_i].avatar = short_avatar ;
                            }
                            else {
                                // add current user to data.users array
                                my_user_seq = max_user_seq + 1 ;
                                new_user_row = {
                                    user_seq: my_user_seq,
                                    pubkey: pubkey,
                                    pubkey2: pubkey2,
                                    encryption: z_cache.user_setup.encryption
                                };
                                if (short_avatar) new_user_row.avatar = short_avatar ;
                                guest_id = MoneyNetworkHelper.getItem('guestid');
                                guest = (guest_id == '' + z_cache.user_id) ;
                                if (guest) {
                                    new_user_row.guest = true;
                                    old_guest_user_index = -1 ;
                                    for (i=0 ; i<data.users.length ; i++) if (data.users[i].guest) old_guest_user_index = i ;
                                    if (old_guest_user_index != -1) {
                                        old_guest_user_seq = data.users[old_guest_user_index].user_seq ;
                                        data.users.splice(old_guest_user_index,1);
                                    }
                                }
                                data.users.push(new_user_row) ;
                                // console.log(pgm + 'added user to data.users. data = ' + JSON.stringify(data)) ;
                            }
                            // save user_seq and user_seqs in cache
                            z_cache.user_seq = my_user_seq ;
                            if (!z_cache.user_seqs) z_cache.user_seqs = [] ;
                            z_cache.user_seqs.splice(0,z_cache.user_seqs.length) ;
                            for (i=0 ; i<data.users.length ; i++) z_cache.user_seqs.push(data.users[i].user_seq) ;

                            // remove old search words from search array
                            var user_no_search_words = {} ;
                            for (i=data.search.length-1 ; i>=0 ; i--) {
                                row = data.search[i] ;
                                if (row.user_seq == my_user_seq || (row.user_seq == old_guest_user_seq)) data.search.splice(i,1);
                                else {
                                    if (!user_no_search_words.hasOwnProperty(row.user_seq)) user_no_search_words[row.user_seq] = 0 ;
                                    user_no_search_words[row.user_seq]++ ;
                                }
                            }
                            // add new search words to search array
                            user_no_search_words[my_user_seq] = 0 ;
                            for (i=0 ; i<z_cache.user_info.length ; i++) {
                                if (z_cache.user_info[i].privacy != 'Search') continue ;
                                row = {
                                    user_seq: my_user_seq,
                                    tag: z_cache.user_info[i].tag,
                                    value: z_cache.user_info[i].value
                                };
                                data.search.push(row);
                                user_no_search_words[my_user_seq]++ ;
                            } // for i
                            // console.log(pgm + 'user_no_search_words = ' + JSON.stringify(user_no_search_words));

                            var j, k, contact, group_chat ;
                            for (i=data.msg.length-1 ; i>=0 ; i--) {
                                // fix problem with false/0 keys in msg array / messages table (cannot be decrypted). See also "insert new message" below
                                // "null" keys are allowed in group chat
                                if (!data.msg[i].key) {
                                    // cleanup zeronet_msg_id references in localStorage
                                    group_chat = false ;
                                    for (j=0 ; j<ls_contacts.length ; j++) {
                                        contact = ls_contacts[j] ;
                                        for (k=0 ; k<contact.messages.length ; k++) {
                                            if (contact.messages[k].folder != 'outbox') continue ;
                                            if (contact.messages[k].zeronet_msg_id == data.msg[i].message_sha256) {
                                                if (contact.type == 'group') group_chat = true ;
                                                else {
                                                    delete contact.messages[k].zeronet_msg_id;
                                                    delete contact.messages[k].zeronet_msg_size;
                                                    local_storage_updated = true;
                                                }
                                            }
                                        } // for k (messages)
                                    } // for j (contacts)
                                    if (!group_chat) {
                                        console.log(pgm + 'deleting message with invalid key. data.msg[' + i + '] = ' + JSON.stringify(data.msg[i]));
                                        data.msg.splice(i,1);
                                    }
                                    continue ;
                                } // if
                                // delete any messages from deleted guest account
                                if (data.msg[i].user_seq == old_guest_user_seq) data.msg.splice(i,1);
                            } // for i (data.msg)

                            // remove deleted outbox messages from data.json
                            var encrypt, key, message_with_envelope, message, message_deleted, error, image_path ;
                            for (i=0 ; i<ls_contacts.length ; i++) {
                                contact = ls_contacts[i] ;
                                if (contact.type == 'public') continue ;
                                encrypt = null ;
                                for (j=contact.messages.length-1 ; j >= 0 ; j--) {
                                    message_with_envelope = contact.messages[j] ;
                                    if (message_with_envelope.folder != 'outbox') continue ;

                                    // delete outgoing messages (delete before insert - some messages are logical deleted after being sent)
                                    if (contact.messages[j].zeronet_msg_id && contact.messages[j].deleted_at) {
                                        // delete message requested by client (active delete)
                                        // console.log(pgm + 'debug: delete message requested by client (active delete)') ;
                                        // console.log(pgm + 'local_storage_messages[' + i + '] = ' + JSON.stringify(contact.messages[j])) ;
                                        message_deleted = false ;
                                        // console.log(pgm + 'old data.msg.length = ' + data.msg.length) ;
                                        for (k=data.msg.length-1 ; k>=0 ; k--) {
                                            // console.log(pgm + 'debug: data.msg[' + k + '] = ' + JSON.stringify(data.msg[k])) ;
                                            if ((data.msg[k].user_seq == my_user_seq) && (data.msg[k].message_sha256 == contact.messages[j].zeronet_msg_id)) {
                                                message_deleted = true ;
                                                data.msg.splice(k,1) ;
                                                break ;
                                            }
                                        } // for k (data.msg)
                                        // console.log(pgm + 'new data.msg.length = ' + data.msg.length) ;
                                        if (!message_deleted) {
                                            if (!is_admin() || !get_admin_key()) { // ignore delete errors for admin task!
                                                error = "Could not delete message from Zeronet. Maybe posted on ZeroNet from an other ZeroNet id" ;
                                                console.log(pgm + 'error = ' + error) ;
                                                console.log(pgm + 'user_seq = ' + my_user_seq) ;
                                                console.log(pgm + 'zeronet_msg_id = ' + contact.messages[j].zeronet_msg_id) ;
                                                // console.log(pgm + 'data.msg = ' + JSON.stringify(data.msg));
                                                z_wrapper_notification(["error", error, 5000]);
                                            }
                                        }
                                        if (message_with_envelope.message.image && (message_with_envelope.message.image != true)) {
                                            // deleted a message from data.msg with an image <timestamp>-<user_seq>-image.json file attachment
                                            // logical delete - overwrite with empty json as a delete marked optional file.
                                            cleanup_my_image_json(message_with_envelope.sent_at, true, function (cleanup) {
                                                // force publish to update files_optional information
                                                // todo: is z_cache.publish variable updated correct?
                                                if (cleanup) z_cache.publish = true ;
                                            }) ;
                                        }
                                        delete contact.messages[j].zeronet_msg_id ;
                                        delete contact.messages[j].zeronet_msg_size ;
                                        local_storage_updated = true ;
                                        continue
                                    } // if

                                    // lost message. note sent_at timestamp inside message. resending outbox messages that still is in data.json file.
                                    // can be messages sent to a sha256 address that contact was not listening to (this problem should have been fixed now)
                                    // can be messages where contact did get a cryptMessage decrypt error (encrypted to an other ZeroNet certificate)
                                    if (contact.messages[j].zeronet_msg_id && contact.messages[j].message.sent_at) {
                                        message_deleted = false ;
                                        // console.log(pgm + 'old data.msg.length = ' + data.msg.length) ;
                                        for (k=data.msg.length-1 ; k>=0 ; k--) {
                                            // console.log(pgm + 'debug: data.msg[' + k + '] = ' + JSON.stringify(data.msg[k])) ;
                                            if ((data.msg[k].user_seq == my_user_seq) && (data.msg[k].message_sha256 == contact.messages[j].zeronet_msg_id)) {
                                                message_deleted = true ;
                                                data.msg.splice(k,1) ;
                                                break ;
                                            }
                                        } // for k (data.msg)
                                        // console.log(pgm + 'new data.msg.length = ' + data.msg.length) ;
                                        if (!message_deleted) {
                                            if (!is_admin() || !get_admin_key()) { // ignore delete errors for admin task!
                                                error = "Could not remove and resend message. Maybe posted in ZeroNet from an other ZeroNet id" ;
                                                console.log(pgm + 'error = ' + error) ;
                                                console.log(pgm + 'user_seq = ' + my_user_seq) ;
                                                console.log(pgm + 'zeronet_msg_id = ' + contact.messages[j].zeronet_msg_id) ;
                                                // console.log(pgm + 'data.msg = ' + JSON.stringify(data.msg));
                                                z_wrapper_notification(["error", error, 5000]);
                                            }
                                            continue ;
                                        }
                                        // OK. message removed from data.json file. ready for resend
                                        debug('lost_message', pgm + 'resend: message with local_msg_seq ' + contact.messages[j].local_msg_seq + ' was removed from data.json file and is now ready for resend') ;
                                        delete contact.messages[j].zeronet_msg_id ;
                                        delete contact.messages[j].sent_at ;
                                        delete contact.messages[j].cleanup_at ;
                                        delete contact.messages[j].feedback ;
                                        local_storage_updated = true ;
                                    }

                                } // for j (contact.messages)
                            } // for i (contacts)

                            // create private reaction messages before encrypt and send (z_update_2a_data_json_encrypt)
                            // and update private reaction hash in localStorage
                            // can be (reaction_grp):
                            //  1) a private reaction to a public chat message
                            //  2) a reaction in a group chat to all members in group chat
                            //  3) a private reaction to a group chat message
                            //  4) a private reaction to a private chat message
                            var unique_id, message_receiver1, message_receiver2, update_reaction_info, send_message_reaction_grp1,
                                send_message_reaction_grp2, update_like_json, reactions_index, message_receiver_clone,
                                message_sender, reaction_info, old_reaction, reaction_at, new_reaction, reaction1, reaction2,
                                js_messages_row, check_reactions_job, old_private_group_reaction, new_private_group_reaction,
                                send_msg, count1, count2, unique_id2, no_msg, action1, action2, action3, group_reactions,
                                old_action, new_action, prepare_msg, auth_address, like_index_p, my_private_reaction;
                            for (i=0 ; i<ls_contacts.length ; i++) {
                                contact = ls_contacts[i];
                                for (j=contact.messages.length-1 ; j >= 0 ; j--) {
                                    message_with_envelope = contact.messages[j] ;
                                    if (!message_with_envelope.reaction_at) continue ;
                                    message = message_with_envelope.message ;
                                    reaction1 = null ;
                                    reaction2 = message_with_envelope.reaction ;
                                    reaction_at = message_with_envelope.reaction_at ;
                                    if (['lost msg', 'lost msg2'].indexOf(message.msgtype) != -1) {
                                        // no action for lost message notifications in UI (dummy messages)
                                        // todo: disable reaction in UI
                                        console.log(pgm + 'todo: disable reaction to lost message notifications') ;
                                        delete message_with_envelope.reaction_at ;
                                        local_storage_updated = true ;
                                        continue ;
                                    }
                                    // set action flags. one or more actions for each message
                                    update_reaction_info = false ; // true/false: update reactions hash in localStorage (private non anonymous reactions)
                                    my_private_reaction = false ; // mark new private reactions in ls_reactions hash
                                    send_message_reaction_grp1 = 0 ; // 0..4: 0: no message, 1..4: see text above
                                    send_message_reaction_grp2 = 0 ; // 0..4: 0: no message, 1..4: see text above
                                    update_like_json = false ; // true/false: update like.json file. see z_update_6_like_json
                                    message_sender = null ; // sender/creator of chat message
                                    message_receiver1 = null ; // receiver of any private or group message.
                                    message_receiver2 = null ; // receiver of any private or group message.
                                    count1 = null ; // special case. only used for anonymous group chat reactions
                                    count2 = null ; // special case. only used for anonymous group chat reactions

                                    // public, group or private message? some initial parameter setup
                                    if (message_with_envelope.z_filename) {
                                        // public chat
                                        if (message_with_envelope.folder == 'inbox') message_sender = contact ;
                                        if (!z_cache.user_setup.private_reactions) {
                                            // a: public reaction to public chat. no message and add non anonymous info to my like.json fil
                                            // check for any old private reaction and send a private cancel reaction message if any
                                            reactions_index = message_with_envelope.sent_at ;
                                            if (message_with_envelope.folder == 'inbox') {
                                                // add ",<auth>" to index
                                                if (!message_sender || !message_sender.auth_address) reactions_index = null ;
                                                else reactions_index += ',' + message_sender.auth_address.substr(0,4) ;
                                            }
                                            if (reactions_index) {
                                                reaction_info = ls_reactions[reactions_index] ;
                                                unique_id = get_my_unique_id() ;
                                            }
                                            else reaction_info = null ;
                                            if (reaction_info) old_reaction = reaction_info.users[unique_id] ;
                                            else old_reaction = null ;
                                            if (old_reaction) {
                                                // found old private reaction.
                                                // remove old private reaction from ls_reactions
                                                delete reaction_info.users[unique_id] ;
                                                reaction_info.emojis[old_reaction]-- ;
                                                if (reaction_info.emojis[old_reaction] <= 0) delete reaction_info.emojis[old_reaction] ;
                                                // mark private reaction info as updated. z_update_6_like_json must update public AND anonymous like information
                                                reaction_info.reaction_at = new Date().getTime() ;
                                                if (message_with_envelope.folder == 'inbox') {
                                                    // sent cancel private reaction message
                                                    send_message_reaction_grp2 = 1 ; // reaction grp 1 - a private reaction to a public chat message
                                                    reaction2 = null ;
                                                }
                                            }
                                            update_like_json = true ;
                                        }
                                        else {
                                            // private reaction.

                                            // remove any old public reaction from like.json (set my_private_reaction flag)
                                            auth_address = contact.type == 'public' ? ZeroFrame.site_info.auth_address : contact.auth_address ;
                                            like_index_p = message_with_envelope.sent_at + ',' + auth_address.substr(0,4) + ',p' ;
                                            update_like_json = like_index.hasOwnProperty(like_index_p) ;
                                            if (update_like_json) {
                                                k = like_index[like_index_p] ;
                                                debug('reaction', pgm + 'private reaction. todo: remove old public reaction in z_update_6_like_json. ' +
                                                    'k = ' + k + ', like.like[k] = ' + JSON.stringify(like.like[k])) ;
                                                my_private_reaction = true ;
                                            }

                                            if (message_with_envelope.folder == 'outbox') {
                                                // b: private reaction to public chat outbox message.
                                                // update info in ls_reactions, no message and add anonymous info to my like.json file
                                                update_reaction_info = true ;
                                                update_like_json = true ; // update anonymous public reactions and also remove any old public reaction
                                            }
                                            else {
                                                // c: private reaction to public chat inbox message
                                                // update info in ls_reactions and send reaction message. other user will update like.json file
                                                update_reaction_info = true ;
                                                send_message_reaction_grp2 = 1 ; // reaction grp 1 - a private reaction to a public chat message
                                                message_receiver2 = contact ;

                                            }
                                        }

                                    }
                                    else if (contact.type == 'group') {
                                        // group chat
                                        // find sender/creator of group chat message
                                        if (message_with_envelope.folder == 'inbox') {
                                            // find sender/creator of group chat message
                                            unique_id = contact.participants[message_with_envelope.participant-1] ;
                                            message_sender = get_contact_by_unique_id(unique_id) ;
                                        }
                                        // initial group message setup. see more details in update reaction info section (a bit complicated)
                                        if (!z_cache.user_setup.private_reactions) {
                                            // group chat a: group reaction to a group chat message.
                                            update_reaction_info = true ;
                                            send_message_reaction_grp2 = 2 ; // reaction grp 2 - a reaction in a group chat to all members in group chat
                                            message_receiver2 = contact ;

                                        }
                                        else if (message_with_envelope.folder == 'outbox') {
                                            // group chat b: private reaction to a group chat outbox message
                                            // send ANONYMOUS reaction information to group chat members
                                            update_reaction_info = true ;
                                            send_message_reaction_grp2 = 2 ; // reaction grp 2 - a reaction in a group chat to all members in group chat
                                            message_receiver2 = contact ;
                                        }
                                        else {
                                            // group chat c: private reaction to a group chat inbox message
                                            // send NON ANONYMOUS reaction information to sender/creator of group chat message
                                            update_reaction_info = true ;
                                            send_message_reaction_grp2 = 3 ; // reaction grp 3 - a private reaction to a group chat message
                                            message_receiver2 = message_sender ;
                                        }
                                        debug('reaction', pgm + 'folder = ' + message_with_envelope.folder +
                                            ', private_reactions = ' + z_cache.user_setup.private_reactions +
                                            ', send_message_reaction_grp2 = ' + send_message_reaction_grp2) ;
                                        // update reaction info.
                                        if (!message_with_envelope.reactions) message_with_envelope.reactions = [] ;
                                        js_messages_row = get_message_by_seq(message_with_envelope.seq) ;
                                        if (js_messages_row) {
                                            check_reactions_job = function () {
                                                check_reactions(js_messages_row)
                                            } ;
                                            $timeout(check_reactions_job) ; // lookup reactions
                                        }
                                        else debug('reaction', pgm + 'could not found js_messages_row with seq ' + message_with_envelope.seq) ;
                                    }
                                    else {
                                        // private chat. always send a private message
                                        update_reaction_info = true ;
                                        send_message_reaction_grp2 = 4 ;
                                        if (message_with_envelope.folder == 'inbox') message_sender = contact ;
                                        message_receiver2 = contact ;
                                        // update reaction info.
                                        if (!message_with_envelope.reactions) message_with_envelope.reactions = [] ;
                                        js_messages_row = get_message_by_seq(message_with_envelope.seq) ;
                                        if (js_messages_row) {
                                            check_reactions_job = function () {
                                                check_reactions(js_messages_row)
                                            } ;
                                            $timeout(check_reactions_job) ; // lookup reactions
                                        }
                                        else debug('reaction', pgm + 'could not found js_messages_row with seq ' + message_with_envelope.seq) ;
                                    }

                                    message_receiver_clone = JSON.parse(JSON.stringify(message_receiver2)) ;
                                    if (message_receiver_clone) {
                                        message_receiver_clone.messages = '...' ;
                                        if (message_receiver_clone.inbox_zeronet_msg_id) message_receiver_clone.inbox_zeronet_msg_id = '...' ;
                                        if (message_receiver_clone.deleted_inbox_messages) message_receiver_clone.deleted_inbox_messages = '...';
                                        if (message_receiver_clone.search) message_receiver_clone.search = '...' ;
                                        if (message_receiver_clone.outbox_sender_sha256) message_receiver_clone.outbox_sender_sha256 = '...' ;
                                    }
                                    debug('reaction', pgm + 'sent_at = ' + message_with_envelope.sent_at +
                                        ', folder = ' + message_with_envelope.folder +
                                        ', reaction = ' + reaction2 +
                                        ', update_ls_reaction = ' + update_reaction_info +
                                        ', send_message_reaction_grp = ' + send_message_reaction_grp2 +
                                        ', update_like_json = ' + update_like_json +
                                        ', message_receiver = ' + JSON.stringify(message_receiver_clone)) ;

                                    // update reaction information in localStorage. Either in reactions hash or in contact.messages.reaction_info hash
                                    if (update_reaction_info) {
                                        // public chat            - use ls_reactions hash with private reactions (reactions_index: <timestamp> (outbox messages) or <timestamp>,<auth> (inbox messages))
                                        // group and private chat - use message_with_envelope.reaction_info hash
                                        // with
                                        // - my private reactions to ingoing and outgoing chat messages
                                        // - other users private reactions to my chat outbox messages
                                        if (message_with_envelope.z_filename) {
                                            // public chat - chat message only stored on ZeroNet / not in localStorage - use ls_reactions hash for reactions
                                            reactions_index = message_with_envelope.sent_at ;
                                            if (message_with_envelope.folder == 'inbox') {
                                                if (!message_sender || !message_sender.auth_address) reactions_index = null ;
                                                else reactions_index += ',' + message_sender.auth_address.substr(0,4) ;
                                            }
                                            if (reactions_index) {
                                                if (!ls_reactions[reactions_index]) ls_reactions[reactions_index] = {} ;
                                                reaction_info = ls_reactions[reactions_index]
                                            }
                                            else {
                                                // error
                                                reaction_info = null ;
                                                debug('reaction', pgm + 'error. cannot save private reaction for deleted contact');
                                                update_reaction_info = false ;
                                            }
                                        }
                                        else {
                                            // group or private chat - use message_with_envelope.reaction_info hash for reactions
                                            if (!message_with_envelope.reaction_info) message_with_envelope.reaction_info = {} ;
                                            reactions_index = 'n/a' ;
                                            reaction_info = message_with_envelope.reaction_info ;
                                        }
                                        if (reaction_info) {
                                            if (!reaction_info.users) reaction_info.users = {} ; // unique_id => emoji (anonymous reactions)
                                            if (!reaction_info.emojis) reaction_info.emojis = {} ; // emoji => count (anonymous reactions)
                                            debug('reaction', pgm + 'reactions_index = ' + reactions_index + ', old reaction_info = ' + JSON.stringify(reaction_info)) ;
                                            unique_id = get_my_unique_id() ;
                                            old_reaction = reaction_info.users[unique_id] ; // emoji or [emoji]
                                            new_reaction = reaction2 ;
                                            // group chat only. private or group chat reaction. note special syntacs [emoji] for private group chat reactions
                                            old_private_group_reaction = false ;
                                            new_private_group_reaction = false ;
                                            if ([2,3].indexOf(send_message_reaction_grp2) != -1) {
                                                if (typeof old_reaction == 'object') {
                                                    // note special notification for private group reaction [emoji] in group chat
                                                    old_reaction = old_reaction[0] ;
                                                    old_private_group_reaction = true ;
                                                }
                                                new_private_group_reaction = z_cache.user_setup.private_reactions ;
                                            }
                                            if ((old_reaction == new_reaction) && (old_private_group_reaction == new_private_group_reaction)) {
                                                debug('reaction', pgm + 'no update. old reaction = new reaction in ls_reactions.') ;
                                                update_reaction_info = false ;
                                            }
                                            else {
                                                if (old_reaction) {
                                                    if (!reaction_info.emojis[old_reaction]) reaction_info.emojis[old_reaction] = 1 ;
                                                    reaction_info.emojis[old_reaction]-- ;
                                                    if (reaction_info.emojis[old_reaction] <= 0) delete reaction_info.emojis[old_reaction] ;
                                                }
                                                if (new_reaction) {
                                                    if (!reaction_info.emojis[new_reaction]) reaction_info.emojis[new_reaction] = 0 ;
                                                    reaction_info.emojis[new_reaction]++ ;
                                                    reaction_info.users[unique_id] = new_private_group_reaction ? [new_reaction] : new_reaction ;
                                                    if (new_private_group_reaction) count2 = reaction_info.emojis[new_reaction] ;
                                                }
                                                else delete reaction_info.users[unique_id] ;

                                                // if (!send_message_reaction_grp || (send_message_reaction_grp == 2)) reaction_info.reaction_at = new Date().getTime() ;
                                                // if (update_like_json) reaction_info.reaction_at = new Date().getTime() ;
                                                reaction_info.reaction_at = update_like_json ?  new Date().getTime() : null ;
                                                if (my_private_reaction) {
                                                    // new private reaction - must remove old public reaction in z_update_6_like_json
                                                    message_with_envelope.my_private_reaction_at = reaction_info.reaction_at ;
                                                }

                                                if ([2,3].indexOf(send_message_reaction_grp2) != -1) {
                                                    // message(s) with group reactions. a little complicated. 1-2 messages (group, private or anonymous message).
                                                    action1 = message_with_envelope.folder ;
                                                    action2 = !old_reaction ? 'none' : (old_private_group_reaction ? 'private' : 'group') ;
                                                    action3 = !new_reaction ? 'none' : (new_private_group_reaction ? 'private' : 'group') ;
                                                    group_reactions = grp_reaction_action_table[action1][action2][action3];
                                                    old_action = group_reactions[0] ;
                                                    new_action = group_reactions[1] ;

                                                    // action for old reaction = message 1
                                                    if (!old_action) send_message_reaction_grp1 = 0 ;
                                                    else if (old_action.substr(0,1) == 'g') {
                                                        send_message_reaction_grp1 = 2 ;
                                                        message_receiver1 = contact ;
                                                        reaction1 = old_action == 'g' ? old_reaction : null ;
                                                        count1 = null ;
                                                    }
                                                    else if (old_action.substr(0,1) == 'a') {
                                                        send_message_reaction_grp1 = 2 ;
                                                        message_receiver1 = contact ;
                                                        reaction1 = old_reaction ;
                                                        count1 = 0 ;
                                                        for (unique_id2 in reaction_info.users) {
                                                            if (typeof reaction_info.users[unique_id2] != 'object') continue ;
                                                            if (reaction_info.users[unique_id2][0] == old_reaction) count1++ ;
                                                        }
                                                    }
                                                    else {
                                                        // p (private message) or p0 (cancel private message)
                                                        send_message_reaction_grp1 = 3 ;
                                                        message_receiver1 = message_sender ;
                                                        reaction1 = old_action == 'p' ? old_reaction : null ;
                                                        count1 = null ;
                                                        if (old_reaction) {
                                                            // special for private reactions to group chat inbox messages. doublet reaction count.
                                                            // private reaction to inbox messages is both in users and in anonymous hashes
                                                            // update now and receive more correct anonymous reaction update later
                                                            if (!reaction_info.anonymous) reaction_info.anonymous = {} ;
                                                            if (!reaction_info.anonymous[old_reaction]) reaction_info.anonymous[old_reaction] = 1 ;
                                                            reaction_info.anonymous[old_reaction]-- ;
                                                            if (reaction_info.anonymous[old_reaction] == 0) delete reaction_info.anonymous[old_reaction] ;
                                                        }
                                                    }

                                                    // action for new reaction = message 2
                                                    if (!new_action) send_message_reaction_grp2 = 0 ;
                                                    else if (new_action.substr(0,1) == 'g') {
                                                        send_message_reaction_grp2 = 2 ;
                                                        message_receiver2 = contact ;
                                                        reaction2 = new_action == 'g' ? new_reaction : null ;
                                                        count2 = null ;
                                                    }
                                                    else if (new_action.substr(0,1) == 'a') {
                                                        send_message_reaction_grp2 = 2 ;
                                                        message_receiver2 = contact ;
                                                        reaction2 = new_reaction ;
                                                        count2 = 0 ;
                                                        for (unique_id2 in reaction_info.users) if (reaction_info.users[unique_id2] == new_reaction) count2++ ;
                                                    }
                                                    else {
                                                        // p (private message) or p0 (cancel private message)
                                                        send_message_reaction_grp2 = 3 ;
                                                        message_receiver2 = message_sender ;
                                                        reaction2 = new_action == 'p' ? new_reaction : null ;
                                                        count2 = null ;
                                                        if (new_reaction) {
                                                            // special for private reactions to group chat inbox messages. doublet reaction count.
                                                            // private reaction to inbox messages is both in users and in anonymous hashes
                                                            // update now and receive more correct anonymous reaction update later
                                                            if (!reaction_info.anonymous) reaction_info.anonymous = {} ;
                                                            if (!reaction_info.anonymous[new_reaction]) reaction_info.anonymous[new_reaction] = 0 ;
                                                            reaction_info.anonymous[new_reaction]++ ;
                                                        }
                                                    }

                                                }

                                                local_storage_updated = true ;
                                                debug('reaction', pgm + 'reactions_index = ' + reactions_index + ', new reaction_info = ' + JSON.stringify(reaction_info)) ;
                                            }
                                        }
                                        if (z_cache.user_setup.private_reactions) delete message_with_envelope.reaction_at ;
                                    }

                                    // send 1-2 private messages. normally only one message. two messages in some special cases
                                    if (send_message_reaction_grp1 || send_message_reaction_grp2) {
                                        send_msg = function (send_message_reaction_grp, message_receiver, reaction, count) {
                                            var message ;
                                            // check receiver
                                            if (send_message_reaction_grp == 3) {
                                                // private reaction to a group chat inbox message. check sender/creator of message
                                                if (!message_receiver) {
                                                    console.log(pgm + 'private reaction was not sent. Group chat contact with unique id ' +
                                                        unique_id + ' was not found. message_with_envelope.participant = ' + message_with_envelope.participant +
                                                        ', contact.participants = ' + JSON.stringify(contact.participants)) ;
                                                    delete message_with_envelope.reaction_at ;
                                                    local_storage_updated = true ;
                                                    return ;
                                                }
                                            }
                                            else message_receiver = contact ;
                                            if (send_message_reaction_grp == 2) {
                                                // group chat message - receiver must have a group chat password
                                                if (!message_receiver.password) {
                                                    console.log(pgm + 'public group reaction was not sent. group chat password was not found for contact with unique id ' + contact.unique_id) ;
                                                    delete message_with_envelope.reaction_at ;
                                                    local_storage_updated = true ;
                                                    return ;
                                                }
                                            }
                                            else {
                                                // private message - receiver must have a public key
                                                if (!message_receiver.pubkey) {
                                                    console.log(pgm + 'private reaction was not sent. public key was not found for contact with unique id ' + contact.unique_id) ;
                                                    delete message_with_envelope.reaction_at ;
                                                    local_storage_updated = true ;
                                                    return ;
                                                }
                                            }
                                            // add private reaction message
                                            debug('reaction', pgm + 'send_message_reaction_grp = ' + send_message_reaction_grp +
                                                ', z_filename = ' + message_with_envelope.z_filename +
                                                ', contact.type = ' + contact.type +
                                                ', user_setup.private_reactions = ' + z_cache.user_setup.private_reactions);
                                            message = {
                                                msgtype: 'reaction',
                                                timestamp: message_with_envelope.sent_at,
                                                reaction: reaction,
                                                count: count,
                                                reaction_at: reaction_at,
                                                reaction_grp: send_message_reaction_grp
                                            } ;
                                            if (!message.reaction) delete message.reaction ;
                                            if (typeof message.count != 'number') delete message.count ; // null or undefined
                                            debug('reaction', pgm + 'message = ' + JSON.stringify(message)) ;
                                            // validate json
                                            error = MoneyNetworkHelper.validate_json(pgm, message, message.msgtype, 'Could not send private reaction message');
                                            if (error) {
                                                console.log(pgm + 'System error: ' + error) ;
                                                console.log(pgm + 'message = ' + JSON.stringify(message)) ;
                                                delete message_with_envelope.reaction_at ;
                                                local_storage_updated = true ;
                                                return ;
                                            }
                                            // OK. add message
                                            add_msg(message_receiver, message);
                                            local_storage_updated = true ;
                                        } ; // send_msg
                                        if (send_message_reaction_grp1) send_msg(send_message_reaction_grp1, message_receiver1, reaction1, count1) ;
                                        if (send_message_reaction_grp2) send_msg(send_message_reaction_grp2, message_receiver2, reaction2, count2) ;
                                    }

                                    if (!update_like_json) delete message_with_envelope.reaction_at ;

                                    // if (message_with_envelope.sent_at == 1487507580448) debug('reaction', pgm + 'message_with_envelope = ' + JSON.stringify(message_with_envelope));

                                } // for j (messages)
                            } // for i (contacts)

                            // insert and encrypt new outgoing messages into data.json
                            // using callback technique (not required for JSEncrypt but used in cryptMessage plugin)
                            // will call data cleanup, write and publish when finished encrypting messages
                            z_update_2a_data_json_encrypt (local_storage_updated, data_json_max_size, data, data_str) ;

                        }); // get_data_json callback 4

                    }); // dbQuery callback 3

                }) ; // get_like_json callback 2

            }) ; // get_my_user_hub callback 1

        } // z_update_1_data_json
        moneyNetworkHubService.inject_functions({z_update_1_data_json: z_update_1_data_json}) ;

        // update zeronet step 2a. update "data.json" file. encrypt and insert new outbox messages in msg arrays
        // step 2a will call step 2b for all cryptMessage encrypted outbox messages 
        function z_update_2a_data_json_encrypt (local_storage_updated, data_json_max_size, data, data_str) {

            var pgm = service + '.z_update_2a_data_json_encrypt: ' ;
            var old_userid ;
            old_userid = z_cache.user_id ;
            if (detected_client_log_out(pgm, old_userid)) return z_update_7_done();
            console.log(pgm + 'calling get_my_user_hub');

            get_my_user_hub(function (my_user_data_hub, other_user_hub, other_user_hub_title) {

                var i, contact, encrypt, j, message_with_envelope, message, local_msg_seq, sent_at, key, password,
                    receiver_sha256, k, sender_sha256, image, encrypted_message_str, seq, js_messages_row, resend,
                    user_path, image_path, image_e1, image_e1c1, image_json, json_raw, upload_image_json, error,
                    last_online, debug_seq ;
                if (detected_client_log_out(pgm, old_userid)) return z_update_7_done();

                user_path = "merged-" + get_merged_type() + "/" + my_user_data_hub + "/data/users/" + ZeroFrame.site_info.auth_address ;

                for (i=0 ; i<ls_contacts.length ; i++) {
                    contact = ls_contacts[i] ;
                    if (contact.type == 'public') continue ;
                    encrypt = null ;
                    for (j=0 ; j<contact.messages.length ; j++) {
                        message_with_envelope = contact.messages[j] ;
                        if (message_with_envelope.folder != 'outbox') continue ;

                        // new outgoing messages
                        if (!message_with_envelope.sent_at) {
                            // not sent - encrypt and insert new message in data.msg array (data.json)
                            message = message_with_envelope.message ;
                            // check public key
                            if (contact.type != 'group') {
                                if (!contact.pubkey || (('' + contact.encryption == '2') && !contact.pubkey2)) {
                                    // cannot send message without public key for encryption
                                    if (message.sent_at) {
                                        // received missing message notification from other contact. cannot resend message without a public key
                                        if (('' + contact.encryption == '2') && !contact.pubkey2) {
                                            console.log(pgm + 'Cannot resend lost message. contact does not have a public key (cryptMessage)');
                                        }
                                        else {
                                            console.log(pgm + 'Cannot resend lost message. contact does not have a public key (JSEncrypt)');
                                        }
                                        console.log(pgm + 'contact.cert_user_id = ' + contact.cert_user_id + ', contact.auth_address = ' + contact.auth_address) ;
                                        console.log(pgm + 'message_with_envelope = ' + JSON.stringify(message_with_envelope)) ;
                                        // restore as a normal sent message
                                        message_with_envelope.sent_at = message.sent_at ;
                                        delete message.sent_at ;
                                        // restart loop
                                        z_update_2a_data_json_encrypt (local_storage_updated, data_json_max_size, data, data_str) ;
                                        return ;
                                    }
                                    else {
                                        if (('' + contact.encryption == '2') && !contact.pubkey2) {
                                            console.log(pgm + 'Cannot send message. contact does not have a public key (cryptMessage)');
                                            z_wrapper_notification(['error', 'Cannot send message<br>contact does not have a public key<br>(cryptMessage encryption)'])
                                        }
                                        else {
                                            console.log(pgm + 'Cannot send message. contact does not have a public key (JSEncrypt)');
                                            z_wrapper_notification(['error', 'Cannot send message<br>contact does not have a public key<br>(JSEncrypt encryption)'])
                                        }

                                    }
                                    console.log(pgm + 'contact.pubkey = ' + contact.pubkey) ;
                                    console.log(pgm + 'contact.pubkey2 = ' + contact.pubkey2) ;
                                    console.log(pgm + 'contact.encryption = ' + contact.encryption) ;
                                    // contact.pubkey2 = undefined
                                    // contact.encryption = 2
                                    console.log(pgm + 'message_with_envelope = ' + JSON.stringify(message_with_envelope)) ;

                                    console.log(pgm + 'deleting message') ;
                                    // delete invalid message
                                    js_messages_row = get_message_by_seq(message.seq) ;
                                    if (js_messages_row) remove_message(js_messages_row) ; // new cleanup method
                                    else {
                                        // old cleanup method (if seq is null)
                                        contact.messages.splice(j,1);
                                        for (k=js_messages.length-1 ; k>= 0 ; k--) {
                                            if (js_messages[k].message == message_with_envelope) {
                                                js_messages.splice(k,1) ;
                                            }
                                        }
                                    }
                                    // restart loop
                                    z_update_2a_data_json_encrypt (local_storage_updated, data_json_max_size, data, data_str) ;
                                    return ;
                                }
                            }
                            // add local_msg_seq. used as internal message id
                            if (message_with_envelope.local_msg_seq) {
                                // resending old message - already local_msg_seq already in message
                                local_msg_seq = message_with_envelope.local_msg_seq ;
                                sent_at = message.sent_at ;
                                debug('lost_message', pgm + 'resending lost message with local_msg_seq ' + local_msg_seq +
                                    ', message_with_envelope = ' + JSON.stringify(message_with_envelope));
                                resend = true ; // extra debug messages
                            }
                            else {
                                local_msg_seq = next_local_msg_seq() ;
                                // message_with_envelope.local_msg_seq = local_msg_seq;
                                // js_messages_row = js_messages_index.seq[message_with_envelope.seq] ;
                                js_messages_row = get_message_by_seq(message_with_envelope.seq) ;
                                //console.log(pgm + 'test - adding missing js_messages_index.local_msg_seq index. ' +
                                //    'message_with_envelope.seq = ' + message_with_envelope.seq +
                                //    ', js_messages_row = ' + JSON.stringify(js_messages_row) +
                                //    ', js_messages_index.local_msg_seq[' + local_msg_seq + '] = ' + js_messages_index.local_msg_seq[local_msg_seq] +
                                //    ' (should be null)');
                                message_add_local_msg_seq(js_messages_row, local_msg_seq) ;
                                // js_messages_index.local_msg_seq[local_msg_seq] = js_messages_row ;
                                sent_at = new Date().getTime() ;
                                // parent = 'todo' ; ????
                                resend = false ;
                            }
                            message.local_msg_seq = local_msg_seq ;
                            // receiver_sha256
                            if (contact.type == 'group') receiver_sha256 = CryptoJS.SHA256(contact.password).toString();
                            else {
                                // find receiver_sha256. Use last received sender_sha256 address from contact
                                // exception: remove + add contact messages can be used to reset communication
                                if (message.msgtype != 'contact added') receiver_sha256 = contact.inbox_last_sender_sha256 ;
                                if (!receiver_sha256) {
                                    receiver_sha256 = CryptoJS.SHA256(contact.pubkey).toString();
                                    debug('outbox && unencrypted', pgm + 'first contact. using sha256 values of JSEncrypt pubkey as receiver_sha256. pubkey = ' + contact.pubkey + ', receiver_sha256 = ' + receiver_sha256);
                                }
                            }
                            // sender_sha256
                            if (contact.type != 'group') {
                                // add random sender_sha256 address. No sender_sha256 in group chat. see feedback information
                                sender_sha256 = CryptoJS.SHA256(generate_random_password()).toString();
                                message_with_envelope.sender_sha256 = sender_sha256;
                                message.sender_sha256 = sender_sha256 ;
                                // update js_messages_index.sender_sha256
                                seq = message_with_envelope.seq ;
                                if (seq) js_messages_row = get_message_by_seq(seq) ;
                                if (js_messages_row) {
                                    // console.log(pgm + 'adding sender_sha256 address ' + sender_sha256 + ' to js_messages sender_sha256 index') ;
                                    message_add_sender_sha256(js_messages_row, sender_sha256) ;
                                    //js_messages_index.sender_sha256[sender_sha256] = js_messages_row ;
                                }
                                else if (seq) {
                                    console.log(pgm + 'error: not no js_messages_row with seq ' + seq + '. cannot add sender_sha256 address ' + sender_sha256 + ' to js_messages sender_sha256 index') ;
                                }
                                else {
                                    console.log(pgm + 'error: no message_with_envelope.seq. cannot add sender_sha256 address ' + sender_sha256 + ' to js_messages sender_sha256 index') ;
                                }
                                // check this new sha256 address in incoming data.json files (file done event / process_incoming_message)
                                watch_receiver_sha256.push(sender_sha256) ;
                            }

                            // add feedback info to outgoing message.
                            if (resend) {
                                debug('lost_message', pgm + 'resend. calling add_feedback_info for old message with local_msg_seq ' +
                                    local_msg_seq + ', message = ' + JSON.stringify(message));
                            }
                            add_feedback_info(receiver_sha256, message_with_envelope, contact);
                            if (resend) {
                                debug('lost_message', pgm + 'resend. called add_feedback_info for old message with local_msg_seq ' +
                                    local_msg_seq + ', message = ' + JSON.stringify(message));
                            }


                            // move image (UI) to envelope before send and back to message after send
                            delete message_with_envelope.image ;
                            upload_image_json = false ;
                            if (message.replace_unchanged_image_with_x) {
                                // sending x = unchanged image
                                delete message.replace_unchanged_image_with_x ;
                                message_with_envelope.image = message.image ;
                                message.image = 'x' ;
                            }
                            else if (message.image) {
                                // sending image as optional file
                                message_with_envelope.image = message.image ;
                                message.image = true ;
                                upload_image_json = true ;
                            }
                            //console.log(pgm + 'debug - some messages are not delivered');
                            //console.log(pgm + 'sending ' + message.msgtype + ' to ' + receiver_sha256) ;
                            debug('outbox && unencrypted', pgm + 'sending message = ' + JSON.stringify(message));

                            // encrypt. 3 different encryption models.
                            // group chat. symmetric encryption
                            // encryption = 1: JSEncrypt. RSA + symmetric encryption. no callbacks
                            // encryption = 2: cryptMessage plugin. eciesEncrypt + aesEncrypt with callbacks
                            if (contact.type == 'group') {
                                // simple symmetric encryption only using contact.password
                                // problem. too easy to identify group chat messages
                                //   a) no key - could add a random key
                                //   b) identical receiver_sha256 for all messages in chat group. could add a pseudo random receiver_sha256
                                key = null ;
                                password = contact.password ;
                                receiver_sha256 = CryptoJS.SHA256(password).toString();
                            }
                            else if ('' + contact.encryption != '2') {
                                debug('lost_message', pgm + 'using JSEncrypt. contact.encryption = ' + JSON.stringify(contact.encryption));
                                // JSEncrypt
                                message_with_envelope.encryption = 1 ;
                                if (!encrypt) {
                                    encrypt = new JSEncrypt();
                                    encrypt.setPublicKey(contact.pubkey);
                                }
                                // rsa encrypted key, symmetric encrypted message
                                password = generate_random_password();
                                if (encrypt.key.n.bitLength() <= 1024) password = password.substr(0,100) ;
                                key = encrypt.encrypt(password);
                                // console.log(pgm + 'password = ' + password + ', key = ' + key);
                                if (!key) {
                                    //delete zeronet_file_locked[data_json_path] ;
                                    throw pgm + 'System error. Encryption error. key = ' + key + ', password = ' + password ;
                                    continue ;
                                }
                            }
                            else {
                                // cryptMessage plugin encryption
                                debug('lost_message', pgm + 'using cryptMessage. contact.encryption = ' + JSON.stringify(contact.encryption));
                                message_with_envelope.encryption = 2 ;
                                // 3 callbacks. 1) generate password, 2) encrypt password=key and 3) encrypt message,
                                if (resend) debug('lost_message', pgm + 'resend. calling z_update_data_cryptmessage for old message with local_msg_seq ' + local_msg_seq) ;
                                z_update_2b_data_json_encrypt (
                                    true, data_json_max_size, data, data_str,
                                    contact.pubkey2, message_with_envelope, receiver_sha256, sent_at
                                ) ;
                                // stop. z_update_data_cryptmessage will callback to this function when done with this message
                                return ;
                            }

                            // same post encryption cleanup as in z_update_data_cryptmessage
                            encrypted_message_str = MoneyNetworkHelper.encrypt(JSON.stringify(remove_hashkey(message)), password);
                            if (message_with_envelope.image) {
                                // restore image
                                message.image = message_with_envelope.image ;
                                delete message_with_envelope.image ;
                            }
                            delete message.sender_sha256 ; // info is in message_with_envelope
                            delete message.local_msg_seq ; // info is in message_with_envelope
                            // delete message.feedback_info ; // todo: no reason to keep feedback info?
                            message_with_envelope.zeronet_msg_id = CryptoJS.SHA256(encrypted_message_str).toString();
                            message_with_envelope.sent_at = sent_at ;
                            add_message_parent_index(message_with_envelope) ;
                            // console.log(pgm + 'new local_storage_messages[' + i + '] = ' + JSON.stringify(message));
                            // console.log(pgm + 'old data.msg.length = ' + data.msg.length) ;
                            data.msg.push({
                                user_seq: z_cache.user_seq,
                                receiver_sha256: receiver_sha256,
                                key: key,
                                message: encrypted_message_str,
                                message_sha256: message_with_envelope.zeronet_msg_id,
                                timestamp: sent_at
                            });
                            // keep track of msg disk usage.User may want to delete biggest messages first when running out of disk space on zeronet
                            message_with_envelope.zeronet_msg_size = JSON.stringify(data.msg[data.msg.length-1]).length ;
                            message_with_envelope.ls_msg_size = JSON.stringify(message_with_envelope).length ;
                            debug('outbox && encrypted', 'new data.msg row = ' + JSON.stringify(data.msg[data.msg.length-1]));
                            // console.log(pgm + 'new data.msg.length = ' + data.msg.length) ;

                            // group chat. last online = timestamp for last message
                            if (contact.type == 'group') {
                                last_online = MoneyNetworkHelper.get_last_online(contact) || 0 ;
                                if (Math.round(sent_at/1000) > last_online) set_last_online(contact, Math.round(sent_at/1000)) ;
                            }

                            if ((message.msgtype == 'chat msg') && !message.message) {
                                // logical deleted just sent empty chat messages
                                // will be physical deleted in next ls_save_contacts call
                                message_with_envelope.deleted_at = new Date().getTime() ;
                            }

                            // message with image? save image in an optional file.encrypted with same password as message in data.json
                            // console.log(pgm + 'message_with_envelope = ' + JSON.stringify(message_with_envelope)) ;
                            if (upload_image_json) {
                                image_path = user_path + '/' + sent_at + '-' + z_cache.user_seq + '-image.json';
                                // image encrypt and compress
                                image_e1 = MoneyNetworkHelper.encrypt(message.image, password) ;
                                image_e1c1 = MoneyNetworkHelper.compress1(image_e1) ;
                                console.log(pgm + 'image_e1.length = ' + image_e1.length) ;
                                console.log(pgm + 'image_e1c1.length = ' + image_e1c1.length) ;
                                // console.log(pgm + 'image_c1e1.length = ' + image_c1e1.length) ;
                                if (z_cache.user_setup.test && z_cache.user_setup.test.image_compress_disabled) {
                                    image_json = { image: image_e1, storage: { image: 'e1'} };
                                }
                                else {
                                    image_json = { image: image_e1c1, storage: { image: 'e1,c1'} };
                                }
                                // validate -image.json before upload
                                error = MoneyNetworkHelper.validate_json (pgm, image_json, 'image-file', 'Invalid json file') ;
                                if (error) {
                                    console.log(pgm + 'cannot write -image.json file ' + image_path + '. json is invalid: ' + error) ;
                                    // continue with other messages to encrypt - callback to z_update_2a_data_json_encrypt
                                    z_update_2a_data_json_encrypt (true, data_json_max_size, data, data_str);
                                    return ;
                                }
                                json_raw = unescape(encodeURIComponent(JSON.stringify(image_json, null, "\t")));
                                console.log(pgm + 'image==true: uploading image file ' + image_path) ;
                                // debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + image_path + ' fileWrite') ;
                                // debug_seq = debug_z_api_operation_start(pgm, image_path, 'fileWrite', show_debug('z_file_write')) ;
                                z_file_write(pgm, image_path, btoa(json_raw), function (res) {
                                //ZeroFrame.cmd("fileWrite", [image_path, btoa(json_raw)], function (res) {
                                    var pgm = service + '.z_update_2a_data_json_encrypt fileWrite callback: ';
                                    // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                    // debug_z_api_operation_end(debug_seq, format_res(res)) ;
                                    if (detected_client_log_out(pgm, old_userid)) return z_update_7_done() ;
                                    debug('outbox', pgm + 'res = ' + JSON.stringify(res));
                                    console.log(pgm + 'image==true: uploaded image file ' + image_path + '. res = ' + JSON.stringify(res)) ;
                                    // continue with other messages to encrypt - callback to z_update_2a_data_json_encrypt
                                    z_update_2a_data_json_encrypt (true, data_json_max_size, data, data_str)
                                }); // fileWrite
                                return ; // stop- writeFile callback will continue process
                            }

                            // message without image. just continue loop
                            local_storage_updated = true ;
                            continue ;
                        } // if

                        if (message_with_envelope.zeronet_msg_id && !message_with_envelope.zeronet_msg_size) {
                            // add new field zeronet_msg_size
                            for (k=0 ; k<data.msg.length ; k++) {
                                if (data.msg[k].message_sha256 == message_with_envelope.zeronet_msg_id) {
                                    message_with_envelope.zeronet_msg_size = JSON.stringify(data.msg[k]).length ;
                                }
                            } // for k (data.msg)
                        } // if

                    } // for j (contact.messages)
                } // for i (contacts)

                // console.log(pgm + 'localStorage.messages (2) = ' + JSON.stringify(local_storage_messages));
                // console.log(pgm + 'ZeroNet data.msg (2) = ' + JSON.stringify(data.msg));

                // no more messages to encrypt. continue with cleanup, write and publish data.json

                // update data.json step 3. cleanup. try to keep data.json file small. check max user dictionary size
                if (z_update_3_data_json_cleanup (local_storage_updated, data_json_max_size, data)) {
                    // Cleanup OK - write data.json file and continue with any public outbox messages
                    if (detected_client_log_out(pgm, old_userid)) {
                        console.log(pgm + 'detected_client_log_out. stop') ;
                        return z_update_7_done();
                    }
                    z_update_4_data_json_write (data, data_str) ;
                }
                else {
                    // stop: cannot write and publish. data.json file is too big. error notification already in UI
                    console.log(pgm + 'cannot write and publish. data.json file is too big. error notification already in UI') ;
                    z_update_7_done() ;
                }


            }); // get_my_user_hub

        } // z_update_2a_data_json_encrypt


        // update zeronet step 2b. update "data.json" file. encrypt and insert new outbox messages in msg arrays
        // step 2b encrypt a cryptMessage encrypted outbox message
        // step 2b will call step 2a when done  
        // Zeronet cryptMessage plugin - three callbacks and "return" to z_update_data_encrypt_message when done
        function z_update_2b_data_json_encrypt (local_storage_updated, data_json_max_size, data, data_str,
                                                pubkey2, message_with_envelope, receiver_sha256, sent_at)
        {
            var pgm = service + '.z_update_2b_data_json_encrypt: ' ;
            var old_userid ;
            old_userid = z_cache.user_id ;

            if (detected_client_log_out(pgm, old_userid)) return z_update_7_done();
            debug('outbox && unencrypted', pgm + 'sending message = ' + JSON.stringify(message_with_envelope.message));
            if (!sent_at) {
                console.log(pgm + 'Invalid call. sent_at was null. using now') ;
                sent_at = new Date().getTime() ;
            }
            console.log(pgm + 'calling get_my_user_hub');

            get_my_user_hub(function (my_user_data_hub, other_user_hub, other_user_hub_title) {
                var pgm = service + '.z_update_2b_data_json_encrypt get_my_user_hub callback 1: ';
                var debug_seq1 ;
                if (detected_client_log_out(pgm, old_userid)) return z_update_7_done();
                debug_seq1 = debug_z_api_operation_start(pgm, null, 'aesEncrypt', show_debug('z_crypt_message')) ;
                ZeroFrame.cmd("aesEncrypt", [""], function (res) {
                    var pgm = service + '.z_update_2b_data_json_encrypt aesEncrypt callback 2: ';
                    var password, debug_seq2 ;
                    debug_z_api_operation_end(debug_seq1, null) ;
                    password = res[0];
                    // debug_seq2 = MoneyNetworkHelper.debug_z_api_operation_start('z_crypt_message', pgm + 'eciesEncrypt') ;
                    debug_seq2 = debug_z_api_operation_start(pgm, null, 'eciesEncrypt', show_debug('z_crypt_message')) ;
                    ZeroFrame.cmd("eciesEncrypt", [password, pubkey2], function (key) {
                        var pgm = service + '.z_update_2b_data_json_encrypt eciesEncrypt callback 3: ';
                        var debug_seq3 ;
                        // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq2) ;
                        debug_z_api_operation_end(debug_seq2, key ? 'OK' : 'Failed. No key') ;
                        // encrypt step 3 - aes encrypt message
                        // debug_seq3 = MoneyNetworkHelper.debug_z_api_operation_start('z_crypt_message', pgm + 'aesEncrypt') ;
                        debug_seq3 = debug_z_api_operation_start(pgm, null, 'aesEncrypt', show_debug('z_crypt_message')) ;
                        ZeroFrame.cmd("aesEncrypt", [JSON.stringify(remove_hashkey(message_with_envelope.message)), password], function (msg_res) {
                            var pgm = service + '.z_update_2b_data_json_encrypt aesEncrypt callback 4: ';
                            var iv, encrypted_message_str, message, upload_image_json, debug_seq4 ;
                            // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq3) ;
                            debug_z_api_operation_end(debug_seq3, null) ;
                            iv = msg_res[1] ;
                            encrypted_message_str = msg_res[2];
                            debug('outbox && encrypted', pgm + 'iv = ' + iv + ', encrypted_message_str = ' + encrypted_message_str);

                            // same post encryption cleanup as in z_update_data_encrypt_message
                            message = message_with_envelope.message ;
                            if (message_with_envelope.image) {
                                // restore image
                                if (message.image == true) upload_image_json = true ; // must encrypt and upload image as an optional json file
                                message.image = message_with_envelope.image ;
                                delete message_with_envelope.image ;
                            }
                            delete message.sender_sha256 ; // info is in message_with_envelope
                            delete message.local_msg_seq ; // info is in message_with_envelope
                            // delete message.feedback_info ; // todo: any reason to keep feedback info in message?
                            message_with_envelope.zeronet_msg_id = CryptoJS.SHA256(encrypted_message_str).toString();
                            message_with_envelope.sent_at = sent_at ;
                            if (message_with_envelope.message.sent_at) {
                                debug('lost_message', pgm + 'resend OK for local_msg_seq ' + message_with_envelope.local_msg_seq +
                                    '. removing resend information sent_at and message_sha256 message') ;
                                delete message_with_envelope.message.sent_at ;
                                delete message_with_envelope.message.message_sha256 ;
                            }
                            add_message_parent_index(message_with_envelope) ;
                            // console.log(pgm + 'new local_storage_messages[' + i + '] = ' + JSON.stringify(message));
                            // console.log(pgm + 'old data.msg.length = ' + data.msg.length) ;

                            // insert into data.msg array
                            data.msg.push({
                                user_seq: z_cache.user_seq,
                                receiver_sha256: receiver_sha256,
                                key: key,
                                message: iv + ',' + encrypted_message_str,
                                message_sha256: message_with_envelope.zeronet_msg_id,
                                timestamp: sent_at
                            });
                            // keep track of msg disk usage.User may want to delete biggest messages first when running out of disk space on zeronet
                            message_with_envelope.zeronet_msg_size = JSON.stringify(data.msg[data.msg.length-1]).length ;
                            message_with_envelope.ls_msg_size = JSON.stringify(message_with_envelope).length ;
                            // console.log(pgm + 'new data.msg.last = ' + JSON.stringify(data.msg[data.msg.length-1]));
                            // console.log(pgm + 'new data.msg.length = ' + data.msg.length) ;

                            if ((message.msgtype == 'chat msg') && !message.message) {
                                // logical deleted just sent empty chat messages
                                // will be physical deleted in next ls_save_contacts call
                                message_with_envelope.deleted_at = new Date().getTime() ;
                            }

                            if (upload_image_json) {
                                // message with image. must encrypt and upload image as an optional json file
                                // cryptMessage encrypt image using same key/password as for message
                                // encrypt step 4 - aes encrypt image
                                // debug_seq4 = MoneyNetworkHelper.debug_z_api_operation_start('z_crypt_message', pgm + 'aesEncrypt') ;
                                debug_seq4 = debug_z_api_operation_start(pgm, null, 'aesEncrypt', show_debug('z_crypt_message')) ;
                                ZeroFrame.cmd("aesEncrypt", [message.image, password], function (image_res) {
                                    var pgm = service + '.z_update_2b_data_json_encrypt aesEncrypt callback 4: ';
                                    var iv, encrypted_image_str, user_path, image_path, image_json, json_raw, error,
                                        debug_seq ;
                                    // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq4) ;
                                    debug_z_api_operation_end(debug_seq4, null) ;
                                    iv = image_res[1] ;
                                    encrypted_image_str = image_res[2];
                                    debug('outbox && encrypted', pgm + 'iv = ' + iv + ', encrypted_image_str = ' + encrypted_image_str);
                                    user_path = "merged-" + get_merged_type() + "/" + my_user_data_hub + "/data/users/" + ZeroFrame.site_info.auth_address ;
                                    image_path = user_path + '/' + message_with_envelope.sent_at + '-' + z_cache.user_seq + '-image.json';
                                    // optional compress encrypted image
                                    if (z_cache.user_setup.test && z_cache.user_setup.test.image_compress_disabled) {
                                        // encrypt only
                                        image_json = {
                                            image: iv + ',' + encrypted_image_str,
                                            storage: { image: 'e2'}
                                        };
                                        console.log(pgm + 'image.length    = ' + message.image.length) ;
                                        console.log(pgm + 'image.e2.length = ' + (iv + ',' + encrypted_image_str).length) ;
                                    }
                                    else {
                                        // encrypt and compress
                                        image_json = {
                                            image: MoneyNetworkHelper.compress1(iv + ',' + encrypted_image_str),
                                            storage: { image: 'e2,c1'}
                                        };
                                        console.log(pgm + 'image.length      = ' + message.image.length) ;
                                        console.log(pgm + 'image.e2.length   = ' + (iv + ',' + encrypted_image_str).length) ;
                                        console.log(pgm + 'image.e2c1.length = ' + image_json.image.length) ;
                                    }
                                    // validate -image.json before upload
                                    error = MoneyNetworkHelper.validate_json (pgm, image_json, 'image-file', 'Invalid json file') ;
                                    if (error) {
                                        console.log(pgm + 'cannot write -image.json file ' + image_path + '. json is invalid: ' + error) ;
                                        // continue with other messages to encrypt - callback to z_update_2a_data_json_encrypt
                                        z_update_2a_data_json_encrypt (local_storage_updated, data_json_max_size, data, data_str) ;
                                        return ;
                                    }
                                    // upload
                                    json_raw = unescape(encodeURIComponent(JSON.stringify(image_json, null, "\t")));
                                    console.log(pgm + 'image==true: uploading image file ' + image_path) ;
                                    // debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + image_path + ' fileWrite') ;
                                    debug_seq = debug_z_api_operation_start(pgm, image_path, 'fileWrite', show_debug('z_file_write')) ;
                                    z_file_write(pgm, image_path, btoa(json_raw), function (res) {
                                    // ZeroFrame.cmd("fileWrite", [image_path, btoa(json_raw)], function (res) {
                                        var pgm = service + '.z_update_2b_data_json_encrypt fileWrite callback 5: ';
                                        // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                        debug_z_api_operation_end(debug_seq, format_res(res)) ;
                                        debug('outbox', pgm + 'res = ' + JSON.stringify(res));
                                        console.log(pgm + 'image==true: uploaded image file ' + image_path + '. res = ' + JSON.stringify(res)) ;

                                        // continue with other messages to encrypt - callback to z_update_2a_data_json_encrypt
                                        z_update_2a_data_json_encrypt (local_storage_updated, data_json_max_size, data, data_str) ;

                                    }); // fileWrite callback 5

                                }) ; // aesEncrypt callback 4

                                // stop. fileWrite callback 5 will continue callback sequence
                                return ;
                            }

                            // continue with other messages to encrypt - callback to z_update_2a_data_json_encrypt
                            z_update_2a_data_json_encrypt (local_storage_updated, data_json_max_size, data, data_str) ;

                        }); // aesEncrypt callback 4

                    }); // eciesEncrypt callback 3

                }); // aesEncrypt callback 2

            }); // get_my_user_hub callback 1


        } // z_update_2b_data_json_encrypt


        // update zeronet step 3. update "data.json" file. cleanup old messages in msg array
        // data.json file must be as small as possible for fast communication
        // also checking max user directory size
        // returns true if OK. returns false if data.json er too big for write and publish
        var DATA_FILE_SIZE = 20000 ;

        function z_update_3_data_json_cleanup(local_storage_updated, data_json_max_size, data) {


            var pgm = service + '.z_update_3_data_json_cleanup: ';

            var i, j, k, json_raw, data_clone, data_json_other_users_size, now, one_hour_ago, msg_user_seqs, data_removed,
                count, contact, contact_last_online, outbox_message, no_feedback_expected, no_feedback_received,
                available, error, user_seq, old_userid;
            old_userid = z_cache.user_id ;
            if (detected_client_log_out(pgm, old_userid)) return z_update_7_done();

            // calculate number of bytes used by other users in data.json file
            user_seq = z_cache.user_seq;
            data_clone = JSON.parse(JSON.stringify(data));
            delete data_clone.version;
            for (i = data_clone.users.length - 1; i >= 0; i--) {
                if (data_clone.users[i].user_seq == user_seq) data_clone.users.splice(i, 1);
            }
            if (data_clone.users.length == 0) delete data_clone.users;
            for (i = data_clone.search.length - 1; i >= 0; i--) {
                if (data_clone.search[i].user_seq == user_seq) data_clone.search.splice(i, 1);
            }
            if (data_clone.search.length == 0) delete data_clone.search;
            for (i = data_clone.msg.length - 1; i >= 0; i--) {
                if (data_clone.msg[i].user_seq == user_seq) data_clone.msg.splice(i, 1);
            }
            if (data_clone.msg.length == 0) delete data_clone.msg;
            if (JSON.stringify(data_clone) == JSON.stringify({}))  data_json_other_users_size = 0;
            else {
                json_raw = unescape(encodeURIComponent(JSON.stringify(data_clone, null, "\t")));
                data_json_other_users_size = json_raw.length;
            }
            // debug('data_cleanup', pgm + 'data_json_other_users_size = ' + data_json_other_users_size + ', user_seq = ' + user_seq + ', data_clone = ' + JSON.stringify(data_clone)) ;

            // check file size. Try to keep data.json file size small for fast communication and small site
            // always keep messages for last hour.
            // data.json size must also be <data_json_max_size
            now = new Date().getTime();
            one_hour_ago = now - 1000 * 60 * 60;
            count = 0;
            while (true) {
                json_raw = unescape(encodeURIComponent(JSON.stringify(data, null, "\t")));
                if (json_raw.length < DATA_FILE_SIZE + data_json_other_users_size) break; // OK - small file

                debug('data_cleanup', pgm + 'data.json is big. size ' + json_raw.length + '. limit ' + (DATA_FILE_SIZE + data_json_other_users_size) + ' removing old data ...');
                count = count + 1;
                if (count > 1000) {
                    console.log(pgm + 'Ups. System error. Something is wrong here. looping forever!');
                    break;
                }
                data_removed = false;

                // a) delete users without any messages (not current user)
                msg_user_seqs = [];
                if (!data.msg) data.msg = [];
                if (!data.search) data.search = [];
                for (i = 0; i < data.msg.length; i++) {
                    if (msg_user_seqs.indexOf(data.msg[i].user_seq) == -1) msg_user_seqs.push(data.msg[i].user_seq);
                }
                for (i = 0; i < data.users.length; i++) {
                    if (data.users[i].user_seq == user_seq) continue;
                    if (msg_user_seqs.indexOf(data.users[i].user_seq) != -1) continue;
                    // remove search words
                    for (j = data.search.length - 1; j >= 0; j--) {
                        if (data.search[j].user_seq == data.users[i].user_seq) data.search.splice(j, 1);
                    }
                    // remove user and recheck file size
                    data.users.splice(i, 1);
                    debug('a: data_cleanup', pgm + 'data.json is big. removed user without any messages');
                    data_removed = true;
                    break;
                } // for i (users)
                if (data_removed) continue; // recheck data.json size

                // new b) cleanup msg that has been received by contact. outbox_message.feedback = unix timestamp
                // feedback either as inbox.receiver_sha256 = outbox.sendersha256 or as feedback hash in messages
                for (i = 0; i < ls_contacts.length; i++) {
                    contact = ls_contacts[i];
                    if (contact.type == 'group') no_feedback_expected = contact.participants.length - 1;
                    if (!contact.messages) continue;
                    for (j = 0; j < contact.messages.length; j++) {
                        if (contact.messages[j].folder != 'outbox') continue;
                        if (!contact.messages[j].zeronet_msg_id) continue;
                        if (contact.type == 'group') {
                            // group chat. feedback = object. expects one receipt for each participant in group chat
                            if (!contact.messages[j].feedback) no_feedback_received = 0;
                            else no_feedback_received = Object.keys(contact.messages[j].feedback).length;
                            if (no_feedback_received < no_feedback_expected) continue;
                        }
                        else {
                            // normal chat. feedback = boolean. expects one receipt
                            if (!contact.messages[j].feedback) continue;
                        }
                        outbox_message = contact.messages[j];
                        // found a outbox message that have been received by contact
                        // remove outbox message from msg array in data.json file
                        for (k = data.msg.length - 1; k >= 0; k--) {
                            if (data.msg[k].message_sha256 != outbox_message.zeronet_msg_id) continue;
                            // found a message that can be deleted from ZeroNet (received by contact)
                            debug('data_cleanup', pgm + 'b: found a message that can be deleted from ZeroNet (received by contact)');
                            data.msg.splice(k, 1);
                            delete outbox_message.zeronet_msg_id;
                            delete outbox_message.zeronet_msg_size;
                            outbox_message.cleanup_at = now;
                            if (outbox_message.message.msgtype == 'reaction') outbox_message.deleted_at = new Date().getTime();
                            local_storage_updated = true;
                            data_removed = true;
                            if (outbox_message.message.image) cleanup_my_image_json(outbox_message.sent_at, false, function (cleanup) {
                                // force publish to update files_optional information
                                // todo: is z_cache.publish variable updated correct when set in a callback?
                                if (cleanup) z_cache.publish = true;
                            });
                            break;
                        } // for k (data.msg)
                        if (data_removed) {
                            debug('data_cleanup', pgm + 'b: data.json is big. removed outbox message received by contact');
                            break;
                        }
                        else {
                            debug('data_cleanup', pgm + 'b: error. outbox message was not in data.msg array. cleaning up invalid reference');
                            delete outbox_message.zeronet_msg_id;
                            delete outbox_message.zeronet_msg_size;
                            outbox_message.cleanup_at = now;
                            local_storage_updated = true;
                            outbox_message = null;
                        }
                    } // for j (contact.messages)
                    if (data_removed) break;
                } // for i (contacts)
                if (data_removed) continue; // recheck data.json size

                // c) cleanup image group chat messages where receipts have been received from all participants in group chat
                //    image has send in a group chat message (contact.type = group)
                //    message has an empty image_receipts array.
                //    see chatCtrl.send_chat_msg - initializing image_receipts array
                //    see process_incoming_message - removing participants from image_receipts array
                for (i = 0; i < ls_contacts.length; i++) {
                    contact = ls_contacts[i];
                    if (contact.type != 'group') continue;
                    if (!contact.messages) continue;
                    for (j = 0; j < contact.messages.length; j++) {
                        outbox_message = contact.messages[j];
                        if (outbox_message.folder != 'outbox') continue;
                        if (!outbox_message.zeronet_msg_id) continue;
                        if (!outbox_message.hasOwnProperty('image_receipts')) continue;
                        // debug('data_cleanup', pgm + 'c: found outbox message with an image_receipts array.') ;
                        if (outbox_message.image_receipts.length > 0) {
                            // debug('data_cleanup', pgm + 'c: keeping image. not all receipts have been received. outbox_message.image_receipts = ' + JSON.stringify(outbox_message.image_receipts));
                            continue;
                        }
                        debug('data_cleanup', pgm + 'c: all image receipts have been received. Remove message from data.json');
                        delete outbox_message.image_receipts;
                        cleanup_my_image_json(outbox_message.sent_at, false, function (cleanup) {
                            // force publish to update files_optional information
                            // todo: is z_cache.publish variable updated correct when set in a callback?
                            if (cleanup) z_cache.publish = true;
                        });
                        // check if outbox message still is in data.msg array
                        for (k = data.msg.length - 1; k >= 0; k--) {
                            if (data.msg[k].message_sha256 != outbox_message.zeronet_msg_id) continue;
                            // found a message that can be deleted from ZeroNet (received by contact)
                            debug('data_cleanup', pgm + 'c: found an image message that can be deleted from ZeroNet (received by all group chat contacts)');
                            data.msg.splice(k, 1);
                            delete outbox_message.zeronet_msg_id;
                            delete outbox_message.zeronet_msg_size;
                            outbox_message.cleanup_at = now;
                            local_storage_updated = true;
                            data_removed = true;
                            break;
                        } // for k (data.msg)
                        if (data_removed) {
                            debug('data_cleanup', pgm + 'c: data.json is big. removed outbox image message received by received by all group chat contacts');
                            break;
                        }
                        else {
                            debug('data_cleanup', pgm + 'c: error. outbox message was not in data.msg array. cleaning up invalid reference');
                            delete outbox_message.zeronet_msg_id;
                            delete outbox_message.zeronet_msg_size;
                            outbox_message.cleanup_at = now;
                            local_storage_updated = true;
                        }
                    } // for j (contact.messages)
                    if (data_removed) break;
                } // for i (contacts)
                if (data_removed) continue; // recheck data.json size

                // d) delete old msg. only current user_seq
                i = -1;
                for (j = 0; ((i == -1) && (j < data.msg.length)); j++) if (data.msg[j].user_seq == user_seq) i = j;
                if ((i == -1) || (data.msg[i].timestamp > one_hour_ago)) {
                    debug('data_cleanup', pgm + 'd: no more old data to remove.');
                    break;
                }
                // found old data.msg row. find outbox message
                outbox_message = null;
                debug('data_cleanup', pgm + 'd: data.msg[i].message_sha256 = ' + data.msg[i].message_sha256);
                for (j = 0; j < ls_contacts.length; j++) {
                    contact = ls_contacts[j];
                    for (k = 0; k < contact.messages.length; k++) {
                        // debug('data_cleanup', pgm + 'd: k = ' + k + ', folder = ' + contact.messages[k].folder + ', zeronet_msg_id = ' + contact.messages[k].zeronet_msg_id);
                        if (contact.messages[k].folder != 'outbox') continue;
                        if (!contact.messages[k].zeronet_msg_id) continue;
                        if (contact.messages[k].zeronet_msg_id != data.msg[i].message_sha256) continue;
                        // found outbox message
                        contact_last_online = MoneyNetworkHelper.get_last_online(contact);
                        if (contact_last_online > contact.messages[k].sent_at) {
                            debug('data_cleanup', 'd: removing old probably received outbox message from Zeronet. ' +
                                'contact.last_online = ' + contact_last_online +
                                ', outbox_message = ' + JSON.stringify(outbox_message));
                        }
                        else {
                            debug('data_cleanup', 'd: removing old probably not received outbox message from Zeronet. ' +
                                'contact.last_online = ' + contact_last_online +
                                ', outbox_message = ' + JSON.stringify(outbox_message));
                        }
                        outbox_message = contact.messages[k];
                        break;
                    } // for k (contact.messages)
                    if (outbox_message) break;
                } // for j (contacts)
                if (outbox_message) {
                    // remove reference from outbox to zeronet
                    delete outbox_message.zeronet_msg_id;
                    delete outbox_message.zeronet_msg_size;
                    outbox_message.cleanup_at = now;
                    if (outbox_message.image) cleanup_my_image_json(outbox_message.sent_at, false, function (cleanup) {
                        // force publish to update files_optional information
                        // todo: is z_cache.publish variable updated correct when set in a callback?
                        if (cleanup) z_cache.publish = true;
                    });
                    local_storage_updated = true;
                }
                else debug('data_cleanup', pgm + 'd: Warning. Could not find outbox message with zeronet_msg_id ' + data.msg[i].message_sha256);
                // remove from zeronet
                data.msg.splice(i, 1);

                debug('data_cleanup', pgm + 'd: data.json is big. deleted old message');
            } // while true

            // console.log(pgm + 'localStorage.messages (3) = ' + JSON.stringify(local_storage_messages));
            // console.log(pgm + 'ZeroNet data.msg (3) = ' + JSON.stringify(data.msg));
            if (local_storage_updated) {
                MoneyNetworkHelper.setItem('reactions', JSON.stringify(ls_reactions));
                ls_save_contacts(false);
            }

            available = data_json_max_size - json_raw.length - 100;
            if (available < 0) {
                // data.json is too big. User have to delete some outgoing messages.
                // specially outgoing chat messages with picture can be a problem
                error =
                    "Sorry. Cannot send message(s). No more disk space. Missing " + (0 - available) + " bytes.<br>" +
                    "Please delete some outgoing messages or remove some images from outgoing chat messages";
                console.log(pgm + error);
                z_wrapper_notification(["error", error]);
                return false; // stop
            }
            else {
                debug('data_cleanup', pgm + 'OK. ' + available + ' bytes free in user directory on ZeroNet');
                return true; // continue. write & publish data.json file
            }


        } // z_update_3_data_json_cleanup


        // update zeronet step 4. write "data.json" file.
        // last step in data.json update - write and publish
        function z_update_4_data_json_write (data, data_str) {
            var pgm = service + '.z_update_4_data_json_write: ' ;
            var error, old_userid ;
            // any changes to data.json file?
            old_userid = z_cache.user_id ;
            if (detected_client_log_out(pgm, old_userid)) return z_update_7_done();
            if (data_str == JSON.stringify(data)) {
                // debug('public_chat', pgm + 'no updates to data.json. continue with public chat messages and publish') ;
                // no changes to data.json but maybe a forced publish from z_update_1_data_json param or cleanup_my_image_json callback
                // delete zeronet_file_locked[data_json_path] ;
                z_update_5_public_chat (z_cache.publish || false) ;
                return ;
            }
            // validate data.json
            error = MoneyNetworkHelper.validate_json (pgm, data, 'data.json', 'Invalid json file') ;
            if (error) {
                error = 'Cannot write invalid data.json file: ' + error ;
                console.log(pgm +error) ;
                console.log(pgm + 'data = ' + JSON.stringify(data)) ;
                console.log(pgm + 'Object.keys(data) = ' + JSON.stringify(Object.keys(data))) ;
                //data = {
                //    "version": 8,
                //    "users": [{
                //        "user_seq": 1,
                //        "pubkey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0pMuMJyynH1BmhMJ6vvd\nQZplIBgiiOQSqwu2SpYKICm+P1gGNHnICQic/Nuqi9t93rxJLfWCsl0+lCtoJLen\nf78xz4XzEcGPBeBFn2TbQqPO9loylNlaOgiqDG5qcSc9n7yEF0xmpReDGATwzECi\nJrpZBImwhUMO48iS08b4IfQaMsbnUVY8hdUeJiQ831kMkNQLtxWaeRiyn8cTbKQ6\nLXCDG7GDaFN6t+x3cv/xBX06+ykuYQ0gNIBySiIz69RYzhvOkqOQggLWPF+NMW1J\nO6VRqvX7Sybwm51v3kGGKWeX4znvGY+GwVCpwiH+b2hbGZHIqFp9ogimGVE0WPgu\nnwIDAQAB\n-----END PUBLIC KEY-----",
                //        "pubkey2": "AkbK8Pr9FE/pIWcWM7qLn/GIzmq5RVJ4jOj7iIomwdWe",
                //        "encryption": "2"
                //    }],
                //    "search": [{"user_seq": 1, "tag": "Name", "value": "Money Network dev"}, {
                //        "user_seq": 1,
                //        "tag": "%",
                //        "value": "%%"
                //    }],
                //    "msg": [{
                //        "user_seq": 1,
                //        "receiver_sha256": "b5f394e8ecd49b80d45569f6878b6adf2db0b73b1fdc867802a7dbd91c6cf60d",
                //        "key": "FuBsfnwUWts9IBDKTgv9DTHXxnDK1EGmPe0RSkXmSo1KkAwTKsFdEF/FBUPpNRCNFydEjsNuWcUsWwDkuKimFiHRvwqF3Re7J0n9oFaIFdmRR059P5w4UwpuuKM49Ekgp7Kw4/e2gWw6Ajfuz4Qk/vUDB4gCGOXLp+UpzkoN6MmSHqPuSy3RYEDTZpf7YKytHGhD20ffF0saDhu4IYG9XL7/oas0maJl6L/HDrAr/bQ8uzP4RHRRiVsNyk/tu98NswCbPH5Tc4mRb0LKX9y7pO0RNN84brSDB5nlrNfHV8tKYuuDcwqfoYOFGywdd6Ayr3JWX85YL6kUeiG0+56DdA==",
                //        "message": "U2FsdGVkX19g9kJgMhA6vnGq1Ak7h5rpcsi6MAvvGWHls/JuAdzERYqU55sRjAiFRW9tjrLBvAsA5qhB2b5qY4A82RiZXx69dErz1J5Tx/Tc1wT0qN2YjIVUASSC31FB/6h9CX5CW8gg+Tg6xycf4dPJvxCWz9YlLbQUQPhspvka9+DCV5BKv6c36vv8+keieO6AkZIAPmA1daCEnGVHhxUZMF/TkAXwezPrV/UQ7XfoJ4xSEqcAGqWRLZ5na8sn",
                //        "message_sha256": "1922c955d268a2f89dbbdda2c71e66de03e6bb63f2d39fba4bebc436012c3b57",
                //        "timestamp": 1484413938793
                //    }]
                //};
                z_wrapper_notification(["error", error]);
                return z_update_7_done();
            }
            // write data.json and publish
            write_data_json(function (res) {
                // delete zeronet_file_locked[data_json_path] ;
                var pgm = service + '.z_update_data_write_publish write_data_json callback: ' ;
                // console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                if (res == "ok") {
                    // data.json ok. check public chat and publish
                    // debug('public_chat', pgm + 'data.json updated. continue with public chat messages and publish') ;
                    z_update_5_public_chat(true) ;
                }
                else {
                    z_wrapper_notification(["error", "Failed to post: " + JSON.stringify(res), 5000]);
                    console.log(pgm + 'Error. Failed to post: ' + JSON.stringify(res)) ;
                    z_update_7_done();
                }
            }); // fileWrite
        } // z_update_4_data_json_write


        //// temporary solution instead of fileDelete
        //// see https://github.com/HelloZeroNet/ZeroNet/issues/726
        function write_empty_chat_file (file_path, cb) {
            moneyNetworkHubService.write_empty_chat_file(file_path, cb);
        }

        function cleanup_my_image_json (sent_at, logical_delete, cb) {

            var pgm = service + '.cleanup_my_image_json: ' ;

            get_my_user_hub (function (my_user_data_hub, other_user_hub, other_user_hub_title) {

                var image_path, mn_query_2, debug_seq ;
                // overwrite with empty json as a delete marked optional file.
                image_path = "merged-" + get_merged_type() + "/" + my_user_data_hub + "/data/users/" + ZeroFrame.site_info.auth_address + '/' + sent_at + '-image.json' ;
                mn_query_2 =
                    "select json.directory, files_optional.filename, files_optional.size " +
                    "from files_optional, json " +
                    "where json.json_id = files_optional.json_id " +
                    "and json.directory like '%/users/" + ZeroFrame.site_info.auth_address + "' " +
                    "and ( files_optional.filename = '" + sent_at + '-image.json' + "'" +  // old format without <user_seq> in filename
                    "   or files_optional.filename = '" + sent_at + '-' + z_cache.user_seq + '-image.json' + "' )" ; // new format with <user_seq> in filename
                debug('select', pgm + 'mn query 2 = ' + mn_query_2) ;
                debug_seq = debug_z_api_operation_start(pgm, 'mn query 2', 'dbQuery', show_debug('z_db_query')) ;
                ZeroFrame.cmd("dbQuery", [mn_query_2], function (res) {
                    var pgm = service + '.cleanup_my_image_json dbQuery callback 2: ';
                    debug_z_api_operation_end(debug_seq, (!res || res.error) ? 'Failed. error = ' + JSON.stringify(res) : 'OK') ;
                    if (res.error) {
                        console.log(pgm + "image check failed: " + res.error);
                        console.log(pgm + 'query = ' + mn_query_2);
                        if (cb) cb(false) ;
                        return;
                    }
                    if (res.length == 0) {
                        console.log(pgm + 'optional image file ' + image_path + ' was not found');
                        if (cb) cb(false) ;
                        return;
                    }
                    image_path = 'merged-' + get_merged_type() + '/' + res[0].directory + '/' + res[0].filename;
                    if ((res[0].size <= 2) && logical_delete) {
                        console.log(pgm + 'optional image file ' + image_path + ' has already been logical deleted');
                        if (cb) cb(false) ;
                        return;
                    }
                    if (logical_delete) {
                        // logical delete. replace -image.json with empty json file {}. for example after delete outbox message
                        write_empty_chat_file(image_path, function (ok) {
                            if (cb) cb(ok) ;
                        }) ;
                    }
                    else {
                        // physical delete. for example after receiving receipt for image
                        // debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_delete', pgm + image_path + ' fileDelete') ;
                        debug_seq = debug_z_api_operation_start(pgm, image_path, 'fileDelete', show_debug('z_file_delete')) ;
                        ZeroFrame.cmd("fileDelete", image_path, function (res) {
                            var pgm = service + '.cleanup_my_image_json fileDelete callback 3: ';
                            // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                            debug_z_api_operation_end(debug_seq, format_res(res)) ;
                            // console.log(pgm + 'res = ' + JSON.stringify(res));
                            if (cb) cb((res == 'ok')) ;
                        }); // fileDelete callback 3
                    }

                }) ; // dbQuery callback 2

            }) ; // get_my_user_hub callback 1

        } // cleanup_my_image_json


        // update zeronet step 5. create, update or delete <to timestamp>-<from timestamp>-<user_seq>-chat.json files with public chat
        // note that public chat is unencrypted and saved in optional json files on ZeroNet
        // public chat messages are not saved in localStorage
        function z_update_5_public_chat (publish) {
            var pgm = service + '.z_update_5_public_chat: ' ;

            get_my_user_hub (function (my_user_data_hub, other_user_hub, other_user_hub_title) {
                var pgm = service + '.z_update_5_public_chat get_my_user_hub callback 1: ' ;

                var contact, user_path, now, i, message_with_envelope, file_path, j, z_filename, first_timestamp, last_timestamp,
                    key, key_a, timestamp1, timestamp2, message, new_z_filename, new_file_path, write_file, message_with_envelope2,
                    user_seq, cache_status, debug_seq ;

                contact = get_public_contact(false) ;
                user_path = "merged-" + get_merged_type() + "/" + my_user_data_hub + "/data/users/" + ZeroFrame.site_info.auth_address;
                now = new Date().getTime() ;
                user_seq = z_cache.user_seq ;

                if (contact) {

                    // 1. check deleted public outbox messages
                    // debug('public_chat', 'contact = ' + JSON.stringify(contact));
                    for (i=0 ; i<contact.messages.length ; i++) {
                        message_with_envelope = contact.messages[i] ;
                        if (message_with_envelope.sent_at && message_with_envelope.z_filename && message_with_envelope.deleted_at) {

                            // debug('public_chat', 'delete message ' + JSON.stringify(message_with_envelope)) ;
                            z_filename = message_with_envelope.z_filename ;

                            // remove message from file or delete file from *-chat.json file
                            if (!z_cache.my_files_optional[z_filename]) {
                                debug('public_chat', pgm + 'UPS. File ' + z_filename + ' was not found in my_files_optional') ;
                                // cleanup all public outbox messages with this z_filename
                                for (j=0 ; j<contact.messages.length ; j++) {
                                    message_with_envelope2 = contact.messages[j] ;
                                    if (message_with_envelope2.z_filename == z_filename) {
                                        delete message_with_envelope2.z_filename ;
                                        message_with_envelope2.cleanup_at = now ;
                                    }
                                }
                                // also cleanup files_optional_cache
                                file_path = user_path + '/' + z_filename ;
                                delete files_optional_cache[file_path] ;
                                continue ;
                            }

                            // read optional file
                            file_path = user_path + '/' + z_filename ;
                            z_file_get(pgm, {inner_path: file_path, required: false}, function (chat) {
                                var pgm = service + '.z_update_5_public_chat z_file_get callback 2a: ' ;
                                var callback, j, json_raw, error, message_with_envelope2, msg_found, cache_status, k, chat_lng, issue_84 ;
                                callback = function () {
                                    delete message_with_envelope.z_filename ;
                                    message_with_envelope.cleanup_at = now ;
                                    // continue with other public chat messages
                                    z_update_5_public_chat (true) ;
                                };
                                if (!chat || chat.length <= 2) {
                                    // file has been deleted since page start
                                    debug('public_chat',
                                        pgm + 'deleted public outbox message ' + message_with_envelope.local_msg_seq +
                                        '. file ' + z_filename + ' has already been deleted') ;
                                    // cleanup all public outbox messages with this z_filename
                                    for (j=0 ; j<contact.messages.length ; j++) {
                                        message_with_envelope2 = contact.messages[j] ;
                                        if (message_with_envelope2.z_filename == z_filename) {
                                            delete message_with_envelope2.z_filename ;
                                            message_with_envelope2.cleanup_at = now ;
                                        }
                                    }
                                    // cleanup my optional files list
                                    delete z_cache.my_files_optional[z_filename] ;
                                    // cleanup files_optional_cache
                                    file_path = user_path + '/' + z_filename ;
                                    delete files_optional_cache[file_path] ;
                                    callback() ;
                                    return ;
                                }

                                // todo: this length (used in cache_status) is not always correct. must use size from content.json file
                                chat_lng = chat.length ;

                                // validate -chat,json file
                                error = null ;
                                try { chat = JSON.parse(chat) }
                                catch (e) { error = 'Invalid json file: ' + e.message }
                                if (!error) error = MoneyNetworkHelper.validate_json (pgm, chat, 'chat-file', 'Invalid json file') ;
                                if (error) {
                                    // invalid -chat.json file - delete file
                                    console.log(
                                        pgm + 'deleted public outbox message ' + message_with_envelope.local_msg_seq +
                                        '. file ' + z_filename + ' was invalid. error = ' + error + ', chat = ' + JSON.stringify(chat));
                                    // cleanup all public outbox messages with this z_filename
                                    for (j=0 ; j<contact.messages.length ; j++) {
                                        message_with_envelope2 = contact.messages[j] ;
                                        if (message_with_envelope2.z_filename == z_filename) {
                                            delete message_with_envelope2.z_filename ;
                                            message_with_envelope2.cleanup_at = now ;
                                        }
                                    }
                                    // cleanup my optional files list
                                    delete z_cache.my_files_optional[z_filename] ;
                                    // cleanup files_optional_cache
                                    // delete files_optional_cache[file_path] ;
                                    files_optional_cache[file_path].is_deleted = true ;
                                    files_optional_cache[file_path].size = 2 ;
                                    // ZeroFrame.cmd("fileDelete", file_path, function (res) { callback() });
                                    write_empty_chat_file(file_path, function () { callback() });
                                    return ;
                                }

                                // check timestamps
                                first_timestamp = null ;
                                last_timestamp = null ;
                                msg_found = false ;
                                cache_status = files_optional_cache[file_path] ;
                                if (!cache_status) {
                                    debug('public_chat', 'warning. adding missing files_optional_cache for file ' + file_path) ;
                                    // cache_status.timestamps. list of now yet read messages from optional file.
                                    cache_status = { is_downloaded: true, timestamps: []} ;
                                    if (chat_lng) cache_status.size = chat_lng ;
                                    files_optional_cache[file_path] = cache_status ;
                                    for (j=0 ; j<chat.msg.length ; j++) cache_status.timestamps.push(chat.msg[j].timestamp) ;
                                    // JS error after first public post #84
                                    issue_84 = true ;
                                    debug('public_chat', pgm + 'issue #84. created cache_status object. file_path = ' + file_path +
                                        ', chat_lng ' + chat_lng + ', cache_status = ' + JSON.stringify(cache_status));
                                }
                                else if (!cache_status.timestamps) {
                                    debug('public_chat', 'warning. adding missing timestamps to files_optional_cache for file ' + file_path) ;
                                    cache_status.timestamps = [] ;
                                    for (j=0 ; j<chat.msg.length ; j++) cache_status.timestamps.push(chat.msg[j].timestamp) ;
                                    // JS error after first public post #84
                                    issue_84 = true ;
                                    debug('public_chat', pgm + 'issue #84. created cache_status object. file_path = ' + file_path +
                                        ', chat_lng ' + chat_lng + ', cache_status = ' + JSON.stringify(cache_status));
                                }
                                for (j=chat.msg.length-1 ; j>=0 ; j--) {
                                    if (chat.msg[j].timestamp == message_with_envelope.sent_at) {
                                        chat.msg.splice(j,1) ;
                                        k = cache_status.timestamps.indexOf(message_with_envelope.sent_at) ;
                                        if (k != -1) cache_status.timestamps.splice(k,1) ;
                                        msg_found = true ;
                                    }
                                    else if (!first_timestamp) {
                                        first_timestamp = chat.msg[j].timestamp ;
                                        last_timestamp = chat.msg[j].timestamp ;
                                    }
                                    else{
                                        if (chat.msg[j].timestamp < first_timestamp) first_timestamp = chat.msg[j].timestamp ;
                                        if (chat.msg[j].timestamp > last_timestamp) last_timestamp = chat.msg[j].timestamp ;
                                    }
                                } // for j (chat.msg)
                                if (!msg_found) {
                                    debug('public_chat',
                                        pgm + 'deleted public outbox message ' + message_with_envelope.local_msg_seq +
                                        '. message was not found in file ' + z_filename);
                                    callback() ;
                                    return ;
                                }
                                debug('public_chat',
                                    pgm + 'Ok. message ' + message_with_envelope.local_msg_seq + ' was found in file ' +
                                    z_filename);

                                if (chat.msg.length == 0) {
                                    debug('public_chat', pgm + 'ok. deleted message ' + message_with_envelope.local_msg_seq + ' and file ' + z_filename) ;
                                    // delete my_files_optional[z_filename] ;
                                    files_optional_cache[file_path].is_deleted = true ;
                                    files_optional_cache[file_path].size = 2 ;
                                    // ZeroFrame.cmd("fileDelete", file_path, function (res) { callback() });
                                    write_empty_chat_file(file_path, function () { callback() });
                                }
                                else {
                                    new_z_filename = last_timestamp + '-' + first_timestamp + '-' + user_seq + '-chat.json' ;
                                    new_file_path = user_path + '/' + new_z_filename ;
                                    if (z_filename == new_z_filename) {
                                        debug('public_chat', pgm + 'ok. deleted message ' + message_with_envelope.local_msg_seq +
                                            ' and updating file ' + z_filename);
                                    }
                                    else {
                                        debug('public_chat', pgm + 'ok. deleted message ' + message_with_envelope.local_msg_seq +
                                            ', deleting file ' + z_filename +
                                            ' and creating file ' + new_z_filename);
                                    }
                                    write_file = function () {
                                        var error, json_raw ;
                                        // validate -chat.json file before write
                                        error = MoneyNetworkHelper.validate_json (pgm, chat, 'chat-file', 'Invalid json file') ;
                                        if (error) {
                                            error = 'cannot write file ' + new_z_filename + ', error = ' + error ;
                                            debug('public_chat', pgm + error) ;
                                            z_wrapper_notification(["error", error, 5000]);
                                            // stop. changes were not published
                                            return ;
                                        }
                                        // write -chat.json file
                                        json_raw = unescape(encodeURIComponent(JSON.stringify(chat, null, "\t")));
                                        debug('public_chat', 'issue #84 - json_raw.length = ' + json_raw.length + ', JSON.stringify(chat).length = ' + JSON.stringify(chat).length) ;
                                        // debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + new_file_path + ' fileWrite') ;
                                        debug_seq = debug_z_api_operation_start(pgm, new_file_path, 'fileWrite', show_debug('z_file_write')) ;
                                        z_file_write(pgm, new_file_path, btoa(json_raw), function (res) {
                                        // ZeroFrame.cmd("fileWrite", [new_file_path, btoa(json_raw)], function (res) {
                                            var pgm = service + '.z_update_5_public_chat fileWrite callback 3a: ';
                                            // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                            debug_z_api_operation_end(debug_seq, format_res(res)) ;
                                            // debug('public_chat', pgm + 'res = ' + JSON.stringify(res)) ;
                                            if (res === "ok") {
                                                // write OK
                                                if (!z_cache.my_files_optional[new_z_filename]) z_cache.my_files_optional[new_z_filename] = {} ;
                                                z_cache.my_files_optional[new_z_filename].size = json_raw.length ;
                                                callback() ;
                                            }
                                            else {
                                                error = 'failed to write file ' + new_z_filename + ', res = ' + res ;
                                                debug('public_chat', pgm + error) ;
                                                z_wrapper_notification(["error", error, 5000]);
                                                // stop. changes were not published
                                            }
                                        }); // fileWrite callback 2a

                                    }; // write_file

                                    if (z_filename == new_z_filename) {
                                        // unchange filename - just write
                                        write_file() ;
                                    }
                                    else {
                                        // changed filename - delete + write
                                        z_cache.my_files_optional[new_z_filename] = z_cache.my_files_optional[z_filename] ;
                                        delete z_cache.my_files_optional[z_filename] ;
                                        files_optional_cache[new_file_path] = files_optional_cache[file_path] ;
                                        // delete files_optional_cache[file_path] ;
                                        files_optional_cache[file_path].is_deleted = true ;
                                        files_optional_cache[file_path].size = 2 ;
                                        for (j=0 ; j<contact.messages.length ; j++) {
                                            message_with_envelope2 = contact.messages[j] ;
                                            if (message_with_envelope2.z_filename == z_filename) message_with_envelope2.z_filename = new_z_filename ;
                                        } // for j
                                        // delete + write
                                        // ZeroFrame.cmd("fileDelete", file_path, function (res) { write_file() });
                                        write_empty_chat_file(file_path, function () { write_file() });
                                    }
                                }

                            }) ; // z_file_get callback 1a

                            return ;
                            // callback to z_update_5_public_chat in fileWrite /write_empty_chat_file callback

                        } // if "delete"

                    } // for i (contact.messages)

                    // 2. check new public outbox messages
                    for (i=0 ; i<contact.messages.length ; i++) {
                        message_with_envelope = contact.messages[i];
                        if (!message_with_envelope.sent_at) {

                            message = message_with_envelope.message ;

                            // new public outbox message. find chat file with newest timestamp
                            if (message.image) {
                                // image chat - create new json file
                                z_filename = null ;
                            }
                            else  {
                                // find last *-chat* file. format 1482081231234-1482081231234-1-chat.json
                                z_filename = null ;
                                last_timestamp = 0 ;
                                for (key in z_cache.my_files_optional) {
                                    key_a = key.split(/[.-]/) ;
                                    if (key_a[2] != '' + user_seq) continue ; // not actual user
                                    timestamp1 = parseInt(key_a[0]) ;
                                    timestamp2 = parseInt(key_a[1]) ;
                                    if (timestamp1 > last_timestamp) {
                                        z_filename = key ;
                                        first_timestamp = timestamp2 ;
                                        last_timestamp = timestamp1 ;
                                    }
                                } // for key
                                // debug('public_chat', pgm + 'last_key = ' + last_chat_file + ', last_timestamp = ' + last_timestamp) ;

                                // check size
                                debug('public_chat', pgm + 'my_files_optional = ' + JSON.stringify(z_cache.my_files_optional)) ;
                                if (z_filename && (z_cache.my_files_optional[z_filename]['size'] > DATA_FILE_SIZE)) {
                                    z_filename = null ;
                                    first_timestamp = null ;
                                }
                            }

                            // ready. add public outbox message to chat file
                            new_z_filename = now + '-' + (first_timestamp || now) + '-' + user_seq + '-chat.json' ;
                            if (!z_filename) z_filename = new_z_filename ;
                            file_path = user_path + '/' + z_filename ;
                            new_file_path = user_path + '/' + new_z_filename ;

                            // ready. read old chat file
                            z_file_get(pgm, {inner_path: file_path, required: false}, function (chat) {
                                var pgm = service + '.z_update_5_public_chat z_file_get callback 2b: ';
                                var chat_lng, new_msg, json_raw, issue_84, error ;
                                if (!chat || (chat.length <= 2)) chat = { version: 8, msg: []} ;
                                else {
                                    // todo: this length is not always correct. Must use size from content.json in cache_status
                                    chat_lng = chat.length ;

                                    // validate -chat,json file
                                    error = null ;
                                    try { chat = JSON.parse(chat) }
                                    catch (e) { error = 'Invalid json file: ' + e.message }
                                    if (!error) error = MoneyNetworkHelper.validate_json (pgm, chat, 'chat-file', 'Invalid json file') ;
                                    if (error) {
                                        // invalid -chat.json file - overwrite with empty file and continue
                                        console.log(pgm + 'old file ' + z_filename + ' was invalid. error = ' + error + ', chat = ' + JSON.stringify(chat));
                                        // cleanup all public outbox messages with this z_filename
                                        for (j=0 ; j<contact.messages.length ; j++) {
                                            message_with_envelope2 = contact.messages[j] ;
                                            if (message_with_envelope2.z_filename == z_filename) {
                                                delete message_with_envelope2.z_filename ;
                                                message_with_envelope2.cleanup_at = now ;
                                            }
                                        }
                                        // cleanup my optional files list
                                        delete z_cache.my_files_optional[z_filename] ;
                                        // cleanup files_optional_cache
                                        // delete files_optional_cache[file_path] ;
                                        files_optional_cache[file_path].is_deleted = true ;
                                        files_optional_cache[file_path].size = 2 ;
                                        // ZeroFrame.cmd("fileDelete", file_path, function (res) { callback() });
                                        write_empty_chat_file(file_path, function () { z_update_5_public_chat (true) });
                                        return ;
                                    }

                                }
                                cache_status = files_optional_cache[file_path] ;
                                if (!cache_status) {
                                    cache_status = { is_downloaded: true, timestamps: []} ;
                                    if (chat_lng) cache_status.size = chat_lng ;
                                    files_optional_cache[file_path] = cache_status ;
                                    for (j=0 ; j<chat.msg.length ; j++) cache_status.timestamps.push(chat.msg[j].timestamp);
                                    // JS error after first public post #84
                                    issue_84 = true ;
                                    debug('public_chat', pgm + 'issue #84. created cache_status object. file_path = ' + file_path +
                                        ', chat_lng ' + chat_lng + ', cache_status = ' + JSON.stringify(cache_status));
                                }
                                // add message to chat file
                                new_msg = {
                                    user_seq: user_seq,
                                    timestamp: now,
                                    message: message.message
                                } ;
                                if (message.image) {
                                    if (z_cache.user_setup.test && z_cache.user_setup.test.image_compress_disabled) {
                                        // uncompressed unencrypted image
                                        new_msg.image = message.image ;
                                    }
                                    else {
                                        // compressed unencrypted image
                                        new_msg.storage = { image: 'c1'} ;
                                        new_msg.image = MoneyNetworkHelper.compress1(message.image) ;
                                    }
                                }
                                if (message.parent) new_msg.parent = message.parent ; // comment or nested comment
                                chat.msg.push(new_msg) ;
                                debug('public_chat', pgm + 'added new message to ' + z_filename + '. new_msg = ' + JSON.stringify(new_msg)) ;

                                write_file = function () {
                                    var error, json_raw ;
                                    // validate -chat.json file before write
                                    error = MoneyNetworkHelper.validate_json (pgm, chat, 'chat-file', 'Invalid json file') ;
                                    if (error) {
                                        error = 'cannot write file ' + new_z_filename + ', error = ' + error ;
                                        debug('public_chat', pgm + error) ;
                                        z_wrapper_notification(["error", error, 5000]);
                                        // stop. changes were not published
                                        return ;
                                    }
                                    // write chat file
                                    json_raw = unescape(encodeURIComponent(JSON.stringify(chat, null, "\t")));
                                    debug('public_chat', 'issue #84: json_raw.length = ' + json_raw.length + ', JSON.stringify(chat).length = ' + JSON.stringify(chat).length) ;
                                    // debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + new_file_path + ' fileWrite') ;
                                    debug_seq = debug_z_api_operation_start(pgm, new_file_path, 'fileWrite', show_debug('z_file_write')) ;
                                    z_file_write(pgm, new_file_path, btoa(json_raw), function (res) {
                                    // ZeroFrame.cmd("fileWrite", [new_file_path, btoa(json_raw)], function (res) {
                                        var pgm = service + '.z_update_5_public_chat fileWrite callback 3b: ';
                                        var error, js_message_row ;
                                        // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                        debug_z_api_operation_end(debug_seq, format_res(res)) ;
                                        // debug('public_chat', pgm + 'res = ' + JSON.stringify(res)) ;
                                        if (res === "ok") {
                                            // write ok.
                                            if (!z_cache.my_files_optional[new_z_filename]) z_cache.my_files_optional[new_z_filename] = {} ;
                                            z_cache.my_files_optional[new_z_filename].size = json_raw.length ;
                                            debug('public_chat', pgm + 'checking js_messages_index.local_msg_seq. message_with_envelope before next_local_msg_seq = ' + JSON.stringify(message_with_envelope)) ;
                                            //message_with_envelope = {
                                            //    "folder": "outbox",
                                            //    "message": {"msgtype": "chat msg", "message": "jro test: new public msg"},
                                            //    "seq": 9
                                            //};
                                            message_with_envelope.sent_at = now ;
                                            message_with_envelope.z_filename = new_z_filename ;
                                            message_with_envelope.local_msg_seq = next_local_msg_seq() ;
                                            message_with_envelope.ls_msg_size = JSON.stringify(message_with_envelope).length ;
                                            debug('public_chat', pgm + 'done. message_with_envelope = ' + JSON.stringify(message_with_envelope)) ;
                                            // update js_messages_index with new local_msg_seq
                                            js_message_row = get_message_by_seq(message_with_envelope.seq) ;
                                            message_add_local_msg_seq(js_message_row, message_with_envelope.local_msg_seq) ;
                                            //js_messages_index.local_msg_seq[message_with_envelope.local_msg_seq] = js_message_row ;
                                            //debug('public_chat', pgm + 'message_with_envelope.seq = ' + message_with_envelope.seq +
                                            //    ', js_message_row = ' + JSON.stringify(js_message_row));
                                            z_update_5_public_chat(true) ;
                                        }
                                        else {
                                            error = 'failed to write file ' + file_path + ', res = ' + res ;
                                            console.log(pgm + error) ;
                                            z_wrapper_notification(["error", error, 5000]);
                                            // stop. changes were not published
                                        }
                                    }); // fileWrite callback 2b

                                } ; // write_file

                                if (z_filename == new_z_filename) write_file() ;
                                else {
                                    // changed filename - delete + write
                                    z_cache.my_files_optional[new_z_filename] = z_cache.my_files_optional[z_filename] ;
                                    delete z_cache.my_files_optional[z_filename] ;
                                    files_optional_cache[new_file_path] = files_optional_cache[file_path] ;
                                    // delete files_optional_cache[file_path] ;
                                    files_optional_cache[file_path].is_deleted = true ;
                                    files_optional_cache[file_path].size = 2 ;
                                    for (j=0 ; j<contact.messages.length ; j++) {
                                        message_with_envelope2 = contact.messages[j] ;
                                        if (message_with_envelope2.z_filename == z_filename) message_with_envelope2.z_filename = new_z_filename ;
                                    } // for j
                                    // delete + write
                                    // ZeroFrame.cmd("fileDelete", file_path, function (res) { write_file() });
                                    write_empty_chat_file(file_path, function () { write_file() });
                                }

                            }) ; // z_file_get callback 1b

                            // stop. callback to z_update_5_public_chat in fileWrite
                            return ;

                        } // if sent_at

                    } // for i (contact.messages)

                    // todo: merge check. merge smaller *chat.json files. for sample 2 5000 bytes file to one CLEANUP_LIMIT bytes file?

                } // if contact

                // continue with public reactions (if any)
                z_update_6_like_json(publish) ;

            }) ; // get_my_user_hub callback 1

        } // z_update_5_public_chat


        // update zeronet step 6. update public reaction file like.json
        function z_update_6_like_json (publish) {
            var pgm = service + '.z_update_6_like_json: ' ;
            var done, new_reactions, i, contact, j, message_with_envelope, user_path, key ;

            done = function (publish, cb) {
                if (!cb) cb = function() {} ;
                ls_save_contacts(false);
                if (!publish) {
                    // ZeroFrame.cmd("wrapperNotification", ["info", "No more updates to publish", 5000]);
                    cb() ;
                    z_update_7_done() ;
                    return ;
                }
                zeronet_site_publish({reason: 'z_update'}, function () {
                    cb()}) ;
                    z_update_7_done() ;
            } ; // done

            // any new public reactions? (or cancel old public reaction)
            new_reactions = false ;
            for (i=0 ; i<ls_contacts.length ; i++) {
                contact = ls_contacts[i] ;
                if (contact.type == 'group') continue ;
                for (j=0 ; j<contact.messages.length ; j++) {
                    message_with_envelope = contact.messages[j] ;
                    if (!message_with_envelope.z_filename) continue ;
                    if (!message_with_envelope.reaction_at && !message_with_envelope.my_private_reaction_at) continue ;
                    new_reactions = true ;
                    break ;
                } // for j (messages)
                if (new_reactions) break ;
            } // for i (contacts)
            if (!new_reactions) {
                // check anonymous public reactions
                for (key in ls_reactions) {
                    if (ls_reactions[key].reaction_at) {
                        new_reactions = true ;
                        break ;
                    }
                }
            }
            if (!new_reactions) return done(publish) ; // no new reactions

            // read and update like.json with new reactions
            get_like_json(function (like, like_index, empty) {
                var pgm = service + '.z_update_6_like_json get_like_json callback 1: ' ;
                var error, index, i, contact, j, message_with_envelope, k, like_updated, auth_address,
                    like_index_updated, reactions_index, reaction_info, compare, emoji, refresh_reactions, refresh_key,
                    this_reaction_updated, this_reaction_added, like_index_p, like_index_a, unique_id, new_reaction,
                    refresh_reactions_job;
                error = MoneyNetworkHelper.validate_json (pgm, like, 'like.json', 'Invalid json file') ;
                if (error) {
                    console.log(pgm + 'System error. failed to public reaction. like.json is invalid. ' + error) ;
                    console.log(pgm + 'like = ' + JSON.stringify(like)) ;
                    z_wrapper_notification(["error", "Failed to publish reaction<br>like.json file is invalid<br>"]);
                    return done(publish);
                }
                like_updated = false ;
                like_index_updated = false ;

                if (like.hub) {
                    delete like.hub ;
                    like_updated = true ;
                }


                // debug('reaction', pgm + 'keep traq of messages with updated reactions. must refresh reactions info after fileWrite and publish. See like.json processing in event_file_done') ;
                refresh_reactions = {} ;

                // update public reactions (non anonymous). contact.messages,. => like.json
                unique_id = get_my_unique_id() ;
                for (i=0 ; i<ls_contacts.length ; i++) {
                    contact = ls_contacts[i] ;
                    if (contact.type == 'group') continue ;
                    for (j=0 ; j<contact.messages.length ; j++) {
                        message_with_envelope = contact.messages[j] ;
                        if (!message_with_envelope.z_filename) continue ;
                        if (!message_with_envelope.reaction_at && !message_with_envelope.my_private_reaction_at) continue ;
                        if (message_with_envelope.reaction_at && z_cache.user_setup.private_reactions) {
                            debug('reaction', pgm + 'Error. Private reactions is enabled and found post with sent_at timestamp ' +
                                message_with_envelope.sent_at + '. See ls_reactions update in z_update_1_data_json and anonymous reaction update in next section') ;
                            continue ;
                        }
                        // public reaction (add or remove). Any old private reaction has already been removed in z_update_1_data_json
                        new_reaction = message_with_envelope.my_private_reaction_at ? null : message_with_envelope.reaction ;
                        auth_address = contact.type == 'public' ? ZeroFrame.site_info.auth_address : contact.auth_address ;
                        like_index_p = message_with_envelope.sent_at + ',' + auth_address.substr(0,4) + ',p' ;
                        refresh_key = message_with_envelope.sent_at + ',' + auth_address.substr(0,4) ;
                        debug('reaction', pgm + 'index_p: ' + like_index_p + ': updating non anonymous public reaction') ;
                        if (like_index.hasOwnProperty(like_index_p)) {
                            // old non anonymous reaction was found in like.json
                            k = like_index[like_index_p] ;
                            if (new_reaction == like.like[k].emoji) {
                                // no change
                                debug('reaction', pgm + 'index_p: ' + like_index_p + ': found in like.json but not changed') ;
                                delete message_with_envelope.reaction_at ;
                                delete message_with_envelope.my_private_reaction_at ;
                                continue ;
                            }
                            debug('reaction', pgm + 'index_p: ' + like_index_p + ': updating like.json. old emoji = ' + like.like[k].emoji + ', new emoji = ' + message_with_envelope.reaction) ;
                            like.like[k].emoji = new_reaction ;
                            delete message_with_envelope.reaction_at ;
                            delete message_with_envelope.my_private_reaction_at ;
                            like_updated = true ;
                            refresh_reactions[refresh_key] = get_message_by_seq(message_with_envelope.seq) ;
                            if (!refresh_reactions[refresh_key]) debug('reaction', pgm + 'index_p: ' + like_index_p + ': error. js_messages_row with seq ' + message_with_envelope.seq + ' was not found') ;
                        } // found old like
                        else if (!new_reaction) {
                            debug('reaction', pgm + 'index_p: ' + like_index_p + ': old public reaction was not found in like.json file') ;
                            delete message_with_envelope.reaction_at ;
                            delete message_with_envelope.my_private_reaction_at ;
                        }
                        else {
                            debug('reaction', pgm + 'index_p: ' + like_index_p + ': added new public emoji reaction ' + new_reaction + ' to like.json') ;
                            // add new reaction to like.json
                            like.like.push({
                                user_seq: z_cache.user_seq,
                                timestamp: message_with_envelope.sent_at,
                                auth: auth_address.substr(0,4),
                                emoji: new_reaction
                            }) ;
                            like_index[like_index_p] = like.like.length-1 ;
                            delete message_with_envelope.reaction_at ;
                            delete message_with_envelope.my_private_reaction_at ;
                            like_updated = true ;
                            refresh_reactions[refresh_key] = get_message_by_seq(message_with_envelope.seq) ;
                            if (!refresh_reactions[refresh_key]) debug('reaction', pgm + 'index_p: ' + like_index_p + ': error. js_messages_row with seq ' + message_with_envelope.seq + ' was not found') ;
                        }
                    } // for j (messages)
                } // for i (contacts)

                // update private anonymous reactions (ls_reactions => like.json)
                auth_address = ZeroFrame.site_info.auth_address.substr(0,4) ;
                debug('reaction', pgm + 'ls_reactions = ' + JSON.stringify(ls_reactions));
                for (reactions_index in ls_reactions) {
                    if (!reactions_index.match(/[0-9]{13}/)) continue ; // not a timestamp
                    reaction_info = ls_reactions[reactions_index] ;
                    if (!reaction_info.reaction_at) continue ; // no change for this message
                    like_index_a = reactions_index + ',' + auth_address + ',a' ;
                    refresh_key = reactions_index + ',' + auth_address ;
                    if (!like_index[like_index_a]) like_index[like_index_a] = [] ;
                    if (!reaction_info.emojis) reaction_info.emojis = {} ;
                    debug('reaction', pgm + 'reactions_index = ' + reactions_index + ', index_a = ' + like_index_a + ', reaction_info = ' + JSON.stringify(reaction_info)) ;
                    // compare reactions in like.json with reactions in reaction_info (ls_reaction)
                    compare = {} ;
                    for (emoji in reaction_info.emojis) {
                        compare[emoji] = { old_count: 0, new_count: reaction_info.emojis[emoji] }
                    }
                    for (i=0 ; i<like_index[like_index_a].length ; i++) {
                        j = like_index[like_index_a][i] ;
                        emoji = like.like[j].emoji ;
                        if (!compare[emoji]) compare[emoji] = { new_count: 0};
                        compare[emoji].old_count = like.like[j].count ;
                        compare[emoji].old_i = j ;
                    }
                    debug('reaction', pgm + 'compare = ' + JSON.stringify(compare));
                    this_reaction_updated = false ;
                    this_reaction_added = false ;
                    for (emoji in compare) {
                        if (compare[emoji].old_count == compare[emoji].new_count) continue ;
                        this_reaction_updated = true ;
                        like_updated = true ;
                        if (!refresh_reactions[refresh_key]) {
                            // find outbox message with this refresh_key. reaction information must be updated after write and publish
                            for (j=0 ; j<ls_contacts.length ; j++) {
                                contact = ls_contacts[j] ;
                                for (k=0 ; k<contact.messages.length ; k++) {
                                    message_with_envelope = contact.messages[k] ;
                                    // if (message_with_envelope.folder != 'outbox') continue ;
                                    if ('' + message_with_envelope.sent_at != reactions_index) continue ;
                                    refresh_reactions[refresh_key] = get_message_by_seq(message_with_envelope.seq) ;
                                    break ;
                                }
                                if (refresh_reactions[refresh_key]) break ;
                            }
                            if (!refresh_reactions[refresh_key]) debug('reaction', pgm + 'cannot find any message with sent_at timestamp ' + reactions_index) ;
                        }
                        if (!compare[emoji].old_count) {
                            // add new row to like.json
                            this_reaction_added = true ;
                            like_index[like_index_a].push(like.like.length) ;
                            like.like.push({
                                user_seq: z_cache.user_seq,
                                timestamp: parseInt(reactions_index),
                                auth: auth_address,
                                emoji: emoji,
                                count: compare[emoji].new_count
                            }) ;
                            continue ;
                        }
                        if (!compare[emoji].new_count) {
                            // delete mark old row in like.json array
                            like.like[compare[emoji].old_i].emoji = null ;
                            continue ;
                        }
                        // simple count update
                        like.like[compare[emoji].old_i].count = compare[emoji].new_count ;
                        this_reaction_added = true ;
                    }
                    if (!this_reaction_updated) {
                        debug('reaction', pgm + 'warning. no anonymous reaction update was found for key = ' + reactions_index +
                            ', index_a = ' + like_index_a + ', reaction_info = ' + JSON.stringify(reaction_info));
                    }
                    delete reaction_info.reaction_at ;
                    //if (this_reaction_added) {
                    //    // delete any old public reaction. todo: only after reaction from this client. not after reaction from other clients
                    //    like_index_p = message_with_envelope.sent_at + ',' + auth_address.substr(0,4) + ',p' ;
                    //    if (like_index.hasOwnProperty(like_index_p)) {
                    //        k = like_index[like_index_p];
                    //        debug('reaction', pgm + 'deleted old public ' + like.like[k].emoji + 'reaction in like.json');
                    //        like.like[k].emoji = null ;
                    //        if (refresh_reactions[refresh_key]) {
                    //            debug('reaction', pgm + 'message_with_envelope.my_private_reaction_at = ' + message_with_envelope.my_private_reaction_at) ;
                    //        }
                    //
                    //    }
                    //}
                } // for key in reactions

                debug('reaction', pgm + 'like_updated = ' + like_updated) ;
                if (!like_updated) return done(publish) ;
                for (i=like.like.length-1 ; i>= 0 ; i--) if (!like.like[i].emoji) {
                    like.like.splice(i,1) ;
                    like_index_updated = true ;
                }
                if (like_index_updated) update_like_index(like, like_index) ;
                publish = true ;

                debug('reaction', pgm + 'todo: check for doublet public+private reaction and remove doublets.') ;
                debug('reaction', pgm + 'refresh_reactions.keys = ' + JSON.stringify(Object.keys(refresh_reactions)));
                debug('reaction', pgm + 'like = ' + JSON.stringify(like)) ;
                debug('reaction', pgm + 'like_index = ' + JSON.stringify(like_index)) ;

                // create callback. refresh reaction info for all messages affected by like.json update
                refresh_reactions_job = function () {
                    var pgm = service + '.z_update_6_like_json.refresh_reactions_job: ' ;
                    var refresh_key, js_messages_row ;
                    for (refresh_key in refresh_reactions) {
                        js_messages_row = refresh_reactions[refresh_key] ;
                        delete refresh_reactions[refresh_key] ;
                        debug('reaction', pgm + 'refresh reactions info for ' + refresh_key) ;
                        check_reactions(js_messages_row) ;
                        refresh_reactions_job() ;
                        break ;
                    }
                } ;

                // validate and write like.json
                error = MoneyNetworkHelper.validate_json (pgm, like, 'like.json', 'Cannot write invalid like.json file') ;
                if (error) {
                    console.log(pgm + 'System error. failed to public reaction. Cannot write invalid like.json file. ' + error) ;
                    console.log(pgm + 'like = ' + JSON.stringify(like)) ;
                    z_wrapper_notification(["error", "Failed to publish reaction<br>like.json file is invalid<br>"]);
                    return done(publish);
                }
                write_like_json(function(res) {
                    var pgm = service + '.z_update_6_like_json write_like_json callback 2: ' ;

                    if (res == "ok") {
                        // data.json ok. check public chat and publish
                        // debug('public_chat', pgm + 'data.json updated. continue with public chat messages and publish') ;
                        done(true, refresh_reactions_job)  ;
                    }
                    else {
                        z_wrapper_notification(["error", "Failed to post: " + JSON.stringify(res), 5000]);
                        console.log(pgm + 'Error. Failed to post: ' + JSON.stringify(res)) ;
                    }

                }) ; // write_like_json callback 2

            }) ; // get_like_json callback 1

            done() ;

        } // z_update_6_like_json





        // export MoneyNetworkZService API
        return {
            get_watch_receiver_sha256: get_watch_receiver_sha256,
            clear_user_contents_max_size: clear_user_contents_max_size,
            load_user_contents_max_size: load_user_contents_max_size,
            get_max_image_size: get_max_image_size,
            z_update_1_data_json: z_update_1_data_json,
            cleanup_my_image_json: cleanup_my_image_json,
            load_avatar: load_avatar,
            get_avatar: get_avatar,
            inject_functions: inject_functions,
            generate_random_password: generate_random_password
        };

        // end MoneyNetworkZService
    }]) ;
