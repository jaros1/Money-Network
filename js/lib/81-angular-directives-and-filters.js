angular.module('MoneyNetwork')

    // catch key enter event in user info table (insert new empty row in table)
    // also cacthing on key tab event for last row in table (insert row empty row at end of table)
    // used for UserCtl.insert_row. also used for save new alias efter edit
    .directive('onKeyEnter', ['$parse', function($parse) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                element.bind('keydown keypress', function(event) {
                    // console.log('onKeyEnter: event.which = ' + event.which) ;
                    if ((event.which === 13) || ((event.which === 9) && scope.$last)) {
                        var attrValue = $parse(attrs.onKeyEnter);
                        (typeof attrValue === 'function') ? attrValue(scope) : angular.noop();
                        event.preventDefault();
                    }
                });
                scope.$on('$destroy', function() {
                    element.unbind('keydown keypress')
                })
            }
        };
    }])

    // cancel edit alias
    .directive('onKeyEscape', ['$parse', function($parse) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                element.bind('keydown keypress', function(event) {
                    // console.log('onKeyEscape: event.which = ' + event.which) ;
                    if (event.which === 27) {
                        var attrValue = $parse(attrs.onKeyEscape);
                        (typeof attrValue === 'function') ? attrValue(scope) : angular.noop();
                        event.preventDefault();
                    }
                });
                element.bind('blur', function (event) {
                    // console.log('onKeyEscape: event.which = ' + event.which) ;
                    var attrValue = $parse(attrs.onKeyEscape);
                    (typeof attrValue === 'function') ? attrValue(scope) : angular.noop();
                    event.preventDefault();
                });
                scope.$on('$destroy', function() {
                    element.unbind('keydown keypress blur');
                })
            }
        };
    }])


    // http://wisercoder.com/drag-drop-image-upload-directive-angular-js/
    .directive("imagedrop", function ($parse, $document) {
        return {
            restrict: "A",
            link: function (scope, element, attrs) {
                var pgm = 'imagedrop/link: ' ;
                // console.log(pgm + 'scope   = ' + JSON.stringify(scope));
                // console.log(pgm + 'element = ' + JSON.stringify(element));
                // console.log(pgm + 'attrs   = ' + JSON.stringify(attrs));
                var onImageDrop = $parse(attrs.onImageDrop);
                // console.log(pgm + 'onImageDrop = ' + JSON.stringify(onImageDrop));

                //When an item is dragged over the document
                var onDragOver = function (e) {
                    e.preventDefault();
                    angular.element('body').addClass("dragOver");
                };

                //When the user leaves the window, cancels the drag or drops the item
                var onDragEnd = function (e) {
                    e.preventDefault();
                    angular.element('body').removeClass("dragOver");
                };

                //When a file is dropped
                var loadFile = function (file) {
                    scope.uploadedFile = file;
                    scope.$apply(onImageDrop(scope));
                };

                //Dragging begins on the document
                $document.bind("dragover", onDragOver);

                //Dragging ends on the overlay, which takes the whole window
                element.bind("dragleave", onDragEnd)
                    .bind("drop", function (e) {
                        var pgm = 'imagedrop/dragleave/drop: ' ;
                        onDragEnd(e);
                        // console.log(pgm + 'e.originalEvent.dataTransfer.files.length = ' + e.originalEvent.dataTransfer.files.length);
                        // console.log(pgm + 'typeof e.originalEvent.dataTransfer.files[0] = ' + typeof e.originalEvent.dataTransfer.files[0]);
                        // console.log(pgm + 'e.originalEvent.dataTransfer.files[0] = ' + JSON.stringify(e.originalEvent.dataTransfer.files[0]));
                        loadFile(e.originalEvent.dataTransfer.files[0]);
                    });
            }
        };
    })


    // http://stackoverflow.com/questions/17922557/angularjs-how-to-check-for-changes-in-file-input-fields
    .directive('customOnChange', function() {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var onChangeFunc = scope.$eval(attrs.customOnChange);
                element.bind('change', onChangeFunc);
            }
        };
    })


    .filter('toJSON', [function () {
        // debug: return object as a JSON string
        return function (object) {
            return JSON.stringify(object) ;
        } ;
        // end toJSON filter
    }])

    .filter('toJSONWithSpaces', [function () {
        // debug: return object as a JSON string
        return function (object) {
            var str = JSON.stringify(object) ;
            var str = str.split('":"').join('": "');
            var str = str.split('","').join('", "');
            return str ;
            if (str.length > 40) str = str.substr(0,40) ;
            return str ;
        } ;
        // end toJSON filter
    }])

    .filter('contactAlias', ['MoneyNetworkService', function (moneyNetworkService   ) {
        // return part of cert_user_id before @
        return function (contact) {
            if (!contact) return 'World' ;
            return moneyNetworkService.get_contact_name(contact);
        } ;
        // end contactAlias filter
    }])

    .filter('contactGlyphicon', [function () {
        // return glyphicon class for contact type
        return function (contact) {
            if (!contact || (contact.type == 'public')) return 'glyphicon glyphicon-globe' ;
            else if (contact.type == 'group') return 'glyphicon glyphicon-pushpin';
            else return 'glyphicon glyphicon-user';
        } ;
        // end contactGlyphicon filter
    }])

    .filter('contactGlyphiconTitle', [function () {
        // return glyphicon class for contact type
        var pubkey_lng_to_bits = {"271": 1024, "450": 2048, "799": 4096, "1490": 8192} ;
        return function (contact, message_encryption) {
            var bit_lng ;
            if (!contact || (contact.type == 'public')) return 'Public and unencrypted chat. Everyone can see this!' ;
            else if (contact.type == 'group') return 'Encrypted group chat (200 character password)';
            else if ((message_encryption || contact.encryption) == 2) return 'Encrypted personal chat using cryptMessage (bitCoin) and 256 bit key' ;
            else {
                if (!contact.pubkey) return null ;
                bit_lng = pubkey_lng_to_bits[contact.pubkey.length];
                if (bit_lng) return 'Encrypted personal chat using JSEncrypt and ' + bit_lng + ' key' ;
                else return 'Encrypted personal chat using JSEncrypt' ;
            }
        } ;
        // end contactGlyphiconTitle filter
    }])

    .filter('contactPlaceholderText', [function () {
        // return placeholder text for contact type. a warning when using public chat.
        return function (contact) {
            var bit_lng ;
            if (!contact || (contact.type == 'public')) return 'PUBLIC CHAT. Image drag&drop support in E10+, Chrome and Firefox' ;
            else return 'Private chat. Image drag&drop support in E10+, Chrome and Firefox' ;
        } ;
        // end contactPlaceholderText filter
    }])

    .filter('messageAlias', ['MoneyNetworkService', 'contactAliasFilter', function (moneyNetworkService, contactAlias) {
        // return part of cert_user_id before @ - as contactAlias - used for group chat inbox
        return function (message) {
            var contact, participant_no, unique_id, participant ;
            contact = message.contact ;
            if (!contact) return '' ;
            if (contact.type != 'group') return contactAlias(contact) ;
            if (message.message.folder != 'inbox') return contactAlias(contact) ;
            participant_no = message.message.participant ;
            unique_id = contact.participants[participant_no-1] ;
            participant = moneyNetworkService.get_contact_by_unique_id(unique_id) ;
            return contactAlias(participant || contact) ; // return alias for group avatar if participant has been deleted
        } ;
        // end contactAlias filter
    }])


    .filter('findContactAvatar', [function () {
        // find contact avatar - used in must cases
        return function (contact) {
            if (!contact) return '' ;
            if (['jpg','png'].indexOf(contact.avatar) != -1) {
                // contact with uploaded avatar
                return 'data/users/' + contact.auth_address + '/avatar.' + contact.avatar ;
            }
            // must be contact with a random assigned avatar or avatarz for public chat
            return 'public/images/avatar' + contact.avatar ;
        } ;
        // end findContactAvatar filter
    }])

    .filter('findMessageSenderAvatar', ['findContactAvatarFilter', 'MoneyNetworkService', function (findContactAvatar, moneyNetworkService) {
        // inbox avatar - big avatar in right side of chat page - message sender Avatar.
        // like findContactAvatar but use message.participant to find sender avatar for group chat messages
        return function (message) {
            var contact, participant_no, unique_id, participant ;
            contact = message.contact ;
            if (!contact) return '' ;
            if (contact.type != 'group') return findContactAvatar(contact) ;
            if (message.message.folder != 'inbox') return findContactAvatar(contact) ;
            // group chat. do not return group contact avatar. return avatar for sender of group chat message
            participant_no = message.message.participant ;
            unique_id = contact.participants[participant_no-1] ;
            participant = moneyNetworkService.get_contact_by_unique_id(unique_id) ;
            return findContactAvatar(participant || contact) ; // return group avatar if participant has been deleted
        } ;
        // end findContactAvatar filter
    }])

    .filter('findMessageReceiverAvatar', ['findContactAvatarFilter', 'MoneyNetworkService', function (findContactAvatar, moneyNetworkService) {
        // inbox avatar - small receiver avatar in right side of chat page - message receiver Avatar.
        // personal: users avatar, group chat: group contact avatar, public chat: public contact avatar (z logo)
        var avatar = moneyNetworkService.get_avatar();
        return function (message) {
            var contact, participant_no, unique_id, participant ;
            if (message.message.z_filename) {
                // public unencrypted chat
                contact = moneyNetworkService.get_public_contact(true) ;
                return findContactAvatar(contact) ;
            }
            contact = message.contact ;
            if (!contact) return '' ; // error
            if (contact.type == 'group') return findContactAvatar(contact) ; // group chat
            // private chat
            return avatar.src ;
        } ;
        // end findContactAvatar filter
    }])




    //.filter('contactGlyphicon', [function () {
    //    // return glyphicon class for contact type
    //    return function (contact) {
    //        if (!contact || (contact.type == 'public')) return 'glyphicon glyphicon-globe' ;
    //        else if (contact.type == 'group') return 'glyphicon glyphicon-pushpin';
    //        else return 'glyphicon glyphicon-user';
    //    } ;
    //    // end contactAlias filter
    //}])



    .filter('messageGlyphicon', ['contactGlyphiconFilter', function (contactGlyphicon) {
        // inbox glyphicon - glyphicon class for message type
        return function (message) {
            if (message.message.z_filename) return 'glyphicon glyphicon-globe' ;
            else return contactGlyphicon(message.contact) ;
        } ;
        // end findMessageGlyphicon
    }])

    .filter('messageGlyphiconTitle', ['contactGlyphiconTitleFilter', function (contactGlyphiconTitle) {
        // inbox glyphicon title - mouse over text for glyphicon class for message type
        var my_jsencrypt_key = MoneyNetworkHelper.getItem('pubkey') ;
        var pubkey_lng_to_bits = {"271": 1024, "450": 2048, "799": 4096, "1490": 8192} ;
        var bits = pubkey_lng_to_bits[my_jsencrypt_key.length] ;
        var my_enc_text1 =  'Encrypted personal chat using JSEncrypt' ;
        if (bits) my_enc_text1 += ' and ' + bits + ' key' ;
        return function (message) {
            if (message.message.z_filename) return 'Public and unencrypted chat. Everyone can see this!' ;
            else if (message.message.folder == 'outbox') return contactGlyphiconTitle(message.contact, message.message.encryption) ;
            else if (message.message.encryption == 2) return 'Encrypted personal chat using cryptMessage (bitCoin) and 256 bit key' ;
            else return my_enc_text1 ;
        } ;
        // end findMessageGlyphicon
    }])

    .filter('formatMsgSize', ['MoneyNetworkService', function (moneyNetworkService) {
        // return msg disk usage: format localStorage size [ / ZeroNet size bytes ]
        // note that encryption overhead is not included in localStorage size
        var ls_msg_factor = Math.abs(moneyNetworkService.get_ls_msg_factor()) ;
        return function (message) {
            var pgm = 'formatMsgSize: ' ;
            var ls_msg_size, z_msg_size ;
            if (message.hasOwnProperty('ls_msg_size')) ls_msg_size = Math.round(message.ls_msg_size * ls_msg_factor) ;
            else ls_msg_size = 0 ;
            // console.log(pgm + 'message = ' + JSON.stringify(message));
            if (message.folder == 'outbox') {
                z_msg_size = message.zeronet_msg_size || 0 ;
                return ls_msg_size + '/' + z_msg_size + ' bytes' ;
            }
            else return ls_msg_size + ' bytes' ;
        } ;
        // end formatMsgSize filter
    }])

    .filter('shortChatTime', ['$filter', function ($filter) {
        // short format for unix timestamp used in chat
        return function (unix_timestamp) {
            var pgm = 'shortChatTime filter: ' ;
            var today = new Date ;
            var date = new Date(unix_timestamp) ;
            // today?
            if (today.getDate() == date.getDate()) return $filter('date')(date, 'shortTime');
            // not today: use format minutes, hours, days, weeks, months, years ago
            var miliseconds_ago = today - date ;
            var seconds_ago = miliseconds_ago / 1000 ;
            if (seconds_ago < 59.5) {
                seconds_ago = Math.round(seconds_ago) ;
                if (seconds_ago == 1) return '1 second ago' ;
                else return seconds_ago + ' seconds ago' ;
            }
            var minutes_ago = seconds_ago / 60 ;
            if (minutes_ago < 59.5) {
                minutes_ago = Math.round(minutes_ago) ;
                if (minutes_ago == 1) return '1 minute ago' ;
                else return minutes_ago + ' minutes ago' ;
            }
            var hours_ago = minutes_ago / 60 ;
            if (hours_ago < 23.5) {
                hours_ago = Math.round(hours_ago) ;
                if (hours_ago == 1) return '1 hour ago' ;
                else return hours_ago + ' hours ago' ;
            }
            var days_ago = hours_ago / 24 ;
            if (days_ago < 6.5) {
                days_ago = Math.round(days_ago);
                if (days_ago == 1) return '1 day ago' ;
                else return days_ago + ' days ago' ;
            }
            var weeks_ago = days_ago / 7 ;
            if (weeks_ago < 4.35) {
                weeks_ago = Math.round(weeks_ago);
                if (weeks_ago == 1) return '1 week ago' ;
                else return weeks_ago + ' weeks ago' ;
            }
            var months_ago = days_ago / 365 * 12 ;
            if (months_ago < 11.5) {
                months_ago = Math.round(months_ago);
                if (months_ago == 1) return '1 month ago' ;
                else return months_ago + ' months ago' ;
            }
            var years_ago = days_ago / 365 ;
            years_ago = Math.round(years_ago) ;
            if (years_ago == 1) return '1 year ago' ;
            else return years_ago + ' years ago' ;
        } ;
        // end shortChatTime filter
    }])

    .filter('messageShortChatTime', ['shortChatTimeFilter', function (shortChatTime) {
        // short format for unix timestamp used in chat
        return function (message) {
            if (message.message.sent_at) return shortChatTime(message.message.sent_at) ;
            else return 'Sending ...' ;
        } ;
        // end messageShortChatTime filter
    }])

    .filter('messageOutSentTitle', ['dateFilter', function (date) {
        // outbox: sent_at mouseover text. short sent_at timestamp + any feedback info
        // m.message.sent_at|date:'short'
        return function (message) {
            var text, no_receivers, no_feedback ;
            if (!message.message.sent_at) {
                // https://github.com/jaros1/Zeronet-Money-Network/issues/112#issuecomment-274316500
                text = 'Sending message: todo: add info about any problems' ;
                return text ;
            }
            text = 'Sent ' + date(message.message.sent_at, 'short') ;
            if (message.message.z_filename) return text ; // public chat
            if (!message.message.feedback) {
                // unknown if message has been received or not
                text += ', no feedback info' ;
                return text ;
            }
            if (typeof message.message.feedback == 'number') {
                // private chat - contact has received message
                text += ', feedback ' + date(message.message.feedback, 'short') ;
                return text ;
            }
            if (typeof message.message.feedback == 'object') {
                // group chat - hash with feedback info for members in group chat
                no_receivers = message.contact.participants.length-1 ;
                no_feedback = Object.keys(message.message.feedback).length ;
                text += ', feedback from ' +
                    (no_feedback == no_receivers ? 'all' : no_feedback + ' out of ' + no_receivers) +
                    ' participants in group chat' ;
            }
            return text ;
        } ;
        // end findMessageGlyphicon
    }])

    // format special tag values. Last Updated
    .filter('formatSearchValue', ['shortChatTimeFilter', 'formatNotificationsFilter', 'MoneyNetworkService', function (shortChatTime, formatNotifications, moneyNetworkService) {
        // short format for unix timestamp used in chat
        return function (row) {
            var pgm = 'formatSearchValue: ' ;
            var contact, notifications ;
            if (typeof row.value != 'number') return row.value ;
            contact = moneyNetworkService.get_contact_by_unique_id(row.unique_id) ;
            notifications = contact ? formatNotifications(contact.notifications) : '' ;
            return shortChatTime(row.value*1000) + ' ' + notifications;
        } ;
        // end formatSearchValue filter
    }])

    // format special tag values. Last Updated
    .filter('formatSearchTitle', ['dateFilter', function (date) {
        // short format for unix timestamp used in chat
        return function (row) {
            var pgm = 'formatSearchTitle: ' ;
            if (typeof row.value != 'number') return row.value ;
            return date(row.value*1000, 'short') ;
        } ;
        // end formatSearchTitle filter
    }])


    .filter('formatChatMessageAlias', ['MoneyNetworkService', function (moneyNetworkService) {
        // format ingoing or outgoing chat message
        var public_contact = moneyNetworkService.get_public_contact(true) ;
        return function (message) {
            // find receiver
            var pgm = 'formatChatMessage: ' ;
            // console.log(pgm + 'message = ' + JSON.stringify(message));
            var setup, alias ;
            setup = moneyNetworkService.get_user_setup() ;
            if (message.message.folder == 'outbox') {
                // outbox: send message to contact. alias is receiver. contact or group
                alias = moneyNetworkService.get_contact_name(message.contact);
            }
            else if (message.contact.type == 'group') {
                // inbox: received a group chat message. alias is group name
                alias = moneyNetworkService.get_contact_name(message.contact);
            }
            else if (message.message.z_filename) {
                // inbox: received public chat message. alias is "World
                alias = moneyNetworkService.get_contact_name(public_contact);
            }
            else {
                // inbox: received message from contact. alias is contact
                alias = setup.alias;
            }
            return alias ;
        } ;
        // end formatChatMessage filter
    }])


    .filter('formatChatMessage', ['MoneyNetworkService', 'formatChatMessageAliasFilter', '$sanitize', function (moneyNetworkService, formatChatMessageAlias, $sanitize) {
        // format ingoing or outgoing chat message
        var contacts = moneyNetworkService.get_contacts() ; // array with contacts from localStorage
        return function (message) {
            var pgm = 'formatChatMessage: ' ;
            // check cache. maybe already saved as a formatted string
            if (message.formatted_message) return message.formatted_message ;

            // console.log(pgm + 'message = ' + JSON.stringify(message));
            var alias, i, group_contact, unique_id, cert_user_ids ;
            //if (message.message.folder == 'outbox') {
            //    // outbox: send message to contact. alias is receiver. contact or group
            //    alias = moneyNetworkService.get_contact_name(message.contact);
            //    greeting = 'Hello ' + alias;
            //}
            //else if (message.contact.type == 'group') {
            //    // inbox: received a group chat message. alias is group name
            //    alias = moneyNetworkService.get_contact_name(message.contact);
            //    greeting = 'Hi ' + alias ;
            //}
            //else {
            //    // inbox: received message from contact. alias is contact
            //    alias = setup.alias;
            //    greeting = 'Hi ' + alias ;
            //}
            //greeting = '' ;
            // check known message types
            var str, msgtype, search ;
            msgtype = message.message.message.msgtype ;
            // console.log(pgm + 'msgtype = ' + msgtype);
            if (msgtype == 'contact added') {
                // send or receive ekstra contact information
                search = message.message.message.search ;
                str = 'I added you as contact.' ;
                if (search.length > 0) {
                    str = str + ' My user information is: ' ;
                    for (i=0 ; i<search.length ; i++) {
                        if (i==0) null ;
                        else if (i==search.length-1) str = str + ' and ' ;
                        else str = str + ', ';
                        str = str + '"' + search[i].tag + '": "' + search[i].value + '"' ;
                    } // for i
                }
                // console.log('str = ' + str) ;
                message.message.formatted_message = $sanitize(str) ;
                return str ;
            }
            if (msgtype == 'contact removed') return 'I removed you as contact' ;
            if (msgtype == 'chat msg') {
                str = message.message.message.message ;
                str = (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br>$2');
                str = $sanitize(str) ;
                message.formatted_message = str ;
                return str ;
            }
            if (msgtype == 'verify') {
                // contact verification request. Different presentation for inbox/outbox and status for verification (pending or verified)
                if (message.message.folder == 'outbox') {
                    // sent verification request to contact
                    alias = formatChatMessageAlias(message) ;
                    str = 'Sent verification message. Secret verification password is "' +
                        message.message.password + '". You must send secret password to ' + alias +
                        ' in an other secure communication channel (mail, social network etc). Status: waiting for verification.';
                }
                else {
                    str = 'I want to add you to my list of verified contacts.';
                    if (message.message.message.password_sha256) {
                        str += '. Request pending. Please click on verify icon in this message and enter ' +
                            'the secret verification password that you receive in an other communication channel.' ;
                    }
                    else {
                        str += '. Done. You have already send verification password to contact. You should be on list of verified contacts now'
                    }
                }
                message.message.formatted_message = str ;
                return str ;
            }
            if (msgtype == 'verified') {
                // contact verification response.
                return 'That is OK. The verification password is "' + message.message.message.password + '".' ;
            }
            if (msgtype == 'received') {
                // receipt for chat message with image. Used for quick data.json cleanup to free disk space in users directory
                // message is not displayed in UI. chat_filter = false for image receipts
                return 'Thank you. I have received your photo.' ;
            }
            if (msgtype == 'group chat') {
                // sent or received group chat password
                // format. Started group chat with you, me [...] and xxxx
                // limit_other_participants = 3. Just write number of other participants
                group_contact = null ;
                for (i=0 ; i<contacts.length ; i++) {
                    if (contacts[i].password == message.message.message.password) {
                        group_contact = contacts[i] ;
                        break ;
                    }
                } // for i (contacts)
                str = 'Started group chat' ;
                if (!group_contact) {
                    // must be an error or group contact has been deleted ....
                    return str ;
                }
                str += ' with you, me' ;
                // console.log(pgm + 'group_contact = ' + JSON.stringify(group_contact));
                var other_participants = [], participant ;
                var limit_other_participants = 3 ;
                var my_unique_id = moneyNetworkService.get_my_unique_id() ;
                for (i=0 ; i<group_contact.participants.length ; i++) {
                    unique_id = group_contact.participants[i] ;
                    if (unique_id == my_unique_id) continue ;
                    if (unique_id == message.contact.unique_id) continue ;
                    other_participants.push(unique_id) ;
                }
                // console.log(pgm + 'other_participants = ' + JSON.stringify(other_participants));
                if (other_participants.length > limit_other_participants) {
                    // too many participants for a full list
                    return str + ' and ' + other_participants.length + ' other participants' ;
                }
                for (i=0 ; i<other_participants.length ; i++) {
                    if (i==other_participants.length-1) str += ' and ' ;
                    else str += ', ' ;
                    unique_id = other_participants[i] ;
                    participant = moneyNetworkService.get_contact_by_unique_id(unique_id) ;
                    if (!participant) str += 'unknown contact' ;
                    else str += moneyNetworkService.get_contact_name(participant);
                }
                message.message.formatted_message = str ;
                return str ;
            }
            if (msgtype == 'lost msg') {
                // received feedback info request with an unknown local_msg_seq. Must be a message lost in cyberspace
                return 'Sorry. Message with local_msg_seq ' + message.message.message.local_msg_seq +
                    ' was lost in cyberspace. If possible I will resend the lost message next time we talk' ;
            }
            if (msgtype == 'lost msg2') {
                // received feedback info request with an unknown local_msg_seq. Must be a message lost in cyberspace
                str = 'Sorry. Message with sha256 address ' + message.message.message.message_sha256 +
                    ' could not be decrypted. ' + 'Probably cryptMessage encrypted for your ' ;
                cert_user_ids = message.message.message.cert_user_ids ;
                if (!cert_user_ids) return str + ' other ZeroNet certificates' ;
                for (i=0 ; i<cert_user_ids.length ; i++) {
                    if (i==0) ;
                    else if (i==cert_user_ids.length-1) str += ' or ' ;
                    else str += ', ' ;
                    str += cert_user_ids[i] ;
                }
                str += ' certificate' ;
                if (cert_user_ids.length > 1) str += 's' ;
                message.message.formatted_message = str ;
                return str ;
            }

            // other "unknown" messages. Just return JSON dump
            str = $sanitize(JSON.stringify(message.message)) ;
            str = str.split('":"').join('": "');
            str = str.split('","').join('", "');
            return str ;
        } ;
        // end formatChatMessage filter
    }])

    .filter('chatEditFormName', [function () {
        // return part of cert_user_id before @
        return function (message) {
            // find receiver
            var hash_key = message['$$hashKey'] ;
            var object_id = hash_key.split(':')[1] ;
            var form_name = 'edit_chat_msg_form_' + object_id ;
            return form_name ;
        } ;
        // end chatEditFormName filter
    }])

    .filter('chatEditTextAreaId', [function () {
        // return part of cert_user_id before @
        return function (message) {
            // find receiver
            var hash_key = message['$$hashKey'] ;
            var object_id = hash_key.split(':')[1] ;
            var id = 'edit_chat_msg_text_id_' + object_id ;
            return id ;
        } ;
        // end chatEditTextAreaId filter
    }])

    .filter('chatEditImgId', [function () {
        // return part of cert_user_id before @
        return function (message) {
            // find receiver
            var hash_key = message['$$hashKey'] ;
            var object_id = hash_key.split(':')[1] ;
            var id = 'edit_chat_msg_img_id_' + object_id ;
            return id ;
        } ;
        // end chatEditImgId filter
    }])

    .filter('chatFileInputId', [function () {
        // return part of cert_user_id before @
        return function (message) {
            // find receiver
            var hash_key = message['$$hashKey'] ;
            var object_id = hash_key.split(':')[1] ;
            var id = 'edit_chat_file_input_id_' + object_id ;
            return id ;
        } ;
        // end chatEditImgId filter
    }])
    .filter('chatEditFormDisabled', [function () {
        // return part of cert_user_id before @
        return function (message) {
            // find receiver
            var hash_key = message['$$hashKey'] ;
            var object_id = hash_key.split(':')[1] ;
            var form_name = 'edit_chat_msg_form_' + object_id + '.$invalid';
            return form_name ;
        } ;
        // end chatEditFormName filter
    }])

    .filter('privacyTitle', [function () {
        // title for user info privacy selection. mouse over help
        // Search - search word is stored on server together with a random public key.
        //          server will match search words and return matches to clients
        // Public - info send to other contact after search match. Info is show in contact suggestions (public profile)
        // Unverified - info send to other unverified contact after adding contact to contact list (show more contact info)
        // Verified - send to verified contact after verification through a secure canal (show more contact info)
        // Hidden - private, hidden information. Never send to server or other users.
        var privacy_titles = {
            Search: "Search values are stored in clear text in a database and are used when searching for contacts. Shared with other ZeroNet users. SQL like wildcards are supported (% and _)",
            Public: "Info is sent encrypted to other contact after search match. Public Info is shown in contact search and contact suggestions. Your public profile",
            Unverified: "Info is sent encrypted to other unverified contact after adding contact to contact list. Additional info about you to other contact",
            Verified: "Info is sent encrypted to verified contact after contact verification through a secure canal. Your private profile",
            Hidden: "Private, hidden information. Not stored in ZeroNet and not send to other users. But is used when searching for new contacts"
        };
        return function (privacy) {
            return privacy_titles[privacy] || 'Start typing. Select privacy level';
        } ;
        // end privacyTitle filter
    }])

    .filter('showContactAction', ['MoneyNetworkService', function (moneyNetworkService) {
        // show/hide contact action buttons in network and chat pages
        var pgm = 'showContactAction filter: ';
        var allowed_type_actions, allowed_types, allowed_actions, i, array, index ;
        allowed_type_actions = [
            "new=>ignore", "guest=>ignore", "ignore=>unplonk", "new=>add", "guest=>add",
            "ignore=>add", "unverified=>remove", "unverified=>verify",
            "new=>chat", "guest=>chat", "unverified=>chat", "verified=>chat"
        ] ;
        allowed_types = [] ;
        allowed_actions = [] ;
        for (i=0 ; i<allowed_type_actions.length ; i++) {
            array = allowed_type_actions[i].split('=>');
            if (allowed_types.indexOf(array[0]) == -1) allowed_types.push(array[0]) ;
            if (allowed_actions.indexOf(array[1]) == -1) allowed_actions.push(array[1]) ;
        }
        var setup = moneyNetworkService.get_user_setup() ;
        var debug = (setup && setup.debug && setup.debug.enabled && setup.debug.show_contact_action_filter);
        return function (contact, action) {
            if (!contact || (allowed_types.indexOf(contact.type) == -1) || (allowed_actions.indexOf(action) == -1)) {
                if (debug) console.log(pgm + 'invalid call. contact = ' + JSON.stringify(contact) + ', action = ' + JSON.stringify(action)) ;
                return false ;
            }
            return (allowed_type_actions.indexOf(contact.type + '=>' + action) != -1) ;
        } ;
        // end privacyTitle filter
    }])

    .filter('hashkeyToContact', ['MoneyNetworkService', function (moneyNetworkService) {
        var pgm = 'hashkeyToContact filter: ';
        var contacts = moneyNetworkService.get_contacts() ; // array with contacts from localStorage
        return function (hashkey) {
            for (var i=0 ; i<contacts.length ; i++) {
                if (contacts[i]["$$hashKey"] == hashkey) return contacts[i] ;
            }
            return {} ;
        } ;
        // end privacyTitle filter
    }])

    // format contact Last Updated
    .filter('getLastUpdated', ['shortChatTimeFilter', function (shortChatTime) {
        // short format for unix timestamp used in chat
        return function (contact) {
            var pgm = 'getLastUpdated: ' ;
            var timestamp = MoneyNetworkHelper.get_last_online(contact);
            return shortChatTime(timestamp*1000) ;
        } ;
        // end formatSearchTitle filter
    }])

    .filter('contactType', [ function () {
        // short format for unix timestamp used in chat
        return function (contact) {
            return '(' + contact.type + ')' ;
        } ;
        // end formatSearchTitle filter
    }])

    .filter('shortCertId', [ function () {
        // short format for unix timestamp used in chat
        return function (cert_user_id) {
            var index ;
            if (!cert_user_id) return 'select ...' ;
            index = cert_user_id.indexOf('@') ;
            if (index == -1) return cert_user_id ;
            else return cert_user_id.substr(0,index);
        } ;
        // end formatSearchTitle filter
    }])

    .filter('formatNotifications', [ function () {
        // short format for unix timestamp used in chat
        return function (notifications) {
            if (!notifications) return '' ;
            return '<b><sup><span class="notification">' + notifications + '</span></sup></b>' ;
        } ;
        // end formatSearchTitle filter
    }])

;
// angularJS app end
