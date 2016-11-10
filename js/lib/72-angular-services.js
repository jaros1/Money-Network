angular.module('MoneyNetwork')

    .factory('MoneyNetworkService', ['$timeout', '$rootScope', '$location', 'dateFilter',
                             function($timeout, $rootScope, $location, date) {
        var self = this;
        var service = 'MoneyNetworkService' ;
        console.log(service + ' loaded') ;

        // startup tag cloud. Tags should be created by users and shared between contacts.
        // Used in typeahead autocomplete functionality http://angular-ui.github.io/bootstrap/#/typeahead
        var tags = ['Name', 'Email', 'Phone', 'Photo', 'Company', 'URL', 'GPS'];
        function get_tags() {
            return tags ;
        }

        // convert data.json to newest version. compare dbschema.schema_changed and data.version.
        var dbschema_version = 5 ;
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
            // console.log(pgm + 'query = ' + query);
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

                var pubkey = MoneyNetworkHelper.getItem('pubkey') ;
                // console.log(pgm + 'pubkey = ' + pubkey);

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
                        version: 4,
                        users: [],
                        search: [],
                        msg: []
                    };

                    // check avatar. Full path in avatar.src. short path in data.users array in ZeroNet
                    // src:
                    // - data/users/1CCiJ97XHgVeJrkbnzLgfXvYRr8QEWxnWF/avatar.jpg => jpg
                    // - data/users/1CCiJ97XHgVeJrkbnzLgfXvYRr8QEWxnWF/avatar.png => png
                    // - public/images/avatar1.png                                => 1.png
                    // console.log(pgm + 'avatar = ' + JSON.stringify(avatar));
                    var short_avatar ;
                    if (avatar.src.substr(0,11) == 'data/users/') short_avatar = avatar.src.substr(avatar.src.length-3,3);
                    else if (avatar.src.substr(0,20) == 'public/images/avatar') short_avatar = avatar.src.substr(20,avatar.src.length-20);
                    // console.log(pgm + 'avatar.src = ' + avatar.src + ', short_avatar = ' + short_avatar);

                    // find current user in users array
                    var max_user_seq = 0, i, user_i, user_seq ;
                    for (i=0 ; i<data.users.length ; i++) {
                        if (pubkey == data.users[i].pubkey) {
                            user_i = i ;
                            user_seq = data.users[user_i].user_seq
                        }
                        else if (data.users[i].user_seq > max_user_seq) max_user_seq = data.users[i].user_seq ;
                    }
                    if (user_seq) data.users[user_i].avatar = short_avatar ;
                    else {
                        // add current user to data.users array
                        user_seq = max_user_seq + 1 ;
                        data.users.push({
                            user_seq: user_seq,
                            pubkey: pubkey,
                            avatar: short_avatar
                        }) ;
                        // console.log(pgm + 'added user to data.users. data = ' + JSON.stringify(data)) ;
                    }
                    // console.log(pgm + 'pubkey = ' + pubkey + ', user_seq = ' + user_seq);

                    // remove old search words from search array
                    var user_no_search_words = {} ;
                    for (i=data.search.length-1 ; i>=0 ; i--) {
                        row = data.search[i] ;
                        if (row.user_seq == user_seq) data.search.splice(i,1);
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

                    //// remove users without any search words
                    //// can be deleted users (clear local storage) or can be users done searching for contacts
                    //for (i=data.users.length-1 ; i >= 0 ; i--) {
                    //    user_seq = data.users[i].user_seq ;
                    //    if (!user_no_search_words.hasOwnProperty(user_seq) || (user_no_search_words[user_seq] == 0)) {
                    //        data.users.splice(i, 1);
                    //        // console.log(pgm + 'removed user ' + user_seq + ' from users array');
                    //    }
                    //}

                    // set to true if localStorage information if updated (contacts, messages)
                    var local_storage_updated = false ;

                    // fix problem with false/0 keys in msg array / messages table (cannot be decrypted). See also "insert new message" below
                    var j, k, contact ;
                    for (i=data.msg.length-1 ; i>=0 ; i--) {
                        if (!data.msg[i].key) {
                            console.log(pgm + 'deleting message with invalid key. data.msg[' + i + '] = ' + JSON.stringify(data.msg[i]));
                            // cleanup zeronet_msg_id references in localStorage
                            for (j=0 ; j<local_storage_contacts.length ; j++) {
                                contact = local_storage_contacts[j] ;
                                for (k=0 ; k<contact.messages.length ; k++) {
                                    if (contact.messages[j].folder != 'outbox') continue ;
                                    if (contact.messages[k].zeronet_msg_id == data.msg[i].message_sha256) {
                                        delete contact.messages[k].zeronet_msg_id;
                                        delete contact.messages[k].zeronet_msg_size;
                                        local_storage_updated = true;
                                    }
                                } // for k (messages)
                            } // for j (contacts)
                            data.msg.splice(i,1);
                        } // if
                    } // for i (data.msg)

                    // insert & delete outgoing messages in data.msg array in data.json file on ZeroNet
                    var encrypt, password, key, message_with_envelope, message, encrypted_message_str, message_deleted,
                        error, receiver_sha256, local_msg_seq, sender_sha256 ;
                    for (i=0 ; i<local_storage_contacts.length ; i++) {
                        contact = local_storage_contacts[i] ;
                        encrypt = null ;
                        for (j=contact.messages.length-1 ; j >= 0 ; j--) {
                            message_with_envelope = contact.messages[j] ;
                            if (message_with_envelope.folder != 'outbox') continue ;
                            if (!message_with_envelope.sent_at) {
                                // not sent - encrypt and insert new message in data.msg array (data.json)
                                message = message_with_envelope.message ;
                                // add local_msg_seq. used as message id
                                local_msg_seq = next_local_msg_seq() ;
                                message_with_envelope.local_msg_seq = local_msg_seq;
                                message.local_msg_seq = local_msg_seq ;
                                // symmetric encrypt message with random password. rsa encrypt password with contact.pubkey
                                if (!encrypt) {
                                    if (!contact.pubkey) {
                                        throw pgm + 'Contact without pubkey. Encryption is not possible' ;
                                        continue ;
                                    }
                                    encrypt = new JSEncrypt();
                                    encrypt.setPublicKey(contact.pubkey);
                                }
                                // find receiver_sha256. Use last received sender_sha256 address from contact
                                // exception: remove + add contact messages can be used to reset communication
                                if (message.msgtype != 'contact added') receiver_sha256 = contact.inbox_last_sender_sha256 ;
                                if (!receiver_sha256) receiver_sha256 = CryptoJS.SHA256(contact.pubkey).toString();
                                // add random sender_sha256 address
                                sender_sha256 = CryptoJS.SHA256(generate_random_password()).toString();
                                message_with_envelope.sender_sha256 = sender_sha256;
                                message.sender_sha256 = sender_sha256 ;
                                // check this new sha256 address in incoming data.json files (file done event / process_incoming_message)
                                watch_receiver_sha256.push(sender_sha256) ;
                                // rsa encrypted key, symmetric encrypted message
                                password = generate_random_password();
                                key = encrypt.encrypt(password);
                                // console.log(pgm + 'password = ' + password + ', key = ' + key);
                                if (!key) {
                                    delete zeronet_file_locked[data_json_path] ;
                                    throw pgm + 'System error. Encryption error. key = ' + key + ', password = ' + password ;
                                    continue ;
                                }
                                //console.log(pgm + 'debug - some messages are not delivered');
                                //console.log(pgm + 'sending ' + message.msgtype + ' to ' + receiver_sha256) ;
                                console.log(pgm + 'sending message = ' + JSON.stringify(message));
                                encrypted_message_str = MoneyNetworkHelper.encrypt(JSON.stringify(message), password);
                                delete message.sender_sha256 ; // info is in message_with_envelope
                                delete message.local_msg_seq ; // info is in message_with_envelope
                                message_with_envelope.zeronet_msg_id = CryptoJS.SHA256(encrypted_message_str).toString();
                                message_with_envelope.sent_at = new Date().getTime() ;
                                // console.log(pgm + 'new local_storage_messages[' + i + '] = ' + JSON.stringify(message));
                                // console.log(pgm + 'old data.msg.length = ' + data.msg.length) ;
                                data.msg.push({
                                    user_seq: user_seq,
                                    receiver_sha256: receiver_sha256,
                                    key: key,
                                    message: encrypted_message_str,
                                    message_sha256: message_with_envelope.zeronet_msg_id,
                                    timestamp: message_with_envelope.sent_at
                                });
                                // keep track of msg disk usage.User may want to delete biggest messages first when running out of disk space on zeronet
                                message_with_envelope.zeronet_msg_size = JSON.stringify(data.msg[data.msg.length-1]).length ;
                                message_with_envelope.ls_msg_size = JSON.stringify(message_with_envelope).length ;
                                // console.log(pgm + 'new data.msg.last = ' + JSON.stringify(data.msg[data.msg.length-1]));
                                // console.log(pgm + 'new data.msg.length = ' + data.msg.length) ;
                                local_storage_updated = true ;
                                continue ;
                            } // if
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
                                    error = "Could not delete message from Zeronet. Maybe posted in ZeroNet from an other ZeroNet id" ;
                                    console.log(pgm + 'error = ' + error) ;
                                    console.log(pgm + 'user_seq = ' + user_seq) ;
                                    console.log(pgm + 'zeronet_msg_id = ' + contact.messages[j].zeronet_msg_id) ;
                                    // console.log(pgm + 'data.msg = ' + JSON.stringify(data.msg));
                                    ZeroFrame.cmd("wrapperNotification", ["error", error, 5000]);
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

                    // delete old messages from Zeronet.
                    var now = new Date().getTime() ;
                    var one_week_ago = now - 1000*60*60*24*7 ;
                    for (i=data.msg.length-1 ; i>=0 ; i--) {
                        if (data.msg[i].timestamp > one_week_ago) continue ;
                        // clear reference from localStorage to deleted message at ZeroNet
                        for (j=0 ; j<local_storage_contacts.length ; j++) {
                            contact = local_storage_contacts[j] ;
                            for (k=0 ; k<contact.messages.length ; k++) {
                                if (contact.messages[k].folder != 'outbox') continue ;
                                if (contact.messages[k].zeronet_msg_id == data.msg[i].message_sha256) {
                                    contact.messages[k].deleted_at = now ;
                                    delete contact.messages[k].zeronet_msg_id ;
                                    delete contact.messages[k].zeronet_msg_size ;
                                    local_storage_updated = true ;
                                } // if

                            } // for k (contact.messages)
                        } // for j (contacts)
                        data.msg.splice(i,1) ;
                    } // for i

                    // check file size. Try to keep data.json file size small for fast communication and small site
                    // always keep messages for last hour.
                    // data.json size must also be <data_json_max_size
                    var one_hour_ago = now - 1000*60*60 ;
                    var msg_user_seqs ;
                    var my_pubkey = MoneyNetworkHelper.getItem('pubkey') ;
                    var my_pubkey_sha256 = CryptoJS.SHA256(my_pubkey).toString();
                    var inbox_message, outbox_message, data_removed ;
                    var count = 0 ;
                    while (true) {
                        json_raw = unescape(encodeURIComponent(JSON.stringify(data, null, "\t")));
                        if (json_raw.length < 10000) break ; // OK - small file

                        console.log(pgm + 'data.json is big. size ' + json_raw.length + '. removing old data ...') ;
                        // todo: looping forever with message - MoneyNetworkService.z_update_data_json fileGet callback: data.json is big. size 14762. removing old data ...
                        count = count + 1 ;
                        if (count > 1000) {
                            console.log(pgm + 'Ups. System error. Something is wrong here. looping forever. Taking a break') ;
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
                            console.log(pgm + 'data.json is big. removed user without any messages') ;
                            data_removed = true ;
                            break ;
                        } // for i (users)
                        if (data_removed) continue ; // recheck data.json size

                        // b) cleanup msg that has been received by other contacts
                        //    outbox msg1.sender_sha256 == inbox msg2.receiver_sha256
                        //    ingoing msg2 is a response using sender_sha256 from outgoing msg1
                        //    delete msg1 from data.msg array if not already done
                        for (i=0 ; i<local_storage_contacts.length ; i++) {
                            contact = local_storage_contacts[i] ;
                            if (!contact.messages) continue ;
                            for (j=0 ; j<contact.messages.length ; j++) {
                                if (contact.messages[j].folder != 'inbox') continue ;
                                inbox_message = contact.messages[j] ;
                                if (!inbox_message.receiver_sha256) continue ;
                                if (inbox_message.receiver_sha256 == my_pubkey_sha256) continue ; // todo: drop. No reason to save receiver_sha256 == my_pubkey_sha256 in inbox messages
                                // found a message in inbox folder with a receiver_sha256. Find corresponding outbox message
                                console.log(pgm + 'inbox_message = ' + JSON.stringify(inbox_message));
                                outbox_message = null ;
                                for (k=0; k<contact.messages.length ; k++) {
                                    if (contact.messages[k].folder != 'outbox') continue ;
                                    if (!contact.messages[k].sender_sha256) continue ;
                                    if (!contact.messages[k].zeronet_msg_id) continue ;
                                    if (contact.messages[k].sender_sha256 != inbox_message.receiver_sha256) continue ;
                                    outbox_message = contact.messages[k] ;
                                    break ;
                                } // for k (outbox)
                                if (!outbox_message) {
                                    if (contact.outbox_sender_sha256 && contact.outbox_sender_sha256[inbox_message.receiver_sha256]) {
                                        // OK. must be an outbox message deleted by user. Has already been removed from data.json
                                        console.log(pgm + 'OK. must be an outbox message deleted by user. Has already been removed from data.json') ;
                                        continue ;
                                    }
                                    else {
                                        console.log(pgm + 'System error. Could not find any messages in outbox folder with sender_sha256 = ' + inbox_message.sender_sha256);
                                        continue ;
                                    }
                                }
                                // outbox message.sender_sha256 == inbox message.receiver_sha256
                                // check if outbox message is in data.msg array
                                for (k=data.msg.length-1 ; k >= 0 ; k--) {
                                    if (data.msg[k].message_sha256 != outbox_message.zeronet_msg_id) continue ;
                                    // found a message that can be deleted from ZeroNet (received by contact)
                                    console.log(pgm + 'found a message that can be deleted from ZeroNet (received by contact)') ;
                                    data.msg.splice(k,1);
                                    delete outbox_message.zeronet_msg_id ;
                                    delete outbox_message.zeronet_msg_size ;
                                    local_storage_updated = true ;
                                    data_removed = true ;
                                    break ;
                                }
                                if (data_removed) {
                                    console.log(pgm + 'data.json is big. removed outbox message received by contact') ;
                                    break ;
                                }
                            } // for j (messages)
                            if (data_removed) break ;
                        } // for i (contacts)
                        if (data_removed) continue ; // recheck data.json size

                        // c) delete old msg
                        if ((data.msg.length == 0) || (data.msg[0].timestamp > one_hour_ago)) {
                            console.log(pgm + 'no more old data to remove');
                            break ;
                        }

                        // remove old message and recheck data.json size
                        data.msg.splice(0,1);
                        console.log(pgm + 'data.json is big. deleted old message') ;
                    } // while true

                    // console.log(pgm + 'localStorage.messages (3) = ' + JSON.stringify(local_storage_messages));
                    // console.log(pgm + 'ZeroNet data.msg (3) = ' + JSON.stringify(data.msg));
                    if (local_storage_updated) local_storage_save_contacts(false) ;

                    var available = data_json_max_size - json_raw.length - 100 ;
                    if (available < 0) {
                        // data.json is too big. User have to delete some outgoing messages.
                        // specially outgoing chat messages with picture can be a problem
                        error =
                            "Sorry. Cannot send message(s). No more disk space. Missing " + (0-available) + " bytes.<br>" +
                            "Please delete some outgoing messages or remove image from outgoing chat messages" ;
                        console.log(pgm + error);
                        ZeroFrame.cmd("wrapperNotification", ["error", error]);
                        return ;
                    }
                    else console.log(pgm + 'OK. ' + available + ' bytes free in user directory on ZeroNet');

                    // console.log(pgm + 'added new rows for user_seq ' + user_seq + ', data = ' + JSON.stringify(data)) ;
                    // console.log(pgm + 'calling fileWrite: inner_path = ' + data_inner_path + ', data = ' + JSON.stringify(btoa(json_raw)));
                    ZeroFrame.cmd("fileWrite", [data_json_path, btoa(json_raw)], function (res) {
                        delete zeronet_file_locked[data_json_path] ;
                        var pgm = service + '.z_update_data_json fileWrite callback: ' ;
                        // console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                        if (res === "ok") {
                            // console.log(pgm + 'calling sitePublish: inner_path = ' + content_inner_path) ;
                            zeronet_site_publish(user_seq) ;
                            //ZeroFrame.cmd("sitePublish", {inner_path: content_inner_path}, function (res) {
                            //    var pgm = service + '.z_update_data_json sitePublish callback: ' ;
                            //    // console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                            //    if (res != "ok") {
                            //        ZeroFrame.cmd("wrapperNotification", ["error", "Failed to publish: " + res.error, 5000]);
                            //        console.log(pgm + 'Error. Failed to publish: ' + res.error);
                            //        console.log(pgm + 'todo: keep track of failed sitePublish. Could be device temporary offline');
                            //    }
                            //}); // sitePublish
                        }
                        else {
                            ZeroFrame.cmd("wrapperNotification", ["error", "Failed to post: " + res.error, 5000]);
                            console.log(pgm + 'Error. Failed to post: ' + res.error) ;
                        }
                    }); // fileWrite
                }); // fileGet
            }) // dbQuery
        } // z_update_data_json


        // user info. Array with tag, value and privacy.
        // saved in localStorage. Shared with contacts depending on privacy choice
        var user_info = [] ;
        function empty_user_info_line() {
            return { tag: '', value: '', privacy: ''} ;
        }
        function load_user_info () {
            var pgm = service + '.load_user_info: ';
            // load user info from local storage
            var user_info_str, new_user_info ;
            user_info_str = MoneyNetworkHelper.getItem('user_info') ;
            // console.log(pgm + 'user_info loaded from localStorage: ' + user_info_str) ;
            // console.log(pgm + 'user_info_str = ' + user_info_str) ;
            if (user_info_str) new_user_info = JSON.parse(user_info_str) ;
            else new_user_info = [empty_user_info_line()] ;
            user_info.splice(0,user_info.length) ;
            for (var i=0 ; i<new_user_info.length ; i++) user_info.push(new_user_info[i]) ;
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
                // console.log(pgm + 'z_update_data_json + z_contact_search not working 100% correct. There goes a few seconds between updating data.json with new search words and updating the sqlite database');
                z_update_data_json(pgm) ;
                MoneyNetworkHelper.z_contact_search(local_storage_contacts, function () {$rootScope.$apply()}) ;
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

        var local_storage_contacts = [] ; // array with contact => messages - one row for each contact
        var javascript_messages = [] ; // array with { :contact => contact, :message => message } - one row for each message
        var ls_msg_factor = 0.67 ; // factor. from ls_msg_size to "real" size. see formatMsgSize filter. used on chat

        // get contacts stored in localStorage
        function ls_load_contacts () {
            var pgm = service + '.ls_load_contacts: ', contacts_str, new_contacts, new_contact ;
            contacts_str = MoneyNetworkHelper.getItem('contacts') ;
            if (contacts_str) new_contacts = JSON.parse(contacts_str);
            else new_contacts = [] ;
            local_storage_contacts.splice(0, local_storage_contacts.length) ;
            javascript_messages.splice(0, javascript_messages.length) ;
            var i, j, contacts_updated = false ;
            var unique_id_to_index = {}, old_contact ;
            var ls_msg_size_total = 0 ;

            for (i=0 ; i<new_contacts.length ; i++) {
                new_contact = new_contacts[i] ;
                if (!new_contact.messages) new_contact.messages = [] ;
                // fix old spelling error. rename send_at to sent_at in messages
                for (j=0 ; j<new_contact.messages.length ; j++) {
                    if (new_contact.messages[j].send_at) {
                        new_contact.messages[j].sent_at = new_contact.messages[j].send_at ;
                        delete new_contact.messages[j].send_at ;
                        contacts_updated = true ;
                    }
                }
                // fix error with doublet contacts in local storage. merge contacts
                if (unique_id_to_index.hasOwnProperty(new_contact.unique_id)) {
                    console.log(pgm + 'warning: doublet contact with unique id ' + new_contact.unique_id + ' in localStorage') ;
                    // skip new doublet contact but keep messages
                    old_contact = local_storage_contacts[unique_id_to_index[new_contact.unique_id]];
                    for (j=0 ; j<new_contact.messages.length ; j++) old_contact.messages.push(new_contact.messages[j]) ;
                    contacts_updated = true ;
                }
                else {
                    unique_id_to_index[new_contact.unique_id] = local_storage_contacts.length ;
                    local_storage_contacts.push(new_contact) ;
                }

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

                // add "row" sequence to search array
                if (new_contact) for (j=0 ; j<new_contact.search.length ; j++) new_contact.search[j].row = j+1 ;

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
                    javascript_messages.push({
                        contact: new_contact,
                        message: new_contact.messages[j]
                    });
                } // for j (messages)
            } // for i (contacts)
            if (contacts_updated) local_storage_save_contacts(false);

            // console.log(pgm + 'local_storage_contacts = ' + JSON.stringify(local_storage_contacts));

            // calculate ls_msg_factor. from ls_msg_size to "real" size. see formatMsgSize filter. used on chat
            if (ls_msg_size_total) {
                var ls_contacts_size = MoneyNetworkHelper.getItemSize('contacts'); // size in localStorage before decrypt and decompress
                ls_msg_factor = ls_contacts_size / ls_msg_size_total ;
            }
            else ls_msg_factor = -ls_msg_factor ; // no messages. ls_msg_factor = -0.67

            //console.log(pgm +
            //    'ls_msg_size_total (clear text) = ' + ls_msg_size_total +
            //    ', ls_contacts_size (encrypted and compressed) = ' + ls_contacts_size +
            //    ', ls_msg_factor = ' + ls_msg_factor) ;

            // refresh contact avatars
            // source 1: uploaded avatars from files table (users/.../content.json) - pubkey is null - jpg or png
            // source 2: avatar from users table (random assigned avatar) - pubkey is not null - jpg, png or short ref to /public/images/avatar* images
            // source 3: contacts without an avatar will be assigned a random public avatar
            var query =
                "select substr(json.directory,7) as auth_address, null as pubkey, substr(files.filename,8) as avatar " +
                "from files, json " +
                "where files.filename like 'avatar%' " +
                "and json.json_id = files.json_id" +
                "  union all " +
                "select substr(json.directory,7) as auth_address, users.pubkey, users.avatar " +
                "from users, json " +
                "where users.avatar is not null " +
                "and json.json_id = users.json_id" ;
            // console.log(pgm + 'query = ' + query) ;
            ZeroFrame.cmd("dbQuery", [query], function (res) {
                var pgm = service + '.ls_load_contacts dbQuery callback 1: ' ;
                var i, unique_id, source1_avatars, source2_avatars, contact ;
                var missing_avatars ;

                // console.log(pgm + 'res = ' + JSON.stringify(res));

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
                missing_avatars = 0 ;
                var index, public_avatars ;
                for (i=0 ; i<local_storage_contacts.length ; i++) {
                    contact = local_storage_contacts[i] ;
                    if (source1_avatars.hasOwnProperty(contact.auth_address)) {
                        contact.avatar = source1_avatars[contact.auth_address] ;
                        continue ;
                    }
                    unique_id = CryptoJS.SHA256(contact.auth_address + '/'  + contact.pubkey).toString();
                    if (source2_avatars.hasOwnProperty(unique_id)) {
                        contact.avatar = source1_avatars[unique_id] ;
                        continue ;
                    }
                    if (contact.avatar) continue ;
                    if (!public_avatars) public_avatars = MoneyNetworkHelper.get_public_avatars() ;
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

                // get pubkey from ZeroNet. Use auth_address and check unique id. also set user_seq
                var auth_addresses = [] ;
                for (i=0 ; i<local_storage_contacts.length ; i++) {
                    contact = local_storage_contacts[i] ;
                    // console.log(pgm + i + ': contact.type = ' + contact.type + ', contact.auth_address = ' + contact.auth_address)
                    if (auth_addresses.indexOf(contact.auth_address) == -1) auth_addresses.push(contact.auth_address);
                }
                // console.log(pgm + 'auth_addresses = ' + JSON.stringify(auth_addresses)) ;
                if (auth_addresses.length == 0) {
                    // new user - no contacts - user must enter some search tags to find contacts
                    local_storage_save_contacts(false);
                    return ;
                }

                //// old query without modified/timestamp columns
                //query =
                //    "select substr(json.directory,7) as auth_address , users.user_seq, users.pubkey " +
                //    "from json, users " +
                //    "where json.directory in ";
                //for (i = 0; i < auth_addresses.length; i++) {
                //    if (i == 0) query += '(' ;
                //    else query += ',';
                //    query += "'users/" + auth_addresses[i] + "'";
                //} // for i
                //query += ") " +
                //    "and json.file_name = 'data.json' " +
                //    "and users.json_id = json.json_id";
                //console.log(pgm + 'query = ' + query);

                // new query with modified and timestamp columns
                query =
                    "select" +
                    "  substr(data_json.directory,7) as auth_address, users.user_seq, users.pubkey," +
                    "  keyvalue.value as modified," +
                    "  (select status.timestamp from json as status_json, status" +
                    "   where status_json.directory = content_json.directory" +
                    "   and status_json.file_name = 'status.json'" +
                    "   and status.json_id = status_json.json_id" +
                    "   and status.user_seq = users.user_seq) as timestamp " +
                    "from json as data_json, json as content_json, users, keyvalue as keyvalue " +
                    "where data_json.directory in " ;
                for (i = 0; i < auth_addresses.length; i++) {
                    if (i == 0) query += '(' ;
                    else query += ',';
                    query += "'users/" + auth_addresses[i] + "'";
                } // for i
                query += ") " +
                    "and data_json.file_name = 'data.json' " +
                    "and users.json_id = data_json.json_id " +
                    "and content_json.directory = data_json.directory " +
                    "and content_json.file_name = 'content.json' " +
                    "and keyvalue.json_id = content_json.json_id " +
                    "and keyvalue.key = 'modified'" ;
                // console.log(pgm + 'query = ' + query);

                ZeroFrame.cmd("dbQuery", [query], function (res) {
                    var pgm = service + '.ls_load_contacts dbQuery callback 2: ';
                    if (res.error) {
                        ZeroFrame.cmd("wrapperNotification", ["error", "Search for public keys: " + res.error, 5000]);
                        console.log(pgm + "Search for pubkeys failed: " + res.error);
                        console.log(pgm + 'query = ' + query);
                    }
                    else {
                        // console.log(pgm + 'res = ' + JSON.stringify(res));
                        var res_hash = {}, last_updated, modified_deprecated = 0 ;
                        for (var i=0 ; i<res.length ; i++) {
                            if (res[i].timestamp) last_updated = Math.round(res[i].timestamp / 1000) ;
                            else {
                                last_updated = res[i].modified ;
                                modified_deprecated++ ;
                            }
                            if (!res_hash.hasOwnProperty(res[i].auth_address)) res_hash[res[i].auth_address] = [] ;
                            res_hash[res[i].auth_address].push({
                                user_seq: res[i].user_seq,
                                pubkey: res[i].pubkey,
                                last_updated: last_updated
                            }) ;
                        } // for i
                        // console.log(pgm + 'res_hash = ' + JSON.stringify(res_hash));
                        if (modified_deprecated == 0) {
                            console.log(pgm + 'Modified_deprecated. All contacts from localStorage have a status timestamp (status != new). Must also check z_contact_search (new contacts)') ;
                            // console.log(pgm + 'res = ' + JSON.stringify(res));
                        }

                        // control. check that pubkey in contacts are identical with pubkeys from this query
                        var auth_address, unique_id, found_user_seq, found_pubkey, found_last_updated ;
                        // delete contact helper. keep or delete contact without public key?
                        var delete_contact = function (contact, i) {
                            var msg = 'Public key was not found for contact with auth_address ' + contact.auth_address + ' and unique id ' + contact.unique_id ;
                            var last_updated, j, no_msg ;
                            for (j=0 ; j<contact.search.length ; j++) {
                                if (typeof contact.search[j].value == 'number') last_updated = contact.search[j].value ;
                            }
                            if (last_updated) msg += '. Last updated ' + date(last_updated*1000, 'short') ;
                            if (contact.type == 'new') {
                                no_msg = 0 ;
                                for (j=0 ; j<contact.messages.length ; j++) {
                                    if (!contact.contact.messages[j].deleted_at) no_msg++ ;
                                }
                            }
                            if ((contact.type == 'ignore') || ((contact.type == 'new') && (no_msg == 0))) {
                                msg += '. Contact was deleted' ;
                                local_storage_contacts.splice(i,1);
                            }
                            else msg += '. Contact was not deleted' ;
                            console.log(pgm + msg);
                        }; // delete_contact
                        for (i=local_storage_contacts.length-1 ; i>=0 ; i--) {
                            contact = local_storage_contacts[i] ;
                            auth_address = contact.auth_address ;
                            if (!res_hash.hasOwnProperty(auth_address)) {
                                delete_contact(contact,i) ;
                                continue ;
                            }
                            found_user_seq = null ;
                            found_pubkey = null ;
                            found_last_updated = null ;
                            for (j=0 ; j<res_hash[auth_address].length ; j++) {
                                unique_id = CryptoJS.SHA256(auth_address + '/'  + res_hash[auth_address][j].pubkey).toString() ;
                                if (contact.unique_id == unique_id) {
                                    found_user_seq = res_hash[auth_address][j].user_seq ;
                                    found_pubkey = res_hash[auth_address][j].pubkey ;
                                    found_last_updated = res_hash[auth_address][j].last_updated ;
                                }
                            }
                            if (!found_pubkey) {
                                delete_contact(contact,i) ;
                                continue ;
                            }
                            contact.user_seq = found_user_seq ;
                            contact.pubkey = found_pubkey ;
                            // update "Last updated"
                            for (j=0 ; j<contact.search.length ; j++) {
                                if (typeof contact.search[j].value == 'number') contact.search[j].value = found_last_updated ;
                            }

                            // console.log(pgm + 'contact = ' + JSON.stringify(contact));
                        } // for i
                    } // else

                    local_storage_save_contacts(false);

                }) ; // end dbQuery callback 2

            }); // end dbQuery callback 1

        } // end local_storage_load_contacts
        function local_storage_get_contacts() {
            return local_storage_contacts ;
        }
        function local_storage_save_contacts (update_zeronet) {
            var pgm = service + '.ls_save_contacts: ' ;

            // any inbox messages to be physical deleted?
            var i, contact, j, message ;
            for (i=0 ; i<local_storage_contacts.length ; i++)  {
                contact = local_storage_contacts[i] ;
                if (!contact.messages) continue ;
                for (j=contact.messages.length-1 ; j>=0 ; j--) {
                    message = contact.messages[j] ;
                    if (message.folder != 'inbox') continue ;
                    if (!message.deleted_at) continue ;
                    // physical delete inbox message. Remember zeronet_msg_id from deleted message
                    if (message.zeronet_msg_id) {
                        if (!contact.inbox_zeronet_msg_id) contact.inbox_zeronet_msg_id = [] ;
                        contact.inbox_zeronet_msg_id.push(message.zeronet_msg_id) ;
                        ignore_zeronet_msg_id.push(message.zeronet_msg_id) ;
                    }
                    contact.messages.splice(j,1);
                } // for j (contact.messages)
            } // for i (contacts)

            // cleanup contacts before save (remove work variables)
            var local_storage_contacts_clone = JSON.parse(JSON.stringify(local_storage_contacts));
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
        } // local_storage_save_contacts

        // return chat friendly message array
        function javascript_get_messages() {
            return javascript_messages ;
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
            var local_msg_seq, message ;

            // find contact from unique_id
            contact = null ;
            for (i=0 ; i<local_storage_contacts.length ; i++) {
                if (local_storage_contacts[i].unique_id == unique_id) contact = local_storage_contacts[i] ;
            } // for i

            // decrypt message and insert into contacts messages
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
            // console.log(pgm + 'decrypted message = ' + decrypted_message_str) ;
            decrypted_message = JSON.parse(decrypted_message_str);

            if (!contact) {
                // buffer incoming message, create contact and try once more
                new_unknown_contacts.push({
                    res: res,
                    unique_id: unique_id
                });
                return false ;
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

            // save incoming message
            local_msg_seq = next_local_msg_seq() ;
            message = {
                local_msg_seq: local_msg_seq,
                folder: 'inbox',
                message: decrypted_message,
                zeronet_msg_id: res.message_sha256,
                sender_sha256: sender_sha256,
                sent_at: res.timestamp,
                receiver_sha256: res.receiver_sha256,
                received_at: new Date().getTime()} ;
            if (!sender_sha256) delete message.sender_sha256 ;
            // check receiver_sha256. sha256(pubkey) or a previous sender_sha256 address sent to contact
            var my_pubkey = MoneyNetworkHelper.getItem('pubkey') ;
            var my_pubkey_sha256 = CryptoJS.SHA256(my_pubkey).toString();
            if (message.receiver_sha256 == my_pubkey_sha256) delete message.receiver_sha256 ;
            message.ls_msg_size = JSON.stringify(message).length ;
            ignore_zeronet_msg_id.push(res.message_sha256) ;
            if (sender_sha256 && (res.timestamp > contact.inbox_last_sender_sha256_at)) {
                contact.inbox_last_sender_sha256 = sender_sha256 ;
                contact.inbox_last_sender_sha256_at = res.timestamp ;
            }

            console.log(pgm + 'new incoming message = ' + JSON.stringify(message));

            contact.messages.push(message) ;
            javascript_messages.push({
                contact: contact,
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
                }
                // console.log(pgm + 'updated contact.sha256. contact = ' + JSON.stringify(contact));
            }

            // post processing new incoming messages
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
                for (i=0 ; i<contact.messages.length ; i++) {
                    old_message_envelope = contact.messages[i] ;
                    old_message = old_message_envelope.message ;
                    if (old_message_envelope.folder != 'inbox') continue ;
                    if (old_message.msgtype != 'chat msg') continue ;
                    if (old_message.local_msg_seq != decrypted_message.local_msg_seq) continue ;
                    index = i ;
                    break ;
                } // for i
                if (index == -1) {
                    console.log(pgm + 'Received update to old chat message with local_msg_seq ' + decrypted_message.old_local_msg_seq + ' that does not exist') ;
                    console.log(pgm + 'decrypted_message = ' + JSON.stringify(decrypted_message));
                    delete decrypted_message.old_local_msg_seq ;
                }
                else {
                    old_message_envelope = contact.messages[index];
                    old_message_envelope.deleted_at = message.sent_at ;
                    console.log(pgm + 'received OK update to an old chat msg') ;
                    console.log(pgm + 'new decrypted_message = ' + JSON.stringify(decrypted_message));
                    console.log(pgm + 'old_message_envelope  = ' + JSON.stringify(old_message_envelope));
                }
                // empty chat msg update => delete chat message
                if (!decrypted_message.message) message.deleted_at = message.sent_at ;
            } // end chat msg

            if ((decrypted_message.msgtype == 'chat msg') && decrypted_message.image) {
                // received a chat message with an image. Send receipt so that other user can delete msg from data.json and free disk space
                // todo: privacy issue - monitoring ZeroNet files will reveal who is chatting. Receipt will make this easier.
                var receipt = { msgtype: 'received', remote_msg_seq: decrypted_message.local_msg_seq };
                // validate json
                var error = MoneyNetworkHelper.validate_json(pgm, receipt, receipt.msgtype, 'Cannot send receipt for chat message');
                if (error) console(pgm + error) ;
                else new_outgoing_receipts.push({ contact: contact, message: receipt}) ;
            } // end chat msg

            if (decrypted_message.msgtype == 'received') {
                // received receipt for outgoing chat message with image.
                // remove chat message from ZeroNet to free disk space
                // must update zeronet
                console.log(pgm + 'received receipt from contact. expects old outgoing chat message with image to be removed from data.json and zeronet_msg_size to be updatedz_updated') ;
                console.log(pgm + 'contact.messages = ' + JSON.stringify(contact.messages));
                new_incoming_receipts++ ;
            }

            if (decrypted_message.msgtype == 'verified') {
                // received response to a verify contact request.
                // password has already been sha256 validated by contact. Just double check and change contact status to Verified
                index = -1 ;
                console.log(pgm + 'contact.messages = ' + JSON.stringify(contact.messages));
                for (i=0 ; i<contact.messages.length ; i++) {
                    old_message_envelope = contact.messages[i] ;
                    old_message = old_message_envelope.message ;
                    if (old_message_envelope.folder != 'outbox') continue ;
                    if (old_message.msgtype != 'verify') continue ;
                    if (old_message_envelope.password != decrypted_message.password) continue ;
                    index = i ;
                    break ;
                }
                if (index == -1) console.log(pgm + 'Received verified message but original verify request is not longer in outbox or password is not correct') ;
                else if (contact.type != 'unverified') console.log(pgm + 'Received verified message with correct passowrd but contact is not (any longer) an unverified contact') ;
                else contact.type = 'verified' ;
            }

            // todo: add more message post processing ...

            return true ;

        } // process_incoming_message


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
            // console.log(pgm + 'new_unknown_contacts = ' + JSON.stringify(new_unknown_contacts));
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
            var auth_address, expected_auth_addresses = [] ;
            for (var i=0 ; i<new_unknown_contacts.length ; i++) {
                auth_address = new_unknown_contacts[i].res.auth_address ;
                if (!auth_address) {
                    console.log(pgm + 'Error. No auth_address in ' + JSON.stringify(new_unknown_contacts[i].res));
                    continue ;
                }
                if (expected_auth_addresses.indexOf(auth_address) == -1) expected_auth_addresses.push(auth_address) ;
            }
            if (expected_auth_addresses.length == 0) {
                console.log(pgm + 'Error. No auth_addresses were found in new_unknown_contacts array');
                new_unknown_contacts.splice(0,new_unknown_contacts.length);
                return ;
            }

            // build query for contact information
            var contacts_query =
                "select" +
                "  users.user_seq, users.pubkey, users.avatar as users_avatar," +
                "  data_json.directory,  substr(data_json.directory, 7) as auth_address, data_json.json_id as data_json_id," +
                "  content_json.json_id as content_json_id," +
                "  keyvalue1.value as cert_user_id," +
                "  keyvalue2.value as modified," +
                "  (select substr(files.filename,8)" +
                "   from files, json as avatar_json " +
                "   where files.filename like 'avatar%'" +
                "   and avatar_json.json_id = files.json_id" +
                "   and avatar_json.directory = data_json.directory) as files_avatar " +
                "from users, json as data_json, json as content_json, keyvalue as keyvalue1, keyvalue as keyvalue2 " +
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
                "and keyvalue1.json_id = content_json.json_id " +
                "and keyvalue1.key = 'cert_user_id' " +
                "and keyvalue2.json_id = content_json.json_id " +
                "and keyvalue2.key = 'modified'" ;
            // console.log(pgm + 'contacts_query = ' + contacts_query) ;

            ZeroFrame.cmd("dbQuery", [contacts_query], function (res) {
                var pgm = service  + '.create_unknown_contacts dbQuery callback: ';
                var found_auth_addresses = [], i, unique_id, new_contact, public_avatars, index, j ;
                // console.log(pgm + 'res = ' + JSON.stringify(res));
                if (res.error) {
                    ZeroFrame.cmd("wrapperNotification", ["error", "Search for new unknown contacts failed: " + res.error, 5000]);
                    console.log(pgm + "Search for new contacts failed: " + res.error) ;
                    console.log(pgm + 'query = ' + query) ;
                    new_unknown_contacts.splice(0,new_unknown_contacts.length)
                    return;
                }
                if (res.length == 0) {
                    ZeroFrame.cmd("wrapperNotification", ["error", "Search for new unknown contacts failed. No contacts were found", 5000]);
                    new_unknown_contacts.splice(0,new_unknown_contacts.length)
                    console.log(pgm + "Search for new unknown contacts failed. No contacts were found") ;
                    console.log(pgm + 'query = ' + query) ;
                    return;
                }

                // create contacts and processed messages
                for (i=0 ; i<res.length ; i++) {
                    found_auth_addresses.push(res[i].auth_address);
                    // create new contact
                    unique_id = CryptoJS.SHA256(res[i].auth_address + '/'  + res[i].pubkey).toString(); ;
                    new_contact = {
                        unique_id: unique_id,
                        type: 'new',
                        auth_address: res[i].auth_address,
                        cert_user_id: res[i].cert_user_id,
                        avatar: res[i].avatar,
                        pubkey: res[i].pubkey,
                        search: [{ tag: 'Last updated', value: res[i].modified, privacy: 'Search', row: 1}],
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
                    local_storage_contacts.push(new_contact);
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
                    local_storage_save_contacts(false);
                }
                // refresh angular JS with new messages
                $rootScope.$apply() ;

            }); // end dbQuery callback

        } // create_unknown_contacts


        // after login - check for new ingoing messages (dbQuery)
        var watch_receiver_sha256 = [] ; // listen for sha256 addresses
        var ignore_zeronet_msg_id = [] ; // ignore already read messages
        function local_storage_read_messages () {
            var pgm = service + '.local_storage_read_messages: ' ;

            // initialize watch_sender_sha256 array with relevant sender_sha256 addresses
            // that is sha256(pubkey) + any secret sender_sha256 reply addresses sent to contacts in money network
            var my_pubkey, my_pubkey_sha256, my_prvkey, i, j, contact, message, key ;
            my_pubkey = MoneyNetworkHelper.getItem('pubkey') ;
            my_pubkey_sha256 = CryptoJS.SHA256(my_pubkey).toString();
            my_prvkey = MoneyNetworkHelper.getItem('prvkey') ;

            // after login. initialize arrays with watch and ignore sha256 lists
            watch_receiver_sha256.splice(0, watch_receiver_sha256.length);
            ignore_zeronet_msg_id.splice(0, ignore_zeronet_msg_id.length);
            watch_receiver_sha256.push(my_pubkey_sha256);
            for (i = 0; i < local_storage_contacts.length; i++) {
                contact = local_storage_contacts[i];
                if (!contact.messages) contact.messages = [];
                for (j = 0; j < contact.messages.length; j++) {
                    message = contact.messages[j];
                    if (message.folder == 'inbox') {
                        // ignore already read messages
                        if (message.zeronet_msg_id) {
                            if (ignore_zeronet_msg_id.indexOf(message.zeronet_msg_id) != -1) {
                                // problem with doublet contacts. maybe also problem with doublet messages ....
                                console.log(pgm + 'Error. Message with sha256 ' + message.zeronet_msg_id + ' found more than one in inbox');
                                console.log(pgm + 'contact = ' + JSON.stringify(contact));
                            }
                            else ignore_zeronet_msg_id.push(message.zeronet_msg_id);
                        }
                    }
                    if (message.folder == 'outbox') {
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
                if (contact.inbox_zeronet_msg_id) {
                    for (j=0 ; j<contact.inbox_zeronet_msg_id.length ; j++) ignore_zeronet_msg_id.push(contact.inbox_zeronet_msg_id[j]) ;
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
            // 2) check if previously received messages been deleted from zeronet
            // 3) check if previously deleted inbox messages have been deleted from zeronet
            if (ignore_zeronet_msg_id.length > 0) {
                query = query + " or messages.message_sha256 in ('" + ignore_zeronet_msg_id[0] + "'" ;
                for (i=1 ; i<ignore_zeronet_msg_id.length ; i++) query = query + ", '" + ignore_zeronet_msg_id[i] + "'" ;
                query = query + ')' ;
            }
            query = query + " )" +
                "and users.json_id = messages.json_id " +
                "and users.user_seq = messages.user_seq " +
                "and json.json_id = messages.json_id" ;
            // console.log(pgm + 'query = ' + query) ;

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

                // check ignore_zeronet_msg_id array. has previously received messages been deleted on ZeroNet?
                var ignore_zeronet_msg_id_clone = ignore_zeronet_msg_id.slice() ;
                var contacts_updated = false ;
                var i, j, contact, k, message, decrypted_message ;
                for (i=res.length-1 ; i>= 0 ; i--) {
                    j = ignore_zeronet_msg_id_clone.indexOf(res[i].message_sha256) ;
                    if (j != -1) {
                        // previous received message is still on ZeroNet
                        ignore_zeronet_msg_id_clone.splice(j,1) ;
                        res.splice(i);
                    }
                } // for i (res)
                if (ignore_zeronet_msg_id_clone.length > 0) {
                    console.log(pgm + 'messages deleted on Zeronet: ' + JSON.stringify(ignore_zeronet_msg_id_clone));
                    // should by 2 or 3:
                    for (i=0 ; i<local_storage_contacts.length ; i++) {
                        contact = local_storage_contacts[i] ;
                        // - 2) previously received messages been deleted from zeronet
                        for (j=0 ; j<contact.messages.length ; j++) {
                            message = contact.messages[j] ;
                            if (message.folder != 'inbox') continue ;
                            k = ignore_zeronet_msg_id_clone.indexOf(message.zeronet_msg_id) ;
                            if (k != -1) {
                                // previously received message has been deleted on ZeroNet. remove zeronet_msg_id link
                                // from message in localStorage to message on ZeroNet
                                ignore_zeronet_msg_id_clone.splice(k,1);
                                delete message.zeronet_msg_id ;
                                contacts_updated = true ;
                            }
                        } // for j (messages)
                        // - 3) previously deleted inbox messages have been deleted from zeronet
                        if (!contact.inbox_zeronet_msg_id) continue ;
                        for (j=contact.inbox_zeronet_msg_id.length-1 ; j >= 0 ; j--) {
                            k = ignore_zeronet_msg_id_clone.indexOf(contact.inbox_zeronet_msg_id[j]) ;
                            if (k != -1) {
                                // previous received and deleted message has also been deleted from zeronet.
                                // just remove sha256 address from inbox_zeronet_msg_id array
                                ignore_zeronet_msg_id_clone.splice(k,1);
                                contact.inbox_zeronet_msg_id.splice(j,1) ;
                                contacts_updated = true ;
                            }
                        }

                    } // for i (contacts)
                } // if
                // sum check for ignore sha256 addresses. Should be empty
                if (ignore_zeronet_msg_id_clone.length > 0) {
                    console.log(pgm + 'System error. ignore_zeronet_msg_id_clone should be empty now');
                    console.log(pgm + 'ignore_zeronet_msg_id_clone.length = ' + JSON.stringify(ignore_zeronet_msg_id_clone.length));
                }
                if (res.length == 0) {
                    // console.log(pgm + 'no new messages') ;
                    if (contacts_updated) local_storage_save_contacts(false) ;
                    return ;
                }

                // process new incoming message
                var unique_id ;
                for (i=res.length-1 ; i>=0 ; i--) {
                    unique_id = CryptoJS.SHA256(res[i].auth_address + '/'  + res[i].pubkey).toString();
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
                else if (contacts_updated) local_storage_save_contacts(false) ;

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
            console.log(pgm + 'contact.messages.last = ' + JSON.stringify(contact.messages[contact.messages.length-1])) ;
            javascript_messages.push({
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
            for (i=0; i<local_storage_contacts.length ; i++) {
                contact = local_storage_contacts[i] ;
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
                            for (k=javascript_messages.length-1 ; k >= 0 ; k--) {
                                if (javascript_messages[k].message.local_msg_seq == local_msg_seq) {
                                    javascript_messages.splice(k,1);
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
        function load_avatar (refresh_angular) {
            var pgm = service + '.load_avatar: ';
            if (avatar.loaded) return ; // already loaded
            // check ZeroFrame status
            var retry_load_avatar = function () {
                load_avatar(refresh_angular);
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
            // 1) get content.json - check if user already has uploaded an avatar
            var user_path = "data/users/" + ZeroFrame.site_info.auth_address ;
            ZeroFrame.cmd("fileGet", [user_path + "/content.json", false], function (res) {
                var pgm = service + '.load_avatar fileGet callback 1: ';
                if (res) res = JSON.parse(res);
                else res = { files: {} } ;
                // console.log(pgm + 'res = ' + JSON.stringify(res));
                if (res.files["avatar.jpg"]) {
                    avatar.src = user_path + '/avatar.jpg';
                    avatar.loaded = true ;
                    refresh_angular() ;
                    return ;
                }
                if (res.files["avatar.png"]) {
                    avatar.src = user_path + '/avatar.png';
                    avatar.loaded = true ;
                    refresh_angular() ;
                    return ;
                }
                // 2) no user avatar found - use previous selection in localStorage
                var setup = JSON.parse(MoneyNetworkHelper.getItem('setup')) ;
                var ls_avatar = setup.avatar ;
                if (ls_avatar) {
                    avatar.src = "public/images/avatar" + ls_avatar;
                    avatar.loaded = true ;
                    refresh_angular() ;
                    return ;
                }
                // 3) assign random avatar from public/images/avatar
                var public_avatars = MoneyNetworkHelper.get_public_avatars() ;
                var index = Math.floor(Math.random() * public_avatars.length);
                avatar.src = "public/images/avatar" + public_avatars[index] ;
                avatar.loaded = true ;
                setup.avatar = public_avatars[index] ;
                MoneyNetworkHelper.setItem('setup', JSON.stringify(setup)) ;
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
            console.log(pgm + 'filename = ' + filename) ;

            // read json file
            ZeroFrame.cmd("fileGet", [filename, false], function (res) {
                var pgm = service + '.event_file_done fileGet callback: ';
                var content_json_avatar, i, auth_address, contacts_updated ;
                if (!res) res = {} ;
                else res = JSON.parse(res) ;
                // console.log(pgm + 'res = ' + JSON.stringify(res));

                if (filename.match(/content\.json$/)) {
                    // content.json - check avatar in files. null, jpg or pgn
                    if (res.files['avatar.jpg']) content_json_avatar = 'jpg' ;
                    else if (res.files['avatar.png']) content_json_avatar = 'png' ;
                    else content_json_avatar = null ;
                    // check contacts
                    var contact, public_avatars, index, avatar_short_path ;
                    contacts_updated = false ;
                    for (i=0 ; i<local_storage_contacts.length ; i++) {
                        contact = local_storage_contacts[i] ;
                        if (contact.cert_user_id != res.cert_user_id) continue ;
                        // console.log(pgm + 'content-json avatar = ' + content_json_avatar) ;
                        // console.log(pgm + 'contact.avatar = ' + contact.avatar);
                        if (contact.avatar == content_json_avatar) continue ;
                        // avatar (maybe) updated
                        if (content_json_avatar) {
                            // not null avatar in content.json - uploaded avatar.
                            contact.avatar = avatar_short_path ;
                        }
                        else {
                            // null avatar in content.json
                            if (['jpg','png'].indexOf(contact.avatar) != -1) {
                                // previosly uploaded avatar has been deleted. Assign random avatar to contact.
                                public_avatars = MoneyNetworkHelper.get_public_avatars() ;
                                index = Math.floor(Math.random() * public_avatars.length);
                                avatar_short_path = public_avatars[index] ;
                                contact.avatar = avatar_short_path ;
                            }
                            else {
                                // OK. Contact has already an random assigned public avatar
                                continue ;
                            }
                        }
                        contacts_updated = true ;
                    } // for i (contacts)

                    if (contacts_updated) {
                        $rootScope.$apply() ;
                        local_storage_save_contacts(false) ;
                    }
                    return ;
                } // end reading content.json

                if (filename.match(/data\.json$/)) {
                    // data.json file. check msg array
                    if (!res.msg) return ; // no messages array in this data.json
                    var pubkey, j, unique_id ;
                    contacts_updated = false ;
                    // console.log(pgm + 'watch_receiver_sha256 = ' + JSON.stringify(watch_receiver_sha256));
                    // console.log(pgm + 'res.msg.length before = ' + res.msg.length) ;
                    for (i=res.msg.length-1 ; i>=0 ; i--) {
                        // console.log(pgm + 'res.msg[' + i + '].receiver_sha256 = ' + res.msg[i].receiver_sha256);
                        if (watch_receiver_sha256.indexOf(res.msg[i].receiver_sha256) == -1) {
                            // not listening for this sha256 address
                            res.msg.splice(i,1) ;
                            continue ;
                        }
                        if (ignore_zeronet_msg_id.indexOf(res.msg[i].message_sha256) != -1) {
                            // message already received
                            res.msg.splice(i,1) ;
                            continue ;
                        }
                        // console.log(pgm + 'todo: receive message ' + JSON.stringify(res.msg[i]));

                        // find unique id for contact
                        auth_address = filename.split('/')[2] ;
                        pubkey = null ;
                        for (j=0 ; j<res.users.length ; j++) if (res.users[j].user_seq == res.msg[i].user_seq) pubkey = res.users[j].pubkey ;
                        if (!pubkey) {
                            console.log(pgm + 'Error in ' + filename + '. Could not find user with user_seq = ' + res.msg[i].user_seq);
                            continue ;
                        }
                        unique_id = CryptoJS.SHA256(auth_address + '/'  + pubkey).toString();
                        res.msg[i].auth_address = auth_address ; // used if create new unknown contacts
                        // console.log(pgm + 'unique_id = ' + unique_id);
                        // contact_unique_id = 2130b080fec648e4260aa118c0903c4e567ce393304d38d24c374c09acd09997

                        if (process_incoming_message(res.msg[i], unique_id)) {
                            contacts_updated = true ;
                            res.msg.splice(i,1);
                        }
                    } // for i (res.msg)
                    // console.log(pgm + 'res.msg.length after = ' + res.msg.length) ;

                    // there should not be any unprocessed messages expect messages with unknown contacts here
                    if ((res.msg.length > 0) && (res.msg.length != new_unknown_contacts.length)) {
                        if (res.msg.length == 1) {
                            console.log(pgm + filename + ': 1 message could not be processed');
                        }
                        else {
                            console.log(pgm + filename + ': ' + res.msg.length + ' messages could not be processed');
                        }
                    }

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
                        local_storage_save_contacts(false) ;
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
                    var last_updated, timestamp ;
                    contacts_updated = false ;
                    for (i=0 ; i<local_storage_contacts.length ; i++) {
                        contact = local_storage_contacts[i] ;
                        if (contact.auth_address != auth_address) continue ;
                        timestamp = null ;
                        for (j=0 ; j<res.status.length ; j++) {
                            if (res.status[j].user_seq == contact.user_seq) timestamp = res.status[j].timestamp ;
                        }
                        if (!timestamp) continue ;
                        last_updated = timestamp / 1000.0 ;
                        // console.log(pgm + 'status.json: last_updated = ' + last_updated) ;
                        // status.json: last_updated = 1477417567704
                        // console.log(pgm + 'contact.search = ' + JSON.stringify(contact.search)) ;
                        // contact.search = [{"tag":"Last updated","value":1477408336.515066,"privacy":"Search","row":1},{"tag":"Name","value":"test5","privacy":"Search","row":2}]
                        // Update Last updated in search array
                        for (j=0 ; j<contact.search.length ; j++) {
                            if (typeof contact.search[j].value != 'number') continue ;
                            if (last_updated > contact.search[j].value) {
                                contact.search[j].value = last_updated ;
                                contacts_updated = true ;
                            }
                        }
                    } // for i (contacts)

                    if (contacts_updated) {
                        $rootScope.$apply() ;
                        local_storage_save_contacts(false);
                    }

                    return ;
                }

                console.log(pgm + 'unknown json file ' + filename);

            }); // end fileGet

        } // end event_file_done
        ZeroFrame.bind_event(event_file_done);


        // admin only: delete files for inactive users
        var days_before_cleanup_users = 14 ;
        function get_no_days_before_cleanup () {
            return days_before_cleanup_users ;
        }

        function cleanup_inactive_users() {
            var pgm = service + '.cleanup_old_users: ';
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
            if (ZeroFrame.site_info.cert_user_id != '1CCiJ97XHgVeJ@moneynetwork') {
                console.log(pgm + 'not administrator');
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
            // console.log(pgm + 'query = ' + query);

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
                ZeroFrame.cmd("wrapperPrompt",
                    ["Cleanup old user accounts? " + users + files + "Total " + bytes + " bytes.<br>" +
                    "Enter zite or moderator private key", "key"], function (privatekey) {
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

                }); // wrapperPrompt


            }); // dbQuery


        }; // cleanup_inactive_users

        var user_id = 0 ;
        function client_login(password, create_new_account) {
            // login or register. update sessionStorage and localStorage
            var setup, avatar, alias, setup_updated ;
            user_id = MoneyNetworkHelper.client_login(password, create_new_account);
            if (user_id) {
                // load user information from localStorage
                load_user_setup() ;
                load_user_info() ;
                ls_load_contacts() ;
                local_storage_read_messages() ;

                // avatar and alias to setup */
                if (!MoneyNetworkHelper.getItem('setup')) MoneyNetworkHelper.setItem('setup', JSON.stringify({})) ;
                setup_updated = false ;
                setup = JSON.parse(MoneyNetworkHelper.getItem('setup')) ;
                avatar = MoneyNetworkHelper.getItem('avatar') ;
                if (avatar) {
                    MoneyNetworkHelper.removeItem('avatar');
                    setup.avatar = avatar ;
                    setup_updated = true ;
                }
                alias = MoneyNetworkHelper.getItem('alias');
                if (alias) {
                    MoneyNetworkHelper.removeItem('alias');
                    setup.alias = alias ;
                    setup_updated = true ;
                }
                if (!setup.alias) {
                    setup.alias = 'Me';
                    setup_updated = true;
                }
                if (setup_updated) {
                    MoneyNetworkHelper.setItem('setup', JSON.stringify(setup));
                    MoneyNetworkHelper.ls_save() ;
                }

                i_am_online() ;
                load_user_contents_max_size() ;
                cleanup_inactive_users() ;
            }
            return user_id ;
        } // client_login

        function client_logout() {
            // notification
            ZeroFrame.cmd("wrapperNotification", ['done', 'Log out OK', 3000]);
            // clear sessionStorage
            MoneyNetworkHelper.client_logout();
            // clear all JS work data in MoneyNetworkService
            for (var key in zeronet_file_locked) delete zeronet_file_locked[key];
            user_info.splice(0, user_info.length);
            local_storage_contacts.splice(0, local_storage_contacts.length);
            javascript_messages.splice(0, javascript_messages.length);
            watch_receiver_sha256.splice(0, watch_receiver_sha256.length);
            ignore_zeronet_msg_id.splice(0, ignore_zeronet_msg_id.length);
            avatar.loaded = false;
            user_id = 0 ;
            user_seq = 0 ;
            user_contents_max_size = null ;
            var user_setup = {} ;
            // redirect
            $location.path('/auth');
            $location.replace();
        } // client_logout


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
            console.log(pgm + 'My auth address is ' + ZeroFrame.site_info.auth_address) ;

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
                local_storage_save_contacts(false);
                ZeroFrame.cmd("wrapperNotification", ["Error", error]);
                return ;
            }
            // send message
            add_msg(contact, message) ;
            local_storage_save_contacts(true) ;
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
                local_storage_save_contacts(false);
                ZeroFrame.cmd("wrapperNotification", ["Error", error]);
                return ;
            }
            // send message
            add_msg(contact, message) ;
            local_storage_save_contacts(true) ;
        } // contact_remove

        function contact_ignore (contact) {
            var pgm = service + '.contact_ignore: ' ;
            var i, contact2 ;
            for (i=0 ; i<local_storage_contacts.length ; i++) {
                contact2 = local_storage_contacts[i] ;
                if ((contact2.type == 'new')&&
                    ((contact2.cert_user_id == contact.cert_user_id) || (contact2.pubkey == contact.pubkey) )) contact2.type = 'ignore' ;
            }
            contact.type = 'ignore';
            local_storage_save_contacts(false);
        } // contact_ignore

        function contact_unplonk (contact) {
            contact.type = 'new' ;
            local_storage_save_contacts(false);
        } // contact_unplonk

        function contact_verify (contact) {
            var pgm = service + '.contact_verify' ;
            // send verify message
            var password = MoneyNetworkHelper.generate_random_password(10);
            var message = { msgtype: 'verify', password_sha256: CryptoJS.SHA256(password).toString() };
            // validate json
            var error = MoneyNetworkHelper.validate_json (pgm, message, message.msgtype, 'Verification request was not sent to contact') ;
            if (error) {
                local_storage_save_contacts(false);
                ZeroFrame.cmd("wrapperNotification", ["Error", error]);
                return ;
            }
            // send message
            add_msg(contact, message) ;
            var message_envelope = contact.messages[contact.messages.length-1] ;
            message_envelope.password = password ;
            console.log(pgm + 'message_envelope = ' + JSON.stringify(message_envelope));
            local_storage_save_contacts(true) ;
            // notification
            ZeroFrame.cmd(
                "wrapperNotification",
                ["info",
                    'Verify request send to contact. Waiting for verification.<br>' +
                    'Please send password "' + password + '" to contact in an other<br>' +
                    'trusted communication channel (mail, socialnetwork or whatever)']);

        } // contact_verify

        function contact_delete (contact) {
            var no_msg, i, message, update_zeronet, now, index, j ;
            no_msg = 0 ;
            for (i=0 ; i<contact.messages.length ; i++) {
                message = contact.messages[i] ;
                if (!message.deleted_at) no_msg++ ;
            }
            if (no_msg > 0) {
                // delete mark messages. No delete message notification to contact
                update_zeronet = false ;
                ZeroFrame.cmd("wrapperConfirm", ["Delete all messages for this contact?", "Delete"], function (confirm) {
                    if (!confirm) return false ;
                    now = new Date().getTime() ;
                    for (i=0 ; i<contact.messages.length ; i++) {
                        message = contact.messages[i] ;
                        if (message.deleted_at) continue ;
                        // delete marked
                        message.deleted_at = now ;
                        // remove from UI
                        index = null;
                        for (j = 0; j < javascript_messages.length; j++) {
                            if (javascript_messages[j]["$$hashKey"] == message["$$hashKey"]) index = j;
                        }
                        javascript_messages.splice(index, 1);
                        // should zeronet file data.json be updated?
                        if ((message.folder == 'outbox') && (message.zeronet_msg_id)) update_zeronet = true ;
                    }
                    // done. refresh UI and save contacts. optional update zeronet
                    $rootScope.$apply() ;
                    local_storage_save_contacts(update_zeronet) ;
                    return false ;
                }) ;
            }
            else if (!contact.pubkey) {
                // delete contact. must be an old inactive contact removed from ZeroNet. See cleanup_inactive_users
                ZeroFrame.cmd("wrapperConfirm", ["Delete contact?", "Delete"], function (confirm) {
                    if (!confirm) return false ;
                    for (i=local_storage_contacts.length-1 ; i >= 0 ; i-- ) {
                        if (local_storage_contacts[i].unique_id == contact.unique_id) local_storage_contacts.splice(i,1);
                    }
                    local_storage_save_contacts(false) ;
                    return true ;
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

        // remember contact/network sort between visits
        var user_setup = {} ;
        function load_user_setup () {
            var new_user_setup = JSON.parse(MoneyNetworkHelper.getItem('setup')) ;
            for (var key in user_setup) delete user_setup[key] ;
            for (key in new_user_setup) user_setup[key] = new_user_setup[key] ;
        }
        function save_user_setup () {
            MoneyNetworkHelper.setItem('setup', JSON.stringify(user_setup));
            MoneyNetworkHelper.ls_save();
        }
        function get_contact_sort () {
            return user_setup.contact_sort ;
        }
        function set_contact_sort (sort) {
            user_setup.contact_sort = sort ;
            save_user_setup() ;
        }
        function get_chat_sort() {
            return user_setup.chat_sort;
        }
        function set_chat_sort(sort) {
            user_setup.chat_sort = sort;
            save_user_setup();
        }

        function get_contact_filters () {
            return user_setup.contact_filters
        }
        function set_contact_filters (filters) {
            user_setup.contact_filters = filters ;
            save_user_setup() ;
        }

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
            local_storage_get_contacts: local_storage_get_contacts,
            local_storage_save_contacts: local_storage_save_contacts,
            javascript_get_messages: javascript_get_messages,
            get_ls_msg_factor: get_ls_msg_factor,
            add_msg: add_msg,
            remove_msg: remove_msg,
            load_avatar: load_avatar,
            get_avatar: get_avatar,
            client_login: client_login,
            client_logout: client_logout,
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
            get_contact_sort: get_contact_sort,
            set_contact_sort: set_contact_sort,
            get_contact_filters: get_contact_filters,
            set_contact_filters: set_contact_filters,
            get_chat_sort: get_chat_sort,
            set_chat_sort: set_chat_sort,
        };

        // end MoneyNetworkService
    }]) ;
