angular.module('MoneyNetwork')

    .factory('MoneyNetworkService', ['$timeout', '$rootScope', '$window', '$location', 'dateFilter',
                             function($timeout, $rootScope, $window, $location, date)
    {
        var self = this;
        var service = 'MoneyNetworkService' ;
        console.log(service + ' loaded') ;

        // replace long texts in stringify with ...
        function stringify (json) {
            return MoneyNetworkHelper.stringify(json) ;
        }

        // startup tag cloud. Tags should be created by users and shared between contacts.
        // Used in typeahead autocomplete functionality http://angular-ui.github.io/bootstrap/#/typeahead
        var tags = ['Name', 'Email', 'Phone', 'Photo', 'Company', 'URL', 'GPS'];
        function get_tags() {
            return tags ;
        }

        // convert data.json to newest version. compare dbschema.schema_changed and data.version.
        var dbschema_version = 8 ;
        function zeronet_migrate_data (json) {
            var pgm = service + '.zeronet_migrate_data: ' ;
            if (!json.version) json.version = 1 ;
            if (json.version == dbschema_version) return ;
            var i ;
            // data.json version 1
            // missing multiple users support. there are following problems in version 1:
            //   a) there can be multiple user accounts in a client
            //   b) one client can connect to other ZeroNet accounts
            //   c) one ZeroNet user can use multiple devices
            //{ "sha256": "5874fe64f6cb50d2410b7d9e1031d4403531d796a70968a3eabceb71721af0fc",
            //  "pubkey": "-----BEGIN PUBLIC KEY-----\nMIIBITANBgkqhkiG9w0BAQEFAAOCAQ4AMIIBCQKCAQB5lpAS1uVBKhoo/W3Aas17\nns/VXuaIrAQfvAF30yCH+j5+MoyqMib9M0b6mWlLFnSvk/zrZYUyCXf1PrtYDqtn\nsXulIYEhdKsjkAmnfSeL3CofQu8tl3fxbr1r2hj/XyWPwo3oTsamoyMaFlJLrOsl\n/+IOZswP6IdgNVNa8Xs2UDM3w9TWisCScsHJDw7i7fSJdhFVdQvlFhfhWHHdcXAz\nmBA2oQaNtbOukKS16F4WVPN5d00R13iqqL9AXEYrWs0tggYQ+KKyO2+kRLFUDj8z\nWm2BdvRgfHTqxViEa4eFf+ceukpobnZdStjdxJW9jk4Q2Iiw6CLv+CrtSiz7tMzv\nAgMBAAE=\n-----END PUBLIC KEY-----",
            //  "search": [{ "tag": "name", "value": "xxxx", "time": 1475175779840 }]
            //};
            if (json.version == 1) {
                // convert from version 1 to 2
                // add users array
                console.log(pgm + 'json version 1 = ' + JSON.stringify(json)) ;
                json.users = [{ user_seq: 1, sha256: json.sha256, pubkey: json.pubkey}] ;
                delete json.sha256 ;
                delete json.pubkey ;
                // add user_seq to search array
                if (!json.search) json.search = [] ;
                for (i=0 ; i<json.search.length ; i++) json.search[i].user_seq = 1 ;
                json.version = 2 ;
            }
            // data.json version 2. minor problems:
            // a) remove time from search array. use modified from content.json (keyvalues table)
            // b) remove sha256 from users (can always be calculated from public key)
            // { "search": [
            //     {"user_seq": 3, "tag": "Name", "value": "xxx", "time": 1475318394228},
            //     {"user_seq": 4, "tag": "Name", "value": "xxx", "time": 1475318987160} ],
            //   "version": 2,
            //   "users": [
            //     {"user_seq": 1, "sha256": "97526f811cd0e93cfa77d9558a367238132bf5f8966c93fc88931eac574d6980", "pubkey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnwCwB9wCrtZK6QoTXj4D\nQelvBWqay0l07yqKF1NBh7Hr2PNmxy2OuTGyQp8KtdL8IwqNGFyiU72ig6zHoSgA\nsmWoPcwG3XLOvzb2o4LC9dY5E0KrW+wMoiRWNloVriKavUF4FwNeTCN5Q3o0+g2W\nHvSPq8Oz06d11BUtDJ88eVu+TeHC+Wk/JYXdcOnQf9cxM+wZSrDvTLXoyjtsFxWe\nUV3lE03Xss2SSOCggR5tmht9G6D68JB0rOKe6VcQ0tbHO292P0EMNOydcoJn0Edw\nzAdFo/XkQLXC/Cl4XDuE/RD1qH+1O7C4Bs9eG2EBdgmzvM5HqbvmvvYZzUDBgFuZ\nmQIDAQAB\n-----END PUBLIC KEY-----"},
            //     {"user_seq": 2, "sha256": "8bec70849d1531948c12001f11a928862732e661fbf0708aa404d94eeaab99bf", "pubkey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAr2OsRJv06+Iap7YfFAtk\nzSmkDNPyN6fNcKJuSmPLRa2p4kh4WhHrJLuqua9jD42MkH3BkD3qcDhYqaGZvH9i\nPxxg8uYdl+XZuTsUfjTnWaaQODX/9Dgy75Ow+0H5DbmJKTAESREiqwegNkXyYuje\nN2UhXiLFaDsXz8OXgKOEBFei5r/EXcRKTCytglubuu7skxLrV/AQ8a+/+JcwI4a7\n3ezaSjeopHiglZi2h8U1wPuAopvjh+B107WctGV1iUv0I8yzbaUgkllTouL1hrr3\n1tR4TYMTuoReT+l+dqPyOKjKDai02Fb9ZZydtNmF2R33uFp4gPLTUoAwh7r//SW/\njwIDAQAB\n-----END PUBLIC KEY-----"},
            //     {"user_seq": 3, "sha256": "94a4f3887315a7bb01d836ecb6e15502c707865ff108b47ea05fa7bced794f3e", "pubkey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqK1lnagsPFXalq9vlL5K\nqqlWBffQYUGptJH7DlLsRff+tc2W62yEQ9+ibBkerZdwrRWsG/thN0lWxeLxTuw5\nmmuF4eLsKoubH/tQJF3XrhOoUn4M7tVtGwL5aN/BG1W22l2F+Rb8Q7Tjtf3Rqdw/\nSk46CWnEZ2x1lEcj9Gl+7q7oSLocjKWURaC61zJbBmYO4Aet+/MktN0gW1VEjpPU\nr1/yEhX5EfDNwDNgOUN43aIJkv5+WcgkiGZf56ZqEauwoKsg9xB2c8v6LTv8DZlj\n+OJ/L99sVXP+QzA2yO/EQIbaCNa3Gu35GynZPoH/ig2yx0BMPu7+4/QLiIqAT4co\n+QIDAQAB\n-----END PUBLIC KEY-----"},
            //     {"user_seq": 4, "sha256": "0f5454007ceee575e63b52058768ff1bc0f1cb79b883d0dcf6a920426836c2c7", "pubkey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAiANtVIyOC+MIeEhnkVfS\nn/CBDt0GWCba4U6EeUDbvf+HQGfY61e9cU+XMbI8sX7b9R5G7T+zdVqbmEIZwNEb\nDn9NIs4PVA/xqemrQUrm3qEHK8iq/+5CUwVeKeb6879FgPL8fSj1E3nNQPnmuh8N\nE+/04PraakAj9A6Z1OE5m+sfC59IDwYTKupB53kX3ZzHMmWtdYYEr08Zq9XHuYMM\nA4ykOqENGvquGjPnTB4ASKfRTLCUC+TsG5Pd+2ZswxxU3zG5v/dczj+l3GKaaxP7\nxEqA8nFYiU7LiA1MUzQlQDYj/t7ckRdjGH51GvZxlGFFaGQv3yqzs7WddZg8sqMM\nUQIDAQAB\n-----END PUBLIC KEY-----"}
            //   ]
            // }
            // import_cols filter (http://zeronet.readthedocs.io/en/latest/site_development/dbschema_json/) does not work
            // cannot drop the two columns and import old data. the two fields were manually removed from data.json files (only 16)
            if (json.version == 2) {
                // convert from version 2 to 3
                for (i=0 ; i<json.users.length ; i++) delete json.users[i].sha256 ;
                for (i=0 ; i<json.search.length ; i++) delete json.search[i].time ;
                json.version = 3 ;
            }
            // data.json version 3.
            // { "search": [
            //     {"user_seq": 3, "tag": "Name", "value": "xxx"},
            //     {"user_seq": 4, "tag": "Name", "value": "xxx"},
            //     {"user_seq": 5, "tag": "Name", "value": "%'%"} ],
            //   "version": 3,
            //   "users": [
            //     {"user_seq": 3, "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqK1lnagsPFXalq9vlL5K\nqqlWBffQYUGptJH7DlLsRff+tc2W62yEQ9+ibBkerZdwrRWsG/thN0lWxeLxTuw5\nmmuF4eLsKoubH/tQJF3XrhOoUn4M7tVtGwL5aN/BG1W22l2F+Rb8Q7Tjtf3Rqdw/\nSk46CWnEZ2x1lEcj9Gl+7q7oSLocjKWURaC61zJbBmYO4Aet+/MktN0gW1VEjpPU\nr1/yEhX5EfDNwDNgOUN43aIJkv5+WcgkiGZf56ZqEauwoKsg9xB2c8v6LTv8DZlj\n+OJ/L99sVXP+QzA2yO/EQIbaCNa3Gu35GynZPoH/ig2yx0BMPu7+4/QLiIqAT4co\n+QIDAQAB\n-----END PUBLIC KEY-----"},
            //     {"user_seq": 4, "pubkey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAiANtVIyOC+MIeEhnkVfS\nn/CBDt0GWCba4U6EeUDbvf+HQGfY61e9cU+XMbI8sX7b9R5G7T+zdVqbmEIZwNEb\nDn9NIs4PVA/xqemrQUrm3qEHK8iq/+5CUwVeKeb6879FgPL8fSj1E3nNQPnmuh8N\nE+/04PraakAj9A6Z1OE5m+sfC59IDwYTKupB53kX3ZzHMmWtdYYEr08Zq9XHuYMM\nA4ykOqENGvquGjPnTB4ASKfRTLCUC+TsG5Pd+2ZswxxU3zG5v/dczj+l3GKaaxP7\nxEqA8nFYiU7LiA1MUzQlQDYj/t7ckRdjGH51GvZxlGFFaGQv3yqzs7WddZg8sqMM\nUQIDAQAB\n-----END PUBLIC KEY-----"},
            //     {"user_seq": 5, "pubkey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoqZdclttbcat2VlMLrbj\ndtlfJIYX0kdS+ueh6XS5LbU2Ge6kfNkfkUUtfd7Gz/AAHLIdCZyGBNqHPJ2+635y\n81N0UHStLFL24e6tr0enQ4QLWHAm8ouU3j0LR1WvF2JIUVlGtNE7xcm2nV3rRht0\nlQBae8kz8iLNtFMbNE9Xz2mJddqXdDTll1PrJeYko5MfwL0I+ur/l8RCeDXHvdJE\nRsQHr+rbkoIqiFid9h8PpIHLx2CMQp/Kcvs1+6buna2boOkW9WfICsH/u1zOvS47\nd6/lqMcrBoMGyozMr//1FtCS2DH3mTsmDUS9l6g5I8vUVh/uKd/OwpO12KNp9cLh\nvwIDAQAB\n-----END PUBLIC KEY-----"}
            //   ]
            // }
            // new requirements:
            // a) add empty msg array
            if (json.version == 3) {
                // convert from version 3 to 4
                json.msg = [] ;
                json.version = 4 ;
            }
            if (json.version == 4) {
                // convert from version 4 to 5
                // just adding optional avatar to users. null, jpg, png or an integer.
                json.version = 5 ;
            }
            if (json.version == 5) {
                // convert from version 5 to 6
                // just added guest to users table
                json.version = 6 ;
            }
            if (json.version == 6) {
                // convert from version 5 to 6
                // just added pubkey2 and encryption to users table
                json.version = 7 ;
            }
            if (json.version == 7) {
                // trying to fix some communication problems. maybe db schemaes is out if sync?
                json.version = 8 ;
            }
            // etc
            console.log(pgm + 'json version ' + json.version + ' = ' + JSON.stringify(json)) ;
        } // zeronet_migrate_data


        // convert status.json to newest version. compare dbschema.schema_changed and status.version.
        function z_migrate_status (json) {
            // no version. structure could not be read into sqlite db
            //json = {
            //    "21": 1478267341525
            //}
            if (!json.version) {
                var old_json = JSON.parse(JSON.stringify(json));
                for (var key in json) delete json[key] ;
                json.version = 5 ;
                json.status = [] ;
                for (key in old_json) {
                    json.status.push({
                        user_seq: parseInt(key),
                        timestamp: old_json[key]
                    });
                } // for key
            }
            // version 5
            //{
            //    "version": 5,
            //    "status": [
            //    {
            //        "user_seq": 21,
            //        "timestamp": 1478278423735
            //    }
            //]
            //}
        } // z_migrate_status

        function generate_random_password () {
            return MoneyNetworkHelper.generate_random_password(200);
        }

        // user_seq from i_am_online or z_update_data_json. user_seq is null when called from avatar upload. Timestamp is not updated
        var zeronet_site_publish_interval = 0 ;
        function zeronet_site_publish(user_seq) {
            var user_path = "data/users/" + ZeroFrame.site_info.auth_address;
            // get some debug information after sitePublish errors. is internet offline? is there any peers serving this site?
            // publish will fail for 1-2 minutes, number of peers in "site_info" will be 1 and 0 in "settings" after a few minutes
            var debug_info = function() {
                ZeroFrame.cmd("serverInfo", {}, function (server_info) {
                    var pgm = service + '.zeronet_site_publish serverInfo callback: ';
                    console.log(pgm + "Server info:" + JSON.stringify(server_info));
                    ZeroFrame.cmd("siteInfo", {}, function (site_info) {
                        var pgm = service + '.zeronet_site_publish siteInfo callback: ';
                        console.log(pgm + "Site info: " + JSON.stringify(site_info));
                    }); // siteInfo
                }); // serverInfo
            };

            // update timestamp in status
            ZeroFrame.cmd("fileGet", {inner_path: user_path + '/status.json', required: false}, function (data) {
                var pgm = service + '.zeronet_site_publish fileGet callback: ';
                // console.log(pgm + 'data = ' + JSON.stringify(data));
                var i, index, timestamp, json_raw ;
                if (!data) data = { version: 5, status: []};
                else {
                    data = JSON.parse(data);
                    z_migrate_status(data) ;
                }
                if (user_seq) {
                    // called from z_update_data_json or i_am_online
                    index = -1 ;
                    timestamp = new Date().getTime();
                    for (i=0 ; i<data.status.length ; i++) {
                        if (data.status[i].user_seq == user_seq) index = i ;
                    }
                    if (index == -1) data.status.push({ user_seq: user_seq, timestamp: timestamp});
                    else data.status[index].timestamp = timestamp;
                }
                json_raw = unescape(encodeURIComponent(JSON.stringify(data, null, "\t")));
                ZeroFrame.cmd("fileWrite", [user_path + '/status.json', btoa(json_raw)], function (res) {
                    var pgm = service + '.zeronet_site_publish fileWrite callback: ';
                    var error ;
                    if (res != "ok") {
                        error = "Update was not published. fileWrite failed for status.json: " + res ;
                        console.log(pgm + error);
                        ZeroFrame.cmd("wrapperNotification", ["error", error, 5000]);
                        return ;
                    }

                    // sitePublish
                    ZeroFrame.cmd("sitePublish", {inner_path: user_path + '/content.json'}, function (res) {
                        var pgm = service + '.zeronet_site_publish sitePublish callback: ';
                        // console.log(pgm + 'res = ' + JSON.stringify(res));
                        if (res != "ok") {
                            ZeroFrame.cmd("wrapperNotification", ["error", "Failed to publish: " + res.error, 5000]);
                            // error - repeat sitePublish in 30, 60, 120, 240 etc seconds (device maybe offline or no peers)
                            if (!zeronet_site_publish_interval) zeronet_site_publish_interval = 30 ;
                            else zeronet_site_publish_interval = zeronet_site_publish_interval * 2 ;
                            console.log(pgm + 'Error. Failed to publish: ' + res.error + '. Try again in ' + zeronet_site_publish_interval + ' seconds');
                            var retry_zeronet_site_publish = function () {
                                zeronet_site_publish(user_seq);
                            };
                            $timeout(retry_zeronet_site_publish, zeronet_site_publish_interval*1000);
                            // debug_info() ;
                            return;
                        }
                        zeronet_site_publish_interval = 0 ;

                        // is sha256 links in localStorage (contacts.messages) and ZeroNet (data.json message table) OK?
                        if (user_setup.debug && user_setup.debug.check_sha256_addresses) check_sha256_addresses('sitePublish', false, false) ;

                        // debug_info() ;
                    }); // sitePublish

                }); // fileWrite

            }); // fileGet

        } // zeronet_site_publish


        var user_contents_max_size = null ; // max size of user directory. from data/users/content
        function load_user_contents_max_size (lock_pgm) {
            ZeroFrame.cmd("fileGet", {inner_path: 'data/users/content.json', required: false}, function (data) {
                var pgm = service + ".init_user_contents_max_size fileGet callback: " ;
                if (data) data = JSON.parse(data) ;
                else data = {} ;
                // console.log(pgm + 'data = ' + JSON.stringify(data));
                user_contents_max_size = 0 ;
                var user_contents = data['user_contents'] ;
                if (!user_contents) { z_update_data_json (lock_pgm) ; return }
                // check per user permissions first
                var permissions = user_contents.permissions ;
                var cert_user_id = ZeroFrame.site_info.cert_user_id;
                if (permissions && permissions.hasOwnProperty(cert_user_id)) {
                    if (!permissions[cert_user_id]) return ; //  banned user
                    if (!permissions[cert_user_id].hasOwnProperty('max_size')) { z_update_data_json (lock_pgm) ; return } // no max size?
                    user_contents_max_size = permissions[cert_user_id].max_size ;
                    z_update_data_json (lock_pgm) ;
                    return ;
                }
                // check generel user permissions
                var permission_rules = user_contents['permission_rules'] ;
                if (!permission_rules) { z_update_data_json (lock_pgm) ; return }
                if (!permission_rules[".*"]) { z_update_data_json (lock_pgm) ; return }
                if (!permission_rules[".*"].hasOwnProperty('max_size')) { z_update_data_json (lock_pgm) ; return }
                user_contents_max_size = permission_rules[".*"].max_size ;
                if (lock_pgm) z_update_data_json (lock_pgm) ; // called from z_update_data_json
            }) ; // fileGet
        } // load_user_contents_max_size
        function get_max_image_size () {
            if (!user_contents_max_size) return 0 ;
            return Math.round(user_contents_max_size * 0.9) ;
        } // get_max_image_size


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
                show_receiver_sha256 ;
            now = new Date().getTime() ;

            feedback = {} ;

            if (contact.type == 'group') {
                // group chat
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
                    // factor = -1. received feedback request for unknown message. tell contact that message has never been received
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
                    if (message.local_msg_seq == message_with_envelope.local_msg_seq) continue ; // sending current outbox message
                    // request feedback info from contact. has this outbox message been received?
                    if (!message.feedback) message.feedback = {} ;
                    for (j=0 ; j<contact.participants.length ; j++) {
                        participant = contact.participants[j] ;
                        if (participant == my_unique_id) continue ; // me
                        if (message.feedback[j+1]) continue ; // feedback loop complete for this participant
                        // request feedback info from participant. has this outbox message been received?
                        local_msg_seqs.push((j+1) + ',' + message.local_msg_seq) ;
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
                        local_msg_seqs.push(key) ;
                    }
                } // for local_msg_seq (deleted_outbox_messages)
                if (local_msg_seqs.length > 0) feedback.sent = local_msg_seqs ;

                // end group  chat
            }
            else {
                // normal chat.
                // - always adding a random sender_sha256 address to outgoing message
                // - listening for any response to this address (receiver_sha256) and remove message from ZeroNet (data.json) after having received response
                // - see section b) in data.json cleanup routine (z_update_data_json)

                // check inbox. messages received from contact
                local_msg_seqs = [] ;
                show_receiver_sha256 = true ;
                for (i=0 ; i<contact.messages.length ; i++) {
                    message = contact.messages[i] ;
                    if ((message.folder != 'inbox') || !message.message.local_msg_seq) continue ;
                    //  inbox message with a local_msg_seq (contacts local_msg_seq for this message)
                    // console.log(pgm + 'inbox message.sender_sha256 = ' + message.sender_sha256);
                    if (message.feedback) {
                        // feedback loop complete - contact knows that this message has been received
                        continue ;
                    }
                    message.feedback = now ;
                    if (message.sender_sha256 == receiver_sha256) {
                        // current outbox message.receiver_sha256 = inbox message.sender_sha256.
                        // no reason also to add this inbox message to feedback.received
                        if (show_receiver_sha256) {
                            debug('feedback_info', pgm + 'receiver_sha256 = ' + receiver_sha256) ;
                            show_receiver_sha256 = false ;
                        }
                        continue ;
                    }
                    // factor = -1. received feedback request for unknown message. tell contact that message has never been received
                    factor = message.message.msgtype == 'lost msg' ? -1 : 1 ;
                    local_msg_seqs.push(factor* message.message.local_msg_seq) ;
                } // for i (contact.messages)

                // check deleted inbox messages.
                if (contact.deleted_inbox_messages) for (local_msg_seq in contact.deleted_inbox_messages) {
                    if (contact.deleted_inbox_messages[local_msg_seq]) {
                        // feedback loop complete - contact knows that this deleted message has been received
                        continue ;
                    }
                    // feedback loop not finished. tell contact that this deleted inbox message has been received
                    contact.deleted_inbox_messages[local_msg_seq] = now ;
                    local_msg_seqs.push(parseInt(local_msg_seq));
                } // for local_msg_seq (deleted_inbox_messages)
                if (local_msg_seqs.length > 0) feedback.received = local_msg_seqs ;

                // check outbox. messages sent to contact without having received feedback. request feedback info for outbox messages.
                // two kind of feedback.
                //   a) inbox.receiver_sha256 = outbox.sender_sha256. have received an inbox message with sha256 address sent in a outbox message
                //   b) feedback.received array in ingoing messages.
                local_msg_seqs = [] ;
                for (i=0 ; i<contact.messages.length ; i++) {
                    message = contact.messages[i] ;
                    if (message.folder != 'outbox') continue ;
                    if (message.local_msg_seq == message_with_envelope.local_msg_seq) continue ; // sending current outbox message
                    if (message.feedback) continue ; // feedback loop complete - outbox message have been received by contact
                    // request feedback info from contact. has this outbox message been received?
                    local_msg_seqs.push(message.local_msg_seq) ;
                } // for i (contact.messages)
                // check deleted outbox messages - todo: any reason to ask for feedback info for deleted outbox messages?
                if (contact.deleted_outbox_messages) {
                    debug('feedback_info', pgm + 'contact.deleted_outbox_messages = ' + JSON.stringify(contact.deleted_outbox_messages));
                    debug('feedback_info', pgm + 'Object.keys(contact.deleted_outbox_messages) = ' + JSON.stringify(Object.keys(contact.deleted_outbox_messages)));
                    for (local_msg_seq in contact.deleted_outbox_messages) {
                        debug('feedback_info', pgm + 'local_msg_seq = ' + local_msg_seq) ;
                        if (contact.deleted_outbox_messages[local_msg_seq]) continue ; // feedback loop complete - deleted outbox message have been received by contact
                        // request feedback info from contact. has this deleted outbox message been received?
                        local_msg_seqs.push(parseInt(local_msg_seq)) ;
                    }
                } // for local_msg_seq (deleted_outbox_messages)
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
            }

        } // add_feedback_info

        // process feedback information in ingoing message
        function receive_feedback_info (message_with_envelope, contact) {
            var pgm = service + '.receive_feedback_info: ' ;
            var feedback, received, sent, i, message, index, local_msg_seq, old_feedback, now, error, lost_message,
                lost_message_with_envelope, lost_messages, my_unique_id, my_participant, participant_and_local_msg_seq,
                from_participant, key;
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
                            debug('lost_message', pgm + 'message with local_msg_seq ' + local_msg_seq + ' has not been received by contact. must be a message sent and removed from ZeroNet when contact was offline');
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
                            if (message.zeronet_msg_id) console.log(pgm + 'error. lost message has a zeronet_msg_id and should still be in data.json file');
                            else if (!message.sent_at) console.log(pgm + 'error. lost message has never been sent. sent_at is null');
                            else {
                                debug('lost_message', pgm + 'resend old message with old local_msg_id. add old sent_at to message');
                                debug('lost_message', pgm + 'todo: group chat. lost message may have been received by other participants in group chat!')
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
                                feedback: false,
                                participant: message_with_envelope.participant
                            } ;
                            lost_message_with_envelope.ls_msg_size = JSON.stringify(lost_message_with_envelope).length ;
                            contact.messages.push(lost_message_with_envelope) ;
                            js_messages.push({contact: contact, message: lost_message_with_envelope}) ;

                        } // for i (sent)

                    } // if sent.length > 0

                } // if feedback.sent

            }
            else {
                // 1) feedback.received array - check outbox
                //    example. "received": [476] - contact have received outbox message with local_msg_seq 474
                //    set message.feedback = true. do not ask for feedback info in next message to contact
                if (feedback.received) {

                    // array with one or more received messages from contact. '
                    // Check outbox and mark messages as received
                    received = JSON.parse(JSON.stringify(feedback.received)) ;
                    // any not received messages with negativ local_msg_seq - message lost in cyberspace
                    lost_messages = [] ;
                    for (i=received.length-1 ; i >= 0 ; i--) {
                        local_msg_seq = received[i] ;
                        if (local_msg_seq < 0) {
                            received.splice(i,1) ;
                            lost_messages.push(-local_msg_seq) ;
                        }
                    }
                    if (lost_messages.length > 0) debug('lost_message', pgm + 'lost_messages = ' + JSON.stringify(lost_messages));
                    // check outbox
                    for (i=0 ; i<contact.messages.length ; i++) {
                        message = contact.messages[i] ;
                        if (message.folder != 'outbox') continue ;
                        // outbox
                        local_msg_seq = message.local_msg_seq ;
                        index = lost_messages.indexOf(local_msg_seq) ;
                        if (index != -1) {
                            // message lost in cyberspace. should be resend to contact
                            lost_message = true ;
                            lost_messages.splice(index,1) ;
                        }
                        else {
                            index = received.indexOf(message.local_msg_seq) ;
                            if (index == -1) continue ; // not relevant
                            received.splice(index,1) ;
                        }
                        if (lost_message) {
                            debug('lost_message', pgm + 'message with local_msg_seq ' + local_msg_seq + ' has not been received by contact. must be a message sent and removed from ZeroNet when contact was offline');
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
                            if (message.zeronet_msg_id) console.log(pgm + 'error. lost message has a zeronet_msg_id and should still be in data.json file') ;
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
                    // check also deleted outbox messages
                    if (received.length && contact.deleted_outbox_messages) for (i=received.length-1 ; i >= 0 ; i--) {
                        local_msg_seq = '' + received[i] ;
                        debug('feedback_info', pgm + 'i = ' + i + ', local_msg_seq = ' + JSON.stringify(local_msg_seq)) ;
                        if (!contact.deleted_outbox_messages.hasOwnProperty(local_msg_seq)) continue ; // error - unknown local_msg_seq
                        received.splice(i,1);
                        if (contact.deleted_outbox_messages[local_msg_seq]) debug('feedback_info', pgm + 'warning. have already received feedback info for deleted outbox message with local_msg_seq ' + message.local_msg_seq + ' earlier. Old timestamp = ' + contact.deleted_outbox_messages[local_msg_seq] + ', new timestamp = ' + now) ;
                        contact.deleted_outbox_messages[local_msg_seq] = now ;
                    }

                    if (received.length) {
                        // error: received feedback info for one or more messages not in outbox and not in deleted_outbox_messages
                        error =
                            'Error in feedback.received array. Messages with local_msg_seq ' + JSON.stringify(received) +
                            ' were not found in outbox or in deleted_outbox_messages. Feedback = ' + JSON.stringify(feedback) + '. ' ;
                        if (contact.deleted_outbox_messages) {
                            error +=
                                'contact.deleted_outbox_messages = ' + JSON.stringify(contact.deleted_outbox_messages) +
                                ', Object.keys(contact.deleted_outbox_messages) = ' + JSON.stringify(Object.keys(contact.deleted_outbox_messages)) ;
                        }
                        console.log(pgm + error) ;
                    }
                } // if (received)

                // 2) feedback.sent array - check inbox
                //    example: "sent": [2] - contact has sent message with local_msg_seq 2 and is waiting for feedback
                if (feedback.sent) {
                    sent = JSON.parse(JSON.stringify(feedback.sent)) ;
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
                            debug('feedback_info', pgm + 'already have received feedback info request for inbox message with local_msg_seq ' + local_msg_seq + ' from contact. will be sent in next outbox message') ;
                            continue ;
                        }
                        if (message.feedback) {
                            debug('feedback_info', pgm + 'has already sent feedback info for inbox message with local_msg_seq ' + local_msg_seq + ' to contact at ' + message.feedback + 'but will resend feedback info in next outbox message') ;
                        }
                        else {
                            debug('feedback_info', pgm + 'has marked inbox message with local_msg_seq ' + local_msg_seq + ' with feedback info requested. will be sent in next outbox message') ;
                        }
                        message.feedback = false ;
                    } // for i (contact.messages)

                    // feedback.sent array - contact is waiting for feedback - check also deleted inbox messages
                    if (sent.length && contact.deleted_inbox_messages) for (i=sent.length-1 ; i>= 0 ; i--) {
                        local_msg_seq = '' + sent[i] ;
                        debug('feedback_info', pgm + 'i = ' + i + ', local_msg_seq = ' + JSON.stringify(local_msg_seq)) ;
                        if (!contact.deleted_inbox_messages.hasOwnProperty(local_msg_seq)) continue ; // error - unknown local_msg_seq
                        sent.splice(i,1) ;
                        old_feedback = contact.deleted_inbox_messages[local_msg_seq] ;
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
                        contact.deleted_inbox_messages[local_msg_seq] = false ;
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
                            contact.messages.push(lost_message_with_envelope) ;
                            js_messages.push({contact: contact, message: lost_message_with_envelope}) ;

                        } // for i (sent)

                    } // if sent.length > 0

                } // if feedback.sent

                // end processing feedback info for normal chat
            }

        } // receive_feedback_info


        // keep track of ZeroNet fileGet/fileWrite operations. fileWrite must finish before next fileGet
        var zeronet_file_locked = {} ;

        // update user_info (data.json) on ZeroNet - user info, search words and messages
        function z_update_data_json (lock_pgm) {
            var pgm = service + '.z_update_data_json: ' ;
            // console.log(pgm + 'start') ;

            // check login status - client and ZeroNet
            if (!user_id) {
                ZeroFrame.cmd("wrapperNotification", ["error", "Ups. Something is wrong. Not logged in Money Network. Cannot post search words in Zeronet. User_id is null", 10000]);
                return ;
            }
            if (!ZeroFrame.site_info.cert_user_id) {
                ZeroFrame.cmd("wrapperNotification", ["error", "Ups. Something is wrong. Not logged in on ZeroNet. Cannot post search words in Zeronet. siteInfo.cert_user_id is null", 10000]);
                console.log(pgm + 'site_info = ' + JSON.stringify(ZeroFrame.site_info));
                return ;
            }

            if (user_contents_max_size == null) {
                // find max_size and call z_update_data_json with not null file_size
                load_user_contents_max_size(lock_pgm);
                return ;
            }
            // console.log(pgm + 'user_contents_max_size = ' + user_contents_max_size) ;

            // check current user disk usage. must keep total file usage <= user_contents_max_size
            var query =
                "select files.filename, files.size " +
                "from json, files " +
                "where json.directory = 'users/" + ZeroFrame.site_info.auth_address + "' " +
                "and json.file_name = 'content.json' " +
                "and files.json_id = json.json_id" ;
            debug('select', pgm + 'query = ' + query);
            ZeroFrame.cmd("dbQuery", [query], function (res) {
                var pgm = service + '.z_update_data_json dbQuery callback: ';
                // console.log(pgm + 'res = ' + JSON.stringify(res));
                // calculate data.json max size - reserve 1700 (2200 * 0.75) bytes for avatar - reserve 100 bytes for status
                var data_json_max_size = user_contents_max_size - 1800;
                for (var i=0 ; i<res.length ; i++) {
                    if (['data.json','avatar.png','avatar.jpg'].indexOf(res[i].filename) != -1) continue ;
                    data_json_max_size = data_json_max_size - res[i].size ;
                }
                // console.log(pgm + 'data_json_max_size = ' + data_json_max_size) ;

                var pubkey = MoneyNetworkHelper.getItem('pubkey') ; // used in JSEncrypt
                var pubkey2 = MoneyNetworkHelper.getItem('pubkey2') ; // used in ZeroNet CryptMessage plugin
                // console.log(pgm + 'pubkey = ' + pubkey, ', pubkey2 = ' + pubkey);

                var data_json_path = "data/users/" + ZeroFrame.site_info.auth_address + "/data.json";
                if (zeronet_file_locked[data_json_path] && (lock_pgm != 'force')) {
                    var error =
                        "Warning. File " + data_json_path + ' is being updated by an other process. ' +
                        'Process with lock is ' + zeronet_file_locked[data_json_path] + '. Process requesting lock is ' + lock_pgm ;
                    console.log(pgm + error) ;
                    console.log(pgm + 'Force data.json update in 30 seconds') ;
                    $timeout(function () { z_update_data_json('force') }, 30000);
                    return ;
                }
                zeronet_file_locked[data_json_path] = lock_pgm ;

                // update json table with public key and search words
                // console.log(pgm + 'calling fileGet');
                ZeroFrame.cmd("fileGet", {inner_path: data_json_path, required: false}, function (data) {
                    var pgm = service + '.z_update_data_json fileGet callback: ' ;
                    // console.log(pgm + 'data = ' + JSON.stringify(data));
                    var json_raw, row;
                    if (data) {
                        data = JSON.parse(data);
                        zeronet_migrate_data(data);
                    }
                    else data = {
                        version: dbschema_version,
                        users: [],
                        search: [],
                        msg: []
                    };

                    // check avatar. Full path in avatar.src. short path in data.users array in ZeroNet
                    // src:
                    // - data/users/1CCiJ97XHgVeJrkbnzLgfXvYRr8QEWxnWF/avatar.jpg => jpg
                    // - data/users/1CCiJ97XHgVeJrkbnzLgfXvYRr8QEWxnWF/avatar.png => png
                    // - public/images/avatar1.png                                => 1.png
                    // uploaded avatars will be found in files table (from contents.json files)
                    // only random assigned avatar should be in users array
                    var short_avatar ;
                    if (avatar.src.substr(0,20) == 'public/images/avatar') short_avatar = avatar.src.substr(20,avatar.src.length-20);
                    // console.log(pgm + 'avatar.src = ' + avatar.src + ', short_avatar = ' + short_avatar);

                    // find current user in users array
                    var max_user_seq = 0, i, user_i, user_seq, new_user_row ;
                    var guest_id, guest, old_guest_user_seq, old_guest_user_index ;
                    for (i=0 ; i<data.users.length ; i++) {
                        if (pubkey == data.users[i].pubkey) {
                            user_i = i ;
                            user_seq = data.users[user_i].user_seq
                        }
                        else if (data.users[i].user_seq > max_user_seq) max_user_seq = data.users[i].user_seq ;
                    }
                    if (user_seq) {
                        data.users[user_i].pubkey2 = pubkey2 ;
                        data.users[user_i].encryption = user_setup.encryption ;
                        data.users[user_i].avatar = short_avatar ;
                    }
                    else {
                        // add current user to data.users array
                        user_seq = max_user_seq + 1 ;
                        new_user_row = {
                            user_seq: user_seq,
                            pubkey: pubkey,
                            pubkey2: pubkey2,
                            encryption: user_setup.encryption,
                            avatar: short_avatar
                        };
                        guest_id = MoneyNetworkHelper.getItem('guestid');
                        guest = (guest_id == '' + user_id) ;
                        if (guest) {
                            new_user_row.guest = true;
                            for (i=0 ; i<data.users.length ; i++) if (data.users[i].guest) old_guest_user_index = i ;
                            if (old_guest_user_index) {
                                old_guest_user_seq = data.users[old_guest_user_index].user_seq ;
                                data.users.splice(old_guest_user_index,1);
                            }
                        }
                        data.users.push(new_user_row) ;
                        // console.log(pgm + 'added user to data.users. data = ' + JSON.stringify(data)) ;
                    }
                    // console.log(pgm + 'pubkey = ' + pubkey + ', user_seq = ' + user_seq);

                    // remove old search words from search array
                    var user_no_search_words = {} ;
                    for (i=data.search.length-1 ; i>=0 ; i--) {
                        row = data.search[i] ;
                        if (row.user_seq == user_seq || (row.user_seq == old_guest_user_seq)) data.search.splice(i,1);
                        else {
                            if (!user_no_search_words.hasOwnProperty(row.user_seq)) user_no_search_words[row.user_seq] = 0 ;
                            user_no_search_words[row.user_seq]++ ;
                        }
                    }
                    // add new search words to search array
                    user_no_search_words[user_seq] = 0 ;
                    for (i=0 ; i<user_info.length ; i++) {
                        if (user_info[i].privacy != 'Search') continue ;
                        row = {
                            user_seq: user_seq,
                            tag: user_info[i].tag,
                            value: user_info[i].value
                        };
                        data.search.push(row);
                        user_no_search_words[user_seq]++ ;
                    } // for i
                    // console.log(pgm + 'user_no_search_words = ' + JSON.stringify(user_no_search_words));

                    // set to true if localStorage information if updated (contacts, contact.messages, ...)
                    var local_storage_updated = false ;

                    var j, k, contact, group_chat ;
                    for (i=data.msg.length-1 ; i>=0 ; i--) {
                        // fix problem with false/0 keys in msg array / messages table (cannot be decrypted). See also "insert new message" below
                        // null keys are allowed in group chat
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
                    var encrypt, password, key, message_with_envelope, message, encrypted_message_str, message_deleted,
                        error, receiver_sha256, local_msg_seq, sender_sha256, image, sent_at ;
                    for (i=0 ; i<ls_contacts.length ; i++) {
                        contact = ls_contacts[i] ;
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
                                    if ((data.msg[k].user_seq == user_seq) && (data.msg[k].message_sha256 == contact.messages[j].zeronet_msg_id)) {
                                        message_deleted = true ;
                                        data.msg.splice(k,1) ;
                                        break ;
                                    }
                                } // for k (data.msg)
                                // console.log(pgm + 'new data.msg.length = ' + data.msg.length) ;
                                if (!message_deleted) {
                                    if (!is_admin() || !admin_key) { // ignore delete errors for admin task!
                                        error = "Could not delete message from Zeronet. Maybe posted in ZeroNet from an other ZeroNet id" ;
                                        console.log(pgm + 'error = ' + error) ;
                                        console.log(pgm + 'user_seq = ' + user_seq) ;
                                        console.log(pgm + 'zeronet_msg_id = ' + contact.messages[j].zeronet_msg_id) ;
                                        // console.log(pgm + 'data.msg = ' + JSON.stringify(data.msg));
                                        ZeroFrame.cmd("wrapperNotification", ["error", error, 5000]);
                                    }
                                    delete contact.messages[j].zeronet_msg_id ;
                                    delete contact.messages[j].zeronet_msg_size ;
                                }
                                // delete message but keep sender_sha256 in deleted message. Could get an ingoing message later to this address
                                // console.log(pgm + 'contact before message delete: ' + JSON.stringify(contact));
                                sender_sha256 = contact.messages[j].sender_sha256 ;
                                if (sender_sha256) {
                                    if (!contact.outbox_sender_sha256) contact.outbox_sender_sha256 = {} ;
                                    if (!contact.outbox_sender_sha256.hasOwnProperty(sender_sha256)) {
                                        contact.outbox_sender_sha256[contact.messages[j].sender_sha256] = { send_at: contact.messages[j].sent_at}
                                    }
                                }
                                contact.messages.splice(j,1);
                                // console.log(pgm + 'contact after message delete: ' + JSON.stringify(contact));
                                local_storage_updated = true ;
                                continue
                            } // if

                        } // for j (contact.messages)
                    } // for i (contacts)

                    // insert and encrypt new outgoing messages into data.json
                    // using callback technique (not required for JSEncrypt but used for all cryptMessage plugin calls)
                    // will call data cleanup, write and publish when finished encrypting messages
                    z_update_data_encrypt_message (user_seq, local_storage_updated, data_json_max_size, data) ;

                }); // fileGet
            }); // dbQuery
        } // z_update_data_json


        // encrypt new outgoing message(s) in data.json before cleanup, write and publish
        // callback technique is used - not required for JSEncrypt but used in cryptMessage plugin
        // three cryptMessage callback calls for each cryptMessage encrypted message
        function z_update_data_encrypt_message (user_seq, local_storage_updated, data_json_max_size, data) {

            var pgm = service + '.z_update_data_encrypt_message: ' ;

            var i, contact, encrypt, j, message_with_envelope, message, local_msg_seq, sent_at, key, password,
                receiver_sha256, k, sender_sha256, image, encrypted_message_str ;

            for (i=0 ; i<ls_contacts.length ; i++) {
                contact = ls_contacts[i] ;
                encrypt = null ;
                for (j=contact.messages.length-1 ; j >= 0 ; j--) {
                    message_with_envelope = contact.messages[j] ;
                    if (message_with_envelope.folder != 'outbox') continue ;

                    // new outgoing messages
                    if (!message_with_envelope.sent_at) {
                        // not sent - encrypt and insert new message in data.msg array (data.json)
                        message = message_with_envelope.message ;
                        // check public key
                        if (contact.type != 'group') {
                            if (((contact.encryption != '2') && !contact.pubkey) ||
                                ((contact.encryption == '2') && !contact.pubkey2)) {
                                console.log(pgm + 'Cannot send message ' + JSON.stringify(message_with_envelope) + '. contact does not have a public key');
                                console.log(pgm + 'contact = ' + JSON.stringify(contact));
                                console.log(pgm + 'message = ' + JSON.stringify(message_with_envelope)) ;
                                console.log(pgm + 'deleting message') ;
                                // delete invalid message
                                contact.messages.splice(j,1);
                                for (k=js_messages.length-1 ; k>= 0 ; k--) {
                                    if (js_messages[k].message == message_with_envelope) {
                                        js_messages.splice(k,1) ;
                                    }
                                }
                                continue ;
                            }
                        }
                        // add local_msg_seq. used as message id
                        if (message_with_envelope.local_msg_seq) {
                            // resending old message - already local_msg_seq already in message
                            local_msg_seq = message_with_envelope.local_msg_seq ;
                            sent_at = message.sent_at ;
                            debug('lost_message', pgm + 'resending lost message with local_msg_seq ' + local_msg_seq);
                        }
                        else {
                            local_msg_seq = next_local_msg_seq() ;
                            message_with_envelope.local_msg_seq = local_msg_seq;
                            sent_at = new Date().getTime() ;
                        }
                        message.local_msg_seq = local_msg_seq ;
                        // receiver_sha256
                        if (contact.type == 'group') CryptoJS.SHA256(password).toString(contact.password);
                        else {
                            // find receiver_sha256. Use last received sender_sha256 address from contact
                            // exception: remove + add contact messages can be used to reset communication
                            if (message.msgtype != 'contact added') receiver_sha256 = contact.inbox_last_sender_sha256 ;
                            if (!receiver_sha256) receiver_sha256 = CryptoJS.SHA256(contact.pubkey).toString();
                        }
                        // sender_sha256
                        if (contact.type != 'group') {
                            // add random sender_sha256 address. No sender_sha256 in group chat. see feedback information
                            sender_sha256 = CryptoJS.SHA256(generate_random_password()).toString();
                            message_with_envelope.sender_sha256 = sender_sha256;
                            message.sender_sha256 = sender_sha256 ;
                            // check this new sha256 address in incoming data.json files (file done event / process_incoming_message)
                            watch_receiver_sha256.push(sender_sha256) ;
                        }
                        // add feedback info to outgoing message
                        add_feedback_info(receiver_sha256, message_with_envelope, contact) ;
                        // don't send unchanged images. move to envelope before send and back to message after send
                        delete message_with_envelope.image ;
                        if (message.replace_unchanged_image_with_x) {
                            // x = 'unchanged image'
                            delete message.replace_unchanged_image_with_x ;
                            message_with_envelope.image = message.image ;
                            message.image = 'x' ;
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
                        else if (contact.encryption != '2') {
                            // JSEncrypt
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
                                delete zeronet_file_locked[data_json_path] ;
                                throw pgm + 'System error. Encryption error. key = ' + key + ', password = ' + password ;
                                continue ;
                            }
                        }
                        else {
                            // cryptMessage plugin encryption
                            // 3 callbacks. 1) generate password, 2) encrypt password=key and 3) encrypt message,
                            z_update_data_cryptmessage (
                                user_seq, true, data_json_max_size, data, contact.pubkey2,
                                message_with_envelope, receiver_sha256, sent_at
                            ) ;
                            // stop. z_update_data_cryptmessage will callback to this function when done with this message
                            return ;

                        }
                        encrypted_message_str = MoneyNetworkHelper.encrypt(JSON.stringify(message), password);
                        debug('outbox && encrypted', pgm + 'sending encrypted message = ' + encrypted_message_str);
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
                        // console.log(pgm + 'new local_storage_messages[' + i + '] = ' + JSON.stringify(message));
                        // console.log(pgm + 'old data.msg.length = ' + data.msg.length) ;
                        data.msg.push({
                            user_seq: user_seq,
                            receiver_sha256: receiver_sha256,
                            key: key,
                            message: encrypted_message_str,
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

            // cleanup data. try to keep data.json file small. also checking max user dictionary size
            if (z_update_data_cleanup (user_seq, local_storage_updated, data_json_max_size, data)) {
                // Cleanup OK - write and publish updated data.json
                z_update_data_write_publish (user_seq, data) ;
            }

        } // z_update_data_encrypt_message


        // Zeronet cryptMessage plugin - three callbacks and "return" to z_update_data_encrypt_message when done
        function z_update_data_cryptmessage (user_seq, local_storage_updated, data_json_max_size, data, pubkey2, message_with_envelope, receiver_sha256, sent_at) {

            var pgm = service + '.z_update_data_cryptmessage: ' ;

            ZeroFrame.cmd("aesEncrypt", [""], function (res) {
                var pgm = service + '.z_update_data_cryptmessage aesEncrypt callback 1: ';
                var password = res[0];

                return ZeroFrame.cmd("eciesEncrypt", [password, pubkey2], function (key) {
                    var pgm = service + '.z_update_data_cryptmessage eciesEncrypt callback 2: ';

                    // encrypt step 3 - aes encrypt message
                    ZeroFrame.cmd("aesEncrypt", [JSON.stringify(message_with_envelope.message), password], function (res) {
                        var pgm = service + '.z_update_data_cryptmessage aesEncrypt callback 3: ';
                        var iv, encrypted_message_str, message ;

                        iv = res[1] ;
                        encrypted_message_str = res[2];
                        debug('outbox && encrypted', pgm + 'iv = ' + iv + ', encrypted_message_str = ' + encrypted_message_str);

                        // post encryption cleanup
                        message = message_with_envelope.message ;
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
                        // console.log(pgm + 'new local_storage_messages[' + i + '] = ' + JSON.stringify(message));
                        // console.log(pgm + 'old data.msg.length = ' + data.msg.length) ;

                        // insert into data.msg array
                        data.msg.push({
                            user_seq: user_seq,
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

                        // continue with other messages to encrypt - callback to z_update_data_encrypt_message
                        z_update_data_encrypt_message (user_seq, local_storage_updated, data_json_max_size, data) ;

                    }); // callback 3

                }); // callback 2

            }); // callback 1

        } // z_update_data_cryptmessage_1


        // cleanup old data in data.json before write and publish
        // data.json file must be as small as possible for fast communication
        // also checking max user directory size
        // returns true if OK. returns false if data.json er too big for write and publish
        function z_update_data_cleanup (user_seq, local_storage_updated, data_json_max_size, data) {

            var pgm = service + '.z_update_data_cleanup: ' ;

            var i, j, k, json_raw, data_clone, data_json_other_users_size, now, one_hour_ago, msg_user_seqs, data_removed,
                count, contact, contact_last_online, outbox_message, no_feedback_expected, no_feedback_received,
                available, error ;

            // calculate number of bytes used by other users in data.json file
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
            // todo: issue #42 - data.json size - minor problem - should be a 10Kb limit for current user. not all users in data.json file
            now = new Date().getTime() ;
            one_hour_ago = now - 1000*60*60 ;
            count = 0 ;
            while (true) {
                json_raw = unescape(encodeURIComponent(JSON.stringify(data, null, "\t")));
                if (json_raw.length < 10000 + data_json_other_users_size) break ; // OK - small file

                debug('data_cleanup', pgm + 'data.json is big. size ' + json_raw.length + '. limit ' + (10000 + data_json_other_users_size) + ' removing old data ...') ;
                // todo: looping forever with message - MoneyNetworkService.z_update_data_json fileGet callback: data.json is big. size 14762. removing old data ...
                count = count + 1 ;
                if (count > 1000) {
                    console.log(pgm + 'Ups. System error. Something is wrong here. looping forever!') ;
                    break ;
                }
                data_removed = false ;

                // a) delete users without any messages (not current user)
                msg_user_seqs = [] ;
                if (!data.msg) data.msg = [] ;
                if (!data.search) data.search = [] ;
                for (i=0 ; i<data.msg.length ; i++) {
                    if (msg_user_seqs.indexOf(data.msg[i].user_seq) == -1) msg_user_seqs.push(data.msg[i].user_seq) ;
                }
                for (i=0 ; i<data.users.length ; i++) {
                    if (data.users[i].user_seq == user_seq) continue ;
                    if (msg_user_seqs.indexOf(data.users[i].user_seq) != -1) continue ;
                    // remove search words
                    for (j=data.search.length-1 ; j>=0 ; j--) {
                        if (data.search[j].user_seq == data.users[i].user_seq) data.search.splice(j,1);
                    }
                    // remove user and recheck file size
                    data.users.splice(i,1);
                    debug('a: data_cleanup', pgm + 'data.json is big. removed user without any messages') ;
                    data_removed = true ;
                    break ;
                } // for i (users)
                if (data_removed) continue ; // recheck data.json size

                // new b) cleanup msg that has been received by contact. outbox_message.feedback = unix timestamp
                // feedback either as inbox.receiver_sha256 = outbox.sendersha256 or as feedback hash in messages
                for (i=0 ; i<ls_contacts.length ; i++) {
                    contact = ls_contacts[i] ;
                    if (contact.type == 'group') no_feedback_expected = contact.participants.length-1 ;
                    if (!contact.messages) continue ;
                    for (j=0 ; j<contact.messages.length ; j++) {
                        if (contact.messages[j].folder != 'outbox') continue ;
                        if (!contact.messages[j].zeronet_msg_id) continue ;
                        if (contact.type == 'group') {
                            // group chat. feedback = object. expects one receipt for each participant in group chat
                            if (!contact.messages[j].feedback) no_feedback_received = 0 ;
                            else no_feedback_received = Object.keys(contact.messages[j].feedback).length ;
                            if (no_feedback_received < no_feedback_expected) continue ;
                        }
                        else {
                            // normal chat. feedback = boolean. expects one receipt
                            if (!contact.messages[j].feedback) continue ;
                        }
                        outbox_message = contact.messages[j] ;
                        // found a outbox message that have been received by contact
                        // remove outbox message from msg array in data.json file
                        for (k=data.msg.length-1 ; k >= 0 ; k--) {
                            if (data.msg[k].message_sha256 != outbox_message.zeronet_msg_id) continue ;
                            // found a message that can be deleted from ZeroNet (received by contact)
                            debug('data_cleanup', pgm + 'b: found a message that can be deleted from ZeroNet (received by contact)') ;
                            data.msg.splice(k,1);
                            delete outbox_message.zeronet_msg_id ;
                            delete outbox_message.zeronet_msg_size ;
                            outbox_message.cleanup_at =  now ;
                            local_storage_updated = true ;
                            data_removed = true ;
                            // todo: from old b) implementation. not possible in new b) implementation
                            //if (inbox_message.message.msgtype == 'received') {
                            //    // logical delete. will be physical deleted in next ls_save_contacts
                            //    inbox_message.deleted_at = new Date().getTime() ;
                            //}
                            break ;
                        } // for k (data.msg)
                        if (data_removed) {
                            debug('data_cleanup', pgm + 'b: data.json is big. removed outbox message received by contact') ;
                            break ;
                        }
                        else {
                            debug('data_cleanup', pgm + 'b: error. outbox message was not in data.msg array. cleaning up invalid reference') ;
                            delete outbox_message.zeronet_msg_id ;
                            delete outbox_message.zeronet_msg_size ;
                            outbox_message.cleanup_at =  now ;
                            local_storage_updated = true ;
                            outbox_message = null ;
                        }
                    } // for j (contact.messages)
                    if (data_removed) break ;
                } // for i (contacts)
                if (data_removed) continue ; // recheck data.json size

                // c) cleanup image group chat messages where receipts have been received from all participants in group chat
                //    image has send in a group chat message (contact.type = group)
                //    message has an empty image_receipts array.
                //    see chatCtrl.send_chat_msg - initializing image_receipts array
                //    see process_incoming_message - removing participants from image_receipts array
                for (i=0 ; i<ls_contacts.length ; i++) {
                    contact = ls_contacts[i];
                    if (contact.type != 'group') continue ;
                    if (!contact.messages) continue ;
                    for (j=0 ; j<contact.messages.length ; j++) {
                        outbox_message = contact.messages[j] ;
                        if (outbox_message.folder != 'outbox') continue ;
                        if (!outbox_message.zeronet_msg_id) continue ;
                        if (!outbox_message.hasOwnProperty('image_receipts')) continue ;
                        // debug('data_cleanup', pgm + 'c: found outbox message with an image_receipts array.') ;
                        if (outbox_message.image_receipts.length > 0) {
                            // debug('data_cleanup', pgm + 'c: keeping image. not all receipts have been received. outbox_message.image_receipts = ' + JSON.stringify(outbox_message.image_receipts));
                            continue ;
                        }
                        debug('data_cleanup', pgm + 'c: all image receipts have been received. Remove message from data.json') ;
                        delete outbox_message.image_receipts ;

                        // check if outbox message is in data.msg array
                        for (k=data.msg.length-1 ; k >= 0 ; k--) {
                            if (data.msg[k].message_sha256 != outbox_message.zeronet_msg_id) continue ;
                            // found a message that can be deleted from ZeroNet (received by contact)
                            debug('data_cleanup', pgm + 'c: found an image message that can be deleted from ZeroNet (received by all group chat contacts)') ;
                            data.msg.splice(k,1);
                            delete outbox_message.zeronet_msg_id ;
                            delete outbox_message.zeronet_msg_size ;
                            outbox_message.cleanup_at =  now ;
                            local_storage_updated = true ;
                            data_removed = true ;
                            break ;
                        } // for k (data.msg)
                        if (data_removed) {
                            debug('data_cleanup', pgm + 'c: data.json is big. removed outbox image message received by received by all group chat contacts') ;
                            break ;
                        }
                        else {
                            debug('data_cleanup', pgm + 'c: error. outbox message was not in data.msg array. cleaning up invalid reference') ;
                            delete outbox_message.zeronet_msg_id ;
                            delete outbox_message.zeronet_msg_size ;
                            outbox_message.cleanup_at =  now ;
                            local_storage_updated = true ;
                        }
                    } // for j (contact.messages)
                    if (data_removed) break ;
                } // for i (contacts)
                if (data_removed) continue ; // recheck data.json size

                // d) delete old msg. only current user_seq
                i = -1 ;
                for (j=0; ((i==-1) && (j<data.msg.length)) ; j++) if (data.msg[j].user_seq == user_seq) i = j ;
                if ((i == -1) || (data.msg[i].timestamp > one_hour_ago)) {
                    debug('data_cleanup', pgm + 'd: no more old data to remove.');
                    break ;
                }
                // found old data.msg row. find outbox message
                outbox_message = null ;
                debug('data_cleanup', pgm + 'd: data.msg[i].message_sha256 = ' + data.msg[i].message_sha256) ;
                for (j=0 ; j<ls_contacts.length ; j++) {
                    contact = ls_contacts[j] ;
                    for (k=0 ; k<contact.messages.length ; k++) {
                        // debug('data_cleanup', pgm + 'd: k = ' + k + ', folder = ' + contact.messages[k].folder + ', zeronet_msg_id = ' + contact.messages[k].zeronet_msg_id);
                        if (contact.messages[k].folder != 'outbox') continue;
                        if (!contact.messages[k].zeronet_msg_id) continue;
                        if (contact.messages[k].zeronet_msg_id != data.msg[i].message_sha256) continue ;
                        // found outbox message
                        contact_last_online = get_last_online (contact) ;
                        if (contact_last_online > contact.messages[k].sent_at) {
                            debug('data_cleanup', 'd: removing old probably received outbox message from Zeronet. ' +
                                'contact.last_online = ' + contact_last_online +
                                ', outbox_message = ' + JSON.stringify(outbox_message)) ;
                        }
                        else {
                            debug('data_cleanup', 'd: removing old probably not received outbox message from Zeronet. ' +
                                'contact.last_online = ' + contact_last_online +
                                ', outbox_message = ' + JSON.stringify(outbox_message)) ;
                        }
                        outbox_message = contact.messages[k] ;
                        break ;
                    } // for k (contact.messages)
                    if (outbox_message) break ;
                } // for j (contacts)
                if (outbox_message) {
                    // remove reference from outbox to zeronet
                    delete outbox_message.zeronet_msg_id ;
                    delete outbox_message.zeronet_msg_size ;
                    outbox_message.cleanup_at =  now ;
                    local_storage_updated = true ;
                }
                else debug('data_cleanup', pgm + 'd: Warning. Could not find outbox message with zeronet_msg_id ' + data.msg[i].message_sha256) ;
                // remove from zeronet
                data.msg.splice(i,1);

                debug('data_cleanup', pgm + 'd: data.json is big. deleted old message') ;
            } // while true

            // console.log(pgm + 'localStorage.messages (3) = ' + JSON.stringify(local_storage_messages));
            // console.log(pgm + 'ZeroNet data.msg (3) = ' + JSON.stringify(data.msg));
            if (local_storage_updated) ls_save_contacts(false) ;

            available = data_json_max_size - json_raw.length - 100 ;
            if (available < 0) {
                // data.json is too big. User have to delete some outgoing messages.
                // specially outgoing chat messages with picture can be a problem
                error =
                    "Sorry. Cannot send message(s). No more disk space. Missing " + (0-available) + " bytes.<br>" +
                    "Please delete some outgoing messages or remove some images from outgoing chat messages" ;
                console.log(pgm + error);
                ZeroFrame.cmd("wrapperNotification", ["error", error]);
                return false ; // stop
            }
            else {
                debug('data_cleanup', pgm + 'OK. ' + available + ' bytes free in user directory on ZeroNet');
                return true ; // continue. write & publish data.json file
            }


        } // z_update_data_cleanup


        // last step in data.json update - write and publish
        function z_update_data_write_publish (user_seq, data) {
            var data_json_path = "data/users/" + ZeroFrame.site_info.auth_address + "/data.json";
            var json_raw = unescape(encodeURIComponent(JSON.stringify(data, null, "\t")));
            ZeroFrame.cmd("fileWrite", [data_json_path, btoa(json_raw)], function (res) {
                delete zeronet_file_locked[data_json_path] ;
                var pgm = service + '.z_update_data_write_publish fileWrite callback: ' ;
                // console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                if (res === "ok") zeronet_site_publish(user_seq) ;
                else {
                    ZeroFrame.cmd("wrapperNotification", ["error", "Failed to post: " + res.error, 5000]);
                    console.log(pgm + 'Error. Failed to post: ' + res.error) ;
                }
            }); // fileWrite
        } // z_update_data_write_publish


        // user info. Array with tag, value and privacy.
        // saved in localStorage. Shared with contacts depending on privacy choice
        var user_info = [] ;
        function empty_user_info_line() {
            return { tag: '', value: '', privacy: ''} ;
        }
        function guest_account_user_info() {
            var pgm = service + '.guest_account_user_info: ' ;
            // todo: add more info to new guest account
            // - a) could not get html5 geolocation to work. Could be angularJS, ZeroNet or ?
            var timezone = (new Date()).getTimezoneOffset()/60 ;
            var language = navigator.languages ? navigator.languages[0] : navigator.language;
            return [
                { tag: 'Name', value: 'Guest', privacy: 'Search'},
                { tag: '%', value: '%', privacy: 'Search'},
                { tag: 'Timezone', value: '' + timezone, privacy: 'Hidden'},
                { tag: 'Language', value: '' + language, privacy: 'Hidden'}
            ] ;
        }
        function load_user_info (new_guest_account) {
            var pgm = service + '.load_user_info: ';
            // load user info from local storage
            var user_info_str, new_user_info ;
            user_info_str = MoneyNetworkHelper.getItem('user_info') ;
            // console.log(pgm + 'user_info loaded from localStorage: ' + user_info_str) ;
            // console.log(pgm + 'user_info_str = ' + user_info_str) ;
            if (user_info_str) {
                new_user_info = JSON.parse(user_info_str) ;
                new_guest_account = false ;
            }
            else if (new_guest_account) new_user_info = guest_account_user_info();
            else new_user_info = [empty_user_info_line()] ;
            user_info.splice(0,user_info.length) ;
            for (var i=0 ; i<new_user_info.length ; i++) user_info.push(new_user_info[i]) ;
            if (new_guest_account) save_user_info() ;
            // load user info from ZeroNet
            // compare
            console.log(pgm + 'todo: user info loaded from localStorage. must compare with user_info stored in data.json') ;
        }
        function get_user_info () {
            return user_info ;
        }

        function save_user_info () {
            var pgm = service + '.save_user_info: ';

            // cleanup user_info before save
            var user_info_clone = JSON.parse(JSON.stringify(user_info)) ;
            for (var i=0 ; i<user_info_clone.length ; i++) {
                delete user_info_clone[i]['$$hashKey']
            }
            MoneyNetworkHelper.setItem('user_info', JSON.stringify(user_info_clone)) ;

            $timeout(function () {
                MoneyNetworkHelper.ls_save() ;
                z_update_data_json(pgm) ;
                z_contact_search(function () {$rootScope.$apply()}, null) ;
            })
        } // save_user_info

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

        // array and indexes with contacts from localStorage
        // array for angularUI. hash with indexes for fast access
        var ls_contacts = [] ; // array with contacts
        var ls_contacts_index = { //
            unique_id: {}, // from unique_id to contract
            password_sha256: {}, // from group password sha256 value to group contact
            cert_user_id: {}, // from cert_user_id to contact
        } ;

        // contacts array helper functions
        function clear_contacts () {
            var key ;
            ls_contacts.splice(0, ls_contacts.length) ;
            for (key in ls_contacts_index.unique_id) delete ls_contacts_index.unique_id[key] ;
            for (key in ls_contacts_index.password_sha256) delete ls_contacts_index.password_sha256[key] ;
            for (key in ls_contacts_index.cert_user_id) delete ls_contacts_index.cert_user_id[key] ;
        }
        function add_contact (contact) {
            var password_sha256 ;
            ls_contacts.push(contact) ;
            ls_contacts_index.unique_id[contact.unique_id] = contact ;
            if (contact.password) password_sha256 = CryptoJS.SHA256(contact.password).toString() ;
            if (password_sha256) ls_contacts_index.password_sha256[password_sha256] = contact ;
            ls_contacts_index.cert_user_id[contact.cert_user_id] = contact ;
        }
        function remove_contact (index) {
            var contact, password_sha256 ;
            contact = ls_contacts[index] ;
            ls_contacts.splice(index,1) ;
            delete ls_contacts_index.unique_id[contact.unique_id] ;
            if (contact.password) {
                password_sha256 = CryptoJS.SHA256(contact.password).toString() ;
                ls_contacts_index.password_sha256[password_sha256] ;
            }
            delete ls_contacts_index.cert_user_id[contact.cert_user_id] ;
        }
        function update_contact_add_password (contact) { // added password to existing pseudo group chat contact
            var pgm = service + '.update_contact_add_password: ' ;
            var password_sha256 ;
            password_sha256 = CryptoJS.SHA256(contact.password).toString();
            ls_contacts_index.password_sha256[password_sha256] = contact ;
            watch_receiver_sha256.push(password_sha256) ;
            // console.log(pgm + 'listening to group chat address ' + CryptoJS.SHA256(contact.password).toString()) ;
        }
        function get_contact_by_unique_id (unique_id) {
            return ls_contacts_index.unique_id[unique_id] ;
        }
        function get_contact_by_password_sha256 (password_sha256) {
            return ls_contacts_index.password_sha256[password_sha256] ;
        }
        function get_contact_by_cert_user_id (cert_user_id) {
            return ls_contacts_index.cert_user_id[cert_user_id] ;
        }
        function get_contact_name (contact) {
            var i ;
            if (contact.alias) return contact.alias ;
            else if (contact.cert_user_id) {
                i = contact.cert_user_id.indexOf('@') ;
                return contact.cert_user_id.substr(0,i) ;
            }
            else return contact.unique_id.substr(0,13) ;
        } // get_contact_name

        var js_messages = [] ; // array with { :contact => contact, :message => message } - one row for each message
        var ls_msg_factor = 0.67 ; // factor. from ls_msg_size to "real" size. see formatMsgSize filter. used on chat

        // wrappers
        function get_last_online (contact) {
            return MoneyNetworkHelper.get_last_online(contact) ;
        }
        function set_last_online (contact, last_online) {
            MoneyNetworkHelper.set_last_online(contact, last_online) ;
        }


        // check sha256 addresses in localStorage <=> sha256 addresses in data.json file. Should normally be identical
        function check_sha256_addresses (context, update_local_storage, correct_errors) {
            // 3) check data.json. check contacts outbox zeronet_msg_id and data.msg message_sha256
            var user_path = "data/users/" + ZeroFrame.site_info.auth_address ;
            ZeroFrame.cmd("fileGet", [user_path + "/data.json", false], function (data) {
                var pgm = service + '.check_sha256_addresses fileGet callback for ' + context + ': ';
                var my_pubkey, i, user_seq, sha256, sha256_hash, contact, j, message, ls_missing, z_missing, sha256_ok, delete_msg_rows, update_zeronet, now ;
                update_zeronet = false ;
                if (data) data = JSON.parse(data);
                else data = {};
                if (!data.users) data.users = [] ;
                if (!data.msg) data.msg = [] ;
                // console.log(pgm + 'res = ' + JSON.stringify(data)) ;

                // find user_seq for current user
                my_pubkey = MoneyNetworkHelper.getItem('pubkey') ;
                for (i=0 ; i<data.users.length ; i++) {
                    if (data.users[i].pubkey == my_pubkey) user_seq = data.users[i].user_seq ;
                }
                // console.log(pgm + 'user_seq = ' + user_seq)
                if (!user_seq) {
                    // maybe or maybe not an error. but user_seq is link between current user and messages in data.msg array
                    console.log(pgm + 'public key for current user was not found in data.json file');
                    if (update_local_storage) ls_save_contacts(update_zeronet) ;
                    return ;
                }

                // check:
                // 1) messages in localStorage and not on Zeronet
                // 2) messages on Zeronet and not in localStorage
                sha256_hash = {} ;
                // check data.json
                for (i=0 ; i<data.msg.length ; i++) {
                    if (data.msg[i].user_seq != user_seq) continue ;
                    sha256 = data.msg[i].message_sha256 ;
                    if (sha256_hash[sha256]) console.log(pgm + 'error. message_sha256 ' + sha256 + ' it not unique in data.msg array') ;
                    else sha256_hash[sha256] = { z_index: i } ;
                }
                // check localStorage
                for (i=0 ; i<ls_contacts.length ; i++) {
                    contact = ls_contacts[i] ;
                    if (!contact.messages) continue ;
                    for (j=0 ; j<contact.messages.length ; j++) {
                        message = contact.messages[j] ;
                        if (message.folder != 'outbox') continue ;
                        sha256 = message.zeronet_msg_id ;
                        if (!sha256) continue ;
                        if (!sha256_hash[sha256]) sha256_hash[sha256] = {} ;
                        sha256_hash[sha256].ls_message = message ;
                    } // for j (contact.messages)
                } // for i (contacts)
                // check sha256 values
                ls_missing = 0 ;
                z_missing = 0 ;
                sha256_ok = 0 ;
                for (sha256 in sha256_hash) {
                    if (sha256_hash[sha256].hasOwnProperty('z_index') && sha256_hash[sha256].ls_message) {
                        delete sha256_hash[sha256];
                        sha256_ok++ ;
                    }
                    else if (sha256_hash[sha256].ls_message) z_missing++ ;
                    else ls_missing++ ;
                }
                if (sha256_ok) console.log(pgm + sha256_ok + ' ok sha256 addresses') ;
                if (ls_missing) console.log(pgm + ls_missing + ' sha256 addresses from data.json are missing i localStorage') ;
                if (z_missing) console.log(pgm + z_missing + ' sha256 addresses from localStorage are missing i data.json') ;
                if (!correct_errors) {
                    if (update_local_storage) ls_save_contacts(update_zeronet) ;
                    return ;
                }

                delete_msg_rows = [] ;
                now = new Date().getTime() ;
                for (sha256 in sha256_hash) {
                    if (sha256_hash[sha256].ls_message) {
                        // only in localStorage. remove reference to zeronet
                        message = sha256_hash[sha256].ls_message ;
                        delete message.zeronet_msg_id ;
                        delete message.zeronet_msg_size ;
                        message.cleanup_at = now ;
                        update_local_storage = true ;
                    }
                    else delete_msg_rows.push(sha256_hash[sha256].z_index) ;
                }
                delete_msg_rows.sort() ;
                for (i=delete_msg_rows.length-1 ; i >= 0 ; i--) {
                    data.msg.splice(delete_msg_rows[i]) ;
                }
                if (delete_msg_rows.length) update_zeronet = true ;

                if (update_zeronet) {
                    // data.json was updated. update and publish
                    var json_raw = unescape(encodeURIComponent(JSON.stringify(data, null, "\t")));
                    ZeroFrame.cmd("fileWrite", [user_path + '/data.json', btoa(json_raw)], function (res) {
                        var pgm = service + '.check_sha256_addresses fileWrite callback: ' ;
                        // console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                        if (res === "ok") {
                            if (update_local_storage) ls_save_contacts(false) ;
                            zeronet_site_publish(user_seq) ;
                        }
                        else {
                            ZeroFrame.cmd("wrapperNotification", ["error", "Failed to post: " + res.error, 5000]);
                            console.log(pgm + 'Error. Failed to post: ' + res.error) ;
                        }
                    }); // fileWrite

                }
                else if (update_local_storage) ls_save_contacts(false) ;

            }) ; // end fileGet callback (check data.json)

        } // check_sha256_addresses


        // get contacts stored in localStorage
        function ls_load_contacts () {
            var pgm = service + '.ls_load_contacts: ' ;
            var contacts_str, new_contacts, unique_id, new_contact ;
            contacts_str = MoneyNetworkHelper.getItem('contacts') ;
            if (contacts_str) new_contacts = JSON.parse(contacts_str);
            else new_contacts = [] ;
            clear_contacts() ;
            js_messages.splice(0, js_messages.length) ;
            var i, j, contacts_updated = false, receiver_sha256 ;
            var old_contact ;
            var ls_msg_size_total = 0 ;
            var found_group_tag ;
            var no_participants ;

            // startup. fix old errors. migrate to newer structure.
            for (i=0 ; i<new_contacts.length ; i++) {
                new_contact = new_contacts[i] ;
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

                // insert copy of messages into chat friendly array
                for (j=0 ; j<new_contact.messages.length ; j++) {
                    new_contact.messages[j].ls_msg_size = JSON.stringify(new_contact.messages[j]).length ;
                    ls_msg_size_total = ls_msg_size_total + new_contact.messages[j].ls_msg_size ;
                    if (new_contact.messages[j].message.image && new_contact.messages[j].message.image.match(/^http/)) {
                        // fix error. there should not be urls in image.
                        console.log(pgm + 'new_contact.messages[' + j + '] = ' + JSON.stringify(new_contact.messages[j]));
                        delete new_contact.messages[j].message.image ;
                        contacts_updated = true ;
                    }
                    if ((new_contact.messages[j].folder == 'outbox') &&
                        new_contact.messages[j].message.image &&
                        (new_contact.messages[j].message.image.length > 90000)) delete new_contact.messages[j].message.image ; // fix old error. remove very big image from outbox
                    js_messages.push({
                        contact: new_contact,
                        message: new_contact.messages[j]
                    });
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

            var query =
                "select" +
                "  substr(data_json.directory,7) as auth_address, users.user_seq, users.pubkey, users.pubkey2," +
                "  users.encryption, status.timestamp " +
                "from json as data_json, json as content_json, users, json as status_json, status " +
                "where data_json.directory in " ;
            for (i = 0; i < auth_addresses.length; i++) {
                if (i == 0) query += '(' ;
                else query += ',';
                query += "'users/" + auth_addresses[i] + "'";
            } // for i
            query += ") " +
                "and data_json.file_name = 'data.json' " +
                "and data_json.json_id = users.json_id " +
                "and content_json.directory = data_json.directory " +
                "and content_json.file_name = 'content.json' " +
                "and status_json.directory = data_json.directory " +
                "and status_json.file_name = 'status.json' " +
                "and status.json_id = status_json.json_id " +
                "and status.user_seq = users.user_seq" ;
            debug('select', pgm + 'query = ' + query);

            ZeroFrame.cmd("dbQuery", [query], function (res) {
                var pgm = service + '.ls_load_contacts dbQuery callback 1: ';
                // console.log(pgm + 'res.length = ' + res.length);
                if (res.error) {
                    ZeroFrame.cmd("wrapperNotification", ["error", "Search for public keys: " + res.error, 5000]);
                    console.log(pgm + "Search for pubkeys failed: " + res.error);
                    console.log(pgm + 'query = ' + query);
                    console.log(pgm + '2) avatar check skipped and 3) data.json check skipped');
                    return ;
                }

                // console.log(pgm + 'res = ' + JSON.stringify(res));
                var res_hash = {};
                for (var i = 0; i < res.length; i++) {
                    if (!res_hash.hasOwnProperty(res[i].auth_address)) res_hash[res[i].auth_address] = [];
                    res_hash[res[i].auth_address].push({
                        user_seq: res[i].user_seq,
                        pubkey: res[i].pubkey,
                        pubkey2: res[i].pubkey2,
                        encryption: res[i].encryption,
                        last_updated: Math.round(res[i].timestamp / 1000)
                    });
                } // for i
                // console.log(pgm + 'res_hash = ' + JSON.stringify(res_hash));

                // control. check that pubkey in contacts are identical with pubkeys from this query
                var auth_address, unique_id, found_user_seq, found_pubkey, found_pubkey2, found_encryption, found_last_updated;
                // delete contact helper. keep or delete contact without public key?
                var delete_contact = function (contact, i) {
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
                    found_user_seq = null;
                    found_pubkey = null;
                    found_last_updated = null;
                    for (j = 0; j < res_hash[auth_address].length; j++) {
                        unique_id = CryptoJS.SHA256(auth_address + '/' + res_hash[auth_address][j].pubkey).toString();
                        if (contact.unique_id == unique_id) {
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

                // 2) refresh contact avatars
                // source 1: uploaded avatars from files table (users/.../content.json) - pubkey is null - jpg or png
                // source 2: avatar from users table (random assigned avatar) - pubkey is not null - jpg, png or short ref to /public/images/avatar* images
                // source 3: contacts without an avatar will be assigned a random public avatar
                query =
                    "select substr(json.directory,7) as auth_address, null as pubkey, substr(files.filename,8) as avatar " +
                    "from files, json " +
                    "where files.filename like 'avatar%' " +
                    "and json.json_id = files.json_id" +
                    "  union all " +
                    "select substr(json.directory,7) as auth_address, users.pubkey, users.avatar " +
                    "from users, json " +
                    "where users.avatar is not null " +
                    "and json.json_id = users.json_id" ;
                debug('select', pgm + 'query = ' + query) ;
                ZeroFrame.cmd("dbQuery", [query], function (res) {
                    var pgm = service + '.ls_load_contacts dbQuery callback 2: ' ;
                    var i, unique_id, source1_avatars, source2_avatars, contact ;

                    // console.log(pgm + 'res.length = ' + res.length);
                    if (res.error) {
                        ZeroFrame.cmd("wrapperNotification", ["error", "Search for avatars: " + res.error, 5000]);
                        console.log(pgm + "Search for avatars failed: " + res.error);
                        console.log(pgm + 'query = ' + query);
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
                        res.splice(i,1) ;
                    } // for i

                    // find source 1 and 2 avatars. Avatars from source 1 (uploaded avatars) has 1. priority
                    source1_avatars = {} ;
                    source2_avatars = {} ;
                    for (i=0 ; i<res.length ; i++) if (!res[i].pubkey) source1_avatars[res[i].auth_address] = res[i].avatar;
                    for (i=res.length-1 ; i>=0; i--) {
                        if (!res[i].public) continue ; // source 1
                        // source 2
                        if (source1_avatars.hasOwnProperty(res[i].auth_address)) continue ;
                        unique_id = CryptoJS.SHA256(res[i].auth_address + '/'  + res[i].pubkey).toString();
                        source2_avatars[unique_id] = res[i].avatar ;
                    }
                    // console.log(pgm + 'source1_avatars = ' + JSON.stringify(source1_avatars));
                    // console.log(pgm + 'source2_avatars = ' + JSON.stringify(source2_avatars));

                    // apply avatars
                    var index ;
                    for (i=0 ; i<ls_contacts.length ; i++) {
                        contact = ls_contacts[i] ;
                        if (source1_avatars.hasOwnProperty(contact.auth_address)) {
                            contact.avatar = source1_avatars[contact.auth_address] ;
                            continue ;
                        }
                        if (contact.pubkey) {
                            unique_id = CryptoJS.SHA256(contact.auth_address + '/'  + contact.pubkey).toString();
                            if (source2_avatars.hasOwnProperty(unique_id)) {
                                contact.avatar = source1_avatars[unique_id] ;
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
                            index = Math.floor(Math.random() * public_avatars.length);
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

                    // 3) check data.json. check contacts outbox zeronet_msg_id and data.msg message_sha256
                    check_sha256_addresses('ls_load_contacts', false, true) ;

                }); // end dbQuery callback 2 (refresh avatars)

            }) ; // end dbQuery callback 1 (get public, user_seq and timestamp)

        } // end ls_load_contacts
        function get_contacts() {
            return ls_contacts ;
        }
        function ls_save_contacts (update_zeronet) {
            var pgm = service + '.ls_save_contacts: ' ;

            // any logical deleted inbox messages to be physical deleted?
            var i, contact, j, message, auth_address, local_msg_seq, key ;
            for (i=0 ; i<ls_contacts.length ; i++)  {
                contact = ls_contacts[i] ;
                auth_address = contact.auth_address ;
                if (!contact.messages) continue ;
                for (j=contact.messages.length-1 ; j>=0 ; j--) {
                    message = contact.messages[j] ;
                    if (!message.deleted_at) continue ;
                    if (message.folder == 'inbox') {
                        // physical delete inbox message.
                        // 1) remember zeronet_msg_id from deleted message. do not recreate deleted inbox messages
                        if (message.zeronet_msg_id) {
                            if (!contact.inbox_zeronet_msg_id) contact.inbox_zeronet_msg_id = [] ;
                            contact.inbox_zeronet_msg_id.push(message.zeronet_msg_id) ;
                            if (!ignore_zeronet_msg_id[auth_address]) ignore_zeronet_msg_id[auth_address] = [] ;
                            ignore_zeronet_msg_id[auth_address].push(message.zeronet_msg_id) ;
                        }
                        // 2) remember local_msg_seq from deleted inbox messages. Contact may request feedback info for this local_msg_seq later
                        local_msg_seq = message.message.local_msg_seq ;
                        if (local_msg_seq) {
                            if (!contact.deleted_inbox_messages) contact.deleted_inbox_messages = {};
                            key = contact.type == 'group' ? message.participant + ',' + local_msg_seq : local_msg_seq ;
                            contact.deleted_inbox_messages[key] = message.feedback;
                            debug('feedback_info', pgm + 'contact ' + contact.auth_address +
                                ', deleted_inbox_messages = ' + JSON.stringify(contact.deleted_inbox_messages) +
                                ', Object.keys(contact.deleted_inbox_messages) = ' + JSON.stringify(Object.keys(contact.deleted_inbox_messages)));
                        }
                    }
                    else if (message.zeronet_msg_id) {
                        // outbox. wait. zeronet_msg_id reference should be removed in z_update_data_json first before physical delete here
                        debug('data_cleanup', pgm + 'waiting with physical delete of outbox message. zeronet_msg_id has yet been removed. should be done in next z_update_data_json call. message = ' + JSON.stringify(message)) ;
                        continue ;
                    }
                    else {
                        // outbox. remember local_msg_seq from deleted outbox messages. Contact may feedback info for this local_msg_seq later
                        local_msg_seq = message.local_msg_seq ;
                        debug('feedback_info', pgm + 'local_msg_seq = ' + local_msg_seq);
                        if (local_msg_seq) {
                            if (!contact.deleted_outbox_messages) contact.deleted_outbox_messages = {} ;
                            contact.deleted_outbox_messages[message.local_msg_seq] = message.feedback ;
                            debug('feedback_info', pgm + 'contact ' + contact.auth_address +
                                ', deleted_outbox_messages = ' + JSON.stringify(contact.deleted_outbox_messages) +
                                ', Object.keys(contact.deleted_outbox_messages) = ' + JSON.stringify(Object.keys(contact.deleted_outbox_messages))) ;
                        }
                    }
                    contact.messages.splice(j,1);
                } // for j (contact.messages)
            } // for i (contacts)

            // cleanup contacts before save (remove work variables)
            var local_storage_contacts_clone = JSON.parse(JSON.stringify(ls_contacts));
            for (i=local_storage_contacts_clone.length-1 ; i >= 0 ; i--) {
                contact = local_storage_contacts_clone[i] ;
                if ((contact.type == 'new') && (!contact.messages || (contact.messages.length == 0))) {
                    local_storage_contacts_clone.splice(i,1) ;
                    continue ;
                }
                delete contact['$$hashKey'] ;
                delete contact.new_alias ;
                delete contact.user_seq ; // available on ZeroNet
                delete contact.pubkey ; // available on ZeroNet
                delete contact.pubkey2 ; // available on ZeroNet
                delete contact.encryption ; // available on ZeroNet
                if (contact.search) for (j=0 ; j<contact.search.length ; j++) {
                    delete contact.search[j]['$$hashKey'] ;
                    delete contact.search[j].edit_alias ;
                    delete contact.search[j].row ;
                }
                if (contact.messages) for (j=0; j<contact.messages.length ; j++) {
                    delete contact.messages[j]['$$hashKey'] ;
                    delete contact.messages[j].edit_chat_message ;
                    delete contact.messages[j].message.original_image ;
                    delete contact.messages[j].ls_msg_size ;
                }
            }
            //console.log(pgm + 'local_storage_contacts_clone = ' + JSON.stringify(local_storage_contacts_clone)) ;

            MoneyNetworkHelper.setItem('contacts', JSON.stringify(local_storage_contacts_clone)) ;
            if (update_zeronet) {
                // update localStorage and zeronet
                $timeout(function () {
                    MoneyNetworkHelper.ls_save() ;
                    z_update_data_json(pgm) ;
                })
            }
            else {
                // update only localStorage
                $timeout(function () {
                    MoneyNetworkHelper.ls_save() ;
                })
            }
        } // ls_save_contacts



        // update last updated for group chat pseudo contacts
        // return true if any contacts have been updated
        function ls_update_group_last_updated () {
            var pgm = service + '.ls_update_group_last_updated: ' ;
            var i, contact, old_last_online, j, new_last_online, unique_id, participant, k, timestamp, no_participants, found_group_tag, old_no_participants, new_no_participants ;
            var ls_updated = false ;
            var my_unique_id = get_my_unique_id() ;
            for (i=0 ; i<ls_contacts.length ; i++) {
                contact = ls_contacts[i] ;
                if (contact.type != 'group') continue ;
                // update group contact (last online and no participants)
                if (!contact.search) contact.search = [] ;
                old_last_online = get_last_online(contact) || 0 ;
                new_last_online = old_last_online ;
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
                    timestamp = get_last_online(participant) ;
                    if (timestamp && (timestamp > new_last_online)) new_last_online = timestamp ;
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
        // - auth_address - mini update only - update only info for this auth_address - optional
        function z_contact_search (fnc_when_ready, auth_address) {
            var pgm = service + '.z_contact_search: ' ;

            // any relevant user info? User must have tags with privacy Search or Hidden to search network
            var my_search_query, i, row, error ;
            my_search_query = '' ;
            for (i=0 ; i<user_info.length ; i++) {
                row = user_info[i] ;
                if (['Search','Hidden'].indexOf(row.privacy) == -1) continue ;
                row.tag = row.tag.replace(/'/g, "''") ; // escape ' in strings
                row.value = row.value.replace(/'/g, "''") ; // escape ' in strings
                if (my_search_query) my_search_query = my_search_query + " union all" ;
                my_search_query = my_search_query + " select '" + row.tag + "' as tag, '" + row.value + "' as value"
            }
            if (!my_search_query) {
                error = "No search tags in user profile. Please add some tags with privacy Search and/or Hidden and try again" ;
                console.log(pgm + error);
                // console.log(pgm + 'user_info = ' + JSON.stringify(user_info));
                // console.log(pgm + 'my_search_query = ' + my_search_query);
                // ZeroFrame.cmd("wrapperNotification", ["info", error, 3000]);
                return ;
            }

            // check ZeroFrame status. Is ZeroNet ready?
            if (!auth_address) {
                // only relevant in startup sequence. not relevant for file_done_events
                var retry_z_contact_search = function () {
                    z_contact_search (fnc_when_ready, null);
                };
                if (!ZeroFrame.site_info) {
                    // ZeroFrame websocket connection not ready. Try again in 5 seconds
                    console.log(pgm + 'ZeroFrame.site_info is not ready. Try again in 5 seconds. Refresh page (F5) if problem continues') ;
                    setTimeout(retry_z_contact_search,5000); // outside angularjS - using normal setTimeout function
                    return ;
                }
                if (!ZeroFrame.site_info.cert_user_id) {
                    console.log(pgm + 'Auto login process to ZeroNet not finished. Maybe user forgot to select cert. Checking for new contacts in 1 minute');
                    ZeroFrame.cmd("certSelect", [["moneynetwork"]]);
                    setTimeout(retry_z_contact_search,60000);// outside angularjS - using normal setTimeout function
                    return ;
                }
            }

            // check avatars. All contacts must have a valid avatar
            var contact ;
            for (i=0 ; i<ls_contacts.length ; i++) {
                contact = ls_contacts[i] ;
                if (!contact.avatar) debug('invalid_avatars', pgm + 'Error. Pre search check. Contact without avatar ' + JSON.stringify(contact)) ;
            } // for i

            // find json_id and user_seq for current user.
            // must use search words for current user
            // must not return search hits for current user
            var directory = 'users/' + ZeroFrame.site_info.auth_address ;
            var pubkey = MoneyNetworkHelper.getItem('pubkey') ;
            var query = "select json.json_id, users.user_seq from json, users " +
                "where json.directory = '" + directory + "' " +
                "and users.json_id = json.json_id " +
                "and users.pubkey = '" + pubkey + "'";
            debug('select', pgm + 'query 1 = ' + query) ;
            ZeroFrame.cmd("dbQuery", [query], function(res) {
                var pgm = service + '.z_contact_search dbQuery callback 1: ' ;
                var error ;
                // console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                if (res.error) {
                    ZeroFrame.cmd("wrapperNotification", ["error", "Search for new contacts failed: " + res.error, 5000]);
                    console.log(pgm + "Search for new contacts failed: " + res.error) ;
                    console.log(pgm + 'query = ' + query) ;
                    return ;
                }
                if (res.length == 0) {
                    // current user not in data.users array. must be a new user (first save). Try again in 3 seconds
                    console.log(pgm + 'current user not in data.users array. must be a new user (first save). Try again in 3 seconds');
                    // ZeroFrame.cmd("wrapperNotification", ["info", "Updating ZeroNet database. Please wait", 3000]);
                    setTimeout(retry_z_contact_search,3000) ;
                    return ;
                }
                var json_id = res[0].json_id ;
                var user_seq = res[0].user_seq ;
                // console.log(pgm + 'json_id = ' + json_id + ', user_seq = ' + user_seq) ;
                // find other clients with matching search words using sqlite like operator
                // Search: tags shared public on ZeroNet. Hidden: tags stored only in localStorage

                // contacts query without modified timestamp from content.json (keyvalue)
                if (auth_address) debug('select', pgm + 'auth_address = ' + auth_address) ;
                var contacts_query =
                    "select" +
                    "  users.user_seq, users.pubkey, users.pubkey2, users.encryption, users.avatar as users_avatar, users.guest," +
                    "  data_json.directory,  substr(data_json.directory, 7) as auth_address, data_json.json_id as data_json_id," +
                    "  content_json.json_id as content_json_id," +
                    "  keyvalue.value as cert_user_id," +
                    "  (select substr(files.filename,8)" +
                    "   from files, json as avatar_json " +
                    "   where files.filename like 'avatar%'" +
                    "   and avatar_json.json_id = files.json_id" +
                    "   and avatar_json.directory = data_json.directory) as files_avatar," +
                    "  status.timestamp " +
                    "from users, json as data_json, json as content_json, keyvalue, json as status_json, status " ;
                if (auth_address) {
                    // file done event. check only info from this auth_address
                    contacts_query += "where data_json.directory = 'users/" + auth_address + "' " ;
                }
                else {
                    // page startup. general contacts search. all contacts except current user
                    contacts_query += "where users.pubkey <> '" + pubkey + "' " ;
                }
                contacts_query +=
                    "and data_json.json_id = users.json_id " +
                    "and content_json.directory = data_json.directory " +
                    "and content_json.file_name = 'content.json' " +
                    "and keyvalue.json_id = content_json.json_id " +
                    "and keyvalue.key = 'cert_user_id' " +
                    "and status_json.directory = data_json.directory " +
                    "and status_json.file_name = 'status.json' " +
                    "and status.json_id = status_json.json_id " +
                    "and status.user_seq = users.user_seq" ;
                debug('select', pgm + 'contacts_query = ' + contacts_query) ;

                // find contacts with matching tags
                query =
                    "select" +
                    "  my_search.tag as my_tag, my_search.value as my_value," +
                    "  contacts.pubkey as other_pubkey, contacts.pubkey2 as other_pubkey2," +
                    "  contacts.encryption as other_encryption, contacts.guest as other_guest," +
                    "  contacts.auth_address as other_auth_address," +
                    "  contacts.cert_user_id as other_cert_user_id," +
                    "  contacts.timestamp as other_user_timestamp," +
                    "  search.tag as other_tag, search.value as other_value, " +
                    "  contacts.users_avatar as other_users_avatar, contacts.files_avatar as other_files_avatar " +
                    "from (" + my_search_query + ") as my_search, " +
                    "     search, (" + contacts_query + ") as contacts " +
                    "where (my_search.tag like search.tag and search.tag <> '%' and my_search.value like search.value and search.value <> '%' " +
                    "or search.tag like my_search.tag and search.value like my_search.value) " +
                    "and not (search.json_id = " + json_id + " and search.user_seq = " + user_seq + ") " +
                    "and contacts.data_json_id = search.json_id and contacts.user_seq = search.user_seq" ;
                debug('select', pgm + 'query = ' + query) ;

                ZeroFrame.cmd("dbQuery", [query], function(res) {
                    var pgm = service + '.z_contact_search dbQuery callback 2: ';
                    // console.log(pgm + 'res = ' + JSON.stringify(res));
                    if (res.error) {
                        ZeroFrame.cmd("wrapperNotification", ["error", "Search for new contacts failed: " + res.error, 5000]);
                        console.log(pgm + "Search for new contacts failed: " + res.error) ;
                        console.log(pgm + 'query = ' + query) ;
                        return;
                    }
                    if (res.length == 0) {
                        // current user not in data.users array. must be an user without any search words in user_info
                        ZeroFrame.cmd("wrapperNotification", ["info", "No new contacts were found. Please add/edit search/hidden words and try again", 3000]);
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
                    for (var i=0 ; i<res.length ; i++) {
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
                        last_updated = Math.round(res[i].other_user_timestamp / 1000) ;
                        if (unique_ids.indexOf(res[i].other_unique_id)==-1) unique_ids.push(res[i].other_unique_id) ;
                        if (!res_hash.hasOwnProperty(unique_id)) {
                            res_hash[unique_id] = {
                                type: 'new',
                                auth_address: res[i].other_auth_address,
                                cert_user_id: res[i].other_cert_user_id,
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

                    // insert/update/delete new contacts in local_storage_contacts (type=new)
                    // console.log(pgm + 'issue #10#: user_info = ' + JSON.stringify(user_info));
                    var contact, found_unique_ids = [], debug_info ;
                    for (i=ls_contacts.length-1 ; i>= 0 ; i--) {
                        contact = ls_contacts[i] ;
                        if (auth_address && (contact.auth_address != auth_address)) continue ; // checking only one auth_address
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
                            auth_address: res_hash[unique_id].auth_address,
                            cert_user_id: res_hash[unique_id].cert_user_id,
                            avatar: res_hash[unique_id].avatar,
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
                                var index = Math.floor(Math.random() * public_avatars.length);
                                new_contact.avatar = public_avatars[index] ;
                            }
                        }
                        add_contact(new_contact) ;
                        // console.log(pgm + 'new_contact = ' + JSON.stringify(new_contact));
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
                    fnc_when_ready() ;

                });
            }) ;

        } // z_contact_search


        // return chat friendly message array
        function js_get_messages() {
            return js_messages ;
        }

        function get_ls_msg_factor () {
            return ls_msg_factor ;
        }

        function next_local_msg_seq () {
            // next local msg seq
            var local_msg_seq = MoneyNetworkHelper.getItem('msg_seq');
            if (local_msg_seq) local_msg_seq = JSON.parse(local_msg_seq) ;
            else local_msg_seq = 0 ;
            local_msg_seq++ ;
            // no ls_save. next_local_msg_seq must be part of a contact update operation - ingoing or outgoing messages
            MoneyNetworkHelper.setItem('msg_seq', JSON.stringify(local_msg_seq)) ;
            return local_msg_seq ;
        } // next_local_msg_seq


        // array with messages with unknown unique id for contact.
        // must create contact and process message once more
        var new_unknown_contacts = [] ;

        // array with receipts to send. for example receipts for chat with image where image should be deleted from ZeroNet fast to free space
        var new_incoming_receipts = 0 ;
        var new_outgoing_receipts = [] ;

        // helper. Used on local_storage_read_messages (after login) and event_file_done (incoming files after login)
        function process_incoming_message (res, unique_id) {
            var pgm = service + '.process_incoming_message: ' ;
            var contact, i, my_prvkey, encrypt, password, decrypted_message_str, decrypted_message, sender_sha256, error ;
            var local_msg_seq, message, contact_or_group ;

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
                try {
                    decrypted_message_str = MoneyNetworkHelper.decrypt(res.message, group_chat_contact.password)
                }
                catch (err) {
                    console.log(pgm + 'Ignoring message with invalid encryption. error = ' + err.message) ;
                    return false
                }
            }
            else if (res.message.indexOf(',') == -1) {
                // key and no iv in message - JSEncrypt encryption

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
                if (!res.hasOwnProperty('decrypted_message_str')) {
                    // decrypt and callback to this function. two cryptMessage callbacks and return to this function when done
                    process_incoming_cryptmessage(res, unique_id) ;
                    // stop.
                    return false ;
                }
                // already decrypted. continue
                decrypted_message_str = res.decrypted_message_str ;
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
                if (user_setup.block_guests) {
                    // console.log(pgm + 'blocking quests and ignoring message from guest ' + JSON.stringify(contact));
                    return false ;
                }
                if (user_setup.block_guests_at && (res.timestamp < user_setup.block_guests_at)) {
                    // console.log(pgm + 'no longer blocking quests but ignoring old blocked message from guest ' + JSON.stringify(contact));
                    return false ;
                }
            }
            if (contact.type == 'ignored') {
                if (user_setup.block_ignored) {
                    // console.log(pgm + 'blocking message from contact on ignored list ' + JSON.stringify(contact));
                    return false ;
                }
                if (user_setup.block_ignored_at && (res.timestamp < user_setup.block_ignored_at)) {
                    // console.log(pgm + 'no longer blocking messages from ignored list but ignoring old blocked message from contact ' + JSON.stringify(contact));
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
            if (decrypted_message.sent_at) {
                debug('lost_message', pgm + 'message with sent_at timestamp. must be contact resending a lost message');
                debug('lost_message', pgm + 'decrypted_message = ' + JSON.stringify(decrypted_message));
                // 1) find message with same local_msg_seq
                index = -1;
                for (i = 0; i < contact_or_group.messages.length; i++) {
                    message = contact_or_group.messages[i];
                    if (message.folder != 'inbox') continue;
                    if (message.message.local_msg_seq != decrypted_message.local_msg_seq) continue;
                    if (message.message.msgtype != 'lost msg') {
                        debug('lost_message', 'message with local_msg_seq ' + decrypted_message.local_msg_seq + ' is in inbox but is not a lost message any longer. Ignoring ingoing message');
                        return false;
                    }
                    index = i;
                    break;
                }
                if (index != -1) {
                    // OK - delete lost msg
                    debug('lost_message', pgm + 'old lost msg placeholder was found. deleting it');
                    message = contact_or_group.messages[index];
                    contact_or_group.messages.splice(index, 1);
                    for (i = js_messages.length - 1; i >= 0; i--) {
                        if (js_messages[i].message.local_msg_seq != message.local_msg_seq) continue;
                        js_messages.splice(i, 1);
                        break;
                    }
                }
                else {
                    // lost msg not found. continue as normal new msg
                    debug('lost_message', pgm + 'lost msg placeholder with local_msg_seq ' + decrypted_message.local_msg_seq + ' was not found. continue as normal new incoming message');
                    delete decrypted_message.sent_at;
                }

            } // if decrypted_message.sent_at

            // save incoming message
            local_msg_seq = next_local_msg_seq() ;
            message = {
                local_msg_seq: local_msg_seq,
                folder: 'inbox',
                message: decrypted_message,
                zeronet_msg_id: res.message_sha256,
                sender_sha256: sender_sha256,
                sent_at: decrypted_message.sent_at || res.timestamp,
                receiver_sha256: res.receiver_sha256,
                received_at: new Date().getTime()} ;
            if (!sender_sha256) delete message.sender_sha256 ;
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

            contact_or_group.messages.push(message);
            js_messages.push({
                contact: contact_or_group,
                message: message
            });

            if (message.receiver_sha256) {
                // this message is using a sender_sha256 address from a previous sent message (add contact, chat etc)
                // keep track of used sender_sha256 in outgoing messages. Must cleanup old no longer used sender_sha256 addresses
                if (!contact.hasOwnProperty('outbox_sender_sha256')) contact.outbox_sender_sha256 = {} ;
                if (!contact.outbox_sender_sha256.hasOwnProperty(message.receiver_sha256)) {
                    // add { sent_at: message.send_at } for this sha256 address
                    for (i=0 ; i<contact.messages.length ; i++) {
                        if (contact.messages[i].folder != 'outbox') continue ;
                        if (contact.messages[i].sender_sha256 != message.receiver_sha256) continue ;
                        contact.messages[i].feedback = message.received_at ;
                        contact.outbox_sender_sha256[message.receiver_sha256] = { sent_at: contact.messages[i].sent_at } ;
                        break ;
                    } // for i (contact.messages)
                    if (!contact.outbox_sender_sha256.hasOwnProperty(message.receiver_sha256)) {
                        console.log(
                            pgm + 'UPS. Received message with receiver_sha256 ' + message.receiver_sha256 +
                            ' but no messages in outbox with this sender_sha256. Must be a system error.') ;
                        // UPS. Received message with receiver_sha256 e346beeb733af0d1948ce0ebd32ad39cf937d195b45d90d58d7304d725eebd59 but no messages in outbox with this sender_sha256. Must be a system error.
                        contact.outbox_sender_sha256[message.receiver_sha256] = { sent_at: message.sent_at }
                    }
                }
                if (!contact.outbox_sender_sha256[message.receiver_sha256].last_used_at ||
                    (message.sent_at > contact.outbox_sender_sha256[message.receiver_sha256].last_used_at)) {
                    contact.outbox_sender_sha256[message.receiver_sha256].last_used_at = message.sent_at ;
                }// console.log(pgm + 'updated contact.sha256. contact = ' + JSON.stringify(contact));
            }


            // post processing new incoming messages

            // any feedback info?
            var feedback = decrypted_message.feedback ;
            if (feedback) {
                // received feedback info. what messages have contact sent. what messages is contact waiting for feedback for
                debug('feedback_info || inbox && unencrypted', pgm + 'feedback = ' + JSON.stringify(feedback));
                // decrypted_message.feedback = {"received":[468,469,470,473],"sent":[4]} ;
                receive_feedback_info(message, contact_or_group) ;
            }

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
                    old_message_envelope.deleted_at = message.sent_at ;
                    debug('inbox && unencrypted', pgm + 'received OK update to an old chat msg') ;
                    debug('inbox && unencrypted', pgm + 'new decrypted_message = ' + JSON.stringify(decrypted_message));
                    debug('inbox && unencrypted', pgm + 'old_message_envelope  = ' + JSON.stringify(old_message_envelope));
                }
                // empty chat msg update => delete chat message
                if (!decrypted_message.message) message.deleted_at = message.sent_at ;
            } // end chat msg

            if ((decrypted_message.msgtype == 'chat msg') && decrypted_message.image) {
                if (decrypted_message.image == 'x') {
                    // x = edit chat message with unchanged image
                    decrypted_message.image = old_message_envelope.message.image ;
                }
                else {
                    // received a chat message with an image. Send receipt so that other user can delete msg from data.json and free disk space
                    // privacy issue - monitoring ZeroNet files will reveal who is chatting. Receipt makes this easier to trace.
                    var receipt = { msgtype: 'received', remote_msg_seq: decrypted_message.local_msg_seq };
                    // validate json
                    error = MoneyNetworkHelper.validate_json(pgm, receipt, receipt.msgtype, 'Cannot send receipt for chat message');
                    if (error) console(pgm + error) ;
                    else new_outgoing_receipts.push({ contact: contact, message: receipt}) ;
                }
            } // end chat msg

            if (decrypted_message.msgtype == 'received') {
                // received receipt for outgoing chat message with image.
                // remove chat message from ZeroNet to free disk space
                // must update zeronet
                // a) receipt from a normal chat. just update data.json. cleanup code in z_update_data_json
                // b) receipt from a group chat. should cleanup data.json when all receipts have been received.
                //    see chatCtrl.chat_filter
                debug('inbox && unencrypted', pgm + 'received receipt from contact. expects old outgoing chat message with image to be removed from data.json and zeronet_msg_size to be updated') ;
                debug('inbox && unencrypted', pgm + 'decrypted_message = ' + JSON.stringify(decrypted_message));
                // debug('inbox && unencrypted', pgm + 'contact.messages = ' + JSON.stringify(contact.messages));
                // check if image chat was a group chat image message
                var remote_msg_seq = decrypted_message.remote_msg_seq ;
                // debug('inbox && unencrypted', pgm + 'check if image chat was a group chat image message. remote_msg_seq = ' + remote_msg_seq);
                var message2 ;
                for (i = 0; i < js_messages.length; i++) if (js_messages[i].message.local_msg_seq == remote_msg_seq) {
                    message2 = js_messages[i];
                    // debug('chat_filter', pgm + 'remote_msg_seq = ' + remote_msg_seq + ', message2.message = ' + JSON.stringify(message2.message));
                    break;
                }
                // debug('inbox && unencrypted', pgm + 'message2 = ' + JSON.stringify(message2));
                if (message2 && (message2.contact.type == 'group')) {
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
                        new_incoming_receipts++
                    }
                }
                else {
                    debug('inbox && unencrypted', pgm + 'image receipt was from a normal chat message');
                    // debug('inbox && unencrypted', pgm + 'message = ' + JSON.stringify(message));
                    // debug('inbox && unencrypted', pgm + 'message2 = ' + JSON.stringify(message2));
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
                var participant, j ;
                var last_updated = 0, timestamp ;
                for (i=0 ; i<decrypted_message.participants.length ; i++) {
                    if (decrypted_message.participants[i] == my_unique_id) continue ;
                    participant = get_contact_by_unique_id(decrypted_message.participants[i]) ;
                    if (!participant) console.log(pgm + 'warning. could not find participant with unique id ' + decrypted_message.participants[i]) ;
                    else {
                        timestamp = MoneyNetworkHelper.get_last_online(participant) ;
                        if (timestamp > last_updated) last_updated = timestamp ;
                    }
                } // for i
                // find unique id for pseudo group chat contact.
                var group_chat_unique_id = CryptoJS.SHA256(JSON.stringify(decrypted_message.participants)).toString() ;
                console.log(pgm + 'group_chat_unique_id = ' + group_chat_unique_id) ;
                var group_chat_contact = get_contact_by_unique_id(group_chat_unique_id);
                if (group_chat_contact) console.log(pgm + 'group_chat_contact = ' + JSON.stringify(group_chat_contact)) ;
                else console.log(pgm + 'could not find group chat contact with unique id ' + group_chat_unique_id) ;
                if (!group_chat_contact) {
                    // create pseudo chat group contact
                    var public_avatars = MoneyNetworkHelper.get_public_avatars() ;
                    index = Math.floor(Math.random() * public_avatars.length);
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
                    if (last_updated) group_chat_contact.search.push({tag: 'Online', value: last_updated, privacy: 'Search', row: 1}) ;
                    group_chat_contact.search.push({
                        tag: 'Group',
                        value: group_chat_contact.participants.length + ' participants',
                        privacy: 'Search',
                        row: group_chat_contact.search.length+1
                    });
                    add_contact(group_chat_contact) ;
                    watch_receiver_sha256.push(CryptoJS.SHA256(decrypted_message.password).toString()) ;
                }
            }

            // todo: add more message post processing ...

            return true ;

        } // process_incoming_message


        // process incoming cryptMessage encrypted message
        function process_incoming_cryptmessage (res, unique_id) {
            var pgm = service + '.process_incoming_cryptmessage: ' ;

            var message_array = res.message.split(',') ;
            var iv = message_array[0] ;
            var encrypted = message_array[1] ;
            // console.log(pgm + 'iv = ' + iv + ', encrypted = ' + encrypted) ;

            ZeroFrame.cmd("eciesDecrypt", [res.key, user_id], function(password) {
                var pgm = service + '.process_incoming_cryptmessage eciesDecrypt callback 1: ' ;
                // console.log(pgm + 'password = ' + password) ;

                // decrypt step 2 - decrypt message
                ZeroFrame.cmd("aesDecrypt", [iv, encrypted, password], function (decrypted_message_str) {
                    var pgm = service + '.process_incoming_cryptmessage aesDecrypt callback 2: ' ;
                    // console.log(pgm + 'decrypted_message_str = ' + decrypted_message_str);

                    // done. save decrypted message and return to process_incoming_message
                    res.decrypted_message_str = decrypted_message_str ;

                    var contacts_updated = false ;
                    // console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                    if (process_incoming_message(res, unique_id)) contacts_updated = true ;

                    // same post processing as in file_done_event
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
                        z_update_data_json(pgm) ;
                        $rootScope.$apply() ;
                    }
                    else if (contacts_updated) {
                        $rootScope.$apply() ;
                        ls_save_contacts(false) ;
                    }

                    // any message with unknown unique id in incoming file?
                    if (new_unknown_contacts.length > 0) create_new_unknown_contacts() ;

                });  // callback 2

            }); // callback 1

        } // process_crypt_message


        // from processing new incoming messages. Any receipts to send. for example used for chat messages with image attachments.
        function send_new_receipts () {
            var pgm = service + '.send_new_receipts: ' ;
            if (new_outgoing_receipts.length == 0) return ;
            for (var i=0 ; i<new_outgoing_receipts.length ; i++) add_msg(new_outgoing_receipts[i].contact,new_outgoing_receipts[i].message) ;
            new_outgoing_receipts.splice(0, new_outgoing_receipts.length) ;
            z_update_data_json('send_new_receipts');
        } // send_new_receipts


        // create contacts with unknown unique id in incoming messages
        // contact not in my search results but I am in other users search result
        function create_new_unknown_contacts() {
            var pgm = service + '.create_unknown_contacts: ' ;
            if (new_unknown_contacts.length == 0) return ;
            console.log(pgm + 'new_unknown_contacts = ' + JSON.stringify(new_unknown_contacts));
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
            var auth_address, expected_auth_addresses = [], unique_id, expected_unique_ids = [] ;
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

            // build query for contact information.
            // auth_address is used is where condition and select will sometimes return more than one user for each auth_address
            // only users with correct unique_id are relevant
            var contacts_query =
                "select" +
                "  users.user_seq, users.pubkey, users.avatar as users_avatar," +
                "  data_json.directory,  substr(data_json.directory, 7) as auth_address, data_json.json_id as data_json_id," +
                "  content_json.json_id as content_json_id," +
                "  keyvalue.value as cert_user_id," +
                "  (select substr(files.filename,8)" +
                "   from files, json as avatar_json " +
                "   where files.filename like 'avatar%'" +
                "   and avatar_json.json_id = files.json_id" +
                "   and avatar_json.directory = data_json.directory) as files_avatar, " +
                "  status.timestamp " +
                "from users, json as data_json, json as content_json, keyvalue as keyvalue, json as status_json, status " +
                "where data_json.json_id = users.json_id " +
                "and substr(data_json.directory, 7) in " ;
            for (i=0 ; i<expected_auth_addresses.length ; i++) {
                if (i==0) contacts_query = contacts_query + '(' ;
                else contacts_query = contacts_query + ', ' ;
                contacts_query = contacts_query + "'" + expected_auth_addresses[i] + "'" ;
            } // for i
            contacts_query = contacts_query + ") " +
                "and content_json.directory = data_json.directory " +
                "and content_json.file_name = 'content.json' " +
                "and keyvalue.json_id = content_json.json_id " +
                "and keyvalue.key = 'cert_user_id' " +
                "and status_json.directory = data_json.directory " +
                "and status_json.file_name = 'status.json' " +
                "and status.json_id = status_json.json_id " +
                "and status.user_seq = users.user_seq" ;
            debug('select', pgm + 'contacts_query = ' + contacts_query) ;

            ZeroFrame.cmd("dbQuery", [contacts_query], function (res) {
                var pgm = service  + '.create_unknown_contacts dbQuery callback: ';
                var found_auth_addresses = [], i, unique_id, new_contact, public_avatars, index, j, last_updated ;
                // console.log(pgm + 'res = ' + JSON.stringify(res));
                if (res.error) {
                    ZeroFrame.cmd("wrapperNotification", ["error", "Search for new unknown contacts failed: " + res.error, 5000]);
                    console.log(pgm + "Search for new contacts failed: " + res.error) ;
                    console.log(pgm + 'contacts_query = ' + contacts_query) ;
                    new_unknown_contacts.splice(0,new_unknown_contacts.length)
                    return;
                }
                // drop contacts with other unique ids (multiple users with identical cert_user_id / auth_address)
                for (i=res.length-1 ; i >= 0 ; i--) {
                    unique_id = CryptoJS.SHA256(res[i].auth_address + '/'  + res[i].pubkey).toString();
                    if (expected_unique_ids.indexOf(unique_id) == -1) res.splice(i,1);
                }
                if (res.length == 0) {
                    ZeroFrame.cmd("wrapperNotification", ["error", "Search for new unknown contacts failed. No contacts were found", 5000]);
                    new_unknown_contacts.splice(0,new_unknown_contacts.length)
                    console.log(pgm + "Search for new unknown contacts failed. No contacts were found") ;
                    console.log(pgm + 'contacts_query = ' + contacts_query) ;
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
                            index = Math.floor(Math.random() * public_avatars.length);
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
                    console.log(pgm + 'contacts_query = ' + contacts_query) ;
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


        // after login - check for new ingoing messages (dbQuery)
        var watch_receiver_sha256 = [] ; // listen for sha256 addresses
        var ignore_zeronet_msg_id = {} ; // ignore already read messages. hash auth_address => [ sha256 addresses ]
        function local_storage_read_messages () {
            var pgm = service + '.local_storage_read_messages: ' ;

            // initialize watch_sender_sha256 array with relevant sender_sha256 addresses
            // that is sha256(pubkey) + any secret sender_sha256 reply addresses sent to contacts in money network
            var my_pubkey, my_pubkey_sha256, my_prvkey, i, j, contact, auth_address, reason, message, key ;
            var participant_unique_id, participant, my_auth_address, now ;
            my_pubkey = MoneyNetworkHelper.getItem('pubkey') ;
            my_pubkey_sha256 = CryptoJS.SHA256(my_pubkey).toString();
            // my_auth_address = ZeroFrame.site_info.auth_address ;
            now = new Date().getTime() ;

            // after login. initialize arrays with watch and ignore sha256 lists
            watch_receiver_sha256.splice(0, watch_receiver_sha256.length);
            for (auth_address in ignore_zeronet_msg_id) delete ignore_zeronet_msg_id[auth_address] ;
            watch_receiver_sha256.push(my_pubkey_sha256);
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
                                    console.log(pgm + 'contact = ' + JSON.stringify(contact));
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
                    if (!ignore_zeronet_msg_id[auth_address]) ignore_zeronet_msg_id[auth_address] = []
                    for (j=0 ; j<contact.inbox_zeronet_msg_id.length ; j++) ignore_zeronet_msg_id[auth_address].push(contact.inbox_zeronet_msg_id[j]) ;
                }
            } // i (contacts)

            // console.log(pgm + 'watch_receiver_sha256 = ' + JSON.stringify(watch_receiversender_sha256)) ;
            // console.log(pgm + 'ignore_zeronet_msg_id = ' + JSON.stringify(ignore_zeronet_msg_id)) ;

            // fetch relevant messages
            // 1) listening to relevant receiver_sha256 addresses
            var query =
                "select" +
                "  messages.user_seq, messages.receiver_sha256, messages.key, messages.message," +
                "  messages.message_sha256, messages.timestamp, messages.json_id, " +
                "  users.pubkey, substr(json.directory,7) auth_address " +
                "from messages, users, json " +
                "where ( messages.receiver_sha256 in ('" + watch_receiver_sha256[0] + "'" ;
            for (i=1 ; i<watch_receiver_sha256.length ; i++) query = query + ", '" + watch_receiver_sha256[i] + "'" ;
            query = query + ')' ;
            // 2) check if previously received inbox messages been deleted from zeronet
            // 3) check if previously deleted inbox messages have been deleted from zeronet
            var first = true ;
            for (auth_address in ignore_zeronet_msg_id) {
                for (i=0 ; i<ignore_zeronet_msg_id[auth_address].length ; i++) {
                    if (first) { query += " or messages.message_sha256 in (" ; first = false }
                    else query += ", " ;
                    query += "'" + ignore_zeronet_msg_id[auth_address][i] + "'" ;
                }
            }
            if (!first) query += ')' ;
            query = query + " )" +
                "and users.json_id = messages.json_id " +
                "and users.user_seq = messages.user_seq " +
                "and json.json_id = messages.json_id" ;
            debug('select', pgm + 'query = ' + query) ;

            ZeroFrame.cmd("dbQuery", [query], function(res) {
                var pgm = service + '.local_storage_read_messages dbQuery callback: ';
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
                    console.log(pgm + 'query = ' + query);
                    return;
                }

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
                    if (unique_id == my_unique_id) {
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
                    z_update_data_json(pgm) ;
                    $rootScope.$apply() ;
                }
                else if (contacts_updated) ls_save_contacts(false) ;

                // any message with unknown unique id in incoming messages. Create new unknown contacts and try again
                if (new_unknown_contacts.length > 0) create_new_unknown_contacts() ;

            });

        } // local_storage_read_messages


        // add message to contact
        function add_msg(contact, message) {
            var pgm = service + '.add_message: ' ;
            // save message in localStorage. local_storage_save_messages / z_update_data_json call will encrypt and add encrypted message to data.json (ZeroNet)
            if (!contact.messages) contact.messages = [] ;
            contact.messages.push({
                folder: 'outbox',
                message: message
            }) ;
            // console.log(pgm + 'sending ' + message.msgtype + ' message. My auth_address is ' + ZeroFrame.site_info.auth_address);
            debug('outbox && unencrypted', pgm + 'contact.messages.last = ' + JSON.stringify(contact.messages[contact.messages.length-1])) ;
            js_messages.push({
                contact: contact,
                message: contact.messages[contact.messages.length-1]
            });
            // console.log(pgm + 'contact = ' + JSON.stringify(contact));
        } // add_msg


        // delete previously send message. returns true if ZeroNet must be updated after calling the method
        function remove_msg (local_msg_seq) {
            var pgm = service + '.remove_msg: ' ;
            var msg, zeronet_update, message_deleted, i, contact, j, k;
            // console.log(pgm + 'local_msg_seq = ' + local_msg_seq);
            zeronet_update = false ;
            for (i=0; i<ls_contacts.length ; i++) {
                contact = ls_contacts[i] ;
                if (!contact.messages) contact.messages = [] ;
                for (j=contact.messages.length-1 ; j >= 0 ; j--){
                    if (contact.messages[j].folder != 'outbox') continue ;
                    msg = contact.messages[j] ;
                    if (msg.local_msg_seq == local_msg_seq) {
                        if (msg.zeronet_msg_id) {
                            // already on ZeroNet. Delete mark message. Will be processed in next z_update_data_json call
                            msg.deleted_at = new Date().getTime() ;
                            zeronet_update = true ;
                        }
                        else {
                            // not on ZeroNet. delete message
                            // a) delete from chat friendly javascript array
                            for (k=js_messages.length-1 ; k >= 0 ; k--) {
                                if (js_messages[k].message.local_msg_seq == local_msg_seq) {
                                    js_messages.splice(k,1);
                                }
                            } // for k (javascript_messages)
                            // b) delete from contact (localStorage)
                            contact.messages.splice(j,1)
                        }
                    }
                } // for j (messages)
            } // for i (contacts)
            return zeronet_update ;
        } // remove_msg

        // return avatar for user or assign a random avatar to user
        var avatar = { src: "public/images/avatar1.png", loaded: false } ;
        function load_avatar () {
            var pgm = service + '.load_avatar: ';
            if (avatar.loaded) return ; // already loaded

            // set previous avatar from setup before checking zeronet
            if (user_setup.avatar && (['jpg','png'].indexOf(user_setup.avatar) == -1)) {
                // public avatar found in user setup
                avatar.src = 'public/images/avatar' + user_setup.avatar ;
                console.log(pgm + 'from user setup. temporary setting user avatar to ' + avatar.src);
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
                ZeroFrame.cmd("certSelect", [["moneynetwork"]]);
                 $timeout(retry_load_avatar,60000);
                return ;
            }
            if (user_setup.avatar && (['jpg','png'].indexOf(user_setup.avatar) != -1)) {
                // uploaded avatar found in user setup
                avatar.src = 'data/users/' + ZeroFrame.site_info.auth_address + '/avatar.' + user_setup.avatar ;
                console.log(pgm + 'from user setup. temporary setting user avatar to ' + avatar.src);
            }

            // 1) get content.json - check if user already has uploaded an avatar
            var user_path = "data/users/" + ZeroFrame.site_info.auth_address ;
            ZeroFrame.cmd("fileGet", [user_path + "/content.json", false], function (res) {
                var pgm = service + '.load_avatar fileGet callback 1: ';
                if (res) res = JSON.parse(res);
                else res = { files: {} } ;
                // console.log(pgm + 'res = ' + JSON.stringify(res));
                if (res.files["avatar.jpg"]) {
                    // console.log(pgm + 'found avatar.jpg') ;
                    avatar.src = user_path + '/avatar.jpg';
                    avatar.loaded = true ;
                    $rootScope.$apply() ;
                    return ;
                }
                if (res.files["avatar.png"]) {
                    // console.log(pgm + 'found avatar.png') ;
                    avatar.src = user_path + '/avatar.png';
                    avatar.loaded = true ;
                    $rootScope.$apply() ;
                    return ;
                }
                // 2) no user avatar found - use previous selection in localStorage
                var ls_avatar = user_setup.avatar ;
                if (ls_avatar) {
                    // console.log(pgm + 'found from user_setup. ls_avatar = ' + JSON.stringify(ls_avatar)) ;
                    avatar.src = "public/images/avatar" + ls_avatar;
                    avatar.loaded = true ;
                    $rootScope.$apply() ;
                    return ;
                }
                // 3) assign random avatar from public/images/avatar
                // console.log(pgm + 'assigned random avatar') ;
                var public_avatars = MoneyNetworkHelper.get_public_avatars() ;
                var index = Math.floor(Math.random() * public_avatars.length);
                avatar.src = "public/images/avatar" + public_avatars[index] ;
                avatar.loaded = true ;
                $rootScope.$apply() ;
                user_setup.avatar = public_avatars[index] ;
                MoneyNetworkHelper.ls_save();
            });
        } // load_avatar
        function get_avatar () {
            return avatar ;
        }

        // wait for setSiteInfo events (new files)
        function event_file_done (event, filename) {
            var pgm = service + '.event_file_done: ' ;
            if (event != 'file_done') return ;
            if (!user_id) return ; // not logged in - just ignore - will be dbQuery checked after client login
            // process user files:
            // - data/users/<auth_address>/content.json - check for avatar uploads
            // - data/users/<auth_address>/data.json - check for new messages
            // - ignore all other files from Money Network
            if (filename.substr(0,11) != 'data/users/') return ;
            if (!filename.match(/json$/)) return ;
            // must be content.json or data.json
            debug('file_done', pgm + 'filename = ' + filename) ;

            // read json file (content.json, data.json or status.json)
            ZeroFrame.cmd("fileGet", [filename, false], function (res) {
                var pgm = service + '.event_file_done fileGet callback: ';
                var content_json_avatar, i, contact, auth_address, contacts_updated, index ;
                if (!res) res = {} ;
                else res = JSON.parse(res) ;
                // console.log(pgm + 'res = ' + JSON.stringify(res));

                if (filename.match(/content\.json$/)) {
                    // content.json - check avatar in files. null, jpg or pgn
                    if (res.files['avatar.jpg']) content_json_avatar = 'jpg' ;
                    else if (res.files['avatar.png']) content_json_avatar = 'png' ;
                    else content_json_avatar = null ;
                    // check contacts
                    var public_avatars, avatar_short_path ;
                    contact = get_contact_by_cert_user_id(res.cert_user_id);
                    if (!contact) return ;
                    if (contact.avatar == content_json_avatar) return ;

                    // avatar (maybe) updated
                    if (content_json_avatar) {
                        // not null avatar in content.json - uploaded avatar.
                        contact.avatar = avatar_short_path;
                    }
                    else {
                        // null avatar in content.json
                        if (['jpg', 'png'].indexOf(contact.avatar) != -1) {
                            // previosly uploaded avatar has been deleted. Assign random avatar to contact.
                            public_avatars = MoneyNetworkHelper.get_public_avatars();
                            index = Math.floor(Math.random() * public_avatars.length);
                            avatar_short_path = public_avatars[index];
                            contact.avatar = avatar_short_path;
                        }
                        else {
                            // OK. Contact has already an random assigned public avatar
                            return ;
                        }
                    }

                    $rootScope.$apply();
                    ls_save_contacts(false);
                    return ;
                } // end reading content.json

                if (filename.match(/data\.json$/)) {

                    contacts_updated = false ;

                    // check users/search arrays. create/update/delete contact and search information for this auth_address only
                    auth_address = filename.split('/')[2] ;
                    z_contact_search (function () { $rootScope.$apply()}, auth_address) ;
                    // debug('file_done', pgm + 'called z_contact_search for auth_address ' + auth_address) ;

                    // check msg array
                    if (!res.msg) res.msg = [] ;
                    var pubkey, j, unique_id, cleanup_inbox_messages, message, zeronet_msg_id ;
                    // debug('file_done', pgm + 'watch_receiver_sha256 = ' + JSON.stringify(watch_receiver_sha256));
                    // debug('file_done', pgm + 'res.msg.length before = ' + res.msg.length) ;

                    // find inbox messages that have been cleanup from zeronet
                    // maybe cleanup after contact has received feedback info
                    // maybe contact data.json file has too big
                    if (ignore_zeronet_msg_id[auth_address]) {
                        cleanup_inbox_messages = JSON.parse(JSON.stringify(ignore_zeronet_msg_id[auth_address])) ;
                        for (i=0 ; i<res.msg.length ; i++) {
                            index = cleanup_inbox_messages.indexOf(res.msg[i].message_sha256) ;
                            if (index != -1) cleanup_inbox_messages.splice(index,1) ;
                        }
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

                            // recheck cleanup_inbox_messages.length. should be empty now!
                            if (cleanup_inbox_messages.length > 0) {
                                // only debug info if in case of error
                                debug('file_done', pgm + 'processing new incoming messages from msg array. should also detect previously received messages that have been deleted from msg array');
                                debug('file_done', pgm + 'res.msg = ' + JSON.stringify(res.msg)) ;
                                debug('file_done', pgm + 'ignore_zeronet_msg_id[auth_address] = ' + JSON.stringify(ignore_zeronet_msg_id[auth_address])) ;
                                debug('file_done', 'one or more sha256 addresses in cleanup_inbox_messages was not found for contacts with auth_address ' + auth_address + '. cleanup_inbox_messages ' + JSON.stringify(cleanup_inbox_messages));
                            }

                        }
                    }

                    for (i=0 ; i<res.msg.length ; i++) {
                        // debug('file_done', pgm + 'res.msg[' + i + '].receiver_sha256 = ' + res.msg[i].receiver_sha256);
                        if (watch_receiver_sha256.indexOf(res.msg[i].receiver_sha256) == -1) {
                            // not listening for this sha256 address
                            continue ;
                        }
                        if (ignore_zeronet_msg_id[auth_address] &&
                            (ignore_zeronet_msg_id[auth_address].indexOf(res.msg[i].message_sha256) != -1)) {
                            // message already received
                            continue ;
                        }
                        // debug('file_done', pgm + 'receive message ' + JSON.stringify(res.msg[i]));

                        // find unique id for contact
                        pubkey = null ;
                        for (j=0 ; j<res.users.length ; j++) if (res.users[j].user_seq == res.msg[i].user_seq) pubkey = res.users[j].pubkey ;
                        if (!pubkey) {
                            console.log(pgm + 'Error in ' + filename + '. Could not find user with user_seq = ' + res.msg[i].user_seq);
                            continue ;
                        }
                        unique_id = CryptoJS.SHA256(auth_address + '/'  + pubkey).toString();
                        res.msg[i].auth_address = auth_address ; // used if create new unknown contacts
                        // debug('file_done', pgm + 'unique_id = ' + unique_id);

                        if (process_incoming_message(res.msg[i], unique_id)) {
                            // debug('file_done', pgm + 'js_messages.length = ' + js_messages.length) ;
                            debug('file_done', pgm + 'last message = ' + JSON.stringify(js_messages[js_messages.length-1].message)) ;
                            contacts_updated = true ;
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
                        z_update_data_json(pgm) ;
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
                    var last_online, timestamp ;
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
                        // console.log(pgm + 'status.json: last_updated = ' + last_updated) ;
                        // status.json: last_updated = 1477417567704
                        // console.log(pgm + 'contact.search = ' + JSON.stringify(contact.search)) ;
                        // contact.search = [{"tag":"Last online","value":1477408336.515066,"privacy":"Search","row":1},{"tag":"Name","value":"test5","privacy":"Search","row":2}]
                        // Update Last online in search array
                        var old_last_online = get_last_online(contact) || 0 ;
                        if (last_online > old_last_online) {
                            set_last_online(contact, last_online) ;
                            contacts_updated = true ;
                        }
                    } // for i (contacts)

                    if (contacts_updated) {
                        $rootScope.$apply() ;
                        ls_save_contacts(false);
                    }

                    return ;
                }

                console.log(pgm + 'unknown json file ' + filename);

            }); // end fileGet

        } // end event_file_done
        ZeroFrame.bind_event(event_file_done);


        // admin only: delete files for inactive users
        var days_before_cleanup_users = 30;
        function get_no_days_before_cleanup () {
            return days_before_cleanup_users ;
        }


        // administrator helpers. cleanup old inactive users. delete test users etc
        var admin_auth_address = '16R2WrLv3rRrxa8Sdp4L5a1fi7LxADHFaH' ;
        function is_admin () {
            var pgm = service + '.is_admin: ' ;
            if (user_setup.guest) return false ;
            var admin = ZeroFrame.site_info.auth_address == admin_auth_address ;
            // console.log(pgm + 'admin = ' + admin) ;
            return admin ;
        }
        var admin_key ;
        function confirm_admin_task (text, task) {
            if (!is_admin()) return ;
            if (admin_key) {
                // confirm dialog
                ZeroFrame.cmd("wrapperConfirm", [text, "OK"], function (confirm) {
                    if (confirm) task(admin_key) ;
                }) ;
            }
            else {
                // enter private key dialog
                ZeroFrame.cmd("wrapperPrompt", [text + "<br>Enter private key to continue", "key"], function (key) {
                    if (key) {
                        admin_key = key;
                        task(key);
                    }
                }); // wrapperPrompt
            }
        } // confirm_admin_job


        function cleanup_inactive_users() {
            var pgm = service + '.cleanup_inactive_users: ';
            var info = '. Skipping cleanup_inactive_users check';
            // check Zeronet status
            if (!user_id) {
                console.log(pgm + 'No client login' + info);
                return;
            }
            if (!ZeroFrame.site_info) {
                console.log(pgm + 'ZeroFrame is not ready' + info);
                return;
            }
            if (!ZeroFrame.site_info.cert_user_id) {
                console.log(pgm + 'No ZeroNet login' + info);
                return;
            }
            if (!is_admin()) {
                // console.log(pgm + 'not administrator');
                return;
            }

            // find files for inactive user accounts
            var query =
                "select" +
                "  keyvalue.value as timestamp," +
                "  json.json_id," +
                "  json.directory," +
                "  files.filename," +
                "  files.size " +
                "from keyvalue, json, files " +
                "where keyvalue.key = 'modified' " +
                "and keyvalue.value <  strftime('%s','now')-60*60*24*" + days_before_cleanup_users + " " +
                "and json.json_id = keyvalue.json_id " +
                "and files.json_id = keyvalue.json_id " +
                "order by keyvalue.value, keyvalue.json_id";
            debug('select', 'query = ' + query);

            ZeroFrame.cmd("dbQuery", [query], function (res) {
                var pgm = service + '.cleanup_inactive_users dbQuery callback: ';
                if (res.error) {
                    ZeroFrame.cmd("wrapperNotification", ["error", "Search for inactive users: " + res.error, 5000]);
                    console.log(pgm + "Search for inactive users failed: " + res.error);
                    console.log(pgm + 'query = ' + query);
                    return;
                }
                if (res.length == 0) return; // no more inactive users to cleanup

                var json_ids = [] ;
                var bytes = 0 ;
                for (var i=0 ; i<res.length ; i++) {
                    bytes += res[i].size ;
                    if (json_ids.indexOf(res[i].json_id) == -1) json_ids.push(res[i].json_id) ;
                }

                // 1CCiJ97XHgVeJ@moneynetwork auth_address is in "signers", not this is not working as expected
                // use zite private key instead
                var users = (json_ids.length == 1 ? '1 user' : json_ids.length + ' users') + '. ' ;
                var files = (res.length == 1 ? '1 file' : res.length + ' files') + '. ' ;

                confirm_admin_task("Cleanup old user accounts? " + users + files + "Total " + bytes + " bytes.", function (privatekey) {
                    if (!privatekey) return;

                    // sign/publish is not working. 1CCiJ97XHgVeJ@moneynetwork should be moderator and allowed to delete old user files
                    // http://127.0.0.1:43110/Blog.ZeroNetwork.bit/?Post:46:ZeroNet+site+development+tutorial+2#Comments
                    var sign_and_publish = function (directory) {
                        var filename = 'data/' + directory + '/content.json';
                        // console.log(pgm + 'sign and publish. filename = ' + filename);
                        ZeroFrame.cmd("sitePublish", {privatekey: privatekey, inner_path: filename}, function (res) {
                            var pgm = service + '.cleanup_inactive_users sitePublish callback: ', error;
                            if (res != "ok") {
                                error = "Failed to publish " + filename + " : " + res.error;
                                console.log(pgm + error);
                                ZeroFrame.cmd("wrapperNotification", ["error", error, 3000]);
                            }
                        }); // sitePublish
                    }; // sign_and_publish

                    // delete files and publish content.json for each user
                    var last_directory = res[0].directory, i, filename;
                    for (i = 0; i < res.length; i++) {
                        if (res[i].directory != last_directory) {
                            sign_and_publish(last_directory);
                            last_directory = res[i].directory;
                        }
                        filename = "data/" + res[i].directory + "/" + res[i].filename;
                        ZeroFrame.cmd("fileDelete", filename, function (res) {
                            var pgm = service + '.cleanup_inactive_users fileDelete callback: ';
                            // console.log(pgm + 'res = ' + JSON.stringify(res));
                        });
                    } // for i (res)
                    sign_and_publish(last_directory);

                }); // confirm_admin_task

            }); // dbQuery

        } // cleanup_inactive_users

        var user_id = 0 ;
        var my_unique_id ;
        function client_login(password, create_new_account, guest, keysize) {
            // login or register. update sessionStorage and localStorage
            if (!create_new_account) guest = false ;
            user_id = MoneyNetworkHelper.client_login(password, create_new_account, keysize);
            if (user_id) {
                if (create_new_account && guest) MoneyNetworkHelper.setItem('guestid', user_id); // todo: ls_save()?
                // my unique id in group chats
                // load user information from localStorage
                load_user_setup() ;
                load_avatar() ;
                load_user_info(guest) ;
                ls_load_contacts() ;
                local_storage_read_messages() ;
                i_am_online() ;
                load_user_contents_max_size() ;
                cleanup_inactive_users() ;
            }
            return user_id ;
        } // client_login

        function client_logout() {
            // notification
            var key ;
            ZeroFrame.cmd("wrapperNotification", ['done', 'Log out OK', 3000]);
            // clear sessionStorage
            MoneyNetworkHelper.client_logout();
            // clear all JS work data in MoneyNetworkService
            for (key in zeronet_file_locked) delete zeronet_file_locked[key];
            user_info.splice(0, user_info.length);
            clear_contacts() ;
            js_messages.splice(0, js_messages.length);
            watch_receiver_sha256.splice(0, watch_receiver_sha256.length);
            for (key in ignore_zeronet_msg_id) delete ignore_zeronet_msg_id[key] ;
            avatar.src = "public/images/avatar1.png" ;
            avatar.loaded = false;
            user_id = 0 ;
            my_unique_id = null ;
            user_contents_max_size = null ;
            admin_key = null ;
            for (key in user_setup) delete user_setup[key] ;
            // redirect
            $location.path('/auth');
            $location.replace();
        } // client_logout

        function get_my_unique_id () {
            if (my_unique_id) my_unique_id ;
            if (!ZeroFrame.site_info) return null ; // ZeroFrame not ready - loading
            var my_auth_address = ZeroFrame.site_info.auth_address ;
            if (!my_auth_address) return null ; // not logged in on ZeroNet
            var my_pubkey = MoneyNetworkHelper.getItem('pubkey');
            my_unique_id = CryptoJS.SHA256(my_auth_address + '/'  + my_pubkey).toString();
            return my_unique_id ;
        } // get_my_unique_id



        // update timestamp in status.json file and modified in content.json.
        // will allow users to communicate with active contacts and ignoring old and inactive contacts
        // small file(s) for quick distribution in ZeroNet
        function i_am_online () {
            var pgm = service + '.i_am_online: ';
            var info = '. Skipping status.json update';
            // check Zeronet status
            if (!user_id) {
                console.log(pgm + 'No client login' + info);
                return;
            }
            if (!ZeroFrame.site_info) {
                console.log(pgm + 'ZeroFrame is not ready' + info);
                return;
            }
            if (!ZeroFrame.site_info.cert_user_id) {
                console.log(pgm + 'No ZeroNet login' + info);
                return;
            }
            var user_path = "data/users/" + ZeroFrame.site_info.auth_address;
            console.log(pgm + 'My auth address is ' + ZeroFrame.site_info.auth_address + ' and my unique id ' + get_my_unique_id()) ;

            // find user_seq in data.json
            var pubkey = MoneyNetworkHelper.getItem('pubkey') ;
            ZeroFrame.cmd("fileGet", {inner_path: user_path + '/data.json', required: false}, function (data) {
                var pgm = service + '.i_am_online fileGet 1 callback: ';
                // console.log(pgm + 'data = ' + JSON.stringify(data));
                if (!data) {
                    console.log(pgm + 'No data.json file' + info) ;
                    return ;
                }
                data = JSON.parse(data);
                if (!data.users || (data.users.length == 0)) {
                    console.log(pgm + 'No users in data.json' + info) ;
                    return ;
                }
                var user_seq = null ;
                var user_seqs = [] ;
                for (var i=0 ; i<data.users.length ; i++) {
                    user_seqs.push(data.users[i].user_seq) ;
                    if (data.users[i].pubkey == pubkey) user_seq = data.users[i].user_seq ;
                }
                // console.log(pgm + 'user_seq = ' + user_seq) ;
                if (!user_seq) {
                    console.log(pgm + 'User was not found in data.json' + info) ;
                    return ;
                }

                // delete any old users in status.json and publish
                ZeroFrame.cmd("fileGet", {inner_path: user_path + '/status.json', required: false}, function (data) {
                    var pgm = service + '.i_am_online fileGet 2 callback: ';
                    // console.log(pgm + 'data = ' + JSON.stringify(data));
                    if (!data) data = { version: 5, status: [] } ;
                    else {
                        data = JSON.parse(data);
                        z_migrate_status(data);
                    }
                    for (i=data.status.length-1 ; i >= 0 ; i--) {
                        if (user_seqs.indexOf(data.status[i].user_seq) == -1) data.status.splice(i,1);
                    }
                    var json_raw = unescape(encodeURIComponent(JSON.stringify(data, null, "\t")));
                    ZeroFrame.cmd("fileWrite", [user_path + '/status.json', btoa(json_raw)], function (res) {
                        var pgm = service + '.i_am_online fileWrite callback: ' ;
                        // console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                        if (res === "ok") zeronet_site_publish(user_seq) ; // update timestamp and publish
                        else {
                            ZeroFrame.cmd("wrapperNotification", ["error", "Failed to post: " + res.error, 5000]);
                            console.log(pgm + 'Error. Failed to post: ' + res.error) ;
                        }

                    }); // fileWrite

                }); // fileGet 2 (status.json)

            }); // fileGet 1 (data.json)
        } // i_am_online


        // contact actions: add, remove, ignore, unplonk, verify. Used in NetWork and Chat controllers

        function contact_add (contact) {
            var pgm = service + '.contact_add: ' ;
            // console.log(pgm + 'click');
            // move contact to unverified contacts
            contact.type = 'unverified' ;
            // send contact info. to unverified contact (privacy public and unverified)
            // console.log(pgm + 'todo: send message add contact message to other contact including relevant tags') ;
            var message = {
                msgtype: 'contact added',
                search: []
            } ;
            console.log(pgm + 'message = ' + JSON.stringify(message));
            for (var i=0 ; i<user_info.length ; i++) {
                if (['Public','Unverified'].indexOf(user_info[i].privacy) == -1) continue ;
                message.search.push({tag: user_info[i].tag, value: user_info[i].value, privacy: user_info[i].privacy}) ;
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
            var no_msg, i, message, update_zeronet, now, index, j, contact_type ;
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
                        // logical delete
                        message.deleted_at = now ;
                        // remove from UI
                        index = null;
                        for (j = 0; j < js_messages.length; j++) {
                            if (js_messages[j]["$$hashKey"] == message["$$hashKey"]) index = j;
                        }
                        js_messages.splice(index, 1);
                        // should zeronet file data.json be updated?
                        if ((message.folder == 'outbox') && (message.zeronet_msg_id)) update_zeronet = true ;
                    }
                    // done. refresh UI and save contacts. optional update zeronet
                    $rootScope.$apply() ;
                    ls_save_contacts(update_zeronet) ; // physical delete
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


        // sort used in network and chat pages
        var contact_sort_options = ['Last online', 'User name', 'Last chat msg', 'Number chat msg', 'ZeroNet disk usage', 'Browser disk usage'];
        function get_contact_sort_options () {
            return contact_sort_options ;
        }
        function get_contact_sort_title () {
            var contact_sort_title = contact_sort_options[0];
            for (var i=1 ; i<contact_sort_options.length ; i++) {
                if (i<contact_sort_options.length-1) contact_sort_title += ", " ;
                else contact_sort_title += " or " ;
                contact_sort_title += contact_sort_options[i] ;
            }
            return contact_sort_title ;
        }
        function contact_order_by (contact) {
            var user_name, pgm, sort, i, row, bytes, message, debug_msg, unix_timestamp, short_date ;
            // find user name. for sort and debug
            if (contact.alias) user_name = contact.alias ;
            else if (contact.type == 'group') user_name = contact.unique_id.substr(0,13) ;
            else user_name = contact.cert_user_id ;
            while (user_name.length < 26) user_name += ' ' ;
            pgm = service + '. contact_order_by: user_name = ' + user_name + ', ' ;
            // check angularJS orderBy params
            //console.log(pgm + 'arguments.length = ' + arguments.length );
            //for (i=0 ; i<arguments.length ; i++) console.log(pgm + 'argument[' + i + '] = ' + JSON.stringify(arguments[i])) ;
            sort = 0 ;
            unix_timestamp = false ;
            if (user_setup.contact_sort== 'Last online') {
                unix_timestamp = true ;
                sort = -get_last_online(contact) ;
            }
            if (user_setup.contact_sort== 'User name') {
                sort = user_name ;
            }
            if (user_setup.contact_sort== 'Last chat msg') {
                unix_timestamp = true;
                if (contact.messages && (contact.messages.length > 0)) {
                    sort = -contact.messages[contact.messages.length - 1].sent_at;
                }
            }
            if (user_setup.contact_sort== 'Number chat msg') {
                if (contact.messages) sort = -contact.messages.length ;
            }
            if (user_setup.contact_sort== 'ZeroNet disk usage') {
                if (contact.messages) {
                    for (i=0 ; i<contact.messages.length ; i++) {
                        message = contact.messages[i] ;
                        if ((message.folder == 'outbox') && message.zeronet_msg_size) sort -= message.zeronet_msg_size ;
                    }
                }
            }
            if (user_setup.contact_sort== 'Browser disk usage') { // localStorage
                if (contact.messages) {
                    for (i=0 ; i<contact.messages.length ; i++) {
                        message = contact.messages[i] ;
                        if (message.ls_msg_size) sort -= message.ls_msg_size ;
                    }
                }
            }
            message = pgm + user_setup.contact_sort + ' = ' + sort ;
            message += ' (' + typeof sort + ')' ;
            if (unix_timestamp) {
                short_date  = date(-sort*1000, 'short') ;
                if (short_date == 'Invalid Date') {
                    sort = 0 ;
                    short_date  = date(-sort*1000, 'short')} ;
                message += ', unix timestamp = ' + short_date ;
            }
            debug('contact_order_by', message) ;
            return sort ;
        } // contact_order_by

        var chat_sort_options = ['Last message', 'ZeroNet disk usage', 'Browser disk usage'] ;
        function get_chat_sort_options () {
            return chat_sort_options ;
        }
        function get_chat_sort_title () {
            var chat_sort_title = chat_sort_options[0];
            for (var i=1 ; i<chat_sort_options.length ; i++) {
                if (i<chat_sort_options.length-1) chat_sort_title += ", " ;
                else chat_sort_title += " or " ;
                chat_sort_title += chat_sort_options[i] ;
            }
            return chat_sort_title ;
        }
        function chat_order_by (message) {
            var pgm = service + '.chat_order_by: ';
            var sort = 0 ;
            var unix_timestamp = false ;
            // console.log(pgm + 'chat_sort = ' + self.chat_sort);
            if (user_setup.chat_sort== 'Last message') {
                sort = -message.message.sent_at ;
                unix_timestamp = true ;
            }
            if (user_setup.chat_sort== 'ZeroNet disk usage') {
                if (message.message.zeronet_msg_size) sort = -message.message.zeronet_msg_size ;
            }
            if (user_setup.chat_sort== 'Browser disk usage') {
                if (message.message.ls_msg_size) sort = -message.message.ls_msg_size ;
            }
            var debug_msg = pgm + user_setup.chat_sort + ' = ' + sort ;
            debug_msg += ' (' + typeof sort + ')' ;
            if (unix_timestamp) {
                var short_date  = date(-sort*1000, 'short') ;
                if (short_date == 'Invalid Date') {
                    sort = 0 ;
                    short_date  = date(-sort*1000, 'short')} ;
                debug_msg += ', unix timestamp = ' + short_date ;
            }
            debug('chat_order_by', debug_msg) ;
            return sort ;
        } // chat_order_by

        // user setup: avatar, alias, contact sort, contact filters, chat sort, spam filters
        var user_setup = {} ;
        function load_user_setup () {
            var new_user_setup, key, guest_id, guest, alias ;
            new_user_setup = JSON.parse(MoneyNetworkHelper.getItem('setup')) ;
            for (key in user_setup) delete user_setup[key] ;
            for (key in new_user_setup) user_setup[key] = new_user_setup[key] ;
            // add missing defaults
            guest_id = MoneyNetworkHelper.getItem('guestid');
            guest = (guest_id == '' + user_id) ;
            if (guest) user_setup.guest = guest ;
            if (!user_setup.contact_filters) user_setup.contact_filters = {
                all: 'red',
                new: 'green',
                unverified: 'green',
                verified: 'green',
                ignore: 'red'
            } ;
            if (!user_setup.contact_filters.hasOwnProperty('guest')) {
                user_setup.contact_filters.guest = guest ? 'green' : 'red' ;
            }
            if (!user_setup.contact_sort) user_setup.contact_sort = contact_sort_options[0] ;
            if (user_setup.contact_sort == 'Last updated') user_setup.contact_sort = 'Last online' ;
            if (!user_setup.chat_sort) user_setup.chat_sort = chat_sort_options[0] ;
            if (!user_setup.hasOwnProperty('block_guests')) user_setup.block_guests = !guest ;
            if (!user_setup.hasOwnProperty('block_ignored')) user_setup.block_ignored = false ;
            if (!user_setup.hasOwnProperty('two_panel_chat')) user_setup.two_panel_chat = true ;
            if (!user_setup.alias) user_setup.alias = 'Me';
            if (!user_setup.encryption) user_setup.encryption = '1' ;

        }
        function save_user_setup () {
            MoneyNetworkHelper.setItem('setup', JSON.stringify(user_setup));
            MoneyNetworkHelper.ls_save();
        }
        function get_user_setup () {
            return user_setup ;
        }


        // start chat. write a notification if starting a chat with old contact (Last online timestamp)
        // used in chat_contact methods in network and chat controllers
        function notification_if_old_contact (contact) {
            // find last updated for this contact
            var last_updated, last_updated2, i, j, newer_contacts, contact2 ;
            last_updated = get_last_online(contact) ;
            // console.log(pgm + 'last_updated = ' + last_updated + ', contact = ' + JSON.stringify(contact)) ;

            // check last updated for contacts with identical cert_user_id or pubkey
            newer_contacts = [] ;
            for (i=0 ; i<ls_contacts.length ; i++) {
                contact2 = ls_contacts[i] ;
                if ((contact2.cert_user_id != contact.cert_user_id) && (contact2.pubkey != contact.pubkey)) continue ;
                if (contact2.unique_id == contact.unique_id) continue ;
                last_updated2 = get_last_online(contact2) ;
                // console.log(pgm + 'last_updated2 = ' + last_updated2 + ', contact2 = ' + JSON.stringify(contact2));
                if (last_updated2 > last_updated) newer_contacts.push(contact2);
            } // for i (self.contacts)

            if (newer_contacts.length > 0) {
                // add warning.
                var msg ;
                msg =
                    'Warning. You maybe starting chat with an old inactive contact.<br>' +
                    'Found ' + newer_contacts.length + ' newer updated contact' +
                    ((newer_contacts.length > 1) ? 's' : '') + '.';
                for (i=0 ; i<newer_contacts.length ; i++) {
                    contact2 = newer_contacts[i] ;
                    last_updated2 = get_last_online(contact2) ;
                    msg += '<br>' + (i+1) + ' : Last online ' + date(last_updated2*1000, 'short') + '. ';
                    msg += 'Identical ' + ((contact.cert_user_id == contact2.cert_user_id) ? 'zeronet user' : 'browser public key') + '.' ;
                }
                ZeroFrame.cmd("wrapperNotification", ["info", msg, 5000]);
            }

        } // notification_if_old_contact


        // output debug info in log. For key, see user page and setup.debug hash
        // keys: simple expressions are supported. For example inbox && unencrypted
        function debug (keys, text) {
            MoneyNetworkHelper.debug(keys, text) ;
        } // debug


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
            get_contacts: get_contacts,
            get_contact_by_unique_id: get_contact_by_unique_id,
            get_contact_by_password_sha256: get_contact_by_password_sha256,
            get_contact_by_cert_user_id: get_contact_by_cert_user_id,
            get_contact_name: get_contact_name,
            add_contact: add_contact,
            update_contact_add_password: update_contact_add_password,
            z_contact_search: z_contact_search,
            ls_save_contacts: ls_save_contacts,
            js_get_messages: js_get_messages,
            get_ls_msg_factor: get_ls_msg_factor,
            add_msg: add_msg,
            remove_msg: remove_msg,
            load_avatar: load_avatar,
            get_avatar: get_avatar,
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
            next_local_msg_seq: next_local_msg_seq,
            get_max_image_size: get_max_image_size,
            get_image_ext_from_base64uri: get_image_ext_from_base64uri,
            get_no_days_before_cleanup: get_no_days_before_cleanup,
            load_user_setup: load_user_setup,
            get_user_setup: get_user_setup,
            save_user_setup: save_user_setup,
            get_contact_sort_options: get_contact_sort_options,
            get_contact_sort_title: get_contact_sort_title,
            contact_order_by: contact_order_by,
            get_chat_sort_options: get_chat_sort_options,
            get_chat_sort_title: get_chat_sort_title,
            chat_order_by: chat_order_by,
            notification_if_old_contact: notification_if_old_contact,
            is_admin: is_admin,
            confirm_admin_task: confirm_admin_task
        };

        // end MoneyNetworkService
    }]) ;
