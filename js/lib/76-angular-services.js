angular.module('MoneyNetwork')

    .factory('MoneyNetworkService', ['$timeout', '$rootScope', '$window', '$location', 'dateFilter', 'MoneyNetworkHubService', 'MoneyNetworkEmojiService', 'MoneyNetworkZService', 'MoneyNetworkWService',
                             function($timeout, $rootScope, $window, $location, date, moneyNetworkHubService, moneyNetworkEmojiService, moneyNetworkZService, moneyNetworkWService)
    {
        var service = 'MoneyNetworkService' ;
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

        function get_merged_type () {
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
            return (!res || res.error) ? 'Failed. error = ' + JSON.stringify(res) : 'OK. ' + res.length + ' rows returned' ;
        }

        // lost Merger:MoneyNetwork permission after fileGet operation to a "bad" file
        // https://github.com/HelloZeroNet/ZeroNet/issues/944 & https://github.com/HelloZeroNet/ZeroNet/issues/965
        var bad_files = [
            "merged-" + get_merged_type() + "/1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh/data/users/19i2UW7b2mPd4n2iDEwmTSkc59ctF5raYa/1496604770300-1496604770300-2-chat.json"
        ] ;

        // startup tag cloud.
        // todo: Tags should be created by users and shared between contacts. one tag cloud per language
        // Used in typeahead autocomplete functionality http://angular-ui.github.io/bootstrap/#/typeahead
        var tags = ['Name', 'Email', 'Phone', 'Photo', 'Company', 'URL', 'GPS'];
        function get_tags() {
            return tags ;
        }

        function generate_random_password () {
            return moneyNetworkZService.generate_random_password();
        }

        function get_my_user_hub (cb) {
            moneyNetworkHubService.get_my_user_hub(cb) ;
        }

        //// wrappers for data.json, status.json and like.json fileGet and fileWrite operations
        function z_file_get (pgm, options, cb) {
            moneyNetworkHubService.z_file_get(pgm, options, cb) ;
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
            moneyNetworkHubService.write_like_json(cb) ;
        }
        function update_like_index (like, like_index) {
            moneyNetworkHubService.update_like_index(like, like_index);
        }

        //// optional files format:
        //// - public chat        : <to unix timestamp>-<from unix timestamp>-<user seq>-chat.json (timestamps are timestamp for last and first message in file)
        //// - old encrypted image: <unix timestamp>-image.json (not used but old files may still exist)
        //// - new encrypted image: <unix timestamp>-<user seq>-image.json
        var Z_CONTENT_OPTIONAL = moneyNetworkHubService.get_z_content_optional() ;
        //
        //// user_seq from i_am_online or z_update_1_data_json. user_seq is null when called from avatar upload. Timestamp is not updated
        //// params:
        //// - cb: optional callback function. post publish processing. used in i_am_online. check pubkey2 takes long time and best done after publish
        function zeronet_site_publish(options, cb) {
            moneyNetworkHubService.zeronet_site_publish(options, cb);
        }

        function load_user_contents_max_size (lock_pgm) { moneyNetworkZService.load_user_contents_max_size(lock_pgm) }


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


        // process feedback information in ingoing message
        function receive_feedback_info (message_with_envelope, contact) {
            var pgm = service + '.receive_feedback_info: ' ;
            var feedback, received, sent, i, message, index, local_msg_seq, old_feedback, now, error, lost_message,
                lost_message_with_envelope, lost_messages, my_unique_id, my_participant, participant_and_local_msg_seq,
                from_participant, key, contact2, j, changed_zeronet_cert, move_lost_messages, seq, js_messages_row,
                found_message, index2, participant, to_participant, contact3, k, contact4 ;
            feedback = message_with_envelope.message.feedback ;
            now = new Date().getTime() ;

            debug('feedback_info', pgm + 'feedback = ' + JSON.stringify(feedback) + ', message_with_envelope = ' + JSON.stringify(message_with_envelope)) ;

            if (contact.type == 'group') {

                // received feedback info in group chat message
                debug('feedback_info', pgm + 'contact.participants = ' + JSON.stringify(contact.participants)) ;
                my_unique_id = get_my_unique_id() ;
                for (i=0 ; i<contact.participants.length ; i++) {
                    if (contact.participants[i] == my_unique_id) my_participant = i+1 ;
                }
                debug('feedback_info', pgm + 'my participant = ' + my_participant) ;
                from_participant = message_with_envelope.participant ;

                // 1) group chat feedback.received array - check outbox
                // feedback = {"received":["3,883","3,884","1,4"]}
                // - participant - I have received local_msg_seq 883 and 884 from participant 3 in this chat group
                // - participant - I have received local_msg_seq 4 from participant 1 in this chat group
                if (feedback.received) {
                    debug('feedback_info', pgm + 'message.feedback.received = ' + JSON.stringify(feedback.received)) ;
                    // convert received array. keep only my local_msg_seq as integers
                    received = JSON.parse(JSON.stringify(feedback.received)) ;
                    // keep only rows for this participant
                    for (i=received.length-1 ; i>=0 ; i--) {
                        participant_and_local_msg_seq = received[i].split(',') ;
                        if (participant_and_local_msg_seq[0] != '' + my_participant) received.splice(i,1) ; // not to me
                        else received[i] = parseInt(participant_and_local_msg_seq[1]) ; // to me
                    }
                }
                else received = [] ;
                if (received.length > 0) {
                    debug('feedback_info', pgm + 'participant ' + my_participant + ' only. received = ' + JSON.stringify(received));

                    // array with one or more received messages from contact. '
                    // Check outbox and mark messages as received
                    // any not received messages with negativ local_msg_seq - message lost in cyberspace
                    lost_messages = [];
                    for (i = received.length - 1; i >= 0; i--) {
                        local_msg_seq = received[i];
                        if (local_msg_seq < 0) {
                            received.splice(i, 1);
                            lost_messages.push(-local_msg_seq);
                        }
                    }
                    if (lost_messages.length > 0) debug('lost_message', pgm + 'lost_messages = ' + JSON.stringify(lost_messages));

                    // check outbox
                    for (i = 0; i < contact.messages.length; i++) {
                        message = contact.messages[i];
                        if (message.folder != 'outbox') continue;
                        // outbox

                        // DRY: copy/paste to personal chat received section (feedback to group chat message in a private chat conversation)

                        local_msg_seq = message.local_msg_seq;
                        index = lost_messages.indexOf(local_msg_seq);
                        if (index != -1) {
                            // message lost in cyberspace. should be resend to contact
                            lost_message = true;
                            lost_messages.splice(index, 1);
                        }
                        else {
                            index = received.indexOf(message.local_msg_seq);
                            if (index == -1) continue; // not relevant
                            lost_message = false ;
                            received.splice(index, 1);
                        }
                        if (lost_message) {
                            debug('lost_message',
                                pgm + 'Message with local_msg_seq ' + local_msg_seq + ' has not been received by contact. ' +
                                'Could be a message sent and removed from ZeroNet when contact was offline. ' +
                                'Could be a message lost due to cryptMessage decrypt error');
                            debug('lost_message', pgm + 'message = ' + JSON.stringify(message));
                            //message = {
                            //    "folder": "outbox",
                            //    "message": {"msgtype": "chat msg", "message": "message 2 lost in cyberspace"},
                            //    "local_msg_seq": 2,
                            //    "sender_sha256": "1da65defff8140656d966c84b01411911802b401a37dc090cafdc5d02bc54c5d",
                            //    "sent_at": 1480497004317,
                            //    "ls_msg_size": 218,
                            //    "msgtype": "chat msg"
                            //};
                            if (message.zeronet_msg_id) {
                                // received a negative local_msg_id in received array: feedback = {"received":[-6]},
                                // message not received, but message is still on ZeroNet (data.json)
                                // could be an error or could be decryption error due to changed ZeroNet certificate (cryptMessage)
                                debug('lost_message', pgm + 'lost message with local_msg_seq ' + local_msg_seq +
                                    ' has a zeronet_msg_id and should still be on ZeroNet. ' +
                                    'Maybe user has changed ZeroNet certificate and is getting cryptMessage decryption error');
                            }
                            else if (!message.sent_at) console.log(pgm + 'error. lost message has never been sent. sent_at is null');
                            else {
                                debug('lost_message', pgm + 'resend old message with old local_msg_id. add old sent_at to message');
                                debug('lost_message', pgm + 'todo: group chat. lost message may have been received by other participants in group chat!');
                                if (!message.message.sent_at) message.message.sent_at = message.sent_at;
                                delete message.sent_at;
                                delete message.cleanup_at;
                                delete message.feedback;
                                // force data.json update after processing of incomming messages
                                new_incoming_receipts++;
                            }
                        }
                        else {
                            if (!message.feedback) message.feedback = {} ;
                            if (message.feedback[from_participant]) {
                                debug('feedback_info',
                                    pgm + 'warning. have already received feedback info for outbox message with local_msg_seq ' + message.local_msg_seq +
                                    ' earlier from participant ' + from_participant +
                                    '. Old timestamp = ' + message.feedback[message.participant] + ', new timestamp = ' + now);
                            }
                            message.feedback[from_participant] = now;
                            debug('feedback_info', pgm + 'message.feedback = ' + JSON.stringify(message.feedback) + ', message = ' + JSON.stringify(message)) ;
                        }
                    }

                    // check also deleted outbox messages
                    if (received.length && contact.deleted_outbox_messages) for (i = received.length - 1; i >= 0; i--) {
                        local_msg_seq = received[i] ;
                        key = from_participant + ',' + local_msg_seq;
                        debug('feedback_info', pgm + 'i = ' + i + ', local_msg_seq = ' + JSON.stringify(local_msg_seq) + ', key = ' + key);
                        if (!contact.deleted_outbox_messages.hasOwnProperty(key)) continue; // error - unknown local_msg_seq
                        received.splice(i, 1);
                        if (contact.deleted_outbox_messages[key]) {
                            debug('feedback_info',
                                pgm + 'warning. have already received feedback info for deleted outbox message with local_msg_seq ' + message.local_msg_seq +
                                ' earlier from participant ' + from_participant +
                                '. Old timestamp = ' + contact.deleted_outbox_messages[key] + ', new timestamp = ' + now);
                        }
                        contact.deleted_outbox_messages[key] = now;
                        debug('feedback_info', pgm + 'contact.deleted_outbox_messages = ' + JSON.stringify(contact.deleted_outbox_messages)) ;
                    } // for i

                    if (received.length) {
                        // error: received feedback info for one or more messages not in outbox and not in deleted_outbox_messages
                        error =
                            'Error in feedback.received array. Messages with local_msg_seq ' + JSON.stringify(received) + ' and participant ' + from_participant +
                            ' were not found in outbox or in deleted_outbox_messages. Feedback = ' + JSON.stringify(feedback) + '. ';
                        if (contact.deleted_outbox_messages) {
                            error +=
                                'contact.deleted_outbox_messages = ' + JSON.stringify(contact.deleted_outbox_messages) +
                                ', Object.keys(contact.deleted_outbox_messages) = ' + JSON.stringify(Object.keys(contact.deleted_outbox_messages));
                        }
                        console.log(pgm + error);
                    }

                } // if received

                // 2) group chat feedback.sent array - check received messages in inbox
                // receive_feedback_info: feedback = {"sent":["1,862","3,862"]}
                // - group chat participant 1 - have you received group chat message with local_msg_seq 862
                // - group chat participant 3 - have you received group chat message with local_msg_seq 862
                if (feedback.sent) {
                    debug('feedback_info', pgm + 'message.feedback.sent = ' + JSON.stringify(feedback.sent)) ;
                    // convert sent array. keep only my local_msg_seq as integers
                    sent = JSON.parse(JSON.stringify(feedback.sent)) ;
                    // keep only rows for this participant
                    for (i=sent.length-1 ; i>=0 ; i--) {
                        participant_and_local_msg_seq = sent[i].split(',') ;
                        if (participant_and_local_msg_seq[0] != '' + my_participant) sent.splice(i,1) ; // not to me
                        else sent[i] = parseInt(participant_and_local_msg_seq[1]) ; // to me
                    }
                }
                else sent = [] ;
                if (sent.length > 0) {
                    debug('feedback_info', pgm + 'participant ' + my_participant + ' only. sent = ' + JSON.stringify(sent)) ;

                    // check inbox
                    for (i=0 ; i<contact.messages.length ; i++) {
                        message = contact.messages[i] ;
                        if ((message.folder != 'inbox') || !message.message.local_msg_seq) continue ;
                        // inbox
                        local_msg_seq = message.message.local_msg_seq ;
                        index = sent.indexOf(local_msg_seq) ;
                        if (index == -1) continue ; // not relevant
                        sent.splice(index,1);
                        if (message.feedback == false) {
                            debug('feedback_info', pgm + 'already have received feedback info request for inbox message with local_msg_seq ' + local_msg_seq + ' from contact. will be sent in next outbox message. message = ' + JSON.stringify(message)) ;
                            continue ;
                        }
                        if (message.feedback) {
                            debug('feedback_info', pgm + 'has already sent feedback info for inbox message with local_msg_seq ' + local_msg_seq + ' to contact at ' + message.feedback + 'but will resend feedback info in next outbox message. message = ' + JSON.stringify(message)) ;
                        }
                        else {
                            debug('feedback_info', pgm + 'has marked inbox message with local_msg_seq ' + local_msg_seq + ' with feedback info requested. will be sent in next outbox message. message = ' + JSON.stringify(message)) ;
                        }
                        message.feedback = false ;
                    } // for i (contact.messages)

                    // feedback.sent array - contact is waiting for feedback - check also deleted inbox messages
                    if (sent.length && contact.deleted_inbox_messages) for (i=sent.length-1 ; i>= 0 ; i--) {
                        local_msg_seq = sent[i] ;
                        key = my_participant + ',' + sent[i] ;
                        debug('feedback_info', pgm + 'i = ' + i + ', key = ' + JSON.stringify(key)) ;
                        if (!contact.deleted_inbox_messages.hasOwnProperty(key)) continue ; // error - unknown local_msg_seq
                        sent.splice(i,1) ;
                        old_feedback = contact.deleted_inbox_messages[key] ;
                        if (old_feedback == false) {
                            debug('feedback_info', pgm + 'already have received feedback info request for deleted inbox message with local_msg_seq ' + local_msg_seq + ' from contact. will be sent in next outbox message') ;
                            continue ;
                        }
                        if (old_feedback) {
                            debug('feedback_info', pgm + 'has already sent feedback info for deleted inbox message with local_msg_seq ' + local_msg_seq + ' to contact at ' + old_feedback + ' but will resend feedback info in next outbox message') ;
                        }
                        else {
                            debug('feedback_info', pgm + 'has marked deleted inbox message with local_msg_seq ' + local_msg_seq + ' with feedback info requested. will be sent in next outbox message') ;
                        }
                        contact.deleted_inbox_messages[key] = false ;
                        debug('feedback_info', pgm + 'contact.deleted_inbox_messages = ' + JSON.stringify(contact.deleted_inbox_messages));
                    }

                    if (sent.length) {
                        // lost inbox messages!
                        // received feedback request for one or more messages not in inbox and not in deleted_inbox_messages
                        // could be lost not received inbox messages or could be an error.
                        debug('lost_message', pgm + 'messages with local_msg_seq ' + JSON.stringify(sent) + ' were not found in inbox');
                        if (contact.deleted_inbox_messages) {
                            debug('lost_message',
                                pgm + 'contact.deleted_inbox_messages = ' + JSON.stringify(contact.deleted_inbox_messages) +
                                ', Object.keys(contact.deleted_inbox_messages) = ' + JSON.stringify(Object.keys(contact.deleted_inbox_messages)));
                        }
                        // receive_feedback_info: messages with local_msg_seq [1,2] were not found in inbox
                        // receive_feedback_info: contact.deleted_inbox_messages = {}Object.keys(contact.deleted_inbox_messages) = ["2"]

                        // create "lost message" notification in inbox. So that user knows that some messages have been lost in cyberspace
                        for (i=0 ; i<sent.length ; i++) {
                            local_msg_seq = sent[i] ;
                            lost_message = { msgtype: 'lost msg', local_msg_seq: local_msg_seq} ;
                            // validate json
                            error = MoneyNetworkHelper.validate_json(pgm, lost_message, lost_message.msgtype, 'Cannot insert dummy lost inbox message in UI. local_msg_seq = ' + local_msg_seq);
                            if (error) {
                                console.log(pgm + error) ;
                                continue ;
                            }
                            // insert into inbox
                            local_msg_seq = next_local_msg_seq() ;
                            lost_message_with_envelope = {
                                local_msg_seq: local_msg_seq,
                                folder: 'inbox',
                                message: lost_message,
                                sent_at: now,
                                received_at: now,
                                feedback: false,
                                participant: message_with_envelope.participant
                            } ;
                            lost_message_with_envelope.ls_msg_size = JSON.stringify(lost_message_with_envelope).length ;
                            add_message(contact, lost_message_with_envelope, false) ;
                            debug('lost_message', 'added lost msg to inbox. lost_message_with_envelope = ' + JSON.stringify(lost_message_with_envelope));
                        } // for i (sent)

                    } // if sent.length > 0

                } // if feedback.sent

                // end group chat
            }
            else {
                // private encrypted chat

                // 1) feedback.received array - check outbox
                //    example. "received": [476] - contact have received outbox message with local_msg_seq 474
                //    set message.feedback = true. do not ask for feedback info in next message to contact
                if (feedback.received) {

                    // array with one or more received messages from contact. '
                    // Check outbox and mark messages as received
                    received = JSON.parse(JSON.stringify(feedback.received)) ;

                    // lost_messages
                    // - negative local_msg_seq - message has not been received
                    // - sha256 address - message received but with decrypt error (changed ZeroNet certificate)
                    lost_messages = [] ;
                    for (i=received.length-1 ; i >= 0 ; i--) {
                        if ((typeof received[i] == 'number') && (received[i] < 0)) {
                            // lost msg - message has not been received
                            lost_messages.push(-received[i]) ;
                            received.splice(i,1) ;
                        }
                        else if (typeof received[i] == 'string') {
                            // lost msg2 - message received but with decrypt error
                            lost_messages.push(received[i]) ;
                            received.splice(i,1) ;
                        }
                    }
                    if (lost_messages.length > 0) debug('lost_message', pgm + 'lost_messages = ' + JSON.stringify(lost_messages));

                    // buffer lost messages where the problem is cryptMessage and changed ZeroNet certificate
                    // receiver has more than one certificate and message was encrypted with a previous certificate
                    // move messages with decrypt errors and resend togerther with next outbox message
                    move_lost_messages = [] ;

                    // loop through outbox and deleted outbox messages for contacts with identical pubkey = identical localStorage
                    // update feedback info for received messages and also keep track og any lost messages
                    for (i=0 ; i<ls_contacts.length ; i++) {
                        contact2 = ls_contacts[i] ;
                        if (contact2.pubkey != contact.pubkey) continue ;

                        // check outbox
                        for (j=0 ; j<contact2.messages.length ; j++) {
                            message = contact2.messages[j] ;
                            if (message.folder != 'outbox') continue ;
                            // outbox
                            local_msg_seq = message.local_msg_seq ;
                            index = lost_messages.indexOf(local_msg_seq) ;
                            index2 = lost_messages.indexOf(message.zeronet_msg_id) ;
                            if ((index != -1) || (index2 != -1)) {
                                // message lost in cyberspace. should be resend to contact
                                lost_message = true ;
                                changed_zeronet_cert = (contact.auth_address != contact2.auth_address) ;
                                if (index != -1) lost_messages.splice(index,1) ;
                                else lost_messages.splice(index2,1) ;
                            }
                            else {
                                index = received.indexOf(message.local_msg_seq) ;
                                if (index == -1) continue ; // not relevant
                                received.splice(index,1) ;
                                lost_message = false ;
                            }
                            if (lost_message) {
                                if (changed_zeronet_cert && (message.encryption == 2)) {
                                    debug(
                                        'lost_message', pgm + 'Message with local_msg_seq ' + local_msg_seq + ' has not been received by contact. ' +
                                        'Probably cryptMessage decrypt error. Contact has changed ZeroNet certificate');
                                }
                                else {
                                    debug(
                                        'lost_message', pgm + 'Message with local_msg_seq ' + local_msg_seq + ' has not been received by contact. ' +
                                        'Could be a message sent and removed from ZeroNet when contact was offline. ' +
                                        'Could be a message lost due to cryptMessage decrypt error. ' +
                                        'changed zeroid cert = ' + changed_zeronet_cert + ', message.encryption = ' + message.encryption);
                                }
                                debug('lost_message', pgm + 'message = ' + JSON.stringify(message)) ;
                                //message = {
                                //    "folder": "outbox",
                                //    "message": {"msgtype": "chat msg", "message": "message 2 lost in cyberspace"},
                                //    "local_msg_seq": 2,
                                //    "sender_sha256": "1da65defff8140656d966c84b01411911802b401a37dc090cafdc5d02bc54c5d",
                                //    "sent_at": 1480497004317,
                                //    "ls_msg_size": 218,
                                //    "msgtype": "chat msg"
                                //};
                                if (message.zeronet_msg_id) {
                                    debug('lost_message', pgm + 'lost message with local_msg_seq ' + local_msg_seq +
                                        ' has a zeronet_msg_id and should still be on ZeroNet. ') ;
                                    if (changed_zeronet_cert) debug('lost_message', pgm + 'User has changed ZeroNet certificate and is probably getting cryptMessage decryption error') ;
                                    // should be resend in next z_update_1_data_json. delete old message from data.msg array and send again.
                                    // using this trick should do it.
                                    // see z_update_1_data_json "lost message. resending outbox messages that still is in data.json file"
                                    if (!message.message.sent_at) message.message.sent_at = message.sent_at ;
                                    if (!message.message.message_sha256) message.message.message_sha256 = message.zeronet_msg_id ;
                                    debug('lost_message', pgm + 'marked message with message.message.sent_at = ' + message.message.sent_at + '. resending together with next outbox message');
                                    if (changed_zeronet_cert && (message.encryption == 2)) {
                                        debug('lost_message',
                                            pgm + 'message must be moved from old contact to new contact before resending. ' +
                                            'old contact = ' + contact2.unique_id + ', new contact = ' + contact.unique_id) ;
                                        move_lost_messages.push({
                                            seq: message.seq,
                                            old_contact: contact2.unique_id, // original contact
                                            new_contact: contact.unique_id // current contact where feedback info were received from
                                        })
                                    }
                                }
                                else if (!message.sent_at) console.log(pgm + 'error. lost message has never been sent. sent_at is null') ;
                                else  {
                                    debug('lost_message', pgm + 'resend old message with old local_msg_id. add old sent_at to message') ;
                                    if (!message.message.sent_at) message.message.sent_at = message.sent_at ;
                                    delete message.sent_at ;
                                    delete message.cleanup_at ;
                                    delete message.feedback ;
                                    // force data.json update after processing of incomming messages
                                    new_incoming_receipts++ ;
                                }
                            }
                            else {
                                if (message.feedback) debug('feedback_info', pgm + 'warning. have already received feedback info for outbox message with local_msg_seq ' + message.local_msg_seq + ' earlier. Old timestamp = ' + message.feedback + ', new timestamp = ' + now) ;
                                message.feedback = now ;
                            }
                        }

                        // check deleted outbox messages
                        if (received.length && contact2.deleted_outbox_messages) for (j=received.length-1 ; j >= 0 ; j--) {
                            local_msg_seq = '' + received[j] ;
                            // debug('feedback_info', pgm + 'j = ' + i + ', local_msg_seq = ' + JSON.stringify(local_msg_seq)) ;
                            if (!contact2.deleted_outbox_messages.hasOwnProperty(local_msg_seq)) continue ; // error - unknown local_msg_seq
                            received.splice(j,1);
                            if (contact2.deleted_outbox_messages[local_msg_seq]) debug('feedback_info', pgm + 'warning. have already received feedback info for deleted outbox message with local_msg_seq ' + message.local_msg_seq + ' earlier. Old timestamp = ' + contact2.deleted_outbox_messages[local_msg_seq] + ', new timestamp = ' + now) ;
                            contact2.deleted_outbox_messages[local_msg_seq] = now ;
                        }

                        // check group chat outbox messages (feedback to group chat message in a private chat conversation)
                        if (received.length) {
                            participant = contact2.unique_id ;
                            console.log(pgm + 'todo: check also sent group chat messages to contact with unique id ' + participant) ;
                            for (j=0 ; j<ls_contacts.length ; j++) {
                                contact3 = ls_contacts[j] ;
                                if (contact3.type != 'group') continue ;
                                to_participant = contact3.participants.indexOf(participant) ;
                                if (to_participant == -1) continue ;
                                // debug info
                                contact4 = JSON.parse(JSON.stringify(contact3)) ;
                                delete contact4.messages ;
                                delete contact4.inbox_zeronet_msg_id ;
                                console.log(pgm + 'found relevant group contact ' + JSON.stringify(contact4)) ;
                                console.log(pgm + 'to_participant = ' + to_participant) ;
                                for (k=0 ; k<contact3.messages.length ; k++) {
                                    message = contact3.messages[k] ;
                                    if (message.folder != 'outbox') continue ;
                                    // outbox

                                    // DRY: copy/paste from group chat received section
                                    local_msg_seq = message.local_msg_seq;
                                    index = lost_messages.indexOf(local_msg_seq);
                                    if (index != -1) {
                                        // message lost in cyberspace. should be resend to contact
                                        lost_message = true;
                                        lost_messages.splice(index, 1);
                                    }
                                    else {
                                        index = received.indexOf(message.local_msg_seq);
                                        if (index == -1) continue; // not relevant
                                        lost_message = false ;
                                        received.splice(index, 1);
                                    }
                                    if (lost_message) {
                                        debug('lost_message',
                                            pgm + 'Message with local_msg_seq ' + local_msg_seq + ' has not been received by contact. ' +
                                            'Could be a message sent and removed from ZeroNet when contact was offline.');
                                        debug('lost_message', pgm + 'message = ' + JSON.stringify(message));
                                        //message = {
                                        //    "folder": "outbox",
                                        //    "message": {"msgtype": "chat msg", "message": "message 2 lost in cyberspace"},
                                        //    "local_msg_seq": 2,
                                        //    "sender_sha256": "1da65defff8140656d966c84b01411911802b401a37dc090cafdc5d02bc54c5d",
                                        //    "sent_at": 1480497004317,
                                        //    "ls_msg_size": 218,
                                        //    "msgtype": "chat msg"
                                        //};
                                        if (message.zeronet_msg_id) {
                                            // received a negative local_msg_id in received array: feedback = {"received":[-6]},
                                            // message not received, but message is still on ZeroNet (data.json)
                                            // could be an error or could be decryption error due to changed ZeroNet certificate (cryptMessage)
                                            debug('lost_message', pgm + 'UPS: lost message with local_msg_seq ' + local_msg_seq +
                                                ' has a zeronet_msg_id and should still be on ZeroNet.');
                                        }
                                        else if (!message.sent_at) console.log(pgm + 'error. lost message has never been sent. sent_at is null');
                                        else {
                                            debug('lost_message', pgm + 'resend old message with old local_msg_id. add old sent_at to message');
                                            debug('lost_message', pgm + 'todo: group chat. lost message may have been received by other participants in group chat!');
                                            if (!message.message.sent_at) message.message.sent_at = message.sent_at;
                                            delete message.sent_at;
                                            delete message.cleanup_at;
                                            delete message.feedback;
                                            // force data.json update after processing of incomming messages
                                            new_incoming_receipts++;
                                        }
                                    }
                                    else {
                                        if (!message.feedback) message.feedback = {} ;
                                        if (message.feedback[to_participant]) {
                                            debug('feedback_info',
                                                pgm + 'warning. have already received feedback info for outbox message with local_msg_seq ' + message.local_msg_seq +
                                                ' earlier from participant ' + to_participant +
                                                '. Old timestamp = ' + message.feedback[message.participant] + ', new timestamp = ' + now);
                                        }
                                        message.feedback[to_participant] = now;
                                        debug('feedback_info', pgm + 'message.feedback = ' + JSON.stringify(message.feedback) + ', message = ' + JSON.stringify(message)) ;
                                    }

                                } // for k (messages)

                            } // for j (contacts)
                        }

                    } // for i (contacts)


                    if (received.length) {
                        // error: received feedback info for one or more messages not in outbox and not in deleted_outbox_messages
                        error =
                            'Error in feedback.received array. Messages with local_msg_seq ' + JSON.stringify(received) +
                            ' were not found in outbox or in deleted_outbox_messages. Feedback = ' + JSON.stringify(feedback) +
                            '. Error should only occur after using deleted contact button. ';
                        for (i=0 ; i<ls_contacts.length ; i++) {
                            contact2 = ls_contacts[i] ;
                            if (contact2.pubkey != contact.pubkey) continue ;
                            if (contact2.deleted_outbox_messages) {
                                error +=
                                    'contact2.deleted_outbox_messages = ' + JSON.stringify(contact2.deleted_outbox_messages) +
                                    ', Object.keys(contact2.deleted_outbox_messages) = ' + JSON.stringify(Object.keys(contact2.deleted_outbox_messages)) ;
                            }
                        } // i
                        console.log(pgm + error) ;
                    }
                } // if (received)

                // private encrypted chat
                // 2) feedback.sent array - check inbox
                //    example: "sent": [2] - contact has sent message with local_msg_seq 2 and is waiting for feedback

                if (feedback.sent) {
                    sent = JSON.parse(JSON.stringify(feedback.sent)) ;


                    // check inbox and deleted inbox messages for contacts with identical pubkey = identical localStorage
                    for (i=0 ; i<ls_contacts.length ; i++) {
                        contact2 = ls_contacts[i] ;
                        if (contact2.pubkey != contact.pubkey) continue ;

                        // check inbox
                        for (j=0 ; j<contact2.messages.length ; j++) {
                            message = contact2.messages[j] ;
                            if ((message.folder != 'inbox') || !message.message.local_msg_seq) continue ;
                            // inbox
                            local_msg_seq = message.message.local_msg_seq ;
                            index = sent.indexOf(local_msg_seq) ;
                            if (index == -1) continue ; // not relevant
                            sent.splice(index,1);
                            if (message.feedback == false) {
                                debug('feedback_info',
                                    pgm + 'already have received feedback info request for inbox message with local_msg_seq ' +
                                    local_msg_seq + ' from contact. will be sent in next outbox message') ;
                                continue ;
                            }
                            if (message.feedback) {
                                debug('feedback_info',
                                    pgm + 'has already sent feedback info for inbox message with local_msg_seq ' + local_msg_seq +
                                    ' to contact at ' + message.feedback + 'but will resend feedback info in next outbox message') ;
                            }
                            else {
                                debug('feedback_info',
                                    pgm + 'has marked inbox message with local_msg_seq ' + local_msg_seq +
                                    ' with feedback info requested. will be sent in next outbox message') ;
                            }
                            message.feedback = false ;
                        } // for j (contact2.messages)

                        // feedback.sent array - contact is waiting for feedback - check also deleted inbox messages
                        if (sent.length && contact2.deleted_inbox_messages) for (j=sent.length-1 ; j>= 0 ; j--) {
                            local_msg_seq = '' + sent[j] ;
                            // debug('feedback_info', pgm + 'j = ' + i + ', local_msg_seq = ' + JSON.stringify(local_msg_seq)) ;
                            if (!contact2.deleted_inbox_messages.hasOwnProperty(local_msg_seq)) continue ; // error - unknown local_msg_seq
                            sent.splice(j,1) ;
                            old_feedback = contact2.deleted_inbox_messages[local_msg_seq] ;
                            if (old_feedback == false) {
                                debug('feedback_info',
                                    pgm + 'already have received feedback info request for deleted inbox message with local_msg_seq ' + local_msg_seq +
                                    ' from contact. will be sent in next outbox message') ;
                                continue ;
                            }
                            if (old_feedback) {
                                debug('feedback_info',
                                    pgm + 'has already sent feedback info for deleted inbox message with local_msg_seq ' + local_msg_seq +
                                    ' to contact at ' + old_feedback + ' but will resend feedback info in next outbox message') ;
                            }
                            else {
                                debug('feedback_info',
                                    pgm + 'has marked deleted inbox message with local_msg_seq ' + local_msg_seq +
                                    ' with feedback info requested. will be sent in next outbox message') ;
                            }
                            contact2.deleted_inbox_messages[local_msg_seq] = false ;
                        }

                    } // for i (contacts)

                    if (sent.length) {
                        // lost inbox messages!
                        // received feedback request for one or more messages not in inbox and not in deleted_inbox_messages
                        // could be lost not received inbox messages or could be an error.
                        debug('lost_message', pgm + 'messages with local_msg_seq ' + JSON.stringify(sent) + ' were not found in inbox');
                        // receive_feedback_info: messages with local_msg_seq [1,2] were not found in inbox
                        // debug. show relevant deleted_inbox_messages in log
                        for (i=0 ; i<ls_contacts.length ; i++) {
                            contact2 = ls_contacts[i] ;
                            if (contact2.pubkey != contact.pubkey) continue ;
                            if (contact2.deleted_inbox_messages) {
                                debug('lost_message',
                                    pgm + 'contact2.deleted_inbox_messages = ' + JSON.stringify(contact2.deleted_inbox_messages) +
                                    ', Object.keys(contact2.deleted_inbox_messages) = ' + JSON.stringify(Object.keys(contact2.deleted_inbox_messages)));
                                // receive_feedback_info: contact.deleted_inbox_messages = {}Object.keys(contact.deleted_inbox_messages) = ["2"]
                            }
                        } // for i (contacts)

                        // create "lost message" notification in inbox? User should know that some messages were lost in cyberspace
                        for (i=0 ; i<sent.length ; i++) {
                            local_msg_seq = sent[i] ;
                            lost_message = { msgtype: 'lost msg', local_msg_seq: local_msg_seq} ;
                            // validate json
                            error = MoneyNetworkHelper.validate_json(pgm, lost_message, lost_message.msgtype, 'Cannot insert dummy lost inbox message in UI. local_msg_seq = ' + local_msg_seq);
                            if (error) {
                                console.log(pgm + error) ;
                                continue ;
                            }
                            // insert into inbox
                            local_msg_seq = next_local_msg_seq() ;
                            lost_message_with_envelope = {
                                local_msg_seq: local_msg_seq,
                                folder: 'inbox',
                                message: lost_message,
                                sent_at: now,
                                received_at: now,
                                feedback: false
                            } ;
                            lost_message_with_envelope.ls_msg_size = JSON.stringify(lost_message_with_envelope).length ;
                            add_message(contact, lost_message_with_envelope) ;
                            debug('lost_message', 'added lost msg to inbox. lost_message_with_envelope = ' + JSON.stringify(lost_message_with_envelope));
                            //lost_message_with_envelope = {
                            //    "local_msg_seq": 199,
                            //    "folder": "inbox",
                            //    "message": {"msgtype": "lost msg", "local_msg_seq": 448},
                            //    "sent_at": 1481539270908,
                            //    "received_at": 1481539270908,
                            //    "feedback": false,
                            //    "ls_msg_size": 160,
                            //    "seq": 29
                            //} ;

                        } // for i (sent)

                    } // if sent.length > 0

                } // if feedback.sent

                if (move_lost_messages && (move_lost_messages.length > 0)) {
                    // received lost message feedback (negative local_msg_seq)
                    // message has not been received by contact
                    // contact is using cryptMessage encryption and has changed certificate (decrypt error in contact inbox)
                    // message will be resend together with next outbox message
                    // move message from contact with old certificate to contact with now certificate
                    debug('lost_message', pgm + 'move_lost_messages = ' + JSON.stringify(move_lost_messages)) ;
                    for (i=0 ; i<move_lost_messages.length ; i++) {
                        seq = move_lost_messages[i].seq ;
                        js_messages_row = get_message_by_seq(move_lost_messages[i].seq) ;
                        if (!js_messages_row) {
                            console.log(pgm + 'move message failed. did not find message with seq ' + seq) ;
                            continue ;
                        }
                        contact = get_contact_by_unique_id(move_lost_messages[i].new_contact) ;
                        if (!contact) {
                            console.log(pgm + 'move message failed. did not find new contact with unique id ' + move_lost_messages[i].new_contact) ;
                            continue ;
                        }
                        contact2 = get_contact_by_unique_id(move_lost_messages[i].old_contact) ;
                        if (!contact2) {
                            console.log(pgm + 'move message failed. did not find old contact with unique id ' + move_lost_messages[i].old_contact) ;
                            continue ;
                        }
                        // remove message from old contact2
                        found_message = false ;
                        for (j=0 ; j<contact2.messages.length ; j++) {
                            message = contact2.messages[j] ;
                            if (message.seq == seq) {
                                found_message = true ;
                                contact2.messages.splice(j,1) ;
                                break ;
                            }
                        } // for j (contact2.messages)
                        if (!found_message) {
                            console.log(pgm + 'move message failed. Did not found message with seq ' + seq) ;
                            continue ;
                        }
                        // add message to new contact
                        contact.messages.push(js_messages_row.message) ;
                        // update js_messages array
                        js_messages_row.contact = contact ;
                    } // for i (move_lost_messages)
                }

                // end normal chat
            }

        } // receive_feedback_info



        // update zeronet step 1. update "data.json" file. update users, search and msg (delete only) arrays
        // params:
        // - lock_pgm - pgm from calling process. write warning if multiple z_update_1_data_json running calls
        // - publish - optional param. true: force publish when finish even if there is no changes to data.json
        //             for example after update to optional files
        function z_update_1_data_json (lock_pgm, publish) {
            moneyNetworkZService.z_update_1_data_json (lock_pgm, publish) ;
        } // z_update_1_data_json

        //// temporary solution instead of fileDelete
        //// see https://github.com/HelloZeroNet/ZeroNet/issues/726
        function write_empty_chat_file (file_path, cb) {
            moneyNetworkHubService.write_empty_chat_file(file_path, cb);
        }

        function cleanup_my_image_json (sent_at, logical_delete, cb) {
            moneyNetworkZService.cleanup_my_image_json (sent_at, logical_delete, cb);
        } // cleanup_my_image_json


        // user info. Array with tag, value and privacy.
        // saved in localStorage. Shared with contacts depending on privacy choice
        function empty_user_info_line() {
            return { tag: '', value: '', privacy: ''} ;
        }
        function is_user_info_empty () {
            return moneyNetworkEmojiService.is_user_info_empty() ;
        }
        function load_user_info (create_new_account, guest) {
            moneyNetworkEmojiService.load_user_info(create_new_account, guest) ;
        }
        function get_user_info () {
            return z_cache.user_info ;
        }
        function save_user_info () {
            moneyNetworkEmojiService.save_user_info(function () {
                var pgm = service + '.save_user_info save_user_info callback: ' ;
                MoneyNetworkHelper.ls_save() ;
                z_update_1_data_json(pgm) ;
                z_contact_search(function () {$rootScope.$apply()}, null, null) ;
            })
        }

        // privacy options for user info - descriptions in privacyTitleFilter
        var privacy_options = ['Search', 'Public', 'Unverified', 'Verified', 'Hidden'] ;
        function get_privacy_options () {
            return privacy_options ;
        }
        var show_privacy_title = false ;
        function get_show_privacy_title() {
            return show_privacy_title ;
        }
        function set_show_privacy_title (show) {
            show_privacy_title = show ;
        }


        //// hash with private reactions
        var ls_reactions = moneyNetworkHubService.get_ls_reactions() ;
        function ls_load_reactions () { return moneyNetworkHubService.ls_load_reactions() }
        function ls_save_reactions (update_zeronet) {
            var cb = update_zeronet ? z_update_1_data_json : false ;
            moneyNetworkHubService.ls_save_reactions(cb) ;
        } // ls_save_reactions


        // arrays with contacts from localStorage
        var ls_contacts = moneyNetworkHubService.get_ls_contacts() ; // array with contacts
        var ls_contacts_deleted_sha256 = moneyNetworkHubService.get_ls_contacts_deleted_sha256() ; // hash with sender_sha256 addresses for deleted contacts (deleted outbox messages)

        // contacts array helper functions
        function clear_contacts () { return moneyNetworkHubService.clear_contacts() }
        function add_contact (contact) { return moneyNetworkHubService.add_contact(contact) }
        function remove_contact (index) { return moneyNetworkHubService.remove_contact(index) }
        function get_contact_by_unique_id (unique_id) { return moneyNetworkHubService.get_contact_by_unique_id(unique_id)}
        function get_contact_by_password_sha256 (password_sha256) {return moneyNetworkHubService.get_contact_by_password_sha256 (password_sha256) }
        function get_contacts_by_cert_user_id (cert_user_id) {return moneyNetworkHubService.get_contacts_by_cert_user_id (cert_user_id) }
        function get_contact_name (contact) { return moneyNetworkHubService.get_contact_name (contact) }
        function get_public_contact (create) { return moneyNetworkHubService.get_public_contact (create)}
        function get_public_chat_outbox_msg (timestamp) { return moneyNetworkHubService.get_public_chat_outbox_msg (timestamp) }
        
        var ls_msg_factor = 0.67 ; // factor. from ls_msg_size to "real" size. see formatMsgSize filter. used on chat
        var js_messages = moneyNetworkHubService.get_js_messages() ; // array with { :contact => contact, :message => message } - one row for each message

        function clear_messages () { moneyNetworkHubService.clear_messages() }

        function get_user_reactions () { return moneyNetworkEmojiService.get_user_reactions() }
        moneyNetworkHubService.inject_functions({get_user_reactions: get_user_reactions}) ;

        function add_message_parent_index (message) { return moneyNetworkHubService.add_message_parent_index (message) }

        // add message to 1) contact, 2) js_messages and 3) js_messages_index
        // load_contacts:
        // - true: called from ls_load_contacts or load_public_chat
        // - false: do not add message to contact.messages array (already there)
        function add_message(contact, message, load_contacts) {
            moneyNetworkHubService.add_message(contact, message, load_contacts)
        }
        function message_add_local_msg_seq(js_messages_row, local_msg_seq) { moneyNetworkHubService.message_add_local_msg_seq(js_messages_row, local_msg_seq)}
        function message_add_sender_sha256(js_messages_row, sender_sha256) { moneyNetworkHubService.message_add_sender_sha256(js_messages_row, sender_sha256)}
        function get_message_by_seq (seq) { return moneyNetworkHubService.get_message_by_seq (seq) }
        function get_message_by_sender_sha256 (sender_sha256) { return moneyNetworkHubService.get_message_by_sender_sha256 (sender_sha256) }
        function get_message_by_local_msg_seq (local_msg_seq) { return moneyNetworkHubService.get_message_by_local_msg_seq (local_msg_seq) }
        function remove_message (js_messages_row) { moneyNetworkHubService.remove_message (js_messages_row) } 
        function recursive_delete_message (message) { return moneyNetworkHubService.recursive_delete_message (message) }

        // wrappers
        function get_last_online (contact) {
            return MoneyNetworkHelper.get_last_online(contact) ;
        }
        function set_last_online (contact, last_online) {
            MoneyNetworkHelper.set_last_online(contact, last_online) ;
        }

        //// check sha256 addresses in localStorage <=> sha256 addresses in data.json file. Should normally be identical
        function check_sha256_addresses (context, update_local_storage, correct_errors) {
            return moneyNetworkHubService.check_sha256_addresses (context, update_local_storage, correct_errors) ;
        }


        // get contacts stored in localStorage
        function ls_load_contacts () {
            var pgm = service + '.ls_load_contacts: ' ;
            var contacts_str, new_contacts, unique_id, new_contact, old_userid ;
            old_userid = z_cache.user_id ;
            contacts_str = MoneyNetworkHelper.getItem('contacts') ;
            if (contacts_str) {
                try {
                    new_contacts = JSON.parse(contacts_str);
                }
                catch (e) {
                    console.log(pgm + 'error. contacts was invalid. error = ' + e.message) ;
                    new_contacts = [] ;
                }
            }
            else new_contacts = [] ;
            clear_contacts() ;
            clear_messages() ;
            var i, j, contacts_updated = false, receiver_sha256 ;
            var old_contact ;
            var ls_msg_size_total = 0 ;
            var found_group_tag ;
            var no_participants ;
            var debug_seq ;

            // startup. fix old errors. migrate to newer structure, etc
            for (i=0 ; i<new_contacts.length ; i++) {
                new_contact = new_contacts[i] ;

                // issue #154 - Group chat messages not replicated
                // change unique id for group chat contacts. sha256(participants) => sha256(password)
                if ((new_contact.type == 'group') && (new_contact.unique_id == CryptoJS.SHA256(JSON.stringify(new_contact.participants)).toString())) {
                    new_contact.unique_id = CryptoJS.SHA256(new_contact.password).toString() ;
                }

                unique_id = new_contact.unique_id ;
                if (!new_contact.messages) new_contact.messages = [] ;

                // fix old spelling error. rename send_at to sent_at in messages
                for (j=0 ; j<new_contact.messages.length ; j++) {
                    if (new_contact.messages[j].send_at) {
                        new_contact.messages[j].sent_at = new_contact.messages[j].send_at ;
                        delete new_contact.messages[j].send_at ;
                        contacts_updated = true ;
                    }
                }

                // group chat. add dummy cert_user_id. before add_contact (index on cert_user_id)
                if ((new_contact.type == 'group') && !new_contact.cert_user_id) new_contact.cert_user_id = new_contact.unique_id.substr(0,13) + '@moneynetwork' ;

                // fix error with doublet contacts in local storage. merge contacts
                old_contact = get_contact_by_unique_id(unique_id) ;
                if (old_contact) {
                    console.log(pgm + 'warning: doublet contact with unique id ' + unique_id + ' in localStorage') ;
                    // skip new doublet contact but keep messages
                    for (j=0 ; j<new_contact.messages.length ; j++) old_contact.messages.push(new_contact.messages[j]) ;
                    contacts_updated = true ;
                }
                else add_contact(new_contact) ;

                // delete array deleted_messages. now using sender_sha256 hash to keep track of sender_sha256 messages
                if (new_contact.deleted_messages) delete new_contact.deleted_messages ;

                // rename sender_sha256 hash (deleted outbox messages)
                if (new_contact.sender_sha256) {
                    new_contact.outbox_sender_sha256 = new_contact.sender_sha256 ;
                    delete new_contact.sender_sha256 ;
                    contacts_updated = true ;
                }

                // add 3 new inbox fields to contact:
                // - inbox_zeronet_msg_id - keep zeronet_msg_id for deleted inbox messages - must not download deleted messages from zeronet again
                // - inbox_last_sender_sha256 - last received sender_sha256 from contact - always reply to last received sender_sha256
                // - inbox_last_sender_sha256_at - timestamp
                if (!new_contact.inbox_zeronet_msg_id) {
                    new_contact.inbox_zeronet_msg_id = [] ;
                    new_contact.inbox_last_sender_sha256 = null ;
                    new_contact.inbox_last_sender_sha256_at = 0 ;
                    for (j=new_contact.messages.length-1 ; j >= 0 ; j--) {
                        if (new_contact.messages[j].folder != 'inbox') continue ;
                        if (new_contact.messages[j].deleted_at && new_contact.messages[j].zeronet_msg_id) {
                            new_contact.inbox_zeronet_msg_id.push(new_contact.messages[j].zeronet_msg_id);
                        }
                        if (new_contact.messages[j].sender_sha256 && (new_contact.messages[j].sent_at > new_contact.inbox_last_sender_sha256_at)) {
                            new_contact.inbox_last_sender_sha256 = new_contact.messages[j].sender_sha256 ;
                            new_contact.inbox_last_sender_sha256_at = new_contact.messages[j].sent_at ;
                        }
                        if (new_contact.messages[j].deleted_at) new_contact.messages.splice(j,1);
                    }
                   contacts_updated = true ;
                }

                // group chat. add empty search array
                if ((new_contact.type == 'group') && !new_contact.search) new_contact.search = [] ;

                //// add feedback=true to outbox messages. that is messages where inbox.receiver_sha256 = outbox.sender_sha256
                //if (new_contact.outbox_sender_sha256) {
                //    for (receiver_sha256 in new_contact.outbox_sender_sha256) {
                //        for (j=0 ; j<new_contact.messages.length ; j++) {
                //            if (new_contact.messages[j].folder != 'outbox') continue ;
                //            if (new_contact.messages[j].sender_sha256 == receiver_sha256) new_contact.messages[j].feedback = true ;
                //        }
                //    }
                //}

                // add "row" sequence to search array
                // rename Last updated timestamp to Online
                if (new_contact) for (j=0 ; j<new_contact.search.length ; j++) {
                    new_contact.search[j].row = j+1 ;
                    if (typeof new_contact.search[j].value == 'number') new_contact.search[j].tag = 'Online' ;
                }

                // issue #??? - debug group contact
                if (new_contact.type == 'group') console.log(pgm + 'unique_id = ' + new_contact.unique_id + ', participants = ' + JSON.stringify(new_contact.participants) + ', password = ' + new_contact.password) ;

                // insert copy of messages into chat friendly array
                for (j=0 ; j<new_contact.messages.length ; j++) {
                    // fix error. there should not be urls in image.
                    if (new_contact.messages[j].message.image && new_contact.messages[j].message.image.toString().match(/^http/)) {
                        console.log(pgm + 'new_contact.messages[' + j + '] = ' + JSON.stringify(new_contact.messages[j]));
                        delete new_contact.messages[j].message.image ;
                        contacts_updated = true ;
                    }
                    // fix comment with invalid parent
                    if (new_contact.messages[j].sent_at == 1489913094588) {
                        delete new_contact.messages[j].parent ;
                        contacts_updated = true ;
                    }
                    // no msgtype in envelope
                    delete new_contact.messages[j].msgtype ;
                    // no money_transactions_status in envelope
                    if (new_contact.messages[j].money_transactions_status) {
                        delete new_contact.messages[j].money_transactions_status ;
                        contacts_updated = true ;
                    }
                    // delete old reactions
                    if ((new_contact.messages[j].message.msgtype == 'reaction') && (!new_contact.messages[j].deleted_at)) {
                        if (new_contact.messages[j].folder == 'inbox') new_contact.messages[j].deleted_at = new Date().getTime() ;
                        else if (new_contact.messages[j].sent_at && !new_contact.messages[j].zeronet_msg_id) new_contact.messages[j].deleted_at = new Date().getTime() ;
                    }
                    new_contact.messages[j].ls_msg_size = JSON.stringify(new_contact.messages[j]).length ;
                    ls_msg_size_total = ls_msg_size_total + new_contact.messages[j].ls_msg_size ;
                    add_message(new_contact, new_contact.messages[j], true) ;
                } // for j (messages)
            } // for i (contacts)
            if (contacts_updated) ls_save_contacts(false);
            //console.log(pgm + 'ls_contacts = ' + JSON.stringify(ls_contacts));

            // calculate ls_msg_factor. from ls_msg_size to "real" size. see formatMsgSize filter. used in chat UI
            if (ls_msg_size_total) {
                var ls_contacts_size = MoneyNetworkHelper.getItemSize('contacts'); // size in localStorage before decrypt and decompress
                ls_msg_factor = ls_contacts_size / ls_msg_size_total ;
            }
            else ls_msg_factor = -ls_msg_factor ; // no messages. ls_msg_factor = -0.67
            //console.log(pgm +
            //    'ls_msg_size_total (clear text) = ' + ls_msg_size_total +
            //    ', ls_contacts_size (encrypted and compressed) = ' + ls_contacts_size +
            //    ', ls_msg_factor = ' + ls_msg_factor) ;

            // three nested callbacks: 1) get public key and user seq. 2) refresh avatars and 3) check data.json

            // load sender_sha256 addresses used in deleted contacts
            var deleted_sha256_str, new_deleted_sha256, sender_sha256 ;
            deleted_sha256_str = MoneyNetworkHelper.getItem('deleted_sha256') ;
            if (deleted_sha256_str) {
                try {
                    new_deleted_sha256 = JSON.parse(deleted_sha256_str);
                }
                catch (e) {
                    console.log(pgm + 'error. deleted_sha256 was invalid. error = ' + e.message) ;
                    new_deleted_sha256 = {} ;
                }
            }
            else new_deleted_sha256 = {} ;
            for (sender_sha256 in new_deleted_sha256) {
                ls_contacts_deleted_sha256[sender_sha256] = new_deleted_sha256[sender_sha256] ;
            }

            // 1) get pubkeys from ZeroNet and preferred encryption. also set user_seq and timestamp
            // Use auth_address and check unique id.
            var contact, auth_addresses = [] ;
            for (i=0 ; i<ls_contacts.length ; i++) {
                contact = ls_contacts[i] ;
                if (contact.type == 'group') continue ; // pseudo contact used for group chat. no public key. only password
                // console.log(pgm + i + ': contact.type = ' + contact.type + ', contact.auth_address = ' + contact.auth_address)
                if (auth_addresses.indexOf(contact.auth_address) == -1) auth_addresses.push(contact.auth_address);
            }
            // console.log(pgm + 'auth_addresses = ' + JSON.stringify(auth_addresses)) ;
            if (auth_addresses.length == 0) {
                // new user - no contacts - user must enter some search tags to find contacts
                ls_save_contacts(false);
                return ;
            }

            // Merger Site OK. Have added hub to select. Using user data from last updated hub. Checking for conflicting user encryption information
            var mn_query_3 =
                "select" +
                "  substr(data_json.directory, 1, instr(data_json.directory,'/')-1) as hub," +
                "  substr(data_json.directory, instr(data_json.directory,'/data/users/')+12) as auth_address,"+
                "  users.user_seq, users.pubkey, users.pubkey2,users.encryption, status.timestamp " +
                "from json as data_json, json as content_json, users, json as status_json, status " +
                "where " ;
            for (i = 0; i < auth_addresses.length; i++) {
                if (i == 0) mn_query_3 += '(' ;
                else mn_query_3 += ' or ';
                mn_query_3 += "data_json.directory like '%/users/" + auth_addresses[i] + "'";
            } // for i
            mn_query_3 += ") " +
                "and data_json.file_name = 'data.json' " +
                "and data_json.json_id = users.json_id " +
                "and content_json.directory = data_json.directory " +
                "and content_json.file_name = 'content.json' " +
                "and status_json.directory = data_json.directory " +
                "and status_json.file_name = 'status.json' " +
                "and status.json_id = status_json.json_id " +
                "and status.user_seq = users.user_seq" ;
            debug('select', pgm + 'query 3 (MS OK) = ' + mn_query_3);
            debug_seq = debug_z_api_operation_start(pgm, 'mn query 3', 'dbQuery', show_debug('z_db_query')) ;
            ZeroFrame.cmd("dbQuery", [mn_query_3], function (res) {
                var pgm = service + '.ls_load_contacts dbQuery callback 1: ';
                var res_hash, i, auth_address, unique_id, found_hub, found_user_seq, found_pubkey, found_pubkey2,
                    found_encryption, found_last_updated, conflicting_information, delete_contact, mn_query_4 ;
                debug_z_api_operation_end(debug_seq, format_q_res(res)) ;
                // console.log(pgm + 'res.length = ' + res.length);
                if (res.error) {
                    ZeroFrame.cmd("wrapperNotification", ["error", "Search for public keys: " + res.error, 5000]);
                    console.log(pgm + "Search for pubkeys failed: " + res.error);
                    console.log(pgm + 'query = ' + mn_query_3);
                    console.log(pgm + '2) avatar check skipped and 3) data.json check skipped');
                    return ;
                }
                if (detected_client_log_out(pgm, old_userid)) return ;

                // console.log(pgm + 'res = ' + JSON.stringify(res));
                res_hash = {};
                for (i = 0; i < res.length; i++) {
                    if (!res_hash.hasOwnProperty(res[i].auth_address)) res_hash[res[i].auth_address] = [];
                    res_hash[res[i].auth_address].push({
                        hub: res[i].hub,
                        user_seq: res[i].user_seq,
                        pubkey: res[i].pubkey,
                        pubkey2: res[i].pubkey2,
                        encryption: res[i].encryption,
                        last_updated: Math.round(res[i].timestamp / 1000)
                    });
                } // for i
                // console.log(pgm + 'res_hash = ' + JSON.stringify(res_hash));

                // control. check that pubkey in contacts are identical with pubkeys from this query
                // delete contact helper. keep or delete contact without public key?
                delete_contact = function (contact, i) {
                    var msg, last_updated, j, no_msg;
                    msg = 'Public keys was not found for ' + get_contact_name(contact);
                    last_updated = get_last_online(contact);
                    if (last_updated) msg += '. Last online ' + date(last_updated * 1000, 'short');
                    if (['new', 'guest'].indexOf(contact.type) != -1) {
                        no_msg = 0;
                        for (j = 0; j < contact.messages.length; j++) {
                            if (!contact.messages[j].deleted_at) no_msg++;
                        }
                    }
                    if ((contact.type == 'ignore') || ((['new', 'guest'].indexOf(contact.type) != -1) && (no_msg == 0))) {
                        msg += '. Contact was deleted';
                        remove_contact(i);
                    }
                    else msg += '. Contact with ' + no_msg + ' chat message(s) was not deleted';
                    debug('no_pubkey', pgm + msg);
                }; // delete_contact
                for (i = ls_contacts.length - 1; i >= 0; i--) {
                    contact = ls_contacts[i];
                    if (contact.type == 'group') continue;
                    auth_address = contact.auth_address;
                    if (!res_hash.hasOwnProperty(auth_address)) {
                        delete_contact(contact, i);
                        continue;
                    }
                    // contact info found on more that one hub? Use hub with last updated status timestamp
                    // contact may have selected to hide online status (not update status timestamp)
                    found_hub = null ;
                    found_user_seq = null;
                    found_pubkey = null;
                    found_pubkey2 = null;
                    found_encryption = null ;
                    found_last_updated = null;
                    conflicting_information = [] ;
                    for (j = 0; j < res_hash[auth_address].length; j++) {
                        unique_id = CryptoJS.SHA256(auth_address + '/' + res_hash[auth_address][j].pubkey).toString();
                        if ((contact.unique_id == unique_id) && found_hub) {
                            if (found_pubkey != res_hash[auth_address][j].pubkey) conflicting_information.push('pubkey') ;
                            if (found_pubkey2 != res_hash[auth_address][j].pubkey2) conflicting_information.push('pubkey2') ;
                            if (found_encryption != res_hash[auth_address][j].encryption) conflicting_information.push('encryption') ;
                            if (conflicting_information.length) {
                                console.log(pgm + 'warning: contact with unique id ' + unique_id +
                                    ' found on more that one user data hub with conflicting ' + conflicting_information.join(', ') + ' encryption information') ;
                                console.log(pgm + 'Hubs: ' + found_hub + ', ' + res_hash[auth_address][j].hub) ;
                                if (conflicting_information.indexOf('pubkey') != -1) console.log(pgm + 'pubkeys: ' + found_pubkey + ', ' + res_hash[auth_address][j].pubkey) ;
                                if (conflicting_information.indexOf('pubkey2') != -1) console.log(pgm + 'pubkeys2: ' + found_pubkey2 + ', ' + res_hash[auth_address][j].pubkey2) ;
                                if (conflicting_information.indexOf('encryption') != -1) console.log(pgm + 'encryption: ' + found_encryption + ', ' + res_hash[auth_address][j].encryption) ;
                                console.log(pgm + 'last updated: ' + found_last_updated + ', ' + res_hash[auth_address][j].last_updated) ;
                            }
                        }
                        if (auth_address == '18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ') {
                            // debug this
                            j++ ;
                            j-- ;
                        }
                        if ((contact.unique_id == unique_id) &&
                            (!found_hub || (found_hub && (res_hash[auth_address][j].last_updated > found_last_updated)))) {
                            found_hub = res_hash[auth_address][j].hub;
                            found_user_seq = res_hash[auth_address][j].user_seq;
                            found_pubkey = res_hash[auth_address][j].pubkey;
                            found_pubkey2 = res_hash[auth_address][j].pubkey2;
                            found_encryption = res_hash[auth_address][j].encryption;
                            found_last_updated = res_hash[auth_address][j].last_updated;
                        }
                    }
                    if (!found_pubkey && !found_pubkey2) {
                        delete_contact(contact, i);
                        continue;
                    }
                    contact.hub = found_hub ;
                    contact.user_seq = found_user_seq;
                    contact.pubkey = found_pubkey;
                    contact.pubkey2 = found_pubkey2;
                    contact.encryption = found_encryption ;
                    // update "Last online"
                    set_last_online(contact, found_last_updated);
                    // console.log(pgm + 'contact = ' + JSON.stringify(contact));
                } // for i

                // update last updated for group chat pseudo contacts
                // and set no participants in group chat
                ls_update_group_last_updated();

                // 2) refresh contact avatars. contact.hub has been applied in step 1
                // source 1: uploaded avatars from files table (users/.../content.json) - pubkey is null - jpg or png
                // source 2: avatar from users table (random assigned avatar) - pubkey is not null - jpg, png or short ref to /public/images/avatar* images
                // source 3: contacts without an avatar will be assigned a random public avatar
                mn_query_4 =
                    "select "+
                    "  substr(json.directory, 1, instr(json.directory,'/')-1) as hub, " +
                    "  substr(json.directory, instr(json.directory,'/data/users/')+12) as auth_address, " +
                    "  null as pubkey, substr(files.filename,8) as avatar " +
                    "from files, json " +
                    "where files.filename like 'avatar%' " +
                    "and json.json_id = files.json_id" +
                    "  union all " +
                    "select " +
                    "  substr(json.directory, 1, instr(json.directory,'/')-1) as hub, " +
                    "  substr(json.directory, instr(json.directory,'/data/users/')+12) as auth_address, " +
                    "  users.pubkey, users.avatar " +
                    "from users, json " +
                    "where users.avatar is not null " +
                    "and json.json_id = users.json_id" ;
                debug('select', pgm + 'mn query 4 = ' + mn_query_4) ;
                debug_seq = debug_z_api_operation_start(pgm, 'mn query 4', 'dbQuery', show_debug('z_db_query')) ;
                ZeroFrame.cmd("dbQuery", [mn_query_4], function (res) {
                    var pgm = service + '.ls_load_contacts dbQuery callback 2: ' ;
                    var i, unique_id, source1_avatars, source2_avatars, contact, index1, index2 ;
                    debug_z_api_operation_end(debug_seq, format_q_res(res)) ;

                    // console.log(pgm + 'res.length = ' + res.length);
                    if (res.error) {
                        ZeroFrame.cmd("wrapperNotification", ["error", "Search for avatars: " + res.error, 5000]);
                        console.log(pgm + "Search for avatars failed: " + res.error);
                        console.log(pgm + 'query = ' + mn_query_4);
                        console.log(pgm + '3) data.json check skipped');
                        return ;
                    }

                    // error is somewhere else but remove invalid avatars from query result
                    var public_avatars = MoneyNetworkHelper.get_public_avatars();
                    for (i=res.length-1 ; i >= 0 ; i--) {
                        if (res[i].avatar == 'jpg') continue ;
                        if (res[i].avatar == 'png') continue ;
                        if (public_avatars.indexOf(res[i].avatar) != -1) continue ;
                        debug('invalid_avatars', pgm + 'Error. removing invalid avatar from query result. res[' + i + '] = ' + JSON.stringify(res[i])) ;
                        //res[27] = {
                        //    "pubkey": "-----BEGIN PUBLIC KEY-----\nMIIBITANBgkqhkiG9w0BAQEFAAOCAQ4AMIIBCQKCAQB0oWbjKx4Uc2LFupcMIqbU\nxH6Xbd8FIQCRM7icadV7aseKj76D8I385Nqm+Injlv0SwWHEQKqNwjPi5+5lD7WZ\niX4BFDni4FFhsPLoEBg+rOyxz8tF1qa7S4QlW7R/qcZBbi5s/rBBoVOG8CL94imD\np3SmifFlohEoBMVhO65YKvHvgqhC2oreyEXxQA3T87iqpoHxGGBolyl2dq4Y/CI2\nuD/+8LIHToTeYgXouYzYUMYzyx/iZceydfMCbFShlPAROb7c3/aRvLwbC+SRdIP2\nZKO7vVIS0JlDj3IL2zigj+aEC0Kmgs7oNwKg1Xg7mYT7Pub1Hn7sj7hGk6txM5YN\nAgMBAAE=\n-----END PUBLIC KEY-----",
                        //    "avatar": "undefined",
                        //    "hub": "1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh",
                        //    "auth_address": "1K4tMUXAUbaJ3h2qHYpGwEq3RiLd5XHyRM"
                        //};
                        res.splice(i,1) ;
                    } // for i

                    // find source 1 and 2 avatars. Avatars from source 1 (uploaded avatars) has 1. priority
                    source1_avatars = {} ; // index1: hub,auth_address
                    source2_avatars = {} ; // index2: hub,unique_id
                    for (i=0 ; i<res.length ; i++) if (!res[i].pubkey) {
                        index1 = res[i].hub + ',' + res[i].auth_address ;
                        source1_avatars[index1] = res[i].avatar;
                    }
                    for (i=res.length-1 ; i>=0; i--) {
                        if (!res[i].pubkey) continue ; // source 1
                        // source 2
                        index1 = res[i].hub + ',' + res[i].auth_address ;
                        if (source1_avatars.hasOwnProperty(index1)) continue ;
                        unique_id = CryptoJS.SHA256(res[i].auth_address + '/'  + res[i].pubkey).toString();
                        index2 = res[i].hub + ',' + unique_id ;
                        source2_avatars[index2] = res[i].avatar ;
                    }
                    // console.log(pgm + 'source1_avatars = ' + JSON.stringify(source1_avatars));
                    // console.log(pgm + 'source2_avatars = ' + JSON.stringify(source2_avatars));

                    // apply avatars from dbQuery
                    var index ;
                    for (i=0 ; i<ls_contacts.length ; i++) {
                        contact = ls_contacts[i] ;
                        index1 = contact.hub + ',' + contact.auth_address ;
                        if (source1_avatars.hasOwnProperty(index1)) {
                            contact.avatar = source1_avatars[index1] ;
                            continue ;
                        }
                        if (contact.pubkey) {
                            unique_id = CryptoJS.SHA256(contact.auth_address + '/'  + contact.pubkey).toString();
                            index2 = contact.hub + ',' + unique_id ;
                            if (source2_avatars.hasOwnProperty(index2)) {
                                contact.avatar = source2_avatars[index2] ;
                                continue ;
                            }
                        }
                        // check old avatar
                        if (contact.avatar && (contact.avatar != 'jpg') && (contact.avatar != 'png') && (public_avatars.indexOf(contact.avatar) == -1)) {
                            debug('invalid_avatars', pgm + 'Removing invalid avatar from old contact. avatar was ' + contact.avatar) ;
                            delete contact.avatar ;
                        }
                        if (contact.avatar) continue ;
                        if (public_avatars.length == 0) {
                            console.log(pgm + 'Error. Public avatars array are not ready. Using 1.png as avatar') ;
                            contact.avatar = '1.png' ;
                        }
                        else {
                            index = Math.floor(Math.random() * (public_avatars.length-1)); // avatarz.png is used for public contact
                            contact.avatar = public_avatars[index] ;
                        }
                    } // for i (contacts)
                    // console.log(pgm + 'local_storage_contacts = ' + JSON.stringify(local_storage_contacts));

                    // control. all contacts must have a valid avatar now
                    for (i=0 ; i<ls_contacts.length ; i++) {
                        contact = ls_contacts[i] ;
                        if (contact.avatar == 'jpg') continue ;
                        if (contact.avatar == 'png') continue ;
                        if (public_avatars.indexOf(contact.avatar) != -1) continue ;
                        debug('invalid_avatars', pgm + 'system error. contact without an avatar. ' + JSON.stringify(contact));
                    }

                    // control. all contacts should have an user_seq (deleted contact = pubkey is null)
                    for (i=0 ; i<ls_contacts.length ; i++) {
                        contact = ls_contacts[i] ;
                        if (!contact.pubkey || contact.user_seq) continue ;
                        console.log(pgm + 'system error. contact without an user_seq. ' + JSON.stringify(contact));
                    }

                    // 3) check data.json. check contacts outbox zeronet_msg_id and data.msg message_sha256
                    check_sha256_addresses('ls_load_contacts', false, true) ;

                }); // end dbQuery callback 2 (refresh avatars)

            }) ; // end dbQuery callback 1 (get public, user_seq and timestamp)

        } // end ls_load_contacts

        function ls_save_contacts (update_zeronet) {
            var pgm = service + '.ls_save_contacts: ' ;
            var i, contact, j, message_with_envelope, auth_address, local_msg_seq, key, sender_sha256, reactions_index,
                save_reactions, local_storage_contacts_clone, k, message, money_transaction ;

            // any logical deleted inbox messages to be physical deleted?
            save_reactions = false ;
            for (i=0 ; i<ls_contacts.length ; i++)  {
                contact = ls_contacts[i] ;
                if (contact.type == 'public') continue ; // my outgoing public chat messages
                auth_address = contact.auth_address ;
                if (!contact.messages) continue ;
                for (j=contact.messages.length-1 ; j>=0 ; j--) {
                    message_with_envelope = contact.messages[j] ;
                    if (!message_with_envelope.deleted_at) continue ;
                    if (message_with_envelope.folder == 'inbox') {
                        if (message_with_envelope.z_filename) {
                            // mark public chat inbox message as deleted
                            console.log(pgm + 'marking public chat inbox message as deleted');
                            reactions_index = message_with_envelope.sent_at + ',' + contact.auth_address.substr(0,4);
                            if (!ls_reactions[reactions_index]) ls_reactions[reactions_index] = {} ;
                            ls_reactions[reactions_index].deleted_at = message_with_envelope.deleted_at ;
                            save_reactions = true ;
                        }
                        else {
                            // physical delete inbox message (private or group chat)
                            // 1) remember zeronet_msg_id from deleted message. do not recreate deleted inbox messages
                            if (message_with_envelope.zeronet_msg_id) {
                                if (!contact.inbox_zeronet_msg_id) contact.inbox_zeronet_msg_id = [] ;
                                contact.inbox_zeronet_msg_id.push(message_with_envelope.zeronet_msg_id) ;
                                if (!ignore_zeronet_msg_id[auth_address]) ignore_zeronet_msg_id[auth_address] = [] ;
                                ignore_zeronet_msg_id[auth_address].push(message_with_envelope.zeronet_msg_id) ;
                            }
                            // 2) remember local_msg_seq from deleted inbox messages. Contact may request feedback info for this local_msg_seq later
                            local_msg_seq = message_with_envelope.local_msg_seq ;
                            if (local_msg_seq) {
                                if (!contact.deleted_inbox_messages) contact.deleted_inbox_messages = {};
                                key = contact.type == 'group' ? message_with_envelope.participant + ',' + local_msg_seq : local_msg_seq ;
                                contact.deleted_inbox_messages[key] = message_with_envelope.feedback;
                                //debug('feedback_info', pgm + 'feedback_info: contact ' + contact.auth_address +
                                //    ', deleted_inbox_messages = ' + JSON.stringify(contact.deleted_inbox_messages) +
                                //    ', Object.keys(contact.deleted_inbox_messages) = ' + JSON.stringify(Object.keys(contact.deleted_inbox_messages)));
                            }
                        }
                    }
                    else if (message_with_envelope.zeronet_msg_id) {
                        // outbox. wait. zeronet_msg_id reference must be removed in z_update_1_data_json before physical delete here
                        debug('data_cleanup', pgm + 'data_cleanup: waiting with physical delete of outbox message. zeronet_msg_id has yet been removed. should be done in next z_update_1_data_json call. message = ' + JSON.stringify(message_with_envelope)) ;
                        continue ;
                    }
                    else {
                        // outbox.
                        // remember sender_sha256 from deleted outbox messages. Could get an ingoing message later to this address
                        // console.log(pgm + 'contact before message delete: ' + JSON.stringify(contact));
                        sender_sha256 = message_with_envelope.sender_sha256 ;
                        if (sender_sha256) {
                            if (!contact.outbox_sender_sha256) contact.outbox_sender_sha256 = {} ;
                            if (!contact.outbox_sender_sha256.hasOwnProperty(sender_sha256)) {
                                contact.outbox_sender_sha256[sender_sha256] = { send_at: message_with_envelope.sent_at}
                            }
                        }
                        // remember local_msg_seq from deleted outbox messages. Contact may send feedback info for this local_msg_seq later
                        local_msg_seq = message_with_envelope.local_msg_seq ;
                        // debug('feedback_info', pgm + 'local_msg_seq = ' + local_msg_seq);
                        if (local_msg_seq) {
                            if (!contact.deleted_outbox_messages) contact.deleted_outbox_messages = {} ;
                            contact.deleted_outbox_messages[message_with_envelope.local_msg_seq] = message_with_envelope.feedback ;
                            debug('feedback_info', pgm + 'feedback_info: contact ' + contact.auth_address +
                                ', deleted_outbox_messages = ' + JSON.stringify(contact.deleted_outbox_messages) +
                                ', Object.keys(contact.deleted_outbox_messages) = ' + JSON.stringify(Object.keys(contact.deleted_outbox_messages))) ;
                        }
                    }
                    contact.messages.splice(j,1);
                } // for j (contact.messages)
            } // for i (contacts)
            if (save_reactions) ls_save_reactions(false) ;

            // cleanup contacts before save. remove work variables and other data available on zeronet
            local_storage_contacts_clone = JSON.parse(JSON.stringify(ls_contacts));
            for (i=local_storage_contacts_clone.length-1 ; i >= 0 ; i--) {
                contact = local_storage_contacts_clone[i] ;
                if (contact.auth_address == '18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ') {
                    contact.auth_address = contact.auth_address + '' ; // debug this
                }
                if (!contact.messages) contact.messages = [] ;
                // remove public chat. stored in optional files on Zeronet
                if (contact.type == 'public') {
                    // public unencrypted chat is not stored in localStorage. Only in optional files on ZeroNet
                    local_storage_contacts_clone.splice(i,1) ;
                    continue ;
                }
                for (j=contact.messages.length-1 ; j >=0 ; j--) if (contact.messages[j].z_filename) contact.messages.splice(j,1) ;
                // remove empty contacts
                if ((['new', 'guest'].indexOf(contact.type) != -1) && (contact.messages.length == 0)) {
                    local_storage_contacts_clone.splice(i,1) ;
                    continue ;
                }
                // remove other internal information
                delete contact['$$hashKey'] ;
                delete contact.new_alias ;
                delete contact.notifications ; // recalculated after login
                delete contact.user_seq ; // available on ZeroNet
                delete contact.pubkey ; // available on ZeroNet
                delete contact.pubkey2 ; // available on ZeroNet
                delete contact.encryption ; // available on ZeroNet
                delete contact.hub ; // available on ZeroNet
                if (contact.search) for (j=0 ; j<contact.search.length ; j++) {
                    delete contact.search[j]['$$hashKey'] ;
                    delete contact.search[j].edit_alias ;
                    delete contact.search[j].row ;
                    delete contact.search[j].unique_id ;
                }
                for (j=contact.messages.length-1 ; j >= 0 ; j--) {
                    message_with_envelope = contact.messages[j] ;
                    message = message_with_envelope.message ;
                    if (message_with_envelope.z_filename) {
                        // public unencrypted chat is not stored in localStorage. Only in optional files on ZeroNet
                        contact.messages.splice(j,1) ;
                        continue ;
                    }
                    // remove image errors
                    message = message_with_envelope.message ;
                    if (message.image && ((message.image == true) || (message.image == 'x'))) delete message.image ;
                    delete message_with_envelope['$$hashKey'] ;
                    delete message_with_envelope.edit_chat_message ;
                    delete message.original_image ;
                    delete message_with_envelope.ls_msg_size ;
                    delete message_with_envelope.seq ;
                    delete message_with_envelope.reactions ;
                    // chat msg with money transactions?
                    if (message && message.money_transactions) {
                        for (k=0 ; k<message.money_transactions.length ; k++) {
                            money_transaction = message.money_transactions[k] ;
                            delete money_transaction['$$hashKey'] ;
                            delete money_transaction.message ;
                        } // for k (money_transactions)
                        if (message.money_transactions_status) {
                            if (message.money_transactions_status.done) {
                                for (key in message.money_transactions_status) {
                                    if (['key','html'].indexOf(key) == -1) delete message.money_transactions_status[key] ;
                                }
                            }
                            else delete message.money_transactions_status ;
                        }
                    }
                    if (message_with_envelope.local_msg_seq == 5947) console.log(pgm + 'message_with_envelope = ' + JSON.stringify(message_with_envelope)) ;
                    //message_with_envelope = {
                    //    "local_msg_seq": 5947,
                    //    "folder": "inbox",
                    //    "message": {
                    //        "msgtype": "chat msg",
                    //        "message": "receive money trans test 2",
                    //        "money_transactions": [{
                    //            "wallet_url": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                    //            "wallet_sha256": "e488d78dc26af343688045189a714658ed0f7975d4db158a7c0c5d0a218bfac7",
                    //            "wallet_name": "MoneyNetworkW2",
                    //            "action": "Send",
                    //            "code": "tBTC",
                    //            "name": "Test Bitcoin",
                    //            "amount": 0.0001,
                    //            "money_transactionid": "3R1R46sRFEal8zWx0wYvYyo6VDLJmpFzVNsyIOhglPV4bcUgXqUDLOWrOkZA",
                    //            "json": {"return_address": "2Mxufcnyzo8GvTGHqYfzS862ZqYaFYjxo5V"}
                    //        }],
                    //        "local_msg_seq": 13
                    //    },
                    //    "zeronet_msg_id": "255e4057027b69f540323d9f7ea5af3e71e239af09cdf64fb00817e0c2645f15",
                    //    "sender_sha256": "46bc79914a723af23042d2e32530364ec9e5a5e47ca2a6e209899d9723e08fae",
                    //    "sent_at": 1508650742026,
                    //    "received_at": 1508650746070,
                    //    "encryption": 1,
                    //    "feedback": false,
                    //    "money_transactions_status": {"html": "Pinging wallet ..."}
                    //};
                } // for j (messages)
            } // for i (contacts)

            //console.log(pgm + 'local_storage_contacts_clone = ' + JSON.stringify(local_storage_contacts_clone)) ;
            console.log(pgm + 'saved contacts') ;
            MoneyNetworkHelper.setItem('contacts', JSON.stringify(local_storage_contacts_clone)) ;
            MoneyNetworkHelper.setItem('deleted_sha256', JSON.stringify(ls_contacts_deleted_sha256)) ;

            if (update_zeronet) {
                // update localStorage and zeronet
                $timeout(function () {
                    MoneyNetworkHelper.ls_save() ;
                    z_update_1_data_json(pgm) ;
                })
            }
            else {
                // update only localStorage
                $timeout(function () {
                    MoneyNetworkHelper.ls_save() ;
                })
            }
        } // ls_save_contacts
        moneyNetworkZService.inject_functions({ls_save_contacts: ls_save_contacts});
        moneyNetworkHubService.inject_functions({ls_save_contacts: ls_save_contacts});


        // update last updated for group chat pseudo contacts
        // return true if any contacts have been updated
        function ls_update_group_last_updated () {
            var pgm = service + '.ls_update_group_last_updated: ' ;
            var i, contact, old_last_online, j, new_last_online, unique_id, participant, k, timestamp, no_participants,
                found_group_tag, old_no_participants, new_no_participants, ls_updated ;
            ls_updated = false ;
            if (z_cache.user_id) var my_unique_id = get_my_unique_id() ;
            else my_unique_id = 'n/a' ;
            for (i=0 ; i<ls_contacts.length ; i++) {
                contact = ls_contacts[i] ;
                if (contact.type != 'group') continue ;
                // update group contact (last message and number of participants)
                if (!contact.search) contact.search = [] ;
                old_last_online = get_last_online(contact) || 0 ;
                new_last_online = old_last_online ;
                for (j=0 ; j<contact.messages.length ; j++) {
                    if (contact.messages[j].sent_at && (Math.round(contact.messages[j].sent_at / 1000) > new_last_online)) {
                        new_last_online = Math.round(contact.messages[j].sent_at / 1000) ;
                    }
                }
                no_participants = 0 ;
                for (j=0 ; j<contact.participants.length ; j++) {
                    unique_id = contact.participants[j] ;
                    if (unique_id == my_unique_id) continue ;
                    participant = get_contact_by_unique_id(unique_id) ;
                    if (!participant) {
                        // console.log(pgm + 'warning. group chat participant with unique id ' + unique_id + ' does not exists') ;
                        continue ;
                    }
                    no_participants++ ;
                } // for j (participants)
                // set last online
                if (old_last_online != new_last_online) {
                    set_last_online(contact, new_last_online) ;
                    ls_updated = true ;
                }
                // set no participants
                found_group_tag = false ;
                for (j=0 ; j<contact.search.length ; j++) {
                    if (contact.search[j].tag == 'Group') {
                        found_group_tag = true ;
                        old_no_participants = contact.search[j].value ;
                        new_no_participants = no_participants + ' participant' + (no_participants == 1 ? '' : 's') ;
                        contact.search[j].value = new_no_participants ;
                        if (old_no_participants != new_no_participants) ls_updated = true ;
                        break ;
                    }
                }
                if (!found_group_tag) {
                    contact.search.push({
                        tag: 'Group',
                        value: no_participants + ' participant' + (no_participants == 1 ? '' : 's'),
                        privacy: 'Search'
                    }) ;
                    ls_updated = true ;
                }
            } // for i (contacts)
            return ls_updated ;
        } // ls_update_group_last_updated


        // search ZeroNet for new potential contacts with matching search words
        // add/remove new potential contacts to/from local_storage_contacts array (MoneyNetworkService and ContactCtrl)
        // params:
        // - ls_contacts (array) and ls_contacts_hash (hash) from MoneyNetworkService. required
        // - fnc_when_ready - callback - execute when local_storage_contacts are updated
        // - file_auth_address and file_user_seq - mini update only - create/update only info for this auth_address and user_seq combination
        //   optional. use when receiving files from other users (event_file_done) and when reading -chat.json files with public chat
        function z_contact_search (fnc_when_ready, file_auth_address, file_user_seq) {
            var pgm = service + '.z_contact_search: ' ;
            var my_search_query, i, row, error, retry_z_contact_search, contact, pubkey, no_contacts, old_userid ;

            no_contacts = 0 ;
            old_userid = z_cache.user_id ;

            // any relevant user info? User must have tags with privacy Search or Hidden to search network
            my_search_query = '' ;
            for (i=0 ; i<z_cache.user_info.length ; i++) {
                row = z_cache.user_info[i] ;
                if (['Search','Hidden'].indexOf(row.privacy) == -1) continue ;
                if (!row.hasOwnProperty('tag')) row.tag = '' ;
                row.tag = row.tag.replace(/'/g, "''") ; // escape ' in strings
                if (!row.hasOwnProperty('value')) row.value = '' ;
                try {
                    row.value = row.value.replace(/'/g, "''") ; // escape ' in strings
                }
                catch (e) {
                    console.log(pgm + 'row.value.replace failed. error = ' + e.message + ', i = ' + i + ', row = ' + JSON.stringify(row) + ', user_info = ' + JSON.stringify(z_cache.user_info)) ;
                }
                if (my_search_query) my_search_query = my_search_query + " union all" ;
                my_search_query = my_search_query + " select '" + row.tag + "' as tag, '" + row.value + "' as value"
            }
            if (!my_search_query) {
                // not logged in or no rows in user_info. match all contacts
                my_search_query = "select '%' as tag, '%' as value" ;
            }

            // check ZeroFrame status. Is ZeroNet ready?
            if (!file_auth_address) {
                // only relevant in startup sequence. not relevant for event_file_done or when reading -chat.json files
                retry_z_contact_search = function () {
                    z_contact_search (fnc_when_ready, null, null);
                };
                if (!ZeroFrame.site_info) {
                    // ZeroFrame websocket connection not ready. Try again in 5 seconds
                    console.log(pgm + 'ZeroFrame.site_info is not ready. Try again in 5 seconds. Refresh page (F5) if problem continues') ;
                    setTimeout(retry_z_contact_search,5000); // outside angularjS - using normal setTimeout function
                    return ;
                }
                //if (!ZeroFrame.site_info.cert_user_id) {
                //    console.log(pgm + 'Auto login process to ZeroNet not finished. Maybe user forgot to select cert. Checking for new contacts in 1 minute');
                //    ZeroFrame.cmd("certSelect", [["moneynetwork.bit", "nanasi", "zeroid.bit", "kaffie.bit", "moneynetwork"]]);
                //    setTimeout(retry_z_contact_search,60000);// outside angularjS - using normal setTimeout function
                //    return ;
                //}
            }

            // debug. check avatars. All contacts must have a valid avatar
            for (i=0 ; i<ls_contacts.length ; i++) {
                contact = ls_contacts[i] ;
                if (!contact.avatar) debug('invalid_avatars', pgm + 'Error. Pre search check. Contact without avatar ' + JSON.stringify(contact)) ;
            } // for i

            // get user data hub (last content.modified timestamp)
            console.log(pgm + 'calling get_my_user_hub');
            get_my_user_hub(function (hub) {
                var pgm = service + '.z_contact_search get_my_user_hub callback 1: ' ;
                var debug_seq, mn_query_5 ;
                if (detected_client_log_out(pgm, old_userid)) return ;

                // find json_id and user_seq for current user.
                // must use search words for current user
                // must not return search hits for current user
                if (z_cache.user_id) pubkey = MoneyNetworkHelper.getItem('pubkey') ;
                else pubkey = 'n/a' ;
                mn_query_5 = "select json.json_id, users.user_seq from json, users " +
                    "where json.directory = '" + hub + "/data/users/" + ZeroFrame.site_info.auth_address + "' " +
                    "and users.json_id = json.json_id " +
                    "and users.pubkey = '" + pubkey + "'";
                debug('select', pgm + 'mn query 5 = ' + mn_query_5) ;
                debug_seq = debug_z_api_operation_start(pgm, 'mn query 5', 'dbQuery', show_debug('z_db_query')) ;
                ZeroFrame.cmd("dbQuery", [mn_query_5], function(res) {
                    var pgm = service + '.z_contact_search dbQuery callback 2: ' ;
                    var error, mn_query_7 ;
                    debug_z_api_operation_end(debug_seq, format_q_res(res)) ;
                    if (detected_client_log_out(pgm, old_userid)) return ;
                    // console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                    if (res.error) {
                        ZeroFrame.cmd("wrapperNotification", ["error", "Search for new contacts failed: " + res.error]);
                        console.log(pgm + "Search for new contacts failed: " + res.error) ;
                        console.log(pgm + 'mn query 5 = ' + mn_query_5) ;
                        if (fnc_when_ready) fnc_when_ready(no_contacts);
                        return ;
                    }
                    if (!res.length && z_cache.user_id) {
                        // current user not in data.users array. must be a new user (first save). Try again in 3 seconds
                        console.log(pgm + 'current user not in data.users array. must be a new user (first save). Try again in 3 seconds');
                        // ZeroFrame.cmd("wrapperNotification", ["info", "Updating ZeroNet database. Please wait", 3000]);
                        setTimeout(retry_z_contact_search,3000) ;
                        return ;
                    }
                    if (res.length > 1) {
                        console.log(pgm + 'todo: user with auth_address ' + ZeroFrame.site_info.auth_address + ' found at more that one hub. res = ' + JSON.stringify(res)) ;
                    }
                    if (z_cache.user_id) {
                        var json_id = res[0].json_id ;
                        var user_seq = res[0].user_seq ;
                    }
                    else {
                        json_id = 0 ;
                        user_seq = 0 ;
                    }
                    // console.log(pgm + 'json_id = ' + json_id + ', user_seq = ' + user_seq) ;
                    // find other clients with matching search words using sqlite like operator
                    // Search: tags shared public on ZeroNet. Hidden: tags stored only in localStorage

                    // contacts query. getting timestamp in a column sub query as status.json file often get received after data.json file
                    if (file_auth_address) debug('select || file_done', pgm + 'file_auth_address = ' + file_auth_address + ', file user seq = ' + file_user_seq) ;
                    var contacts_query =
                        "select" +
                        "  users.user_seq, users.pubkey, users.pubkey2, users.encryption, users.avatar as users_avatar, users.guest," +
                        "  data_json.directory,  " +
                        "  substr(data_json.directory, 1, instr(data_json.directory,'/')-1) as hub, " +
                        "  substr(data_json.directory, instr(data_json.directory,'/data/users/')+12) as auth_address," +
                        "  data_json.json_id as data_json_id," +
                        "  content_json.json_id as content_json_id," +
                        "  keyvalue1.value as cert_user_id," +
                        "  keyvalue2.value as modified," +
                        "  (select substr(files.filename,8)" +
                        "   from files, json as avatar_json " +
                        "   where files.filename like 'avatar%'" +
                        "   and avatar_json.json_id = files.json_id" +
                        "   and avatar_json.directory = data_json.directory) as files_avatar," +
                        "  (select status.timestamp" +
                        "   from json as status_json, status" +
                        "   where status_json.directory = data_json.directory" +
                        "   and    status.json_id = status_json.json_id" +
                        "   and    status.user_seq = users.user_seq) as timestamp " +
                        "from users, json as data_json, json as content_json, keyvalue as keyvalue1, keyvalue as keyvalue2 " ;
                    if (file_auth_address) {
                        // file done event. check only info from this auth_address
                        contacts_query += "where data_json.directory like '%/users/" + file_auth_address + "' " ;
                    }
                    else {
                        // page startup. general contacts search. all contacts except current user
                        contacts_query += "where users.pubkey <> '" + pubkey + "' " ;
                    }
                    contacts_query +=
                        "and data_json.json_id = users.json_id " +
                        "and content_json.directory = data_json.directory " +
                        "and content_json.file_name = 'content.json' " +
                        "and keyvalue1.json_id = content_json.json_id " +
                        "and keyvalue1.key = 'cert_user_id'" +
                        "and keyvalue2.json_id = content_json.json_id " +
                        "and keyvalue2.key = 'modified'";

                    console.log(pgm + 'todo: query 6 and query 7 will return doublet contact info for users on multiple user hubs. ' +
                        'Now using user data from hub with last content.modified timestamp. Should filter data from "bad" hubs. ');
                    debug('select', pgm + 'contacts_query 6 (MS OK) = ' + contacts_query) ;
                    // if (auth_address) debug('file_done', pgm + 'contacts_query = ' + contacts_query) ;

                    // find contacts with matching tags
                    console.log(pgm + 'todo: query 7 is only deselecting current user on current user hub. query will return current user on other hubs.') ;
                    mn_query_7 =
                        "select" +
                        "  my_search.tag as my_tag, my_search.value as my_value," +
                        "  contacts.user_seq as other_user_seq, contacts.pubkey as other_pubkey, contacts.pubkey2 as other_pubkey2," +
                        "  contacts.encryption as other_encryption, contacts.guest as other_guest," +
                        "  contacts.directory as other_directory,contacts.hub as other_hub, " +
                        "  contacts.auth_address as other_auth_address, contacts.cert_user_id as other_cert_user_id," +
                        "  contacts.modified as other_content_modified, contacts.timestamp as other_user_timestamp," +
                        "  search.tag as other_tag, search.value as other_value, " +
                        "  contacts.users_avatar as other_users_avatar, contacts.files_avatar as other_files_avatar " +
                        "from (" + my_search_query + ") as my_search, " +
                        "(select user_seq, tag, value, json_id from search " +
                        "   union all " +
                        " select user_seq, '' as tag, '' as value, users.json_id" +
                        " from users" +
                        " where 0 = (select count(*) from search " +
                        "            where search.json_id = users.json_id " +
                        "            and search.user_seq = users.user_seq)) as search, " +
                        "(" + contacts_query + ") as contacts " +
                        "where (my_search.tag like search.tag and search.tag <> '%' and my_search.value like search.value and search.value <> '%' " +
                        "or search.tag like my_search.tag and search.value like my_search.value) " +
                        "and not (search.json_id = " + json_id + " and search.user_seq = " + user_seq + ") " + // see todo:
                        "and contacts.data_json_id = search.json_id and contacts.user_seq = search.user_seq " +
                        "order by contacts.auth_address, contacts.modified desc, contacts.hub";
                    debug('select', pgm + 'mn query 7 = ' + mn_query_7) ;
                    debug_seq = debug_z_api_operation_start(pgm, 'mn query 7', 'dbQuery', show_debug('z_db_query')) ;
                    ZeroFrame.cmd("dbQuery", [mn_query_7], function(res) {
                        var pgm = service + '.z_contact_search dbQuery callback 3: ';
                        debug_z_api_operation_end(debug_seq, format_q_res(res)) ;
                        if (detected_client_log_out(pgm, old_userid)) return ;
                        // console.log(pgm + 'res = ' + JSON.stringify(res));
                        if (res.error) {
                            ZeroFrame.cmd("wrapperNotification", ["error", "Search for new contacts failed: " + res.error, 5000]);
                            console.log(pgm + "Search for new contacts failed: " + res.error) ;
                            console.log(pgm + 'mn query 7 = ' + mn_query_7) ;
                            if (fnc_when_ready) fnc_when_ready(no_contacts);
                            return;
                        }
                        if (res.length == 0) {
                            // current user not in data.users array. must be an user without any search words in user_info
                            ZeroFrame.cmd("wrapperNotification", ["info", "No new contacts were found. Please add/edit search/hidden words and try again", 3000]);
                            if (fnc_when_ready) fnc_when_ready(no_contacts);
                            return;
                        }

                        // error elsewhere in code but remove invalid avatars from query result
                        var public_avatars = MoneyNetworkHelper.get_public_avatars() ;
                        for (i=0 ; i<res.length ; i++) {
                            if (!res[i].other_users_avatar) continue ;
                            if (res[i].other_users_avatar == 'jpg') continue ;
                            if (res[i].other_users_avatar == 'png') continue ;
                            if (public_avatars.indexOf(res[i].other_users_avatar) != -1) continue ;
                            debug('invalid_avatars', pgm + 'Error. Removing invalid avatar from query result. res[' + i + '] = ' + JSON.stringify(res[i])) ;
                            delete res[i].other_users_avatar ;
                        } // for i

                        var unique_id, unique_ids = [], res_hash = {}, ignore, j, last_updated ;
                        var current_auth_address, current_hub ;
                        for (var i=0 ; i<res.length ; i++) {
                            // use only data from last updated user hub (content.modified). see above todos
                            if (current_auth_address != res[i].other_auth_address) {
                                current_auth_address = res[i].other_auth_address ;
                                current_hub = res[i].other_hub ;
                            }
                            if ((current_auth_address == res[i].other_auth_address) && (current_hub != res[i].other_hub)) continue ;
                            // check contacts on ignore list
                            ignore=false ;
                            for (j=0 ; (!ignore && (j<ls_contacts.length)) ; j++) {
                                if (ls_contacts[j].type != 'ignore') continue ;
                                if (res[i].auth_address == ls_contacts[j].auth_address) ignore=true ;
                                if (res[i].pubkey == ls_contacts[j].pubkey) ignore=true ;
                            }
                            if (ignore) continue ;
                            // add search match to res_hash
                            // unique id is sha256 signatur of ZeroNet authorization and localStorage authorization
                            // note many to many relation in the authorization and contact ids:
                            // - a ZeroNet id can have been used on multiple devices (localStorage) when communicating with ZeroNet
                            // - public/private localStorage key pairs can have been exported to other devices
                            unique_id = CryptoJS.SHA256(res[i].other_auth_address + '/'  + res[i].other_pubkey).toString();
                            res[i].other_unique_id = unique_id;
                            if (!res[i].other_user_timestamp) {
                                // must be a new contact received in file done event. data.json file received before status.json file
                                if (file_auth_address) debug('file_done', pgm + 'file done event. data.json received before status.json. Using now as timestamp') ;
                                else {
                                    // console.log(pgm + 'Ignoring contact without timestamp. res[i] = ' + JSON.stringify(res[i])) ;
                                    continue ;
                                }
                                res[i].other_user_timestamp = new Date().getTime() ;
                            }
                            last_updated = Math.round(res[i].other_user_timestamp / 1000) ;
                            if (unique_ids.indexOf(res[i].other_unique_id)==-1) unique_ids.push(res[i].other_unique_id) ;
                            if (!res_hash.hasOwnProperty(unique_id)) {
                                res_hash[unique_id] = {
                                    type: 'new',
                                    hub: res[i].other_hub,
                                    auth_address: res[i].other_auth_address,
                                    cert_user_id: res[i].other_cert_user_id,
                                    user_seq: res[i].other_user_seq,
                                    pubkey: res[i].other_pubkey,
                                    pubkey2: res[i].other_pubkey2,
                                    encryption: res[i].other_encryption,
                                    guest: res[i].other_guest,
                                    avatar: res[i].other_files_avatar || res[i].other_users_avatar,
                                    search: [{ tag: 'Online', value: last_updated, privacy: 'Search', row: 1, debug_info: {}}]
                                };
                            }
                            res_hash[unique_id].search.push({
                                tag: res[i].other_tag,
                                value: res[i].other_value,
                                privacy: 'Search',
                                row: res_hash[unique_id].search.length+1
                                // issue #10# - debug info
                                //debug_info: {
                                //    my_tag: res[i].my_tag,
                                //    my_value: res[i].my_value,
                                //    other_tag: res[i].other_tag,
                                //    other_value: res[i].other_value
                                //}
                            }) ;
                        }
                        no_contacts = Object.keys(res_hash).keys.length ;

                        // insert/update/delete new contacts in local_storage_contacts (type=new)
                        // console.log(pgm + 'issue #10#: user_info = ' + JSON.stringify(user_info));
                        var contact, found_unique_ids = [], debug_info ;
                        for (i=ls_contacts.length-1 ; i>= 0 ; i--) {
                            contact = ls_contacts[i] ;
                            if (file_auth_address && (contact.auth_address != file_auth_address)) continue ; // checking only this auth_address
                            if (file_user_seq && (contact.user_seq != file_user_seq)) continue ; // checking only this auth_address and user_seq
                            unique_id = contact.unique_id ;
                            if (!res_hash.hasOwnProperty(unique_id)) {
                                // contact no longer matching search words. Delete contact if no messages
                                if ((contact.type == 'new') && (contact.messages.length == 0)) {
                                    remove_contact(i);
                                }
                                continue ;
                            }
                            found_unique_ids.push(unique_id) ;

                            // issue #10 - problem with wildcards in search. debug info.
                            // keep debug code. maybe also other problems with wildcards
                            //debug_info = [] ;
                            //for (j=0 ; j<res_hash[unique_id].search.length ; j++) {
                            //    debug_info.push({
                            //        row: res_hash[unique_id].search[j].row,
                            //        my_tag: res_hash[unique_id].search[j].debug_info.my_tag,
                            //        my_value: res_hash[unique_id].search[j].debug_info.my_value,
                            //        other_tag: res_hash[unique_id].search[j].debug_info.other_tag,
                            //        other_value: res_hash[unique_id].search[j].debug_info.other_value
                            //    }) ;
                            //}
                            // console.log(pgm + 'issue #10: contact.search.debug_info = ' + JSON.stringify(debug_info)) ;

                            // update contact with new search words
                            contact.cert_user_id = res_hash[unique_id].cert_user_id ;
                            contact.encryption = res_hash[unique_id].encryption ;
                            if (res_hash[unique_id].guest && (contact.type == 'new')) {
                                contact.type = 'guest';
                                contact.guest = true ;
                            }
                            if (res_hash[unique_id].avatar) contact.avatar = res_hash[unique_id].avatar ;
                            for (j=contact.search.length-1 ; j >= 0 ; j--) {
                                if (contact.search[j].privacy == 'Search') {
                                    contact.search.splice(j,1);
                                }
                            }
                            for (j=0 ; j<res_hash[unique_id].search.length ; j++) {
                                contact.search.push(res_hash[unique_id].search[j]) ;
                            }
                            for (j=0 ; j<contact.search.length ; j++) contact.search[j].row = j+1 ;

                            // if (contact.type == 'guest') console.log(pgm + 'guest = ' + JSON.stringify(contact));
                        } // i

                        var new_contact ;
                        for (unique_id in res_hash) {
                            if (found_unique_ids.indexOf(unique_id) != -1) continue ;
                            // insert new contact
                            new_contact = {
                                unique_id: unique_id,
                                type: (res_hash[unique_id].guest ? 'guest' : 'new'),
                                guest: (res_hash[unique_id].guest ? true : null),
                                hub: res_hash[unique_id].hub,
                                auth_address: res_hash[unique_id].auth_address,
                                cert_user_id: res_hash[unique_id].cert_user_id,
                                avatar: res_hash[unique_id].avatar,
                                user_seq: res_hash[unique_id].user_seq,
                                pubkey: res_hash[unique_id].pubkey,
                                pubkey2: res_hash[unique_id].pubkey2,
                                encryption: res_hash[unique_id].encryption,
                                search: res_hash[unique_id].search,
                                messages: [],
                                outbox_sender_sha256: {},
                                inbox_zeronet_msg_id: [],
                                inbox_last_sender_sha256: null,
                                inbox_last_sender_sha256_at: 0
                            };

                            if (!new_contact.avatar) {
                                // assign random avatar
                                if (public_avatars.length == 0) {
                                    console.log(pgm + 'Error. Public avatars array are not ready. Using 1.png as avatar') ;
                                    new_contact.avatar = '1.png' ;
                                }
                                else {
                                    var index = Math.floor(Math.random() * (public_avatars.length-1)); // avatarz.png is used for public contact
                                    new_contact.avatar = public_avatars[index] ;
                                }
                            }
                            add_contact(new_contact) ;
                            if (file_auth_address) debug('file_done', pgm + 'new_contact = ' + JSON.stringify(new_contact));
                        }
                        // console.log(pgm + 'local_storage_contacts = ' + JSON.stringify(local_storage_contacts));

                        // update Last online for pseudo group chat contacts.
                        ls_update_group_last_updated() ;

                        // check avatars. All contacts must have a avatar
                        for (i=0 ; i<ls_contacts.length ; i++) {
                            contact = ls_contacts[i] ;
                            if (!contact.avatar) console.log(pgm + 'Error. Post search check. Contact without avatar ' + JSON.stringify(contact)) ;
                        }

                        // refresh angularJS UI
                        if (fnc_when_ready) fnc_when_ready(no_contacts) ;

                    }); // dbQuery callback 3

                }) ; // dbQuery callback 2

            }) ; // get_my_user_hub callback 1

        } // z_contact_search


        // return chat friendly message array
        function js_get_messages() {
            return js_messages ;
        }

        function get_ls_msg_factor () {
            return ls_msg_factor ;
        }

        var msg_seq = 0 ;
        function next_local_msg_seq () {
            var pgm = service + '.next_local_msg_seq: ' ;
            if (!ZeroFrame.site_info.cert_user_id || !z_cache.user_id) {
                // No ZeroNet cert. No localStorage available. Show public chat only
                // Not logged in. No localStorage available. Show public chat only
                msg_seq++ ;
                return msg_seq ;
            }
            // next local msg seq
            var local_msg_seq = MoneyNetworkHelper.getItem('msg_seq');
            if (local_msg_seq) {
                try {
                    local_msg_seq = JSON.parse(local_msg_seq) ;
                }
                catch (e) {
                    console.log(pgm + 'error. msg_seq was invalid. error = ' + e.message) ;
                    local_msg_seq = 0 ;
                }
            }
            else local_msg_seq = 0 ;
            local_msg_seq++ ;
            // no ls_save. next_local_msg_seq must be part of a contact update operation - ingoing or outgoing messages
            MoneyNetworkHelper.setItem('msg_seq', JSON.stringify(local_msg_seq)) ;
            return local_msg_seq ;
        } // next_local_msg_seq
        moneyNetworkZService.inject_functions({next_local_msg_seq: next_local_msg_seq});

        // received an incoming message with image=true
        // download optional file and insert image in message
        // symmetric encrypted image. private chat with JSEncrypt and group chat.
        function download_json_image_file(hub, auth_address, message_with_envelope, password, cb) {
            var pgm = service + '.download_json_image_file: ' ;
            var mn_query_8, image_path, debug_seq ;
            // console.log(pgm + 'auth_address = ' + auth_address) ;
            // console.log(pgm + 'message_with_envelope = ' + JSON.stringify(message_with_envelope)) ;
            // console.log(pgm + 'password = ' + password) ;

            // is image attachment ready for download? should not be a problem ...
            // temp image_path - only used in error messages
            image_path = "merged-" + get_merged_type() + "/" + hub + "/data/users/" + auth_address + '/' + message_with_envelope.sent_at + '-%-image.json' ;
            mn_query_8 =
                "select filename, files_optional.size " +
                "from files_optional, json " +
                "where json.json_id = files_optional.json_id " +
                "and json.directory = '" + hub + "/data/users/" + auth_address + "' " +
                "and ( files_optional.filename = '" + message_with_envelope.sent_at + '-image.json' + "'" +        // old format without <user_seq> in filename
                "   or files_optional.filename like '" + message_with_envelope.sent_at + '-%-image.json' + "' )" ; // new format with <user_seq> in filename
            debug('select', pgm + 'mn query 8 = ' + mn_query_8) ;
            debug_seq = debug_z_api_operation_start(pgm, 'mn query 8', 'dbQuery', show_debug('z_db_query')) ;
            ZeroFrame.cmd("dbQuery", [mn_query_8], function (res) {
                var pgm = service + '.download_json_image_file dbQuery callback 1: ' ;
                var now ;
                debug_z_api_operation_end(debug_seq, format_q_res(res)) ;
                if (res.error) {
                    console.log(pgm + "image download check failed: " + res.error) ;
                    console.log(pgm + 'mn query 8 = ' + mn_query_8) ;
                    if (cb) cb(false) ;
                    return;
                }
                if (res.length == 0) {
                    now = new Date().getTime() ;
                    console.log(pgm + 'optional image file ' + image_path + ' was not found in optional files. ' +
                        'sent_at = ' + message_with_envelope.sent_at + ', now = ' + now +
                        ', dif = ' + (now-message_with_envelope.sent_at)) ;
                    if (cb) cb(false) ;
                    return ;
                }
                // set real image_path. should be new format with <user_seq> in filename
                image_path = "merged-" + get_merged_type() + "/" + hub + "/data/users/" + auth_address + '/' + res[0].filename ;
                if (res[0].size <= 2) {
                    console.log(pgm + 'optional image file ' + image_path + ' has been deleted') ;
                    if (cb) cb(false) ;
                    return ;
                }

                // ready for image download
                debug('inbox', pgm + 'downloading image ' + image_path) ;
                z_file_get(pgm, {inner_path: image_path, required: true}, function (image) {
                    var pgm = service + '.download_json_image_file z_file_get callback 2: ' ;
                    var data, actions, action, error ;
                    if (!image || (z_cache.user_setup.test && z_cache.user_setup.test.image_timeout)) { // test: force download error
                        console.log(pgm + 'Error. image download timeout for ' + image_path) ;
                        if (cb) cb(false) ;
                        return ;
                    }
                    debug('inbox', pgm + 'downloaded image ' + image_path) ;

                    // DRY: almost identical code in event_file_done

                    // validate -image.json
                    try { image = JSON.parse(image)}
                    catch (e) { error = e.message}
                    if (!error) error = MoneyNetworkHelper.validate_json (pgm, image, 'image-file', 'Invalid json file') ;
                    if (error) {
                        // File not OK
                        console.log(pgm + 'cannot write -image.json file ' + image_path + '. json is invalid: ' + error);
                        message_with_envelope.message.image = false ;
                    }
                    else {
                        // File OK. decrypt/decompress, save in lS and delete downloaded optional file
                        if (!image.storage) image.storage = {} ;
                        if (!image.storage.image) image.storage.image = 'e1' ; // default: e1 = JSEcrypted and not compressed
                        data = image.image ;
                        actions = image.storage.image.split(',');
                        try {
                            while (actions.length) {
                                action = actions.pop() ;
                                if (action == 'c1') data = MoneyNetworkHelper.decompress1(data) ;
                                else if (action == 'e1') data = MoneyNetworkHelper.decrypt(data, password);
                                else throw "Unsupported decrypt/decompress action " + action ;
                            }
                            message_with_envelope.message.image = data ;
                        }
                        catch (e) {
                            console.log(pgm + 'error. image ' + image_path + ' decrypt failed. error = ' + e.message) ;
                            message_with_envelope.message.image = false ;
                        }
                    }
                    ls_save_contacts(false) ;
                    // ZeroFrame.cmd("fileDelete", image_path, function () {}) ;
                    // debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_delete', pgm + image_path + ' optionalFileDelete') ;
                    debug_seq = debug_z_api_operation_start(pgm, image_path, 'optionalFileDelete', show_debug('z_file_delete')) ;
                    ZeroFrame.cmd("optionalFileDelete", {inner_path: image_path}, function (res) {
                        // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                        debug_z_api_operation_end(debug_seq, format_res(res)) ;
                    });
                    // done. update UI + callbacks
                    // console.log(pgm + 'Ok. image ' + image_path + ' downloaded') ;
                    $rootScope.$apply() ;
                    if (cb) cb(true) ;
                }) ; // z_file_get callback 2

            }) ; // dbQuery callback 1

        } // download_json_image_file


        function send_anonymous_count_msg (contact, timestamp, reaction_info, reaction) {
            var pgm = service + '.send_anonymous_count_msg: ' ;
            var count, unique_id2, message, error ;
            count = 0 ;
            for (unique_id2 in reaction_info.users) {
                if (typeof reaction_info.users[unique_id2] != 'object') continue ;
                if (reaction_info.users[unique_id2][0] == reaction) count++ ;
            }
            message = {
                msgtype: 'reaction',
                timestamp: timestamp,
                reaction: reaction,
                count: count,
                reaction_at: new Date().getTime(),
                reaction_grp: 2
            } ;
            // validate json
            error = MoneyNetworkHelper.validate_json(pgm, message, message.msgtype, 'Could not send anonymous group reaction');
            if (error) {
                console.log(pgm + 'System error: ' + error) ;
                console.log(pgm + 'message = ' + JSON.stringify(message)) ;
                return false ;
            }
            else {
                debug('reaction', pgm + 'send anonymous reaction update for reaction ' + reaction + '. message = ' + JSON.stringify(message)) ;
                add_msg(contact, message);
                return true ;
            }
        } ; // send_anonymous_count_msg



        // array with messages with unknown unique id for contact.
        // must create contact and process message once more
        var new_unknown_contacts = [] ;

        // array with receipts to send. for example receipts for chat with image where image should be deleted from ZeroNet fast to free space
        var new_incoming_receipts = 0 ;
        var new_outgoing_receipts = [] ;

        // process inbox message. Used from
        // - local_storage_read_messages (post login function)
        // - event_file_done (incoming files)
        // - recheck_old_decrypt_errors (post login function)
        // params:
        // - res. row from data.json msg array + auth_address
        // - unique_id. contact unique id
        // - sent_at. only used by recheck_old_decrypt_errors. retrying decrypt after login and maybe changed ZeroNet certificate.
        //   cleanup old "lost msg2" message (decrypt error) after processing message
        function process_incoming_message (res, unique_id, sent_at) {
            var pgm = service + '.process_incoming_message: ' ;
            var contact, i, my_prvkey, encrypt, password, decrypted_message_str, decrypted_message, sender_sha256,
                error, local_msg_seq, message, contact_or_group, found_lost_msg, found_lost_msg2, js_messages_row,
                placeholders, image_download_failed, obj_of_reaction, key, key_a, user_path, cache_filename, cache_status,
                get_and_load_callback, save_private_reaction, last_online, file_name, old_userid ;
            old_userid = z_cache.user_id ;
            if (detected_client_log_out(pgm, old_userid)) return ;

            if (!res.hub) {
                console.log(pgm + 'invalid call. hub is missing in res. res = ' + JSON.stringify(res) + ', unique_id = ' + unique_id + ', sent_at = ' + sent_at);
                return false ;
            }

            // todo: hub must be in res
            debug('lost_message', pgm + 'sent_at = ' + sent_at) ;
            debug('inbox && encrypted', pgm + 'res = ' + JSON.stringify(res) + ', unique_id = ' + unique_id);

            if (!res.key) {
                // no key - must be a symmetric group chat message.

                // find pseudo group chat contact from receiver_sha256 address
                group_chat_contact = get_contact_by_password_sha256(res.receiver_sha256) ;
                if (!group_chat_contact) {
                    console.log(pgm + 'could not find any pseudo group chat contact with correct password') ;
                    return false ;
                }

                // group chat using symmetric key encryption
                password = group_chat_contact.password ;
                try {
                    decrypted_message_str = MoneyNetworkHelper.decrypt(res.message, password)
                }
                catch (err) {
                    console.log(pgm + 'Ignoring message with invalid encryption. error = ' + err.message) ;
                    return false
                }
            }
            else if (res.message.indexOf(',') == -1) {
                // key and no iv in message - JSEncrypt encryption
                res.encryption = 1 ;

                my_prvkey = MoneyNetworkHelper.getItem('prvkey');
                encrypt = new JSEncrypt();
                encrypt.setPrivateKey(my_prvkey);
                try {
                    password = encrypt.decrypt(res.key);
                    decrypted_message_str = MoneyNetworkHelper.decrypt(res.message, password)
                }
                catch (err) {
                    console.log(pgm + 'Ignoring message with invalid encryption. error = ' + err.message) ;
                    return false
                }
            }
            else {
                // key and iv in message - cryptMessage plugin encryption
                res.encryption = 2
                ;
                if (!res.hasOwnProperty('decrypted_message_str')) {
                    // decrypt and callback to this function. two cryptMessage callbacks and return to this function when done
                    process_incoming_cryptmessage(res, unique_id, sent_at) ;
                    // stop.
                    return false ;
                }
                // already decrypted. continue
                decrypted_message_str = res.decrypted_message_str ;
                password = res.decrypted_message_password ;
                if (decrypted_message_str == 'changed cert error' ) {
                    // cryptMessage decrypt error but user has more than one ZeroNet certificate and maybe the message
                    // probably encrypted using an other ZeroNet certificate. added a lost msg2 notification in UI
                    // do not receive this inbox message again
                    if (!ignore_zeronet_msg_id[res.auth_address]) ignore_zeronet_msg_id[res.auth_address] = [] ;
                    ignore_zeronet_msg_id[res.auth_address].push(res.message_sha256) ;
                    // Return true to save contacts and refresh angularJS UI
                    return true ;
                }
                if (['error2', 'error3', 'error4', 'error5'].indexOf(decrypted_message_str) != -1) {
                    // known errors from cryptMessage decrypt:
                    // - error2 - certificate check failed - error on dbQuery select - never see that error
                    // - error3 - decrypt error but no other known ZeroNet certificates were found .... - never seen that error
                    // - error4 - issue 131 - trying to decrypt same cryptMessage again - should be processed in recheck_old_decrypt_errors after client login
                    // - error5 - invalid json  after cryptMessage decrypt. never seen that error
                    debug('lost_message', pgm + 'ignored new incoming message with decrypt error = ' + decrypted_message_str + '. res = ' + JSON.stringify(res)) ;
                    return false ;
                }
            }

            // console.log(pgm + 'decrypted message = ' + decrypted_message_str) ;
            try {
                decrypted_message = JSON.parse(decrypted_message_str);
            }
            catch (err) {
                console.log(pgm + 'ignored new incoming message with invalid json. decrypted_message_str = ' + decrypted_message_str + ', error = ' + err.message) ;
                return false ;

            }

            // who is message from? find contact from unique_id.
            contact = get_contact_by_unique_id(unique_id) ;
            if (!contact) {
                // buffer incoming message, create contact and try once more
                new_unknown_contacts.push({
                    res: res,
                    unique_id: unique_id
                });
                return false ;
            }
            // where to find messages?
            contact_or_group = res.key ? contact : group_chat_contact ;

            // check spam filters block_guests and block_ignored from user setup
            if (contact.type == 'guest') {
                if (z_cache.user_setup.block_guests) {
                    debug('spam_filter', pgm + 'blocking quests and ignoring message from guest ' + JSON.stringify(contact));
                    return false ;
                }
                if (z_cache.user_setup.block_guests_at && (res.timestamp < z_cache.user_setup.block_guests_at)) {
                    debug('spam_filter', pgm + 'no longer blocking quests but ignoring old blocked message from guest ' + JSON.stringify(contact));
                    return false ;
                }
            }
            if (contact.type == 'ignored') {
                if (z_cache.user_setup.block_ignored) {
                    debug('spam_filter', pgm + 'blocking message from contact on ignored list ' + JSON.stringify(contact));
                    return false ;
                }
                if (z_cache.user_setup.block_ignored_at && (res.timestamp < z_cache.user_setup.block_ignored_at)) {
                    debug('spam_filter', pgm + 'no longer blocking messages from ignored list but ignoring old blocked message from contact ' + JSON.stringify(contact));
                    return false ;
                }
            }

            // validate incoming message.
            sender_sha256 = null ;
            if (!decrypted_message.msgtype) {
                console.log(pgm + 'Ignoring message without required msgtype');
                decrypted_message = {
                    msgtype: 'invalid',
                    error: 'message without msgtype',
                    message: decrypted_message
                };
            }
            else {
                // before json validate
                if (res.decrypted_message_str) {
                    // cryptMessage encrypted message. image = true maybe replaced with a image_download_failed object
                    if (typeof decrypted_message.image == 'object') {
                        image_download_failed = decrypted_message.image ;
                        decrypted_message.image = false ;
                    }
                }
                // validate json based on decrypted_message.msgtype
                error = MoneyNetworkHelper.validate_json (pgm, decrypted_message, decrypted_message.msgtype, 'Ignoring invalid message') ;
                if (error) {
                    decrypted_message = {
                        msgtype: 'invalid',
                        error: error,
                        message: decrypted_message
                    };
                }
                else {
                    // incoming message is valid.
                    // any secret reply to sha256 address on message?
                    sender_sha256 = decrypted_message.sender_sha256 ;
                    delete decrypted_message.sender_sha256 ;
                    // console.log(pgm + 'sender_sha256 = ' + sender_sha256);
                }
            }

            //decrypted_message = {
            //    "msgtype": "chat msg",
            //    "message": "message 2 lost in cyberspace",
            //    "sent_at": 1480518136131,
            //    "local_msg_seq": 2
            //};

            // "sent_at" timestamp in incoming message together with "local_msg_seq" or "message_sha256" in incomming message.
            // is used when resending lost messages. two kind of lost messages:
            // a) lost messages detected in feedback info loop. sent but now received. "lost msg" notification in the UI until receiving the original message
            // b) cryptMessage decrypt error. contact resend message encrypted for changed certificate. "lost msg2" notification in the UI until receiving the original message
            // c) an incoming message can match both type of errors. identified with original local_msg_seq and message_sha256 information inside the received message
            if (decrypted_message.sent_at || sent_at) {
                debug('lost_message', pgm + 'message with sent_at timestamp. must be contact resending a lost message');
                debug('lost_message', pgm + 'decrypted_message = ' + JSON.stringify(decrypted_message));
                found_lost_msg = false ;
                found_lost_msg2 = false ;
                // 1) find message with same local_msg_seq - this technique can only be used for "lost msg"
                index = -1;
                for (i = contact_or_group.messages.length-1; i >= 0 ; i--) {
                    message = contact_or_group.messages[i];
                    if (message.folder != 'inbox') continue;
                    if ((message.message.msgtype == 'lost msg') && !sent_at && (message.message.local_msg_seq == decrypted_message.local_msg_seq)) {
                        // found matching lost message notification in UI
                        debug('lost_message', pgm + 'old lost msg placeholder was found. deleting it');
                        found_lost_msg = true ;
                        js_messages_row = get_message_by_seq(message.seq) ;
                        remove_message(js_messages_row) ;
                        continue ;
                    }
                    if ((message.message.msgtype == 'lost msg2') && (message.message.message_sha256 == decrypted_message.message_sha256)) {
                        // found matching decrypt error message in UI
                        debug('lost_message', pgm + 'old decrypt error placeholder was found. deleting it');
                        found_lost_msg2 = true ;
                        js_messages_row = get_message_by_seq(message.seq) ;
                        remove_message(js_messages_row) ;
                        //continue ;
                    }
                } // for i (contact_or_group.messages)
                if (!found_lost_msg && !found_lost_msg2) {
                    // lost msg not found. continue as normal new msg
                    placeholders = [] ;
                    if (decrypted_message.local_msg_seq) placeholders.push('local_msg_seq ' + decrypted_message.local_msg_seq) ;
                    if (decrypted_message.message_sha256) placeholders.push('message_sha256 ' + decrypted_message.message_sha256) ;
                    debug('lost_message', pgm + 'lost msg placeholder with ' + placeholders.join(' or ') + ' was not found. continue processing as normal new incoming message');
                    delete decrypted_message.sent_at;
                }

            } // if decrypted_message.sent_at

            // save incoming message
            local_msg_seq = next_local_msg_seq() ;
            message = {
                local_msg_seq: local_msg_seq,
                folder: 'inbox',
                message: decrypted_message,
                zeronet_msg_id: res.message_sha256,                  // message id on ZeroNet (messages table = msg array in data.json)
                sender_sha256: sender_sha256,                        // random sha256 value - secret reply to address
                sent_at: decrypted_message.sent_at || res.timestamp,
                receiver_sha256: res.receiver_sha256,                // random sha256 value - message received from this address
                received_at: new Date().getTime(),
                image_download_failed: image_download_failed,        // special image download failed object
                encryption: res.encryption                           // 1: JSEncrypted, 2: cryptMessage
            } ;
            if (!sender_sha256) delete message.sender_sha256 ;
            if (!image_download_failed) delete message.image_download_failed ;
            if (!res.encryption) delete message.encryption ;

            // check receiver_sha256. sha256(pubkey) or a previous sender_sha256 address sent to contact
            var my_pubkey = MoneyNetworkHelper.getItem('pubkey') ;
            var my_pubkey_sha256 = CryptoJS.SHA256(my_pubkey).toString();
            if ((message.receiver_sha256 == my_pubkey_sha256) || !res.key) delete message.receiver_sha256 ;
            // if (message.receiver_sha256 && !res.key) debug('inbox && unencrypted', pgm + 'error. expected receiver_sha256 to be null (1)');
            if (!res.key) {
                // group chat. add participant. who sent this group chat message?
                for (i=0 ; i<group_chat_contact.participants.length ; i++) {
                    if (group_chat_contact.participants[i] == contact.unique_id) message.participant = i+1 ;
                }
            }
            message.ls_msg_size = JSON.stringify(message).length ;

            if (!res.auth_address) console.log(pgm + 'todo: please add auth_address to res. res = ' + JSON.stringify(res)) ;
            else {
                if (!ignore_zeronet_msg_id[res.auth_address]) ignore_zeronet_msg_id[res.auth_address] = [] ;
                ignore_zeronet_msg_id[res.auth_address].push(res.message_sha256) ;
            }


            if (res.key && sender_sha256 && (res.timestamp > contact.inbox_last_sender_sha256_at)) {
                contact.inbox_last_sender_sha256 = sender_sha256 ;
                contact.inbox_last_sender_sha256_at = res.timestamp ;
            }

            debug('inbox && unencrypted', pgm + 'new incoming message = ' + JSON.stringify(message));
            //message = {
            //    "local_msg_seq": 384,
            //    "folder": "inbox",
            //    "message": {"msgtype": "received", "remote_msg_seq": 383, "local_msg_seq": 2},
            //    "zeronet_msg_id": "1fe194fae73b323d7147141687789f1fae802102ed4658985a2bdc323fdcbe13",
            //    "sender_sha256": "ae7a57d6430be2b7f1cc90026bf788de75d7329819b2c27e46595d6d66601606",
            //    "sent_at": 1480097517890,
            //    "receiver_sha256": "3e33ff66af81ef8a9484b94996e0d300e9659a8fc61c01c80432745cc1ba51cd",
            //    "received_at": 1480097522875,
            //    "ls_msg_size": 414
            //};
            add_message(contact_or_group, message, false) ;

            if (message.receiver_sha256) {
                // this message is using a sender_sha256 address from a previous sent message (add contact, chat etc)
                // keep track of used sender_sha256 in outgoing messages. Must cleanup old no longer used sender_sha256 addresses
                var outbox_message, contact2 ;
                outbox_message = get_message_by_sender_sha256(message.receiver_sha256) ;
                if (outbox_message) {
                    // 1: OK. known sender_sha256 address. Check contact.
                    contact2 = outbox_message.contact ;
                    if (contact2.pubkey == contact.pubkey) {
                        // OK contact
                        if (contact2.unique_id != contact.unique_id) {
                            debug('lost_message',
                                pgm + 'received message with receiver_sha256 ' + message.receiver_sha256 + 
                                '. contact ok but must have changed ZeroNet certificate') ;
                        }

                        outbox_message.message.feedback = message.received_at ;
                        if (!contact2.hasOwnProperty('outbox_sender_sha256')) contact2.outbox_sender_sha256 = {} ;
                        contact2.outbox_sender_sha256[message.receiver_sha256] = { sent_at: outbox_message.message.sent_at } ;

                        if (!contact2.outbox_sender_sha256[message.receiver_sha256].last_used_at ||
                            (message.sent_at > contact2.outbox_sender_sha256[message.receiver_sha256].last_used_at)) {
                            // console.log(pgm + 'updated contact2.sha256. contact2 = ' + JSON.stringify(contact2));
                            contact2.outbox_sender_sha256[message.receiver_sha256].last_used_at = message.sent_at ;
                        }

                    }
                    else {
                        // sha256 address found but contact is not correct
                        // maybe a problem with temporary missing contact pubkey. see in UI
                        console.log(
                            pgm, 'UPS. received message with receiver_sha256 ' + message.receiver_sha256 +
                            '. known receiver_sha256 but contact is not correct' +
                            (contact.pubkey ? '' : '. inbox message contact.pubkey is null') +
                            (contact2.pubkey ? '' : '. outbox message contact.pubkey is null'));
                    }
                }
                else {
                    // 2: sha256 address has not found in outbox. check deleted outbox messages.
                    for (i=0 ; i<ls_contacts.length ; i++) {
                        contact2 = ls_contacts[i] ;
                        if (contact2.pubkey != contact.pubkey) continue ;
                        if (!contact2.outbox_sender_sha256) continue ;
                        if (!contact2.outbox_sender_sha256[message.receiver_sha256]) continue ;
                        // ok - found message.receiver_sha256 in deleted outbox message
                        outbox_message = true ;
                        if (!contact2.outbox_sender_sha256[message.receiver_sha256].last_used_at ||
                            (message.sent_at > contact2.outbox_sender_sha256[message.receiver_sha256].last_used_at)) {
                            // console.log(pgm + 'updated contact2.sha256. contact2 = ' + JSON.stringify(contact2));
                            contact2.outbox_sender_sha256[message.receiver_sha256].last_used_at = message.sent_at ;
                        }
                        break ;
                    } // for i (contacts)
                    if (!outbox_message) {
                        // sha256 address was not found in outbox and neither in outbox_sender_sha256 hash with deleted outbox messages.
                        // 3: check special hash with sender_sha256 addresses for deleted contacts
                        if (ls_contacts_deleted_sha256[message.receiver_sha256]) {
                            outbox_message = true ;
                            if (!ls_contacts_deleted_sha256[message.receiver_sha256].last_used_at ||
                                (message.sent_at > ls_contacts_deleted_sha256[message.receiver_sha256].last_used_at)) {
                                // console.log(pgm + 'updated contact2.sha256. contact2 = ' + JSON.stringify(contact2));
                                ls_contacts_deleted_sha256[message.receiver_sha256].last_used_at = message.sent_at ;
                            }
                        }
                    }
                    if (!outbox_message) {
                        console.log(pgm + 'UPS. Received message with receiver_sha256 ' + message.receiver_sha256 +
                            ' but no outbox messages with this sender_sha256. Must be a system error.');
                    }
                }

            }

            // post processing new incoming messages

            if (!res.key) {
                // incoming group message. update online timestamp for group contact
                last_online = get_last_online(contact_or_group) || 0 ;
                if (Math.round(message.sent_at/1000) > last_online) set_last_online(contact_or_group, Math.round(message.sent_at/1000)) ;
            }

            // any feedback info?
            if (sent_at) {
                // process_incoming_message is called from recheck_old_decrypt_errors
                // feedback information maybe be out of date
                delete decrypted_message.feedback ;
            }
            var feedback = decrypted_message.feedback ;
            if (feedback) {
                // received feedback info. what messages have contact sent. what messages is contact waiting for feedback for
                debug('feedback_info || inbox && unencrypted', pgm + 'feedback = ' + JSON.stringify(feedback));
                // decrypted_message.feedback = {"received":[468,469,470,473],"sent":[4]} ;
                receive_feedback_info(message, contact_or_group) ;
            }

            if ((res.encryption == 2) && (message.message.image == true)) {
                // cryptMessage with an image attachment. Must start image attachment download
                (function () {
                    var contact, image_path, mn_query_9, debug_seq ;

                    // create image_download_failed object. Used after errors and in event_file_done after download
                    message.image_download_failed = {
                        download_failure_at: new Date().getTime(),
                        encryption: 2,
                        password: password
                    };
                    contact = get_contact_by_unique_id(unique_id);

                    // temporary image path. used in error messages
                    image_path = "merged-" + get_merged_type() + "/" + contact.hub + "/data/users/" + contact.auth_address + '/' + res.timestamp + '-%-image.json';

                    // check if image attachment exist. could have been cleanup or deleted by user
                    mn_query_9 =
                        "select files_optional.filename, files_optional.size, json.directory " +
                        "from files_optional, json " +
                        "where json.json_id = files_optional.json_id " +
                        "and json.directory like '%/data/users/" + contact.auth_address + "' " +
                        "and  ( files_optional.filename = '" + message.sent_at + '-image.json' + "'" +
                        "    or files_optional.filename like '" + message.sent_at + '-%-image.json' + "' )";
                    debug('select', pgm + 'mn query 9 = ' + mn_query_9);
                    // debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 9') ;
                    debug_seq = debug_z_api_operation_start(pgm, 'mn query 9', 'dbQuery', show_debug('z_db_query')) ;
                    ZeroFrame.cmd("dbQuery", [mn_query_9], function (query_res) {
                        var pgm = service + '.process_incoming_cryptmessage dbQuery callback 3: ';
                        // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                        debug_z_api_operation_end(debug_seq, format_q_res(query_res)) ;
                        // console.log(pgm + 'res = ' + JSON.stringify(res));
                        if (detected_client_log_out(pgm, old_userid)) return ;
                        if (query_res.error) {
                            console.log(pgm + "image download check failed: " + query_res.error);
                            console.log(pgm + 'mn query 9 = ' + mn_query_9);
                            message.message.image = false ;
                            return;
                        }
                        if (query_res.length == 0) {
                            console.log(pgm + 'optional image file ' + image_path + ' was not found in optional files.');
                            message.message.image = false ;
                            return;
                        }
                        // OK. optional image json file exist. start download. will trigger a event_file_done when ready
                        image_path = "merged-" + get_merged_type() + "/" + query_res[0].directory + '/' + query_res[0].filename;
                        debug('inbox', pgm + 'downloading image ' + image_path);
                        z_file_get(pgm, {inner_path: image_path, required: true}, function (image) {
                            var pgm = service + '.process_incoming_cryptmessage z_file_get callback 4: ';
                            debug('inbox', pgm + 'downloaded image ' + image_path);

                        }); // z_file_get callback 4

                    }); // dbQuery callback 3

                })() ;

            } // end if cryptMessage with image

            if (decrypted_message.msgtype == 'contact added') {
                // received public & unverified user information from contact
                // remove any old search words from contact
                // console.log(pgm + 'processing contact added: debug 1. search = ' + JSON.stringify(contact.search));
                for (i=contact.search.length-1 ; i>=0 ; i--) {
                    if (['Public','Unverified'].indexOf(contact.search[i].privacy)>-1) contact.search.splice(i,1);
                }
                // console.log(pgm + 'processing contact added: debug 2. search = ' + JSON.stringify(contact.search));
                // add new search words to contact
                for (i=0 ; i<decrypted_message.search.length ; i++) {
                    contact.search.push({
                        tag: decrypted_message.search[i].tag,
                        value: decrypted_message.search[i].value,
                        privacy: decrypted_message.search[i].privacy
                    }) ;
                }
                // console.log(pgm + 'processing contact added: debug 3. search = ' + JSON.stringify(contact.search));
            } // end contact added

            if ((decrypted_message.msgtype == 'chat msg') && decrypted_message.old_local_msg_seq) {
                // received update to an old chat message
                // todo: must also implement delete chat message
                var old_message_envelope, old_message, index ;
                index = -1 ;
                for (i=0 ; i<contact_or_group.messages.length ; i++) {
                    old_message_envelope = contact_or_group.messages[i] ;
                    old_message = old_message_envelope.message ;
                    if (old_message_envelope.folder != 'inbox') continue ;
                    if (old_message.msgtype != 'chat msg') continue ;
                    if (old_message.local_msg_seq != decrypted_message.old_local_msg_seq) continue ;
                    index = i ;
                    break ;
                } // for i
                if (index == -1) {
                    debug('inbox && unencrypted', pgm + 'Received update to old chat message with local_msg_seq ' + decrypted_message.old_local_msg_seq + ' that does not exist') ;
                    debug('inbox && unencrypted', pgm + 'decrypted_message = ' + JSON.stringify(decrypted_message));
                    delete decrypted_message.old_local_msg_seq ;
                    old_message_envelope = null ;
                    if (decrypted_message.image == 'x') delete decrypted_message.image ; // x = image unchanged but old message was not found
                }
                else {
                    old_message_envelope = contact_or_group.messages[index];
                    // old_message_envelope.deleted_at = message.sent_at ;
                    js_messages_row = get_message_by_seq(old_message_envelope.seq) ;
                    recursive_delete_message(js_messages_row) ;
                    // js_messages_row.chat_filter = false ;
                    debug('inbox && unencrypted', pgm + 'received OK update to an old chat msg') ;
                    debug('inbox && unencrypted', pgm + 'new decrypted_message = ' + JSON.stringify(decrypted_message));
                    debug('inbox && unencrypted', pgm + 'old_message_envelope  = ' + JSON.stringify(old_message_envelope));
                }
                // empty chat msg update => delete chat message
                if (!decrypted_message.message) {
                    console.log(pgm + 'todo: contact deleted message. must set chat_filter = false. use seq? message = ' + JSON.stringify(message)) ;
                    message.deleted_at = message.sent_at ;
                }
            } // end chat msg

            if ((decrypted_message.msgtype == 'chat msg') && decrypted_message.image) {
                if (decrypted_message.image == 'x') {
                    // x = edit chat message with unchanged image. just copy image from old to new message
                    decrypted_message.image = old_message_envelope.message.image ;
                }
                else if (decrypted_message.image == true) {
                    // new image attachment method
                    // true: message image is in an optional image json file <timestamp>-image.json (old format) or <timestamp>-<userseq>-image.json (new format)
                    download_json_image_file(res.hub, res.auth_address, message, password, function (ok) {
                        var pgm = service + '.download_json_image_file callback: ';
                        if (detected_client_log_out(pgm, old_userid)) return ;
                        if (!ok) {
                            // image download failed. remember failed image download. image may arrive later and be processed in a file_done event
                            decrypted_message.image = false ;
                            message.image_download_failed = {
                                download_failure_at: new Date().getTime(),
                                encryption: 1, // symmetric encrypt
                                password: password
                            };
                            if ((z_cache.user_setup.test && z_cache.user_setup.test.image_timeout)) ls_save_contacts(false);
                        }
                        else {
                            // received a chat message with an image.
                            // Send receipt so that other user can delete msg from data.json and free disk space
                            // privacy issue - monitoring ZeroNet files will reveal who is chatting. Receipt makes this easier to trace.
                            var receipt = { msgtype: 'received', remote_msg_seq: decrypted_message.local_msg_seq };
                            // validate json
                            var error = MoneyNetworkHelper.validate_json(pgm, response, response.msgtype, 'Cannot send receipt for chat message');
                            if (error) console(pgm + error) ;
                            else {
                                // this callback can be called multiple times after log in or when receiving a data.json file
                                // multiple images in process_incoming_message => multiple calls to z_update_1_data_json
                                // process lock in z_update_1_data_json will output a warning in log
                                // first receipt in first z_update_1_data_json call
                                // other receipts in next z_update_1_data_json call in 30 seconds
                                add_msg(contact, response) ;
                                z_update_1_data_json(pgm);
                            }

                        }

                    }) ; // download_json_image_file
                }
                else {
                    // old image attachment method
                    // received a chat message with an image. Send receipt so that other user can delete msg from data.json and free disk space
                    // privacy issue - monitoring ZeroNet files will reveal who is chatting. Receipt makes this easier to trace.
                    var receipt = { msgtype: 'received', remote_msg_seq: decrypted_message.local_msg_seq };
                    // validate json
                    error = MoneyNetworkHelper.validate_json(pgm, response, response.msgtype, 'Cannot send receipt for chat message');
                    if (error) console(pgm + error) ;
                    else new_outgoing_receipts.push({ contact: contact, message: response}) ;
                }
            } // end chat msg

            if (decrypted_message.msgtype == 'received') {
                // received receipt for outgoing chat message with image.
                // remove chat message from ZeroNet to free disk space
                // must update zeronet
                // a) receipt from a normal chat. just update data.json. cleanup code in z_update_1_data_json
                // b) receipt from a group chat. should cleanup data.json when all receipts have been received.
                //    see chatCtrl.chat_filter
                debug('inbox && unencrypted', pgm + 'received receipt from contact. expects old outgoing chat message with image to be removed from data.json and zeronet_msg_size to be updated') ;
                debug('inbox && unencrypted', pgm + 'decrypted_message = ' + JSON.stringify(decrypted_message));
                // debug('inbox && unencrypted', pgm + 'contact.messages = ' + JSON.stringify(contact.messages));
                // check if image chat was a group chat image message
                var remote_msg_seq = decrypted_message.remote_msg_seq ;
                // debug('inbox && unencrypted', pgm + 'check if image chat was a group chat image message. remote_msg_seq = ' + remote_msg_seq);
                var message2 = get_message_by_local_msg_seq(remote_msg_seq);
                if (!message2) {
                    debug('inbox && unencrypted', pgm + 'error. could not find any message local_msg_seq = ' + remote_msg_seq) ;
                }
                else if (message2.contact.type == 'group') {
                    debug('inbox && unencrypted', pgm + 'image receipt was from a group chat message');
                    var image_receipts = message2.message.image_receipts ;
                    // debug('inbox && unencrypted', pgm + 'image_receipts = ' + JSON.stringify(image_receipts));
                    // debug('inbox && unencrypted', pgm + 'group contact = ' + JSON.stringify(message2.contact)) ;
                    // debug('inbox && unencrypted', pgm + 'participants = ' + JSON.stringify(message2.contact.participants)) ;
                    // debug('inbox && unencrypted', pgm + 'contact = ' + JSON.stringify(contact)) ;
                    // debug('inbox && unencrypted', pgm + 'contact.unique_id = ' + JSON.stringify(contact.unique_id)) ;
                    index = image_receipts.indexOf(contact.unique_id) ;
                    if (index != -1) image_receipts.splice(index, 1) ;
                    debug('inbox && unencrypted', pgm + 'image_receipts.length = ' + image_receipts.length + ', message2.contact.participants.length = ' + message2.contact.participants.length ) ;
                    if (image_receipts.length == 0) {
                        // image received be all participant in group chat - ready for data.json cleanup
                        debug('inbox && unencrypted', pgm + 'image received be all participant in group chat - ready for data.json cleanup') ;
                        // new image cleanup method
                        cleanup_my_image_json(message2.message.sent_at, false, function (ok) {
                            if (ok) z_cache.publish = true ; // force publish
                        });
                        // ready for data.json cleanup
                        new_incoming_receipts++
                    }
                }
                else {
                    debug('inbox && unencrypted', pgm + 'image receipt was from a normal chat message');
                    // debug('inbox && unencrypted', pgm + 'message = ' + JSON.stringify(message));
                    // debug('inbox && unencrypted', pgm + 'message2 = ' + JSON.stringify(message2));
                    // new image cleanup method
                    cleanup_my_image_json(message2.message.sent_at, false, function (ok) {
                        if (ok) z_cache.publish = true ; // force publish
                    });
                    // ready for data.json cleanup
                    new_incoming_receipts++ ;
                }
            }

            if (decrypted_message.msgtype == 'verified') {
                // received response to a verify contact request.
                // password has already been sha256 validated by contact. Just double check and change contact status to Verified
                index = -1 ;
                debug('inbox && unencrypted', pgm + 'contact.messages = ' + JSON.stringify(contact.messages));
                for (i=0 ; i<contact.messages.length ; i++) {
                    old_message_envelope = contact.messages[i] ;
                    old_message = old_message_envelope.message ;
                    if (old_message_envelope.folder != 'outbox') continue ;
                    if (old_message.msgtype != 'verify') continue ;
                    if (old_message_envelope.password != decrypted_message.password) continue ;
                    index = i ;
                    break ;
                }
                if (index == -1) debug('inbox && unencrypted', pgm + 'Received verified message but original verify request is not longer in outbox or password is not correct') ;
                else if (contact.type != 'unverified') debug('inbox && unencrypted', pgm + 'Received verified message with correct passowrd but contact is not (any longer) an unverified contact') ;
                else contact.type = 'verified' ;
            }

            if (decrypted_message.msgtype == 'group chat') {
                console.log(pgm + 'decrypted_message = ' + JSON.stringify(decrypted_message)) ;
                // received password for a new group chat.
                // check for unknown participants
                var my_unique_id = get_my_unique_id();
                var participant, j ; // x
                var last_updated, timestamp ;
                last_updated = Math.round(message.sent_at/1000) ;
                for (i=0 ; i<decrypted_message.participants.length ; i++) {
                    if (decrypted_message.participants[i] == my_unique_id) continue ;
                    participant = get_contact_by_unique_id(decrypted_message.participants[i]) ;
                    if (!participant) console.log(pgm + 'warning. could not find participant with unique id ' + decrypted_message.participants[i]) ;
                } // for i
                // find unique id for pseudo group chat contact.
                var group_chat_unique_id = CryptoJS.SHA256(decrypted_message.password).toString() ;
                console.log(pgm + 'group_chat_unique_id = ' + group_chat_unique_id) ;
                var group_chat_contact = get_contact_by_unique_id(group_chat_unique_id);
                if (group_chat_contact) console.log(pgm + 'warning. group contact already exists. group_chat_contact = ' + JSON.stringify(group_chat_contact)) ;
                if (!group_chat_contact) {
                    // create pseudo chat group contact
                    var public_avatars = MoneyNetworkHelper.get_public_avatars() ;
                    index = Math.floor(Math.random() * (public_avatars.length-1)); // avatarz.png is used for public contact
                    var avatar = public_avatars[index] ;
                    group_chat_contact = {
                        unique_id: group_chat_unique_id,
                        cert_user_id: group_chat_unique_id.substr(0,13) + '@moneynetwork',
                        type: 'group',
                        password: decrypted_message.password,
                        participants: decrypted_message.participants,
                        search: [],
                        messages: [],
                        avatar: avatar
                    };
                    // add search info
                    group_chat_contact.search.push({
                        tag: 'Group',
                        value: group_chat_contact.participants.length + ' participants',
                        privacy: 'Search',
                        row: group_chat_contact.search.length+1
                    });
                    add_contact(group_chat_contact) ;
                    watch_receiver_sha256.push(group_chat_unique_id) ;
                    if (res.encryption == 2) {
                        // group chat password was cryptmessage decrypted in a callback operation
                        // first group chat message (next row in data.json msg array was ignored)
                        // reprocess just received data.json file
                        debug('file_done', pgm + 'received a cryptmessage encrypted group chat password. reprocessing just received data.json file to read first group chat message in new group chat') ;
                        if (!res.hub) console.log(pgm + 'todo: merger site. hub is missing in res. res = ' + JSON.stringify(res));
                        file_name = '/data/users/' + res.auth_address + '/data.json' ;
                        if (!res.hub) console.log(pgm + 'todo: hub is missing in res. res = ' + JSON.stringify(res));
                        $timeout(function () {
                            event_file_done(res.hub, 'file_done', file_name) ;
                        });
                    }
                }
                set_last_online(group_chat_contact, last_updated) ;
            } // group chat

            if (decrypted_message.msgtype == 'reaction') {
                debug('reaction', pgm + 'received a private reaction. decrypted_message = ' + JSON.stringify(decrypted_message)) ;
                //decrypted_message = {
                //    "msgtype": "reaction",
                //    "timestamp": 1487604364774,
                //    "reaction": "❤",
                //    "count": 1,
                //    "reaction_at": 1488185733446,
                //    "reaction_grp": 2,
                //    "local_msg_seq": 4192
                //};

                // delete received reaction. wait until feedback cycle is complete for reaction inbox message. add add_feedback_info

                obj_of_reaction = null ;
                if (decrypted_message.reaction && !is_emoji[decrypted_message.reaction]) {
                    debug('reaction', pgm + 'ignoring reaction with unknown emoji') ;
                }
                else if (decrypted_message.reaction_grp == 1) {
                    // 1) a private reaction to a public chat message.
                    //    object of reaction is a public chat outbox message in an optional -chat file
                    //    message may not yet have been loaded into memory.
                    //    message may have been deleted.
                    //    private reaction info for public chat messages is stored in ls_reactions
                    //    maybe already other anonymous reactions in like.json for this public chat message

                    save_private_reaction = function (obj_of_reaction) {
                        var pgm = service + '.process_incoming_message.save_private_reaction: ' ;
                        var reaction_info, old_reaction, new_reaction, i, unicode, title, user_reactions, emoji_folder ;

                        // 1: save private reaction in localStorage (non anonymous)
                        debug('reaction', pgm + 'save non anonymous reaction information in localStorage') ;
                        // reactions to public chat messages in localStorage
                        // reactions[index] = { reaction_info }
                        // a) my private reaction to my public chat outbox messages (no one can see this except yourself):
                        //    index: timestamp,
                        //    reaction_info: reaction
                        //    not relevant in this context (receive private reaction from other user)
                        // b) my private reaction to other users public chat inbox messages:
                        //    index: timestamp+auth4.
                        //    reaction_info: reaction
                        //    not relevant in this context (receive private reaction from other user)
                        // c) other users private reactions to my public chat outbox messages:
                        //    index: timestamp,
                        //    reaction_info: array with user reactions. auth_address, user_seq and reaction
                        //    must also include a reaction_at timestamp for like.json update with anonymous reaction information
                        //    relevant here but check also a. index in a and c are identical.
                        if (!ls_reactions[decrypted_message.timestamp]) ls_reactions[decrypted_message.timestamp] = {} ;
                        reaction_info = ls_reactions[decrypted_message.timestamp] ;
                        if (!reaction_info.users) reaction_info.users = {} ; // unique_id => emoji (anonymous reactions)
                        if (!reaction_info.emojis) reaction_info.emojis = {} ; // emoji => count (anonymous reactions)
                        old_reaction = reaction_info.users[unique_id] ;
                        new_reaction = decrypted_message.reaction ;
                        if (old_reaction == new_reaction) {
                            debug('reaction', pgm + 'stop. old reaction = new reaction.') ;
                            return ;
                        }
                        if (old_reaction) {
                            if (!reaction_info.emojis[old_reaction]) reaction_info.emojis[old_reaction] = 1 ;
                            reaction_info.emojis[old_reaction]-- ;
                            if (reaction_info.emojis[old_reaction] <= 0) delete reaction_info.emojis[old_reaction] ;
                        }
                        if (new_reaction) {
                            if (!reaction_info.emojis[new_reaction]) reaction_info.emojis[new_reaction] = 0 ;
                            reaction_info.emojis[new_reaction]++ ;
                            reaction_info.users[unique_id] = new_reaction
                        }
                        else delete reaction_info.users[unique_id] ;
                        reaction_info.reaction_at = new Date().getTime() ;
                        ls_save_reactions(false) ;

                        // 2: Update UI - add/update emojis reaction information in public chat outbox message
                        if (!obj_of_reaction.reactions) obj_of_reaction.reactions = [] ;
                        if (old_reaction) {
                            unicode = symbol_to_unicode(old_reaction) ;
                            for (i=obj_of_reaction.reactions.length-1 ; i>= 0 ; i--) {
                                if (obj_of_reaction.reactions[i].unicode == unicode) {
                                    obj_of_reaction.reactions[i].count-- ;
                                    if (obj_of_reaction.reactions[i].count == 0) obj_of_reaction.reactions.splice(i,1) ;
                                    break ;
                                }
                            }
                        }
                        if (new_reaction) {
                            unicode = symbol_to_unicode(new_reaction) ;
                            for (i=0 ; i<obj_of_reaction.reactions.length ; i++) {
                                if (obj_of_reaction.reactions[i].unicode == unicode) {
                                    obj_of_reaction.reactions[i].count++ ;
                                    unicode = null ;
                                    break ;
                                }
                            }
                            if (unicode) {
                                user_reactions = get_user_reactions() ;
                                title = null ;
                                for (i=0 ; i<user_reactions.length ; i++) {
                                    if (user_reactions[i].unicode == unicode) title = user_reactions[i].title ;
                                }
                                if (!title) title = is_emoji[new_reaction] ;
                                emoji_folder = get_emoji_folder() ;
                                obj_of_reaction.reactions.push({
                                    unicode: unicode,
                                    title: title,
                                    src: emoji_folder + '/' + unicode + '.png',
                                    count: 1
                                }) ;
                            }
                        }

                        // 3: save anonymous reaction information in like.json
                        debug('reaction', pgm + 'save anonymous reaction information in like.json. see like.json and z_update_6_like_json');
                        new_incoming_receipts++ ; // trigger an update z_update_1_data_json call
                        // see like.json and z_update_6_like_json

                    };
                    obj_of_reaction = get_public_chat_outbox_msg(decrypted_message.timestamp) ;
                    if (obj_of_reaction) {
                        debug('reaction', pgm + 'OK. obj_of_reaction = ' + JSON.stringify(obj_of_reaction));
                        save_private_reaction(obj_of_reaction) ;
                    }
                    else {
                        // public outbox chat message was not found in memory. check list of optional -chat files
                        debug('reaction', pgm + 'public chat message with timestamp ' + decrypted_message.timestamp + ' was not found in public chat outbox messages') ;
                        debug('reaction', pgm + 'my_files_optional = ' + JSON.stringify(z_cache.my_files_optional)) ;
                        // - public chat : <to unix timestamp>-<from unix timestamp>-<user seq>-chat.json (timestamps are timestamp for last and first message in file)
                        cache_filename = null ;
                        for (key in z_cache.my_files_optional) {
                            if (!key.match(/-chat/)) continue ;
                            key_a = key.split('-') ;
                            if (decrypted_message.timestamp > parseInt(key_a[0])) continue ; // to timestamp
                            if (decrypted_message.timestamp < parseInt(key_a[1])) continue ; // from timestamp
                            debug('reaction', pgm + 'object of reaction may be in ' + key) ;
                            user_path = "merged-" + get_merged_type() + "/" + z_cache.my_user_hub + "/data/users/" + ZeroFrame.site_info.auth_address ;
                            cache_filename = user_path + '/' + key ;
                            break ;
                        }
                        if (cache_filename) {
                            // maybe OK. timestamp within start and end timestamp for -chat.json file
                            get_and_load_callback = function () {
                                get_and_load_chat_file(cache_filename, z_cache.my_files_optional[key].size, decrypted_message.timestamp, function (status) {
                                    var pgm = service + '.process_incoming_message get_and_load_chat_file callback 1: ' ;
                                    var obj_of_reaction ;
                                    debug('reaction', pgm + 'status = ' + status) ;
                                    // recheck public chat outbox messages after get_and_load_chat_file operation
                                    obj_of_reaction = get_public_chat_outbox_msg(decrypted_message.timestamp);
                                    if (obj_of_reaction) {
                                        debug('reaction', pgm + 'OK. obj_of_reaction = ' + JSON.stringify(obj_of_reaction));
                                        save_private_reaction(obj_of_reaction) ;
                                    }
                                    else {
                                        debug('reaction', pgm + 'Error. no public chat file exist with a mesage with timestamp  ' + decrypted_message.timestamp) ;
                                    }
                                }); // get_and_load_chat_file callback 1
                            }; //  get_and_load_callback

                            cache_status = files_optional_cache[cache_filename] ;
                            if (cache_status) {
                                // cache status already exists
                                debug('reaction', pgm + 'cache_status = ' + JSON.stringify(cache_status)) ;
                                if (cache_status.is_pending) {
                                    debug('reaction', pgm + 'fileGet request already pending for this file. ' +
                                        'add get_and_load_callback function to cache_status.callbacks array ' +
                                        'and wait for previous operation get_and_load_chat_file to finish');
                                    if (!cache_status.callbacks) cache_status.callbacks = [] ;
                                    cache_status.callbacks.push(get_and_load_callback) ;
                                }
                                else if (!cache_status.timestamps || (cache_status.timestamps.indexOf(decrypted_message.timestamp) == -1)) {
                                    debug('reaction', pgm + 'error no public chat message with timestamp ' + decrypted_message.timestamp +
                                        ' in cache_filename ' + cache_filename);
                                }
                                else {
                                    debug('reaction', pgm + 'OK. public chat message with timestamp ' + decrypted_message.timestamp +
                                        ' is in ' + cache_filename + ' but message has not yet been loaded. read message into memory');
                                    get_and_load_callback() ;
                                }
                            }
                            else {
                                // cache status has not yet been created
                                debug('reaction', pgm + cache_filename + ' was not found in cache. call get_and_load_chat_file with timestamp ' + decrypted_message.timestamp) ;
                                get_and_load_callback() ;
                            }
                        }
                        else {
                            debug('reaction', pgm + 'error. no public chat file exist with a message with timestamp  ' + decrypted_message.timestamp) ;
                        }
                    }
                }
                else if (decrypted_message.reaction_grp == 2) {
                    // 2) a reaction in a group chat to all members in group chat.
                    //    - without "count" : non anonymous reaction to all members of group chat
                    //    - with "count"    : anonymous reaction count update from creator/owner of group message
                    // testcase: test user 112 liked a group chat message. test user 110 and 111 must add reaction info to obj_of_reaction
                    //decrypted_message = {
                    //    "msgtype": "reaction",
                    //    "timestamp": 1487604364774,
                    //    "reaction": "❤",
                    //    "count": 1,
                    //    "reaction_at": 1488185733446,
                    //    "reaction_grp": 2,
                    //    "local_msg_seq": 4192
                    //};
                    obj_of_reaction = null ;
                    for (i=0 ; i<contact_or_group.messages.length ; i++) {
                        if (contact_or_group.messages[i].sent_at == decrypted_message.timestamp) {
                            obj_of_reaction = contact_or_group.messages[i] ;
                            break ;
                        }
                    }
                    if (obj_of_reaction) {
                        // cannot use decrypted_message.reactions array direct
                        // there can be both anonymous and non anonymous reactions to a group chat message
                        // storing reaction info in object_of_reaction.reaction_info
                        // ( reactions in ls_reactions are private reactions to public chat and saved anonymous in like.json file )
                        // todo: check how anonymous and non anonymous reactions are stored in (should be a identical as possible):
                        // - a) like.json
                        // - b) in z_cache.like_json and like_json_index
                        // - c) in ls_reactions
                        // - d) in message.reaction_info
                        (function(){
                            var reaction_info, old_reaction, new_reaction, unicode, i, user_reactions, title,
                                emoji_folder, my_unique_id, old_count, new_count, update_count, old_private_group_reaction ;

                            my_unique_id = get_my_unique_id();
                            if (unique_id == my_unique_id) {
                                // reaction added in z_update_1_data_json
                                debug('reaction', pgm + 'Warning. Ignoring my own group reaction') ;
                                return ;
                            }
                            if (!obj_of_reaction.reaction_info) obj_of_reaction.reaction_info = { users: {}, emojis: {} } ;

                            // check "count" (anonymous group reactions)
                            if (typeof decrypted_message.count == 'number') {
                                // received anonymous group reaction update
                                if (decrypted_message.count < 0) {
                                    debug('reaction', pgm + 'Error. Ignoring anonymous reaction with count < 0') ;
                                    return ;
                                }
                                if (message.participant != obj_of_reaction.participant) {
                                    debug('reaction',
                                        pgm + 'Error. Ignoring anonymous group reaction update. sender of reaction (' +
                                        obj_of_reaction.participant + ') is not creator of message (' + message.participant + ')') ;
                                    return ;
                                }
                                if (!decrypted_message.reaction) {
                                    debug('reaction', pgm + 'Error. Ignoring anonymous group reaction update without reaction') ;
                                    return ;
                                }
                                if (!obj_of_reaction.reaction_info.anonymous) obj_of_reaction.reaction_info.anonymous = {} ;
                            }
                            else delete decrypted_message.count ;
                            reaction_info = obj_of_reaction.reaction_info ;

                            if (typeof decrypted_message.count == 'number') {
                                // update anonymomus reaction info
                                old_count = obj_of_reaction.reaction_info.anonymous[decrypted_message.reaction] || 0 ;
                                new_count = decrypted_message.count ;
                                obj_of_reaction.reaction_info.anonymous[decrypted_message.reaction] = new_count ;
                                update_count = new_count - old_count ;
                                if (!reaction_info.emojis[decrypted_message.reaction]) reaction_info.emojis[decrypted_message.reaction] = 0 ;
                                reaction_info.emojis[decrypted_message.reaction] += update_count ;
                                if (reaction_info.emojis[decrypted_message.reaction] <= 0) delete reaction_info.emojis[decrypted_message.reaction] ;
                            }
                            else {
                                // update group reaction info
                                old_reaction = reaction_info.users[unique_id] ;
                                if (old_reaction && (typeof old_reaction == 'object')) {
                                    old_private_group_reaction = true ;
                                    old_reaction = old_reaction[0] ;
                                }
                                else old_private_group_reaction = false ;
                                new_reaction = decrypted_message.reaction ;
                                debug('reaction', pgm + 'reaction_info = ' + JSON.stringify(reaction_info) +
                                    ', old reaction = ' + JSON.stringify(old_reaction) + ', old_private_group_reaction = ' + old_private_group_reaction +
                                    ', new reaction = ' + new_reaction) ;
                                if ((old_reaction == new_reaction) && !old_private_group_reaction) return ;
                                // 1: add non anonymous reaction info to message.reaction_info hash
                                if (old_reaction) {
                                    delete reaction_info.users[unique_id] ;
                                    reaction_info.emojis[old_reaction]-- ;
                                    if (reaction_info.emojis[old_reaction] <= 0) delete reaction_info.emojis[old_reaction] ;
                                }
                                if (new_reaction) {
                                    reaction_info.users[unique_id] = new_reaction ;
                                    if (reaction_info.emojis.hasOwnProperty(new_reaction)) reaction_info.emojis[new_reaction] = 0 ;
                                    reaction_info.emojis[new_reaction]++ ;
                                }
                            }

                            // 2: update message.reaction array
                            if (!obj_of_reaction.reactions) obj_of_reaction.reactions = [] ;
                            js_messages_row = get_message_by_seq(obj_of_reaction.seq) ;
                            check_private_reactions(js_messages_row, true) ;
                            debug('reaction', pgm + 'new obj_of_reaction.reaction_info = ' + JSON.stringify(obj_of_reaction.reaction_info)) ;
                            debug('reaction', pgm + 'new obj_of_reaction.reactions = ' + JSON.stringify(obj_of_reaction.reactions)) ;
                            // 3. update anonymous count?
                            if (old_private_group_reaction) {
                                debug('reaction', pgm + 'update anonymous count for old private reaction ' + old_reaction) ;
                                send_anonymous_count_msg(group_chat_contact, decrypted_message.timestamp, obj_of_reaction.reaction_info, old_reaction) ;
                                new_incoming_receipts++ ;
                            }
                        })() ;
                    }
                    else {
                        debug('reaction', pgm + 'no group chat message with timestamp ' + decrypted_message.timestamp + ' was found. Deleted group chat message?') ;
                    }
                }
                else if (decrypted_message.reaction_grp == 3) {
                    // 3) a private reaction to a group chat message
                    //decrypted_message = {
                    //    "msgtype": "reaction",
                    //    "timestamp": 1488191018452,
                    //    "reaction": "😃",
                    //    "reaction_at": 1488620937137,
                    //    "reaction_grp": 3,
                    //    "local_msg_seq": 4336,
                    //    "feedback": {"sent": [3993, 4231, 4255, 4257]}
                    //};
                    (function() {
                        var obj_of_reaction, i, group_chat_contact, j, message, old_reaction, new_reaction,
                            reaction_info, old_private_group_reaction, new_private_group_reaction,
                            js_messages_row, no_msg ;

                        // check count. Only allowed for anonymous group reactions
                        if (decrypted_message.hasOwnProperty('count')) {
                            debug('reaction', pgm + 'Warning. Ignoring private reaction with count. reaction group 3 is only used for private reactions. decrypted_message = ' + JSON.stringify(decrypted_message)) ;
                            return ;
                        }

                        // find object of reaction. Must be a group chat outbox message. sender of reaction must be a group chat member
                        for (i=0 ; i<ls_contacts.length ; i++) {
                            group_chat_contact = ls_contacts[i] ;
                            if (group_chat_contact.type != 'group') continue ;
                            if (group_chat_contact.participants.indexOf(unique_id) == -1) continue ;
                            for (j=0 ; j<group_chat_contact.messages.length ; j++) {
                                message = group_chat_contact.messages[j] ;
                                if (message.folder != 'outbox') continue ;
                                if (message.sent_at != decrypted_message.timestamp) continue ;
                                obj_of_reaction = message ;
                                break ;
                            } // for j (messages)
                            if (obj_of_reaction) break ;
                        } // for i (contacts)
                        if (!obj_of_reaction) {
                            debug('reaction', pgm + 'no group chat outbox message with timestamp ' + decrypted_message.timestamp + ' was found. Deleted group chat message?') ;
                            return ;
                        }
                        debug('reaction', pgm + 'obj_of_reaction = ' + JSON.stringify(obj_of_reaction)) ;

                        // update reaction_info for actual user unique_id.
                        // note special notification for private group reaction [emoji] in group chat
                        if (!obj_of_reaction.reaction_info) obj_of_reaction.reaction_info = { users: {}, emojis: {} } ;
                        reaction_info = obj_of_reaction.reaction_info ;
                        old_reaction = reaction_info.users[unique_id] ;
                        if (old_reaction && (typeof old_reaction == 'object')) {
                            old_private_group_reaction = true ;
                            old_reaction = old_reaction[0] ;
                        }
                        else old_private_group_reaction = false ;
                        new_reaction = decrypted_message.reaction ;
                        new_private_group_reaction = true ;
                        debug('reaction', pgm + 'reaction_info = ' + JSON.stringify(reaction_info) +
                            ', old reaction = ' + old_reaction + ', old_private_group_reaction = ' + old_private_group_reaction +
                            ', new reaction = ' + new_reaction + ', new_private_group_reaction = ' + new_private_group_reaction) ;
                        if ((old_reaction == new_reaction) && (old_private_group_reaction == new_private_group_reaction)) {
                            debug('reaction', pgm + 'no update. old reaction = new reaction in reaction_info.') ;
                            return ;
                        }
                        if (old_reaction && old_private_group_reaction) {
                            if (!reaction_info.emojis[old_reaction]) reaction_info.emojis[old_reaction] = 1 ;
                            reaction_info.emojis[old_reaction]-- ;
                            if (reaction_info.emojis[old_reaction] <= 0) delete reaction_info.emojis[old_reaction] ;
                            delete reaction_info.users[unique_id] ;
                        }
                        if (new_reaction) {
                            if (!reaction_info.emojis[new_reaction]) reaction_info.emojis[new_reaction] = 0 ;
                            reaction_info.emojis[new_reaction]++ ;
                            reaction_info.users[unique_id] = [new_reaction] ;
                        }
                        // 2: update message.reaction array
                        if (!obj_of_reaction.reactions) obj_of_reaction.reactions = [] ;
                        js_messages_row = get_message_by_seq(obj_of_reaction.seq) ;
                        check_private_reactions(js_messages_row, true) ;
                        debug('reaction', pgm + 'new obj_of_reaction.reaction_info = ' + JSON.stringify(obj_of_reaction.reaction_info)) ;
                        debug('reaction', pgm + 'new obj_of_reaction.reactions = ' + JSON.stringify(obj_of_reaction.reactions)) ;

                        // send message(s) with anonymous group chat reaction update(s)
                        no_msg = 0 ;
                        if (old_reaction == new_reaction) {
                            if (old_reaction && (old_private_group_reaction || new_private_group_reaction)) {
                                if (send_anonymous_count_msg(group_chat_contact, decrypted_message.timestamp, reaction_info, old_reaction)) no_msg++ ;
                            }
                        }
                        else {
                            if (old_reaction && old_private_group_reaction) if (send_anonymous_count_msg(group_chat_contact, decrypted_message.timestamp, reaction_info, old_reaction)) no_msg++;
                            if (new_reaction && new_private_group_reaction) if (send_anonymous_count_msg(group_chat_contact, decrypted_message.timestamp, reaction_info, new_reaction)) no_msg++;
                        }
                        if (no_msg > 0) {
                            debug('reaction', pgm + no_msg + ' anonymous reaction update message(s) was/were sent') ;
                            // 1-2 messages to send. trigger a z_update_1_data_json call after finished processing incoming messages
                            new_incoming_receipts++ ; // trigger an update z_update_1_data_json call
                        }

                    })() ;

                }
                else  {
                    // 4) a private reaction to a private chat message
                    //decrypted_message = {
                    //    "msgtype": "reaction",
                    //    "timestamp": 1488820598260,
                    //    "reaction_at": 1488820702199,
                    //    "reaction_grp": 4,
                    //    "local_msg_seq": 1988,
                    //    "feedback": {"sent": [1987]}
                    //};
                    (function() {
                        var obj_of_reaction, i, message, reaction_info, old_reaction, new_reaction, js_messages_row ;

                        // check count. Only allowed for anonymous group reactions
                        if (decrypted_message.hasOwnProperty('count')) {
                            debug('reaction', pgm + 'Warning. Ignoring private reaction with count. reaction group 3 is only used for private reactions. decrypted_message = ' + JSON.stringify(decrypted_message)) ;
                            return ;
                        }
                        if (['group', 'public'].indexOf(contact_or_group.type) != -1) {
                            debug('reaction', pgm + 'Warning. Ignoring private reaction for a ' + contact_or_group.type + ' contact. decrypted_message = ' + JSON.stringify(decrypted_message)) ;
                            return ;
                        }
                        for (i=0 ; i<contact_or_group.messages.length ; i++) {
                            message = contact_or_group.messages[i] ;
                            if (message.sent_at != decrypted_message.timestamp) continue ;
                            obj_of_reaction = message ;
                            break ;
                        } // for i

                        // find object or reaction. Must be a private chat message with this contact
                        if (!obj_of_reaction) {
                            debug('reaction', pgm + 'no chat message with timestamp ' + decrypted_message.timestamp + ' was found. Deleted chat message?') ;
                            return ;
                        }
                        debug('reaction', pgm + 'obj_of_reaction = ' + JSON.stringify(obj_of_reaction)) ;

                        if (!obj_of_reaction.reaction_info) obj_of_reaction.reaction_info = { users: {}, emojis: {} } ;
                        reaction_info = obj_of_reaction.reaction_info ;
                        old_reaction = reaction_info.users[unique_id] ;
                        if (old_reaction) old_reaction = old_reaction[0] ;
                        new_reaction = decrypted_message.reaction ;
                        debug('reaction', pgm + 'reaction_info = ' + JSON.stringify(reaction_info) +
                            ', old reaction = ' + old_reaction + ', new reaction = ' + new_reaction) ;
                        if (old_reaction == new_reaction) {
                            debug('reaction', pgm + 'no update. old reaction = new reaction in reaction_info.') ;
                            return ;
                        }
                        if (old_reaction) {
                            if (!reaction_info.emojis[old_reaction]) reaction_info.emojis[old_reaction] = 1 ;
                            reaction_info.emojis[old_reaction]-- ;
                            if (reaction_info.emojis[old_reaction] <= 0) delete reaction_info.emojis[old_reaction] ;
                        }
                        if (new_reaction) {
                            if (!reaction_info.emojis[new_reaction]) reaction_info.emojis[new_reaction] = 0 ;
                            reaction_info.emojis[new_reaction]++ ;
                            reaction_info.users[unique_id] = [new_reaction] ;
                        }
                        else delete reaction_info.users[unique_id] ;

                        // 2: update message.reaction array
                        if (!obj_of_reaction.reactions) obj_of_reaction.reactions = [] ;
                        js_messages_row = get_message_by_seq(obj_of_reaction.seq) ;
                        check_private_reactions(js_messages_row, true) ;
                        debug('reaction', pgm + 'new obj_of_reaction.reaction_info = ' + JSON.stringify(obj_of_reaction.reaction_info)) ;
                        debug('reaction', pgm + 'new obj_of_reaction.reactions = ' + JSON.stringify(obj_of_reaction.reactions)) ;

                    })() ;

                }

            } // if reaction

                // update chat notifications
            update_chat_notifications() ;

            // add more message post processing ...

            return true ;

        } // process_incoming_message


        // process incoming cryptMessage encrypted message
        // same parameters as process_incoming_message. will callback to process_incoming_message when finished decrypting message
        // sent_at parameter is only used when called from recheck_old_decrypt_errors
        function process_incoming_cryptmessage (res, unique_id, sent_at) {
            var pgm = service + '.process_incoming_cryptmessage : ' ;
            var cb, message_array, iv, encrypted, debug_seq0 ;
            debug('lost_message', pgm + 'sent_at = ' + sent_at) ;

            // callback to process_incoming_message when done
            cb = function () {
                // callback with error to process_incoming_message
                var contacts_updated = false ;
                // console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                if (process_incoming_message(res, unique_id, sent_at)) contacts_updated = true ;

                // same post processing as in event_file_done
                // any receipts to sent?
                if (new_outgoing_receipts.length > 0) {
                    // send receipts. will update localStorage and ZeroNet
                    new_incoming_receipts = 0 ;
                    send_new_receipts() ;
                }
                else if (new_incoming_receipts > 0) {
                    // remove chat messages with images from ZeroNet
                    contacts_updated = false ;
                    new_incoming_receipts = 0 ;
                    z_update_1_data_json(pgm, true) ; // true = publish
                    $rootScope.$apply() ;
                }
                else if (contacts_updated) {
                    $rootScope.$apply() ;
                    ls_save_contacts(false) ;
                }

                // any message with unknown unique id in incoming file?
                if (new_unknown_contacts.length > 0) create_new_unknown_contacts() ;

            } ; // cb

            message_array = res.message.split(',') ;
            iv = message_array[0] ;
            encrypted = message_array[1] ;
            // console.log(pgm + 'iv = ' + iv + ', encrypted = ' + encrypted) ;

            // console.log(pgm + "res.message_sha256 = " + res.message_sha256 + ", calling eciesDecrypt with " + JSON.stringify([res.key, user_id])) ;
            // debug_seq0 = MoneyNetworkHelper.debug_z_api_operation_start('z_crypt_message', pgm + ' eciesDecrypt') ;
            debug_seq0 = debug_z_api_operation_start(pgm, null, 'eciesDecrypt', show_debug('z_crypt_message')) ;
            ZeroFrame.cmd("eciesDecrypt", [res.key, z_cache.user_id], function(password) {
                var pgm = service + '.process_incoming_cryptmessage eciesDecrypt callback 1: ' ;
                var pubkey, mn_query_10, contact, i, message_with_envelope, message, debug_seq1 ;
                // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq0) ;
                debug_z_api_operation_end(debug_seq0, password ? 'OK' : 'Failed. No password') ;
                // console.log(pgm + 'password = ' + password) ;
                if (!password) {
                    // cryptMessage decrypt error!
                    debug('lost_message', pgm + 'password is null. must be mismatch between encryption in message and current private key.') ;

                    // issue #131 - Lost message - too many UI notifications
                    // check if there already has been created an UI notification for this decrypt error
                    contact = get_contact_by_unique_id(unique_id) ;
                    for (i=0 ; i<contact.messages.length ; i++) {
                        message_with_envelope = contact.messages[i] ;
                        if (message_with_envelope.folder != 'inbox') continue ;
                        message = message_with_envelope.message ;
                        if (message.msgtype != 'lost msg2') continue ;
                        if (message.message_sha256 != res.message_sha256) continue ;
                        debug('lost_message', pgm + 'Error. issue #131. There has already been created an UI notification for this decrypt error') ;
                        res.decrypted_message_str = 'error4' ;
                        cb() ;
                        return;
                    }

                    // check if user has been using other ZeroNet certificates
                    debug('lost_message', pgm + 'maybe user has switched zeronet certificate. checking if current user has more than one certificate') ;
                    pubkey = MoneyNetworkHelper.getItem('pubkey') ;
                    mn_query_10 =
                        "select keyvalue.value as cert_user_id, status.timestamp, users.encryption, users.guest " +
                        "from users, json as data_json, json as content_json, keyvalue, json as status_json, status " +
                        "where users.pubkey = '" + pubkey + "' " +
                        "and data_json.json_id = users.json_id " +
                        "and content_json.directory = data_json.directory " +
                        "and content_json.file_name = 'content.json' " +
                        "and keyvalue.json_id = content_json.json_id " +
                        "and keyvalue.key = 'cert_user_id' " +
                        "and keyvalue.value <> '" + ZeroFrame.site_info.cert_user_id + "' " +
                        "and status_json.directory = data_json.directory " +
                        "and status_json.file_name = 'status.json' " +
                        "and status.json_id = status_json.json_id " +
                        "and status.user_seq = users.user_seq" ;
                    debug('select', pgm + 'mn query 10 = ' + mn_query_10) ;
                    debug_seq1 = debug_z_api_operation_start(pgm, 'mn query 10', 'dbQuery', show_debug('z_db_query')) ;
                    ZeroFrame.cmd("dbQuery", [mn_query_10], function (res2) {
                        var pgm = service + '.process_incoming_cryptmessage dbQuery callback 1: ';
                        var cert_user_ids, i, lost_message, error, local_msg_seq, lost_message_with_envelope, contact ;
                        debug_z_api_operation_end(debug_seq1, format_q_res(res2)) ;
                        if (res2.error) {
                            console.log(pgm + "certificate check failed: " + res2.error) ;
                            console.log(pgm + 'mn query 10 = ' + mn_query_10) ;
                            res.decrypted_message_str = 'error2' ;
                            cb() ;
                            return;
                        }
                        if (res2.length == 0) {
                            // something is wrong. got cryptMessage decrypt error but found only one user certificate
                            console.log(
                                pgm + 'password is null. must be mismatch between encryption in message and current private key. ' +
                                'but no other certificates were found with identical localStorage user');
                            res.decrypted_message_str = 'error3' ;
                            cb() ;
                            return;
                        }

                        // OK. User has being using other ZeroNet certificates. Should create a lost message in UI and return feedback info in next outgoing message to contact
                        // list other certificates
                        cert_user_ids = [] ;
                        for (i=0 ; i<res2.length ; i++) cert_user_ids.push(res2[i].cert_user_id) ;
                        console.log(pgm + 'decrypt failed for ingoing message but that is ok. current user have more than one ZeroNet certificate and message was encrypted to a previous used certificate');
                        console.log(pgm + 'message = ' + JSON.stringify(res)) ;
                        console.log(pgm + 'current cert_user_id = ' + ZeroFrame.site_info.cert_user_id) ;
                        console.log(pgm + 'other cert_user_ids  = ' + cert_user_ids.join(', ')) ;

                        // create lost msg2 notification
                        lost_message = {
                            msgtype: 'lost msg2',
                            message_sha256: res.message_sha256,
                            cert_user_ids: cert_user_ids,
                            unique_id: unique_id,
                            res: res
                        } ;
                        // validate json
                        error = MoneyNetworkHelper.validate_json(pgm, lost_message, lost_message.msgtype, 'Cannot insert dummy lost inbox message in UI. message_sha256 = ' + res.message_sha256);
                        if (error) {
                            console.log(pgm + error + ', lost_message = ' + JSON.stringify(lost_message)) ;
                        }
                        else {
                            // insert into inbox
                            local_msg_seq = next_local_msg_seq() ;
                            lost_message_with_envelope = {
                                local_msg_seq: local_msg_seq,
                                folder: 'inbox',
                                message: lost_message,
                                sent_at: res.timestamp,
                                received_at: new Date().getTime(),
                                zeronet_msg_id: res.message_sha256 // issue 131 - added zeronet_msg_id to lost msg2 notifications
                            } ;
                            lost_message_with_envelope.ls_msg_size = JSON.stringify(lost_message_with_envelope).length ;
                            contact = get_contact_by_unique_id(unique_id) ;
                            add_message(contact, lost_message_with_envelope) ;
                            console.log(pgm + 'created lost inbox message in the UI. lost_message_with_envelope = ' + JSON.stringify(lost_message_with_envelope)) ;
                        }

                        res.decrypted_message_str = 'changed cert error' ;
                        cb() ;

                    }); // dbQuery callback

                    // stop. dbQuery callback will callback to process_incoming_message
                    return;

                } // if !password

                // decrypt step 2 - password OK - decrypt message
                console.log(pgm + "res.message_sha256 = " + res.message_sha256 + ", calling aesDecrypt with " + JSON.stringify([iv, encrypted, password]));
                // debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_crypt_message', pgm + ' aesDecrypt') ;
                debug_seq1 = debug_z_api_operation_start(pgm, null, 'aesDecrypt', show_debug('z_crypt_message')) ;
                ZeroFrame.cmd("aesDecrypt", [iv, encrypted, password], function (decrypted_message_str) {
                    var pgm = service + '.process_incoming_cryptmessage aesDecrypt callback 2: ' ;
                    var decrypted_message, contact, image_path, query ;
                    // console.log(pgm + 'decrypted_message_str = ' + decrypted_message_str);
                    // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                    debug_z_api_operation_end(debug_seq1, null) ;
                    try {
                        decrypted_message = JSON.parse(decrypted_message_str) ;
                    }
                    catch (e) {
                        res.decrypted_message_password = 'error5' ;
                        return cb() ;
                    }
                    if (sent_at) {
                        // process_incoming_message was called from recheck_old_decrypt_errors
                        // user has log out, changed ZeroNet cert, logged in again and no longer decrypt error
                        // adding message_sha256 and sent_at to message so that lost msg2 cleanup in process_incoming_message will work
                        decrypted_message.sent_at = sent_at ;
                        decrypted_message.message_sha256 = res.message_sha256 ;
                        decrypted_message_str = JSON.stringify(decrypted_message) ;
                    }


                    // done. save decrypted message and return to process_incoming_message
                    res.decrypted_message_str = decrypted_message_str ;
                    if (decrypted_message.image == true) {
                        // attached -image.json file is read and decrypted in process_incoming_message.
                        res.decrypted_message_password = password ;
                    }
                    cb() ;

                });  // aesDecrypt callback 2

            }); // eciesDecrypt callback 1

        } // process_crypt_message


        // from processing new incoming messages. Any receipts to send. for example used for chat messages with image attachments.
        function send_new_receipts () {
            var pgm = service + '.send_new_receipts: ' ;
            if (new_outgoing_receipts.length == 0) return ;
            for (var i=0 ; i<new_outgoing_receipts.length ; i++) add_msg(new_outgoing_receipts[i].contact,new_outgoing_receipts[i].message) ;
            new_outgoing_receipts.splice(0, new_outgoing_receipts.length) ;
            z_update_1_data_json('send_new_receipts');
        } // send_new_receipts


        // create contacts with unknown unique id in incoming messages
        // contact not in my search results but I am in other users search result
        function create_new_unknown_contacts() {
            var pgm = service + '.create_unknown_contacts: ' ;
            var auth_address, expected_auth_addresses = [], unique_id, expected_unique_ids = [], debug_seq, old_userid ;
            old_userid = z_cache.user_id ;
            if (new_unknown_contacts.length == 0) return ;
            console.log(pgm + 'new_unknown_contacts = ' + JSON.stringify(new_unknown_contacts));
            if (detected_client_log_out(pgm, old_userid)) return ;
            //new_unknown_contacts = [{
            //    "res": {
            //        "user_seq": 1,
            //        "receiver_sha256": "0d23d65c879b820976acabbbbca826d06d30ef7bccd26e0871f02e3049fcad99",
            //        "key": "a4WHcpI+xRS04110Cn9V77q3hCszsib/ymujriYLz5QWTf6eFH2LvMd0uDHTJ33jta/m+L3NnyCne2HPEf5hZu/LV/UsuGWHD/R0Ul2oyZp9DEpRdk94OtOA5kh7czQXX4Q0frki9CZeZInCBsEKGXsrcbPYhw/EMlo8ukk2W6qnhzUb85eRDloJZ8gtGND1CzTURDeOPecrk6xwjm1cE5aIrG/ZaLO04F5Lu5R871+1b4dFIeGJh4bHUifsFaardEYLSCU6owheEoYi30DywLf9GPVgnNwWTTd9c1FHaD85f1Lf6C4DaRWPXprpy6vmZbbRYvNCiMxn/I78J75aYA==",
            //        "message": "U2FsdGVkX1/ZQsUBu1U0C+xlIlQ8cOV4R9jHoJed9Wz3cAYYJhYhjplUlm1B3160j9ZpYXWdJOQhECapGrec8CBzCwVzhzF5pMXqlvgicTqM0JndV3/GwwVP8/ZhEKIKJ9EGyQ4E6U/qF9hDpaI7v2bEyFFmlq/vnF2/53CKwb0M5p5sU8D7q5XU/u+NPvQlmPmANXHJpIur5NIAo9LIaXBtj9YGtoPmCq5yf83bDqOt6mv2q0GGQsqjfIypnRVUo1Pb5h/aLdwbDshJyLVyoQjdYq/StM94XWeOHDI85II=",
            //        "message_sha256": "43c9110d9894bb72200c9a83902554fd4312d80b33930854e5f00e9e4f6a3af3",
            //        "timestamp": 1477658606417
            //    }, "unique_id": "f6c38cdbd1efa33783471a7186ebd21ef3afbc666955823da4275afc0474463c"
            //}, {
            //    "res": {
            //        "user_seq": 1,
            //        "receiver_sha256": "0d23d65c879b820976acabbbbca826d06d30ef7bccd26e0871f02e3049fcad99",
            //        "key": "JgJVw2TNnnP/IF4dDCV6IbjAu1pUbWlbFUoCrB2YA83+hu3UOp3dwBwvPB9cmMPZWwtHE8FO+UiUiW3KSo7dakD0lyjdLzJr6NPwXlHz5ieumjQN45InvAxHfnHW/sBc4D/eJ7NwnnIuN/AoObiqHYXBs3SDruuY1jWsLTuNP9vaUKN2FIlsF4X58Xd1SI98Yr23B5f/lgIsbB7uZU8tcCa702HXgxA06DQfuT7LDUouhHJA804ThvH8LM962DN30JRxrvuM+UmC1P/zjuswbTE5tEFJS5aLR8IR/dQhjXclyTTihNYrDAzCrN4mFSZsLYGCc5B/ZIZOyjSrTJpbHA==",
            //        "message": "U2FsdGVkX1+QxmDHjCpOLcyo0ALiUqQxamrEM5KgLIwO13a1im6POMsWRTJSL1Ik6V17nSrNjo2AsuzrKmQ8yCpWOzgmepnaLdK8NP6OTH4/3ueCHObAj/hPZWJK4juM/FNXUmuCE/8/BspI0p6+HYcuMhIeayqZzm09yDlX61+P2i7z7UR9PTHGjTtHYqVgfTGla4D7HuAEFeDOdeoy6Q==",
            //        "message_sha256": "adbb1889d998f2becdb4a0fe0c0dc35cb767e8322ccb0a23aae2e513d1f890b3",
            //        "timestamp": 1477658594123
            //    }, "unique_id": "f6c38cdbd1efa33783471a7186ebd21ef3afbc666955823da4275afc0474463c"
            //}];
            for (var i=0 ; i<new_unknown_contacts.length ; i++) {
                auth_address = new_unknown_contacts[i].res.auth_address ;
                if (!auth_address) {
                    console.log(pgm + 'Error. No auth_address in ' + JSON.stringify(new_unknown_contacts[i].res));
                    continue ;
                }
                if (expected_auth_addresses.indexOf(auth_address) == -1) expected_auth_addresses.push(auth_address) ;
                unique_id = new_unknown_contacts[i].unique_id ;
                if (expected_unique_ids.indexOf(unique_id) == -1) expected_unique_ids.push(unique_id) ;
            }
            if (expected_auth_addresses.length == 0) {
                console.log(pgm + 'Error. No auth_addresses were found in new_unknown_contacts array');
                new_unknown_contacts.splice(0,new_unknown_contacts.length);
                return ;
            }

            // old query with status in main where clause. will not work if data.json files arrives before status.json file
            //// build query for contact information.
            //// auth_address is used is where condition and select will sometimes return more than one user for each auth_address
            //// only users with correct unique_id are relevant
            //var contacts_query =
            //    "select" +
            //    "  users.user_seq, users.pubkey, users.avatar as users_avatar," +
            //    "  data_json.directory,  substr(data_json.directory, 7) as auth_address, data_json.json_id as data_json_id," +
            //    "  content_json.json_id as content_json_id," +
            //    "  keyvalue.value as cert_user_id," +
            //    "  (select substr(files.filename,8)" +
            //    "   from files, json as avatar_json " +
            //    "   where files.filename like 'avatar%'" +
            //    "   and avatar_json.json_id = files.json_id" +
            //    "   and avatar_json.directory = data_json.directory) as files_avatar, " +
            //    "  status.timestamp " +
            //    "from users, json as data_json, json as content_json, keyvalue as keyvalue, json as status_json, status " +
            //    "where data_json.json_id = users.json_id " +
            //    "and substr(data_json.directory, 7) in " ;
            //for (i=0 ; i<expected_auth_addresses.length ; i++) {
            //    if (i==0) contacts_query = contacts_query + '(' ;
            //    else contacts_query = contacts_query + ', ' ;
            //    contacts_query = contacts_query + "'" + expected_auth_addresses[i] + "'" ;
            //} // for i
            //contacts_query = contacts_query + ") " +
            //    "and content_json.directory = data_json.directory " +
            //    "and content_json.file_name = 'content.json' " +
            //    "and keyvalue.json_id = content_json.json_id " +
            //    "and keyvalue.key = 'cert_user_id' " +
            //    "and status_json.directory = data_json.directory " +
            //    "and status_json.file_name = 'status.json' " +
            //    "and status.json_id = status_json.json_id " +
            //    "and status.user_seq = users.user_seq" ;
            //debug('select', pgm + 'contacts_query = ' + contacts_query) ;

            // build query for contact information.
            // auth_address is used is where condition and select will sometimes return more than one user for each auth_address
            // only users with correct unique_id are relevant
            // timestamp from status table will be missing if data.json file is received before status.json file
            var mn_query_11 =
                "select" +
                "  users.user_seq, users.pubkey, users.avatar as users_avatar," +
                "  data_json.directory, substr(data_json.directory," +
                "  instr(data_json.directory,'/data/users/')+12) as auth_address, data_json.json_id as data_json_id," +
                "  content_json.json_id as content_json_id," +
                "  keyvalue.value as cert_user_id," +
                "  (select substr(files.filename,8)" +
                "   from files, json as avatar_json " +
                "   where files.filename like 'avatar%'" +
                "   and avatar_json.json_id = files.json_id" +
                "   and avatar_json.directory = data_json.directory) as files_avatar, " +
                "  (select status.timestamp" +
                "   from json as status_json, status as status" +
                "   where status_json.directory = data_json.directory" +
                "   and status_json.file_name = 'status.json'" +
                "   and status.json_id = status_json.json_id" +
                "   and status.user_seq = users.user_seq) as timestamp " +
                "from users, json as data_json, json as content_json, keyvalue as keyvalue " +
                "where data_json.json_id = users.json_id " +
                "and substr(data_json.directory, instr(data_json.directory,'/data/users/')+12) in " ;
            for (i=0 ; i<expected_auth_addresses.length ; i++) {
                if (i==0) mn_query_11 = mn_query_11 + '(' ;
                else mn_query_11 = mn_query_11 + ', ' ;
                mn_query_11 = mn_query_11 + "'" + expected_auth_addresses[i] + "'" ;
            } // for i
            mn_query_11 = mn_query_11 + ") " +
                "and content_json.directory = data_json.directory " +
                "and content_json.file_name = 'content.json' " +
                "and keyvalue.json_id = content_json.json_id " +
                "and keyvalue.key = 'cert_user_id'" ;
            debug('select', pgm + 'mn query 11 = ' + mn_query_11) ;
            debug_seq = debug_z_api_operation_start(pgm, 'mn query 11', 'dbQuery', show_debug('z_db_query')) ;
            ZeroFrame.cmd("dbQuery", [mn_query_11], function (res) {
                var pgm = service  + '.create_unknown_contacts dbQuery callback: ';
                var found_auth_addresses = [], i, unique_id, new_contact, public_avatars, index, j, last_updated ;
                debug_z_api_operation_end(debug_seq, format_q_res(res)) ;
                if (detected_client_log_out(pgm, old_userid)) return ;
                // console.log(pgm + 'res = ' + JSON.stringify(res));
                if (res.error) {
                    ZeroFrame.cmd("wrapperNotification", ["error", "Search for new unknown contacts failed: " + res.error, 5000]);
                    console.log(pgm + "Search for new contacts failed: " + res.error) ;
                    console.log(pgm + 'mn query 11 = ' + mn_query_11) ;
                    new_unknown_contacts.splice(0,new_unknown_contacts.length);
                    return;
                }
                // drop contacts with other unique ids (multiple users with identical cert_user_id / auth_address)
                for (i=res.length-1 ; i >= 0 ; i--) {
                    unique_id = CryptoJS.SHA256(res[i].auth_address + '/'  + res[i].pubkey).toString();
                    if (expected_unique_ids.indexOf(unique_id) == -1) res.splice(i,1);
                }
                if (res.length == 0) {
                    ZeroFrame.cmd("wrapperNotification", ["error", "Search for new unknown contacts failed. No contacts were found", 5000]);
                    new_unknown_contacts.splice(0,new_unknown_contacts.length);
                    console.log(pgm + "Search for new unknown contacts failed. No contacts were found") ;
                    console.log(pgm + 'contacts_query = ' + mn_query_11) ;
                    return;
                }

                // create contacts and processed messages
                for (i=0 ; i<res.length ; i++) {
                    found_auth_addresses.push(res[i].auth_address);
                    // create new contact
                    unique_id = CryptoJS.SHA256(res[i].auth_address + '/'  + res[i].pubkey).toString();
                    last_updated = Math.round(res[i].timestamp / 1000);
                    new_contact = {
                        unique_id: unique_id,
                        type: 'new',
                        auth_address: res[i].auth_address,
                        cert_user_id: res[i].cert_user_id,
                        avatar: res[i].avatar,
                        pubkey: res[i].pubkey,
                        search: [{ tag: 'Online', value: last_updated, privacy: 'Search', row: 1}],
                        messages: [],
                        outbox_sender_sha256: {},
                        inbox_zeronet_msg_id: [],
                        inbox_last_sender_sha256: null,
                        inbox_last_sender_sha256_at: 0
                    };
                    if (!new_contact.avatar) {
                        // assign random avatar
                        if (!public_avatars) public_avatars = MoneyNetworkHelper.get_public_avatars();
                        if (public_avatars.length == 0) {
                            console.log(pgm + 'Error. Public avatars array are not ready. Using 1.png as avatar') ;
                            new_contact.avatar = '1.png' ;
                        }
                        else {
                            index = Math.floor(Math.random() * (public_avatars.length-1)); // avatarz.png is used for public contact
                            new_contact.avatar = public_avatars[index] ;
                        }
                    }
                    add_contact(new_contact) ;
                    // console.log(pgm + 'new_contact = ' + JSON.stringify(new_contact));

                    // process message(s)
                    for (j=0 ; j<new_unknown_contacts.length ; j++) {
                        if (unique_id == new_unknown_contacts[j].unique_id) {
                            process_incoming_message(new_unknown_contacts[j].res, new_unknown_contacts[j].unique_id);
                        }
                    } // for j
                } // for i
                new_unknown_contacts.splice(0, new_unknown_contacts.length);

                if (found_auth_addresses.length != expected_auth_addresses.length) {
                    ZeroFrame.cmd("wrapperNotification", ["error", "Search for new unknown contacts failed. Expected " + expected_auth_addresses.length + " contacts. Found " + res.length + " contacts", 5000]);
                    console.log(pgm + "Search for new unknown contacts failed. Expected " + expected_auth_addresses.length + " contacts. Found " + res.length + " contacts");
                    console.log(pgm + 'contacts_query = ' + mn_query_11) ;
                }

                // any receipts to sent?
                if (new_outgoing_receipts.length > 0) {
                    // send receipts. will update localStorage and ZeroNet
                    send_new_receipts() ;
                }
                else {
                    // save new contacts and messages in localStorage
                    ls_save_contacts(false);
                }
                // refresh angular JS with new messages
                $rootScope.$apply() ;

            }); // end dbQuery callback

        } // create_unknown_contacts


        // lookup any reactions for message in chat page. called once for each displayed message in chat page
        var watch_like_msg_id = {} ; // msg_id "<timestamp>,<auth>" => js_messages_row
        var watch_like_json = {} ; // auth_address => array with msg id "<timestamp>,<auth>"

        // lookup reactions for public chat. all information is in like table (like.json files)
        function check_public_reactions (js_messages_row) {
            var pgm = service + '.check_public_reactions: ' ;
            var message_with_envelope, contact, auth, participant, unique_id, timestamp, mn_query_12, msg_id, debug_seq ;

            message_with_envelope = js_messages_row.message ;
            contact = js_messages_row.contact ;
            if (!contact) debug('reaction', pgm + 'error. js_messages_row = ' + JSON.stringify(js_messages_row)) ;

            // 1 - lookup reactions in like.json table (anonymous and non anonymous reactions).
            // index is sent_at timestamp + first 4 characters of contacts auth address
            timestamp = message_with_envelope.sent_at ;
            if (!timestamp) {
                debug('reaction', pgm + 'cannot check reactions. sent_at timestamp is missing. message_with_envelope = ' + JSON.stringify(message_with_envelope));
                return ;
            }
            if (message_with_envelope.folder == 'outbox') auth = ZeroFrame.site_info.auth_address.substr(0,4) ;
            else if (contact.type != 'group') {
                if (!contact.auth_address) {
                    debug('reaction', pgm + 'error? ignoring contact without auth_address. contact = ' + JSON.stringify(contact)) ;
                    return ;
                }
                auth = contact.auth_address.substr(0,4) ;
            }
            else {
                // group chat. find sender/creator of group chat message
                participant = message_with_envelope.participant ;
                unique_id = contact.participants[participant-1] ;
                contact = get_contact_by_unique_id(unique_id) ;
                if (!contact) {
                    // deleted contact
                    debug('reaction', pgm + 'group chat. contact with unique id ' + unique_id + ' was not found. ' +
                        'message_with_envelope.participant = ' + message_with_envelope.participant +
                        ', contact.participants = ' + JSON.stringify(contact.participants)); ;
                    return ;
                }
                if (!contact.auth_address) {
                    debug('reaction', pgm + 'error? ignoring contact without auth_address. contact = ' + JSON.stringify(contact)) ;
                    return ;
                }
                auth = contact.auth_address.substr(0,4) ;
            }

            // add message to watch_like_msg. monitor incoming like.json files for this message id
            msg_id = timestamp + ',' + auth ;
            watch_like_msg_id[msg_id] = js_messages_row ;

            // ready for emoji lookup in like table
            mn_query_12 =
                "select"+
                "   substr(data_json.directory, instr(data_json.directory,'/data/users/')+12) as auth_address," +
                "   users.pubkey, like.emoji, like.count " +
                "from like, json as like_json, json as data_json, users " +
                "where like.timestamp = " + timestamp + " " +
                "and like.auth = '" + auth + "' " +
                "and like_json.json_id = like.json_id " +
                "and data_json.directory = like_json.directory " +
                "and data_json.file_name = 'data.json' " +
                "and users.json_id = data_json.json_id " +
                "and users.user_seq = like.user_seq" ;
            debug('select', pgm + 'mn query 12 = ' + mn_query_12) ;
            // debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 12') ;
            debug_seq = debug_z_api_operation_start(pgm, 'mn query 12', 'dbQuery', show_debug('z_db_query')) ;
            ZeroFrame.cmd("dbQuery", [mn_query_12], function(res) {
                var pgm = service + '.check_public_reactions dbQuery callback: ';
                var emoji_folder, user_reactions, i, title, unicode, j, sum, count, emoji ;
                // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                debug_z_api_operation_end(debug_seq, format_q_res(res)) ;
                if (res.error) {
                    console.log(pgm + "Search for reactions failed: " + res.error);
                    console.log(pgm + 'mn query 12 = ' + mn_query_12);
                    return;
                }
                message_with_envelope.reaction_info = res ;
                if ((res.length == 0) && (message_with_envelope.reactions.length == 0)) return ;
                if (message_with_envelope.reactions.length) message_with_envelope.reactions.splice(0,message_with_envelope.reactions.length) ;
                debug('reaction', pgm + 'timestamp = ' + timestamp + ', auth = ' + auth + ', res = ' + JSON.stringify(res));

                // sum for each emoji and update watch_like_json
                count = {} ;
                for (i=0 ; i<res.length ; i++) {
                    emoji = res[i].emoji ;
                    if (!is_emoji[emoji]) {
                        debug('reaction', pgm + 'ignoring unknown emoji ' + emoji) ;
                        continue ;
                    }
                    if (!count[emoji]) count[emoji] = 0 ;
                    count[emoji] += (res[i].count || 1) ;
                    if (!watch_like_json[res[i].auth_address]) watch_like_json[res[i].auth_address] = [] ;
                    if (watch_like_json[res[i].auth_address].indexOf(msg_id) == -1) watch_like_json[res[i].auth_address].push(msg_id) ;
                }

                emoji_folder = get_emoji_folder() ;
                user_reactions = get_user_reactions() ;
                sum = 0 ;
                for (emoji in count) {
                    title = is_emoji[emoji] ;
                    unicode = symbol_to_unicode(emoji) ;
                    for (j=0 ; j<user_reactions.length ; j++) if (user_reactions[j].unicode == unicode) title = user_reactions[j].title ;
                    message_with_envelope.reactions.push({
                        unicode: unicode,
                        title: title,
                        src: emoji_folder + '/' + unicode + '.png',
                        count: count[emoji]
                    }) ;
                    sum += count[emoji] ;
                } // for i (res)
                debug('reaction', pgm + 'sum = ' + sum + ', message.reactions = ' + JSON.stringify(message_with_envelope.reactions));
                $rootScope.$apply() ;
            }) ; // dbQuery callback
        } // check_public_reactions

        // loopup reactions for group and private chat.
        // simple reactions array update. all information should already be in message_with_envelope.reaction_info hash
        function check_private_reactions (js_messages_row, skip_apply) {
            var pgm = service + '.check_private_reactions: ' ;
            var message_with_envelope, emojis, emoji_folder, user_reactions, emoji, title, unicode, sum, j, users,
                unique_id, fixed_old_error, my_unique_id, my_private_inbox_reaction ;
            message_with_envelope = js_messages_row.message ;
            message_with_envelope.reactions.splice(0,message_with_envelope.reactions.length) ;
            if (!message_with_envelope.reaction_info) return ;
            emojis = message_with_envelope.reaction_info.emojis ;
            users = message_with_envelope.reaction_info.users ;
            emoji_folder = get_emoji_folder() ;
            user_reactions = get_user_reactions() ;
            sum = 0 ;
            fixed_old_error = false ;
            //reaction_info = {
            //    "users": {"3d9fa732880ab3071c40f4982fccdd5ccc6803c9f37c5bd14d5922555c68103a": ["😃"]},
            //    "emojis": {"😃": 1},
            //    "reaction_at": null,
            //    "anonymous": {"😃": 1, "❤": 0}
            //};
            // todo: delete - my_private_inbox_reaction is not used for anything ...
            if ((js_messages_row.contact.type == 'group') && (message_with_envelope.folder == 'inbox')) {
                // check for private reaction to group chat inbox messages.
                // reaction is both in users hash and in anonymous hash.
                my_unique_id = get_my_unique_id() ;
                my_private_inbox_reaction = users[my_unique_id] ;
                if (my_private_inbox_reaction) {
                    if (typeof my_private_inbox_reaction == 'string') my_private_inbox_reaction = null ;
                    else if (typeof my_private_inbox_reaction == 'object') my_private_inbox_reaction = my_private_inbox_reaction[0] ;
                }
                debug('reaction', pgm + 'sent_at = ' + message_with_envelope.sent_at + ', my_private_inbox_reaction = ' + my_private_inbox_reaction) ;
            }
            for (emoji in emojis) {
                if (!emojis[emoji]) {
                    fixed_old_error = true ;
                    debug('reaction', pgm + 'fixing old error in reaction info. reaction_info = ' + JSON.stringify(message_with_envelope.reaction_info));
                    emojis[emoji] = 0 ;
                    for (unique_id in users) {
                        if (typeof users[unique_id] == 'string') {
                            if (users[unique_id] == emoji) emojis[emoji]++ ;
                        }
                        else {
                            // special syntax for private group chat reactions [emoji]
                            if (users[unique_id][0] == emoji) emojis[emoji]++ ;
                        }
                    }
                    if (message_with_envelope.reaction_info.anonymous && message_with_envelope.reaction_info.anonymous[emoji]) emojis[emoji] += message_with_envelope.reaction_info.anonymous[emoji] ;
                    if (emojis[emoji] == 0) continue ;
                }
                title = is_emoji[emoji] ;
                unicode = symbol_to_unicode(emoji) ;
                for (j=0 ; j<user_reactions.length ; j++) if (user_reactions[j].unicode == unicode) title = user_reactions[j].title ;
                message_with_envelope.reactions.push({
                    unicode: unicode,
                    title: title,
                    src: emoji_folder + '/' + unicode + '.png',
                    count: emojis[emoji]
                }) ;
                sum += emojis[emoji] ;
            } // for i (res)
            if (fixed_old_error) for (emoji in emojis) if (emojis[emoji] == 0) delete emojis[emoji] ;
            debug('reaction', pgm + 'sent_at = ' + message_with_envelope.sent_at + ', sum = ' + sum +
                ', message.reactions = ' + JSON.stringify(message_with_envelope.reactions) +
                ', message_with_envelope.reaction_info = ' + JSON.stringify(message_with_envelope.reaction_info));
            if (!skip_apply) $rootScope.$apply() ;
        } // check_private_reactions

        function check_reactions (js_messages_row) {
            if (js_messages_row.message.z_filename) check_public_reactions(js_messages_row) ;
            else check_private_reactions(js_messages_row) ;
        } // check_reactions
        moneyNetworkZService.inject_functions({check_reactions: check_reactions}) ;

        // after login - check for new ingoing messages since last login
        var watch_receiver_sha256 = moneyNetworkZService.get_watch_receiver_sha256() ; // listen for sha256 addresses
        var ignore_zeronet_msg_id = {} ; // ignore already read messages. hash auth_address => [ sha256 addresses ]
        function local_storage_read_messages () {
            var pgm = service + '.local_storage_read_messages: ' ;

            // initialize watch_sender_sha256 array with relevant sender_sha256 addresses
            // that is sha256(pubkey) + any secret sender_sha256 reply addresses sent to contacts in money network
            var my_pubkey, my_pubkey_sha256, my_prvkey, i, j, contact, auth_address, reason, message, key ;
            var participant_unique_id, participant, now, debug_seq, old_userid ;
            old_userid = z_cache.user_id ;
            my_pubkey = MoneyNetworkHelper.getItem('pubkey') ;
            my_pubkey_sha256 = CryptoJS.SHA256(my_pubkey).toString();
            // my_auth_address = ZeroFrame.site_info.auth_address ;
            now = new Date().getTime() ;

            // after login. initialize arrays with watch and ignore sha256 lists
            watch_receiver_sha256.splice(0, watch_receiver_sha256.length);
            for (auth_address in ignore_zeronet_msg_id) delete ignore_zeronet_msg_id[auth_address] ;
            watch_receiver_sha256.push(my_pubkey_sha256);
            debug('lost_message', pgm + 'watching messages for sha256(pubkey). my_pubkey_sha256 = ' + my_pubkey_sha256);

            for (i = 0; i < ls_contacts.length; i++) {
                contact = ls_contacts[i];
                auth_address = contact.auth_address ;
                // if (auth_address == '1Hp8QCbsF5Ek3BwoitTKSf9PhXNsupFsGw') console.log(pgm + 'contact = ' + stringify(contact)) ;
                if (contact.type == 'group') {
                    // console.log(pgm + 'listening to group chat address ' + CryptoJS.SHA256(contact.password).toString()) ;
                    watch_receiver_sha256.push(CryptoJS.SHA256(contact.password).toString()) ;
                }
                if (!contact.messages) contact.messages = [];
                for (j = 0; j < contact.messages.length; j++) {
                    message = contact.messages[j];
                    if (message.folder == 'inbox') {
                        // ignore already read messages
                        // if (message.message.msgtype == 'received') console.log(pgm + 'message = ' + JSON.stringify(message)) ;
                        if (message.zeronet_msg_id) {
                            if (contact.type == 'group') {
                                // no auth_address for group contacts. get auth_address from participant (sender of this message)
                                auth_address = null ; reason = 'No message.participant' ;
                                if (message.participant) { participant_unique_id = contact.participants[message.participant-1] ; reason = 'No participant_unique_id' }
                                if (participant_unique_id) { participant = get_contact_by_unique_id(participant_unique_id) ; reason = 'Participant was not found' }
                                if (participant) { auth_address = participant.auth_address ; reason = 'No auth_address for participant' }
                                if (!auth_address && (reason != 'Participant was not found')) {
                                    console.log(pgm + 'could not find sender/auth_address for group inbox message. ' + reason + '. Message = ' + JSON.stringify(message)) ;
                                }
                            }
                            if (auth_address) {
                                if (!ignore_zeronet_msg_id[auth_address]) ignore_zeronet_msg_id[auth_address] = [] ;
                                if (ignore_zeronet_msg_id[auth_address].indexOf(message.zeronet_msg_id) != -1) {
                                    // problem with doublet contacts. maybe also problem with doublet messages ....
                                    console.log(pgm + 'Error. Message with sha256 ' + message.zeronet_msg_id + ' found more than one in inbox');
                                    // skip some testcase error messages
                                    // Message with sha256 ecc6b46bf37d739d8075ce3cc03fa0a93e92c0724a1cf7a36ddea441085f0de8 found more than one in inbox
                                    // Message with sha256 e09422c12e377cab678ffc266e98788ef942549c05724fbe29a6d6e59162dde3 found more than one in inbox
                                    if (['ecc6b46bf37d739d8075ce3cc03fa0a93e92c0724a1cf7a36ddea441085f0de8',
                                            'e09422c12e377cab678ffc266e98788ef942549c05724fbe29a6d6e59162dde3'].indexOf(message.zeronet_msg_id) == -1) {
                                        console.log(pgm + 'contact = ' + JSON.stringify(contact));
                                    }
                                }
                                else ignore_zeronet_msg_id[auth_address].push(message.zeronet_msg_id);
                            }
                        }
                    }
                    if (message.folder == 'outbox') {
                        //// ignore my outbox group chat messages. do not process as new ingoing messages
                        //if ((message.zeronet_msg_id) && (contact.folder == 'group')) {
                        //    if (!ignore_zeronet_msg_id[my_auth_address]) ignore_zeronet_msg_id[my_auth_address] ;
                        //    if (ignore_zeronet_msg_id[my_auth_address].indexOf(message.zeronet_msg_id) != -1) {
                        //        // problem with doublet contacts. maybe also problem with doublet messages ....
                        //        console.log(pgm + 'Error. Message with sha256 ' + message.zeronet_msg_id + ' found more than one in inbox');
                        //        console.log(pgm + 'contact = ' + JSON.stringify(contact));
                        //    }
                        //    else ignore_zeronet_msg_id[my_auth_address].push(message.zeronet_msg_id);
                        //    console.log(pgm + 'ignore_zeronet_msg_id[my_auth_address] = ' + JSON.stringify(ignore_zeronet_msg_id[my_auth_address]));
                        //}
                        // check sender_sha256 addresses send to other contacts
                        if (!message.sender_sha256) continue;
                        if (watch_receiver_sha256.indexOf(message.sender_sha256) == -1) watch_receiver_sha256.push(message.sender_sha256);
                    }
                } // j (messages)
                // check hash with sender_sha256 addresses. sender_sha256 from deleted outgoing messages
                if (!contact.hasOwnProperty('outbox_sender_sha256')) continue ;
                for (key in contact.outbox_sender_sha256) {
                    if (watch_receiver_sha256.indexOf(key) == -1) watch_receiver_sha256.push(key) ;
                }
                // check array with zeronet_msg_id from deleted inbox messages.
                if (contact.inbox_zeronet_msg_id && (contact.inbox_zeronet_msg_id.length > 0)) {
                    if (!ignore_zeronet_msg_id[auth_address]) ignore_zeronet_msg_id[auth_address] = [];
                    for (j=0 ; j<contact.inbox_zeronet_msg_id.length ; j++) ignore_zeronet_msg_id[auth_address].push(contact.inbox_zeronet_msg_id[j]) ;
                }
            } // i (contacts)

            // add sender_sha256 addresses from deleted contacts (deleted outbox messages) to watch list
            for (key in ls_contacts_deleted_sha256) {
                watch_receiver_sha256.push(key) ;
                // debug('lost_message', pgm + 'watching for sha256_address ' + key + ' for deleted contact') ;
            }

            // console.log(pgm + 'watch_receiver_sha256 = ' + JSON.stringify(watch_receiversender_sha256)) ;
            // console.log(pgm + 'ignore_zeronet_msg_id = ' + JSON.stringify(ignore_zeronet_msg_id)) ;

            // fetch relevant messages
            // 1) listening to relevant receiver_sha256 addresses. Listening to messages from all connected user hubs
            var mn_query_13 =
                "select" +
                "  messages.user_seq, messages.receiver_sha256, messages.key, messages.message," +
                "  messages.message_sha256, messages.timestamp, messages.json_id, " +
                "  users.pubkey, " +
                "  substr(json.directory, 1, instr(json.directory,'/')-1) as hub," +
                "  substr(json.directory, instr(json.directory,'/data/users/')+12) as auth_address " +
                "from messages, users, json " +
                "where ( messages.receiver_sha256 in ('" + watch_receiver_sha256[0] + "'" ;
            for (i=1 ; i<watch_receiver_sha256.length ; i++) mn_query_13 = mn_query_13 + ", '" + watch_receiver_sha256[i] + "'" ;
            mn_query_13 = mn_query_13 + ')' ;
            // 2) check if previously received inbox messages been deleted from zeronet
            // 3) check if previously deleted inbox messages have been deleted from zeronet
            var first = true ;
            for (auth_address in ignore_zeronet_msg_id) {
                for (i=0 ; i<ignore_zeronet_msg_id[auth_address].length ; i++) {
                    if (first) { mn_query_13 += " or messages.message_sha256 in (" ; first = false }
                    else mn_query_13 += ", " ;
                    mn_query_13 += "'" + ignore_zeronet_msg_id[auth_address][i] + "'" ;
                }
            }
            if (!first) mn_query_13 += ')' ;
            mn_query_13 = mn_query_13 + " )" +
                "and users.json_id = messages.json_id " +
                "and users.user_seq = messages.user_seq " +
                "and json.json_id = messages.json_id" ;
            debug('select', pgm + 'mn query 13 = ' + mn_query_13) ;
            debug_seq = debug_z_api_operation_start(pgm, 'mn query 13', 'dbQuery', show_debug('z_db_query')) ;
            ZeroFrame.cmd("dbQuery", [mn_query_13], function(res) {
                var pgm = service + '.local_storage_read_messages dbQuery callback: ';
                // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                debug_z_api_operation_end(debug_seq, format_q_res(res)) ;
                // console.log(pgm + 'res = ' + JSON.stringify(res));
                //res = [{
                //    "timestamp": 1476103057083,
                //    "auth_address": "1Hzh7qdPPQQndim5cq9UpdKeBJxqzQBYx4",
                //    "receiver_sha256": "e7fcc820791e7c9575f92b4d891760638287a40a17f67ef3f4a56e86b7d7756b",
                //    "key": "fvljzIjj2SvFtAYsVzyAILodSvbmeGxtXmn3T0k7YZXJ2CPqJQkkzFop5Ivwb0rbnbL1pYnI3XVxAKXOIsytuzzynxtF464fhCypw2StmUl2NzwDUh8du8UW9QeXuJDoidcnvlAwN0J5n0lOTTviVkGxUCVj4Kwds27qKpDIhhsFbX975VkQbtbmkGIxgMZ3bA10B9W+YuBB/XpyyHXUtaPfYFW8ByDAaMeQLM43cukEXkyOiOCrzbTwYrKiqrMLkv3InbuHEYHY3NPA0xtL1YTE5nGsOsQKMFujmn/fI4CGG9ylcxB/IsCx+nbQhQm+TC+VGpcXgtdrVcz0JJqPUg==",
                //    "json_id": 24,
                //    "user_seq": 1,
                //    "message": "U2FsdGVkX19oqJz2RoyOoyG73i2nVyRrXIiw7xyJZVn5XL7hVYhr5O3dh5VApOZrM5MJNSAVLEd9yUqCyrTaHQxg8LZrwOxrRAeQHl+cIzQX7Q+/kyPTAjs6CBCk8EWbUzfcZcfmACeh4KlddFCsVLaG/mpMib/J+UIgAvIBroIj7zCQCapzmNOwUQODbW5B",
                //    "message_sha256": "c35761731a4b5286c758772d3bc3bc2ecd7f49041a312fad05df015a9004e804",
                //    "pubkey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjVluDxwL7zcL16AaeLcW\nHWIMcMra0Al/7TNnJqtoRNoJJXc+RPV7r0YKyNHY5d9k31gNxYWNA4aLqrc4cevN\namnk6qIKqK0HHT8kXIkxn7qm62/zn1uu4PQhWqab38GT70PaICC0XBJ+vHGiaxcZ\n5njwm3HMxcKigCUheHS7Qpg61mbs4LPfdXKdOw1zUI3mKNSfJmDu6gxtpbQzC0hJ\ncTym7V6RRUWCQJsLWNHcesVZLZbeECAjzRWZR62A1PDnJsuB8vYt5GV5pgrIDAYx\n1cD961mgOghkD2OZMdhp9RyWQ0mMxYqG7Gyp/HCnase8ND8+9GsQtS1YBM+FBN8E\nwQIDAQAB\n-----END PUBLIC KEY-----"
                //}];
                if (res.error) {
                    ZeroFrame.cmd("wrapperNotification", ["error", "Search for new messages failed: " + res.error, 5000]);
                    console.log(pgm + "Search for new messages failed: " + res.error);
                    console.log(pgm + 'mn query 13 = ' + mn_query_13);
                    return;
                }
                if (detected_client_log_out(pgm, old_userid)) return ;

                // check ignore_zeronet_msg_id hash. has previously received messages been deleted on ZeroNet?
                var ignore_zeronet_msg_id_clone = JSON.parse(JSON.stringify(ignore_zeronet_msg_id)) ;
                var contacts_updated = false ;
                var i, j, contact, k, message, decrypted_message ;
                for (i=res.length-1 ; i>= 0 ; i--) {
                    auth_address = res[i].auth_address ;
                    if (!auth_address) console.log(pgm + 'please add auth_address to res. res = ' + JSON.stringify(res));
                    if (!ignore_zeronet_msg_id_clone[auth_address]) continue ;
                    j = ignore_zeronet_msg_id_clone[auth_address].indexOf(res[i].message_sha256) ;
                    if (j != -1) {
                        // previous received message is still on ZeroNet
                        ignore_zeronet_msg_id_clone[auth_address].splice(j,1) ;
                        if (ignore_zeronet_msg_id_clone[auth_address].length == 0) delete ignore_zeronet_msg_id_clone[auth_address] ;
                        res.splice(i);
                    }
                } // for i (res)

                if (Object.keys(ignore_zeronet_msg_id_clone).length > 0) {
                    console.log(pgm + 'messages deleted on Zeronet: ' + JSON.stringify(ignore_zeronet_msg_id_clone));
                    // should by 2 or 3:
                    for (i=0 ; i<ls_contacts.length ; i++) {
                        contact = ls_contacts[i] ;
                        auth_address = contact.auth_address ;
                        if (!ignore_zeronet_msg_id_clone[auth_address]) continue ;
                        // - 2) previously received messages been deleted from zeronet
                        for (j=0 ; j<contact.messages.length ; j++) {
                            message = contact.messages[j] ;
                            if (message.folder != 'inbox') continue ;
                            k = ignore_zeronet_msg_id_clone[auth_address].indexOf(message.zeronet_msg_id) ;
                            if (k != -1) {
                                // previously received message has been deleted on ZeroNet. remove zeronet_msg_id link
                                // from message in localStorage to message on ZeroNet
                                ignore_zeronet_msg_id_clone[auth_address].splice(k,1);
                                k = ignore_zeronet_msg_id[auth_address].indexOf(message.zeronet_msg_id) ;
                                ignore_zeronet_msg_id[auth_address].splice(k,1);
                                delete message.zeronet_msg_id ;
                                contacts_updated = true ;
                            }
                        } // for j (messages)
                        // - 3) previously deleted inbox messages have been deleted from zeronet
                        if (!contact.inbox_zeronet_msg_id) continue ;
                        for (j=contact.inbox_zeronet_msg_id.length-1 ; j >= 0 ; j--) {
                            k = ignore_zeronet_msg_id_clone[auth_address].indexOf(contact.inbox_zeronet_msg_id[j]) ;
                            if (k != -1) {
                                // previous received and deleted message has also been deleted from zeronet.
                                // just remove sha256 address from inbox_zeronet_msg_id array
                                ignore_zeronet_msg_id_clone[auth_address].splice(k,1);
                                contact.inbox_zeronet_msg_id.splice(j,1) ;
                                contacts_updated = true ;
                            }
                        }
                        if (ignore_zeronet_msg_id_clone[auth_address].length == 0) delete ignore_zeronet_msg_id_clone[auth_address] ;
                        if (ignore_zeronet_msg_id[auth_address].length == 0) delete ignore_zeronet_msg_id[auth_address] ;
                    } // for i (contacts)
                } // if
                // sum check for ignore sha256 addresses. Should be empty
                if (Object.keys(ignore_zeronet_msg_id_clone).length > 0) {
                    console.log(pgm + 'System error. ignore_zeronet_msg_id_clone should be empty now');
                    console.log(pgm + 'ignore_zeronet_msg_id_clone = ' + JSON.stringify(ignore_zeronet_msg_id_clone));
                }
                if (res.length == 0) {
                    // console.log(pgm + 'no new messages') ;
                    if (contacts_updated) ls_save_contacts(false) ;
                    return ;
                }

                // process new incoming message
                var unique_id ;
                for (i=res.length-1 ; i>=0 ; i--) {
                    unique_id = CryptoJS.SHA256(res[i].auth_address + '/'  + res[i].pubkey).toString();
                    if (unique_id == z_cache.my_unique_id) {
                        // my group chat outbox messages
                        // console.log(pgm + 'ignoring my outbox group chat message ' + JSON.stringify(res[i])) ;
                        res.splice(i,1) ;
                        continue ;
                    }
                    if (process_incoming_message(res[i], unique_id)) {
                        contacts_updated = true ;
                        res.splice(i,1) ;
                    }
                } // for i (res)

                // any receipts to sent?
                if (new_outgoing_receipts.length > 0) {
                    // send receipts. will update localStorage and ZeroNet
                    new_incoming_receipts = 0 ;
                    send_new_receipts() ;
                }
                else if (new_incoming_receipts > 0) {
                    // remove chat messages with images from ZeroNet
                    contacts_updated = false ;
                    new_incoming_receipts = 0 ;
                    z_update_1_data_json(pgm, true) ; // true = publish
                    $rootScope.$apply() ;
                }
                else if (contacts_updated) ls_save_contacts(false) ;

                // any message with unknown unique id in incoming messages. Create new unknown contacts and try again
                if (new_unknown_contacts.length > 0) create_new_unknown_contacts() ;

            });

        } // local_storage_read_messages



        // post login - find any "lost msg2" decrypt error waiting to be solved
        // that is cryptMessage encrypted to a previous used ZeroNet certificate
        // feedback info in ingoing and outgoing messages should solve the problems after 1-2 chat messages (resend message)
        // feedback info solution works only if contact is online
        // this function rechecks old pending "lost msg2" messages and tries to decrypt then again
        function recheck_old_decrypt_errors () {
            var pgm = service + '.recheck_old_decrypt_errors: ' ;

            var cert_user_id, decrypt_errors, i, contact, j, message_with_envelope, message, contacts_updated, res ;

            if (!ZeroFrame.site_info) {
                // ZeroFrame websocket connection not ready. Try again in 5 seconds
                console.log(pgm + 'ZeroFrame.site_info is not ready. Try again in 5 seconds. Refresh page (F5) if problem continues') ;
                setTimeout(recheck_old_decrypt_errors,5000); // outside angularjS - using normal setTimeout function
                return ;
            }
            if (!ZeroFrame.site_info.cert_user_id) {
                console.log(pgm + 'Auto login process to ZeroNet not finished. Maybe user forgot to select cert. Checking for old decrypt errors in 1 minute');
                ZeroFrame.cmd("certSelect", [["moneynetwork.bit", "nanasi", "zeroid.bit", "kaffie.bit", "moneynetwork"]]);
                setTimeout(recheck_old_decrypt_errors,60000);// outside angularjS - using normal setTimeout function
                return ;
            }


            cert_user_id = ZeroFrame.site_info.cert_user_id ;
            decrypt_errors = [] ;
            for (i=0 ; i<ls_contacts.length ; i++) {
                contact = ls_contacts[i] ;
                if (contact.type == 'group') continue ;
                if (!contact.messages) continue ;
                for (j=0 ; j<contact.messages.length ; j++) {
                    message_with_envelope = contact.messages[j] ;
                    if (message_with_envelope.folder != 'inbox') continue ;
                    message = message_with_envelope.message ;
                    if (message.msgtype != 'lost msg2') continue ;
                    if (!message.cert_user_ids || !message.unique_id || !message.res) continue ;
                    if (message.cert_user_ids.indexOf(cert_user_id) == -1) continue ;
                    decrypt_errors.push({unique_id: message.unique_id, res: message.res })
                } // for j (messages)
            } // for j (contacts)
            // console.log(pgm + 'decrypt_errors = ' + JSON.stringify(decrypt_errors)) ;
            if (decrypt_errors.length == 0) return ;

            // reprocess old decrypt error messages
            contacts_updated = false ;
            for (i=0 ; i<decrypt_errors.length ; i++) {
                res = JSON.parse(JSON.stringify(decrypt_errors[i].res)) ;
                delete res.decrypted_message_str ;
                // calling process_incoming_message. note param 3 sent_at. used to trigger lost msg2 cleanup. remove old decrypt error from UI
                if (process_incoming_message(res, decrypt_errors[i].unique_id, res.timestamp)) contacts_updated = true ;
                // console.log(pgm + 'i = ' + i + ', res = ' + JSON.stringify(res)) ;
                //res = {
                //    "user_seq": 23,
                //    "receiver_sha256": "34a1c21891ca24b710ec3f0f3fabd129b222df87399577c3e2ac63838fa74703",
                //    "key": "8ADcSj5c/H9s8xt7cIv9tALKACCeme/aL1IOaUIiydlxZLg0BOKANx5Zn/JPJyUcWkhgbAAgWaSzQknmF7IdX0j5ektBAuYh5Pnt1Ex67u9kxjNnG2aeOAJAyMiQfgrJMgvlGK9dnq3DOHkX9/pW2FX9sYdOR012ylcrFnmRUZLVwNZQW7UeFddCEQ9PwN5ZZ8Q3YtpLQadbYgm3MxJiQWKqHUDStQ==",
                //    "message": "OJTJk+d5+AB2EteXUyij7g==,HbcgiSwFZ6izU144+3jwr3Ukm9O8NLJv6jMXQE7wO9r7sDlypivO76zlfK2EwMT5m+IuYpNLz2Zx+myjQzHgguNpzJnKsDVIInsT7asBcu0ETLnmuKxkjmO/U/rk2/RokrZw6ro0hwB3tENYTh+Lm+EGf5G25dqoa6orc38hwgtQM29rpiVACZmuMCR8BrMEkoVsrmm26sT8nfjDEtmXXAwSQEjELHqHtUGnMre3NG0Qax9t/KSg0JKv+2/tfoA2XZFL28GG3y6jJxS2guBYH63sYZ8o0J3Ta83oiZwNwYwhv4aILhuPToN3AOGK/Xjsae1mhfoPKDSWmNeXTwJ4iPVzby0MO+t97CBVYw92e592bLLzXAqnrMZOmkhZHTfB",
                //    "message_sha256": "95a428959cd2b0cc17c5b521b15d8601cf16a444c1ecdd39a9eb6712dead2a56",
                //    "timestamp": 1481737128987,
                //    "auth_address": "16R2WrLv3rRrxa8Sdp4L5a1fi7LxADHFaH"
                //};
            }

            // same post processing as in event_file_done
            // any receipts to sent?
            if (new_outgoing_receipts.length > 0) {
                // send receipts. will update localStorage and ZeroNet
                new_incoming_receipts = 0 ;
                send_new_receipts() ;
            }
            else if (new_incoming_receipts > 0) {
                // remove chat messages with images from ZeroNet
                new_incoming_receipts = 0 ;
                z_update_1_data_json(pgm, true) ; // true = publish
                $rootScope.$apply() ;
            }
            else if (contacts_updated) {
                $rootScope.$apply() ;
                ls_save_contacts(false) ;
            }

            // any message with unknown unique id in incoming file?
            if (new_unknown_contacts.length > 0) create_new_unknown_contacts() ;

        } // recheck_old_decrypt_errors


        // any failed image downloads where image json file has arrived since last login?
        function check_image_download_failed () {
            var pgm = service + '.check_image_download_failed: ' ;
            // find inbox messages with image_download_failed object
            var i, contact, j, message, filename, expected_image_files, image_index, mn_query_14, seperator, debug_seq ;
            expected_image_files = {} ;
            for (i=0 ; i<ls_contacts.length ; i++) {
                contact = ls_contacts[i] ;
                if (!contact.messages) continue ;
                for (j=contact.messages.length-1 ; j >= 0 ; j--) {
                    message = contact.messages[j] ;
                    if (message.folder != 'inbox') continue ;
                    if (!message.image_download_failed) continue ;
                    // create file done event for this failed image download
                    // old image filename format: <timestamp>-image.json
                    // new image filename format: <timestamp>-<userseq>-image.json
                    // this speciel index will work for both old and new format
                    image_index = contact.auth_address + "," + message.sent_at  ;
                    expected_image_files[image_index] = message ;
                    console.log(pgm + 'todo: add hub to image index? add hub to message? image_index = ' + image_index + ', message = ' + JSON.stringify(message));
                } // for j (messages)
            } // for i (contacts)
            if (!Object.keys(expected_image_files).length) return ;
            console.log(pgm + 'found ' + expected_image_files.length + ' messages with image_download_failed objects' );

            // does image files still exist?
            mn_query_14 =
                "select hub, filename, image_index " +
                "from " +
                "  (select " +
                "     substr(json.directory, 1, instr(json.directory,'/')-1) as hub," +
                "     'merged-" + get_merged_type() + "/' + || json.directory || '/' || files_optional.filename as filename," +
                "      substr(json.directory, instr(json.directory,'/data/users/')+12) || ',' ||  substr(filename,1,13) as image_index" +
                "   from files_optional, json" +
                "   where files_optional.filename like '%-image.json'" +
                "   and files_optional.size > 2" +
                "   and json.json_id = files_optional.json_id) " +
                "where image_index in " ;
            seperator = '( ' ;
            for (image_index in expected_image_files) {
                mn_query_14 += seperator + "'" + image_index + "'" ;
                seperator = ', ' ;
            }
            mn_query_14 += ')' ;
            debug('select', pgm + 'mn query 14 = ' + mn_query_14) ;
            debug_seq = debug_z_api_operation_start(pgm, 'mn query 14', 'dbQuery', show_debug('z_db_query')) ;
            console.log(pgm + 'todo: add hub to image_index in mn query 14?');
            ZeroFrame.cmd("dbQuery", [mn_query_14], function (res) {
                var pgm = service + '.check_image_download_failed dbQuery callback 1: ' ;
                var found_image_files, i, image_index, get_file_info ;
                // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                debug_z_api_operation_end(debug_seq, format_q_res(res)) ;
                if (res.error) {
                    ZeroFrame.cmd("wrapperNotification", ["error", "Search for image json files: " + res.error, 5000]);
                    console.log(pgm + "Search for image json files failed: " + res.error);
                    console.log(pgm + 'mn query 14 = ' + mn_query_14);
                    return ;
                }
                found_image_files = {} ;
                for (i=0 ; i<res.length ; i++) found_image_files[res[i].image_index] = { hub: res[i].hub, filename: res[i].filename} ;
                console.log(pgm + 'Object.keys(expected_image_files).length = ' + Object.keys(expected_image_files).length +
                    ', Object.keys(found_image_files).length = ' + Object.keys(found_image_files).length) ;
                for (image_index in expected_image_files) {
                    if (!found_image_files[image_index]) {
                        // image json has been deleted. removing image=false and image_download_failed object
                        delete expected_image_files[image_index].message.image ;
                        delete expected_image_files[image_index].image_download_failed ;
                    }
                }
                // check download info for image json files and optional trigger a file_done event for already downloaded files
                get_file_info = function () {
                    var keys, obs, hub, filename, image_index, obj ;
                    // find next file = Object.pop()
                    keys = Object.keys(found_image_files) ;
                    if (keys.length == 0) return ;
                    image_index = keys[0] ;
                    obj = found_image_files[image_index] ;
                    hub = obj.hub ;
                    filename = obj.filename ;
                    delete found_image_files[image_index] ;
                    // check file info for image json file
                    ZeroFrame.cmd("optionalFileInfo", [filename], function (file_info) {
                        var pgm = service + '.check_image_download_failed optionalFileInfo callback 2: ' ;
                        var debug_seq;
                        console.log(pgm + 'filename = ' + filename + ', info = ' + JSON.stringify(file_info)) ;
                        // continue with file_done event or start a new file download
                        if (file_info.is_downloaded) {
                            console.log(pgm + 'already downloaded. trigger a file_done event for ' + filename) ;
                            event_file_done(hub, 'file_done', filename) ;
                        }
                        else {
                            console.log(pgm + 'Not downloaded. Starting a new download for ' + filename);
                            z_file_get(pgm, {inner_path: filename, required: true}, function (res) {
                                var pgm = service + '.check_image_download_failed z_file_get callback 3: ' ;
                                if (!res) console.log(pgm + 'download timeout for file ' + filename) ;
                            }) ; // z_file_get callback 3
                        }
                        // next res
                        get_file_info() ;
                    }) ; // optionalFileInfo callback 2
                } ;
                get_file_info() ;

            }) ; // dbQuery callback 1:

        } // check_image_download_failed


        // add message to contact
        function add_msg(contact, message, param3) {
            var pgm = service + '.add_msg: ' ;
            if (arguments.length != 2) throw pgm + 'invalid call. add_msg must be called with 2 arguments! param3 = ' + JSON.stringify(param3) ;
            return moneyNetworkHubService.add_msg(contact, message) ;
        } // add_msg
        moneyNetworkZService.inject_functions({add_msg: add_msg}) ;

        // delete previously send message. returns true if ZeroNet must be updated after calling the method
        // todo: also a remove_msg function in moneyNetworkHubService but with not identical. remove?
        function remove_msg (local_msg_seq) {
            var pgm = service + '.remove_msg: ' ;

            // old version without local_msg_seq index
            //var msg, zeronet_update, message_deleted, i, contact, j, k;
            //// console.log(pgm + 'local_msg_seq = ' + local_msg_seq);
            //zeronet_update = false ;
            //for (i=0; i<ls_contacts.length ; i++) {
            //    contact = ls_contacts[i] ;
            //    if (!contact.messages) contact.messages = [] ;
            //    for (j=contact.messages.length-1 ; j >= 0 ; j--){
            //        if (contact.messages[j].folder != 'outbox') continue ;
            //        msg = contact.messages[j] ;
            //        if (msg.local_msg_seq == local_msg_seq) {
            //            if (msg.zeronet_msg_id) {
            //                // already on ZeroNet. Delete mark message. Will be processed in next z_update_1_data_json call
            //                msg.deleted_at = new Date().getTime() ;
            //                zeronet_update = true ;
            //            }
            //            else {
            //                // not on ZeroNet. delete message
            //                // a) delete from chat friendly javascript array
            //                for (k=js_messages.length-1 ; k >= 0 ; k--) {
            //                    if (js_messages[k].message.local_msg_seq == local_msg_seq) {
            //                        js_messages.splice(k,1);
            //                    }
            //                } // for k (javascript_messages)
            //                // b) delete from contact (localStorage)
            //                contact.messages.splice(j,1)
            //            }
            //        }
            //    } // for j (messages)
            //} // for i (contacts)
            //return zeronet_update ;

            // new version with local_msg_seq index
            var zeronet_update, js_message_row, msg ;
            zeronet_update = false ;
            js_message_row = get_message_by_local_msg_seq(local_msg_seq) ;
            if (!js_message_row) {
                console.log(pgm + 'error. old message with local_msg_seq ' + local_msg_seq + ' was not found') ;
                return zeronet_update ;
            }
            msg = js_message_row.message ;
            if (msg.zeronet_msg_id) {
                // already on ZeroNet. Delete mark message. Will be processed in next z_update_1_data_json call
                msg.deleted_at = new Date().getTime() ;
                zeronet_update = true ;
            }
            else {
                // not on ZeroNet. delete message
                remove_message(js_message_row) ;
            }
            return zeronet_update ;

        } // remove_msg

        // z_cache.my_files_optional = {} ;
        function save_my_files_optional (files_optional) {
            moneyNetworkHubService.save_my_files_optional(files_optional);
        }

        // return avatar for user or assign a random avatar to user
        var avatar = moneyNetworkZService.get_avatar() ;
        function load_avatar () { moneyNetworkZService.load_avatar() }

        var user_data_hubs = moneyNetworkHubService.get_user_data_hubs() ;

        // get/update site info. used for cert_user_id in UI (menu line + auth page)

        // todo: cert selected (null => not null). start ls load. see MoneyNetworkHelper.ls_load + other startup functions
        // todo: cert deselected. log out
        // todo: cert not selected. disable ls updates = not logged in

        var site_info = {} ;
        //function update_site_info(new_site_info) {
        //    var pgm = service + '.update_site_info: ' ;
        //    var key, old_cert_user_id ;
        //    old_cert_user_id = site_info.cert_user_id ;
        //
        //    if (new_site_info) {
        //        for (key in site_info) delete site_info[key] ;
        //        for (key in new_site_info) site_info[key] = new_site_info[key] ;
        //        if (old_cert_user_id && !site_info.cert_user_id) client_logout() ;
        //        return ;
        //    }
        //    if (!ZeroFrame) {
        //        $timeout(update_site_info, 100) ;
        //        return ;
        //    }
        //    ZeroFrame.cmd("siteInfo", {}, function (new_site_info) {
        //        var key, old_cert_user_id ;
        //        old_cert_user_id = site_info.cert_user_id ;
        //        for (key in site_info) delete site_info[key] ;
        //        for (key in new_site_info) site_info[key] = new_site_info[key] ;
        //        if (old_cert_user_id && (!site_info.cert_user_id || (old_cert_user_id != site_info.cert_user_id))) client_logout() ;
        //        if (old_cert_user_id) {
        //            if (!site_info.cert_user_id) client_logout() ;
        //            else if (site_info.cert_user_id != old_cert_user_id) {
        //                console.log(pgm + 'calling ls_load (1)') ;
        //                client_logout() ;
        //                // ls_load may or maybe not start a new client log in
        //                MoneyNetworkHelper.ls_load() ;
        //            }
        //        }
        //        else {
        //            // no old cert_user_id
        //            if (site_info.cert_user_id) {
        //                // ls_load may or maybe not start a new client log in
        //                console.log(pgm + 'calling ls_load (2)') ;
        //                MoneyNetworkHelper.ls_load() ;
        //            }
        //        }
        //        $rootScope.$apply() ;
        //    }) ;
        //}

        // wait for setSiteInfo events (new files)
        function event_file_done (hub, event, filename) {
            var pgm = service + '.event_file_done: ' ;
            var debug_seq, merged_filename ;
            if (event != 'file_done') return ;
            if (hub == '1JeHa67QEvrrFpsSow82fLypw8LoRcmCXk') {
                // before merger site. cannot delete data/users array without any bad files
                // console.log(pgm + 'ignoring file_done event for ' + hub) ;
                return ;
            }
            if (user_data_hubs.indexOf(hub) == -1) {
                // not a MoneyNetwork user data hub
                console.log(pgm + 'ignoring ' + filename + ' from ' + hub + '. maybe status.json from w2?') ;
                return ;
            }
            // console.log(pgm + 'hub = ' + JSON.stringify(hub) + ', event = ' + JSON.stringify(event) + ', filename = ' + JSON.stringify(filename));
            if (!z_cache.user_id) return ; // not logged in - just ignore - will be dbQuery checked after client login
            // process user files:
            // - data/users/<auth_address>/content.json - check for avatar uploads
            // - data/users/<auth_address>/data.json - check for new messages
            // - ignore all other files from Money Network
            debug('file_done', pgm + 'hub = ' + hub + ', filename = ' + filename) ;
            if (filename.substr(0,11) != 'data/users/') return ;
            if (!filename.match(/json$/)) return ;
            // must be content.json, data.json or status.json
            debug('file_done', pgm + 'filename = ' + filename) ;

            // read json file (content.json, data.json, status.json, -chat.json or -image.json)
            merged_filename = 'merged-' + get_merged_type() + '/' + hub + '/' + filename ;
            z_file_get(pgm, {inner_path: merged_filename, required: false}, function (res) {
                var pgm = service + '.event_file_done z_file_get callback 1: ';
                var i, contact, auth_address, contacts_updated, index, my_pubkey_sha256, using_my_pubkey,
                    cleanup_inbox_messages_lng1, cleanup_inbox_messages_lng2, cleanup_inbox_messages_lng3, timestamp ;
                if (!res) res = {} ;
                else {
                    try {
                        res = JSON.parse(res) ;
                    }
                    catch (e) {
                        console.log(pgm + 'error. ' + merged_filename + ' was invalid. error = ' + e.message) ;
                        res = {} ;
                    }
                }
                // console.log(pgm + 'res = ' + JSON.stringify(res));
                auth_address = filename.split('/')[2] ;

                if (filename.match(/content\.json$/)) {

                    // content.json - check avatar in files. null, jpg or pgn
                    (function() {
                        var content_json_avatar, public_avatars, avatar_short_path, contacts, i, contact ;
                        if (res.files['avatar.jpg']) content_json_avatar = 'jpg' ;
                        else if (res.files['avatar.png']) content_json_avatar = 'png' ;
                        else content_json_avatar = null ;
                        // check contacts. cert_user_id is not an unique contact id!
                        contacts = get_contacts_by_cert_user_id(res.cert_user_id);
                        if (!contacts) {
                            debug('file_done', pgm + 'checking avatar. must be a new contact. no contacts found with cert_user_id ' + res.cert_user_id);
                            return ;
                        }
                        for (i=0 ; i<contacts.length ; i++) {
                            contact = contacts[i] ;
                            if (contact.avatar == content_json_avatar) continue ;

                            // avatar (maybe) updated
                            if (content_json_avatar) {
                                // not null avatar in content.json - uploaded avatar.
                                // todo: UI is not updated. $rootScope.$apply() does not help neither ....
                                debug('file_done', pgm + 'found new uploaded ' + content_json_avatar + ' avatar') ;
                                contact.avatar = content_json_avatar;
                            }
                            else {
                                // null avatar in content.json
                                if (['jpg', 'png'].indexOf(contact.avatar) != -1) {
                                    // previosly uploaded avatar has been deleted. Assign random avatar to contact.
                                    public_avatars = MoneyNetworkHelper.get_public_avatars();
                                    index = Math.floor(Math.random() * (public_avatars.length-1)); // avatarz.png (zero) is used for public contact
                                    avatar_short_path = public_avatars[index];
                                    contact.avatar = avatar_short_path;
                                }
                                else {
                                    // OK. Contact has already an random assigned public avatar
                                }
                            }
                        } // for i (contacts)

                    })() ;

                    // content.json - any optional files (public chat) with actual chat page context?
                    (function() {
                        var key, cache_filename, within_page_context, prefix, prefix_lng ;
                        if (!z_cache.user_setup.public_chat) return ; // public chat disabled
                        if ($location.path().substr(0,5) != '/chat') return ; // not chat page
                        // check chat page context. is any of the optional files relevant for actual context?
                        within_page_context = false ;
                        if (!res.files_optional) res.files_optional = {} ;
                        for (key in res.files_optional) {
                            cache_filename = 'data/users/' + auth_address + '/' + key;
                            if (file_within_chat_page_context(cache_filename)) {
                                within_page_context = true;
                                break;
                            }
                        } // for key
                        if (!within_page_context) {
                            // any deleted optional files within page context?
                            debug('public_chat', pgm + 'checking for deleted chat files') ;
                            prefix = 'data/users/' + auth_address + '/' ;
                            prefix_lng = prefix.length ;
                            for (cache_filename in files_optional_cache) {
                                if (cache_filename.substr(0,prefix_lng) != prefix) continue ;
                                key = cache_filename.substr(prefix_lng) ;
                                if (res.files_optional[key]) continue ; // already checked
                                debug('public_chat', pgm + 'deleted cache_filename = ' + cache_filename) ;
                                if (file_within_chat_page_context(cache_filename)) {
                                    debug('public_chat', pgm + 'found deleted chat file ' + cache_filename + ' within page context') ;
                                    within_page_context = true;
                                    break;
                                }
                            } // for cache_filename
                        }
                        debug('public_chat', pgm + 'res.files_optional = ' + JSON.stringify(res.files_optional) + ', within_page_context = ' + within_page_context);
                        if (within_page_context) {
                            // trigger a new chatCtrl.page_is_ready call and a new check for public chat files
                            debug('public_chat', pgm + 'calling reset_first_and_last_chat. should check/update public chat') ;
                            old_chat_page_context = null ;
                            reset_first_and_last_chat() ;
                        }
                    })() ;

                    $rootScope.$apply();
                    ls_save_contacts(false);
                    return ;
                } // end reading content.json

                if (filename.match(/data\.json$/)) {

                    contacts_updated = false ;

                    // check users/search arrays. create/update/delete contact and search information for this auth_address only
                    z_contact_search (function () { $rootScope.$apply()}, auth_address, null) ; // no file_user_seq for data.json files
                    // debug('file_done', pgm + 'called z_contact_search for auth_address ' + auth_address) ;

                    // check msg array
                    if (!res.msg) res.msg = [] ;
                    var pubkey, j, unique_id, cleanup_inbox_messages, message, zeronet_msg_id ;
                    // debug('file_done', pgm + 'watch_receiver_sha256 = ' + JSON.stringify(watch_receiver_sha256));
                    // debug('file_done', pgm + 'res.msg.length before = ' + res.msg.length) ;

                    // find inbox messages that have been removed from zeronet
                    // - compare previous received messages (ignore_zeronet_msg_id[auth_address]) with msg array in data.file
                    // - messages removed from data.json file after contact has received feedback info (message has been received by you)
                    // - messages removed from data.json file when contact data.json file was too big
                    if (ignore_zeronet_msg_id[auth_address]) {
                        cleanup_inbox_messages = JSON.parse(JSON.stringify(ignore_zeronet_msg_id[auth_address])) ;
                        cleanup_inbox_messages_lng1 = cleanup_inbox_messages.length ;
                        for (i=0 ; i<res.msg.length ; i++) {
                            index = cleanup_inbox_messages.indexOf(res.msg[i].message_sha256) ;
                            if (index != -1) cleanup_inbox_messages.splice(index,1) ;
                        }
                        cleanup_inbox_messages_lng2 = cleanup_inbox_messages.length ;
                        if (cleanup_inbox_messages.length > 0) {
                            debug('file_done', pgm + 'cleanup_inbox_messages = ' + JSON.stringify(cleanup_inbox_messages)) ;
                            for (i=0 ; i<ls_contacts.length ; i++) {
                                contact = ls_contacts[i] ;
                                if (contact.auth_address != auth_address) continue ;
                                // 1 - check inbox
                                for (j = 0 ; j<contact.messages.length ; j++) {
                                    message = contact.messages[j] ;
                                    if (message.folder != 'inbox') continue ;
                                    if (!message.zeronet_msg_id) continue ;
                                    zeronet_msg_id = message.zeronet_msg_id ;
                                    index = cleanup_inbox_messages.indexOf(zeronet_msg_id) ;
                                    if (index == -1) continue ;
                                    // found inbox message that have been removed from zeronet
                                    cleanup_inbox_messages.splice(index,1) ;
                                    index = ignore_zeronet_msg_id[auth_address].indexOf(zeronet_msg_id);
                                    ignore_zeronet_msg_id[auth_address].splice(index,1) ;
                                    if (ignore_zeronet_msg_id[auth_address].length == 0) delete ignore_zeronet_msg_id[auth_address] ;
                                    delete message.zeronet_msg_id ;
                                    delete message.zeronet_msg_size ;
                                    contacts_updated = true ;
                                }
                                // 2 - check deleted inbox messages
                                if (!contact.inbox_zeronet_msg_id) continue ;
                                for (j=contact.inbox_zeronet_msg_id.length-1 ; j>=0 ; j--) {
                                    zeronet_msg_id = contact.inbox_zeronet_msg_id[j] ;
                                    index = cleanup_inbox_messages.indexOf(zeronet_msg_id) ;
                                    if (index == -1) continue ;
                                    // found deleted index message that have been removed from zeronet
                                    cleanup_inbox_messages.splice(index,1) ;
                                    contact.inbox_zeronet_msg_id.splice(j,1) ;
                                    index = ignore_zeronet_msg_id[auth_address].indexOf(zeronet_msg_id);
                                    ignore_zeronet_msg_id[auth_address].splice(index,1) ;
                                    if (ignore_zeronet_msg_id[auth_address].length == 0) delete ignore_zeronet_msg_id[auth_address] ;
                                    contacts_updated = true ;
                                }
                            } // for i (contacts)
                            cleanup_inbox_messages_lng3 = cleanup_inbox_messages.length ;

                            // recheck cleanup_inbox_messages.length. should be empty now!
                            if (cleanup_inbox_messages.length > 0) {
                                // only debug info if in case of error
                                debug('file_done', pgm + 'one or more sha256 addresses in cleanup_inbox_messages was not found for contacts with auth_address ' + auth_address) ;
                                debug('file_done', pgm + 'ignore_zeronet_msg_id[auth_address] = ' + JSON.stringify(ignore_zeronet_msg_id[auth_address])) ;
                                debug('file_done', pgm + 'res.msg = ' + JSON.stringify(res.msg)) ;
                                debug('file_done', pgm + 'cleanup_inbox_messages_lng1 = ' + cleanup_inbox_messages_lng1) ;
                                debug('file_done', pgm + 'cleanup_inbox_messages_lng2 = ' + cleanup_inbox_messages_lng2) ;
                                debug('file_done', pgm + 'cleanup_inbox_messages_lng3 = ' + cleanup_inbox_messages_lng3) ;
                                debug('file_done', pgm + 'cleanup_inbox_messages = ' + JSON.stringify(cleanup_inbox_messages)) ;
                            }

                        }
                    }

                    my_pubkey_sha256 = watch_receiver_sha256[0] ; // todo: should always listening for sha256(pubkey) address
                    // debug('file_done', pgm + 'my_pubkey_sha256 = ' + my_pubkey_sha256) ;

                    for (i=0 ; i<res.msg.length ; i++) {
                        // debug - always listening to sha256(pubkey)
                        using_my_pubkey = (res.msg[i].receiver_sha256 == my_pubkey_sha256) ;
                        // if (using_my_pubkey) debug('file_done', 'res.msg[' + i + '] = ' + JSON.stringify(res.msg[i])) ;
                        // debug('file_done', pgm + 'res.msg[' + i + '].receiver_sha256 = ' + res.msg[i].receiver_sha256);
                        if (watch_receiver_sha256.indexOf(res.msg[i].receiver_sha256) == -1) {
                            // if (using_my_pubkey) debug('file_done', 'res.msg[' + i + ']: UPS: should always receive messages using sha256(pubkey) as address') ;
                            // not listening for this sha256 address
                            continue ;
                        }
                        if (ignore_zeronet_msg_id[auth_address] &&
                            (ignore_zeronet_msg_id[auth_address].indexOf(res.msg[i].message_sha256) != -1)) {
                            // message already received
                            // if (using_my_pubkey) debug('file_done', 'res.msg[' + i + ']: has already been received');
                            continue ;
                        }
                        // debug('file_done', pgm + 'receive message ' + JSON.stringify(res.msg[i]));

                        // issue #154 - first group chat message is not received correct when using cryptmessage
                        // expects res array to contain group chat password + first group chat message
                        debug('inbox && encrypted', pgm + 'res.msg.length = ' + res.msg.length + ', i = ' + i +
                            ', res.msg[' + i + '] = ' + JSON.stringify(res.msg[i]) + ', res.msg = ' + JSON.stringify(res.msg));

                        // find unique id for contact
                        pubkey = null ;
                        for (j=0 ; j<res.users.length ; j++) if (res.users[j].user_seq == res.msg[i].user_seq) pubkey = res.users[j].pubkey ;
                        if (!pubkey) {
                            console.log(pgm + 'Error in ' + filename + '. Could not find user with user_seq = ' + res.msg[i].user_seq);
                            continue ;
                        }
                        unique_id = CryptoJS.SHA256(auth_address + '/'  + pubkey).toString();
                        res.msg[i].hub = hub ; // where is message comming from?
                        res.msg[i].auth_address = auth_address ; // used if create new unknown contacts
                        // debug('file_done', pgm + 'unique_id = ' + unique_id);

                        // if (using_my_pubkey) debug('file_done', 'res.msg[' + i + ']: calling process_incoming_message');
                        if (process_incoming_message(res.msg[i], unique_id)) {
                            // debug('file_done', pgm + 'js_messages.length = ' + js_messages.length) ;
                            debug('file_done', pgm + 'last message = ' + JSON.stringify(js_messages[js_messages.length-1].message)) ;
                            contacts_updated = true ;
                        }
                        else {
                            // if (using_my_pubkey) debug('file_done', 'res.msg[' + i + ']: UPS. process_incoming_message failed ...');
                        }
                    } // for i (res.msg)
                    // console.log(pgm + 'res.msg.length after = ' + res.msg.length) ;

                    debug('file_done',
                        pgm + 'new_outgoing_receipts.length = ' + new_outgoing_receipts.length +
                        ', new_incoming_receipts = ' + new_incoming_receipts +
                        ', contacts_updated = ' + contacts_updated );

                    // any receipts to sent?
                    if (new_outgoing_receipts.length > 0) {
                        // send receipts. will update localStorage and ZeroNet
                        new_incoming_receipts = 0 ;
                        send_new_receipts() ;
                    }
                    else if (new_incoming_receipts > 0) {
                        // remove chat messages with images from ZeroNet
                        contacts_updated = false ;
                        new_incoming_receipts = 0 ;
                        z_update_1_data_json(pgm, true) ; // true = publish
                        $rootScope.$apply() ;
                    }
                    else if (contacts_updated) {
                        $rootScope.$apply() ;
                        ls_save_contacts(false) ;
                    }

                    // any message with unknown unique id in incoming file?
                    if (new_unknown_contacts.length > 0) create_new_unknown_contacts() ;

                    return
                } // end reading data.json

                if (filename.match(/status\.json$/)) {
                    // update Last Updated timestamp for contact (in search array)
                    // console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                    // res = {
                    //    version: 5,
                    //    status: [{ user_seq: 21, timestamp: 1478267341525} ]
                    //};

                    auth_address = filename.split('/')[2] ;
                    var last_online ;
                    contacts_updated = false ;
                    for (i=0 ; i<ls_contacts.length ; i++) {
                        contact = ls_contacts[i] ;
                        if (contact.auth_address != auth_address) continue ;
                        timestamp = null ;
                        for (j=0 ; j<res.status.length ; j++) {
                            if (res.status[j].user_seq == contact.user_seq) timestamp = res.status[j].timestamp ;
                        }
                        if (!timestamp) continue ;
                        last_online = timestamp / 1000.0 ;
                        // Update Last online in search array
                        var old_last_online = get_last_online(contact) || 0 ;
                        if (last_online > old_last_online) {
                            set_last_online(contact, last_online) ;
                            contacts_updated = true ;
                            console.log(pgm + 'status.json: last_online = ' + date(last_online*1000, 'short') + ', search = ' + JSON.stringify(contact.search)) ;
                        }
                    } // for i (contacts)

                    if (contacts_updated) {
                        ls_update_group_last_updated();
                        $rootScope.$apply() ;
                        ls_save_contacts(false);
                    }

                    return ;
                }

                if (filename.match(new RegExp(Z_CONTENT_OPTIONAL))) {
                    // Ok. received file done event when receiving optional json file.
                    // get_and_load_chat_file fileGet callback is normally already processing this file (no need to do anything)
                    // exception: failed image downloades (timeout).
                    debug('public_chat', pgm + 'received optional json file ' + filename) ;

                    // -image.json file. could be a previous failed image download. check image_download_failed object
                    if (!filename.match(/-image\.json$/)) return ; // -chat.json files (public chat)

                    (function() {
                        var timestamp, message_with_envelope, i, contact, found, now, dif, image_download_failed,
                            password, image, actions, action, data, loop, error;

                        console.log(pgm + 'received a downloaded image json file. check for any old message with an image_download_failed object') ;
                        // old: filename = data/users/1PCnWyxKEiFW1u6awWoficZJSyQbxh3BAA/1483887305307-image.json
                        // new: filename = data/users/1PCnWyxKEiFW1u6awWoficZJSyQbxh3BAA/1483887305307-1-image.json
                        console.log(pgm + 'auth_address = ' + auth_address) ;
                        // auth_address = 1PCnWyxKEiFW1u6awWoficZJSyQbxh3BAA
                        timestamp = parseInt(filename.split('/')[3].split('-')[0]) ;
                        console.log(pgm + 'timestamp = ' + timestamp) ;
                        // timestamp = 1483887305307

                        // lookup inbox message with same timestamp
                        found = false ;
                        for (i=0 ; i<ls_contacts.length ; i++) {
                            contact = ls_contacts[i] ;
                            if (contact.auth_address != auth_address) continue ;
                            if (!contact.messages || !contact.messages.length) continue ;
                            for (j=0 ; j<contact.messages.length ; j++) {
                                message_with_envelope = contact.messages[j] ;
                                if (message_with_envelope.folder != 'inbox') continue ;
                                if (message_with_envelope.sent_at != timestamp) continue ;
                                found = true ;
                                break ;
                            } // for j (messages)
                            if (found) break ;
                        } // for i (contacts)

                        if (!found) {
                            // OK. message was not found. should be processing now
                            console.log(pgm + 'OK. message was not found. message and image download should be processing right now.') ;
                            return ;
                        }
                        else if (message_with_envelope.message.image && (message_with_envelope.message.image != true)) {
                            console.log(pgm + 'Ups. message already exist with image. typeof image = ' + typeof message_with_envelope.message.image) ;
                            return ;
                        }
                        else if (!(image_download_failed=message_with_envelope.image_download_failed)) {
                            console.log(pgm + 'error. message was found but without any image_download_failed object. message_with_envelope = ' + JSON.stringify(message_with_envelope)) ;
                            return ;
                        }

                        now = new Date().getTime() ;
                        dif = now - timestamp ;
                        console.log(pgm + 'found message without image. message_with_envelope = ' + JSON.stringify(message_with_envelope));
                        console.log(pgm + 'file timestamp = ' + timestamp + ', now = ' + now + ', dif = ' + dif) ;
                        console.log(pgm + 'image_download_failed = ' + JSON.stringify(image_download_failed));
                        // image_download_failed = {"download_failure_at":1483887330956,"encryption":2,"password":"biuNabOLJT3uBz7Csn95UBlbrsNkWQa+LlXhvBtvGJQ="}

                        if ([1,2].indexOf(image_download_failed.encryption) == -1) {
                            console.log(pgm + 'error. message was found but with invalid image_download_failed.encryption value') ;
                            delete message_with_envelope.image_download_failed ;
                            ls_save_contacts(false) ;
                            return ;
                        }
                        if (!(password=image_download_failed.password)) {
                            console.log(pgm + 'error. message was found but without a image_download_failed.password') ;
                            delete message_with_envelope.image_download_failed ;
                            ls_save_contacts(false) ;
                            return ;
                        }

                        // ready. image file has already been read (res). password already known (image_download_failed object)
                        image = res ;

                        // helper: delete optional file and send receipt. note. sending receipt even if there is errors in image.json
                        var send_image_receipt = function (send_receipt) {
                            var pgm = service + '.event_file_done.send_image_receipt: ';
                            var debug_seq ;
                            // received a chat message with an image. Cleanup
                            // debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_delete', pgm + filename + ' optionalFileDelete') ;
                            debug_seq = debug_z_api_operation_start(pgm, filename, 'optionalFileDelete', show_debug('z_file_delete')) ;
                            ZeroFrame.cmd("optionalFileDelete", {inner_path: filename}, function (res) {
                                // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                debug_z_api_operation_end(debug_seq, format_res(res)) ;
                            });
                            delete message_with_envelope.image_download_failed;
                            $rootScope.$apply();
                            if (!send_receipt) return ;
                            // Send receipt so that other user can delete msg from data.json, image.json file and free disk space
                            // privacy issue - monitoring ZeroNet files will reveal who is chatting. Receipt makes this easier to trace.
                            var receipt = { msgtype: 'received', remote_msg_seq: message_with_envelope.message.local_msg_seq };
                            // validate json
                            var error = MoneyNetworkHelper.validate_json(pgm, response, response.msgtype, 'Cannot send receipt for chat message');
                            if (error) console(pgm + error) ;
                            else {
                                // this callback can be called multiple times after log in or when receiving a data.json file
                                // multiple images in process_incoming_message => multiple calls to z_update_1_data_json
                                // process lock in z_update_1_data_json will output a warning in log
                                // first receipt in first z_update_1_data_json call
                                // other receipts in next z_update_1_data_json call in 30 seconds
                                add_msg(contact, response) ;
                                ls_save_contacts(true);
                                z_update_1_data_json(pgm);
                            }

                        };

                        error = MoneyNetworkHelper.validate_json (pgm, image, 'image-file', 'Invalid json file') ;
                        if (error) {
                            // File not OK
                            console.log(pgm + 'cannot read -image.json file ' + filename + '. json is invalid: ' + error);
                            message_with_envelope.message.image = false ;
                            send_image_receipt(true) ;
                            return ;
                        }

                        if (image_download_failed.encryption == 1) {
                            // simple symmetric encryption.

                            // DRY: almost identical code in download_json_image_file fileGet callback 2
                            if (!image.storage) image.storage = {} ;
                            if (!image.storage.image) image.storage.image = 'e1' ; // e1 = JSEcrypted and not compressed
                            data = image.image ;
                            actions = image.storage.image.split(',');
                            try {
                                while (actions.length) {
                                    action = actions.pop() ;
                                    if (action == 'c1') data = MoneyNetworkHelper.decompress1(data) ;
                                    else if (action == 'e1') data = MoneyNetworkHelper.decrypt(data, password);
                                    else throw "Unsupported decrypt/decompress action " + action ;
                                }
                                message_with_envelope.message.image = data ;
                            }
                            catch (e) {
                                console.log(pgm + 'error. image ' + image_path + ' decrypt failed. error = ' + e.message) ;
                                message_with_envelope.message.image = false ;
                            }
                            send_image_receipt(true) ;
                        }
                        if (image_download_failed.encryption == 2) {
                            // cryptMessage

                            // DRY: almost identical code in same code as in process_incoming_cryptmessage fileGet callback 4
                            image = res ;
                            if (!image.storage) image.storage = {} ;
                            if (!image.storage.image) image.storage.image = 'e2' ;
                            actions = image.storage.image.split(',') ;
                            data = image.image ;
                            // "loop". one callback for each action in actions
                            loop = function (end_of_loop_cb) {
                                var pgm = service + '.event_file_done.loop: ' ;
                                var action, image_array, iv, encrypted ;
                                if (!actions.length) {
                                    // done without decrypt/decompress without any errors
                                    debug('inbox', 'done') ;
                                    end_of_loop_cb() ;
                                    return ;
                                }
                                action = actions.pop() ;
                                debug('inbox', pgm + 'action = ' + action) ;
                                if (action == 'c1') {
                                    // decompress
                                    try {
                                        data = MoneyNetworkHelper.decompress1(data) ;
                                    }
                                    catch (e) {
                                        end_of_loop_cb('action ' + action + ': ' + e.message);
                                        return ;
                                    }
                                    debug('inbox', pgm + 'decompress ok') ;
                                    loop(end_of_loop_cb) ;
                                    return ;
                                }
                                if (action == 'e2') {
                                    // aesDecrypt. note: no error handling for aesDecrypt. Error only in UI (notification)
                                    image_array = data.split(',') ;
                                    iv = image_array[0] ;
                                    encrypted = image_array[1] ;
                                    // ready for aesDecrypt
                                    debug('inbox', pgm + 'calling aesDecrypt') ;
                                    // debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_crypt_message', pgm + ' aesDecrypt') ;
                                    debug_seq = debug_z_api_operation_start(pgm, null, 'aesDecrypt', show_debug('z_crypt_message')) ;
                                    ZeroFrame.cmd("aesDecrypt", [iv, encrypted, password], function (decrypted_str) {
                                        var pgm = service + '.process_incoming_cryptmessage aesDecrypt callback 5: ';
                                        // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                        debug_z_api_operation_end(debug_seq, decrypted_str ? 'OK' : 'Failed') ;
                                        debug('inbox', pgm + 'aesDecrypt ok') ;
                                        data = decrypted_str ;
                                        loop(end_of_loop_cb) ;
                                    }) ; // aesDecrypt callback 5
                                    return ;
                                }
                                end_of_loop_cb("unknown image decrypt/decompress action " + action) ;
                            } ;
                            loop(function (error) {
                                var pgm = service + '.event_file_done.loop callback 1: ';
                                if (error) {
                                    console.log(pgm + 'error. decrypt/decompress failed for ' + image_path + '. error = ' + error) ;
                                    message_with_envelope.message.image = false ;
                                    send_image_receipt(false) ;
                                }
                                else {
                                    message_with_envelope.message.image = data ;
                                    send_image_receipt(true) ;
                                }

                            }) ; // loop callback 2

                        } // if cryptMessage encryption

                    })() ; // function closure

                    return ;
                } // if optional file

                if (filename.match(/like\.json$/)) {
                    // check watch_like_json hash

                    (function(){
                        var like, refresh_reactions, i, key, old_keys, j, js_messages_row ;
                        like = res ;
                        refresh_reactions = {} ;

                        // debug('reaction', pgm + 'watch_like_json[auth_address] = ' + JSON.stringify(watch_like_json[auth_address])) ;
                        // debug('reaction', pgm + 'like.like = ' + JSON.stringify(like.like)) ;
                        // old msg_id/keys for reaction for this like.json file
                        if (watch_like_json[auth_address]) old_keys = JSON.parse(JSON.stringify(watch_like_json[auth_address])) ;
                        else old_keys = [] ;

                        // scan like.json file. any messages within current chat context to refresh reaction info for?
                        for (i=0 ; i<like.like.length ; i++) {
                            key = like.like[i].timestamp + ',' + like.like[i].auth ;
                            if (like.like[i].timestamp == 1486789437340) {
                                debug('reaction', pgm + 'like = ' + JSON.stringify(like));
                                js_messages_row = watch_like_msg_id[key] ;
                                if (js_messages_row) {
                                    js_messages_row = JSON.parse(JSON.stringify(js_messages_row)) ;
                                    delete js_messages_row.contact.messages ;
                                }
                                debug('reaction', pgm + 'watch_like_msg_id[' + key + '] = ' + JSON.stringify(js_messages_row)) ;
                            }
                            if (!watch_like_msg_id[key] || refresh_reactions[key]) continue ;
                            // client is watching reactions for this msg_id/key
                            refresh_reactions[key] = watch_like_msg_id[key] ;
                            j = old_keys.indexOf(key) ;
                            if (j != -1) old_keys.splice(j,1) ;
                        }
                        // check for reactions removed from like.json file
                        for (i=0 ; i<old_keys.length ; i++) {
                            key = old_keys[i] ;
                            if (!watch_like_msg_id[key] || refresh_reactions[key]) continue ;
                            // found removed reaction for msg_id/key
                            refresh_reactions[key] = watch_like_msg_id[key] ;
                            j = watch_like_json[auth_address].indexOf(key) ;
                            watch_like_json[auth_address].splice(j,1) ;
                        }
                        // refresh reaction info for relevant msg_id/keys
                        // if (Object.keys(refresh_reactions).length) {
                            debug('reaction', pgm + 'like.json. refresh_reactions.length = ' + Object.keys(refresh_reactions).length +
                                ', refresh_reactions.keys = ' + JSON.stringify(Object.keys(refresh_reactions))) ;
                        // }
                        for (key in refresh_reactions) check_reactions(refresh_reactions[key]) ;
                    })() ;

                    return ;
                }

                console.log(pgm + 'unknown json file ' + filename);

            }); // end z_file_get callback 1

        } // end event_file_done
        ZeroFrame.bind_event(event_file_done);

        // get user_seq from z_cache or read from data.json file
        function get_user_seq (cb) {
            moneyNetworkHubService.get_user_seq(cb);
        }

        // get files_optional from z_cache or read from content.json file
        function get_files_optional (cb) {
            var pgm = service + '.get_files_optional: ' ;
            var user_path, inner_path ;
            // check z_cache
            if (z_cache.files_optional) {
                // console.log(pgm + 'found files_optional in cache') ;
                if (cb) cb(z_cache.files_optional) ;
                return z_cache.files_optional ;
            }
            // not in z_cache. check zeronet
            // console.log(pgm + 'files_option was not in cache. reading content.json file');
            user_path = "data/users/" + ZeroFrame.site_info.auth_address;
            inner_path = user_path + '/content.json' ;
            z_file_get(pgm, {inner_path: inner_path, required: false}, function (content) {
                var pgm = service + '.get_user_seq z_file_get callback 1: ';
                if (!content) {
                    // console.log(pgm + 'content.json file was not found') ;
                    if (cb) cb(null) ;
                    return ;
                }
                try {
                    content = JSON.parse(content) ;
                }
                catch (e) {
                    console.log(pgm + 'error. ' + inner_path + ' was invalid. error = ' + e.message) ;
                    if (cb) cb(null) ;
                    return ;
                }
                if (content.optional != Z_CONTENT_OPTIONAL) {
                    // console.log(pgm + 'optional option not ready in content.json file. will be added/updated after next publish') ;
                    if (cb) cb(null) ;
                    return ;
                }
                if (!content.files_optional) content.files_optional = {} ;
                save_my_files_optional(content.files_optional) ;
                if (cb) cb(content.files_optional) ;
            }) ; // z_file_get callback 1
            // zeronet callback executing. files_optional is not yet ready
            return null ;
        } // get_files_optional


        //// hash with download status for optional chat json files
        //// index is inner_path data/users/16R2WrLv3rRrxa8Sdp4L5a1fi7LxADHFaH/1482650949292-1482495755468-1-chat.json
        //// properties:
        //// - no_processes: number of running get_public_chat processes.
        //// - is_downloaded: true or false. true after OK fileGet request with expected size
        //// - is_pending: true or false. true between fileGet and fileGet result/callback
        //// - is_deleted: received logical deleted json file that has also physical deleted
        //// - timestamps: list with timestamps for messages not yet loaded into JS
        //// - size: physical size from last fileGet request. Must match size from files_optional in content.json files
        //// - download_failed_at: array with timestamps for failed (timeout) download.
        var files_optional_cache = moneyNetworkHubService.get_files_optional_cache() ;
        function clear_files_optional_cache() {
            moneyNetworkHubService.clear_files_optional_cache() ;
        }


        // chat page context object. information from chat page (chatCtrl) used when downloading optional chat files
        // is updated after changes in chat page. Note that chat page context can change doing download process
        // a json file is relevant for actual chat page context when file download is started
        // but may not be relevant when finished downloading file
        // download will continue as long as there are any not read chat files relevant for actual chat page context
        // properties:
        // - infinite_scroll_limit. start with 5 and increase with 5. 5, 10, 15 etc. infinite scroll
        // - first_top_timestamp: unix timestamp for top row in chat page
        // - last_bottom_timestamp: unix timestamp for bottom row in chat page
        // - end_of_page: boolean: true if number of messages in chat page <= infinite_scroll_limit
        // - contact: contact context. null or a contact
        // - failures: number of download failure for actual page context. stop download if too many errors
        var chat_page_context = {
            no_processes: 0,
            end_of_page: true,
            failures: 0
        } ;
        var old_chat_page_context ;
        function get_chat_page_context() {
            return chat_page_context ;
        }

        function chat_page_is_empty () {
            var i ;
            for (i=0 ; i<js_messages.length ; i++) if (js_messages[i].chat_filter) return false ;
            return true ;
        }

        function chat_page_is_ready () {
            return (chat_page_context.first_top_timestamp && chat_page_context.last_bottom_timestamp) ;
        }

        // reset timestamps and get new timestamp information from chat page.
        function reset_first_and_last_chat () {
            var pgm = service + '.reset_first_and_last_chat: ' ;
            debug('infinite_scroll', pgm + 'called') ;
            chat_page_context.first_top_timestamp = null ;
            chat_page_context.last_bottom_timestamp = null ;
            chat_page_context.end_of_page = true ;
            debug('infinite_scroll', pgm + 'chat_page_context = ' + JSON.stringify(chat_page_context)) ;
            debug('infinite_scroll', pgm + 'old_chat_page_context = ' + JSON.stringify(old_chat_page_context)) ;
        }

        function check_public_chat () {
            var pgm = service + '.check_public_chat: ' ;
            var check ;

            // any change in chat page context since last call?
            if (old_chat_page_context &&
                (old_chat_page_context.contact == chat_page_context.contact) &&
                (old_chat_page_context.first_top_timestamp == chat_page_context.first_top_timestamp) &&
                (old_chat_page_context.last_bottom_timestamp == chat_page_context.last_bottom_timestamp) &&
                (old_chat_page_context.end_of_page == chat_page_context.end_of_page) &&
                (old_chat_page_context.chat_sort == z_cache.user_setup.chat_sort)) {
                debug('infinite_scroll', pgm + 'stop. unchanged chat page context.') ;
                return ;
            }

            // changed chat page context
            old_chat_page_context = {
                contact: chat_page_context.contact,
                first_top_timestamp: chat_page_context.first_top_timestamp,
                last_bottom_timestamp: chat_page_context.last_bottom_timestamp,
                end_of_page: chat_page_context.end_of_page,
                chat_sort: z_cache.user_setup.chat_sort
            };
            chat_page_context.failures = [] ;

            // ensure that like.json file has been loaded into memory
            get_like_json(function (like, like_index, empty) {

                // check for public chat relevant for current chat page. loop until status == done or too many errors
                chat_page_context.no_processes++ ;
                check = function () {
                    var pgm = service + '.check_public_chat: ' ;
                    get_public_chat(function (status) {
                        if (!status) status = 'not updated' ;
                        debug('public_chat', pgm + 'status = ' + status + ', chat_page_context.failures = ' + chat_page_context.failures.length);
                        if (chat_page_context.failures.length > 3) {
                            // too many errors
                            chat_page_context.no_processes-- ;
                        }
                        else if (status == 'done') {
                            // no more public chat files
                            chat_page_context.no_processes-- ;
                        }
                        else if (status == 'updated') {
                            // chat page updated. update and continue
                            reset_first_and_last_chat();
                            $rootScope.$apply() ;
                            check() ;
                        }
                        else {
                            // no chat page updates but not done
                            check() ;
                        }
                    }) ; // get_public_chat callback
                } ; // check
                check() ;

            }) ; // get_like_json callback


        } // check_public_chat


        // from chatCtrl. keep track of first and last chat message in chat page
        // check for public chat messages within chat page context when finished loading page chat page
        function set_first_and_last_chat (first,last,message, contact) {
            var pgm = service + '.set_first_and_last_chat: ' ;
            var no_msg, i, cache_filename, cache_status, download_failed_at ;
            if (chat_page_is_ready()) return ;
            // chat page is loading.
            if (first && !chat_page_context.first_top_timestamp) chat_page_context.first_top_timestamp = message.message.sent_at ;
            if (last && !chat_page_context.last_bottom_timestamp) chat_page_context.last_bottom_timestamp = message.message.sent_at ;
            if (!chat_page_is_ready()) return;
            // chat page updated with new chat page context
            check_overflow() ;
            chat_page_context.contact = contact ;
            no_msg = 0 ;
            for (i=0 ; i<js_messages.length ; i++) if (js_messages[i].chat_filter) no_msg = no_msg + 1 ;
            chat_page_context.end_of_page = (chat_page_context.infinite_scroll_limit >= no_msg) ;
            debug('infinite_scroll',
                pgm + 'first_top_timestamp = ' + chat_page_context.first_top_timestamp +
                ', last_bottom_timestamp = ' + chat_page_context.last_bottom_timestamp +
                ', end_of_page = ' + chat_page_context.end_of_page +
                ', no_processes = ' + chat_page_context.no_processes +
                ', chat_sort = ' + z_cache.user_setup.chat_sort);
            debug('infinite_scroll', pgm + 'chat_page_context = ' + JSON.stringify(chat_page_context)) ;
            debug('infinite_scroll', pgm + 'old_chat_page_context = ' + JSON.stringify(old_chat_page_context)) ;

            // start public chat download?
            if (chat_page_context.contact && (chat_page_context.contact.type == 'group')) {
                debug('infinite_scroll', pgm + 'stop. group chat') ;
                return ;
            } // group chat
            if ((z_cache.user_setup.chat_sort != 'Last message') && !chat_page_context.end_of_page) {
                // sort by size and not end of page. public chat with size 0 at end of page
                debug('infinite_scroll', pgm + 'stop. sort by size and not end of page. public chat with size 0 at end of page') ;
                return ;
            }
            if (chat_page_context.no_processes >= 2) {
                // do not start more that 1 download process
                debug('public_chat', pgm + 'stop. already ' + chat_page_context.no_processes + ' check_public_chat process running') ;
                return ;
            }
            if (chat_page_context.failures.length >= 3) {
                // something is wrong. maybe offline?
                debug('public_chat', pgm + 'stop. already ' + chat_page_context.failures.length + ' failed downloads for current chat page context') ;
                for (i=0 ; i<chat_page_context.failures.length ; i++) {
                    cache_filename = chat_page_context.failures[i] ;
                    cache_status = files_optional_cache[cache_filename] ;
                    if (cache_status && cache_status.download_failed_at) download_failed_at = cache_status.download_failed_at.pop() ;
                    else download_failed_at = null ;
                    debug('public_chat', pgm + '- ' + cache_filename +
                        (download_failed_at ? ', download failed at ' + date(download_failed_at*1000, 'short') : '')) ;
                } // for i
                return ;
            }

            // ensure that like.json file has been loaded into memory
            get_like_json(function (like, like_index, empty) {
                // check for public chat relevant for current chat page
                check_public_chat() ;
            }) ;

        } // set_first_and_last_chat


        // callback from chatCtrl
        // check for any public chat relevant for current chat page context
        var MERGER_ERROR = moneyNetworkHubService.get_merger_error() ;
        function get_public_chat (cb) {
            var pgm = service + '.get_public_chat: ' ;
            var my_auth_address ;
            debug('public_chat', pgm + 'top row timestamp = ' + chat_page_context.first_top_timestamp +
                ', bottom row timestamp = ' + chat_page_context.last_bottom_timestamp +
                ', end_of_page = ' + chat_page_context.end_of_page + ', chat_sort = ' + z_cache.user_setup.chat_sort);
            if (!chat_page_is_ready() && !chat_page_is_empty()) {
                debug('public_chat', pgm + 'stopping. chat page is not ready') ;
                return cb('done') ;
            }

            // public chat not relevant for:
            if (chat_page_context.contact && (chat_page_context.contact.type == 'group')) return cb('done') ; // not relevant for group chat
            if (z_cache.user_setup.chat_sort != 'Last message') {
                // sort by message size. public chat size = 0 always in bottom of page
                if (!chat_page_context.end_of_page) return cb('done') ;
            }


            // callback 1 - get my user data hub. Ignore my chat files on other user data hubs
            console.log(pgm + 'calling get_my_user_hub');
            get_my_user_hub(function (my_user_hub) {
                var pgm = service + '.get_public_chat get_my_user_hub callback 1: ';

                // callback 2 - get my auth_address and user_seq. my chat files = outbox. other chat files = inbox
                my_auth_address = ZeroFrame.site_info.auth_address ;
                get_user_seq(function (my_user_seq) {
                    var pgm = service + '.get_public_chat get_user_seq callback 2: ';
                    var mn_query_15, debug_seq ;

                    debug('public_chat', pgm + 'my_user_seq = ' + my_user_seq);

                    // callback 2 - find relevant optional files with public chat
                    // - 1. priority - already downloaded optional files
                    // - 2. priority - continue with not downloaded optional files with many peers.
                    // - all json files with size 2 are logical deleted json files
                    mn_query_15 =
                        "select" +
                        "  substr(content_json.directory, 1, instr(content_json.directory,'/')-1) as hub," +
                        "  substr(content_json.directory, instr(content_json.directory,'/data/users/')+12) as auth_address," +
                        "  files_optional.filename," +
                        "  cast(substr(files_optional.filename,1,13) as integer) as to_timestamp," +
                        "  cast(substr(files_optional.filename,15,13) as integer) as from_timestamp," +
                        "  cast(substr( substr(files_optional.filename,29),1,instr(substr(files_optional.filename,29),'-')-1) as integer) as user_seq," +
                        "  files_optional.size," +
                        "  users.pubkey, users.guest " +
                        "from files_optional, json as content_json, json as data_json, users " +
                        "where cast(substr(files_optional.filename,1,13) as integer) >= 1000000000000 " +
                        "and substr(files_optional.filename,14,1) = '-' " +
                        "and cast(substr(files_optional.filename,15,13) as integer) >= 1000000000000 " +
                        "and substr(filename,28,1) = '-' " +
                        "and substr(substr(files_optional.filename,29), 1, instr(substr(files_optional.filename,29),'-')-1) = '' || cast(substr(substr(files_optional.filename,29), 1, instr(substr(files_optional.filename,29),'-')-1) as integer) " +
                        "and files_optional.filename like '%-chat.json' " +
                        "and content_json.json_id = files_optional.json_id " +
                        "and data_json.directory = content_json.directory " +
                        "and data_json.file_name = 'data.json' " +
                        "and users.json_id = data_json.json_id " +
                        "and users.user_seq = cast(substr( substr(files_optional.filename,29),1,instr(substr(files_optional.filename,29),'-')-1) as integer) " ;
                    if (z_cache.user_setup.block_guests) mn_query_15 += "and users.guest is null " ; // check spam filter: guests
                    mn_query_15 += "order by files_optional.filename desc" ;
                    debug('select', pgm + 'query 15 = ' + mn_query_15) ;
                    debug_seq = debug_z_api_operation_start(pgm, 'mn query 15', 'dbQuery', show_debug('z_db_query')) ;
                    ZeroFrame.cmd("dbQuery", [mn_query_15], function (res) {
                        var pgm = service + '.get_public_chat dbQuery callback 3: ';
                        var i, cache_filename, cache_status, j, pending_files, get_no_peers, unique_id,
                            contact, compare_files1, compare_files2, auth_address, filename, interval_obj, user_seq, key,
                            hash2, timestamp, in_old, in_new, in_deleted_interval, from_timestamp, to_timestamp,
                            deleted_messages, message, cb_status, js_messages_row, one_hour_ago, k, delete_file ;
                        debug_z_api_operation_end(debug_seq, format_q_res(res)) ;
                        if (res.error == "'NoneType' object has no attribute 'execute'") {
                            // maybe a problem with deleted optional files. content.db out of sync with file system
                            console.log(pgm + "Search for public chat failed: " + res.error + MERGER_ERROR);
                            // try again "cb(null) = loop forever. Trying with done
                            return cb('done') ;
                        }

                        if (res.error) {
                            ZeroFrame.cmd("wrapperNotification", ["error", "Search for public chat: " + res.error]);
                            console.log(pgm + "Search for public chat failed: " + res.error);
                            console.log(pgm + 'query 15 = ' + mn_query_15);
                            return cb('done') ;
                        }

                        // remove any already running getFile requests from previous get_public_chat requests
                        for (i=res.length-1 ; i >= 0 ; i--) {
                            cache_filename = 'merged-' + get_merged_type() + '/' + res[i].hub + '/data/users/' + res[i].auth_address + '/' + res[i].filename ;
                            cache_status = files_optional_cache[cache_filename] ;
                            if (cache_status && cache_status.is_pending) res.splice(i,1) ;
                        }

                        // issue: Optional files and multiple user directories #177
                        //// my chat files: remove any old chat files from other user data hubs
                        //for (i=res.length-1 ; i >= 0 ; i--) {
                        //    if (res[i].auth_address != my_auth_address) continue ;
                        //    if (res[i].hub == my_user_hub) continue ;
                        //    debug('public_chat', 'remove chat file from old data hub ' + JSON.stringify(res[i])) ;
                        //    res.splice(i,1) ;
                        //} // for i

                        // remove json files with size 2 (logical deleted json files)
                        // 1) logical deleted by owner and is in optional files list with size 2 = {}
                        // 2) physical deleted by downloader here
                        // 3) physical deleted by owner in a later publish
                        cb_status = null ;
                        for (i=res.length-1 ; i >= 0 ; i--) {
                            if (res[i].size != 2) continue ;
                            if ((res[i].auth_address == my_auth_address) && (res[i].user_seq == my_user_seq)) {
                                // my logical deleted optional json files. 3) physical deleted by owner in a later publish
                                res.splice(i,1);
                                continue ;
                            }
                            // other users logical deleted json files. 2) physical deleted by downloader here
                            cache_filename = 'merged-' + get_merged_type() + '/' + res[i].hub + '/data/users/' + res[i].auth_address + '/' + res[i].filename ;
                            // cache_filename = data/users/16SNxdSpUYVLdVQWx6azQjoZXsZJHJUzKN/1485167995925-1485167995925-3-chat.json
                            if (files_optional_cache[cache_filename] && files_optional_cache[cache_filename].is_deleted) {
                                res.splice(i,1) ;
                                continue ;
                            }
                            // physical delete logical deleted json file. maybe already done. ignore any error message
                            debug('public_chat', pgm + 'physical delete logical deleted json file ' + cache_filename +
                                ', res[' + i + '] = ' + JSON.stringify(res[i])) ;
                            // new debug_seq for each optionalFileDelete request
                            delete_file = function () {
                                var debug_seq ;
                                debug_seq = debug_z_api_operation_start(pgm, cache_filename, 'optionalFileDelete', show_debug('z_file_delete')) ;
                                ZeroFrame.cmd("optionalFileDelete", { inner_path: cache_filename}, function (res) {
                                    // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                    debug_z_api_operation_end(debug_seq, format_res('ok')) ; //  ignore any error message
                                }) ;
                            }; // delete_file
                            delete_file() ;
                            // check already read public chat messages from this file
                            for (j=0 ; j<ls_contacts.length ; j++) {
                                contact = ls_contacts[j] ;
                                if (['public','group'].indexOf(contact.type) != -1) continue ;
                                if (contact.auth_address != res[i].auth_address) continue ;
                                for (k=0 ; k<contact.messages.length ; k++) {
                                    message = contact.messages[k] ;
                                    if (message.folder != 'inbox') continue ;
                                    // debug('public_chat', pgm + 'message = ' + JSON.stringify(message)) ;
                                    if (message.z_filename != res[i].filename) continue ;
                                    if (message.deleted_at) continue ;
                                    // found public chat inbox message from this deleted public chat file
                                    debug('public_chat', pgm + 'deleting public chat message ' + JSON.stringify(message)) ;
                                    js_messages_row = get_message_by_seq(message.seq) ;
                                    remove_message(js_messages_row) ;
                                    cb_status = 'updated' ;
                                } // for k (messages)
                            } // for j (contacts)
                            if (!files_optional_cache[cache_filename]) files_optional_cache[cache_filename] = {} ;
                            files_optional_cache[cache_filename].is_deleted = true ;
                            res.splice(i,1) ;
                        } // for i
                        if (res.length == 0) return cb(cb_status || 'done') ;

                        // compare filenames from dbQuery result with filenames in files_optional_cache.
                        // check for deleted chat files, changed intervals and changed chat files
                        compare_files1 = {} ;
                        compare_files2 = {} ;
                        deleted_messages = 0 ;

                        // compare step 1 - compare cache_filenames (files_optional_cache (read messages) and db query result
                        for (cache_filename in files_optional_cache) {
                            cache_status = files_optional_cache[cache_filename] ;
                            if (!cache_status.is_downloaded) continue ;
                            if (cache_status.is_deleted) continue ;
                            compare_files1[cache_filename] = { in_cache: true, cache_size: cache_status.size } ;
                        }
                        for (i=0 ; i<res.length ; i++) {
                            //if (res[i].size == 2) continue ; // logical deleted json files
                            cache_filename = 'merged-' + get_merged_type() + '/' + res[i].hub + '/data/users/' + res[i].auth_address + '/' + res[i].filename ;
                            if (!compare_files1[cache_filename]) compare_files1[cache_filename] = {} ;
                            compare_files1[cache_filename].in_query = true ;
                            compare_files1[cache_filename].query_size = res[i].size ;
                        }
                        // debug('public_chat', pgm + 'before removing identical filenames. compare_files1 = ' + JSON.stringify(compare_files1)) ;
                        for (cache_filename in compare_files1) {
                            if (compare_files1[cache_filename].in_cache && compare_files1[cache_filename].in_query) {
                                // debug('public_chat', pgm + 'file ' + cache_filename + ' in cache and in query. must also compare size. changed size = deleted messages') ;
                                // debug('public_chat', pgm + 'compare_files1[cache_filename] = ' + JSON.stringify(compare_files1[cache_filename])) ;
                                if (compare_files1[cache_filename].cache_size == compare_files1[cache_filename].query_size) delete compare_files1[cache_filename] ;
                                else {
                                    debug('public_chat', pgm + 'issue #84. changed size for file ' + cache_filename +
                                        '. cache_size = ' + compare_files1[cache_filename].cache_size +
                                        ', query_size = ' + compare_files1[cache_filename].query_size +
                                        '. must download and recheck file for deleted messages');
                                    files_optional_cache[cache_filename].is_downloaded = false ;
                                    delete files_optional_cache[cache_filename].timestamps ;
                                }
                            }
                        }
                        // debug('public_chat', pgm + 'after removing identical filenames. compare_files1 = ' + JSON.stringify(compare_files1)) ;
                        // compare_files = {"data/users/1LVdWbEuZyXeWWVcbL7b12zQSWnXWtSod6/1482835334090-1482835334090-1-chat.json": {"in_cache": true}};
                        // compare step 2 - compare data for each auth_address and user_seq (each contact)
                        if (Object.keys(compare_files1).length) {
                            // step 2a - find old and new time intervals for each auth_address and user_seq
                            for (cache_filename in compare_files1) {
                                auth_address = cache_filename.split('/')[2] ;
                                filename = cache_filename.split('/')[3] ;
                                interval_obj = {
                                    from_timestamp: parseInt(filename.split('-')[1]),
                                    to_timestamp: parseInt(filename.split('-')[0])
                                } ;
                                user_seq = filename.split('-')[2] ;
                                if ((auth_address == my_auth_address) && (user_seq == '' + my_user_seq)) {
                                    // current user. deletes are handled in z_update_5_public_chat
                                    continue ;
                                }
                                key = auth_address + '-' + user_seq ;
                                if (!compare_files2[key]) compare_files2[key] = { old_intervals: [], new_intervals: [] } ;
                                if (compare_files1[cache_filename].in_cache) compare_files2[key].old_intervals.push(interval_obj) ;
                                else compare_files2[key].new_intervals.push(interval_obj) ;
                            }
                            // debug('public_chat', pgm + 'compare_files2 (a) = ' + JSON.stringify(compare_files2)) ;
                            //compare_files2 = {
                            //    "1LVdWbEuZyXeWWVcbL7b12zQSWnXWtSod6-1": {
                            //        "old_intervals": [{
                            //            "from_timestamp": 1482839392212,
                            //            "to_timestamp": 1482839392212
                            //        }],
                            //        "new_intervals": []
                            //    }
                            //};
                            for (key in compare_files2) {
                                hash2 = compare_files2[key] ;
                                // step 2b - check timestamps for each auth_address and user_seq
                                // is timestamp in old cache files? is timestamp in new optional files?
                                hash2.timestamps = [] ;
                                // find all timestamps
                                for (i=0; i<hash2.old_intervals.length ; i++) {
                                    timestamp = hash2.old_intervals[i].from_timestamp ;
                                    if (hash2.timestamps.indexOf(timestamp) == -1) hash2.timestamps.push(timestamp) ;
                                    timestamp = hash2.old_intervals[i].to_timestamp ;
                                    if (hash2.timestamps.indexOf(timestamp) == -1) hash2.timestamps.push(timestamp) ;
                                }
                                for (i=0; i<hash2.new_intervals.length ; i++) {
                                    timestamp = hash2.new_intervals[i].from_timestamp ;
                                    if (hash2.timestamps.indexOf(timestamp) == -1) hash2.timestamps.push(timestamp) ;
                                    timestamp = hash2.new_intervals[i].to_timestamp ;
                                    if (hash2.timestamps.indexOf(timestamp) == -1) hash2.timestamps.push(timestamp) ;
                                }
                                for (i=hash2.timestamps.length-1 ; i>=0 ; i--) {
                                    timestamp = hash2.timestamps[i] ;
                                    hash2.timestamps.push(timestamp-1); // also check one milisecond before
                                    hash2.timestamps.push(timestamp+1); // also check one milisecond after
                                }
                                hash2.timestamps = hash2.timestamps.sort() ;
                                // check all timestamps
                                for (i=0 ; i<hash2.timestamps.length ; i++) {
                                    timestamp = hash2.timestamps[i] ;
                                    in_old = false ;
                                    for (j=0; j<hash2.old_intervals.length ; j++) {
                                        if ((timestamp >= hash2.old_intervals[j].from_timestamp) &&
                                            (timestamp <= hash2.old_intervals[j].to_timestamp)) {
                                            in_old = true ;
                                        }
                                    }
                                    in_new = false ;
                                    for (j=0; j<hash2.new_intervals.length ; j++) {
                                        if ((timestamp >= hash2.new_intervals[j].from_timestamp) &&
                                            (timestamp <= hash2.new_intervals[j].to_timestamp)) {
                                            in_new = true ;
                                        }
                                    }
                                    hash2.timestamps[i] = {
                                        timestamp: timestamp,
                                        in_old: in_old,
                                        in_new: in_new
                                    }
                                } // i
                                // step 2c - find contiguous deleted intervals with "in_old": true,  "in_new": false
                                hash2.deleted_intervals = [] ;
                                from_timestamp = null ;
                                to_timestamp = null ;
                                for (i=0 ; i<hash2.timestamps.length ; i++) {
                                    timestamp = hash2.timestamps[i].timestamp ;
                                    in_deleted_interval = (hash2.timestamps[i].in_old && !hash2.timestamps[i].in_new) ;
                                    if (from_timestamp) {
                                        // already in a deleted interval
                                        if (in_deleted_interval) continue ; // continued deleted interval
                                        // end of deleted interval
                                        to_timestamp = timestamp-1 ;
                                        hash2.deleted_intervals.push({
                                            from_timestamp: from_timestamp,
                                            to_timestamp: to_timestamp
                                        }) ;
                                        from_timestamp = null ;
                                        to_timestamp = null ;
                                    }
                                    else if (in_deleted_interval) {
                                        // start of a new deleted interval
                                        from_timestamp = timestamp ;
                                    }
                                } // for i
                                if (from_timestamp) {
                                    // end open deleted interval
                                    to_timestamp = timestamp ;
                                    hash2.deleted_intervals.push({
                                        from_timestamp: from_timestamp,
                                        to_timestamp: to_timestamp
                                    }) ;
                                }
                                // step 2d - check for deleted messages
                                if (hash2.deleted_intervals.length) {
                                    auth_address = key.split('-')[0] ;
                                    user_seq = parseInt(key.split('-')[1]) ;
                                    contact = null ;
                                    for (i=0 ; i<ls_contacts.length ; i++) {
                                        if ((ls_contacts[i].auth_address == auth_address) &&
                                            (ls_contacts[i].user_seq == user_seq)) {
                                            contact = ls_contacts[i] ;
                                            break ;
                                        }
                                    }
                                    if (!contact) {
                                        console.log(pgm + 'error. deleted chat file but cannot find contact with auth_address = ' +
                                            auth_address + ' and user_seq = ' + user_seq + '. compare_files1 = ' + JSON.stringify(compare_files1)) ;
                                        continue ;
                                    }
                                    debug('public_chat', pgm + 'check contact for deleted messages. contact = ' + JSON.stringify(contact)) ;
                                    for (i=contact.messages.length-1 ; i >= 0 ; i--) {
                                        message = contact.messages[i] ;
                                        if (!message.z_filename) continue ;
                                        if (message.folder != 'inbox') continue ;
                                        timestamp = message.sent_at ;
                                        in_deleted_interval = false ;
                                        for (j=0 ; j<hash2.deleted_intervals.length ; j++) {
                                            if ((timestamp >= hash2.deleted_intervals[j].from_timestamp) &&
                                                (timestamp <= hash2.deleted_intervals[j].to_timestamp)) in_deleted_interval = true ;
                                        }
                                        if (in_deleted_interval) {
                                            debug('public_chat', pgm + 'deleting public chat message ' + JSON.stringify(message)) ;
                                            js_messages_row = get_message_by_seq(message.seq) ;
                                            remove_message(js_messages_row) ;
                                            deleted_messages++ ;
                                        }

                                    }
                                }
                            } // for key
                            if (deleted_messages > 0) {
                                debug('public_chat', pgm + 'deleted_messages = ' + deleted_messages) ;
                                cb_status = 'updated';
                                // https://github.com/jaros1/Zeronet-Money-Network/issues/79#issuecomment-269359588
                                debug('public_chat', pgm + 'issue #79. query = ' + mn_query_15 + ', res = ' + JSON.stringify(res) +
                                    ', compare_files1 = ' + JSON.stringify(compare_files1) +
                                    ', compare_files2 = ' + JSON.stringify(compare_files2));
                            }
                        }
                        if (res.length == 0) return cb(cb_status || 'done') ;// no optional chat files were found

                        // console.log(pgm + 'res (1) = ' + JSON.stringify(res)) ;

                        // remove search results no longer within page context
                        for (i=res.length-1 ; i >= 0 ; i--) {
                            cache_filename = 'merged-' + get_merged_type() + '/' + res[i].hub + '/data/users/' + res[i].auth_address + '/' + res[i].filename ;
                            if (!file_within_chat_page_context(cache_filename)) {
                                res.splice(i,1) ;
                                // continue ;
                            }
                        } // for i
                        // check spam filter: ignored contacts
                        if (z_cache.user_setup.block_ignored) for (i=res.length-1 ; i >= 0 ; i--) {
                            unique_id = CryptoJS.SHA256(res[i].auth_address + '/'  + res[i].pubkey).toString();
                            contact = get_contact_by_unique_id(unique_id) ;
                            if (contact && (contact.type == 'ignored')) res.splice(i,1) ;
                        }
                        if (res.length == 0) return cb(cb_status || 'done') ;

                        // extend cb.
                        var cb2 = function (cb2_status) {
                            if ([cb_status, cb2_status].indexOf('updated') != -1) return cb('updated') ;
                            else if (cb2_status == 'done') return cb('done') ;
                            else return cb() ;
                        };

                        // any already downloaded but not yet loaded public chat messages?
                        for (i=0 ; i < res.length ; i++) {
                            //if (res[i].size == 2) continue ; // logical deleted json file
                            cache_filename = 'merged-' + get_merged_type() + '/' + res[i].hub + '/data/users/' + res[i].auth_address + '/' + res[i].filename ;
                            cache_status = files_optional_cache[cache_filename] ;
                            if (cache_status) {
                                if (cache_status.is_pending) {
                                    // ignore and delete - is being process by an other process - and delete res
                                    res[i].delete = true ;
                                    continue ;
                                }
                                if (!cache_status.timestamps) continue ; // must be a failed fileGet. see next steps
                            }

                            // todo: auth_address == my_auth_address not correct for different machines using same user cert.
                            //       optional file download from other machine failed. downloaded = false and no timestamps array
                            //12:56:42.123 all.js:15751 MoneyNetworkService.get_public_chat dbQuery callback 3: issue #84. cache_status.timestamps is null.
                            //res[1] = {
                            //    "guest": null,
                            //    "hub": "1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh",
                            //    "from_timestamp": 1508145257162,
                            //    "filename": "1508145257162-1508145257162-2-chat.json",
                            //    "to_timestamp": 1508145257162,
                            //    "auth_address": "18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ",
                            //    "user_seq": 2,
                            //    "pubkey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0pMuMJyynH1BmhMJ6vvd\nQZplIBgiiOQSqwu2SpYKICm+P1gGNHnICQic/Nuqi9t93rxJLfWCsl0+lCtoJLen\nf78xz4XzEcGPBeBFn2TbQqPO9loylNlaOgiqDG5qcSc9n7yEF0xmpReDGATwzECi\nJrpZBImwhUMO48iS08b4IfQaMsbnUVY8hdUeJiQ831kMkNQLtxWaeRiyn8cTbKQ6\nLXCDG7GDaFN6t+x3cv/xBX06+ykuYQ0gNIBySiIz69RYzhvOkqOQggLWPF+NMW1J\nO6VRqvX7Sybwm51v3kGGKWeX4znvGY+GwVCpwiH+b2hbGZHIqFp9ogimGVE0WPgu\nnwIDAQAB\n-----END PUBLIC KEY-----",
                            //    "size": 341,
                            //    "delete": true
                            //},
                            //cache_status = {
                            //    "is_downloaded": false,
                            //    "is_pending": false,
                            //    "size": 341,
                            //    "download_failed_at": [1508151402020]
                            //}
                            //12:56:42.123 all.js:15754 Uncaught TypeError: Cannot read property 'length' of undefined
                            //at Object.<anonymous> (all.js:15754)
                            //at ZeroFrame.onMessage (30-ZeroFrame.js:42)
                            //at 30-ZeroFrame.js:7
                            //(anonymous) @ all.js:15754
                            //ZeroFrame.onMessage @ 30-ZeroFrame.js:42
                            //(anonymous) @ 30-ZeroFrame.js:7

                            if ((res[i].auth_address == my_auth_address) || (cache_status && cache_status.is_downloaded)) {
                                // is either
                                // - my public public outbox chat messages
                                // - my public inbox chat messages from other local accounts using same certificate
                                // - already downloaded public inbox chat messages from other users
                                res[i].delete = true ;
                                if (!cache_status) {
                                    debug('public_chat', pgm + 'found public outbox chat file within page context') ;
                                    get_and_load_chat_file(cache_filename, res[i].size, null, cb2) ;
                                    return ;
                                }
                                debug('public_chat', pgm + 'files_optional_cache[' + cache_filename + '] = ' + JSON.stringify(cache_status)) ;
                                //if (!cache_status.is_downloaded) {
                                //    console.log(pgm + 'error. expected status is_downloaded to be true. cache_filename = ' + cache_filename + ', cache_status = ' + JSON.stringify(cache_status)) ;
                                //    continue ;
                                //}
                                if (cache_status.timestamps && (cache_status.timestamps.length == 0)) {
                                    // console.log(pgm + 'all messsages in ' + cache_filename + ' have already been loaded') ;
                                    continue ;
                                }
                                if (chat_page_context.end_of_page) {
                                    debug('public_chat', pgm + 'found not completely loaded public chat outbox file within page context') ;
                                    get_and_load_chat_file(cache_filename, res[i].size, null, cb2) ;
                                    return ;
                                }
                                // any not yet read messages within page context in this file?
                                if (!cache_status.timestamps) {
                                    // JS error after public post #84. should not  be a problem any longer ...
                                    console.log(pgm + 'issue #84. cache_status.timestamps is null. res[' + i + '] = ' + JSON.stringify(res[i]) +
                                        ', cache_status = ' + JSON.stringify(cache_status));
                                }
                                for (j=0 ; j<cache_status.timestamps.length ; j++) {
                                    if (cache_status.timestamps[j] < chat_page_context.last_bottom_timestamp) continue ;
                                    get_and_load_chat_file(cache_filename, res[i].size, null, cb2) ;
                                    return ;
                                } // for j (timestamps)
                            } // if
                        } // for i (res)

                        // remove pending and already downloaded from res
                        for (i=res.length-1 ; i >= 0 ; i--) if (res[i].delete) res.splice(i,1) ;
                        if (res.length == 0) return cb(cb_status || 'done') ;

                        // finished processing already downloaded chat files within actual chat page context
                        // continue with not yet downloaded chat files within actual chat page context

                        // check download failures withín the last hour. max 1 failure is allowed for a optional file
                        // todo: what about running ui-server but offline internet? lots of download failures. but maybe offline internet already is reported in ZeroNet UI? (Content publish failed message only)
                        one_hour_ago = new Date().getTime() - 1000*60*60 ;
                        for (i=res.length-1 ; i >= 0 ; i--) {
                            cache_filename = 'merged-' + get_merged_type + '/' + res[i].hub + '/data/users/' + res[i].auth_address + '/' + res[i].filename;
                            cache_status = files_optional_cache[cache_filename];
                            res[i].download_failed_at = [] ;
                            if (cache_status && cache_status.download_failed_at) {
                                // check timestamps in cache_status.download_failed_at array
                                for (j=cache_status.download_failed_at.length-1 ; j>=0 ; j--) {
                                    timestamp = cache_status.download_failed_at[j] ;
                                    if (timestamp > one_hour_ago) res[i].download_failed_at.push(timestamp) ;
                                    else cache_status.download_failed_at.splice(j,1) ;
                                }
                            }
                            if (res[i].download_failed_at.length > 1) res.splice(i,1) ;
                        } // for i
                        if (res.length == 0) return cb(cb_status || 'done') ;

                        // random sort. just to check number of peers for different files every time
                        res.sort(function(a, b){return 0.5 - Math.random()}) ;
                        debug('public_chat', pgm + 'done with already downloaded public chat files' + '. res = ' + JSON.stringify(res)) ;

                        // get number of peers serving optional files.
                        // callback loop starting with res[0].
                        // check max 10 files. looking for optional files with many peers
                        // prefer files without download failure
                        get_no_peers = function (cb2) {
                            var pgm = service + '.get_public_chat get_no_peers: ';
                            var i, j, max_peers, max_peers_i, max_peers_ok, max_peers_ok_i, max_peers_failed, max_peers_failed_i, cache_filename, cache_status ;
                            max_peers_ok = -1;
                            max_peers_failed = -1;
                            i = -1 ;

                            // find next file to check peer for
                            for (j=0 ; j<res.length ; j++) {
                                if (res[j].hasOwnProperty('peer')) {
                                    // already checked. Remember file with most peers
                                    if (res[j].download_failed_at[0]) {
                                        // Error - download failure for this file
                                        if (res[j].peer > max_peers_ok) {
                                            max_peers_failed = res[j].peer ;
                                            max_peers_failed_i = j ;
                                        }
                                    }
                                    else {
                                        // OK - no download failure for this file
                                        if (res[j].peer > max_peers_ok) {
                                            max_peers_ok = res[j].peer ;
                                            max_peers_ok_i = j ;
                                        }
                                    }
                                }
                                else {
                                    i = j ;
                                    break ;
                                }
                            } // for j

                            if (max_peers_ok == -1) {
                                // UPS: all download have failed
                                max_peers = max_peers_failed ;
                                max_peers_i = max_peers_failed_i ;
                            }
                            else {
                                max_peers = max_peers_ok ;
                                max_peers_i = max_peers_ok_i ;
                            }

                            // get peer info for next file. check minimum 10 files. looking for file with peer >= 3
                            if ( (i != -1) &&
                                ((i <= 10) || ((i > 10) && (max_peers < 3)))) {
                                // get number of peers for file i
                                cache_filename = 'merged-' + get_merged_type() + '/' + res[i].hub + '/data/users/' + res[i].auth_address + '/' + res[i].filename;
                                ZeroFrame.cmd("optionalFileInfo", [cache_filename], function (file_info) {
                                    var pgm = service + '.get_public_chat optionalFileInfo callback 2 : ';
                                    var cache_status ;
                                    cache_status = files_optional_cache[cache_filename] ;
                                    debug('public_chat', pgm + 'cache_filename = ' + cache_filename +
                                        ', cache_status = ' + JSON.stringify(cache_status) +
                                        ', file_info = ' + JSON.stringify(file_info));
                                    if (!file_info) {
                                        res[i].peer = 0 ;
                                    }
                                    else {
                                        res[i].peer = file_info.peer ;
                                    }
                                    if (res[i].peer == 0) res.splice(i,1) ;
                                    if (res.length == 0) return cb2('done') ;
                                    // continue with next file
                                    get_no_peers(cb2);
                                }) ; // optionalFileInfo callback 2
                                // stop. optionalFileInfo callback will continue loop
                                return ;
                            }

                            // done / end loop. found file with peer >= 3 or have downloaded peer info for all files
                            debug('public_chat', pgm + 'max_peers = ' + max_peers_ok + ', max_peers_i = ' + max_peers_ok_i) ;
                            debug('public_chat', pgm + 'res = ' + JSON.stringify(res)) ;
                            if (res.length == 0) { cb2('done') ; return }

                            // download optional file. file with most peers or random file
                            i = max_peers_i || Math.floor(Math.random() * res.length) ;
                            debug('public_chat', pgm + 'selected res[' + i + '] = ' + JSON.stringify(res[i])) ;
                            cache_filename = 'merged-' + get_merged_type() + '/' + res[i].hub + '/data/users/' + res[i].auth_address + '/' + res[i].filename;

                            debug('public_chat', pgm + 'get and load chat file ' + cache_filename);
                            get_and_load_chat_file(cache_filename, res[i].size, null, cb2) ;
                        };
                        get_no_peers(cb2) ;

                    }) ; // dbQuery callback 3

                }) ; // get_user_seq callback 2

            }) ; // get_my_user_hub callback 1

        } // get_public_chat


        // actual chat page context for file
        // filename: data/users/<auth_address>/<to unixtimestamp>-<from unixtimestamp>-<user seq>-chat.json
        // - check contact (auth_address and user_seq)
        // - check to unixtimestamp (timestamp for last row on chat page)
        function file_within_chat_page_context(filename) {
            var pgm = service + '.file_within_chat_page_context: ' ;
            if (!z_cache.user_setup.public_chat) return false ; // public chat disabled. Ignore all optional files
            // filename = data/users/16R2WrLv3rRrxa8Sdp4L5a1fi7LxADHFaH/1482650949292-1482495755468-1-chat.json
            if (chat_page_context.contact) {
                auth_address = filename.split('/')[2] ;
                user_seq = parseInt(filename.split('-')[2]) ;
                if ((auth_address != chat_page_context.contact) || (user_seq != chat_page_context.contact.user_seq)) {
                    // debug('public_chat', pgm + 'ignoring chat file from other contacts ' + filename) ;
                    return false ;
                }
            }
            if (chat_page_is_empty()) return true ;
            if (!chat_page_context.end_of_page && !chat_page_context.last_bottom_timestamp) {
                debug('public_chat', pgm + 'page not ready. bottom_timestamp is null. ignoring chat file ' + filename) ;
                return false ;
            }
            var auth_address, user_seq, to_timestamp ;
            if (!chat_page_context.end_of_page) {
                to_timestamp = parseInt(filename.split('/')[3].split('-')[0]) ;
                if (to_timestamp < chat_page_context.last_bottom_timestamp) {
                    // ignore public chat message not within page timestamp
                    //debug('public_chat', pgm + 'ignoring chat file. filename = ' + filename) ;
                    //debug('public_chat', pgm + 'ignoring chat file. file timestamp ' + date(to_timestamp, 'yyyy-MM-dd HH:mm:ss Z') +
                    //    ', bottom scroll timestamp = ' + date(chat_page_context.last_bottom_timestamp, 'yyyy-MM-dd HH:mm:ss Z')) ;
                    return false ;
                }
            }
            return true ;
        } // file_within_chat_page_context


        function byteCount(s) {
            return encodeURI(s).split(/%..|./).length - 1;
        }


        // sometimes problem with lost Merger:MoneyNetwork permission
        // maybe a ZeroNet bug. maybe a problem after migrating MoneyNetwork to a merger site.
        // check and ensure Merger:MoneyNetwork before file operations
        // no mergerSiteAdd. assuming lost Merger:MoneyNetwork is the problem
        function request_merger_permission (calling_pgm, cb) {
            console.log(calling_pgm + 'Error: Merger:MoneyNetwork permission was lost. Please check console.log and UI server log') ;
            ZeroFrame.cmd("wrapperPermissionAdd", "Merger:MoneyNetwork", function (res) {
                // continue anyway
                cb() ;
            }) ; // wrapperPermissionAdd callback
        } // request_merger_permission
        function check_merger_permission (calling_pgm, cb) {
            moneyNetworkHubService.check_merger_permission(calling_pgm, cb) ;
        }
        //function check_merger_permission (calling_pgm, cb) {
        //    var pgm = service + '.check_merger_permission: ' ;
        //    ZeroFrame.cmd("siteInfo", {}, function (site_info) {
        //        var pgm = service + '.check_merger_permission siteInfo callback 1: ';
        //        // console.log(pgm , 'site_info = ' + JSON.stringify(site_info)) ;
        //        if (site_info.settings.permissions.indexOf("Merger:MoneyNetwork") == -1) return request_merger_permission(calling_pgm, cb);
        //        // Merger:MoneyNetwork OK
        //        cb() ;
        //    }) ; // siteInfo callback
        //} // check_merger_permission


        // get and load chat file. called from  get_public_chat
        // params:
        // - cache_filename: inner_path to public chat file
        // - expected_size: from dbQuery or content.json file - request new download if size has changed
        // - timestamp: force load public chat message with this timestamp - process_incoming_message - received reaction
        function get_and_load_chat_file(cache_filename, expected_size, read_timestamp, cb) {
            var pgm = service + '.get_and_load_chat_file: ';
            var my_auth_address ;
            if (!z_cache.user_setup.public_chat && !read_timestamp) {
                console.log(pgm + 'error. ignoring get_and_load_chat_file call for ' + cache_filename + '. public chat is disabled');
                return cb('done') ;
            }

            check_merger_permission(pgm, function() {
                // get user_seq. used later when setting folder (inbox/outbox) for public chat messages
                my_auth_address = ZeroFrame.site_info.auth_address ;
                get_user_seq(function (my_user_seq) {
                    var pgm = service + '.get_and_load_chat_file get_user_seq callback 1: ';
                    var cache_status, cb2, debug_seq, file_get_callback_2;

                    // check cache status for optional file
                    cache_status = files_optional_cache[cache_filename];
                    if (!cache_status) {
                        // data/users/16R2WrLv3rRrxa8Sdp4L5a1fi7LxADHFaH/1482650949292-1482495755468-1-chat.json
                        cache_status = {
                            is_downloaded: false,
                            is_pending: false
                        };
                        files_optional_cache[cache_filename] = cache_status;
                    }

                    // todo: lost Merger:MoneyNetwork after fileGet operation to a bad file?
                    if (bad_files.indexOf(cache_filename) != -1) {
                        cache_status.is_downloaded = false;
                        if (!cache_status.download_failed_at) cache_status.download_failed_at = [] ;
                        cache_status.download_failed_at.push(new Date().getTime()) ;
                        chat_page_context.failures.push(cache_filename) ;
                        console.log(pgm + 'download aborted for bad file ' + cache_filename + ', failures = ' + chat_page_context.failures.length) ;
                        return cb() ;
                    }


                    if (cache_status.is_pending) {
                        debug('public_chat', pgm + 'aborting request. fileGet request is already running for ' + cache_filename);
                        return cb();
                    }
                    if (cache_status.is_downloaded && cache_status.timestamps && (cache_status.timestamps.length == 0)) {
                        debug('public_chat', pgm + 'aborting request. all messages in ' + cache_filename + ' file have already been read');
                        return cb();
                    }

                    // extend cb. check processes also waiting for this fileGet operation to finish
                    cb2 = function(status) {
                        cb(status) ;
                        // execute any pending callback operations from process_incoming_message (reaction waiting for this fileGet operation to finish)
                        if (cache_status.hasOwnProperty('callbacks')) while (cache_status.callbacks.length) cache_status.callbacks.shift()() ;
                    }; // cb2
                    // read optional file. can take some time depending of number of peers
                    cache_status.is_pending = true;

                    // fileGet with callback. wait max 60 seconds for optional chat file.
                    z_file_get(pgm, {inner_path: cache_filename, required: true, timeout: 60}, function (chat) {
                        var pgm = service + '.get_and_load_chat_file z_file_get callback 2: ';
                        var i, page_updated, timestamp, j, k, message, local_msg_seq, message_with_envelope, contact,
                            file_auth_address, file_user_seq, z_filename, folder, renamed_chat_file, old_timestamps,
                            new_timestamps, deleted_timestamps, old_z_filename, old_cache_filename, old_cache_status,
                            image, byteAmount, chat_bytes, chat_length, error, auth_address, index, break_point,
                            reactions_index, reactions_info, file_hub ;
                        // update cache_status
                        cache_status.is_pending = false;
                        debug('public_chat', pgm + 'downloaded ' + cache_filename) ; // + ', chat = ' + chat);
                        if (!chat) {
                            cache_status.is_downloaded = false;
                            if (!cache_status.download_failed_at) cache_status.download_failed_at = [] ;
                            cache_status.download_failed_at.push(new Date().getTime()) ;
                            chat_page_context.failures.push(cache_filename) ;
                            console.log(pgm + 'download failed for ' + cache_filename + ', failures = ' + chat_page_context.failures.length) ;
                            return cb2() ;
                        } // test
                        // cache_filename = merged-MoneyNetwork/1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh/data/users/13CMaVD3fimSq8Zr1Xr3UkbZqhA8BupBAf/1495700749498-1495700684383-1-chat.json
                        file_hub = cache_filename.split('/')[1] ;
                        file_auth_address = cache_filename.split('/')[4] ;
                        file_user_seq = parseInt(cache_filename.split('-')[3]) ;
                        debug('public_chat', pgm + 'file_hub = ' + file_hub + ', file_auth_address = ' + file_auth_address + ', file_user_seq = ' + file_user_seq);

                        // check json size. Problem with compressed images!
                        chat_length = chat.length ;
                        chat_bytes = unescape(encodeURIComponent(chat)).length ;
                        if (chat_length != chat_bytes) {
                            // image in chat file. Maybe compressed with UTF-16 characters. Print out different length alternatives for debugging
                            debug('public_chat', pgm + 'special characters in file ' + cache_filename + '. problem with length and utf-16 characters') ;
                            byteAmount = unescape(encodeURIComponent(chat)).length ;
                            debug('public_chat', pgm + '0: expected_size = ' + expected_size) ;
                            debug('public_chat', pgm + '1: chat.length   = ' + chat.length);
                            debug('public_chat', pgm + '2: byteAmount    = ' + chat_bytes + ' - select currently');
                            debug('public_chat', pgm + '3: byteCount     = ' + byteCount(chat)) ;
                            chat_length = chat_bytes ;
                        }
                        if (expected_size != chat_length) {
                            debug('public_chat', 'changed size for ' + cache_filename + ' . expected size ' + expected_size + ', found size ' + chat_length);
                            if ((file_auth_address == my_auth_address) && (file_user_seq == my_user_seq)) {
                                // size in content.json is invalid. publish!
                                debug('public_chat', pgm + 'size in content.json is invalid. publish');
                                zeronet_site_publish({reason: cache_filename});
                            }
                            else {
                                // file must be old/changed. trigger a new file download
                                // debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_delete', pgm + cache_filename + ' optionalFileDelete') ;
                                debug_seq = debug_z_api_operation_start(pgm, cache_filename, 'optionalFileDelete', show_debug('z_file_delete')) ;
                                ZeroFrame.cmd("optionalFileDelete", {inner_path: cache_filename}, function (res) {
                                    // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                    debug_z_api_operation_end(debug_seq, format_res(res)) ;
                                });
                            }
                            // chat page must call get_publish_chat again even if no messages were read
                            return cb2();
                        }
                        cache_status.size = chat_length;
                        cache_status.is_downloaded = true;
                        debug('public_chat', pgm + 'cache_status = ' + JSON.stringify(cache_status)) ;

                        // validate -chat,json file. ignore file if content is invalid
                        error = null ;
                        try { chat = JSON.parse(chat) }
                        catch (e) { error = 'Invalid json file: ' + e.message }
                        if (!error) error = MoneyNetworkHelper.validate_json (pgm, chat, 'chat-file', 'Invalid json file') ;
                        if (error) {
                            console.log(pgm + 'Chat file ' + cache_filename + ' is invalid. error = ' + error) ;
                            cache_status.timestamps = [] ;
                            return cb2() ;
                        }

                        // read chat msg and copy timestamps to cache_status object
                        if (!cache_status.timestamps) {
                            // first read. copy message timestamps into cache_status object
                            cache_status.timestamps = [];
                            if (!chat.msg) {
                                // empty chat file - logical deleted chat file
                                debug('public_chat', pgm + 'empty chat file. call optionalFileDelete?');
                                chat.msg = [] ;
                            }
                            for (i = 0; i < chat.msg.length; i++) cache_status.timestamps.push(chat.msg[i].timestamp);
                        }
                        if (cache_status.timestamps.length == 0) {
                            debug('public_chat', pgm + 'warning. no unread messages in file ' + cache_filename);
                            return cb2();
                        }
                        // is file still within page chat context?
                        if (!z_cache.user_setup.public_chat && !read_timestamp) {
                            debug('public_chat', pgm + 'ignoring get_and_load_chat_file call for ' + cache_filename + '. public chat has been disabled');
                            return cb2('done') ;
                        }
                        if (!read_timestamp && !file_within_chat_page_context(cache_filename)) {
                            debug('public_chat', pgm + 'file ' + cache_filename + ' is no longer within page context');
                            return cb2();
                        }
                        // find contact
                        // cache_filename = merged-MoneyNetwork/1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh/data/users/13CMaVD3fimSq8Zr1Xr3UkbZqhA8BupBAf/1495700749498-1495700684383-1-chat.json
                        z_filename = cache_filename.split('/')[5] ;
                        debug('public_chat',
                            pgm + 'file_auth_address = ' + file_auth_address + ', file_user_seq = ' + file_user_seq +
                            ', ZeroFrame.site_info.auth_address = ' + ZeroFrame.site_info.auth_address + ', my_user_seq = ' + my_user_seq);
                        if ((file_auth_address == ZeroFrame.site_info.auth_address) && (file_user_seq == my_user_seq)) {
                            // loading current user public outbox chat messages
                            folder = 'outbox' ;
                            contact = get_public_contact(true);
                        }
                        else {
                            // loading other contact public inbox chat messages
                            folder = 'inbox' ;
                            contact = null ;
                            for (i=0 ; i<ls_contacts.length ; i++) {
                                // console.log(pgm + 'contact[' + i + ']: auth_address = ' + ls_contacts[i].auth_address + ', user_seq = ' + ls_contacts[i].user_seq + ', type = ' + ls_contacts[i].type) ;
                                if ((ls_contacts[i].auth_address == file_auth_address) && (ls_contacts[i].user_seq == file_user_seq)) {
                                    contact = ls_contacts[i];
                                    break ;
                                }
                            }
                            if (!contact) {
                                debug('public_chat', pgm + 'contact with auth_address ' + file_auth_address + ' and user_seq ' + file_user_seq + ' was not found. ' +
                                    'cannot read messages in ' + cache_filename) ;
                                // contact with auth_address 16R2WrLv3rRrxa8Sdp4L5a1fi7LxADHFaH and user_seq 1 was not found.
                                // cannot read messages in data/users/16R2WrLv3rRrxa8Sdp4L5a1fi7LxADHFaH/1482768400248-1482768400248-1-chat.json
                                debug('public_chat', pgm + 'create unknown contact and retry reading chat file ' + cache_filename + '. todo: endless loop if contact is not found. There must also be an other error but should stop reading this chat file instead of endless loop ...') ;
                                // run contact search for this auth_address only
                                z_contact_search (function (no_contacts) {
                                    debug('public_chat', pgm + 'z_contact_search returned no_contacts = ' + no_contacts) ;
                                    if (no_contacts == 0) {
                                        debug('public_chat', pgm + 'error. could not find contact with auth_address ' + file_auth_address + ' and user_seq ' + file_user_seq + '. ' +
                                            'marked ' + cache_filename + ' as read to prevent endless looping') ;

                                        cache_status.timestamps = [] ;
                                    }
                                    cb2()
                                }, file_auth_address, file_user_seq) ;
                                return  ;
                            }
                        }
                        // read any message with timestamps within current chat page context
                        page_updated = null;
                        renamed_chat_file = false ;
                        for (i = cache_status.timestamps.length - 1; i >= 0; i--) {
                            timestamp = cache_status.timestamps[i];
                            if (folder == 'inbox') {
                                // deleted public chat inbox message?
                                reactions_index = timestamp + ',' + contact.auth_address.substr(0,4) ;
                                reactions_info = ls_reactions[reactions_index] ;
                                if (reactions_info && reactions_info.deleted_at) {
                                    debug('public_chat', pgm + 'skipping ignoring deleted public chat inbox message with reactions_index ' + reactions_index) ;
                                    cache_status.timestamps.splice(i, 1);
                                    continue;
                                }
                            }
                            if (read_timestamp) {
                                // special get_and_load_chat_file call from process_incoming_message - searching for a specific message
                                if (timestamp != read_timestamp) continue ;
                            }
                            else {
                                if (!chat_page_context.end_of_page && (timestamp < chat_page_context.last_bottom_timestamp)) continue;
                            }
                            j = -1;
                            for (k = 0; k < chat.msg.length; k++) if (chat.msg[k].timestamp == timestamp) j = k;
                            if (j == -1) {
                                console.log(pgm + 'Error. Message with timestamp ' + timestamp + ' was not found in chat file ' + cache_filename);
                                cache_status.timestamps.splice(i, 1);
                                continue;
                            }
                            // found message within page context
                            // check if message already has been loaded into chat page from an other older now deleted chat file
                            message = null ;
                            for (j=0 ; j<contact.messages.length ; j++) {
                                if (contact.messages[j].sent_at == timestamp) {
                                    message = contact.messages[j] ;
                                    break ;
                                }
                            } // for j (messages)
                            if (message) {
                                old_z_filename = message.z_filename ;
                                old_cache_filename = 'merged-' + get_merged_type() + '/' + contact.hub + '/data/users/' + contact.auth_address + '/' + old_z_filename ;
                                old_cache_status = files_optional_cache[old_cache_filename] ;

                                debug('public_chat', pgm + 'found old already read message in a new chat file. timestamp = ' + timestamp);
                                debug('public_chat', pgm + 'old z_filename = ' + old_z_filename + ', new_z_filename = ' + z_filename) ;
                                debug('public_chat', pgm + 'old cache_filename = ' + old_cache_filename + ', new cache_filename = ' + cache_filename) ;
                                debug('public_chat', pgm + 'old cache_status = ' + JSON.stringify(old_cache_status) + ', new cache_status = ' + JSON.stringify(cache_status)) ;

                                if (!renamed_chat_file) {
                                    debug('public_chat', pgm + 'todo: rename z_filename and check for deleted messages. messages in old chat file but not in new chat file');
                                    new_timestamps = [] ;
                                    for (j=0 ; j<chat.msg.length ; j++) new_timestamps.push(chat.msg[j].timestamp);
                                    deleted_timestamps = [] ;
                                    for (j=0 ; j<contact.messages.length ; j++) {
                                        if (contact.messages[j].z_filename == old_z_filename) {
                                            if (new_timestamps.indexOf(contact.messages[j].sent_at) == -1) deleted_timestamps.push(contact.messages[j].sent_at);
                                            else contact.messages[j].z_filename = z_filename;
                                        }
                                    }

                                    debug('public_chat', pgm + 'new_timestamps = ' + JSON.stringify(new_timestamps) +
                                        ', deleted_timestamps = ' + JSON.stringify(deleted_timestamps));

                                }
                                renamed_chat_file = true ;
                                cache_status.timestamps.splice(i,1) ;
                                continue ;
                            }

                            // load message into ls_contacts array and remove timestamp from cache_status.timestamps
                            message = {
                                msgtype: 'chat msg',
                                message: chat.msg[i].message
                            };
                            image = null ;
                            if (chat.msg[i].image) {
                                if (chat.msg[i].storage && chat.msg[i].storage.image) {
                                    // only c1 = compress1 is supported
                                    if (chat.msg[i].storage.image == 'c1') image = MoneyNetworkHelper.decompress1(chat.msg[i].image);
                                    else console.log(pgm + 'unknown storage option ' + chat.msg[i].storage.image + ' for image in file ' + cache_filename);
                                }
                                else image = chat.msg[i].image;
                            }
                            if (image) {
                                // check allowed image types
                                if (get_image_ext_from_base64uri(image)) message.image = image;
                                else debug('public_chat', pgm + 'ignoring image with unknown extension in file ' + cache_filename) ;
                            }
                            if (chat.msg[i].parent) message.parent = chat.msg[i].parent ; // comment or nested comment
                            local_msg_seq = next_local_msg_seq();
                            message_with_envelope = {
                                local_msg_seq: local_msg_seq,
                                folder: folder,
                                message: message,
                                sent_at: chat.msg[i].timestamp,
                                z_filename: z_filename
                            };
                            //// todo: remove reaction initialization? See add_message
                            //// lookup reaction for public chat in like.json file
                            //auth_address = folder == 'outbox' ? ZeroFrame.site_info.auth_address : contact.auth_address ;
                            //index = message_with_envelope.sent_at + ',' + auth_address.substr(0,4) + ',p' ;
                            //
                            //// TypeError: z_cache.like_json_index is undefined[Learn More]  all.js:9538:1
                            //// get_and_load_chat_file/</< https://bit.no.com:43110/moneynetwork.bit/js/all.js:9538:1
                            //// ZeroFrame.prototype.onMessage https://bit.no.com:43110/moneynetwork.bit/js-external/30-ZeroFrame.js:41:17
                            ////     bind/<
                            //if (!z_cache.like_json_index) {
                            //    console.log(pgm + 'error. get_and_load_chat_file is called before get_like_json and like.json file has not been loaded into z_cache');
                            //}
                            //else if (z_cache.like_json_index.hasOwnProperty(index)) {
                            //    j = z_cache.like_json_index[index] ;
                            //    message_with_envelope.reaction = z_cache.like_json.like[j].emoji ;
                            //}
                            message_with_envelope.ls_msg_size = 0; // ZeroNet and browser size 0 for all public chat messages
                            debug('public_chat', pgm + 'folder = ' + folder + ', message_with_envelope = ' + JSON.stringify(message_with_envelope));
                            add_message(contact, message_with_envelope, false);
                            cache_status.timestamps.splice(i,1) ;
                            page_updated = 'updated';
                        } // for i
                        // callback to chatCtrl, update UI and maybe read more optional files with public chat messages
                        cb2(page_updated);

                    }); // file_get_callback_2

                }) ; // get_user_seq callback 1

            }) ; // check_merger_permission callback 0

        } // get_and_load_chat_file

        // administrator helpers. cleanup old inactive users. delete test users etc
        function get_no_days_before_cleanup () {
            return moneyNetworkHubService.get_no_days_before_cleanup() ;
        }
        function is_admin () {
            return moneyNetworkHubService.is_admin() ;
        }
        function get_admin_key() {
            return moneyNetworkHubService.get_admin_key() ;
        }
        function clear_admin_key() {
            moneyNetworkHubService.clear_admin_key() ;
        }

        function cleanup_inactive_users() {
            moneyNetworkHubService.cleanup_inactive_users();
        } // cleanup_inactive_users

        // MoneyNetwork was previously a non merger site with data under data/users/...
        // MoneyNetwork is now a merger site with data under merged-MoneyNetwork/<hub>/data/users/...
        // data folder should be deleted manuelly. all use of API functions to delete content has failed
        function cleanup_non_merger_site_data () {
            var pgm = service + '.cleanup_non_merger_site_data: ' ;

            // any files under data/ ?
            ZeroFrame.cmd("fileList", ['data'], function(files) {
                var pgm = service + '.cleanup_non_merger_site_data fileList callback 1: ' ;
                var text ;
                console.log(pgm + 'files.length = ' + files.length) ;
                if (!files.length) return ;

                text = 'MoneyNetwork is now a merger site.<br>Please delete folder:<br>' + ZeroFrame.site_info.address + '/data<br>folder';
                ZeroFrame.cmd("wrapperNotification", ['info', text, 10000]);

            }) ; // fileList callback 1

        } // cleanup_non_merger_site_data

        function client_login(password, create_new_account, guest, keysize) {
            var pgm = service + '.client_login: ' ;
            var login, passwords, password_sha256, i, salt ;
            console.log(pgm + 'create_new_account = ' + create_new_account) ;
            // login/register with a empty password?
            // See "encrypted in your browser (localStorage)" checkbox in Auth page
            // login: true: use password, false: use blank password
            login = JSON.parse(MoneyNetworkHelper.getItem('login')) ;
            if (!login && (password == '')) {
                passwords = MoneyNetworkHelper.getItem('passwords') ;
                if (!passwords) create_new_account = true ;
                else {
                    try {
                        passwords = JSON.parse(passwords) ;
                    }
                    catch (e) {
                        console.log(pgm + 'error. passwords was invalid. error = ' + e.message) ;
                        passwords = [] ;
                    }
                    salt = MoneyNetworkHelper.getItem('salt') || '' ; // null for old users
                    password_sha256 = MoneyNetworkHelper.sha256(salt + password) ;
                    create_new_account = true ;
                    for (i=0 ; i<passwords.length ; i++) if (passwords[i] == password_sha256) create_new_account = false ;
                }
                console.log(pgm + 'create_new_account = ' + create_new_account + ' (after checking existing user accounts)') ;
                guest = false ;
                if (create_new_account) keysize = 256 ;
                console.log(service + ': Log in disabled. ' + (create_new_account ? 'Register' : 'Login') + ' with empty password') ;
            }

            // login or register. update sessionStorage and localStorage
            if (!create_new_account) { guest = false ; keysize = 0 }
            z_cache.user_id = MoneyNetworkHelper.client_login(password, create_new_account, keysize);
            if (z_cache.user_id) {
                if (create_new_account && guest) MoneyNetworkHelper.setItem('guestid', z_cache.user_id);
                // my unique id in group chats
                // load user information from localStorage
                load_user_setup(keysize) ;
                load_avatar() ;
                load_user_info(create_new_account, guest) ;
                ls_load_reactions() ;
                ls_load_contacts() ;
                init_emojis_short_list() ;
                local_storage_read_messages() ;
                recheck_old_decrypt_errors() ;
                check_image_download_failed() ;
                i_am_online() ;
                load_user_contents_max_size() ;
                // load_my_public_chat() ;
                update_chat_notifications() ;
                cleanup_inactive_users() ;
                // cleanup_non_merger_site_data() ;
                moneyNetworkWService.w_login() ;
            }
            return z_cache.user_id ;
        } // client_login
        function get_user_id () { return z_cache.user_id }

        // login_setting_changed: true: auth page. "login" changed. no need for notifications and redirect
        function client_logout(login_setting_changed) {
            // notification
            var key, a_path, z_path ;
            if (!login_setting_changed) ZeroFrame.cmd("wrapperNotification", ['done', 'Log out OK', 3000]);
            // clear sessionStorage
            MoneyNetworkHelper.client_logout();
            // clear all JS work data in MoneyNetworkService
            for (key in ls_reactions) delete ls_reactions[key] ;
            clear_contacts() ;
            clear_messages() ;
            watch_receiver_sha256.splice(0, watch_receiver_sha256.length);
            for (key in ignore_zeronet_msg_id) delete ignore_zeronet_msg_id[key] ;
            avatar.src = "public/images/avatar1.png" ;
            avatar.loaded = false;
            for (key in z_cache) delete z_cache[key] ;
            z_cache.my_files_optional = {} ;
            z_cache.user_id = 0 ;
            z_cache.user_info = [] ;
            z_cache.my_unique_id = null ;
            moneyNetworkZService.clear_user_contents_max_size() ;
            clear_admin_key() ;
            z_cache.user_setup = {} ;
            for (key in chat_page_context) delete chat_page_context[key] ;
            chat_page_context.no_processes = 0 ;
            chat_page_context.end_of_page = true ;
            chat_page_context.failures = [] ;
            clear_files_optional_cache() ;
            for (key in watch_like_msg_id) delete watch_like_msg_id[key] ;
            // clear any session data in MoneyNetworkAPI
            MoneyNetworkAPILib.delete_all_sessions() ;
            if (login_setting_changed) return ;
            // redirect
            a_path = '/auth' ;
            z_path = "?path=" + a_path ;
            $location.path(a_path);
            $location.replace();
            ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Log in", z_path]) ;
        } // client_logout

        function get_my_unique_id() { return moneyNetworkHubService.get_my_unique_id() }

        // get server info. Used in auth page. warning when using cryptMessage on a proxy server
        var server_info = {} ;
        function load_server_info() {
            var pgm = service + '.load_server_info: ' ;
            var debug_seq ;
            // console.log(pgm);
            if (Object.keys(server_info).length) return ; // already loaded
            // debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_server_info', pgm + 'serverInfo') ;
            debug_seq = debug_z_api_operation_start(pgm, null, 'serverInfo', show_debug('z_server_info')) ;
            ZeroFrame.cmd("serverInfo", {}, function (new_server_info) {
                var pgm = service + '.load_server_info serverInfo callback: ';
                // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                debug_z_api_operation_end(debug_seq, new_server_info ? 'OK' : 'Failed. Not found') ;
                // console.log(pgm + 'server_info = ' + JSON.stringify(new_server_info));
                // comp 1: zeronet with vpn and zeronet port open
                //server_info = {
                //    "ip_external": true,
                //    "fileserver_ip": "*",
                //    "tor_enabled": false,
                //    "plugins": ["AnnounceZero", "Bigfile", "Cors", "CryptMessage", "FilePack", "MergerSite", "Mute", "Newsfeed", "OptionalManager", "PeerDb", "Sidebar", "Stats", "TranslateSite", "Trayicon", "Zeroname"],
                //    "fileserver_port": 37344,
                //    "language": "en",
                //    "ui_port": 43110,
                //    "rev": 3098,
                //    "ui_ip": "127.0.0.1",
                //    "platform": "linux2",
                //    "version": "0.6.0",
                //    "tor_status": "Error ([Errno 111] Connection refused)",
                //    "debug": true
                //};
                // comp 2: zeronet running tor and zeronet port closed
                //server_info = {
                //    "ip_external": false,
                //    "fileserver_ip": "*",
                //    "tor_enabled": true,
                //    "plugins": ["AnnounceZero", "Bigfile", "Cors", "CryptMessage", "FilePack", "MergerSite", "Mute", "Newsfeed", "OptionalManager", "PeerDb", "Sidebar", "Stats", "TranslateSite", "Trayicon", "Zeroname"],
                //    "fileserver_port": 41139,
                //    "language": "en",
                //    "ui_port": 43110,
                //    "rev": 3097,
                //    "ui_ip": "127.0.0.1",
                //    "platform": "linux2",
                //    "version": "0.6.0",
                //    "tor_status": "OK (10 onions running)",
                //    "debug": true
                //};
                var key ;
                for (key in server_info) delete server_info[key] ;
                for (key in new_server_info) server_info[key] = new_server_info[key] ;
            }) ;
        } // load_server_info
        function is_proxy_server () {
            if (!Object.keys(server_info).length) return false ;
            if (!server_info.ip_external) return false ;
            if (server_info.plugins.indexOf('Multiuser') == -1) return false ;
            // external ip and Multiuser plugin. Must be a proxy server
            return true ;
        } // is_proxy_server

        // update timestamp in status.json file and modified in content.json.
        // will allow users to communicate with active contacts and ignoring old and inactive contacts
        // small file(s) for quick distribution in ZeroNet
        function i_am_online() {moneyNetworkHubService.i_am_online(z_update_1_data_json, is_user_info_empty) }

        // contact actions: add, remove, ignore, unplonk, verify. Used in NetWork and Chat controllers
        function contact_add (contact) {
            var pgm = service + '.contact_add: ' ;
            // console.log(pgm + 'click');
            // move contact to unverified contacts
            if (!contact.pubkey) {
                // cleanup user or temp user from a proxy server
                console.log(pgm + 'Not allowed. No pubkey was found. Maybe a deleted contact') ;
                return ;
            }
            contact.type = 'unverified' ;
            // send contact info. to unverified contact (privacy public and unverified)
            // console.log(pgm + 'todo: send message add contact message to other contact including relevant tags') ;
            var message = {
                msgtype: 'contact added',
                search: []
            } ;
            console.log(pgm + 'message = ' + JSON.stringify(message));
            for (var i=0 ; i<z_cache.user_info.length ; i++) {
                if (['Public','Unverified'].indexOf(z_cache.user_info[i].privacy) == -1) continue ;
                message.search.push({tag: z_cache.user_info[i].tag, value: z_cache.user_info[i].value, privacy: z_cache.user_info[i].privacy}) ;
            } // for i
            // validate json
            var error = MoneyNetworkHelper.validate_json (pgm, message, message.msgtype, 'Contact added but no message was sent to contact') ;
            if (error) {
                ls_save_contacts(false);
                ZeroFrame.cmd("wrapperNotification", ["Error", error]);
                return ;
            }
            // send message
            add_msg(contact, message) ;
            ls_save_contacts(true) ;
        } // contact_add

        function contact_remove (contact) {
            var pgm = service + '.contact_remove: ' ;
            var zeronet_updated ;
            contact.type = 'new' ;
            if (!contact.pubkey) {
                // deleted contact? maybe cleanup or temporary user from a proxy server
                ls_save_contacts(false) ;
                return ;
            }
            // send remove contact message
            var message = { msgtype: 'contact removed' } ;
            // validate json
            var error = MoneyNetworkHelper.validate_json (pgm, message, message.msgtype, 'Contact removed but no message was send to contact') ;
            if (error) {
                ls_save_contacts(false);
                ZeroFrame.cmd("wrapperNotification", ["Error", error]);
                return ;
            }
            // send message
            add_msg(contact, message) ;
            ls_save_contacts(true) ;
        } // contact_remove

        function contact_ignore (contact) {
            var pgm = service + '.contact_ignore: ' ;
            var i, contact2 ;
            for (i=0 ; i<ls_contacts.length ; i++) {
                contact2 = ls_contacts[i] ;
                if ((contact2.type == 'new')&&
                    ((contact2.cert_user_id == contact.cert_user_id) || (contact2.pubkey == contact.pubkey) )) contact2.type = 'ignore' ;
            }
            contact.type = 'ignore';
            ls_save_contacts(false);
        } // contact_ignore

        function contact_unplonk (contact) {
            contact.type = 'new' ;
            ls_save_contacts(false);
        } // contact_unplonk

        function contact_verify (contact) {
            var pgm = service + '.contact_verify: ' ;
            // send verify message
            if (!contact.pubkey) {
                // cleanup user or temp user from a proxy server
                console.log(pgm + 'Not allowed. No pubkey was found. Maybe a deleted contact') ;
                return ;
            }
            var password = MoneyNetworkHelper.generate_random_password(10);
            var message = { msgtype: 'verify', password_sha256: CryptoJS.SHA256(password).toString() };
            // validate json
            var error = MoneyNetworkHelper.validate_json (pgm, message, message.msgtype, 'Verification request was not sent to contact') ;
            if (error) {
                ls_save_contacts(false);
                ZeroFrame.cmd("wrapperNotification", ["Error", error]);
                return ;
            }
            // send message
            add_msg(contact, message) ;
            var message_envelope = contact.messages[contact.messages.length-1] ;
            message_envelope.password = password ;
            console.log(pgm + 'message_envelope = ' + JSON.stringify(message_envelope));
            ls_save_contacts(true) ;
            // notification
            ZeroFrame.cmd(
                "wrapperNotification",
                ["info",
                    'Verify request send to contact. Waiting for verification.<br>' +
                    'Please send password "' + password + '" to contact in an other<br>' +
                    'trusted communication channel (mail, socialnetwork or whatever)']);

        } // contact_verify

        // delete contact. note: 2 steps. first messages, then contact
        function contact_delete (contact, callback) {
            var no_msg, i, message, update_zeronet, now, index, j, contact_type, js_message_row ;
            contact_type = contact.type == 'group' ? 'group chat' : 'contact' ;
            no_msg = 0 ;
            for (i=0 ; i<contact.messages.length ; i++) {
                message = contact.messages[i] ;
                if (!message.deleted_at) no_msg++ ;
            }
            if (no_msg > 0) {
                // delete mark messages. No delete message notification to contact
                update_zeronet = false ;
                ZeroFrame.cmd("wrapperConfirm", ["Delete all messages for this " + contact_type + "?", "Delete"], function (confirm) {
                    if (!confirm) return false ;
                    now = new Date().getTime() ;
                    for (i=0 ; i<contact.messages.length ; i++) {
                        message = contact.messages[i] ;
                        if (message.deleted_at) continue ;
                        // logical delete. physical delete in ls_save_contacts
                        message.deleted_at = now ;
                        js_message_row = get_message_by_seq(message.seq) ;
                        js_message_row.chat_filter = false ;
                        // should zeronet file data.json be updated?
                        if ((message.folder == 'outbox') && (message.zeronet_msg_id)) update_zeronet = true ;
                    }
                    // done. refresh UI and save contacts. optional update zeronet
                    $rootScope.$apply() ;
                    ls_save_contacts(update_zeronet) ; // physical delete messages
                }) ;
            }
            else {
                // delete contact.
                ZeroFrame.cmd("wrapperConfirm", ["Delete " + contact_type + "?", "Delete"], function (confirm) {
                    if (!confirm) return false ;
                    for (i=ls_contacts.length-1 ; i >= 0 ; i-- ) {
                        if (ls_contacts[i].unique_id == contact.unique_id) {
                            remove_contact(i);
                        }
                    }
                    ls_update_group_last_updated(); // update number of participants in group chat
                    if (callback) callback() ;
                    ls_save_contacts(false) ;
                })
            }
        } // contact_delete

        function contact_mute_add (contact) {
            var pgm = service + '.contact_mute_add: ';
            ZeroFrame.cmd("muteAdd", [contact.auth_address, contact.cert_user_id,'Spammer'], function (res) {
                // console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                if (res == 'ok') {
                    contact.muted_at = new Date().getTime() ;
                    ls_save_contacts(false) ;
                }
            })
        } // contact_mute_add
        function contact_mute_remove (contact) {
            var pgm = service + '.contact_mute_remove: ';
            ZeroFrame.cmd("muteRemove", [contact.auth_address], function (res) {
                // console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                if (res == 'ok') {
                    delete contact.muted_at ;
                    ls_save_contacts(false) ;
                }
            })
        } // contact_mute_remove

        // get file extension from image_base64uri string (image upload)
        // allowed extensions are jpg, png, gif and tif. Avatars are for now only using jpg and png
        function get_image_ext_from_base64uri (image_base64uri) {
            var ext ;
            try { ext = image_base64uri.match("image/([a-z]+)")[1] }
            catch(e) { return }
            if (ext === "jpeg") ext = "jpg";
            if (['jpg','png','gif','tif'].indexOf(ext) == -1) return ;
            return ext ;
        } // get_image_ext_from_base64uri



        // user setup: avatar, alias, contact sort, contact filters, chat sort, spam filters
        function load_user_setup (keysize) {
            moneyNetworkEmojiService.load_user_setup(keysize) ;
        }
        function get_user_setup () {
            return z_cache.user_setup ;
        }

        // start chat. notification or confirm dialog if chat with old contact (Last online timestamp)
        // used in chat_contact methods in network and chat controllers
        // optional confirm param: false: notification, true: return text for confirm dialog box
        function is_old_contact (contact, confirm) {
            var pgm = service + '.is_old_contact: ' ;
            if (['group','public'].indexOf(contact.type) != -1) return ;
            // find last updated for this contact
            var last_updated, last_updated2, i, j, newer_contacts, contact2, now, one_day_ago, msg ;
            last_updated = get_last_online(contact) ;
            // console.log(pgm + 'last_updated = ' + last_updated + ', contact = ' + JSON.stringify(contact)) ;

            // check last updated for contacts with identical cert_user_id or pubkey
            newer_contacts = [] ;
            for (i=0 ; i<ls_contacts.length ; i++) {
                contact2 = ls_contacts[i] ;
                if (!contact2.pubkey) continue ;
                if ((contact2.cert_user_id != contact.cert_user_id) && (contact2.pubkey != contact.pubkey)) continue ;
                if (contact2.unique_id == contact.unique_id) continue ;
                last_updated2 = get_last_online(contact2) ;
                // console.log(pgm + 'last_updated2 = ' + last_updated2 + ', contact2 = ' + JSON.stringify(contact2));
                if (last_updated2 > last_updated) newer_contacts.push(contact2);
            } // for i (self.contacts)

            if (newer_contacts.length == 0) {
                if (contact.type != 'guest') return ;
                // check old guest account
                now = new Date().getTime() ;
                one_day_ago = Math.round((now - 1000*60*60*24) / 1000) ;
                // console.log(pgm + 'last_updated = ' + last_updated + ', one_day_ago = ' + one_day_ago) ;
                // oneyNetworkService.is_old_contact: last_updated = 1481713129, one_day_ago = 1481629619986
                if (last_updated >= one_day_ago) return ;
                msg = 'You are chatting with an old guest account. Last online ' + date(last_updated * 1000, 'short') ;
            }
            else {
                msg =
                    'You are chatting with an old contact.<br>' +
                    'Found ' + newer_contacts.length + ' contact' + ((newer_contacts.length > 1) ? 's' : '') + ' with newer online timestamp.';
                for (i = 0; i < newer_contacts.length; i++) {
                    contact2 = newer_contacts[i];
                    last_updated2 = get_last_online(contact2);
                    msg += '<br>' + (i + 1) + ' : Last online ' + date(last_updated2 * 1000, 'short') + '. ';
                    msg += 'Identical ' + ((contact.cert_user_id == contact2.cert_user_id) ? 'zeronet user' : 'local public key') + '.';
                }
            }

            // notification (chat - click on avatar) or confirm dialog (chatCtrl.send_chat_msg)
            if (!confirm) ZeroFrame.cmd("wrapperNotification", ["info", msg, 5000]);
            return msg ;
        } // is_old_contact


        // notification. little red number in menu and (x) in title
        var chat_notifications = 0 ;
        function get_chat_notifications () {
            if (!z_cache.user_id || (chat_notifications == 0)) return null ;
            return chat_notifications ;
        }
        function update_chat_notifications () {
            var notifications, contact_notifications, i, contact, contact_seen_at, j, message, title ;
            notifications = 0 ;
            for (i=0 ; i<ls_contacts.length ; i++) {
                contact = ls_contacts[i] ;
                if (contact.type == 'public') continue ;
                contact_notifications = 0 ;
                contact_seen_at = contact.seen_at || 0 ;
                for (j=0 ; j<contact.messages.length ; j++) {
                    message = contact.messages[j] ;
                    if (message.folder != 'inbox') continue ;
                    if (message.z_filename) continue ;
                    if (message.message.msgtype == 'reaction') continue ;
                    if (message.sent_at > contact_seen_at) contact_notifications++ ;
                }
                notifications+= contact_notifications ;
                contact.notifications = contact_notifications ;
            } // for i (contacts)
            chat_notifications = notifications ;
            title = 'Money Network' ;
            if (chat_notifications) title = '(' + chat_notifications + ') ' + title ;
            ZeroFrame.cmd("wrapperSetTitle", title) ;
        } // update_chat_notifications

        // check overflow. any div with x-overflow. show/hide show-more link
        var overflow_status = { pending: false } ;
        function check_overflow() {
            var pgm = service + '.check_overflow: ' ;
            if (overflow_status.pending) return ;
            overflow_status.pending = true ;
            // console.log(pgm + 'check') ;
            $timeout(function() {
                var pgm = service + '.check_overflow $timeout callback: ' ;
                var overflows, i, overflow, seq, js_messages_row, screen_width_factor, screen_width, text_max_height ;
                // console.log(pgm + 'done') ;
                overflow_status.pending = false ;
                if (document.getElementsByClassName) overflows = document.getElementsByClassName('overflow') ;
                else if (document.querySelectorAll) overflows = document.querySelectorAll('.overflow') ;
                else return ; // IE8 running in compatibility mode - ignore div overflow
                // console.log(pgm + 'overflows.length = ' + overflows.length) ;
                for (i=0 ; i<overflows.length ; i++) {
                    overflow = overflows[i] ;
                    seq = parseInt(overflow.getAttribute('data-seq'));
                    if (!seq) continue ; // error
                    js_messages_row = get_message_by_seq(seq) ;
                    if (!js_messages_row) continue ; // error
                    if (js_messages_row.hasOwnProperty('overflow')) continue ; // already checked
                    // check overflow for message
                    if (!screen_width) {
                        // initialize
                        screen_width = (document.width !== undefined) ? document.width : document.body.offsetWidth;
                        screen_width_factor = screen_width / 320.0 ;
                        if (screen_width_factor < 1) screen_width_factor = 1 ;
                    }
                    text_max_height = parseInt(overflow.style.maxHeight) ;
                    // add2log(pgm + 'key = ' + key + ', text.style.maxHeight = ' + text_max_height +
                    //        ', text.client height = ' + text.clientHeight + ', text.scroll height = ' + text.scrollHeight +
                    //        ', link.style.display = ' + link.style.display) ;
                    if (overflow.scrollHeight * screen_width_factor < text_max_height) {
                        // small text - overflow is not relevant - skip in next call
                        js_messages_row.overflow = false ;
                    }
                    else if (overflow.scrollHeight <= overflow.clientHeight) {
                        // not relevant with actual screen width
                        js_messages_row.overflow = false ;
                    }
                    else {
                        // show overflow link
                        js_messages_row.overflow = true ;
                    }
                    // console.log(pgm + 'i = ' + i + ', seq = ' + JSON.stringify(seq) + ', overflow = ' + js_messages_row.overflow) ;
                } // for i
            }); // $timeout callback
        } // check_overflow

        // select emoji provider. twemoji from maxcdn.com or ZeroNet optional files
        function get_emoji_folders () {
            return moneyNetworkEmojiService.get_emoji_folders() ;
        }
        function get_emoji_folder () {
            return moneyNetworkEmojiService.get_emoji_folder() ;
        }

        // initialize short emoji list - only for current emoji folder selection
        // call after client_login and when changing emoji folder in Account page
        function init_emojis_short_list () {
            moneyNetworkEmojiService.init_emojis_short_list() ;
        }

        // helper. string to unicode symbols
        // https://mathiasbynens.be/notes/javascript-unicode
        function symbol_to_unicode(str) {
            return moneyNetworkEmojiService.symbol_to_unicode(str);
        }

        // from auth controller. set register = Y/N after loading lS.
        var register = { yn: 'Y' } ;

        // used in auth page. set register = Y/N
        // Y if no users in localStorage. N if users in localStorage.
        function set_register_yn() {
            var pgm = service + '.set_register_yn: ' ;
            var passwords, no_users ;
            if (!ZeroFrame.site_info.cert_user_id) {
                register.yn = null ;
                return ;
            }
            passwords = MoneyNetworkHelper.getItem('passwords') ;
            if (!passwords) no_users = 0 ;
            else {
                try {
                    no_users = JSON.parse(passwords).length ;
                }
                catch (e) {
                    console.log(pgm + 'error. password is invalid. error = ' + e.message) ;
                    no_users = 0 ;
                }
            }
            register.yn = (no_users == 0) ? 'Y' : 'N';
        }
        function get_register () {
            return register ;
        }

        // startup or after changed ZeroNet cert. Set use_login
        var use_login = { bol: true } ;
        function set_use_login() {
            var pgm = service + '.set_use_login: ' ;
            var login ;
            if (!ZeroFrame.site_info.cert_user_id) {
                // No ZeroNet cert and no localStorage.
                use_login.bol = false ;
                return ;
            }
            login = MoneyNetworkHelper.getItem('login') ;
            if (!login) {
                use_login.bol = true ;
                MoneyNetworkHelper.setItem('login', JSON.stringify(use_login.bol)) ;
                MoneyNetworkHelper.ls_save() ;
            }
            else {
                try {
                    use_login.bol = JSON.parse(login) ;
                }
                catch (e) {
                    console.log(pgm + 'error. login was invalid. error = ' + e.message) ;
                    use_login.bol = true ;
                    MoneyNetworkHelper.setItem('login', JSON.stringify(use_login.bol)) ;
                    MoneyNetworkHelper.ls_save() ;
                }
            }
            MoneyNetworkHelper.use_login_changed() ;

        } // set_use_login
        function get_use_login() {
            return use_login ;
        }

        function use_login_changed () {
            var pgm = service + '.use_login_changed: ' ;
            // console.log(pgm + 'click. use_login = ' + self.use_login) ;
            client_logout(true) ; // true: disable notification and redirect
            MoneyNetworkHelper.setItem('login', JSON.stringify(use_login.bol)) ;
            MoneyNetworkHelper.ls_save() ;
            MoneyNetworkHelper.use_login_changed() ;
            // warning
            if (use_login.bol) {
                ZeroFrame.cmd("wrapperNotification", ['done',
                    'Password log in was enabled. No data was moved.<br>' +
                    'Note that private data from the unprotected<br>' +
                    'account still is in localStorage', 10000]);
            }
            else {
                ZeroFrame.cmd("wrapperNotification", ['done',
                    'Password log in was disabled. No data was moved.<br>' +
                    'Note that private data from password protected<br>' +
                    'account(s) still is in localStorage', 10000]);
            }
        } ;


        // moneyNetworkService ready.
        // using ls_bind (interface to ZeroNet API localStorage functions may still be loading)
        MoneyNetworkHelper.ls_bind(function () {
            var pgm = service + '.ls_bind callback: ' ;
            var login, a_path, z_path, redirect_when_ready ;

            // set register = Y/N. used in auth page (login or register as default option)
            set_register_yn() ;
            set_use_login() ;

            if (!ZeroFrame.site_info.cert_user_id || use_login.bol) return ;

            // auto log in
            console.log(pgm + 'login in with blank password') ;
            client_login('') ;
            ZeroFrame.cmd("wrapperNotification", ['done', 'Log in OK', 3000]);
            console.log(pgm + 'check deeplink and redirect') ;

            // auto log + deep link?
            a_path = $location.search()['redirect'] ;
            if (a_path) {
                z_path = "?path=" + a_path ;
                console.log(pgm + 'a_path = ' + a_path + ', z_path = ' + z_path) ;
                redirect_when_ready = function () {
                    if (!ZeroFrame.site_info || !ZeroFrame.site_info.auth_address) {
                        $timeout(redirect_when_ready,1000) ;
                        return ;
                    }
                    $location.path(a_path).search({}) ;
                    $location.replace();
                    ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Money Network", z_path]) ;
                };
                redirect_when_ready() ;
                // console.log(pgm + 'login with a deep link: a_path = ' + a_path + ', z_path = ' + z_path) ;
            }

        }) ; // ls_bind callback



        // export MoneyNetworkService API
        return {
            get_tags: get_tags,
            get_privacy_options: get_privacy_options,
            get_show_privacy_title: get_show_privacy_title,
            set_show_privacy_title: set_show_privacy_title,
            empty_user_info_line: empty_user_info_line,
            load_user_info: load_user_info,
            get_user_info: get_user_info,
            save_user_info: save_user_info,
            get_contacts: moneyNetworkHubService.get_ls_contacts,
            get_contact_by_unique_id: moneyNetworkHubService.get_contact_by_unique_id,
            get_contact_by_password_sha256: moneyNetworkHubService.get_contact_by_password_sha256,
            get_contact_name: get_contact_name,
            get_last_online: get_last_online,
            add_contact: add_contact,
            z_contact_search: z_contact_search,
            ls_save_contacts: ls_save_contacts,
            js_get_messages: js_get_messages,
            get_message_by_seq: get_message_by_seq,
            get_ls_msg_factor: get_ls_msg_factor,
            add_message: add_message,
            remove_message: remove_message,
            add_msg: add_msg,
            remove_msg: remove_msg,
            recursive_delete_message: recursive_delete_message,
            load_avatar: load_avatar,
            get_avatar: moneyNetworkZService.get_avatar,
            client_login: client_login,
            client_logout: client_logout,
            get_my_unique_id: get_my_unique_id,
            zeronet_site_publish: zeronet_site_publish,
            contact_add: contact_add,
            contact_remove: contact_remove,
            contact_ignore: contact_ignore,
            contact_unplonk: contact_unplonk,
            contact_verify: contact_verify,
            contact_delete: contact_delete,
            contact_mute_add: contact_mute_add,
            contact_mute_remove: contact_mute_remove,
            next_local_msg_seq: next_local_msg_seq,
            get_max_image_size: moneyNetworkZService.load_user_contents_max_size,
            get_image_ext_from_base64uri: get_image_ext_from_base64uri,
            get_no_days_before_cleanup: get_no_days_before_cleanup,
            load_user_setup: load_user_setup,
            get_user_setup: get_user_setup,
            save_user_setup: moneyNetworkEmojiService.save_user_setup,
            get_contact_sort_options: moneyNetworkEmojiService.get_contact_sort_options,
            get_contact_sort_title: moneyNetworkEmojiService.get_contact_sort_title,
            contact_order_by: moneyNetworkEmojiService.contact_order_by,
            get_chat_sort_options: moneyNetworkEmojiService.get_chat_sort_options,
            get_chat_sort_title: moneyNetworkEmojiService.get_chat_sort_title,
            chat_order_by: moneyNetworkEmojiService.chat_order_by,
            is_old_contact: is_old_contact,
            is_admin: is_admin,
            confirm_admin_task: moneyNetworkHubService.confirm_admin_task,
            clear_files_optional_cache: clear_files_optional_cache,
            get_public_contact: get_public_contact,
            check_public_chat: check_public_chat,
            get_public_chat: get_public_chat,
            get_chat_page_context: get_chat_page_context,
            set_first_and_last_chat: set_first_and_last_chat,
            reset_first_and_last_chat: reset_first_and_last_chat,
            get_user_seq: get_user_seq,
            get_user_id: get_user_id,
            event_file_done: event_file_done,
            get_chat_notifications: get_chat_notifications,
            update_chat_notifications: update_chat_notifications,
            get_standard_reactions: moneyNetworkEmojiService.get_standard_reactions,
            get_user_reactions: get_user_reactions,
            get_emoji_folders: get_emoji_folders,
            init_emojis_short_list: init_emojis_short_list,
            replace_emojis: moneyNetworkEmojiService.replace_emojis,
            get_reaction_list: moneyNetworkEmojiService.get_reaction_list,
            load_server_info: load_server_info,
            is_proxy_server: is_proxy_server,
            check_reactions: check_reactions,
            unicode_to_symbol: moneyNetworkEmojiService.unicode_to_symbol,
            symbol_to_unicode: symbol_to_unicode,
            get_my_user_hub: get_my_user_hub,
            generate_random_password: moneyNetworkZService.generate_random_password,
            open_window: moneyNetworkWService.open_window,
            get_currencies: moneyNetworkWService.get_currencies,
            get_currency_by_unique_text: moneyNetworkWService.get_currency_by_unique_text,
            z_file_get: z_file_get,
            ls_get_sessions: moneyNetworkWService.ls_get_sessions,
            ls_save_sessions: moneyNetworkWService.ls_save_sessions,
            get_session_info_key: moneyNetworkWService.get_session_info_key,
            is_monitoring_money_transaction: moneyNetworkWService.is_monitoring_money_transaction,
            monitor_money_transaction: moneyNetworkWService.monitor_money_transaction,
            get_register: get_register,
            get_use_login: get_use_login,
            use_login_changed: use_login_changed,
            get_z_cache: moneyNetworkHubService.get_z_cache
        };

        // end MoneyNetworkService
    }]) ;
