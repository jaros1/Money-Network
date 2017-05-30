angular.module('MoneyNetwork')

    .factory('MoneyNetworkService', ['$timeout', '$rootScope', '$window', '$location', 'dateFilter',
                             function($timeout, $rootScope, $window, $location, date)
    {
        var service = 'MoneyNetworkService' ;
        console.log(service + ' loaded') ;

        // replace long texts in stringify with ...
        function stringify (json) {
            return MoneyNetworkHelper.stringify(json) ;
        }

        function detected_client_log_out (pgm) {
            if (user_id) return false ;
            console.log(pgm + 'stop. client log out. stopping ' + pgm + ' process') ;
            return true ;
        }

        // startup tag cloud. Tags should be created by users and shared between contacts.
        // Used in typeahead autocomplete functionality http://angular-ui.github.io/bootstrap/#/typeahead
        var tags = ['Name', 'Email', 'Phone', 'Photo', 'Company', 'URL', 'GPS'];
        function get_tags() {
            return tags ;
        }

        // convert data.json to newest version. compare dbschema.schema_changed and data.version.
        var dbschema_version = 9 ;
        function zeronet_migrate_data (json) {
            var pgm = service + '.zeronet_migrate_data: ' ;
            var i ;

            if (json.version == dbschema_version) return false  ;

            if (!json.version) json.version = 1 ;
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
            if (json.version == 8) {
                // only change to like.json (added count)
                json.version = 9 ;
            }
            // any updates to data.json file?
            return true ;
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
                json.version = dbschema_version ;
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
            json.version = dbschema_version ;
        } // z_migrate_status

        function generate_random_password () {
            return MoneyNetworkHelper.generate_random_password(200);
        }

        function get_default_user_hub () {
            var pgm = service + '.get_default_user_hub: ' ;
            var default_user_hub, default_hubs, hub ;
            default_user_hub = '1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh' ;
            console.log(pgm + 'ZeroFrame.site_info.content = ' + JSON.stringify(ZeroFrame.site_info.content));
            default_hubs = ZeroFrame.site_info.content.settings.default_hubs ;
            if (!default_hubs) return default_user_hub ;
            for (hub in default_hubs) {
                if (default_hubs[hub].title.match(/user hub/i)) return hub ;
            }
            return default_user_hub ;
        } // get_default_user_hub3

        var get_my_user_hub_cbs = [] ; // callbacks waiting for query 17 to finish
        function get_my_user_hub (cb) {
            var pgm = service + '.get_my_hub: ' ;
            var query, debug_seq ;
            if (z_cache.my_user_hub == true) {
                // query 17 is already running. please wait
                get_my_user_hub_cbs.push(cb) ;
                return ;
            }
            if (z_cache.my_user_hub) return cb(z_cache.my_user_hub) ;
            z_cache.my_user_hub = true ;

            // Use content.modified timestamp as sort condition if multiple user data hubs
            query =
                "select substr(data_json.directory, 1, instr(data_json.directory,'/')-1) as hub " +
                "from json as data_json, json as content_json, keyvalue " +
                "where data_json.directory like '%/data/users/" + ZeroFrame.site_info.auth_address + "' " +
                "and data_json.file_name = 'data.json' " +
                "and content_json.directory = data_json.directory " +
                "and content_json.file_name = 'content.json' " +
                "and keyvalue.json_id = content_json.json_id " +
                "and keyvalue.key = 'modified' " +
                "order by keyvalue.key desc" ;
            debug('select', pgm + 'query 17 (MS OK) = ' + query);
            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 17') ;
            ZeroFrame.cmd("dbQuery", [query], function (res) {
                var pgm = service + '.get_my_hub dbQuery callback 1: ' ;
                if (detected_client_log_out(pgm)) return ;
                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                if (res.error) {
                    console.log(pgm + "user data hub lookup failed: " + res.error);
                    console.log(pgm + 'query = ' + query);
                    z_cache.my_user_hub = get_default_user_hub() ;
                    cb(z_cache.my_user_hub) ;
                    return;
                }
                if (res.length == 0) z_cache.my_user_hub = get_default_user_hub() ;
                else z_cache.my_user_hub = res[0].hub ;
                console.log(pgm + 'hub = ' + z_cache.my_user_hub) ;
                cb(z_cache.my_user_hub) ;
                while (get_my_user_hub_cbs.length) { cb = get_my_user_hub_cbs.shift() ; cb(z_cache.my_user_hub)} ;
            }) ; // dbQuery callback 1

        } // get_my_user_hub

        // wrapper for data.json fileGet and fileWrite (cache data.json file in memory)
        var get_data_json_cbs = [] ; // callbacks waiting for get_data_json to finish
        function get_data_json (cb) {
            var pgm = service + '.get_data_json: ' ;
            if (detected_client_log_out(pgm)) return ;
            if (z_cache.data_json == true) {
                // please wait. get_data_json request is already running
                get_data_json_cbs.push(cb) ;
                return ;
            }
            if (z_cache.data_json) {
                // data.json file is already in cache
                if (detected_client_log_out(pgm)) return ;
                cb(z_cache.data_json, false) ;
                return ;
            }
            z_cache.data_json = true ;
            // find user data hub (if any)
            get_my_user_hub (function (hub) {
                var user_path, debug_seq ;
                // download data.json and add file to cache
                if (detected_client_log_out(pgm)) return ;
                user_path = "merged-MoneyNetwork/" + hub + "/data/users/" + ZeroFrame.site_info.auth_address;
                debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + user_path + '/data.json fileGet') ;
                ZeroFrame.cmd("fileGet", {inner_path: user_path + '/data.json', required: false}, function (data_str) {
                    var pgm = service + '.get_data_json fileGet callback 1: ';
                    var data, empty, cb2;
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                    if (detected_client_log_out(pgm)) return ;
                    if (data_str) {
                        data = JSON.parse(data_str);
                        zeronet_migrate_data(data);
                        empty = false ;
                    }
                    else {
                        data = {
                            version: dbschema_version,
                            users: [],
                            search: [],
                            msg: []
                        };
                        empty = true ;
                    }
                    // add data.json to cache
                    z_cache.data_json = data ;
                    cb(z_cache.data_json, empty) ;
                    while (get_data_json_cbs.length) { cb = get_data_json_cbs.shift() ; cb(z_cache.data_json, empty)} ;
                }) ; // fileGet callback 2
            }) ; // get_my_user_hub callback 1
        } // get_data_json
        function write_data_json (cb) {
            var pgm = service + '.write_data_json: ' ;
            if (detected_client_log_out(pgm)) return ;
            // find user data hub
            get_my_user_hub (function (hub) {
                var user_path, data, json_raw, debug_seq ;
                user_path = "merged-MoneyNetwork/" + hub + "/data/users/" + ZeroFrame.site_info.auth_address;
                data = z_cache.data_json || {} ;
                json_raw = unescape(encodeURIComponent(JSON.stringify(data, null, "\t")));
                debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + user_path + '/data.json fileWrite') ;
                ZeroFrame.cmd("fileWrite", [user_path + '/data.json', btoa(json_raw)], function (res) {
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                    if (detected_client_log_out(pgm)) return ;
                    cb(res) ;
                }) ; // fileWrite callback 2
            }) ; // get_my_user_hub callback 1
        } // write_data_json

        // wrapper for status.json fileGet and fileWrite (cache status.json file in memory)
        function get_status_json (cb) {
            var pgm = service + '.get_status_json: ' ;
            if (detected_client_log_out(pgm)) return ;
            if (z_cache.status_json) {
                // status.json file is already in cache
                cb(z_cache.status_json, false) ;
                return ;
            }
            // callback 1 - get user data hub
            get_my_user_hub(function (hub) {
                var pgm = service + '.get_status_json get_my_user_hub callback 1: ';
                var user_path, debug_seq ;
                if (detected_client_log_out(pgm)) return ;
                user_path = "merged-MoneyNetwork/" + hub + "/data/users/" + ZeroFrame.site_info.auth_address;
                // read status.jsonn into cache
                debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + user_path + '/status.json fileGet') ;
                ZeroFrame.cmd("fileGet", {inner_path: user_path + '/status.json', required: false}, function (status) {
                    var pgm = service + '.get_status_json fileGet callback 2: ';
                    // console.log(pgm + 'data = ' + JSON.stringify(data));
                    var empty;
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                    if (detected_client_log_out(pgm)) return ;
                    if (!status) {
                        status = {version: dbschema_version, status: []};
                        empty = true ;
                    }
                    else {
                        status = JSON.parse(status);
                        z_migrate_status(status);
                        empty = false ;
                    }
                    z_cache.status_json = status ;
                    cb(status, empty);
                }) ; // fileGet callback 2

            }) ; // get_my_user_hub callback 1

        } // get_status_json
        function write_status_json (cb) {
            var pgm = service + '.write_status_json: ' ;
            if (detected_client_log_out(pgm)) return ;
            // callback 1 - get user data hub
            get_my_user_hub(function (hub) {
                var pgm = service + '.write_status_json get_my_user_hub callback 1: ';
                var user_path, status, json_raw, debug_seq ;
                user_path = "merged-MoneyNetwork/" + hub + "/data/users/" + ZeroFrame.site_info.auth_address;
                status = z_cache.status_json || {} ;
                json_raw = unescape(encodeURIComponent(JSON.stringify(status, null, "\t")));
                debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + user_path + '/status.json fileWrite') ;
                ZeroFrame.cmd("fileWrite", [user_path + '/status.json', btoa(json_raw)], function (res) {
                    var pgm = service + '.write_status_json fileWrite callback 2: ';
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                    if (detected_client_log_out(pgm)) return ;
                    cb(res) ;
                }) ; // fileWrite callback 2
            }) ; // get_my_userhub callback 1
        } // write_status_json

        // wrapper for like.json fileGet and fileWrite (cache like.json file in memory)
        function update_like_index (like, like_index) {
            get_user_seq(function (my_user_seq) {
                var pgm = service + '.update_like_index: ' ;
                var index, i ;
                for (index in like_index) delete like_index[index] ;
                for (i=0 ; i<like.like.length ; i++) {
                    if (like.like[i].user_seq != my_user_seq) continue ;
                    index = like.like[i].timestamp + ',' + like.like[i].auth ;
                    if (like.like[i].count) {
                        // anonymous reaction - array - many reactions for a message
                        index += ',a' ;
                        if (!like_index[index]) like_index[index] = [] ;
                        like_index[index].push(i) ;
                    }
                    else {
                        // public non anonymous reaction - one reaction for each message and user
                        index += ',p' ;
                        like_index[index] = i ;
                    }
                }
                // console.log(pgm + 'like = ' + JSON.stringify(like)) ;
                //console.log(pgm + 'like_index = ' + JSON.stringify(like_index)) ;
            }) ; // get_user_seq
        } // update_like_index

        var get_like_json_cbs = [] ; // any callbacks waiting for first get_like_json operation to finish
        function get_like_json(cb) {
            var pgm = service + '.get_like_json: ';
            if (detected_client_log_out(pgm)) return;
            // callback 1 - ensure that user_seq has been loaded into z_cache. see update_like_index
            get_user_seq(function (my_user_seq) {
                var pgm = service + '.get_like_json get_user_seq callback 1: ';
                var user_path;
                if (detected_client_log_out(pgm)) return;
                if (z_cache.like_json == true) {
                    // get_like_json operation already running. please wait
                    get_like_json_cbs.push(cb) ;
                    return ;
                }
                if (z_cache.like_json) {
                    // like.json file is already in cache
                    cb(z_cache.like_json, z_cache.like_json_index, false);
                    return;
                }
                z_cache.like_json = true ;
                // callback 2 - find user data hub
                get_my_user_hub(function (hub) {
                    var pgm = service + '.get_like_json get_my_user_hub callback 2: ';
                    var debug_seq ;
                    if (detected_client_log_out(pgm)) return;
                    // callback 3 - download like.json and add file to cache
                    user_path = "merged-MoneyNetwork/" + hub + "/data/users/" + ZeroFrame.site_info.auth_address;
                    debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + user_path + '/like.json fileGet') ;
                    ZeroFrame.cmd("fileGet", {
                        inner_path: user_path + '/like.json',
                        required: false
                    }, function (like_str) {
                        var pgm = service + '.get_like_json fileGet callback 3: ';
                        // console.log(pgm + 'like = ' + JSON.stringify(like));
                        var like, empty;
                        MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                        if (detected_client_log_out(pgm)) return;
                        if (like_str) {
                            like = JSON.parse(like_str);
                            // zeronet_migrate_like(like);
                            empty = false;
                        }
                        else {
                            like = {
                                version: dbschema_version,
                                like: []
                            };
                            empty = true;
                        }
                        // add like.json to cache
                        z_cache.like_json = like;
                        z_cache.like_json_index = {};
                        update_like_index(z_cache.like_json, z_cache.like_json_index);
                        cb(z_cache.like_json, z_cache.like_json_index, empty);
                        while (get_like_json_cbs.length) {
                            cb = get_like_json_cbs.shift() ;
                            cb(z_cache.like_json, z_cache.like_json_index, empty);
                        }
                    }); // fileGet callback 3
                }); // my_user_hub callback 2
            }); // get_user_seq callback 1
        } // get_like_json

        function write_like_json (cb) {
            var pgm = service + '.write_like_json: ' ;
            var user_path, like, json_raw ;
            if (detected_client_log_out(pgm)) return ;
            // callback 1 - find user data hub
            get_my_user_hub(function (hub) {
                var pgm = service + '.write_like_json get_my_user_hub callback 2: ' ;
                var debug_seq ;
                if (detected_client_log_out(pgm)) return ;
                // callback 2 - write like.json
                user_path = "merged-MoneyNetwork/" + hub + "/data/users/" + ZeroFrame.site_info.auth_address;
                like = z_cache.like_json || {} ;
                json_raw = unescape(encodeURIComponent(JSON.stringify(like, null, "\t")));
                debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + user_path + '/like.json fileWrite') ;
                ZeroFrame.cmd("fileWrite", [user_path + '/like.json', btoa(json_raw)], function (res) {
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                    if (detected_client_log_out(pgm)) return ;
                    cb(res) ;
                }) ; // fileWrite callback 2
            }) ; // get_my_user_hub callback 1
        } // write_like_json

        // optional files format:
        // - public chat        : <to unix timestamp>-<from unix timestamp>-<user seq>-chat.json (timestamps are timestamp for last and first message in file)
        // - old encrypted image: <unix timestamp>-image.json (not used but old files may still exist)
        // - new encrypted image: <unix timestamp>-<user seq>-image.json
        var CONTENT_OPTIONAL = '([0-9]{13}-[0-9]{13}-[0-9]+-chat.json|[0-9]{13}-image.json|[0-9]{13}-[0-9]+-image.json)' ;

        // user_seq from i_am_online or z_update_1_data_json. user_seq is null when called from avatar upload. Timestamp is not updated
        // params:
        // - cb: optional callback function. post publish processing. used in i_am_online. check pubkey2 takes long time and best done after publish
        var zeronet_site_publish_interval = 0 ;
        function zeronet_site_publish(cb) {
            var pgm = service + '.zeronet_site_publish: ' ;

            get_my_user_hub(function (hub) {
                var pgm = service + '.zeronet_site_publish get_my_user_path callback 1: ';
                if (detected_client_log_out(pgm)) return ;

                var user_path = "merged-MoneyNetwork/" + hub + "/data/users/" + ZeroFrame.site_info.auth_address;
                if (detected_client_log_out(pgm)) return ;

                // get user_seq if ready
                get_user_seq(function(user_seq) {
                    var pgm = service + '.zeronet_site_publish get_user_seq callback 2: ';
                    if (detected_client_log_out(pgm)) return ;
                    // update timestamp in status
                    get_status_json(function (status) {
                        var pgm = service + '.zeronet_site_publish get_status_json callback 3: ';
                        // console.log(pgm + 'data = ' + JSON.stringify(data));
                        var i, index, timestamp, json_raw, error ;
                        if (detected_client_log_out(pgm)) return ;
                        if (user_seq) {
                            // remove deleted users (removed in z_update_1_data_json)
                            if (z_cache.user_seqs && (z_cache.user_seqs.indexOf(user_seq) != -1)) {
                                for (i=status.status.length-1 ; i >= 0 ; i--) {
                                    if (z_cache.user_seqs.indexOf(status.status[i].user_seq) == -1) status.status.splice(i,1) ;
                                }
                            }
                            index = -1 ;
                            timestamp = new Date().getTime();
                            for (i=0 ; i<status.status.length ; i++) {
                                if (status.status[i].user_seq == user_seq) index = i ;
                            }
                            if (index == -1) status.status.push({ user_seq: user_seq, timestamp: timestamp}); // add new user
                            else if (!user_setup.not_online) status.status[index].timestamp = timestamp; // show as online
                            else console.log(pgm + 'Show as offline - status.json was not updated') ; // not online
                            // console.log(pgm + 'updated timestamp. status = ' + JSON.stringify(status)) ;
                        }
                        // validate status.json before write
                        error = MoneyNetworkHelper.validate_json (pgm, status, 'status.json', 'Invalid json file') ;
                        if (error) {
                            error = 'Cannot write invalid status.json file: ' + error;
                            console.log(pgm + error);
                            console.log(pgm + 'status = ' + JSON.stringify(status));
                            ZeroFrame.cmd("wrapperNotification", ["error", error]);
                            return ;
                        }

                        // write status.json
                        write_status_json(function (res) {
                            var pgm = service + '.zeronet_site_publish fileWrite callback 4: ';
                            var error, debug_seq ;
                            if (detected_client_log_out(pgm)) return ;
                            if (res != "ok") {
                                error = "Update was not published. fileWrite failed for status.json: " + res ;
                                console.log(pgm + error);
                                ZeroFrame.cmd("wrapperNotification", ["error", error, 5000]);
                                return ;
                            }
                            // sitePublish
                            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_site_publish', pgm + 'publish') ;
                            ZeroFrame.cmd("sitePublish", {inner_path: user_path + '/content.json'}, function (res) {
                                var pgm = service + '.zeronet_site_publish sitePublish callback 5: ';
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                // console.log(pgm + 'res = ' + JSON.stringify(res));
                                if (detected_client_log_out(pgm)) return ;
                                if (res != "ok") {
                                    ZeroFrame.cmd("wrapperNotification", ["error", "Failed to publish: " + res.error, 5000]);
                                    // error - repeat sitePublish in 30, 60, 120, 240 etc seconds (device maybe offline or no peers)
                                    if (!zeronet_site_publish_interval) zeronet_site_publish_interval = 30 ;
                                    else zeronet_site_publish_interval = zeronet_site_publish_interval * 2 ;
                                    console.log(pgm + 'Error. Failed to publish: ' + res.error + '. Try again in ' + zeronet_site_publish_interval + ' seconds');
                                    var retry_zeronet_site_publish = function () {
                                        zeronet_site_publish();
                                    };
                                    if (cb) cb() ;
                                    $timeout(retry_zeronet_site_publish, zeronet_site_publish_interval*1000);
                                    // debug_info() ;
                                    return;
                                }

                                // sitePublish OK
                                zeronet_site_publish_interval = 0 ;
                                z_cache.publish = false ;

                                // debug: is sha256 links in localStorage (contacts.messages) and ZeroNet (data.json message table) OK?
                                if (user_setup.debug && user_setup.debug.check_sha256_addresses) check_sha256_addresses('sitePublish', false, false) ;

                                // check content.json and add optional file support if missing
                                // also check for
                                debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + user_path + '/content.json fileGet') ;
                                ZeroFrame.cmd("fileGet", {inner_path: user_path + '/content.json', required: false}, function (content) {
                                    var pgm = service + '.zeronet_site_publish fileGet callback 6: ';
                                    var json_raw, content_updated, filename, file_user_seq, cache_filename, cache_status,
                                        logical_deleted_files, now, max_logical_deleted_files, some_time_ago ;
                                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                    if (detected_client_log_out(pgm)) return ;
                                    content_updated = false ;

                                    // optional files support:
                                    // 1) <to timestamp>-<from timestamp>-<user_seq>-chat.json - unix timestamp with milliseconds for first and last chat msg in json file
                                    // 2) <timestamp>-image.json - unix timestamp with miliseconds = sent_at timestamp for a message in data.json file
                                    // 3) <timestamp>-<userseq>-image.json - unix timestamp with miliseconds = sent_at timestamp for a message in data.json file
                                    content = JSON.parse(content) ;
                                    if (content.optional == CONTENT_OPTIONAL) {
                                        // optional file support also in place. save to my_files_optional. used in public chat
                                        save_my_files_optional(content.files_optional || {}) ;
                                    }
                                    else {
                                        content.optional = CONTENT_OPTIONAL ;
                                        content_updated = true ;
                                    }

                                    // check logical deleted optional *-chat.json files
                                    // rules.
                                    // - *chat.json files with size 2 = empty json {}
                                    // - should only delete *chat.json files with info_info.peer = 0
                                    // - should only delete "old" *chat.json files
                                    // - max number of logical deleted *chat.json files.
                                    // check z_cache.user_seqs. deleted users. optional files from deleted users must be removed.
                                    if (content.files_optional && z_cache.user_seqs) {
                                        // console.log(pgm + 'z_cache.user_seqs = ' + JSON.stringify(z_cache.user_seqs)) ;
                                        // z_cache.user_seqs = [2]
                                        for (filename in content.files_optional) {
                                            if (content.files_optional[filename].size <= 2) continue ;
                                            // console.log(pgm + 'filename = ' + filename + ', size = ' + content.files_optional[filename].size) ;
                                            if (filename.match(/-chat/)) {
                                                // public unencrypted chat. 1483633906108-1483633906108-1-chat.json
                                                file_user_seq = parseInt(filename.split('-')[2]) ;
                                            }
                                            else if (filename.match(/[0-9]{13}-[0-9]+-image/)) {
                                                // encrypted image. new format. 1483877022900-1-image.json
                                                file_user_seq = parseInt(filename.split('-')[1]) ;
                                            }
                                            else {
                                                // encrypted image. old format. 1483877022900-image.json
                                                // todo: cleanup in z_update_1_data_json?
                                                continue ;
                                            }
                                            if (z_cache.user_seqs.indexOf(file_user_seq) != -1) continue ; // ok user seq
                                            // logical delete - overwrite with empty json
                                            write_empty_chat_file(user_path + '/' + filename);
                                        }
                                    }

                                    // physical delete old logical deleted optional files (empty json)
                                    // - all optional files older when one week
                                    // - keep max <n> logical deleted optional files
                                    if (content.files_optional) {
                                        now = new Date().getTime() ;
                                        max_logical_deleted_files = 10 ;
                                        some_time_ago = now - 1000*60*60*24*7 ; // one week ago
                                        logical_deleted_files = [] ;
                                        for (filename in content.files_optional) {
                                            if (content.files_optional[filename].size > 2) continue ;
                                            if (!filename.match(/^[0-9]{13}-/)) continue ;
                                            timestamp = parseInt(filename.substr(0,13)) ;
                                            if (timestamp < some_time_ago) {
                                                debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_delete', pgm + user_path + '/' + filename + ' fileDelete') ;
                                                ZeroFrame.cmd("fileDelete", user_path + '/' + filename, function () {
                                                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                                }) ;
                                                content_updated = true ;
                                                continue ;
                                            }
                                            logical_deleted_files.push(filename) ;
                                        }
                                        logical_deleted_files.sort() ;
                                        while (logical_deleted_files.length > max_logical_deleted_files) {
                                            filename = logical_deleted_files.shift() ;
                                            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_delete', pgm + user_path + '/' + filename + ' fileDelete') ;
                                            ZeroFrame.cmd("fileDelete", user_path + '/' + filename, function () {
                                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                            }) ;
                                            content_updated = true ;
                                        }
                                    }

                                    // update size in cache_status for my optional files
                                    if (content.files_optional) for (filename in content.files_optional) {
                                        if (filename.match(/image/)) continue;
                                        if (content.files_optional[filename].size <= 2) continue;
                                        cache_filename = user_path + '/' + filename ;
                                        cache_status = files_optional_cache[cache_filename] ;
                                        if (!cache_status) continue ;
                                        if (cache_status.size == content.files_optional[filename].size) continue ;
                                        debug('public_chat', pgm + 'issue #84: updating cache_status for ' + cache_filename +
                                            '. old size = ' + cache_status.size + ', new size = ' + content.files_optional[filename].size);
                                        cache_status.size = content.files_optional[filename].size ;
                                    }

                                    if (!content_updated) {
                                        if (cb) cb() ;
                                        return ;
                                    }

                                    // update content.json. sign and publish in next publish call
                                    json_raw = unescape(encodeURIComponent(JSON.stringify(content, null, "\t")));
                                    debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + user_path + '/content.json fileWrite') ;
                                    ZeroFrame.cmd("fileWrite", [user_path + '/content.json', btoa(json_raw)], function (res) {
                                        var pgm = service + '.zeronet_site_publish fileWrite callback 7: ';
                                        var error ;
                                        MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                        if (detected_client_log_out(pgm)) return ;
                                        if (res != "ok") {
                                            error = "Could not add optional file support to content.json: " + res ;
                                            console.log(pgm + error);
                                            ZeroFrame.cmd("wrapperNotification", ["error", error, 5000]);
                                            return ;
                                        }
                                        // sign and publish in next zeronet_site_publish call
                                        if (cb) cb() ;

                                    }) ; // fileWrite callback 7

                                }) ; // fileGet callback 6

                            }); // sitePublish callback 5

                        }); // write_status_json callback 4

                    }); // get_status_json callback 3

                }) ; // get_user_seq callback 2

            }); // get_my_user_path callback 1

        } // zeronet_site_publish


        var user_contents_max_size = null ; // max size of user directory. from data/users/content
        function load_user_contents_max_size (lock_pgm) {

            get_my_user_hub(function (hub) {
                var pgm = service + ".load_user_contents_max_size get_my_user_hub callback 1: " ;
                var inner_path, debug_seq ;
                inner_path = 'merged-MoneyNetwork/' + hub + '/data/users/content.json' ;
                debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + inner_path + ' fileGet') ;
                ZeroFrame.cmd("fileGet", {inner_path: inner_path, required: false}, function (data) {
                    var pgm = service + ".load_user_contents_max_size fileGet callback 2: " ;
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                    if (!data) {
                        console.log(pgm + 'Error. Cannot find max user directory size. Content.json lookup failed. Path was ' + inner_path) ;
                        user_contents_max_size = -1 ;
                        if (lock_pgm) z_update_1_data_json (lock_pgm) ;
                        return
                    }
                    data = JSON.parse(data) ;
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
                }) ; // fileGet callback 2

            }) ; // get_my_user_hub callback 1

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
                show_receiver_sha256, error, contact2, message2, contact3, participant_no, k ;
            now = new Date().getTime() ;

            // check that json still is valid before adding feedback information to outgoing messages
            // problem with null values in sent and received arrays
            message = message_with_envelope.message ;
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
                message = message_with_envelope.message ;
                error = MoneyNetworkHelper.validate_json(pgm, message, message.msgtype, 'cannot add invalid feedback info to outgoing message');
                if (error) {
                    console.log(pgm , error) ;
                    delete message_with_envelope.message.feedback ;
                    return;
                }

            }

        } // add_feedback_info


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
                            add_message(contact, lost_message_with_envelope) ;
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
                        }
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
        //var grp_reaction_action_table = {
        //    inbox: {
        //        none:    { none: [,],     group: [,'g'],     private: [,'p'] },
        //        group:   { none: [,'g'],  group: [,'g'],     private: ['g0', 'p'] },
        //        private: { none: ['p0',], group: [,'g'],     private: [,'p'] } // private=>group changed from ['p0','g'] to group: [,'g']. maybe not correct!!
        //    },
        //    outbox: {
        //        none:    { none: [,],     group: [,'g'],     private: [,'a'] },
        //        group:   { none: [,'g'],  group: [,'g'],     private: ['g0', 'a'] },
        //        private: { none: ['a',],  group: ['a','g'],  private: ['a', 'a'] }
        //    }
        //} ;

        // update zeronet step 1. update "data.json" file. update users, search and msg (delete only) arrays
        // params:
        // - lock_pgm - pgm from calling process. write warning if multiple z_update_1_data_json running calls
        // - publish - optional param. true: force publish when finish even if there is no changes to data.json
        //             for example after update to optional files
        function z_update_1_data_json (lock_pgm, publish) {
            var pgm = service + '.z_update_1_data_json: ' ;
            var query ;
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
            if (publish) z_cache.publish = true ;

            if (user_contents_max_size == null) {
                // find max_size and call z_update_1_data_json with not null file_size
                load_user_contents_max_size(lock_pgm);
                return ;
            }
            // console.log(pgm + 'user_contents_max_size = ' + user_contents_max_size) ;

            // cache like.json file. Check for old public reactions
            get_like_json(function (like, like_index, empty) {
                var pgm = service + '.z_update_1_data_json get_like_json callback 1: ';
                var debug_seq ;
                // check current user disk usage. must keep total file usage <= user_contents_max_size
                // console.log(pgm + 'todo: should check user disk usage for current hub. site_info = ' + JSON.stringify(ZeroFrame.site_info));
                query =
                    "select files.filename, files.size " +
                    "from json, files " +
                    "where json.directory like '%/users/" + ZeroFrame.site_info.auth_address + "' " +
                    "and json.file_name = 'content.json' " +
                    "and files.json_id = json.json_id" ;
                debug('select', pgm + 'query 1 = ' + query);
                debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 1') ;
                ZeroFrame.cmd("dbQuery", [query], function (res) {
                    var pgm = service + '.z_update_1_data_json dbQuery callback 2: ';
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
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
                    // console.log(pgm + 'calling fileGet');
                    get_data_json(function (data) {
                        var pgm = service + '.z_update_1_data_json get_data_json callback 2: ' ;
                        // console.log(pgm + 'data = ' + JSON.stringify(data));

                        var local_storage_updated, data_str, row, pubkey, pubkey2, short_avatar, max_user_seq, i,
                            my_user_i, my_user_seq, new_user_row, guest_id, guest, old_guest_user_seq, old_guest_user_index ;

                        // keep track of updates.
                        local_storage_updated = false ; // write localStorage?
                        data_str = JSON.stringify(data) ; // write data.json?
                        if (!data.hub) data.hub = ZeroFrame.site_info.address ;

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
                            data.users[my_user_i].encryption = user_setup.encryption ;
                            if (short_avatar) data.users[my_user_i].avatar = short_avatar ;
                        }
                        else {
                            // add current user to data.users array
                            my_user_seq = max_user_seq + 1 ;
                            new_user_row = {
                                user_seq: my_user_seq,
                                pubkey: pubkey,
                                pubkey2: pubkey2,
                                encryption: user_setup.encryption
                            };
                            if (short_avatar) new_user_row.avatar = short_avatar ;
                            guest_id = MoneyNetworkHelper.getItem('guestid');
                            guest = (guest_id == '' + user_id) ;
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
                        for (i=0 ; i<user_info.length ; i++) {
                            if (user_info[i].privacy != 'Search') continue ;
                            row = {
                                user_seq: my_user_seq,
                                tag: user_info[i].tag,
                                value: user_info[i].value
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
                                        if (!is_admin() || !admin_key) { // ignore delete errors for admin task!
                                            error = "Could not delete message from Zeronet. Maybe posted on ZeroNet from an other ZeroNet id" ;
                                            console.log(pgm + 'error = ' + error) ;
                                            console.log(pgm + 'user_seq = ' + my_user_seq) ;
                                            console.log(pgm + 'zeronet_msg_id = ' + contact.messages[j].zeronet_msg_id) ;
                                            // console.log(pgm + 'data.msg = ' + JSON.stringify(data.msg));
                                            ZeroFrame.cmd("wrapperNotification", ["error", error, 5000]);
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
                                        if (!is_admin() || !admin_key) { // ignore delete errors for admin task!
                                            error = "Could not remove and resend message. Maybe posted in ZeroNet from an other ZeroNet id" ;
                                            console.log(pgm + 'error = ' + error) ;
                                            console.log(pgm + 'user_seq = ' + my_user_seq) ;
                                            console.log(pgm + 'zeronet_msg_id = ' + contact.messages[j].zeronet_msg_id) ;
                                            // console.log(pgm + 'data.msg = ' + JSON.stringify(data.msg));
                                            ZeroFrame.cmd("wrapperNotification", ["error", error, 5000]);
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
                                    if (!user_setup.private_reactions) {
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
                                    if (!user_setup.private_reactions) {
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
                                        ', private_reactions = ' + user_setup.private_reactions +
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
                                            new_private_group_reaction = user_setup.private_reactions ;
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
                                    if (user_setup.private_reactions) delete message_with_envelope.reaction_at ;
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
                                            ', user_setup.private_reactions = ' + user_setup.private_reactions);
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
                        debug('issue_112', pgm + 'issue  #112 - calling z_update_2a_data_json_encrypt');
                        z_update_2a_data_json_encrypt (local_storage_updated, data_json_max_size, data, data_str) ;

                    }); // fileGet callback 2

                }); // dbQuery callback 2

            }) ; // get_like_json callback 1

        } // z_update_1_data_json


        // update zeronet step 2a. update "data.json" file. encrypt and insert new outbox messages in msg arrays
        // step 2a will call step 2b for all cryptMessage encrypted outbox messages 
        function z_update_2a_data_json_encrypt (local_storage_updated, data_json_max_size, data, data_str) {

            var pgm = service + '.z_update_2a_data_json_encrypt: ' ;

            get_my_user_hub(function (hub) {

                var i, contact, encrypt, j, message_with_envelope, message, local_msg_seq, sent_at, key, password,
                    receiver_sha256, k, sender_sha256, image, encrypted_message_str, seq, js_messages_row, resend,
                    user_path, image_path, image_e1, image_e1c1, image_json, json_raw, upload_image_json, error,
                    last_online, debug_seq ;

                user_path = "merged-MoneyNetwork/" + hub + "/data/users/" + ZeroFrame.site_info.auth_address ;

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
                                if (!contact.pubkey || ((contact.encryption == '2') && !contact.pubkey2)) {
                                    console.log(pgm + 'Cannot send message ' + JSON.stringify(message_with_envelope) + '. contact does not have a public key');
                                    console.log(pgm + 'contact = ' + JSON.stringify(contact));
                                    console.log(pgm + 'message = ' + JSON.stringify(message_with_envelope)) ;
                                    console.log(pgm + 'deleting message') ;
                                    // delete invalid message
                                    js_messages_row = js_messages_index.seq[message.seq] ;
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
                                message_with_envelope.local_msg_seq = local_msg_seq;
                                js_messages_row = js_messages_index.seq[message_with_envelope.seq] ;
                                //console.log(pgm + 'test - adding missing js_messages_index.local_msg_seq index. ' +
                                //    'message_with_envelope.seq = ' + message_with_envelope.seq +
                                //    ', js_messages_row = ' + JSON.stringify(js_messages_row) +
                                //    ', js_messages_index.local_msg_seq[' + local_msg_seq + '] = ' + js_messages_index.local_msg_seq[local_msg_seq] +
                                //    ' (should be null)');
                                js_messages_index.local_msg_seq[local_msg_seq] = js_messages_row ;
                                sent_at = new Date().getTime() ;
                                parent = 'todo' ;
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
                                if (seq) js_messages_row = js_messages_index.seq[seq] ;
                                if (js_messages_row) {
                                    // console.log(pgm + 'adding sender_sha256 address ' + sender_sha256 + ' to js_messages sender_sha256 index') ;
                                    js_messages_index.sender_sha256[sender_sha256] = js_messages_row ;
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


                            // move image to envelope before send and back to message after send
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
                            else if (contact.encryption != '2') {
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
                                debug('issue_112', pgm + 'issue  #112 - calling z_update_2b_data_json_encrypt');
                                z_update_2b_data_json_encrypt (
                                    true, data_json_max_size, data, data_str,
                                    contact.pubkey2, message_with_envelope, receiver_sha256, sent_at
                                ) ;
                                // stop. z_update_data_cryptmessage will callback to this function when done with this message
                                return ;
                            }

                            // same post encryption cleanup as in z_update_data_cryptmessage
                            encrypted_message_str = MoneyNetworkHelper.encrypt(JSON.stringify(message), password);
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
                                last_online = get_last_online(contact) || 0 ;
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
                                if (user_setup.test && user_setup.test.image_compress_disabled) {
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
                                    debug('issue_112', pgm + 'issue  #112 - calling z_update_2a_data_json_encrypt');
                                    z_update_2a_data_json_encrypt (true, data_json_max_size, data, data_str)
                                    return ;
                                }
                                json_raw = unescape(encodeURIComponent(JSON.stringify(image_json, null, "\t")));
                                console.log(pgm + 'image==true: uploading image file ' + image_path) ;
                                debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + image_path + ' fileWrite') ;
                                ZeroFrame.cmd("fileWrite", [image_path, btoa(json_raw)], function (res) {
                                    var pgm = service + '.z_update_2a_data_json_encrypt fileWrite callback: ';
                                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                    debug('outbox', pgm + 'res = ' + JSON.stringify(res));
                                    console.log(pgm + 'image==true: uploaded image file ' + image_path + '. res = ' + JSON.stringify(res)) ;
                                    // continue with other messages to encrypt - callback to z_update_2a_data_json_encrypt
                                    debug('issue_112', pgm + 'issue  #112 - calling z_update_2a_data_json_encrypt');
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
                debug('issue_112', pgm + 'issue  #112 - calling z_update_3_data_json_cleanup');
                if (z_update_3_data_json_cleanup (local_storage_updated, data_json_max_size, data)) {
                    // Cleanup OK - write data.json file and continue with any public outbox messages
                    debug('issue_112', pgm + 'issue  #112 - calling z_update_4_data_json_write');
                    z_update_4_data_json_write (data, data_str) ;
                }
                else {
                    // stop: cannot write and publish. data.json file is too big. error notification already in UI
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

            debug('outbox && unencrypted', pgm + 'sending message = ' + JSON.stringify(message_with_envelope.message));
            if (!sent_at) {
                console.log(pgm + 'Invalid call. sent_at was null. using now') ;
                sent_at = new Date().getTime() ;
            }

            get_my_user_hub(function (hub) {
                var pgm = service + '.z_update_2b_data_json_encrypt get_my_user_hub callback 1: ';
                var debug_seq1 ;
                debug('issue_112', pgm + 'issue #112 - calling aesEncrypt');
                debug_seq1 = MoneyNetworkHelper.debug_z_api_operation_start('z_crypt_message', pgm + 'aesEncrypt') ;
                ZeroFrame.cmd("aesEncrypt", [""], function (res) {
                    var pgm = service + '.z_update_2b_data_json_encrypt aesEncrypt callback 2: ';
                    var password, debug_seq2 ;
                    password = res[0];
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq1) ;
                    debug('issue_112', pgm + 'issue #112 - calling eciesEncrypt');
                    debug_seq2 = MoneyNetworkHelper.debug_z_api_operation_start('z_crypt_message', pgm + 'eciesEncrypt') ;
                    ZeroFrame.cmd("eciesEncrypt", [password, pubkey2], function (key) {
                        var pgm = service + '.z_update_2b_data_json_encrypt eciesEncrypt callback 3: ';
                        var debug_seq3 ;
                        MoneyNetworkHelper.debug_z_api_operation_end(debug_seq2) ;
                        // encrypt step 3 - aes encrypt message
                        debug('issue_112', pgm + 'issue #112 - calling aesEncrypt');
                        debug_seq3 = MoneyNetworkHelper.debug_z_api_operation_start('z_crypt_message', pgm + 'aesEncrypt') ;
                        ZeroFrame.cmd("aesEncrypt", [JSON.stringify(message_with_envelope.message), password], function (msg_res) {
                            var pgm = service + '.z_update_2b_data_json_encrypt aesEncrypt callback 4: ';
                            var iv, encrypted_message_str, message, upload_image_json, debug_seq4 ;
                            MoneyNetworkHelper.debug_z_api_operation_end(debug_seq3) ;
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
                                debug('issue_112', pgm + 'issue #112 - calling aesEncrypt for image');
                                debug_seq4 = MoneyNetworkHelper.debug_z_api_operation_start('z_crypt_message', pgm + 'aesEncrypt') ;
                                ZeroFrame.cmd("aesEncrypt", [message.image, password], function (image_res) {
                                    var pgm = service + '.z_update_2b_data_json_encrypt aesEncrypt callback 4: ';
                                    var iv, encrypted_image_str, user_path, image_path, image_json, json_raw, error,
                                        debug_seq ;
                                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq4) ;
                                    iv = image_res[1] ;
                                    encrypted_image_str = image_res[2];
                                    debug('outbox && encrypted', pgm + 'iv = ' + iv + ', encrypted_image_str = ' + encrypted_image_str);
                                    user_path = "merged-MoneyNetwork/" + hub + "/data/users/" + ZeroFrame.site_info.auth_address ;
                                    image_path = user_path + '/' + message_with_envelope.sent_at + '-' + z_cache.user_seq + '-image.json';
                                    // optional compress encrypted image
                                    if (user_setup.test && user_setup.test.image_compress_disabled) {
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
                                    debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + image_path + ' fileWrite') ;
                                    ZeroFrame.cmd("fileWrite", [image_path, btoa(json_raw)], function (res) {
                                        var pgm = service + '.z_update_2b_data_json_encrypt fileWrite callback 5: ';
                                        MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                        debug('outbox', pgm + 'res = ' + JSON.stringify(res));
                                        console.log(pgm + 'image==true: uploaded image file ' + image_path + '. res = ' + JSON.stringify(res)) ;

                                        // continue with other messages to encrypt - callback to z_update_2a_data_json_encrypt
                                        debug('issue_112', pgm + 'issue  #112 - calling z_update_2a_data_json_encrypt');
                                        z_update_2a_data_json_encrypt (local_storage_updated, data_json_max_size, data, data_str) ;

                                    }); // fileWrite callback 5

                                }) ; // aesEncrypt callback 4

                                // stop. fileWrite callback 5 will continue callback sequence
                                return ;
                            }

                            // continue with other messages to encrypt - callback to z_update_2a_data_json_encrypt
                            debug('issue_112', pgm + 'issue  #112 - calling z_update_2a_data_json_encrypt');
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
                available, error, user_seq, user_path, image_path, query;

            user_path = "merged-MoneyNetwork/" + z_cache.my_user_hub + "/data/users/" + ZeroFrame.site_info.auth_address;

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
                        contact_last_online = get_last_online(contact);
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
                ;
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
                ZeroFrame.cmd("wrapperNotification", ["error", error]);
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
            var error ;
            // any changes to data.json file?
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
                ZeroFrame.cmd("wrapperNotification", ["error", error]);
                return ;
            }
            // write data.json and publish
            write_data_json(function (res) {
                // delete zeronet_file_locked[data_json_path] ;
                var pgm = service + '.z_update_data_write_publish write_data_json callback: ' ;
                // console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                if (res === "ok") {
                    // data.json ok. check public chat and publish
                    // debug('public_chat', pgm + 'data.json updated. continue with public chat messages and publish') ;
                    z_update_5_public_chat(true) ;
                }
                else {
                    ZeroFrame.cmd("wrapperNotification", ["error", "Failed to post: " + res.error, 5000]);
                    console.log(pgm + 'Error. Failed to post: ' + res.error) ;
                }
            }); // fileWrite
        } // z_update_4_data_json_write


        // temporary solution instead of fileDelete
        // see https://github.com/HelloZeroNet/ZeroNet/issues/726
        function write_empty_chat_file (file_path, cb) {
            var pgm = service + '.write_empty_chat_file: ' ;
            var empty_json, json_raw, debug_seq ;
            empty_json = {} ;
            json_raw = unescape(encodeURIComponent(JSON.stringify(empty_json, null, "\t")));
            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + file_path + ' fileWrite') ;
            ZeroFrame.cmd("fileWrite", [file_path, btoa(json_raw)], function (res) {
                var pgm = service + '.write_empty_chat_file fileWrite callback: ' ;
                var error ;
                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                if (res === "ok") {
                    if (cb) cb(true) ;
                    return ;
                }
                error = 'failed to write file ' + file_path + ', res = ' + res ;
                debug('public_chat', pgm + error) ;
                ZeroFrame.cmd("wrapperNotification", ["error", error, 5000]);
                if (cb) cb(false) ;
            }) ; // fileWrite callback
        } // write_empty_chat_file


        function cleanup_my_image_json (sent_at, logical_delete, cb) {

            var pgm = service + '.cleanup_my_image_json: ' ;

            get_my_user_hub (function (hub) {

                var image_path, query, debug_seq ;
                // overwrite with empty json as a delete marked optional file.
                image_path = "merged-MoneyNetwork/" + hub + "/data/users/" + ZeroFrame.site_info.auth_address + '/' + sent_at + '-image.json' ;
                query =
                    "select json.directory, files_optional.filename, files_optional.size " +
                    "from files_optional, json " +
                    "where json.json_id = files_optional.json_id " +
                    "and json.directory like '%/users/" + ZeroFrame.site_info.auth_address + "' " +
                    "and ( files_optional.filename = '" + sent_at + '-image.json' + "'" +  // old format without <user_seq> in filename
                    "   or files_optional.filename = '" + sent_at + '-' + z_cache.user_seq + '-image.json' + "' )" ; // new format with <user_seq> in filename
                debug('select', pgm + 'query 2 = ' + query) ;
                debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 2') ;
                ZeroFrame.cmd("dbQuery", [query], function (res) {
                    var pgm = service + '.cleanup_my_image_json dbQuery callback 2: ';
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                    if (res.error) {
                        console.log(pgm + "image check failed: " + res.error);
                        console.log(pgm + 'query = ' + query);
                        if (cb) cb(false) ;
                        return;
                    }
                    if (res.length == 0) {
                        console.log(pgm + 'optional image file ' + image_path + ' was not found');
                        if (cb) cb(false) ;
                        return;
                    }
                    image_path = 'merged-MoneyNetwork/' + res[0].directory + '/' + res[0].filename;
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
                        debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_delete', pgm + image_path + ' fileDelete') ;
                        ZeroFrame.cmd("fileDelete", image_path, function (res) {
                            var pgm = service + '.cleanup_my_image_json fileDelete callback 3: ';
                            MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                            // console.log(pgm + 'res = ' + JSON.stringify(res));
                            if (cb) cb(('res' == 'ok')) ;
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

            get_my_user_hub (function (hub) {
                var pgm = service + '.z_update_5_public_chat get_my_user_hub callback 1: ' ;

                var contact, user_path, now, i, message_with_envelope, file_path, j, z_filename, first_timestamp, last_timestamp,
                    key, key_a, timestamp1, timestamp2, message, new_z_filename, new_file_path, write_file, message_with_envelope2,
                    user_seq, cache_status, debug_seq ;

                contact = get_public_contact(false) ;
                user_path = "merged-MoneyNetwork/" + hub + "/data/users/" + ZeroFrame.site_info.auth_address;
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
                            if (!my_files_optional[z_filename]) {
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
                            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + file_path + ' fileGet') ;
                            ZeroFrame.cmd("fileGet", [file_path, false], function (chat) {
                                var pgm = service + '.z_update_5_public_chat fileGet callback 2a: ' ;
                                var callback, j, json_raw, error, message_with_envelope2, msg_found, cache_status, k, chat_lng, issue_84 ;
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
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
                                    delete my_files_optional[z_filename] ;
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
                                    delete my_files_optional[z_filename] ;
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
                                            ZeroFrame.cmd("wrapperNotification", ["error", error, 5000]);
                                            // stop. changes were not published
                                            return ;
                                        }
                                        // write -chat.json file
                                        json_raw = unescape(encodeURIComponent(JSON.stringify(chat, null, "\t")));
                                        debug('public_chat', 'issue #84 - json_raw.length = ' + json_raw.length + ', JSON.stringify(chat).length = ' + JSON.stringify(chat).length) ;
                                        debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + new_file_path + ' fileWrite') ;
                                        ZeroFrame.cmd("fileWrite", [new_file_path, btoa(json_raw)], function (res) {
                                            var pgm = service + '.z_update_5_public_chat fileWrite callback 3a: ';
                                            MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                            // debug('public_chat', pgm + 'res = ' + JSON.stringify(res)) ;
                                            if (res === "ok") {
                                                // write OK
                                                if (!my_files_optional[new_z_filename]) my_files_optional[new_z_filename] = {} ;
                                                my_files_optional[new_z_filename].size = json_raw.length ;
                                                callback() ;
                                            }
                                            else {
                                                error = 'failed to write file ' + new_z_filename + ', res = ' + res ;
                                                debug('public_chat', pgm + error) ;
                                                ZeroFrame.cmd("wrapperNotification", ["error", error, 5000]);
                                                // stop. changes were not published
                                                return ;
                                            }
                                        }); // fileWrite callback 2a

                                    }; // write_file

                                    if (z_filename == new_z_filename) {
                                        // unchange filename - just write
                                        write_file() ;
                                    }
                                    else {
                                        // changed filename - delete + write
                                        my_files_optional[new_z_filename] = my_files_optional[z_filename] ;
                                        delete my_files_optional[z_filename] ;
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

                            }) ; // fileGet callback 1a

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
                                for (key in my_files_optional) {
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
                                debug('public_chat', pgm + 'my_files_optional = ' + JSON.stringify(my_files_optional)) ;
                                if (z_filename && (my_files_optional[z_filename]['size'] > DATA_FILE_SIZE)) {
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
                            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + file_path + ' fileGet') ;
                            ZeroFrame.cmd("fileGet", [file_path, false], function (chat) {
                                var pgm = service + '.z_update_5_public_chat fileGet callback 2b: ';
                                var chat_lng, new_msg, json_raw, issue_84, error ;
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
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
                                        delete my_files_optional[z_filename] ;
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
                                    if (user_setup.test && user_setup.test.image_compress_disabled) {
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
                                        ZeroFrame.cmd("wrapperNotification", ["error", error, 5000]);
                                        // stop. changes were not published
                                        return ;
                                    }
                                    // write chat file
                                    json_raw = unescape(encodeURIComponent(JSON.stringify(chat, null, "\t")));
                                    debug('public_chat', 'issue #84: json_raw.length = ' + json_raw.length + ', JSON.stringify(chat).length = ' + JSON.stringify(chat).length) ;
                                    debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + new_file_path + ' fileWrite') ;
                                    ZeroFrame.cmd("fileWrite", [new_file_path, btoa(json_raw)], function (res) {
                                        var pgm = service + '.z_update_5_public_chat fileWrite callback 3b: ';
                                        var error, js_message_row ;
                                        MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                        // debug('public_chat', pgm + 'res = ' + JSON.stringify(res)) ;
                                        if (res === "ok") {
                                            // write ok.
                                            if (!my_files_optional[new_z_filename]) my_files_optional[new_z_filename] = {} ;
                                            my_files_optional[new_z_filename].size = json_raw.length ;
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
                                            js_message_row = js_messages_index.seq[message_with_envelope.seq] ;
                                            js_messages_index.local_msg_seq[message_with_envelope.local_msg_seq] = js_message_row ;
                                            //debug('public_chat', pgm + 'message_with_envelope.seq = ' + message_with_envelope.seq +
                                            //    ', js_message_row = ' + JSON.stringify(js_message_row));
                                            z_update_5_public_chat(true) ;
                                            return ;
                                        }
                                        else {
                                            error = 'failed to write file ' + file_path + ', res = ' + res ;
                                            console.log(pgm + error) ;
                                            ZeroFrame.cmd("wrapperNotification", ["error", error, 5000]);
                                            // stop. changes were not published
                                            return ;
                                        }
                                    }); // fileWrite callback 2b

                                } ; // write_file

                                if (z_filename == new_z_filename) write_file() ;
                                else {
                                    // changed filename - delete + write
                                    my_files_optional[new_z_filename] = my_files_optional[z_filename] ;
                                    delete my_files_optional[z_filename] ;
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

                            }) ; // fileGet callback 1b

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
                ls_save_contacts(false);
                if (!publish) {
                    // ZeroFrame.cmd("wrapperNotification", ["info", "No more updates to publish", 5000]);
                    return ;
                }
                zeronet_site_publish(cb) ;
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
                    this_reaction_updated, this_reaction_added, like_index_p, like_index_a, unique_id, new_reaction ;
                error = MoneyNetworkHelper.validate_json (pgm, like, 'like.json', 'Invalid json file') ;
                if (error) {
                    console.log(pgm + 'System error. failed to public reaction. like.json is invalid. ' + error) ;
                    console.log(pgm + 'like = ' + JSON.stringify(like)) ;
                    ZeroFrame.cmd("wrapperNotification", ["error", "Failed to publish reaction<br>like.json file is invalid<br>"]);
                    return done(publish);
                }
                like_updated = false ;
                like_index_updated = false ;

                if (!like.hub) {
                    like.hub = ZeroFrame.site_info.address ;
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
                        if (message_with_envelope.reaction_at && user_setup.private_reactions) {
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
                    ZeroFrame.cmd("wrapperNotification", ["error", "Failed to publish reaction<br>like.json file is invalid<br>"]);
                    return done(publish);
                }
                write_like_json(function(res) {
                    var pgm = service + '.z_update_6_like_json write_like_json callback 2: ' ;

                    if (res === "ok") {
                        // data.json ok. check public chat and publish
                        // debug('public_chat', pgm + 'data.json updated. continue with public chat messages and publish') ;
                        done(true, refresh_reactions_job)  ;
                    }
                    else {
                        ZeroFrame.cmd("wrapperNotification", ["error", "Failed to post: " + res.error, 5000]);
                        console.log(pgm + 'Error. Failed to post: ' + res.error) ;
                    }

                }) ; // write_like_json callback 2

            }) ; // get_like_json callback 1

            done() ;

        } // z_update_6_like_json


        // user info. Array with tag, value and privacy.
        // saved in localStorage. Shared with contacts depending on privacy choice
        var user_info = [] ;
        function empty_user_info_line() {
            return { tag: '', value: '', privacy: ''} ;
        }
        function is_user_info_empty () {
            var user_info_clone, empty_user_info_line_str, i, row ;
            if (user_info.length == 0) return true ;
            empty_user_info_line_str = JSON.stringify(empty_user_info_line()) ;
            user_info_clone = JSON.parse(JSON.stringify(user_info)) ;
            for (i=0 ; i<user_info_clone.length ; i++) {
                row = user_info_clone[i] ;
                delete row['$$hashKey'] ;
                if (JSON.stringify(row) != empty_user_info_line_str) return false ;
            }
            return true ;
        } //  is_user_info_empty


        function guest_account_user_info() {
            var pgm = service + '.guest_account_user_info: ' ;
            // todo: add more info to new guest account
            var timezone = (new Date()).getTimezoneOffset()/60 ;
            var language = navigator.languages ? navigator.languages[0] : navigator.language;
            return [
                { tag: 'Name', value: 'Guest', privacy: 'Search'},
                { tag: '%', value: '%', privacy: 'Search'},
                { tag: 'Timezone', value: '' + timezone, privacy: 'Hidden'},
                { tag: 'Language', value: '' + language, privacy: 'Hidden'}
            ] ;
        }

        function new_account_user_info() {
            var pgm = service + '.new_account_user_info: ' ;
            var cert_user_id, index, name, alias, timezone, language ;
            cert_user_id = ZeroFrame.site_info.cert_user_id ;
            if (!cert_user_id) name = MoneyNetworkHelper.get_fake_name() ;
            else {
                index = cert_user_id.indexOf('@') ;
                if (cert_user_id.substr(index) == '@moneynetwork') name = MoneyNetworkHelper.get_fake_name() ;
                else name = cert_user_id.substr(0,index) ;
            }
            index = name.indexOf(' ') ;
            if (index == -1) alias = name ;
            else alias = name.substr(0,index);
            user_setup.alias = alias ;
            timezone = (new Date()).getTimezoneOffset()/60 ;
            language = navigator.languages ? navigator.languages[0] : navigator.language;
            return [
                { tag: 'Name', value: name, privacy: 'Search'},
                { tag: '%', value: '%', privacy: 'Search'},
                { tag: 'Timezone', value: '' + timezone, privacy: 'Hidden'},
                { tag: 'Language', value: '' + language, privacy: 'Hidden'}
            ] ;
        }
        function load_user_info (create_new_account, guest) {
            var pgm = service + '.load_user_info: ';
            // load user info from local storage
            var user_info_str, new_user_info ;
            if (create_new_account) {
                if (guest) new_user_info = guest_account_user_info();
                else new_user_info = new_account_user_info() ;
            }
            else {
                user_info_str = MoneyNetworkHelper.getItem('user_info') ;
                if (user_info_str) new_user_info = JSON.parse(user_info_str) ;
                else new_user_info = [empty_user_info_line()] ;
            }
            user_info.splice(0,user_info.length) ;
            for (var i=0 ; i<new_user_info.length ; i++) user_info.push(new_user_info[i]) ;
            if (create_new_account) save_user_info() ;
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
                z_update_1_data_json(pgm) ;
                z_contact_search(function () {$rootScope.$apply()}, null, null) ;
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


        // hash with private reactions
        var ls_reactions = {} ;
        function ls_load_reactions () {
            var new_reactions, key ;
            new_reactions = MoneyNetworkHelper.getItem('reactions') ;
            if (new_reactions) new_reactions = JSON.parse(new_reactions) ;
            else new_reactions = {} ;
            for (key in ls_reactions) delete ls_reactions[key] ;
            for (key in new_reactions) ls_reactions[key] = new_reactions[key] ;
        } // load_reactions
        function ls_save_reactions (update_zeronet) {
            var pgm = service + '.save_reactions: ' ;
            MoneyNetworkHelper.setItem('reactions', JSON.stringify(ls_reactions)) ;
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

        }


        // array and indexes with contacts from localStorage
        // array for angularUI. hash with indexes for fast access
        var ls_contacts = [] ; // array with contacts
        var ls_contacts_index = { //
            unique_id: {}, // from unique_id to contract
            password_sha256: {}, // from group password sha256 value to group contact
            cert_user_id: {} // from cert_user_id to array with contacts
        } ;
        var ls_contacts_deleted_sha256 = {} ; // hash with sender_sha256 addresses for deleted contacts (deleted outbox messages)

        // contacts array helper functions
        function clear_contacts () {
            var key ;
            ls_contacts.splice(0, ls_contacts.length) ;
            for (key in ls_contacts_index.unique_id) delete ls_contacts_index.unique_id[key] ;
            for (key in ls_contacts_index.password_sha256) delete ls_contacts_index.password_sha256[key] ;
            for (key in ls_contacts_index.cert_user_id) delete ls_contacts_index.cert_user_id[key] ;
            for (key in ls_contacts_deleted_sha256) delete ls_contacts_deleted_sha256[key] ;
        }
        function add_contact (contact) {
            var password_sha256 ;
            ls_contacts.push(contact) ;
            ls_contacts_index.unique_id[contact.unique_id] = contact ;
            if (contact.password) password_sha256 = CryptoJS.SHA256(contact.password).toString() ;
            if (password_sha256) ls_contacts_index.password_sha256[password_sha256] = contact ;
            if (!ls_contacts_index.cert_user_id[contact.cert_user_id]) ls_contacts_index.cert_user_id[contact.cert_user_id] = [] ;
            ls_contacts_index.cert_user_id[contact.cert_user_id].push(contact) ;
        }
        function remove_contact (index) {
            var pgm = service + '.remove_contact: ' ;
            var contact, password_sha256, sender_sha256, index2 ;
            contact = ls_contacts[index] ;
            ls_contacts.splice(index,1) ;
            delete ls_contacts_index.unique_id[contact.unique_id] ;
            if (contact.password) {
                password_sha256 = CryptoJS.SHA256(contact.password).toString() ;
                ls_contacts_index.password_sha256[password_sha256] ;
            }
            index2 = ls_contacts_index.cert_user_id[contact.cert_user_id].indexOf(contact) ;
            ls_contacts_index.cert_user_id[contact.cert_user_id].splice(index2,1) ;
            // any sender_sha256 addresses to keep? may receive ingoing messages to this sha256 address later
            if (!contact.outbox_sender_sha256) return ;
            for (sender_sha256 in contact.outbox_sender_sha256) {
                ls_contacts_deleted_sha256[sender_sha256] = contact.outbox_sender_sha256[sender_sha256] ;
                debug('lost_message', pgm + 'added sender_sha256 ' + sender_sha256 + ' to ls_contacts_deleted_sha256 list') ;
            }
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
        function get_contacts_by_cert_user_id (cert_user_id) {
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
        function get_public_contact (create) {
            var pgm = service + '.get_public_contact: ' ;
            var unique_id, contact, last_online, online, i ;
            unique_id = CryptoJS.SHA256('Public').toString();
            contact = get_contact_by_unique_id(unique_id);
            if (contact) return contact ;
            if (!create) return null ;
            contact = {
                unique_id: unique_id,
                cert_user_id: unique_id.substr(0,13) + '@moneynetwork',
                type: 'public',
                search: [],
                messages: [],
                avatar: 'z.png', // zeronet logo,
                alias: 'World'
            };
            // add search info
            contact.search.push({
                tag: 'World',
                value: 'World',
                privacy: 'Search',
                row: 1
            });
            add_contact(contact) ;
            return contact ;
        } // get_public_contact
        function get_public_chat_outbox_msg (timestamp) {
            var pgm = service + '.get_public_chat_outbox_msg: ' ;
            var public_contact, i ;
            debug('reaction', pgm + 'received a reaction for public chat message with timestamp ' + timestamp + '. check already loaded public outbox messages') ;
            public_contact = get_public_contact(true) ;
            for (i=0 ; i<public_contact.messages.length ; i++) {
                if (public_contact.messages[i].sent_at == timestamp) {
                    return public_contact.messages[i] ;
                }
            } // for i (messages)
            return null ;
        } // get_public_chat_outbox_msg

        var ls_msg_factor = 0.67 ; // factor. from ls_msg_size to "real" size. see formatMsgSize filter. used on chat
        var js_messages_seq = 0 ; // internal seq to rows in js_messages.
        var js_messages = [] ; // array with { :contact => contact, :message => message } - one row for each message
        var js_messages_index = { //
            seq: {}, // // from seq to row in js_message. always present and link between js_message_row and message objects
            sender_sha256: {}, // from sender_sha256 to row in js_messages
            local_msg_seq: {}, // from local_msg_seq in message to row in js_messages
            parent: {}         // from parent ("<sent_at>,<auth4>") to row in js_messages
        } ;
        var js_orphan_messages = {} ; // from parent ("<sent_at>,<auth4>") to an array of orphan comments

        function clear_messages () {
            var key ;
            js_messages.splice(0, js_messages.length);
            js_messages_seq = 0 ;
            for (key in js_messages_index.seq) delete js_messages_index.seq[key] ;
            for (key in js_messages_index.sender_sha256) delete js_messages_index.sender_sha256[key] ;
            for (key in js_messages_index.local_msg_seq) delete js_messages_index.local_msg_seq[key] ;
            for (key in js_messages_index.parent) delete js_messages_index.parent[key] ;
            for (key in js_orphan_messages) delete js_orphan_messages[key] ;
        } // clear_messages

        var standard_reactions = [
            { unicode: "1f603", title: "Like"},
            { unicode: "2764",  title: "Love"},
            { unicode: "1f606", title: "Ha ha"},
            { unicode: "1f62e", title: "Wow"},
            { unicode: "1f622", title: "Sad"},
            { unicode: "1f621", title: "Angry"}
        ] ;

        function get_standard_reactions () {
            var pgm = service + '.get_standard_reactions: ' ;
            // console.log(pgm + 'standard_reactions = ' + JSON.stringify(standard_reactions)) ;
            return standard_reactions ;
        }
        function get_user_reactions () {
            var pgm = service + '.get_user_reactions: ' ;
            if (!user_setup.reactions) return standard_reactions ;
            // console.log(pgm + 'user_setup.reactions = ' + JSON.stringify(user_setup.reactions)) ;
            return user_setup.reactions ;
        } // get_user_reactions

        // validate child parent context.
        function is_child_parent (child, parent) {
            var pgm = service + '.is_child_parent: ' ;
            var ok ;
            var public_child_message = (child.message.z_filename || (child.contact.type == 'public')) ;
            var public_parent_message = (parent.message.z_filename || (parent.contact.type == 'public')) ;
            if (public_child_message && public_parent_message) return true ; // public chat. no restrictions
            if (public_child_message || public_parent_message) {
                console.log(pgm + 'invalid child parent relation. mixed public private chat. ' +
                    'public_child_message = ' + public_child_message + ', public_parent_message = ' + public_parent_message) ;
                // invalid child parent relation. mixed public private chat. child.z_filename = false, parent.z_filename = true
                console.log(pgm + 'child = ' + JSON.stringify(child)) ;
                //child = {
                //    "contact": {
                //        "unique_id": "591935b15b1c88e2d5f6be0a054604fcf36f0585a6f51098fa3803826fff278c",
                //        "cert_user_id": "591935b15b1c8@moneynetwork",
                //        "type": "public",
                //        "search": [{"tag": "World", "value": "World", "privacy": "Search", "row": 1}],
                //        "messages": [...],
                //        "avatar": "z.png",
                //        "alias": "World"
                //    },
                //    "message": {
                //        "folder": "outbox",
                //        "message": {"msgtype": "chat msg", "message": "test", "parent": "1489336737531,17ZG"},
                //        "created_at": 1489937759848
                //    }
                //};
                delete child.message.message.parent ;
                return false ;
            } // mixed public/private. not allowed
            // private or group chat. contact must be identical for child and parent
            ok = (child.contact.unique_id == parent.contact.unique_id) ;
            if (!ok) {
                console.log(pgm + 'invalid child parent relation. invalid child parent contact. ' +
                    'child.unique_id = ' + child.contact.unique_id + ', parent.unique_id = ' + parent.contact.unique_id) ;
            }
            return ok ;
        } // is_child_parent

        function add_message_parent_index (message) {
            var pgm = service + '.add_message_parent_index: ' ;
            var js_messages_row, contact, auth4, unique_id, sender, parent ;
            if (!message.sent_at) {
                console.log(pgm + 'wait with parent index. No sent_at timestamp in message. message = ' + JSON.stringify(message)) ;
                return ;
            }
            js_messages_row = get_message_by_seq(message.seq) ;
            contact = js_messages_row.contact ;
            // parent index. "<sent_at>,<auth4>". special unique id used for comments
            if (message.folder == 'outbox') auth4 = ZeroFrame.site_info.auth_address.substr(0, 4) ;
            else if (contact.type != 'group') auth4 = contact.auth_address.substr(0,4) ; // public chat inbox or private chat inbox message from contact
            else {
                // group chat. find sender from contact.participants and message.participant
                unique_id = contact.participants[message.participant-1] ;
                sender = get_contact_by_unique_id(unique_id) ;
                console.log(pgm + 'parent index for group chat. message.participant = ' + message.participant +
                    ', contact.participants = ' + JSON.stringify(contact.participants) + ', unique_id = ' + unique_id + ', sender = ' + (sender ? true : false)) ;
                if (sender) auth4 = sender.auth_address.substr(0,4) ;
            }
            if (auth4) parent = message.sent_at + ',' + auth4 ;
            if (parent) {
                if (js_messages_index.parent[parent]) {
                    console.log(pgm + 'parent index does already exist for ' + parent + ' and message ' + JSON.stringify(message.message)) ;
                    return ;
                }
                js_messages_index.parent[parent] = js_messages_row ;
                    // any orphan js_messages_rows (comments) waiting for this new parent message?
                    if (js_orphan_messages[parent]) {
                        console.log(pgm + 'loading ' + js_orphan_messages[parent].length + ' old orphan comment(s)');
                        if (!js_messages_row.messages) js_messages_row.messages = [] ;
                        while (js_orphan_messages[parent].length) {
                            js_child_messages_row = js_orphan_messages[parent].shift() ;
                            if (is_child_parent(js_child_messages_row, js_messages_row)) js_messages_row.messages.push(js_child_messages_row) ;
                            else {
                                // error. invalid child parent relation. ignoring parent and inserting comment as a normal message
                                console.log(pgm + 'deleting invalid parent from message ' + JSON.stringify(js_child_messages_row.message)) ;
                                delete js_child_messages_row.message.message.parent ;
                                js_messages.push(js_child_messages_row) ;
                            }
                        }
                        delete js_orphan_messages[parent] ;
                    }
            }
            else console.log(pgm + 'error. could not create parent index for ' + JSON.stringify(message)) ;
        }

        // add message to 1) contact, 2) js_messages and 3) js_messages_index
        // load_contacts:
        // - true: called from ls_load_contacts or load_public_chat
        // - false: do not add message to contact.messages array (already there)
        function add_message(contact, message, load_contacts) {
            // read like.json file with public reactions
            get_like_json(function (like, like_index, empty) {
                var pgm = service + '.add_message: ' ;
                var js_messages_row, i, unicode, index, title, reactions_index, reaction_info, unique_id, auth_address,
                    like_index_p, k, auth4, sender, parent, js_parent_messages_row, js_child_messages_row ;
                if (!contact && !user_info.block_public) contact = get_public_contact(true) ;
                if (!contact.messages) contact.messages = [] ;
                if (!load_contacts) contact.messages.push(message) ;
                js_messages_row = {
                    contact: contact,
                    message: message,
                    reactions: JSON.parse(JSON.stringify(get_user_reactions()))
                } ;
                if (message.z_filename) {
                    // public chat. not saved in localStorage.
                    // load message reactions from ls_reactions (private localStorage) or like.json (public ZeroNet)
                    // Check for any private reaction stored in ls_reactions hash
                    reactions_index = message.sent_at ;
                    if (reactions_index && (message.folder == 'inbox')) {
                        if (contact.auth_address) reactions_index += ',' + contact.auth_address.substr(0,4) ;
                        else reactions_index = null ;
                    }
                    if (reactions_index) {
                        reaction_info = ls_reactions[reactions_index] ;
                        if (reaction_info) {
                            unique_id = get_my_unique_id() ;
                            if (reaction_info.users.hasOwnProperty(unique_id)) {
                                // found private reaction
                                message.reaction = reaction_info.users[unique_id] ;
                            }
                        }
                    }
                    // check for any public reaction stored in like.json file
                    auth_address = contact.type == 'public' ? ZeroFrame.site_info.auth_address : contact.auth_address ;
                    like_index_p = message.sent_at + ',' + auth_address.substr(0,4) + ',p' ;
                    if (like_index.hasOwnProperty(like_index_p)) {
                        // found public reaction
                        k = like_index[like_index_p] ;
                        message.reaction = like.like[k].emoji ;
                    }
                    //debug('reaction', pgm + 'message.z_filename = ' + message.z_filename +
                    //    ', reactions_index = ' + reactions_index +
                    //    ', reaction_info = ' + JSON.stringify(reaction_info) + ', message.reaction = ' + message.reaction);
                }
                if (message.reaction) {
                    // reaction from localStorage. Mark reaction as selected in reactions array
                    unicode = symbol_to_unicode(message.reaction) ;
                    index = -1 ;
                    for (i=0 ; i<js_messages_row.reactions.length ; i++) if (js_messages_row.reactions[i].unicode == unicode) index = i ;
                    // console.log(pgm + 'message.reaction = ' + message.reaction + ', unicode = ' + unicode + ', index = ' + index);
                    if (index == -1) {
                        // reaction was not found in current user reactions. use full list of emojis as fallback
                        title = is_emoji[message.reaction] ;
                        if (title) js_messages_row.reactions.push({
                            unicode: unicode,
                            title: title,
                            selected: true
                        }) ;
                    }
                    else js_messages_row.reactions[index].selected = true ;
                    // console.log(pgm + 'js_messages_row.reactions = ' + JSON.stringify(js_messages_row.reactions));
                }

                // save js_messages_row in 1) js_messages, 2) under an existing row in js_messages or 3) as an orphan in js_orphan_messages
                if (!message.message.parent) {
                    // 1) normal message
                    js_messages.push(js_messages_row) ;
                }
                else {
                    // 2) or 3) comment
                    console.log(pgm + 'loading comment = ' + JSON.stringify(message)) ;
                    // has parent message been loaded?
                    js_parent_messages_row = js_messages_index.parent[message.message.parent] ;
                    if (js_parent_messages_row) {
                        // 2) under a existing row in js_messages
                        if (is_child_parent(js_messages_row, js_parent_messages_row)) {
                            console.log(pgm + 'parent row has already been loaded. inserting new js_messages_row under existing parent (three structure)') ;
                            if (!js_parent_messages_row.messages) js_parent_messages_row.messages = [] ;
                            js_parent_messages_row.messages.push(js_messages_row) ;
                        }
                        else {
                            // error. invalid child parent relation. ignoring parent and inserting comment as a normal message
                            console.log(pgm + 'deleting invalid parent from message ' + JSON.stringify(message)) ;
                            delete message.message.parent ;
                            js_messages.push(js_messages_row) ;
                        }
                    }
                    else {
                        // 3) as a orphan js_messages_row
                        console.log(pgm + 'parent row has not yet been loaded. saving new js_messages_row in js_orphan_messages and wait for parent row to be loaded') ;
                        if (!js_orphan_messages[message.message.parent]) js_orphan_messages[message.message.parent] = [] ;
                        js_orphan_messages[message.message.parent].push(js_messages_row) ;
                    }
                }

                // add indexes to js_messages_row
                // seq index
                js_messages_seq++ ;
                message.seq = js_messages_seq ;
                js_messages_index.seq[message.seq] = js_messages_row ;
                // sender_sha256 index
                if (message.sender_sha256) {
                    js_messages_index.sender_sha256[message.sender_sha256] = js_messages_row ;
                    // console.log(pgm + 'inserted sender_sha256 address ' + message.sender_sha256 + ' into js_messages sender_sha256 index') ;
                }
                // local_msg_seq index
                if (message.local_msg_seq) {
                    js_messages_index.local_msg_seq[message.local_msg_seq] = js_messages_row ;
                    // console.log(pgm + 'inserted local_msg_seq address ' + message.local_msg_seq + ' into js_messages local_msg_seq index') ;
                }
                if (message.sent_at) add_message_parent_index(message) ;
                if (load_contacts) check_overflow() ;
                // if (!load_contacts) debug('outbox && unencrypted', pgm + 'contact.messages.last = ' + JSON.stringify(contact.messages[contact.messages.length-1])) ;

            }) ; // get_like_json callback 1
        } // add_message

        function remove_message (js_messages_row) {
            var pgm = service + '.remove_message' ;
            var contact, message, i, seq ;
            if (!js_messages_row) {
                console.log(pgm + 'invalid call. js_message_row is null') ;
                return ;
            }
            contact = js_messages_row.contact ;
            message = js_messages_row.message ;
            seq = message.seq ;
            // remove from contact.messages
            for (i=0 ; i<contact.messages.length ; i++) {
                if (contact.messages[i].seq == seq) {
                    contact.messages.splice(i,1) ;
                    break ;
                }
            }
            // remove from js_messages
            for (i=0 ; i<js_messages.length ; i++) {
                if (js_messages[i].message.seq == seq) {
                    js_messages.splice(i,1) ;
                    break ;
                }
            }
            // remove from indexes
            delete js_messages_index.seq[seq] ;
            if (message.sender_sha256) delete js_messages_index.sender_sha256[message.sender_sha256] ;
            if (message.local_msg_seq) delete js_messages_index.local_msg_seq[message.local_msg_seq] ;
            // remove from chat filter cache - used in ctrlCtrl
            js_messages_row.chat_filter = false ;
        } // remove_message

        function get_message_by_seq (seq) {
            var pgm = service + '.get_message_by_seq: ' ;
            var js_messages_row = js_messages_index.seq[seq] ;
            return js_messages_row ;
        }
        function get_message_by_sender_sha256 (sender_sha256) {
            var pgm = service + '.get_message_by_sender_sha256: ' ;
            var js_messages_row = js_messages_index.sender_sha256[sender_sha256] ;
            //if (js_messages_row) console.log(pgm + 'found sender_sha256 address ' + sender_sha256 + ' in js_messages sender_sha256 index') ;
            //else console.log(pgm + 'did not find sender_sha256 address ' + sender_sha256 + ' in js_messages sender_sha256 index') ;
            return js_messages_row ;
        } // get_message_by_sender_sha256
        function get_message_by_local_msg_seq (local_msg_seq) {
            var pgm = service + '.get_message_by_local_msg_seq: ' ;
            var js_messages_row = js_messages_index.local_msg_seq[local_msg_seq] ;
            return js_messages_row ;
        }

        // recursive delete message and any child messages (comments)
        function recursive_delete_message (message) {
            var pgm = service + '.recursive_delete_message: ' ;
            var delete_message, error, update_zeronet, i, action ;
            update_zeronet = false ;
            if (message.message.deleted_at) return update_zeronet ; // already deleted
            if (message.message.folder == 'outbox') {
                // check for not sent messages
                if (!message.message.sent_at) {
                    console.log(pgm + 'error cleanup. deleting message without a sent_at timestamp. message.message = ' + JSON.stringify(message.message)) ;
                    remove_message(message) ;
                    action = 1.1 ;
                }
                else if (message.contact.type == 'public') {
                    // public unencrypted outbox message. just delete
                    delete message.edit_chat_message;
                    debug('public_chat', pgm + 'deleted public outbox message ' + JSON.stringify(message.message)) ;
                    update_zeronet = true ;
                    action = 1.2 ;
                }
                else if (message.message.message.msgtype == 'chat msg') {
                    // private or group chat outbox message. must send an empty delete chat message message
                    delete message.message.message.original_image ;
                    // outbox: send delete chat message. note empty chat message
                    delete_message = {
                        msgtype: 'chat msg',
                        old_local_msg_seq: message.message.local_msg_seq
                    };
                    // console.log(pgm + 'delete_message = ' + JSON.stringify(delete_message));
                    // validate json
                    error = MoneyNetworkHelper.validate_json(pgm, delete_message, delete_message.msgtype, 'Could not send delete chat message');
                    if (error) {
                        ZeroFrame.cmd("wrapperNotification", ["Error", error]);
                        return update_zeronet;
                    }
                    // console.log(pgm + 'last_sender_sha256 = ' + last_sender_sha256);
                    // send message
                    update_zeronet = true ;
                    add_msg(message.contact, delete_message, false);
                    js_messages[js_messages.length-1].chat_filter = false ;
                    // delete old message
                    delete message.edit_chat_message;
                    delete message.message.image;
                    action = 1.3 ;
                    // save localStorage and update ZeroNet
                }
                else {
                    // other private or group chat outbox message. Just delete
                    if (message.message.zeronet_msg_id) update_zeronet = true ;
                    action = 1.4 ;
                }
            }
            else {
                // inbox messages. just delete
                action = 2 ;
            }
            message.message.deleted_at = new Date().getTime(); // logical delete
            message.chat_filter = false ;
            console.log(pgm + 'action = ' + action + ', deleted message ' + JSON.stringify(message.message)) ;

            // recursive delete any child messages (nested comments)
            if (!message.messages) return update_zeronet ;
            console.log(pgm + 'recursive deleting ' + message.messages.length + ' message(s)') ;
            for (i=0 ; i<message.messages ; i++) {
                if (recursive_delete_message (message.messages[i])) update_zeronet = true ;
            }
            return update_zeronet ;
        } // recursive_delete_message

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
            get_data_json(function (data) {
                var pgm = service + '.check_sha256_addresses fileGet callback for ' + context + ': ';
                var my_pubkey, i, user_seq, sha256, sha256_hash, contact, j, message, ls_missing, z_missing, sha256_ok, delete_msg_rows, update_zeronet, now ;
                update_zeronet = false ;
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
                    // data.json was updated. update and publish1
                    write_data_json(function (res) {
                        var pgm = service + '.check_sha256_addresses write_data_json callback: ' ;
                        // console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                        if (res === "ok") {
                            if (update_local_storage) ls_save_contacts(false) ;
                            zeronet_site_publish() ;
                        }
                        else {
                            ZeroFrame.cmd("wrapperNotification", ["error", "Failed to post: " + res.error, 5000]);
                            console.log(pgm + 'Error. Failed to post: ' + res.error) ;
                        }
                    }); // write_data_json

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
            if (deleted_sha256_str) new_deleted_sha256 = JSON.parse(deleted_sha256_str);
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
            var query =
                "select" +
                "  substr(data_json.directory, 1, instr(data_json.directory,'/')-1) as hub," +
                "  substr(data_json.directory, instr(data_json.directory,'/data/users/')+12) as auth_address,"+
                "  users.user_seq, users.pubkey, users.pubkey2,users.encryption, status.timestamp " +
                "from json as data_json, json as content_json, users, json as status_json, status " +
                "where " ;
            for (i = 0; i < auth_addresses.length; i++) {
                if (i == 0) query += '(' ;
                else query += ' or ';
                query += "data_json.directory like '%/users/" + auth_addresses[i] + "'";
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
            debug('select', pgm + 'query 3 (MS OK) = ' + query);
            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 3') ;
            ZeroFrame.cmd("dbQuery", [query], function (res) {
                var pgm = service + '.ls_load_contacts dbQuery callback 1: ';
                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                // console.log(pgm + 'res.length = ' + res.length);
                if (res.error) {
                    ZeroFrame.cmd("wrapperNotification", ["error", "Search for public keys: " + res.error, 5000]);
                    console.log(pgm + "Search for pubkeys failed: " + res.error);
                    console.log(pgm + 'query = ' + query);
                    console.log(pgm + '2) avatar check skipped and 3) data.json check skipped');
                    return ;
                }
                if (detected_client_log_out(pgm)) return ;

                // console.log(pgm + 'res = ' + JSON.stringify(res));
                var res_hash = {};
                for (var i = 0; i < res.length; i++) {
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
                var auth_address, unique_id, found_hub, found_user_seq, found_pubkey, found_pubkey2, found_encryption,
                    found_last_updated, conflicting_information;
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
                query =
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
                debug('select', pgm + 'query 4 (MS OK) = ' + query) ;
                debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 4') ;
                ZeroFrame.cmd("dbQuery", [query], function (res) {
                    var pgm = service + '.ls_load_contacts dbQuery callback 2: ' ;
                    var i, unique_id, source1_avatars, source2_avatars, contact, index1, index2 ;
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;

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
                            index2 = res[i].hub + ',' + unique_id ;
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
        function get_contacts() {
            return ls_contacts ;
        }
        function ls_save_contacts (update_zeronet) {
            var pgm = service + '.ls_save_contacts: ' ;

            // any logical deleted inbox messages to be physical deleted?
            var i, contact, j, message, auth_address, local_msg_seq, key, sender_sha256, reactions_index, save_reactions ;
            save_reactions = false ;
            for (i=0 ; i<ls_contacts.length ; i++)  {
                contact = ls_contacts[i] ;
                if (contact.type == 'public') continue ; // my outgoing public chat messages
                auth_address = contact.auth_address ;
                if (!contact.messages) continue ;
                for (j=contact.messages.length-1 ; j>=0 ; j--) {
                    message = contact.messages[j] ;
                    if (!message.deleted_at) continue ;
                    if (message.folder == 'inbox') {
                        if (message.z_filename) {
                            // mark public chat inbox message as deleted
                            console.log(pgm + 'marking public chat inbox message as deleted');
                            reactions_index = message.sent_at + ',' + contact.auth_address.substr(0,4);
                            if (!ls_reactions[reactions_index]) ls_reactions[reactions_index] = {} ;
                            ls_reactions[reactions_index].deleted_at = message.deleted_at ;
                            save_reactions = true ;
                        }
                        else {
                            // physical delete inbox message (private or group chat)
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
                                //debug('feedback_info', pgm + 'feedback_info: contact ' + contact.auth_address +
                                //    ', deleted_inbox_messages = ' + JSON.stringify(contact.deleted_inbox_messages) +
                                //    ', Object.keys(contact.deleted_inbox_messages) = ' + JSON.stringify(Object.keys(contact.deleted_inbox_messages)));
                            }
                        }
                    }
                    else if (message.zeronet_msg_id) {
                        // outbox. wait. zeronet_msg_id reference must be removed in z_update_1_data_json before physical delete here
                        debug('data_cleanup', pgm + 'data_cleanup: waiting with physical delete of outbox message. zeronet_msg_id has yet been removed. should be done in next z_update_1_data_json call. message = ' + JSON.stringify(message)) ;
                        continue ;
                    }
                    else {
                        // outbox.
                        // remember sender_sha256 from deleted outbox messages. Could get an ingoing message later to this address
                        // console.log(pgm + 'contact before message delete: ' + JSON.stringify(contact));
                        sender_sha256 = message.sender_sha256 ;
                        if (sender_sha256) {
                            if (!contact.outbox_sender_sha256) contact.outbox_sender_sha256 = {} ;
                            if (!contact.outbox_sender_sha256.hasOwnProperty(sender_sha256)) {
                                contact.outbox_sender_sha256[sender_sha256] = { send_at: message.sent_at}
                            }
                        }
                        // remember local_msg_seq from deleted outbox messages. Contact may send feedback info for this local_msg_seq later
                        local_msg_seq = message.local_msg_seq ;
                        // debug('feedback_info', pgm + 'local_msg_seq = ' + local_msg_seq);
                        if (local_msg_seq) {
                            if (!contact.deleted_outbox_messages) contact.deleted_outbox_messages = {} ;
                            contact.deleted_outbox_messages[message.local_msg_seq] = message.feedback ;
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
            var local_storage_contacts_clone = JSON.parse(JSON.stringify(ls_contacts));
            for (i=local_storage_contacts_clone.length-1 ; i >= 0 ; i--) {
                contact = local_storage_contacts_clone[i] ;
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
                    if (contact.messages[j].z_filename) {
                        // public unencrypted chat is not stored in localStorage. Only in optional files on ZeroNet
                        contact.messages.splice(j,1) ;
                        continue ;
                    }
                    // remove image errors
                    if (contact.messages[j].message.image &&
                        ((contact.messages[j].message.image == true) ||
                         (contact.messages[j].message.image == 'x'))) delete contact.messages[j].message.image ;
                    delete contact.messages[j]['$$hashKey'] ;
                    delete contact.messages[j].edit_chat_message ;
                    delete contact.messages[j].message.original_image ;
                    delete contact.messages[j].ls_msg_size ;
                    delete contact.messages[j].seq ;
                    // if (contact.messages[j].reactions && (!contact.messages[j].reactions.length)) delete contact.messages[j].reactions ;
                    delete contact.messages[j].reactions ;
                }
            }

            //console.log(pgm + 'local_storage_contacts_clone = ' + JSON.stringify(local_storage_contacts_clone)) ;
            MoneyNetworkHelper.setItem('contacts', JSON.stringify(local_storage_contacts_clone)) ;
            MoneyNetworkHelper.setItem('deleted_sha256', JSON.stringify(ls_contacts_deleted_sha256)) ;

            if (update_zeronet) {
                // update localStorage and zeronet
                $timeout(function () {
                    MoneyNetworkHelper.ls_save() ;
                    debug('issue_112', pgm + 'issue  #112 - calling z_update_1_data_json');
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
            var my_search_query, i, row, error, retry_z_contact_search, contact, pubkey, query, no_contacts ;

            no_contacts = 0 ;

            // any relevant user info? User must have tags with privacy Search or Hidden to search network
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
                if (fnc_when_ready) fnc_when_ready(no_contacts);
                return  ;
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
                if (!ZeroFrame.site_info.cert_user_id) {
                    console.log(pgm + 'Auto login process to ZeroNet not finished. Maybe user forgot to select cert. Checking for new contacts in 1 minute');
                    ZeroFrame.cmd("certSelect", [["moneynetwork.bit", "nanasi", "zeroid.bit", "kaffie.bit", "moneynetwork"]]);
                    setTimeout(retry_z_contact_search,60000);// outside angularjS - using normal setTimeout function
                    return ;
                }
            }

            // debug. check avatars. All contacts must have a valid avatar
            for (i=0 ; i<ls_contacts.length ; i++) {
                contact = ls_contacts[i] ;
                if (!contact.avatar) debug('invalid_avatars', pgm + 'Error. Pre search check. Contact without avatar ' + JSON.stringify(contact)) ;
            } // for i

            // get user data hub (last content.modified timestamp)
            get_my_user_hub(function (hub) {
                var pgm = service + '.z_contact_search get_my_user_hub callback 1: ' ;
                var debug_seq ;

                // find json_id and user_seq for current user.
                // must use search words for current user
                // must not return search hits for current user
                pubkey = MoneyNetworkHelper.getItem('pubkey') ;
                query = "select json.json_id, users.user_seq from json, users " +
                    "where json.directory = '" + hub + "/data/users/" + ZeroFrame.site_info.auth_address + "' " +
                    "and users.json_id = json.json_id " +
                    "and users.pubkey = '" + pubkey + "'";
                debug('select', pgm + 'query 5 (MS OK) = ' + query) ;
                debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 5') ;
                // if (auth_address) debug('file_done', pgm + 'query 1 = ' + query) ;
                ZeroFrame.cmd("dbQuery", [query], function(res) {
                    var pgm = service + '.z_contact_search dbQuery callback 2: ' ;
                    var error ;
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                    if (detected_client_log_out(pgm)) return ;
                    // console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                    if (res.error) {
                        ZeroFrame.cmd("wrapperNotification", ["error", "Search for new contacts failed: " + res.error]);
                        console.log(pgm + "Search for new contacts failed: " + res.error) ;
                        console.log(pgm + 'query 5 = ' + query) ;
                        if (fnc_when_ready) fnc_when_ready(no_contacts);
                        return ;
                    }
                    if (res.length == 0) {
                        // current user not in data.users array. must be a new user (first save). Try again in 3 seconds
                        console.log(pgm + 'current user not in data.users array. must be a new user (first save). Try again in 3 seconds');
                        // ZeroFrame.cmd("wrapperNotification", ["info", "Updating ZeroNet database. Please wait", 3000]);
                        setTimeout(retry_z_contact_search,3000) ;
                        return ;
                    }
                    if (res.length > 1) {
                        console.log(pgm + 'todo: user with auth_address ' + ZeroFrame.site_info.auth_address + ' found at more that one hub. res = ' + JSON.stringify(res)) ;
                    }
                    var json_id = res[0].json_id ;
                    var user_seq = res[0].user_seq ;
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
                    query =
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
                    debug('select', pgm + 'query 7 (MS OK) = ' + query) ;
                    debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 7') ;

                    ZeroFrame.cmd("dbQuery", [query], function(res) {
                        var pgm = service + '.z_contact_search dbQuery callback 3: ';
                        MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                        if (detected_client_log_out(pgm)) return ;
                        // console.log(pgm + 'res = ' + JSON.stringify(res));
                        if (res.error) {
                            ZeroFrame.cmd("wrapperNotification", ["error", "Search for new contacts failed: " + res.error, 5000]);
                            console.log(pgm + "Search for new contacts failed: " + res.error) ;
                            console.log(pgm + 'query = ' + query) ;
                            if (fnc_when_ready) fnc_when_ready(no_contacts);
                            return;
                        }
                        if (res.length == 0) {
                            // current user not in data.users array. must be an user without any search words in user_info
                            ZeroFrame.cmd("wrapperNotification", ["info", "No new contacts were found. Please add/edit search/hidden words and try again", 3000]);
                            if (fnc_when_ready) fnc_when_ready(no_contacts);
                            return;
                        }
                        if (detected_client_log_out(pgm)) return ;

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


        // received an incoming message with image=true
        // download optional file and insert image in message
        // symmetric encrypted image. private chat with JSEncrypt and group chat.
        function download_json_image_file(hub, auth_address, message_with_envelope, password, cb) {
            var pgm = service + '.download_json_image_file: ' ;
            var query, image_path, debug_seq ;
            // console.log(pgm + 'auth_address = ' + auth_address) ;
            // console.log(pgm + 'message_with_envelope = ' + JSON.stringify(message_with_envelope)) ;
            // console.log(pgm + 'password = ' + password) ;

            // is image attachment ready for download? should not be a problem ...
            // temp image_path - only used in error messages
            image_path = "merged-MoneyNetwork/" + hub + "/data/users/" + auth_address + '/' + message_with_envelope.sent_at + '-%-image.json' ;
            query =
                "select filename, files_optional.size " +
                "from files_optional, json " +
                "where json.json_id = files_optional.json_id " +
                "and json.directory = '" + hub + "/data/users/" + auth_address + "' " +
                "and ( files_optional.filename = '" + message_with_envelope.sent_at + '-image.json' + "'" +        // old format without <user_seq> in filename
                "   or files_optional.filename like '" + message_with_envelope.sent_at + '-%-image.json' + "' )" ; // new format with <user_seq> in filename
            debug('select', pgm + 'query 8 = ' + query) ;
            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 8') ;

            ZeroFrame.cmd("dbQuery", [query], function (res) {
                var pgm = service + '.download_json_image_file dbQuery callback 1: ' ;
                var now ;
                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                if (res.error) {
                    console.log(pgm + "image download check failed: " + res.error) ;
                    console.log(pgm + 'query = ' + query) ;
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
                image_path = "merged-MoneyNetwork/" + hub + "/data/users/" + auth_address + '/' + res[0].filename ;
                if (res[0].size <= 2) {
                    console.log(pgm + 'optional image file ' + image_path + ' has been deleted') ;
                    if (cb) cb(false) ;
                    return ;
                }

                // ready for image download
                debug('inbox', pgm + 'downloading image ' + image_path) ;
                debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + image_path + ' fileGet') ;
                ZeroFrame.cmd("fileGet", [image_path, true], function (image) {
                    var pgm = service + '.download_json_image_file fileGet callback 2: ' ;
                    var data, actions, action, error ;
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                    if (!image || (user_setup.test && user_setup.test.image_timeout)) { // test: force download error
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
                    debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_delete', pgm + image_path + ' optionalFileDelete') ;
                    ZeroFrame.cmd("optionalFileDelete", {inner_path: image_path}, function () {
                        MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                    });
                    // done. update UI + callbacks
                    // console.log(pgm + 'Ok. image ' + image_path + ' downloaded') ;
                    $rootScope.$apply() ;
                    if (cb) cb(true) ;
                }) ; // fileGet callback 2

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
                get_and_load_callback, save_private_reaction, last_online, file_name ;
            if (detected_client_log_out(pgm)) return ;

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
                if (['error2', 'error3', 'error4'].indexOf(decrypted_message_str) != -1) {
                    // known errors from cryptMessage decrypt:
                    // - error2 - certificate check failed - error on dbQuery select - never see that error
                    // - error3 - decrypt error but no other known ZeroNet certificates were found .... - never see that error
                    // - error4 - issue 131 - trying to decrypt same cryptMessage again - should be processed in recheck_old_decrypt_errors after client login
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
                if (user_setup.block_guests) {
                    debug('spam_filter', pgm + 'blocking quests and ignoring message from guest ' + JSON.stringify(contact));
                    return false ;
                }
                if (user_setup.block_guests_at && (res.timestamp < user_setup.block_guests_at)) {
                    debug('spam_filter', pgm + 'no longer blocking quests but ignoring old blocked message from guest ' + JSON.stringify(contact));
                    return false ;
                }
            }
            if (contact.type == 'ignored') {
                if (user_setup.block_ignored) {
                    debug('spam_filter', pgm + 'blocking message from contact on ignored list ' + JSON.stringify(contact));
                    return false ;
                }
                if (user_setup.block_ignored_at && (res.timestamp < user_setup.block_ignored_at)) {
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
                        continue ;
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
            add_message(contact_or_group, message) ;

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
                    var contact, image_path, query, debug_seq ;

                    // create image_download_failed object. Used after errors and in event_file_done after download
                    message.image_download_failed = {
                        download_failure_at: new Date().getTime(),
                        encryption: 2,
                        password: password
                    };
                    contact = get_contact_by_unique_id(unique_id);

                    // temporary image path. used in error messages
                    image_path = "merged-MoneyNetwork/" + contact.hub + "/data/users/" + contact.auth_address + '/' + res.timestamp + '-%-image.json';

                    // check if image attachment exist. could have been cleanup or deleted by user
                    query =
                        "select files_optional.filename, files_optional.size, json.directory " +
                        "from files_optional, json " +
                        "where json.json_id = files_optional.json_id " +
                        "and json.directory like '%/data/users/" + contact.auth_address + "' " +
                        "and  ( files_optional.filename = '" + message.sent_at + '-image.json' + "'" +
                        "    or files_optional.filename like '" + message.sent_at + '-%-image.json' + "' )";
                    debug('select', pgm + 'query 9 = ' + query);
                    debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 9') ;
                    ZeroFrame.cmd("dbQuery", [query], function (query_res) {
                        var pgm = service + '.process_incoming_cryptmessage dbQuery callback 3: ';
                        MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                        // console.log(pgm + 'res = ' + JSON.stringify(res));
                        if (query_res.error) {
                            console.log(pgm + "image download check failed: " + query_res.error);
                            console.log(pgm + 'query = ' + query);
                            message.message.image = false ;
                            return;
                        }
                        if (query_res.length == 0) {
                            console.log(pgm + 'optional image file ' + image_path + ' was not found in optional files.');
                            message.message.image = false ;
                            return;
                        }
                        // OK. optional image json file exist. start download. will trigger a event_file_done when ready
                        image_path = "merged-MoneyNetwork/" + query_res[0].directory + '/' + query_res[0].filename;
                        debug('inbox', pgm + 'downloading image ' + image_path);
                        debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + image_path + ' fileGet') ;
                        ZeroFrame.cmd("fileGet", [image_path, true], function (image) {
                            var pgm = service + '.process_incoming_cryptmessage fileGet callback 4: ';
                            MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                            debug('inbox', pgm + 'downloaded image ' + image_path);

                        }); // fileGet callback 4

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
                        if (!ok) {
                            // image download failed. remember failed image download. image may arrive later and be processed in a file_done event
                            decrypted_message.image = false ;
                            message.image_download_failed = {
                                download_failure_at: new Date().getTime(),
                                encryption: 1, // symmetric encrypt
                                password: password
                            };
                            if ((user_setup.test && user_setup.test.image_timeout)) ls_save_contacts(false);
                        }
                        else {
                            // received a chat message with an image.
                            // Send receipt so that other user can delete msg from data.json and free disk space
                            // privacy issue - monitoring ZeroNet files will reveal who is chatting. Receipt makes this easier to trace.
                            var receipt = { msgtype: 'received', remote_msg_seq: decrypted_message.local_msg_seq };
                            // validate json
                            var error = MoneyNetworkHelper.validate_json(pgm, receipt, receipt.msgtype, 'Cannot send receipt for chat message');
                            if (error) console(pgm + error) ;
                            else {
                                // this callback can be called multiple times after log in or when receiving a data.json file
                                // multiple images in process_incoming_message => multiple calls to z_update_1_data_json
                                // process lock in z_update_1_data_json will output a warning in log
                                // first receipt in first z_update_1_data_json call
                                // other receipts in next z_update_1_data_json call in 30 seconds
                                add_msg(contact, receipt) ;
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
                    error = MoneyNetworkHelper.validate_json(pgm, receipt, receipt.msgtype, 'Cannot send receipt for chat message');
                    if (error) console(pgm + error) ;
                    else new_outgoing_receipts.push({ contact: contact, message: receipt}) ;
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
                                emoji_folder = user_setup.emoji_folder || emoji_folders[0] ; // current emoji folder
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
                        debug('reaction', pgm + 'my_files_optional = ' + JSON.stringify(my_files_optional)) ;
                        // - public chat : <to unix timestamp>-<from unix timestamp>-<user seq>-chat.json (timestamps are timestamp for last and first message in file)
                        cache_filename = null ;
                        for (key in my_files_optional) {
                            if (!key.match(/-chat/)) continue ;
                            key_a = key.split('-') ;
                            if (decrypted_message.timestamp > parseInt(key_a[0])) continue ; // to timestamp
                            if (decrypted_message.timestamp < parseInt(key_a[1])) continue ; // from timestamp
                            debug('reaction', pgm + 'object of reaction may be in ' + key) ;
                            user_path = "merged-MoneyNetwork/" + z_cache.my_user_hub + "/data/users/" + ZeroFrame.site_info.auth_address ;
                            cache_filename = user_path + '/' + key ;
                            break ;
                        }
                        if (cache_filename) {
                            // maybe OK. timestamp within start and end timestamp for -chat.json file
                            get_and_load_callback = function () {
                                get_and_load_chat_file(cache_filename, my_files_optional[key].size, decrypted_message.timestamp, function (status) {
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
            debug('lost_message', pgm + 'sent_at = ' + sent_at) ;

            // callback to process_incoming_message when done
            var cb = function () {
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

                return ;
            } ; // cb

            var message_array = res.message.split(',') ;
            var iv = message_array[0] ;
            var encrypted = message_array[1] ;
            var debug_seq ;
            // console.log(pgm + 'iv = ' + iv + ', encrypted = ' + encrypted) ;

            // console.log(pgm + "res.message_sha256 = " + res.message_sha256 + ", calling eciesDecrypt with " + JSON.stringify([res.key, user_id])) ;
            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_crypt_message', pgm + ' eciesDecrypt') ;
            ZeroFrame.cmd("eciesDecrypt", [res.key, user_id], function(password) {
                var pgm = service + '.process_incoming_cryptmessage eciesDecrypt callback 1: ' ;
                var pubkey, query, contact, i, message_with_envelope, message, debug_seq ;
                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
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
                    query =
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
                    debug('select', pgm + 'query 10 = ' + query) ;
                    debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 10') ;
                    ZeroFrame.cmd("dbQuery", [query], function (res2) {
                        var pgm = service + '.process_incoming_cryptmessage dbQuery callback 1: ';
                        var cert_user_ids, i, lost_message, error, local_msg_seq, lost_message_with_envelope, contact ;
                        MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;

                        if (res2.error) {
                            console.log(pgm + "certificate check failed: " + res2.error) ;
                            console.log(pgm + 'query = ' + query) ;
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
                        return;

                    }); // dbQuery callback

                    // stop. dbQuery callback will callback to process_incoming_message
                    return;

                } // if !password

                // decrypt step 2 - password OK - decrypt message
                console.log(pgm + "res.message_sha256 = " + res.message_sha256 + ", calling aesDecrypt with " + JSON.stringify([iv, encrypted, password]));
                debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_crypt_message', pgm + ' aesDecrypt') ;
                ZeroFrame.cmd("aesDecrypt", [iv, encrypted, password], function (decrypted_message_str) {
                    var pgm = service + '.process_incoming_cryptmessage aesDecrypt callback 2: ' ;
                    var decrypted_message, contact, image_path, query ;
                    // console.log(pgm + 'decrypted_message_str = ' + decrypted_message_str);
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;

                    decrypted_message = JSON.parse(decrypted_message_str) ;
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
                    return ;

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
            if (new_unknown_contacts.length == 0) return ;
            console.log(pgm + 'new_unknown_contacts = ' + JSON.stringify(new_unknown_contacts));
            if (detected_client_log_out(pgm)) return ;
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
            var auth_address, expected_auth_addresses = [], unique_id, expected_unique_ids = [], debug_seq ;
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
                "  (select status.timestamp" +
                "   from json as status_json, status as status" +
                "   where status_json.directory = data_json.directory" +
                "   and status_json.file_name = 'status.json'" +
                "   and status.json_id = status_json.json_id" +
                "   and status.user_seq = users.user_seq) as timestamp " +
                "from users, json as data_json, json as content_json, keyvalue as keyvalue " +
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
                "and keyvalue.key = 'cert_user_id'" ;
            debug('select', pgm + 'contacts_query 11 = ' + contacts_query) ;
            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 11') ;
            ZeroFrame.cmd("dbQuery", [contacts_query], function (res) {
                var pgm = service  + '.create_unknown_contacts dbQuery callback: ';
                var found_auth_addresses = [], i, unique_id, new_contact, public_avatars, index, j, last_updated ;
                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                if (detected_client_log_out(pgm)) return ;
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


        // lookup any reactions for message in chat page. called once for each displayed message in chat page
        var watch_like_msg_id = {} ; // msg_id "<timestamp>,<auth>" => js_messages_row
        var watch_like_json = {} ; // auth_address => array with msg id "<timestamp>,<auth>"

        // lookup reactions for public chat. all information is in like table (like.json files)
        function check_public_reactions (js_messages_row) {
            var pgm = service + '.check_public_reactions: ' ;
            var message_with_envelope, contact, auth, participant, unique_id, timestamp, query, msg_id, debug_seq ;

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
            query =
                "select substr(like_json.directory, 7) as auth_address, users.pubkey, like.emoji, like.count " +
                "from like, json as like_json, json as data_json, users " +
                "where like.timestamp = " + timestamp + " " +
                "and like.auth = '" + auth + "' " +
                "and like_json.json_id = like.json_id " +
                "and data_json.directory = like_json.directory " +
                "and data_json.file_name = 'data.json' " +
                "and users.json_id = data_json.json_id " +
                "and users.user_seq = like.user_seq" ;
            debug('select', pgm + 'query 12 = ' + query) ;
            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 12') ;
            ZeroFrame.cmd("dbQuery", [query], function(res) {
                var pgm = service + '.check_public_reactions dbQuery callback: ';
                var emoji_folder, user_reactions, i, title, unicode, j, sum, count, emoji ;
                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                if (res.error) {
                    console.log(pgm + "Search for reactions failed: " + res.error);
                    console.log(pgm + 'query = ' + query);
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

                emoji_folder = user_setup.emoji_folder || emoji_folders[0] ; // current emoji folder
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
            emoji_folder = user_setup.emoji_folder || emoji_folders[0] ; // current emoji folder
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

        // after login - check for new ingoing messages since last login
        var watch_receiver_sha256 = [] ; // listen for sha256 addresses
        var ignore_zeronet_msg_id = {} ; // ignore already read messages. hash auth_address => [ sha256 addresses ]
        function local_storage_read_messages () {
            var pgm = service + '.local_storage_read_messages: ' ;

            // initialize watch_sender_sha256 array with relevant sender_sha256 addresses
            // that is sha256(pubkey) + any secret sender_sha256 reply addresses sent to contacts in money network
            var my_pubkey, my_pubkey_sha256, my_prvkey, i, j, contact, auth_address, reason, message, key ;
            var participant_unique_id, participant, now, debug_seq ;
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
                    if (!ignore_zeronet_msg_id[auth_address]) ignore_zeronet_msg_id[auth_address] = []
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
            var query =
                "select" +
                "  messages.user_seq, messages.receiver_sha256, messages.key, messages.message," +
                "  messages.message_sha256, messages.timestamp, messages.json_id, " +
                "  users.pubkey, " +
                "  substr(json.directory, 1, instr(json.directory,'/')-1) as hub," +
                "  substr(json.directory, instr(json.directory,'/data/users/')+12) as auth_address " +
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
            debug('select', pgm + 'query 13 (MS OK) = ' + query) ;
            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 13') ;
            ZeroFrame.cmd("dbQuery", [query], function(res) {
                var pgm = service + '.local_storage_read_messages dbQuery callback: ';
                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
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
                if (detected_client_log_out(pgm)) return ;

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
            var i, contact, j, message, filename, expected_image_files, image_index, query, seperator, debug_seq ;
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
            query =
                "select hub, filename, image_index " +
                "from " +
                "  (select " +
                "     substr(json.directory, 1, instr(json.directory,'/')-1) as hub," +
                "     'merged-MoneyNetwork/' + || json.directory || '/' || files_optional.filename as filename," +
                "      substr(json.directory, instr(json.directory,'/data/users/')+12) || ',' ||  substr(filename,1,13) as image_index" +
                "   from files_optional, json" +
                "   where files_optional.filename like '%-image.json'" +
                "   and files_optional.size > 2" +
                "   and json.json_id = files_optional.json_id) " +
                "where image_index in " ;
            seperator = '( ' ;
            for (image_index in expected_image_files) {
                query += seperator + "'" + image_index + "'" ;
                seperator = ', ' ;
            }
            query += ')' ;
            debug('select', pgm + 'query 14 = ' + query) ;
            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 14') ;
            console.log(pgm + 'todo: add hub to image_index in query 14?');
            ZeroFrame.cmd("dbQuery", [query], function (res) {
                var pgm = service + '.check_image_download_failed dbQuery callback 1: ' ;
                var found_image_files, i, image_index, get_file_info ;
                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                if (res.error) {
                    ZeroFrame.cmd("wrapperNotification", ["error", "Search for image json files: " + res.error, 5000]);
                    console.log(pgm + "Search for image json files failed: " + res.error);
                    console.log(pgm + 'query = ' + query);
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
                            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + filename + ' fileGet') ;
                            ZeroFrame.cmd("fileGet", {inner_path: filename, required: true}, function (res) {
                                var pgm = service + '.check_image_download_failed fileGet callback 3: ' ;
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                if (!res) console.log(pgm + 'download timeout for file ' + filename) ;
                            }) ;
                        }
                        // next res
                        get_file_info() ;
                    }) ; // optionalFileInfo callback 2
                } ;
                get_file_info() ;

            }) ; // dbQuery callback 1:

        } // check_image_download_failed


        // add message to contact
        function add_msg(contact, message) {
            var pgm = service + '.add_msg: ' ;
            // save message in localStorage. local_storage_save_messages / z_update_1_data_json call will encrypt and add encrypted message to data.json (ZeroNet)
            var message_with_envelope = {
                folder: 'outbox',
                message: message,
                created_at: new Date().getTime()
            } ;
            // add message to contact.messages and js_messages array. not yet a sender_sha256 address. will be added in z_update_1_data_json
            add_message(contact, message_with_envelope) ;
            // console.log(pgm + 'contact = ' + JSON.stringify(contact));
        } // add_msg


        // delete previously send message. returns true if ZeroNet must be updated after calling the method
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

        var my_files_optional = {} ;
        function save_my_files_optional (files_optional) {
            var pgm = service + '.save_my_files_optional: ' ;
            // console.log(pgm + 'files_optional = ' + JSON.stringify(files_optional));
            get_user_seq(function(user_seq) {
                var key, key_a, optional_regexp, now ;
                // console.log(pgm + 'user_seq = ' + user_seq) ;
                // ready. update z_cache.files_optional (full list) and my_files_optional (filter with user_seq)
                for (key in my_files_optional) delete my_files_optional[key] ;
                z_cache.files_optional = files_optional || {} ;
                if (!files_optional) return ;
                optional_regexp = new RegExp('^' + CONTENT_OPTIONAL + '$') ;
                now = new Date().getTime() ;
                for (key in files_optional) {
                    key_a = key.split('-') ;
                    if (!key.match(optional_regexp)) console.log(pgm + 'invalid files_optional key ' + key) ; // invalid optional file name
                    else if (key_a[0] > '' + now) console.log(pgm + 'invalid files_optional key ' + key) ; // timestamp in the future
                    else if (files_optional[key].size <= 2) null ; // debug('public_chat', pgm + 'ignoring empty logical deleted json file ' + key) ;
                    else if (!user_seq || ('' + user_seq == key_a[2])) my_files_optional[key] = files_optional[key] ; // ok
                } // for key
                // console.log(pgm + 'user_seq = ' + user_seq + ', my_files_optional = ' + JSON.stringify(my_files_optional)) ;
            }) ; // get_user_seq
        } // save_my_files_optional

        // return avatar for user or assign a random avatar to user
        var avatar = { src: "public/images/avatar1.png", loaded: false } ;
        function load_avatar () {
            var pgm = service + '.load_avatar: ';
            if (avatar.loaded) return ; // already loaded

            // set previous avatar from setup before checking zeronet
            // console.log(pgm + 'user_setup.avatar = ' + user_setup.avatar) ;
            if (user_setup.avatar && (['jpg','png'].indexOf(user_setup.avatar) == -1)) {
                // public avatar found in user setup
                avatar.src = 'public/images/avatar' + user_setup.avatar ;
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

            get_my_user_hub(function(hub) {
                var pgm = service + '.load_avatar get_my_user_hub callback 1: ';
                var debug_seq ;

                if (user_setup.avatar && (['jpg','png'].indexOf(user_setup.avatar) != -1)) {
                    // uploaded avatar found in user setup
                    avatar.src = 'merged-MoneyNetwork/' + hub + '/data/users/' + ZeroFrame.site_info.auth_address + '/avatar.' + user_setup.avatar ;
                    // console.log(pgm + 'from user setup. temporary setting user avatar to ' + avatar.src);
                }

                // 1) get content.json - check if user already has uploaded an avatar
                var user_path = "merged-MoneyNetwork/" + hub + "/data/users/" + ZeroFrame.site_info.auth_address ;
                debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + user_path + "/content.json fileGet") ;
                ZeroFrame.cmd("fileGet", [user_path + "/content.json", false], function (content) {
                    var pgm = service + '.load_avatar fileGet callback 2: ';
                    var ls_avatar, public_avatars, index ;
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                    if (content) content = JSON.parse(content);
                    else content = { files: {} } ;
                    // console.log(pgm + 'content = ' + JSON.stringify(content));

                    // remember actual list of actual files. Used in public chat
                    if (content.optional == CONTENT_OPTIONAL) save_my_files_optional(content.files_optional || {}) ;

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
                    ls_avatar = user_setup.avatar ;
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
                    index = Math.floor(Math.random() * (public_avatars.length-1)); // avatarz.png is used for public contact
                    avatar.src = "public/images/avatar" + public_avatars[index] ;
                    avatar.loaded = true ;
                    $rootScope.$apply() ;
                    user_setup.avatar = public_avatars[index] ;
                    MoneyNetworkHelper.ls_save();
                }); // fileGet callback 2

            }) ; // get_my_user_hub callback 1

        } // load_avatar

        function get_avatar () {
            return avatar ;
        }

        // wait for setSiteInfo events (new files)
        function event_file_done (hub, event, filename) {
            var pgm = service + '.event_file_done: ' ;
            var debug_seq, merged_filename ;
            console.log(pgm + 'event = ' + JSON.stringify(event) + ', filename = ' + JSON.stringify(filename) + ', hub = ' + hub);
            if (event != 'file_done') return ;
            if (!user_id) return ; // not logged in - just ignore - will be dbQuery checked after client login
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
            merged_filename = 'merged-MoneyNetwork/' + hub + '/' + filename ;
            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + merged_filename + ' fileGet') ;
            ZeroFrame.cmd("fileGet", [merged_filename, false], function (res) {
                var pgm = service + '.event_file_done fileGet callback 1: ';
                var i, contact, auth_address, contacts_updated, index, my_pubkey_sha256, using_my_pubkey,
                    cleanup_inbox_messages_lng1, cleanup_inbox_messages_lng2, cleanup_inbox_messages_lng3, timestamp ;
                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                if (!res) res = {} ;
                else res = JSON.parse(res) ;
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
                        if (!user_setup.public_chat) return ; // public chat disabled
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

                if (filename.match(new RegExp(CONTENT_OPTIONAL))) {
                    // Ok. received file done event when receiving optional json file.
                    // get_and_load_chat_file fileGet callback is normally already processing this file (no need to do anything)
                    // exception: failed image downloades (timeout).
                    debug('public_chat', pgm + 'received optional json file ' + filename) ;

                    // -image.json file. could be a previous failed image download. check image_download_failed object
                    if (!filename.match(/-image\.json$/)) return ; // -chat.json files (public chat)

                    (function() {
                        var timestamp, message_with_envelope, i, contact, found, message_with_envelope, now, dif,
                            image_download_failed, password, image, actions, action, data, loop, error;

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
                            // received a chat message with an image. Cleanup
                            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_delete', pgm + filename + ' optionalFileDelete') ;
                            ZeroFrame.cmd("optionalFileDelete", {inner_path: filename}, function () {
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                            });
                            delete message_with_envelope.image_download_failed;
                            $rootScope.$apply();
                            if (!send_receipt) return ;
                            // Send receipt so that other user can delete msg from data.json, image.json file and free disk space
                            // privacy issue - monitoring ZeroNet files will reveal who is chatting. Receipt makes this easier to trace.
                            var receipt = { msgtype: 'received', remote_msg_seq: message_with_envelope.message.local_msg_seq };
                            // validate json
                            var error = MoneyNetworkHelper.validate_json(pgm, receipt, receipt.msgtype, 'Cannot send receipt for chat message');
                            if (error) console(pgm + error) ;
                            else {
                                // this callback can be called multiple times after log in or when receiving a data.json file
                                // multiple images in process_incoming_message => multiple calls to z_update_1_data_json
                                // process lock in z_update_1_data_json will output a warning in log
                                // first receipt in first z_update_1_data_json call
                                // other receipts in next z_update_1_data_json call in 30 seconds
                                add_msg(contact, receipt) ;
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
                                    debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_crypt_message', pgm + ' aesDecrypt') ;
                                    ZeroFrame.cmd("aesDecrypt", [iv, encrypted, password], function (decrypted_str) {
                                        var pgm = service + '.process_incoming_cryptmessage aesDecrypt callback 5: ';
                                        MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
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

            }); // end fileGet callback 1

        } // end event_file_done
        ZeroFrame.bind_event(event_file_done);

        // cache some important informations from zeronet files
        // - user_seq: from users array in data.json file. using "pubkey" as index to users array
        // - user_seqs: from users array in data.json file.
        // - files_optional: from content.json file. loaded at startup and updated after every sign and publish
        //   todo: add option to enable/disable files_optional cache. must be disabled if multiple users are using same zeronet cert at the same time
        var z_cache = {} ;

        // get user_seq from z_cache or read from data.json file
        function get_user_seq (cb) {
            var pgm = service + '.get_user_seq: ' ;
            if (detected_client_log_out(pgm)) return ;
            // check z_cache
            if (z_cache.user_seq) {
                if (cb) cb(z_cache.user_seq) ;
                return z_cache.user_seq ;
            }
            // not in z_cache. check zeronet
            get_data_json(function (data) {
                var pgm = service + '.get_user_seq fileGet 1 callback: ';
                var pubkey, i, user_seq ;
                if (detected_client_log_out(pgm)) return ;
                // console.log(pgm + 'data = ' + JSON.stringify(data));
                if (!data.users || !data.users.length) {
                    console.log(pgm + 'users array in data.json is empty') ;
                    if (cb) cb(null) ;
                    return ;
                }
                pubkey = MoneyNetworkHelper.getItem('pubkey') ;
                for (i=0 ; i < data.users.length ; i++) {
                    if (data.users[i].pubkey == pubkey) user_seq = data.users[i].user_seq ;
                }
                if (!user_seq) {
                    console.log(pgm + 'pubkey was not found in users array in data.json file') ;
                    if (cb) cb(null) ;
                    return ;
                }
                // OK. found
                z_cache.user_seq = user_seq ;
                if (cb) cb(user_seq) ;
            }) ; // fileGet 1 callback
            // zeronet callback executing. user_seq is not yet ready
            return null ;
        } // get_user_seq

        // get files_optional from z_cache or read from content.json file
        function get_files_optional (cb) {
            var pgm = service + '.get_files_optional: ' ;
            var user_path, debug_seq ;
            // check z_cache
            if (z_cache.files_optional) {
                // console.log(pgm + 'found files_optional in cache') ;
                if (cb) cb(z_cache.files_optional) ;
                return z_cache.files_optional ;
            }
            // not in z_cache. check zeronet
            // console.log(pgm + 'files_option was not in cache. reading content.json file');
            user_path = "data/users/" + ZeroFrame.site_info.auth_address;
            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + user_path + '/content.json fileGet') ;
            ZeroFrame.cmd("fileGet", {inner_path: user_path + '/content.json', required: false}, function (content) {
                var pgm = service + '.get_user_seq fileGet 1 callback: ';
                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                if (!content) {
                    // console.log(pgm + 'content.json file was not found') ;
                    if (cb) cb(null) ;
                    return ;
                }
                content = JSON.parse(content) ;
                if (content.optional != CONTENT_OPTIONAL) {
                    // console.log(pgm + 'optional option not ready in content.json file. will be added/updated after next publish') ;
                    if (cb) cb(null) ;
                    return ;
                }
                if (!content.files_optional) content.files_optional = {} ;
                save_my_files_optional(content.files_optional) ;
                if (cb) cb(content.files_optional) ;
            }) ; // fileGet 1 callback
            // zeronet callback executing. files_optional is not yet ready
            return null ;
        } // get_files_optional


        // hash with download status for optional chat json files
        // index is inner_path data/users/16R2WrLv3rRrxa8Sdp4L5a1fi7LxADHFaH/1482650949292-1482495755468-1-chat.json
        // properties:
        // - no_processes: number of running get_public_chat processes.
        // - is_downloaded: true or false. true after OK fileGet request with expected size
        // - is_pending: true or false. true between fileGet and fileGet result/callback
        // - is_deleted: received logical deleted json file that has also physical deleted
        // - timestamps: list with timestamps for messages not yet loaded into JS
        // - size: physical size from last fileGet request. Must match size from files_optional in content.json files
        // - download_failed_at: array with timestamps for failed (timeout) download.
        var files_optional_cache = { } ;
        function clear_files_optional_cache() {
            for (var key in files_optional_cache) delete files_optional_cache[key] ;
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
                (old_chat_page_context.chat_sort == user_setup.chat_sort)) {
                debug('infinite_scroll', pgm + 'stop. unchanged chat page context.') ;
                return ;
            }

            // changed chat page context
            old_chat_page_context = {
                contact: chat_page_context.contact,
                first_top_timestamp: chat_page_context.first_top_timestamp,
                last_bottom_timestamp: chat_page_context.last_bottom_timestamp,
                end_of_page: chat_page_context.end_of_page,
                chat_sort: user_setup.chat_sort
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
                            return ;
                        }
                        else if (status == 'done') {
                            // no more public chat files
                            chat_page_context.no_processes-- ;
                            return ;
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
                ', chat_sort = ' + user_setup.chat_sort);
            debug('infinite_scroll', pgm + 'chat_page_context = ' + JSON.stringify(chat_page_context)) ;
            debug('infinite_scroll', pgm + 'old_chat_page_context = ' + JSON.stringify(old_chat_page_context)) ;

            // start public chat download?
            if (chat_page_context.contact && (chat_page_context.contact.type == 'group')) {
                debug('infinite_scroll', pgm + 'stop. group chat') ;
                return ;
            } // group chat
            if ((user_setup.chat_sort != 'Last message') && !chat_page_context.end_of_page) {
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
                        (download_failed_at ? ', download failed at ' + date(download_failed_at*1000, 'short') : 'n/a')) ;
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
        function get_public_chat (cb) {
            var pgm = service + '.get_public_chat: ' ;
            var my_auth_address ;
            debug('public_chat', pgm + 'top row timestamp = ' + chat_page_context.first_top_timestamp +
                ', bottom row timestamp = ' + chat_page_context.last_bottom_timestamp +
                ', end_of_page = ' + chat_page_context.end_of_page + ', chat_sort = ' + user_setup.chat_sort);
            if (!chat_page_is_ready() && !chat_page_is_empty()) {
                debug('public_chat', pgm + 'stopping. chat page is not ready') ;
                return cb('done') ;
            }

            // public chat not relevant for:
            if (chat_page_context.contact && (chat_page_context.contact.type == 'group')) return cb('done') ; // not relevant for group chat
            if (user_setup.chat_sort != 'Last message') {
                // sort by message size. public chat size = 0 always in bottom of page
                if (!chat_page_context.end_of_page) return cb('done') ;
            }


            // callback 1 - get my user data hub. Ignore my chat files on other user data hubs
            get_my_user_hub(function (my_user_hub) {
                var pgm = service + '.get_public_chat get_my_user_hub callback 1: ';

                // callback 2 - get my auth_address and user_seq. my chat files = outbox. other chat files = inbox
                my_auth_address = ZeroFrame.site_info.auth_address ;
                get_user_seq(function (my_user_seq) {
                    var pgm = service + '.get_public_chat get_user_seq callback 2: ';
                    var query, debug_seq ;

                    debug('public_chat', pgm + 'my_user_seq = ' + my_user_seq);

                    // callback 2 - find relevant optional files with public chat
                    // - 1. priority - already downloaded optional files
                    // - 2. priority - continue with not downloaded optional files with many peers.
                    // - all json files with size 2 are logical deleted json files
                    query =
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
                        "where content_json.json_id = files_optional.json_id " +
                        "and data_json.directory = content_json.directory " +
                        "and data_json.file_name = 'data.json' " +
                        "and users.json_id = data_json.json_id " +
                        "and users.user_seq = cast(substr( substr(files_optional.filename,29),1,instr(substr(files_optional.filename,29),'-')-1) as integer) " ;
                    if (user_setup.block_guests) query += "and users.guest is null " ; // check spam filter: guests
                    query += "order by files_optional.filename desc" ;
                    debug('select', pgm + 'query 15 = ' + query) ;
                    debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 15') ;
                    ZeroFrame.cmd("dbQuery", [query], function (res) {
                        var pgm = service + '.get_public_chat dbQuery callback 3: ';
                        var i, cache_filename, cache_status, j, pending_files, get_no_peers, unique_id,
                            contact, compare_files1, compare_files2, auth_address, filename, interval_obj, user_seq, key,
                            hash2, timestamp, in_old, in_new, in_deleted_interval, from_timestamp, to_timestamp,
                            deleted_messages, message, cb_status, js_messages_row, one_hour_ago, k ;
                        MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                        if (res.error) {
                            ZeroFrame.cmd("wrapperNotification", ["error", "Search for public chat: " + res.error]);
                            console.log(pgm + "Search for public chat failed: " + res.error);
                            console.log(pgm + 'query 15 = ' + query);
                            return cb('done') ;
                        }

                        // remove any already running getFile requests from previous get_public_chat requests
                        for (i=res.length-1 ; i >= 0 ; i--) {
                            cache_filename = 'data/users/' + res[i].auth_address + '/' + res[i].filename ;
                            cache_status = files_optional_cache[cache_filename] ;
                            if (cache_status && cache_status.is_pending) res.splice(i,1) ;
                        }

                        // my chat files: remove any old chat files from other user data hubs
                        for (i=res.length-1 ; i >= 0 ; i--) {
                            if (res[i].auth_address != my_auth_address) continue ;
                            if (res[i].hub == my_user_hub) continue ;
                            res.splice(i,1) ;
                        }

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
                            cache_filename = 'merged-MoneyNetwork/' + res[i].hub + '/data/users/' + res[i].auth_address + '/' + res[i].filename ;
                            // cache_filename = data/users/16SNxdSpUYVLdVQWx6azQjoZXsZJHJUzKN/1485167995925-1485167995925-3-chat.json
                            if (files_optional_cache[cache_filename] && files_optional_cache[cache_filename].is_deleted) {
                                res.splice(i,1) ;
                                continue ;
                            }
                            // physical delete logical deleted json file. maybe already done. ignore any error message
                            debug('public_chat', pgm + 'physical delete logical deleted json file ' + cache_filename +
                                ', res[' + i + '] = ' + JSON.stringify(res[i])) ;
                            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_delete', pgm + cache_filename + ' optionalFileDelete') ;
                            ZeroFrame.cmd("optionalFileDelete", { inner_path: cache_filename}, function () {
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                            }) ;
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
                            cache_filename = 'merged-MoneyNetwork/' + res[i].hub + '/data/users/' + res[i].auth_address + '/' + res[i].filename ;
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
                                debug('public_chat', pgm + 'issue #79. query = ' + query + ', res = ' + JSON.stringify(res) +
                                    ', compare_files1 = ' + JSON.stringify(compare_files1) +
                                    ', compare_files2 = ' + JSON.stringify(compare_files2));
                            }
                        }
                        if (res.length == 0) return cb(cb_status || 'done') ;// no optional chat files were found

                        // console.log(pgm + 'res (1) = ' + JSON.stringify(res)) ;

                        // remove search results no longer within page context
                        for (i=res.length-1 ; i >= 0 ; i--) {
                            cache_filename = 'merged-MoneyNetwork/' + res[i].hub + '/data/users/' + res[i].auth_address + '/' + res[i].filename ;
                            if (!file_within_chat_page_context(cache_filename)) {
                                res.splice(i,1) ;
                                continue ;
                            }
                        }
                        // check spam filter: ignored contacts
                        if (user_setup.block_ignored) for (i=res.length-1 ; i >= 0 ; i--) {
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
                            cache_filename = 'merged-MoneyNetwork/' + res[i].hub + '/data/users/' + res[i].auth_address + '/' + res[i].filename ;
                            cache_status = files_optional_cache[cache_filename] ;
                            if (cache_status && cache_status.is_pending) {
                                // ignore and delete - is being process by an other process - and delete res
                                res[i].delete = true ;
                                continue ;
                            }
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
                            cache_filename = 'merged-MoneyNetwork/' + res[i].hub + '/data/users/' + res[i].auth_address + '/' + res[i].filename;
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
                                cache_filename = 'merged-MoneyNetwork/' + res[i].hub + '/data/users/' + res[i].auth_address + '/' + res[i].filename;
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
                                    // continue with next file
                                    get_no_peers(cb2);
                                    return ;
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
                            cache_filename = 'merged-MoneyNetwork/' + res[i].hub + '/data/users/' + res[i].auth_address + '/' + res[i].filename;

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
            if (!user_setup.public_chat) return false ; // public chat disabled. Ignore all optional files
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


        // get and load chat file. called from  get_public_chat
        // params:
        // - cache_filename: inner_path to public chat file
        // - expected_size: from dbQuery or content.json file - request new download if size has changed
        // - timestamp: force load public chat message with this timestamp - process_incoming_message - received reaction
        function get_and_load_chat_file(cache_filename, expected_size, read_timestamp, cb) {
            var pgm = service + '.get_and_load_chat_file: ';
            var my_auth_address ;
            if (!user_setup.public_chat && !read_timestamp) {
                console.log(pgm + 'error. ignoring get_and_load_chat_file call for ' + cache_filename + '. public chat is disabled');
                return cb('done') ;
            }

            // get user_seq. used later when setting folder (inbox/outbox) for public chat messages
            my_auth_address = ZeroFrame.site_info.auth_address ;
            get_user_seq(function (my_user_seq) {
                var pgm = service + '.get_and_load_chat_file get_user_seq callback 1: ';
                var cache_status, cb2, debug_seq;

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
                    return
                };
                // read optional file. can take some time depending of number of peers
                cache_status.is_pending = true;

                debug('public_chat || issue_112', pgm + 'start download ' + cache_filename) ;
                debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + cache_filename + ' fileGet') ;
                ZeroFrame.cmd("fileGet", {inner_path: cache_filename, required: true}, function (chat) {
                    var pgm = service + '.get_and_load_chat_file fileGet callback 2: ';
                    var i, page_updated, timestamp, j, k, message, local_msg_seq, message_with_envelope, contact,
                        file_auth_address, file_user_seq, z_filename, folder, renamed_chat_file, old_timestamps,
                        new_timestamps, deleted_timestamps, old_z_filename, old_cache_filename, old_cache_status,
                        image, byteAmount, chat_bytes, chat_length, error, auth_address, index, break_point,
                        reactions_index, reactions_info, file_hub ;
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
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
                    }
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
                        if ((file_auth_address == my_auth_address) && (file_user_seq = '' + my_user_seq)) {
                            // size in content.json is invalid. publish!
                            debug('public_chat', pgm + 'size in content.json is invalid. publish')
                            zeronet_site_publish();
                        }
                        else {
                            // file must be old/changed. trigger a new file download
                            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_delete', pgm + cache_filename + ' optionalFileDelete') ;
                            ZeroFrame.cmd("optionalFileDelete", {inner_path: cache_filename}, function () {
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
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
                    if (!user_setup.public_chat && !read_timestamp) {
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
                    debug('public_chat', pgm + 'file_auth_address = ' + file_auth_address + ', file_user_seq = ' + file_user_seq);
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
                            old_cache_filename = 'merged-MoneyNetwork/' + contact.hub + '/data/users/' + contact.auth_address + '/' + old_z_filename ;
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
                        add_message(contact, message_with_envelope);
                        cache_status.timestamps.splice(i,1) ;
                        page_updated = 'updated';
                    } // for i
                    // callback to chatCtrl, update UI and maybe read more optional files with public chat messages
                    cb2(page_updated);

                }); // fileGet callback 2

            }) ; // get_user_seq callback 1

        } // get_and_load_chat_file


        // admin only: delete files for inactive users
        var days_before_cleanup_users = 30;
        function get_no_days_before_cleanup () {
            return days_before_cleanup_users ;
        }


        // administrator helpers. cleanup old inactive users. delete test users etc
        var admin_auth_address = ['16R2WrLv3rRrxa8Sdp4L5a1fi7LxADHFaH', '18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ', '1CCiJ97XHgVeJrkbnzLgfXvYRr8QEWxnWF'] ;
        function is_admin () {
            var pgm = service + '.is_admin: ' ;
            if (user_setup.guest) return false ;
            var admin =  (admin_auth_address.indexOf(ZeroFrame.site_info.auth_address) != -1) ;
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
            var info, query, debug_seq ;
            info = '. Skipping cleanup_inactive_users check';
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
            query =
                "select" +
                "  keyvalue.value as timestamp," +
                "  json.json_id," +
                "  json.directory," +
                "  files.filename," +
                "  files.size " +
                "from keyvalue, json, " +
                "  (select filename, sha512, size,  'N' as optional, json_id from files" +
                "     union all" +
                "   select filename, sha512, size,  'Y' as optional, json_id from files_optional) as files " +
                "where keyvalue.key = 'modified' " +
                "and keyvalue.value <  strftime('%s','now')-60*60*24*" + days_before_cleanup_users + " " +
                "and json.json_id = keyvalue.json_id " +
                "and files.json_id = keyvalue.json_id " +
                "order by keyvalue.value, keyvalue.json_id";
            debug('select', pgm + 'query 16 (MS OK) = ' + query);
            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 16') ;
            ZeroFrame.cmd("dbQuery", [query], function (res) {
                var pgm = service + '.cleanup_inactive_users dbQuery callback: ';
                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
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
                        var filename = 'merged-MoneyNetwork/' + directory + '/content.json';
                        var debug_seq ;
                        // console.log(pgm + 'sign and publish. filename = ' + filename);
                        debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_site_publish', pgm + filename + ' sitePublish') ;
                        ZeroFrame.cmd("sitePublish", {privatekey: privatekey, inner_path: filename}, function (res) {
                            var pgm = service + '.cleanup_inactive_users sitePublish callback: ', error;
                            MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
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
                        filename = "merged-MoneyNetwork/" + res[i].directory + "/" + res[i].filename;
                        if (res[i].optional == 'N') {
                            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_delete', pgm + filename + ' fileDelete') ;
                            ZeroFrame.cmd("fileDelete", filename, function (res) {
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                            });
                        }
                        else {
                            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_delete', pgm + filename + ' optionalFileDelete') ;
                            ZeroFrame.cmd("optionalFileDelete", filename, function (res) {
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                            });
                        }
                    } // for i (res)
                    sign_and_publish(last_directory);

                }); // confirm_admin_task

            }); // dbQuery

        } // cleanup_inactive_users

        var user_id = 0 ;
        var my_unique_id ;
        function client_login(password, create_new_account, guest, keysize) {
            var login, passwords, password_sha256, i ;
            // login/register with a empty password?
            // See "Use password to symmetric encrypt your private data?" checkbox in Auth page
            login = JSON.parse(MoneyNetworkHelper.getItem('login')) ;
            if (!login && (password == '')) {
                passwords = MoneyNetworkHelper.getItem('passwords') ;
                if (!passwords) register = true ;
                else {
                    passwords = JSON.parse(passwords) ;
                    password_sha256 = MoneyNetworkHelper.sha256(password) ;
                    create_new_account = true ;
                    for (i=0 ; i<passwords.length ; i++) if (passwords[i] == password_sha256) create_new_account = false ;
                }
                guest = false ;
                keysize = 256 ;
                console.log(service + ': Log in disabled. ' + (create_new_account ? 'Register' : 'Login') + ' with empty password') ;
            }

            // login or register. update sessionStorage and localStorage
            if (!create_new_account) { guest = false ; keysize = 0 }
            user_id = MoneyNetworkHelper.client_login(password, create_new_account, keysize);
            if (user_id) {
                if (create_new_account && guest) MoneyNetworkHelper.setItem('guestid', user_id);
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
            }
            return user_id ;
        } // client_login
        function get_user_id () { return user_id }

        // login_setting_changed: true: auth page. "login" changed. no need for notifications and redirect
        function client_logout(login_setting_changed) {
            // notification
            var key, a_path, z_path ;
            if (!login_setting_changed) ZeroFrame.cmd("wrapperNotification", ['done', 'Log out OK', 3000]);
            // clear sessionStorage
            MoneyNetworkHelper.client_logout();
            // clear all JS work data in MoneyNetworkService
            user_info.splice(0, user_info.length);
            for (key in ls_reactions) delete ls_reactions[key] ;
            clear_contacts() ;
            clear_messages() ;
            watch_receiver_sha256.splice(0, watch_receiver_sha256.length);
            for (key in ignore_zeronet_msg_id) delete ignore_zeronet_msg_id[key] ;
            avatar.src = "public/images/avatar1.png" ;
            avatar.loaded = false;
            for (key in my_files_optional) delete my_files_optional[key] ;
            for (key in z_cache) delete z_cache[key] ;
            user_id = 0 ;
            my_unique_id = null ;
            user_contents_max_size = null ;
            admin_key = null ;
            for (key in user_setup) delete user_setup[key] ;
            for (key in chat_page_context) delete chat_page_context[key] ;
            chat_page_context.no_processes = 0 ;
            chat_page_context.end_of_page = true ;
            chat_page_context.failures = [] ;
            clear_files_optional_cache() ;
            for (key in watch_like_msg_id) delete watch_like_msg_id[key] ;
            if (login_setting_changed) return ;
            // redirect
            a_path = '/auth' ;
            z_path = "?path=" + a_path ;
            $location.path(a_path);
            $location.replace();
            ZeroFrame.cmd("wrapperReplaceState", [{"scrollY": 100}, "Log in", z_path]) ;
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


        // get server info. Used in auth page. warning when using cryptMessage on a proxy server
        var server_info = {} ;
        function load_server_info() {
            var pgm = service + '.load_server_info: ' ;
            var debug_seq ;
            // console.log(pgm);
            if (Object.keys(server_info).length) return ; // already loaded
            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_server_info', pgm + 'serverInfo') ;
            ZeroFrame.cmd("serverInfo", {}, function (new_server_info) {
                var pgm = service + '.load_server_info serverInfo callback: ';
                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                // console.log(pgm + 'server_info = ' + JSON.stringify(new_server_info)) ;
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
        function i_am_online () {
            var pgm, info, user_path;
            if (user_setup.not_online) pgm = service + '.i_am_not_online: ';
            else pgm = service + '.i_am_online: ';
            info = '. Skipping status.json update';
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

            // get user hub
            get_my_user_hub(function (hub) {
                var pgm = service + '.i_am_online get_my_user_hub callback 1: ';

                user_path = "merged-MoneyNetwork/" + hub + "/data/users/" + ZeroFrame.site_info.auth_address;

                // some information nice to have when debugging
                console.log(
                    pgm + 'My cert_user_id is ' + ZeroFrame.site_info.cert_user_id +
                    ', my auth address is ' + ZeroFrame.site_info.auth_address +
                    ', my unique id ' + get_my_unique_id() +
                    ' and my user data hub is ' + hub) ;
                debug('site_info', pgm + 'site_info = ' + JSON.stringify(ZeroFrame.site_info));

                get_data_json(function (data, empty) {
                    var pgm = service + '.i_am_online get_data_json callback 2: ';
                    var my_user_seq, data_user_seqs, i, pubkey, pubkey2, ls, compare, key, count, in_both,
                        check_pubkey2_cb, debug_seq ;
                    if (detected_client_log_out(pgm)) return ;
                    pubkey = MoneyNetworkHelper.getItem('pubkey') ;
                    pubkey2 = MoneyNetworkHelper.getItem('pubkey2') ;
                    // console.log(pgm + 'data = ' + JSON.stringify(data));
                    if (empty) {
                        if (is_user_info_empty()) console.log(pgm + 'New empty user account. No data.json file' + info) ;
                        else {
                            // non empty user account. Must be changed ZeroNet certificate.
                            // create missing data.json file. will also add a status.json file with a last online timestamp
                            console.log(pgm + 'Changed ZeroNet certificate. Creating data.json file') ;
                            z_update_1_data_json(pgm) ;
                        }
                        return ;
                    }
                    if (!data.users || (data.users.length == 0)) {
                        // issue #108 : new user - invalid content in data.json (=content.json)
                        console.log(pgm + 'System error. No users in data.json. Updating data.json file. data = ' + JSON.stringify(data)) ;
                        debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_delete', pgm + user_path + '/' + 'data.json fileDelete') ;
                        ZeroFrame.cmd("fileDelete", user_path + '/' + 'data.json', function () {
                            MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                        }) ;
                        delete z_cache.data_json ;
                        z_update_1_data_json(pgm) ;
                        return ;
                    }
                    my_user_seq = null ;
                    data_user_seqs = [] ;
                    for (i=0 ; i<data.users.length ; i++) {
                        data_user_seqs.push(data.users[i].user_seq) ;
                        if (data.users[i].pubkey == pubkey) {
                            my_user_seq = data.users[i].user_seq ;
                            // just a check. is pubkey2 in data.json = pubkey2 in localStorage. user can have changed ZeroNet cert
                            // pubkey2 in localStorage is updated after login. See MoneyNetworkHelper.client_login
                            // pubkey2 in data.json is updated in z_update_1_data_json
                            // see above: Changed ZeroNet certificate. Creating data.json file
                            if (pubkey2 != data.users[i].pubkey2) {
                                console.log(pgm + 'warning. user must have switched ZeroNet certificate. ' +
                                    'pubkey2 from localStorage is ' + pubkey2 +
                                    ', pubkey2 in data.json file is ' + data.users[i].pubkey2) ;
                            }
                        }
                    }
                    // console.log(pgm + 'user_seq = ' + user_seq) ;
                    if (!my_user_seq) {
                        console.log(pgm + 'User was not found in data.json. Updating data.json file') ;
                        z_update_1_data_json(pgm) ;
                        return ;
                    }
                    console.log(pgm + 'my_user_seq = ' + my_user_seq + ', user_id = ' + user_id) ;
                    //my_user_seq = 1

                    // check that pubkey2 values are correct. generated from ZeroNet cert and user_id
                    compare = {} ;
                    for (i=0 ; i<data.users.length ; i++) {
                        compare[data.users[i].pubkey] = { z_pubkey2: data.users[i].pubkey2, z_user_seq: data.users[i].user_seq }
                    }
                    ls = MoneyNetworkHelper.ls_get() ;
                    for (key in ls) {
                        if (!key.match(/^[0-9]+_pubkey$/)) continue ;
                        pubkey = MoneyNetworkHelper.decompress1(ls[key].substr(1)) ;
                        pubkey2 = MoneyNetworkHelper.decompress1(ls[key + '2'].substr(1)) ;
                        if (!compare[pubkey]) compare[pubkey] = {} ;
                        compare[pubkey].l_pubkey2 = pubkey2 ;
                        compare[pubkey].l_userid = parseInt(key.split('_')[0]) ;
                    }
                    // console.log(pgm + 'compare = ' + JSON.stringify(compare)) ;
                    count = { in_l: 0, in_z: 0, in_both: 0} ;
                    in_both = [] ;
                    for (pubkey in compare) {
                        if (compare[pubkey].l_pubkey2 && compare[pubkey].z_pubkey2) {
                            count.in_both++ ;
                            in_both.push(compare[pubkey]) ;
                        }
                        else if (compare[pubkey].l_pubkey2) count.in_l++ ;
                        else count.in_z++ ;
                    }
                    // console.log(pgm + 'count = ' + JSON.stringify(count)) ;
                    // check pubkey2. loop for each row in in_both match between localStorage user and ZeroNet user in data.json file
                    // pubkey2 check takes some time. done after publish. see zeronet_site_publish call
                    check_pubkey2_cb = function () {
                        var rec, debug_seq ;
                        if (!in_both.length) return ;
                        rec = in_both.pop() ;
                        debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_crypt_message', pgm + ' userPublickey') ;
                        ZeroFrame.cmd("userPublickey", [rec.l_userid], function (pubkey2) {
                            MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                            if ((pubkey2 == rec.l_pubkey2) && (pubkey2 == rec.z_pubkey2)) {
                                // console.log(pgm + 'pubkey2 is OK. rec = ' + JSON.stringify(rec));
                                check_pubkey2_cb() ;
                                return ;
                            }
                            rec.control = pubkey2 ;
                            console.log(pgm + 'Error. pubkey2 is invalid. rec = ' + JSON.stringify(rec)) ;
                            check_pubkey2_cb() ;
                        }); // userPublickey
                    };

                    // delete any old users in status.json and publish
                    get_status_json(function (status) {
                        var pgm = service + '.i_am_online get_status_json callback 3: ';
                        var my_user_seq_found, status_updated, error ;
                        if (detected_client_log_out(pgm)) return ;
                        // console.log(pgm + 'data = ' + JSON.stringify(data));
                        // remove deleted users from status.json
                        my_user_seq_found = false ;
                        status_updated = false ;

                        if (!status.hub) {
                            status.hub = ZeroFrame.site_info.address ;
                            status_updated = true ;
                        }

                        for (i=status.status.length-1 ; i >= 0 ; i--) {
                            if (status.status[i].user_seq == my_user_seq) my_user_seq_found = true ;
                            else if (data_user_seqs.indexOf(status.status[i].user_seq) == -1) {
                                status.status.splice(i,1);
                                status_updated = true ;
                            }
                        }
                        if ((user_setup.not_online) && my_user_seq_found && !status_updated) {
                            // Account setup - user has selected not to update online timestamp
                            check_pubkey2_cb() ;
                            return ;
                        }
                        // validate status.json before write
                        error = MoneyNetworkHelper.validate_json (pgm, status, 'status.json', 'Invalid json file') ;
                        if (error) {
                            error = 'Cannot write invalid status.json file: ' + error;
                            console.log(pgm + error);
                            console.log(pgm + 'status = ' + JSON.stringify(status));
                            ZeroFrame.cmd("wrapperNotification", ["error", error]);
                            return ;
                        }
                        // write status.json
                        write_status_json(function (res) {
                            var pgm = service + '.i_am_online write_status_json callback 4: ' ;
                            // console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                            if (detected_client_log_out(pgm)) return ;
                            if (res === "ok") {
                                // update timestamp in status.json and publish
                                // console.log(pgm + 'calling zeronet_site_publish to update timestamp. user_seq = ' + user_seq) ;
                                zeronet_site_publish(check_pubkey2_cb) ;
                            }
                            else {
                                ZeroFrame.cmd("wrapperNotification", ["error", "Failed to post: " + res.error, 5000]);
                                console.log(pgm + 'Error. Failed to post: ' + res.error) ;
                            }

                        }); // write_status_json callback 4

                    }); // get_status_json callback 3

                }); // get_data_json callback 2

            }); // get_my_user_hub callback 1


        } // i_am_online


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
            return ;
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
            var pgm = service + '.contact_mute_add: '
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

        // chat message order by.
        function chat_order_by (message) {
            var pgm = service + '.chat_order_by: ';
            var sort1, sort2, short_date, unix_timestamp, debug_msg, padding ;
            // 2. sort condition - always Last message unix timestamp
            sort2 = message.message.sent_at || message.message.created_at ;
            short_date  = date(sort2*1000, 'short') ;
            if (short_date == 'Invalid Date') {
                sort2 = 0 ;
                short_date  = date(sort2*1000, 'short')
            }
            // 1. sort condition - Last message, ZeroNet disk usage or Browser disk usage
            sort1 = 0 ;
            unix_timestamp = false ;
            // console.log(pgm + 'chat_sort = ' + self.chat_sort);
            if (user_setup.chat_sort== 'Last message') {
                sort1 = sort2 ;
                unix_timestamp = true ;
            }
            if (user_setup.chat_sort== 'ZeroNet disk usage') {
                if (message.message.zeronet_msg_size) sort1 = message.message.zeronet_msg_size ;
            }
            if (user_setup.chat_sort== 'Browser disk usage') {
                if (message.message.ls_msg_size) sort1 = message.message.ls_msg_size ;
            }
            debug_msg = pgm + user_setup.chat_sort + ' = ' + JSON.stringify(sort1) ;
            debug_msg += ' (' + typeof sort1 + ')' ;
            if (unix_timestamp) debug_msg += ', unix timestamp = ' + short_date ;
            debug('chat_order_by', debug_msg) ;
            if (unix_timestamp) return sort1 ; // simple unix timestamp sort
            // sort by 1. size and 2. unix timestamp
            padding = '              ' ;
            return (padding + sort1).slice(-13) + (padding + sort2).slice(-13) ;
        } // chat_order_by

        // user setup: avatar, alias, contact sort, contact filters, chat sort, spam filters
        var user_setup = {} ;
        function load_user_setup (keysize) {
            var new_user_setup, key, guest_id, guest, alias ;
            new_user_setup = JSON.parse(MoneyNetworkHelper.getItem('setup')) ;
            for (key in user_setup) delete user_setup[key] ;
            for (key in new_user_setup) user_setup[key] = new_user_setup[key] ;
            // add missing defaults
            guest_id = MoneyNetworkHelper.getItem('guestid');
            guest = (guest_id == '' + user_id) ;
            if (guest) user_setup.guest = guest ;
            if (!user_setup.contact_filters) user_setup.contact_filters = {
                all: 'green',
                new: 'green',
                unverified: 'green',
                verified: 'green',
                ignore: 'green'
            } ;
            if (!user_setup.contact_filters.hasOwnProperty('guest')) {
                user_setup.contact_filters.guest = 'green' ;
            }
            if (!user_setup.contact_sort) user_setup.contact_sort = contact_sort_options[0] ;
            if (user_setup.contact_sort == 'Last updated') user_setup.contact_sort = 'Last online' ;
            if (!user_setup.chat_sort) user_setup.chat_sort = chat_sort_options[0] ;
            if (!user_setup.hasOwnProperty('block_guests')) user_setup.block_guests = false ; // !guest ; todo:
            if (!user_setup.hasOwnProperty('block_ignored')) user_setup.block_ignored = false ;
            if (!user_setup.hasOwnProperty('public_chat')) user_setup.public_chat = true; // guest ; todo:
            if (!user_setup.hasOwnProperty('two_panel_chat')) user_setup.two_panel_chat = true ;
            if (!user_setup.alias) user_setup.alias = 'Me';
            if (!user_setup.encryption) user_setup.encryption = keysize == 256 ? '2' : '1' ;
        }
        function save_user_setup () {
            var i ;
            if (user_setup.reactions) {
                for (i=0 ; i<user_setup.length ; i++) {
                    delete user_setup[i].src ;
                    delete user_setup[i]["$$hashKey"] ;
                }
            }
            MoneyNetworkHelper.setItem('setup', JSON.stringify(user_setup));
            MoneyNetworkHelper.ls_save();
        }
        function get_user_setup () {
            return user_setup ;
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


        // output debug info in log. For key, see user page and setup.debug hash
        // keys: simple expressions are supported. For example inbox && unencrypted
        function debug (keys, text) {
            MoneyNetworkHelper.debug(keys, text) ;
        } // debug

        // notification. little red number in menu and (x) in title
        var chat_notifications = 0 ;
        function get_chat_notifications () {
            if (!user_id || (chat_notifications == 0)) return null ;
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
        var emoji_folders = ['https://twemoji.maxcdn.com/2/72x72', 'emoji/twitter', 'emoji/apple', 'emoji/google',
            'emoji/facebook', 'emoji/messenger', 'emoji/one', 'emoji/samsung', 'emoji/windows'] ;
        function get_emoji_folders () {
            return emoji_folders ;
        }

        // fuld emoji list - from content.files_optional
        var emojis_full_list = MoneyNetworkHelper.get_emojis() ;

        // initialize short emoji list - only for current emoji folder selection
        // call after client_login and when changing emoji folder in Account page
        var emojis_short_list = {} ;
        function init_emojis_short_list () {
            var pgm = service + '.init_emojis_short_list: ' ;
            var src, emoji_folder, lng, filename, hexcodes, hexcodes_a, i, hexcode, node, max_lng ;
            for (src in emojis_short_list) delete emojis_short_list[src] ;
            if (!user_setup.emoji_folder || ([emoji_folders[0], emoji_folders[1]].indexOf(user_setup.emoji_folder) != -1)) emoji_folder = 'emoji/twitter' ;
            else emoji_folder = user_setup.emoji_folder ;
            // console.log(pgm + 'emojis_full_list = ' + JSON.stringify(emojis_full_list)) ;
            // console.log(pgm + 'emoji_folder = ' + emoji_folder) ;
            lng = emoji_folder.length ;
            max_lng = 0 ;
            for (src in emojis_full_list) {
                if (src.substr(0,lng) != emoji_folder) continue ;
                filename = src.split('/').pop().split('.')[0] ;
                // remove leading 0 from hexcodes. for example 00a9 (copyright emoji)
                hexcodes = filename ;
                hexcodes_a = hexcodes.split('_') ;
                if (hexcodes_a.length > max_lng) max_lng = hexcodes_a.length ;
                for (i=0 ; i<hexcodes_a.length ; i++) {
                    hexcode = hexcodes_a[i] ;
                    while (hexcode.substr(0,1) == '0') hexcode = hexcode.substr(1) ;
                    hexcodes_a[i] = hexcode ;
                }
                hexcodes = hexcodes_a.join('_') ;
                // symbol scan from end to start. nested emojis objects until first symbol with src
                node = emojis_short_list ;
                for (i=hexcodes_a.length-1 ; i >= 0 ; i--) {
                    hexcode = hexcodes_a[i] ;
                    if (!node[hexcode]) node[hexcode] = {} ;
                    node = node[hexcode] ;
                    if (i == 0) node.src = filename ;
                } // for i
            } // for key
            debug('emoji', pgm + 'max_lng = ' + max_lng) ;
            debug('emoji', pgm + 'emojis_short_list = ' + JSON.stringify(emojis_short_list)) ;

            // apply current emoji folder to reactions
            if (!emoji_folders) console.log(pgm + 'issue #134 emoji_folders is undefined. emoji_folders = ' + JSON.stringify(emoji_folders));
            var emoji_folder = user_setup.emoji_folder || emoji_folders[0] ; // current emoji folder
            if (emoji_folder[emoji_folder.length-1] != '/') emoji_folder += '/' ;
            for (i=0 ; i<standard_reactions.length ; i++) {
                standard_reactions[i].src = emoji_folder + standard_reactions[i].unicode + '.png' ;
            }
            // console.log(pgm + 'standard_reactions = ' + JSON.stringify(standard_reactions));
            if (user_setup.reactions) {
                for (i=0 ; i<user_setup.reactions.length ; i++) {
                    user_setup.reactions[i].src = emoji_folder + user_setup.reactions[i].unicode + '.png' ;
                }
                // console.log(pgm + 'user_reactions = ' + JSON.stringify(user_setup.reactions));
            }
        } // init_emojis_short_list

        // helper. string to unicode symbols
        // https://mathiasbynens.be/notes/javascript-unicode
        var punycode = window.punycode ; // exported from 65-markdown-it.js

        // to/from symbol and unicode hex string
        function symbol_to_unicode(str) {
            var symbols, symbols_hex, i ;
            symbols = punycode.ucs2.decode(str) ;
            symbols_hex = [] ;
            for (i=0 ; i<symbols.length ; i++) symbols_hex.push(symbols[i].toString(16)) ;
            return symbols_hex.join('_');
        } // symbol_to_unicode
        function unicode_to_symbol (unicode) {
            var symbols_hex, symbols, i ;
            symbols_hex = unicode.split('_') ;
            symbols = [] ;
            for (i=0 ; i<symbols_hex.length ; i++) symbols.push(parseInt(symbols_hex[i], 16)) ;
            return punycode.ucs2.encode(symbols);
        } // unicode_to_symbol

        // chat messages. extra parse. check url for twemojis and not translated unicode symbols
        var emoji_alt_prefix = punycode.ucs2.decode(' alt="') ;
        var emoji_alt_postfix = punycode.ucs2.decode('" ') ;
        function replace_emojis (str) {
            var pgm = service + '.replace_emojis: ' ;
            var new_url, symbols, symbols_hex, i1, i2, best_i1, best_src, node, in_alt, i3, i4, img_str_start,
                img_str_end, img_symbols_start, img_symbols_end, img_symbols, symbols_updated ;

            // 1: check urls created by markdown-it twemoji parse.
            // Only relevant if user as selected other emoji folder than https://twemoji.maxcdn.com/2/72x72
            if (user_setup.emoji_folder && (user_setup.emoji_folder != emoji_folders[0])) {
                str = str.replace(/https:\/\/twemoji\.maxcdn\.com\/2\/72x72\/[0-9a-f]+\.png/gm, function (match) {
                    var pgm = service + '.check_twemojis replace callback: ' ;
                    // console.log(pgm + 'match = ' + match) ;
                    new_url = user_setup.emoji_folder + '/' + match.split('/').pop() ;
                    if (!emojis_full_list.hasOwnProperty(new_url)) {
                        debug('emoji', pgm + 'Unknown emojis ' + match) ;
                        emojis_full_list[new_url] = false ;
                    }
                    if (!emojis_full_list[new_url]) return match ;
                    return new_url ;
                }) ;
            }

            // 2: check any known but not replaced emoji unicodes in string. scan from end to start. see init_emojis_short_list.
            // ignore emoji symbols in alt: (<img class="emoji" draggable="false" alt="😃"src="emoji/twitter/1f603.png">)
            symbols = punycode.ucs2.decode(str) ;
            symbols_hex = [] ;
            for (i2=0 ; i2<symbols.length ; i2++) symbols_hex.push(symbols[i2].toString(16)) ;
            debug('emoji', pgm + 'str.length = ' + str.length + ', symbols.length = ' + symbols.length +
                ', str = ' + str + ', symbols = ' + JSON.stringify(symbols) +
                ', symbols_hex = ' + JSON.stringify(symbols_hex)) ;
            symbols_updated = false ;
            for (i2=symbols_hex.length-1 ; i2 >= 0 ; i2--)  {
                if (!emojis_short_list[symbols_hex[i2]]) continue ;
                // check for unicode combinations
                i1 = i2 ; node = emojis_short_list ; best_i1 = null ; best_src = null ;
                while ((i1 >= 0) && node[symbols_hex[i1]]) {
                    // console.log(pgm + '1: i1 = ' + i1 + ', symbol_hex[' + i1 + '] = ' + symbols_hex[i1]) ;
                    node = node[symbols_hex[i1]] ;
                    // console.log(pgm + '2: i1 = ' + i1 + ', node = ' + JSON.stringify(node)) ;
                    if (node.src) {
                        best_i1 = i1 ;
                        best_src = node.src ;
                    }
                    i1-- ;
                } // while
                // console.log(pgm + '3: i1 = ' + i1 + ', symbol_hex[' + i1 + '] = ' + symbols_hex[i1]) ;
                if (!best_src) {
                    if (symbols_hex[i2] == 'fe0f') {
                        // variant selector but no emoji was found ending with this variant selector.
                        // remove - error in some test cases ...
                        symbols.splice(i2,1) ;
                        symbols_hex.splice(i2,1) ;
                    }
                    continue ;
                }

                // ignore if emoji symbol is inside an alt="<symbol>" attribute
                in_alt = true ;
                // check alt prefix
                i3 = best_i1-1 ;
                i4 = emoji_alt_prefix.length-1 ;
                while ((i3 >= 0) && (i4 >= 0) && (symbols[i3] == emoji_alt_prefix[i4])) { i3-- ; i4-- }
                if (i4 >= 0) in_alt = false ;
                // check alt postfix
                i3 = i2+1 ;
                i4 = 0 ;
                while ((i3 < symbols.length) && (i4 < emoji_alt_postfix.length ) && (symbols[i3] == emoji_alt_postfix[i4])) { i3++ ; i4++ }
                if (i4 < emoji_alt_postfix.length) in_alt = false
                debug('emoji', pgm + 'found emoji symbol ' + best_src + ' at pos ' + best_i1 + '..' + i2 + '. in_alt = ' + in_alt) ;
                if (in_alt) {
                    // keep - already in a <img class="emoji" draggable="false" alt="<symbol>" src="<src>">
                    i2 = best_i1 ;
                    continue ;
                }
                // also ignore if using https://twemoji.maxcdn.com/2/72x72 and emoji is not available online
                if (!user_setup.emoji_folder || (user_setup.emoji_folder == emoji_folders[0])) {
                    if (missing_twemojis.indexOf(best_src) != -1) {
                        // keep unicode character
                        i2 = best_i1 ;
                        continue ;
                    }
                    while (best_src.substr(0,1) == '0') best_src = best_src.substr(1);
                }

                // replace emoji symbol with <img class="emoji" draggable="false" alt="<symbol>" src="<src>">
                img_str_start = '<img class="emoji" draggable="false" alt="' ;
                img_str_end = '" src="' + (user_setup.emoji_folder || emoji_folders[0]) + '/' + best_src + '.png">';
                debug('emoji', pgm + 'img tag = ' + img_str_start + '<emoji>' + img_str_end) ;
                img_symbols_start = punycode.ucs2.decode(img_str_start) ;
                img_symbols_end = punycode.ucs2.decode(img_str_end) ;
                img_symbols = [] ;
                while (img_symbols_start.length) img_symbols.push(img_symbols_start.shift()) ;
                for (i3=best_i1 ; i3 <= i2 ; i3++) img_symbols.push(symbols[i3]) ; // inside alt - emoji unicode(s)
                while (img_symbols_end.length) img_symbols.push(img_symbols_end.shift()) ;
                symbols.splice(best_i1, i2-best_i1+1) ;
                while (img_symbols.length) symbols.splice(best_i1, 0, img_symbols.pop()) ;
                symbols_updated = true ;
                i2 = best_i1 ;
            } // for i
            if (symbols_updated) {
                str = punycode.ucs2.encode(symbols) ;
                debug('emoji', pgm + 'new str = ' + str) ;
            }

            return str ;
        } // replace_emojis

        // get list of emojis to be used in be used in reactions (Account page - edit reactions)
        var reaction_list = [] ;
        var reaction_list_full_support = null ;
        function get_reaction_list (full_emoji_support) {
            var i, code, hex_codes, j, symbols, prefix, postfix ;
            if (reaction_list.length && (reaction_list_full_support == full_emoji_support)) return reaction_list ;
            reaction_list.splice(0,reaction_list.length) ;
            for (i=0 ; i<emoji_names.length ; i++) {
                code = emoji_names[i].code ;
                if (full_emoji_support) {
                    // check if emoji is full supported
                    if (missing_twemojis.indexOf(code) != -1) continue ; // not available at https://twemoji.maxcdn.com
                    for (j=1 ; j<emoji_folders.length ; j++) {
                        if (!emoji_folders[j] + '/' + code + '.png') continue ; // not found in optional files for provider
                    }
                }
                reaction_list.push((i+1) + ': ' + unicode_to_symbol(emoji_names[i].code) + ' ' + emoji_names[i].name + ' (' + emoji_names[i].code + ')') ;
            }
            // console.log('reaction_list = ' + JSON.stringify(reaction_list)) ;
            reaction_list_full_support = full_emoji_support ;
            return reaction_list ;
        } // get_reaction_list

        // moneyNetworkService ready.
        // using ls_bind (interface to ZeroNet API localStorage functions may still be loading)
        MoneyNetworkHelper.ls_bind(function () {
            var pgm = service + '.ls_bind callback: ' ;
            var login, a_path, z_path, redirect_when_ready ;
            login = MoneyNetworkHelper.getItem('login') ;
            if (!login) {
                login = true ;
                MoneyNetworkHelper.setItem('login', JSON.stringify(login)) ;
                MoneyNetworkHelper.ls_save() ;
            }
            else login = JSON.parse(login) ;
            MoneyNetworkHelper.use_login_changed() ;
            if (login) return ;

            // auth log in
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
            get_contacts: get_contacts,
            get_contact_by_unique_id: get_contact_by_unique_id,
            get_contact_by_password_sha256: get_contact_by_password_sha256,
            get_contact_name: get_contact_name,
            get_last_online: get_last_online,
            add_contact: add_contact,
            update_contact_add_password: update_contact_add_password,
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
            contact_mute_add: contact_mute_add,
            contact_mute_remove: contact_mute_remove,
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
            is_old_contact: is_old_contact,
            is_admin: is_admin,
            confirm_admin_task: confirm_admin_task,
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
            get_standard_reactions: get_standard_reactions,
            get_user_reactions: get_user_reactions,
            get_emoji_folders: get_emoji_folders,
            init_emojis_short_list: init_emojis_short_list,
            replace_emojis: replace_emojis,
            get_reaction_list: get_reaction_list,
            load_server_info: load_server_info,
            is_proxy_server: is_proxy_server,
            check_reactions: check_reactions,
            unicode_to_symbol: unicode_to_symbol,
            symbol_to_unicode: symbol_to_unicode
        };

        // end MoneyNetworkService
    }]) ;
