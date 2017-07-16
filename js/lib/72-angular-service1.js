angular.module('MoneyNetwork')

    // MoneyNetworkHubService
    // - get/write wrappers for data.json, status.json and like.json
    // - get user data hub
    // - merge user data hubs operation

    .factory('MoneyNetworkHubService', ['$timeout', function($timeout) {
        var service = 'MoneyNetworkHubService' ;
        console.log(service + ' loaded') ;

        // cache some important informations from zeronet files
        // - user_seq: from users array in data.json file. using "pubkey" as index to users array
        // - user_seqs: from users array in data.json file.
        // - files_optional: from content.json file. loaded at startup and updated after every sign and publish
        //   todo: add option to enable/disable files_optional cache. must be disabled if multiple users are using same zeronet cert at the same time
        var z_cache = {} ;

        function get_z_cache () {
            return z_cache ;
        }

        function detected_client_log_out (pgm) {
            if (z_cache.user_id) return false ;
            console.log(pgm + 'stop. client log out. stopping ' + pgm + ' process') ;
            return true ;
        }

        //// convert data.json file to newest version / structure
        var dbschema_version = 10 ;
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
            if (json.version == 9) {
                // hub (data.json) moved from json to keyvalue
                json.version = 10 ;
            }
            // any updates to data.json file?
            return true ;
        } // zeronet_migrate_data


        // convert status.json to newest version / structure
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

        //function generate_random_password () {
        //    return MoneyNetworkHelper.generate_random_password(200);
        //}



        function get_default_user_hub () {
            var pgm = service + '.get_default_user_hub: ' ;
            var default_user_hub, default_hubs, hub, hubs, i ;
            default_user_hub = '1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh' ;
            console.log(pgm + 'ZeroFrame.site_info.content = ' + JSON.stringify(ZeroFrame.site_info.content));
            default_hubs = ZeroFrame.site_info.content.settings.default_hubs ;
            if (!default_hubs) return default_user_hub ;
            hubs = [] ;
            for (hub in default_hubs) hubs.push(hub) ;
            if (!hubs.length) return default_user_hub ;
            i = Math.floor(Math.random() * hubs.length);
            return hubs[i] ;
        } // get_default_user_hub

        var get_my_user_hub_cbs = [] ; // callbacks waiting for query 17 to finish
        function get_my_user_hub (cb) {
            var pgm = service + '.get_my_hub: ' ;
            if (z_cache.my_user_hub == true) {
                // get_my_user_hub request is already running. please wait
                get_my_user_hub_cbs.push(cb) ;
                return ;
            }
            if (z_cache.my_user_hub) return cb(z_cache.my_user_hub, z_cache.other_user_hub) ;
            z_cache.my_user_hub = true ;

            // get a list of MoneyNetwork User data hubs. title or description matches /user data hub/i. used for new MoneyNetwork users
            ZeroFrame.cmd("mergerSiteList", [true], function (merger_sites) {
                var pgm = service + '.get_my_user_hub mergerSiteList callback 1: ' ;
                var user_data_hubs, hub, query, debug_seq, i ;
                user_data_hubs = [] ;
                if (!merger_sites || merger_sites.error) console.log(pgm + 'mergerSiteList failed. merger_sites = ' + JSON.stringify(merger_sites)) ;
                else for (hub in merger_sites) {
                    if (merger_sites[hub].content.title.match(/user data hub/i) ||
                        merger_sites[hub].content.description.match(/user data hub/i)) user_data_hubs.push(hub);
                }
                console.log(pgm + 'user_data_hubs = ' + JSON.stringify(user_data_hubs));

                // find current user data hub(s)
                // - must have a data.json file
                // - use latest updated content.json as user data hub
                query =
                    "select " +
                    "  substr(json.directory, 1, instr(json.directory,'/')-1) as hub " +
                    "  from keyvalue as modified, json, files " +
                    "  where json.directory in " ;
                for (i=0 ; i<user_data_hubs.length ; i++) {
                    query += (i == 0 ? "('" : ",'") + user_data_hubs[i] + '/data/users/' + ZeroFrame.site_info.auth_address + "'" ;
                }
                query += ") " +
                    "and json.file_name = 'content.json' " +
                    "and modified.json_id = json.json_id " +
                    "and modified.key = 'modified' " +
                    "and files.json_id = json.json_id " +
                    "and files.filename = 'data.json' " +
                    "order by modified.value desc";

                debug('select', pgm + 'query 17 (MS OK) = ' + query);
                debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 17') ;
                ZeroFrame.cmd("dbQuery", [query], function (res) {
                    var pgm = service + '.get_my_user_hub dbQuery callback 2: ' ;
                    var i, merge_job, run_callbacks, user_hub_selected ;
                    // if (detected_client_log_out(pgm)) return ;
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                    run_callbacks = function () {
                        var pgm = service + '.get_my_user_hub.run_callbacks: ' ;
                        console.log(pgm + 'my_user_hub = ' + z_cache.my_user_hub + ', other_user_hub = ' + z_cache.other_user_hub) ;
                        cb(z_cache.my_user_hub, z_cache.other_user_hub) ;
                        while (get_my_user_hub_cbs.length) {
                            cb = get_my_user_hub_cbs.shift() ;
                            cb(z_cache.my_user_hub, z_cache.other_user_hub)
                        }
                    }; // run_callbacks
                    user_hub_selected = function () {
                        // user data hub was selected. find a random other user data hub. For user data hub list
                        var pgm = service + '.get_my_user_hub.user_hub_selected: ' ;
                        var query, debug_seq ;
                        query =
                            "select distinct substr(json.directory, 1, instr(json.directory,'/')-1) as hub " +
                            "from keyvalue as optional, json, files " +
                            "where optional.key = 'optional' " +
                            "and optional.value = '" + Z_CONTENT_OPTIONAL + "' " +
                            "and json.json_id = optional.json_id " +
                            "and files.json_id = json.json_id " +
                            "and files.filename = 'data.json'" ;
                        debug('select', pgm + 'query ?? = ' + query);
                        debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query ??') ;
                        ZeroFrame.cmd("dbQuery", [query], function (res) {
                            var pgm = service + '.get_my_user_hub.user_hub_selected dbQuery callback: ';
                            var i, other_user_data_hubs;
                            MoneyNetworkHelper.debug_z_api_operation_end(debug_seq);
                            z_cache.other_user_hub = z_cache.my_user_hub ;
                            if (res.error) {
                                console.log(pgm + "find other user data hub failed: " + res.error);
                                console.log(pgm + 'query = ' + query);
                                return run_callbacks() ;
                            }
                            other_user_data_hubs = [] ;
                            for (i=0 ; i<res.length ; i++) if (res[i].hub != z_cache.my_user_hub) other_user_data_hubs.push(res[i].hub);
                            if (!other_user_data_hubs.length) return run_callbacks() ;
                            console.log(pgm + 'other_hubs = ' + JSON.stringify(other_user_data_hubs));
                            i = Math.floor(Math.random() * other_user_data_hubs.length);
                            z_cache.other_user_hub = other_user_data_hubs[i] ;
                            return run_callbacks() ;

                        }) ; // dbQuery callback

                    }; // user_hub_selected
                    if (res.error) {
                        console.log(pgm + "user data hub lookup failed: " + res.error);
                        console.log(pgm + 'query = ' + query);
                        z_cache.my_user_hub = get_default_user_hub() ;
                        return user_hub_selected() ;
                    }
                    if (res.length) {
                        // user data hub(s) found
                        z_cache.my_user_hub = res[0].hub ; // return hub for last updated content.json
                        console.log(pgm + 'hub = ' + z_cache.my_user_hub) ;
                        if (res.length > 1) {
                            // user with data on more than one user data hub. merge and delete user data from other user data hubs
                            merge_job = function() {
                                var i, hubs ;
                                hubs = [] ;
                                for (i=1 ; i<res.length ; i++) hubs.push(res[i].hub) ;
                                console.log(pgm + 'user with auth_address ' + ZeroFrame.site_info.auth_address +
                                    ' found on more than one user data hub. other hubs = ' + JSON.stringify(hubs)) ;
                                // user with auth_address 18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ found on more than one user data hub. other hubs = ["1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh"]
                                merge_user_hubs(hubs) ;
                            } ;
                            $timeout(merge_job, 5000) ;
                        }
                        return user_hub_selected() ;
                    }
                    // new user. get user data hub from
                    // 1) list of MoneyNetwork merger sites (mergerSiteList)
                    // 2) default_hubs from site_info.content.sessions.default_hubs
                    if (user_data_hubs.length) {
                        // select random user data hub from mergerSiteList
                        i = Math.floor(Math.random() * user_data_hubs.length);
                        z_cache.my_user_hub = user_data_hubs[i] ;
                    }
                    else z_cache.my_user_hub = get_default_user_hub() ; // from site_info.content.sessions.default_hubs
                    console.log(pgm + 'hub = ' + z_cache.my_user_hub) ;
                    user_hub_selected() ;
                }) ; // dbQuery callback 2

            }) ; // mergerSiteList callback 1

        } // get_my_user_hub

        // merge old user hub data into current user hub and delete old user hub data
        var merge_user_hubs_status = { running: false } ;
        function merge_user_hubs (hubs) {
            var pgm = service + '.merge_user_hubs: ' ;
            var hub ;
            if (!hubs.length) {
                merge_user_hubs_status.running = false ;
                return ;
            }
            merge_user_hubs_status.running = true ;
            hub = hubs.shift() ; // first row in array = current user hub
            merge_user_hub(hub, function(res) {
                var pgm = service + '.merge_user_hubs merge_user_hub callback: ' ;
                console.log(pgm + 'res = ' + JSON.stringify(res)) ;
                merge_user_hubs (hubs) ;
            }) ; // merge_user_hub callback 1
        } // merge_user_hubs

        function merge_user_hub (hub, cb) {
            var pgm = service + '.merge_user_hub: ' ;
            console.log(pgm + 'hub = ' + hub) ;
            get_my_user_hub(function(my_hub) {
                var pgm = service + '.merge_user_hub get_my_user_hub callback 1: ';
                var hub_user_path, my_user_path, inner_path0, debug_seq0 ;
                hub_user_path = 'merged-MoneyNetwork/' + hub + '/data/users/' + ZeroFrame.site_info.auth_address + '/' ;
                my_user_path = 'merged-MoneyNetwork/' + my_hub + '/data/users/' + ZeroFrame.site_info.auth_address + '/' ;
                // read hub content.json
                inner_path0 = hub_user_path + 'content.json' ;
                debug_seq0 = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + inner_path0 + ' fileGet') ;
                ZeroFrame.cmd("fileGet", {inner_path: inner_path0, required: false}, function (hub_content_str) {
                    var pgm = service + '.merge_user_hub fileGet callback 2: ';
                    var hub_content, my_content, hub_data, my_data, hub_status, my_status,  my_like, hub_like,
                        step_2_remove_file_doublets, step_3_get_file_info, step_4_download_files, step_5_get_data_files,
                        step_6_get_status_files, step_7_get_like_files, step_8_debug_output, step_9_merge_user,
                        step_10_move_other_files, step_11_cleanup_hub_user_files, step_12_publish_empty_hub,
                        step_13_write_and_publish_user_data, step_n_done,
                        my_data_updated, my_status_updated, my_like_updated, my_publish, hub_publish, json_raw, debug_seq2 ;
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq0);
                    // console.log(pgm + 'content_str = ' + content_str) ;
                    if (!hub_content_str) {
                        console.log(pgm + 'error. ' + inner_path0 + ' was not found') ;
                        return cb(null) ;
                    }
                    hub_content = JSON.parse(hub_content_str) ;




                    // keep track of pending file updates and publish operations
                    my_data_updated = false ;
                    my_status_updated = false ;
                    my_like_updated = false ;
                    my_publish = false ;
                    hub_publish = false ;

                    // step 1: refresh hub content.json file. content.files_optional may be out of sync with file system.
                    // fileGet operations on not existing optional files will raise strange ZeroNet errors
                    // for example "This site requests permission: Merger:MoneyNetwork"
                    // or dbQuery error "'NoneType' object has no attribute 'execute'"
                    var step_1_update_content_json = function (cb1) {
                        var pgm = service + '.merge_user_hub.step_1_update_content_json: ';
                        var old_hub_content_str, inner_path0, debug_seq0 ;
                        // write, sign and reload hub content.json to ensure correct files_optional content.
                        // todo: modified timestamp is updated and hub content.json will temporary be newest content.json file (=new user hub)
                        console.log(pgm + 'todo: update ' + inner_path0 + '. Optional files can be out of sync.');
                        old_hub_content_str = hub_content_str ;
                        delete hub_content.files_optional ;
                        json_raw = unescape(encodeURIComponent(JSON.stringify(hub_content)));
                        inner_path0 = hub_user_path + 'content.json' ;
                        debug_seq0 = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + inner_path0 + ' fileWrite');
                        ZeroFrame.cmd("fileWrite", [inner_path0, btoa(json_raw)], function (res) {
                            var pgm = service + '.merge_user_hub.step_1_update_content_json fileWrite callback 1: ';
                            var debug_seq1;
                            MoneyNetworkHelper.debug_z_api_operation_end(debug_seq0);
                            if (res != 'ok') {
                                console.log(pgm + 'Error: ' + inner_path0 + ' fileWrite failed. res = ' + JSON.stringify(res)) ;
                                return cb(null) ;
                            }
                            // sign
                            debug_seq1 = MoneyNetworkHelper.debug_z_api_operation_start('z_site_publish', pgm + inner_path0 + ' sign') ;
                            ZeroFrame.cmd("siteSign", {inner_path: inner_path0}, function (res) {
                                var pgm = service + '.merge_user_hub.step_1_update_content_json siteSign callback 2: ';
                                var debug_seq2 ;
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq1);
                                if (res != 'ok') {
                                    console.log(pgm + inner_path0 + ' siteSign failed. error = ' + JSON.stringify(res));
                                    return cb(null);
                                }
                                // reload updated hub content file
                                debug_seq2 = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + inner_path0 + ' fileGet') ;
                                ZeroFrame.cmd("fileGet", {inner_path: inner_path0, required: false}, function (new_hub_content_str) {
                                    var pgm = service + '.merge_user_hub.step_1_update_content_json fileGet callback 3: ';
                                    var debug_seq3 ;
                                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq2);
                                    if (!new_hub_content_str) {
                                        console.log(pgm + inner_path0 + ' fileGet failed.') ;
                                        return cb(null) ;
                                    }
                                    hub_content = JSON.parse(new_hub_content_str) ;
                                    // any files to merge into current user hub?
                                    if (!hub_content.files_optional) hub_content.files_optional = [] ;
                                    if ((Object.keys(hub_content.files).length == 0) &&
                                        (Object.keys(hub_content.files_optional).length == 0)) return cb(null) ;
                                    // restore old hub content while processing hub. merge_user_hub process may fail and old content is the correct content. no publish action!
                                    json_raw = unescape(encodeURIComponent(old_hub_content_str));
                                    debug_seq3 = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + inner_path0 + ' fileWrite');
                                    ZeroFrame.cmd("fileWrite", [inner_path0, btoa(json_raw)], function (res) {
                                        var pgm = service + '.merge_user_hub.step_1_update_content_json fileGet callback 4: ';
                                        MoneyNetworkHelper.debug_z_api_operation_end(debug_seq3);
                                        if (res != 'ok') {
                                            console.log(pgm + inner_path0 + ' fileWrite failed.') ;
                                            return cb(null) ;
                                        }
                                        // continue with next step
                                        cb1() ;

                                    }) ; // fileWrite callback 4

                                }) ; // fileGet callback 3

                            }) ; // siteSign callback 2

                        }) ; // fileWrite callback 1

                    }; // step_1_update_content_json ;

                    // step 1: remove optional files already in current user hub (identical filename and sha512 signature)
                    step_2_remove_file_doublets = function (cb2) {
                        var inner_path0, debug_seq0 ;
                        if (Object.keys(hub_content.files_optional).length == 0) return cb2() ;
                        // read my content.json (current user hub)
                        inner_path0 = my_user_path + 'content.json' ;
                        debug_seq0 = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + inner_path0 + ' fileGet') ;
                        ZeroFrame.cmd("fileGet", {inner_path: inner_path0, required: false}, function (content_str) {
                            var pgm = service + '.merge_user_hub.step_2_remove_file_doublets fileGet callback: ';
                            var remove_files, filename ;
                            MoneyNetworkHelper.debug_z_api_operation_end(debug_seq0);
                            if (!content_str) {
                                console.log(pgm + 'error. ' + inner_path0 + ' was not found') ;
                                return cb(null) ;
                            }
                            my_content = JSON.parse(content_str) ;
                            if (!my_content.files_optional) my_content.files_optional = [] ;
                            if (Object.keys(my_content.files_optional).length == 0) return cb2() ;
                            remove_files = [] ;
                            for (filename in hub_content.files_optional) {
                                if (!my_content.files_optional[filename]) continue ;
                                if (my_content.files_optional[filename].sha512 != my_content.files_optional[filename].sha512) continue ;
                                console.log(pgm + 'optional file ' + filename + ' already in current user hub');
                                remove_files.push(filename) ;
                            } // for
                            while (remove_files.length) {
                                filename = remove_files.shift() ;
                                delete hub_content.files_optional[filename] ;
                            }
                            // continue with next step
                            cb2() ;

                        }) ; // fileGet

                    } ; // step_2_remove_file_doublets

                    // step 2: get optional file info
                    // 1) size=2: deleted optional file
                    // 2) check bad_files list. do not try to download files on bad-files list
                    step_3_get_file_info = function (cb3) {
                        var key, filename ;
                        if (Object.keys(hub_content.files_optional).length == 0) return cb3() ;
                        // find next optional file to check
                        for (key in hub_content.files_optional) {
                            if (hub_content.files_optional[key].file_info) continue ;
                            if (hub_content.files_optional[key].size == 2) continue ; // deleted marked optional file
                            filename = hub_user_path + key ;
                            break ;
                        }
                        if (!filename) return cb3() ; // next step: done with optional file info calls
                        // check file info for optional file
                        ZeroFrame.cmd("optionalFileInfo", [filename], function (file_info) {
                            var pgm = service + '.merge_user_hub.step_3_get_file_info optionalFileInfo callback 2: ';
                            if (filename == 'merged-MoneyNetwork/182Uot1yJ6mZEwQYE5LX1P5f6VPyJ9gUGe/data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ/000b72320e.1499349613092') {
                                console.log(pgm + 'filename = ' + filename + ', file_info = ' + JSON.stringify(file_info)) ;
                            }
                            hub_content.files_optional[key].file_info = file_info || {} ;
                            // continue with next optional file
                            step_3_get_file_info(cb3) ;
                        }) ; // optionalFileInfo
                    } ; // step_3_get_file_info

                    // step 4: download any missing optional files
                    step_4_download_files = function (cb4) {
                        var key, filename, debug_seq0, required, format, timeout, regexp ;
                        if (Object.keys(hub_content.files_optional).length == 0) return cb4() ;
                        regexp = new RegExp(MN_CONTENT_OPTIONAL) ; // internal rule for optional filenames
                        // find next optional file to download
                        for (key in hub_content.files_optional) {
                            if (!key.match(regexp)) {
                                // unknown optional filename pattern. ignore file
                                hub_content.files_optional[key].file_info.is_downloaded = -1 ;
                                continue ;
                            }
                            if (hub_content.files_optional[key].size == 2) continue ; // deleted marked optional file
                            if (!hub_content.files_optional[key].file_info.is_downloaded &&
                                !hub_content.files_optional[key].file_info.peer) continue ; // not downloaded and no peers
                            if (hub_content.files_optional[key].file_info.is_downloaded == -1) continue ; // download failed
                            if (hub_content.files_optional[key].file_str) continue ; // already downloaded
                            filename = hub_user_path + key ;
                            break ;
                        }
                        if (!filename) return cb4() ; // next step: done with optional file downloads

                        // fileGet to not existing optional file: fileGet error This site requests permission: Merger:MoneyNetwork and/or dbQuery 'NoneType' object has no attribute 'execute' error
                        // has been "fixed" in step_1_update_content_json
                        required = true ;
                        format = 'text' ;
                        timeout = 10 ; // 300=30 seconds? 10 = 1 second?
                        debug_seq0 = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + filename + (required ? ' required' : '') + ' fileGet') ;
                        ZeroFrame.cmd("fileGet", [filename, required, format, timeout], function (file_str) {
                            var pgm = service + '.merge_user_hub.step_4_download_files fileGet callback: ';
                            MoneyNetworkHelper.debug_z_api_operation_end(debug_seq0);
                            if (!file_str) hub_content.files_optional[key].file_info.is_downloaded = -1 ; // download failed
                            hub_content.files_optional[key].file_str = file_str ;
                            // continue with next download
                            step_4_download_files(cb4) ;
                        }) ; // fileGet callback
                    }; // step_4_download_files

                    step_5_get_data_files = function (cb5) {
                        get_data_json(function (data) {
                            var inner_path0, debug_seq0, empty_data ;
                            my_data = data ;
                            empty_data = data = {
                                version: dbschema_version,
                                users: [],
                                search: [],
                                msg: []
                            };
                            if (!hub_content.files['data.json']) {
                                hub_data = empty_data ;
                                return cb5() ;
                            }
                            inner_path0 = hub_user_path + 'data.json' ;
                            debug_seq0 = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + inner_path0 + ' fileGet') ;
                            ZeroFrame.cmd("fileGet", {inner_path: inner_path0, required: true}, function (data_str) {
                                var pgm = service + '.merge_user_hub.step_5_get_data_files fileGet callback 2: ';
                                var error ;
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq0) ;
                                if (!data_str) hub_data = empty_data ;
                                else {
                                    hub_data = JSON.parse(data_str) ;
                                    zeronet_migrate_data(hub_data);
                                    error = MoneyNetworkHelper.validate_json (pgm, hub_data, 'data.json', 'Invalid json file') ;
                                    if (error) hub_data = empty_data ;
                                }
                                cb5() ;
                            }) ; // fileGet callback 2
                        }); // get_data_json callback 1
                    }; // step_5_get_data_files

                    step_6_get_status_files = function (cb6) {
                        get_status_json(function (status) {
                            var inner_path0, debug_seq0 ;
                            my_status = status ;
                            if (!hub_content.files['status.json']) {
                                hub_status = {} ;
                                return cb6() ;
                            }
                            inner_path0 = hub_user_path + 'status.json' ;
                            debug_seq0 = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + inner_path0 + ' fileGet') ;
                            ZeroFrame.cmd("fileGet", {inner_path: inner_path0, required: true}, function (status_str) {
                                var pgm = service + '.merge_user_hub.step_6_get_status_files fileGet callback 2: ';
                                var empty_status, error ;
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq0) ;
                                empty_status = status = {version: dbschema_version, status: []};
                                if (!status_str) hub_status = empty_status ;
                                else {
                                    hub_status = JSON.parse(status_str) ;
                                    error = MoneyNetworkHelper.validate_json (pgm, hub_status, 'status.json', 'Invalid json file') ;
                                    if (error) hub_status = empty_status ;

                                }
                                cb6() ;
                            }) ; // fileGet callback 2
                        }); // get_status_json callback 1
                    }; // step_6_get_status_files

                    step_7_get_like_files = function (cb7) {
                        get_like_json(function (like) {
                            var empty_like, inner_path0, debug_seq0 ;
                            empty_like =  {
                                version: dbschema_version,
                                like: []
                            } ;
                            my_like = like ;
                            if (!hub_content.files['like.json']) {
                                hub_like = empty_like ;
                                return cb7() ;
                            }
                            inner_path0 = hub_user_path + 'like.json' ;
                            debug_seq0 = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + inner_path0 + ' fileGet') ;
                            ZeroFrame.cmd("fileGet", {inner_path: inner_path0, required: true}, function (like_str) {
                                var pgm = service + '.merge_user_hub.step_7_get_like_files fileGet callback 2: ';
                                var error ;
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq0) ;
                                if (!like_str) hub_like = empty_like ;
                                else {
                                    hub_like = JSON.parse(like_str) ;
                                    error = MoneyNetworkHelper.validate_json (pgm, hub_like, 'like.json', 'Invalid json file') ;
                                    if (error) hub_like = empty_like ;
                                }
                                cb7() ;
                            }) ; // fileGet callback 2
                        }); // get_like_json callback 1
                    }; // step_7_get_like_files

                    step_8_debug_output = function(cb8) {
                        var pgm = service + '.merge_user_hub.step_8_debug_output: ';
                        return cb8() ;
                        console.log(pgm + 'files_optional = ' + JSON.stringify(hub_content.files_optional)) ;
                        console.log(pgm + 'my_data = ' + JSON.stringify(my_data));
                        console.log(pgm + 'hub_data = ' + JSON.stringify(hub_data));
                        console.log(pgm + 'my_status = ' + JSON.stringify(my_status));
                        console.log(pgm + 'hub_status = ' + JSON.stringify(hub_status));
                        console.log(pgm + 'my_like = ' + JSON.stringify(my_like));
                        console.log(pgm + 'hub_like = ' + JSON.stringify(hub_like));
                    }; // step_8_debug_output

                    // todo: what about max user directory size. below limit before merge. over limit after merge
                    step_9_merge_user = function (cb9) {
                        var pgm = service + '.merge_user_hub.step_9_merge_user: ';
                        var hub_user, my_user, i, my_max_user_seq, my_user_seq, hub_user_seq, found, j, json,
                            move_user_files ;

                        if (!hub_data.users.length) return cb9() ; // done with merging users
                        hub_user = hub_data.users.shift() ;
                        console.log(pgm + 'hub_user = ' + JSON.stringify(hub_user)) ;
                        //hub_user = {
                        //    "user_seq": 1,
                        //    "pubkey": "-----BEGIN PUBLIC KEY-----\nMIIBITANBgkqhkiG9w0BAQEFAAOCAQ4AMIIBCQKCAQBpQDut223gZcYfGTHxqoal\nDFX4PvQY1riWEPVqiO2eXS3E47XJjRUtMSUqzpb011ZxzauTxSXlTL1uunIykTvN\nmsXaNSq/tPIue0zdVSCN4PrJo5FY5P6SYGviZBLzdHZJYqlNk3QPngrBGJl/VBBp\nToPXmN7hog/9rXEGhPyN7GX2AKy3pPFCkXFC9GDlCoEjt0Pq+y5sF/t4iPXyn878\nirWfYbRPisLjnJGqSe23/c6MhP8CTvnbFvpiBcLES7HQk6hqqBBnLe9NLTABbqXK\n6i1LW6+aZRqOX72mMwU+1LTcbQRIW1nG6rtPhaUqiIzeH0g8B743bjmcJagm1foH\nAgMBAAE=\n-----END PUBLIC KEY-----",
                        //    "pubkey2": "A4RQ77ia8qK1b3FW/ERL2HdW33jwCyKqxRwKQLzMw/yu",
                        //    "encryption": "2",
                        //    "avatar": "10.png"
                        //};
                        // data.json users array
                        // check if hub user already is in my users array
                        my_max_user_seq = 0 ;
                        for (i=0 ; i<my_data.users.length ; i++) {
                            if (my_data.users[i].user_seq > my_max_user_seq) my_max_user_seq = my_data.users[i].user_seq ;
                            if (my_user) continue ;
                            if (my_data.users[i].pubkey != hub_user.pubkey) continue ; // JSEncrypt public key
                            if (my_data.users[i].pubkey2 != hub_user.pubkey2) continue ; // cryptMessage (ZeroNet) public key
                            my_user = my_data.users[i] ;
                        } // for i
                        console.log(pgm + 'my_user = ' + JSON.stringify(my_user)) ;
                        //my_user = {
                        //    "user_seq": 5,
                        //    "pubkey": "-----BEGIN PUBLIC KEY-----\nMIIBITANBgkqhkiG9w0BAQEFAAOCAQ4AMIIBCQKCAQBpQDut223gZcYfGTHxqoal\nDFX4PvQY1riWEPVqiO2eXS3E47XJjRUtMSUqzpb011ZxzauTxSXlTL1uunIykTvN\nmsXaNSq/tPIue0zdVSCN4PrJo5FY5P6SYGviZBLzdHZJYqlNk3QPngrBGJl/VBBp\nToPXmN7hog/9rXEGhPyN7GX2AKy3pPFCkXFC9GDlCoEjt0Pq+y5sF/t4iPXyn878\nirWfYbRPisLjnJGqSe23/c6MhP8CTvnbFvpiBcLES7HQk6hqqBBnLe9NLTABbqXK\n6i1LW6+aZRqOX72mMwU+1LTcbQRIW1nG6rtPhaUqiIzeH0g8B743bjmcJagm1foH\nAgMBAAE=\n-----END PUBLIC KEY-----",
                        //    "pubkey2": "A4RQ77ia8qK1b3FW/ERL2HdW33jwCyKqxRwKQLzMw/yu",
                        //    "encryption": "2"
                        //};
                        if (!my_user) {
                            my_user = JSON.parse(JSON.stringify(hub_user)) ;
                            my_user.user_seq = my_max_user_seq + 1 ;
                            my_data.users.push(my_user) ;
                            my_data_updated = true ;
                        }
                        my_user_seq = my_user.user_seq ;
                        hub_user_seq = hub_user.user_seq ;
                        // data.json search array
                        for (i=hub_data.search.length-1 ; i>=0 ; i--) {
                            if (hub_data.search[i].user_seq != hub_user_seq) continue ;
                            found = -1 ;
                            for (j=0 ; j<my_data.search.length ; j++) {
                                if (my_data.search[j].user_seq != my_user_seq) continue ;
                                if (my_data.search[j].tag != hub_data.search[i].tag) continue ;
                                if (my_data.search[j].value != hub_data.search[i].value) continue ;
                                found = j ;
                                break ;
                            } // for j
                            if (found == -1) {
                                json = JSON.parse(JSON.stringify(hub_data.search[i])) ;
                                json.user_seq = my_user_seq ;
                                my_data.search.push(json) ;
                                my_data_updated = true ;
                            }
                            hub_data.search.splice(i,1);
                        } // for i
                        // data.json msg array
                        for (i=hub_data.msg.length-1 ; i>=0 ; i--) {
                            if (hub_data.msg[i].user_seq != hub_user_seq) continue ;
                            found = -1 ;
                            for (j=0 ; j<my_data.msg.length ; j++) {
                                if (my_data.msg[j].user_seq != my_user_seq) continue ;
                                if (my_data.msg[j].message_sha256 != hub_data.msg[i].message_sha256) continue ;
                                found = j ;
                                break ;
                            } // for j
                            if (found == -1) {
                                json = JSON.parse(JSON.stringify(hub_data.msg[i])) ;
                                json.user_seq = my_user_seq ;
                                my_data.msg.push(json) ;
                                my_data_updated = true ;
                            }
                            hub_data.msg.splice(i,1);
                        } // for i
                        // status.json
                        for (i=hub_status.status.length-1 ; i>=0 ; i--) {
                            if (hub_status.status[i].user_seq != hub_user_seq) continue ;
                            found = -1 ;
                            for (j=0 ; j<my_status.status.length ; j++) {
                                if (my_status.status[j].user_seq != my_user_seq) continue ;
                                found = j ;
                                break ;
                            } // for j
                            if (found == -1) {
                                json = JSON.parse(JSON.stringify(hub_status.status[i])) ;
                                json.user_seq = my_user_seq ;
                                my_status.status.push(json) ;
                                my_status_updated = true ;
                            }
                            hub_status.status.splice(i,1);
                        } // for i
                        // like.json
                        for (i=hub_like.like.length-1 ; i>=0 ; i--) {
                            if (hub_like.like[i].user_seq != hub_user_seq) continue ;
                            found = -1 ;
                            for (j=0 ; j<my_like.like.length ; j++) {
                                if (my_like.like[j].user_seq != my_user_seq) continue ;
                                if (my_like.like[j].auth != hub_like.like[i].auth) continue ;
                                if (my_like.like[j].emoji != hub_like.like[i].emoji) continue ;
                                if (my_like.like[j].hasOwnProperty('count') != hub_like.like[i].hasOwnProperty('count')) continue ;
                                found = j ;
                                break ;
                            } // for j
                            if (found == -1) {
                                json = JSON.parse(JSON.stringify(hub_like.like[i])) ;
                                json.user_seq = my_user_seq ;
                                my_like.like.push(json) ;
                                my_like_updated = true ;
                            }
                            hub_like.like.splice(i,1);
                        } // for i

                        // check and move optional files ending with::
                        // 1) -<hub_user_seq>-chat.json
                        // 2) -<hub_user_seq>-image.json
                        move_user_files = function() {
                            var pgm = service + '.merge_user_hub.step_9_merge_user.move_user_files: ';
                            var key, re1, re2, match, hub_filename, filename_splitted, my_filename, inner_path0,
                                debug_seq0, file_str, json_raw ;
                            if (Object.keys(hub_content.files_optional).length == 0) return step_9_merge_user(cb9) ; // next user
                            re1 = new RegExp('-' + hub_user_seq + '-chat\.json$');
                            re2 = new RegExp('-' + hub_user_seq + '-image\.json$');
                            for (key in hub_content.files_optional) {
                                if (hub_content.files_optional[key].size == 2) continue ; // empty file
                                if (!hub_content.files_optional[key].file_info.is_downloaded &&
                                    !hub_content.files_optional[key].file_info.peer) continue ; // not downloaded and no peers
                                if (hub_content.files_optional[key].file_info.is_downloaded == -1) continue ; // download failed
                                if (!hub_content.files_optional[key].file_str) continue ; // fileGet failed
                                if (key.match(re1)) match = 1 ;
                                else if (key.match(re2)) match = 2 ;
                                else continue ;
                                hub_filename = key ;
                                break ;
                            }
                            if (!match) return step_9_merge_user(cb9); // continue with next user

                            filename_splitted = hub_filename.split('-');
                            filename_splitted[filename_splitted.length - 2] = my_user_seq;
                            my_filename = filename_splitted.join('-');
                            console.log(pgm + 'match = ' + match + ', my_filename = ' + my_filename + ', hub_filename = ' + hub_filename);
                            // match = 1, my_filename = 1496820690619-1496820256791-5-chat.json, hub_filename = 1496820690619-1496820256791-1-chat.json

                            if (my_content.files_optional[my_filename]) {
                                // file already in current user hub.
                                delete hub_content.files_optional[hub_filename];
                                return move_user_files(); // next user file
                            }

                            // move file.
                            file_str = hub_content.files_optional[hub_filename].file_str;
                            json_raw = unescape(encodeURIComponent(file_str));
                            // write file to current user hub
                            inner_path0 = my_user_path + my_filename;
                            debug_seq0 = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + inner_path0 + ' fileWrite');
                            ZeroFrame.cmd("fileWrite", [inner_path0, btoa(json_raw)], function (res) {
                                var inner_path1, debug_seq1;
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq0);
                                if (res != 'ok') {
                                    // move failed
                                    console.log(pgm + inner_path0 + 'fileWrite failed. res = ' + JSON.stringify(res));
                                    delete hub_content.files_optional[hub_filename];
                                    return move_user_files(); // next user file
                                }
                                // delete file from old user hub
                                inner_path1 = hub_user_path + hub_filename;
                                debug_seq1 = MoneyNetworkHelper.debug_z_api_operation_start('z_file_delete', pgm + inner_path1 + ' fileDelete');
                                ZeroFrame.cmd("fileDelete", inner_path1, function () {
                                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq1);
                                    // move ok
                                    delete hub_content.files_optional[hub_filename];
                                    my_publish = true;
                                    hub_publish = true;
                                    move_user_files(); // next user file
                                }); // fileDelete callback

                            }); // fileWrite callback

                        }; // move_files
                        move_user_files() ;

                    }; // step_9_merge_user

                    // step_10_move_other_files. Etc optional files not ending with -<user_seq>-chat.json or -<user_seq>-image.json
                    step_10_move_other_files = function (cb10) {
                        var pgm = service + '.merge_user_hub.step_10_move_other_files: ';
                        var key, filename, file_str, json_raw, inner_path0, debug_seq0 ;
                        for (key in hub_content.files_optional) {
                            if (hub_content.files_optional[key].size == 2) continue ; // empty file
                            if (!hub_content.files_optional[key].file_info.is_downloaded &&
                                !hub_content.files_optional[key].file_info.peer) continue ; // not downloaded and no peers
                            if (hub_content.files_optional[key].file_info.is_downloaded == -1) continue ; // download failed
                            if (!hub_content.files_optional[key].file_str) continue ; // fileGet failed
                            filename = key ;
                            break ;
                        }
                        if (!filename) return cb10() ; // done with other files

                        if (my_content.files_optional[filename]) {
                            // file already in current user hub.
                            delete hub_content.files_optional[filename];
                            return step_10_move_other_files(cb10); // next file
                        }

                        // move file.
                        console.log(pgm + 'move file ' + filename) ;
                        file_str = hub_content.files_optional[filename].file_str;
                        json_raw = unescape(encodeURIComponent(file_str));
                        // write file to current user hub
                        inner_path0 = my_user_path + filename;
                        debug_seq0 = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + inner_path0 + ' fileWrite');
                        ZeroFrame.cmd("fileWrite", [inner_path0, btoa(json_raw)], function (res) {
                            var inner_path1, debug_seq1;
                            MoneyNetworkHelper.debug_z_api_operation_end(debug_seq0);
                            if (res != 'ok') {
                                // move failed
                                console.log(pgm + inner_path0 + 'fileWrite failed. res = ' + JSON.stringify(res));
                                delete hub_content.files_optional[filename];
                                return step_10_move_other_files(cb10); // next file
                            }
                            // delete file from old user hub
                            inner_path1 = hub_user_path + filename;
                            debug_seq1 = MoneyNetworkHelper.debug_z_api_operation_start('z_file_delete', pgm + inner_path1 + ' fileDelete');
                            ZeroFrame.cmd("fileDelete", inner_path1, function () {
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq1);
                                // move ok
                                delete hub_content.files_optional[filename];
                                my_publish = true;
                                hub_publish = true;
                                step_10_move_other_files(cb10); // next file
                            }); // fileDelete callback

                        }); // fileWrite callback

                    }; // step_10_move_other_files

                    step_11_cleanup_hub_user_files = function(cb11) {
                        var pgm = service + '.merge_user_hub.step_11_cleanup_hub_user_files: ';
                        var inner_path, debug_seq, filename ;
                        if (!hub_publish) return cb11() ; // no hub user files were updated
                        if (!hub_content.files) return cb11() ; // no hub user files
                        if (Object.keys(hub_content.files).length == 0) return cb11() ; // no more hub user files - next step
                        filename = Object.keys(hub_content.files)[0] ;
                        inner_path = hub_user_path + filename ;
                        debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_delete', pgm + inner_path + ' fileDelete');
                        ZeroFrame.cmd("fileDelete", inner_path, function () {
                            MoneyNetworkHelper.debug_z_api_operation_end(debug_seq);
                            delete hub_content.files[filename] ;
                            // next file
                            step_11_cleanup_hub_user_files(cb11) ;
                        }) ; // fileDelete callback
                    }; // step_11_cleanup_hub_user_files

                    step_12_publish_empty_hub = function (cb12) {
                        var pgm = service + '.merge_user_hub.step_12_publish_empty_hub: ';
                        var json_raw, inner_path, debug_seq ;
                        if (!hub_publish) return cb12() ;

                        // write hub content without any optional files to prevent missing optional files error
                        delete hub_content.files_optional ;
                        json_raw = unescape(encodeURIComponent(JSON.stringify(hub_content, null, "\t")));
                        inner_path = hub_user_path + 'content.json' ;
                        debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + inner_path + ' fileWrite') ;
                        ZeroFrame.cmd("fileWrite", [inner_path , btoa(json_raw)], function (res) {
                            var pgm = service + '.merge_user_hub.step_12_publish_empty_hub fileWrite callback 1: ';
                            MoneyNetworkHelper.debug_z_api_operation_end(debug_seq);
                            if (res != 'ok') {
                                console.log(pgm + inner_path + ' fileWrite failed. error = ' + JSON.stringify(res)) ;
                                return ;
                            }
                            // sign and publish
                            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_site_publish', pgm + hub + ' publish') ;
                            ZeroFrame.cmd("sitePublish", {inner_path: inner_path}, function (res) {
                                var pgm = service + '.merge_user_hub.step_12_publish_empty_hub sitePublish callback 2: ';
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq);
                                if (res != 'ok') {
                                    console.log(pgm + inner_path + ' sitePublish failed. error = ' + JSON.stringify(res)) ;
                                    return ;
                                }
                                cb12() ;
                            }) ; // sitePublish
                        }) ; // fileWrite callback 1
                    }; // step_12_publish_empty_hub

                    step_13_write_and_publish_user_data = function (cb13) {
                        var pgm = service + '.merge_user_hub.step_13_write_and_publish_user_data: ';
                        var write_data, write_status, write_like, publish ;
                        
                        write_data = function (cb) {
                            var pgm = service + '.merge_user_hub.step_13_write_and_publish_user_data.write_data: ';
                            var json_raw, inner_path, debug_seq ;
                            if (!my_data_updated) return cb() ;
                            my_publish = true ;
                            json_raw = unescape(encodeURIComponent(JSON.stringify(my_data, null, "\t")));
                            inner_path = hub_user_path + 'data.json' ;
                            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + inner_path + ' fileWrite') ;
                            ZeroFrame.cmd("fileWrite", [inner_path , btoa(json_raw)], function (res) {
                                var pgm = service + '.merge_user_hub.step_12_publish_empty_hub fileWrite callback 1: ';
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq);
                                if (res != 'ok') {
                                    console.log(pgm + inner_path + ' fileWrite failed. error = ' + JSON.stringify(res)) ;
                                    return ;
                                }
                                cb() ;
                            }) ;
                        } ; // write_data

                        write_status = function (cb) {
                            var pgm = service + '.merge_user_hub.step_13_write_and_publish_user_data.write_status: ';
                            var json_raw, inner_path, debug_seq ;
                            if (!my_status_updated) return cb() ;
                            my_publish = true ;
                            json_raw = unescape(encodeURIComponent(JSON.stringify(my_status, null, "\t")));
                            inner_path = hub_user_path + 'status.json' ;
                            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + inner_path + ' fileWrite') ;
                            ZeroFrame.cmd("fileWrite", [inner_path , btoa(json_raw)], function (res) {
                                var pgm = service + '.merge_user_hub.step_12_publish_empty_hub fileWrite callback 1: ';
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq);
                                if (res != 'ok') {
                                    console.log(pgm + inner_path + ' fileWrite failed. error = ' + JSON.stringify(res)) ;
                                    return ;
                                }
                                cb() ;
                            }) ;
                        } ; // write_status

                        write_like = function (cb) {
                            var pgm = service + '.merge_user_hub.step_13_write_and_publish_user_data.write_like: ';
                            var json_raw, inner_path, debug_seq ;
                            if (!my_like_updated) return cb() ;
                            my_publish = true ;
                            json_raw = unescape(encodeURIComponent(JSON.stringify(my_like, null, "\t")));
                            inner_path = hub_user_path + 'like.json' ;
                            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + inner_path + ' fileWrite') ;
                            ZeroFrame.cmd("fileWrite", [inner_path , btoa(json_raw)], function (res) {
                                var pgm = service + '.merge_user_hub.step_12_publish_empty_hub fileWrite callback 1: ';
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq);
                                if (res != 'ok') {
                                    console.log(pgm + inner_path + ' fileWrite failed. error = ' + JSON.stringify(res)) ;
                                    return ;
                                }
                                cb() ;
                            }) ;
                        } ; // write_like

                        publish = function (cb) {
                            var pgm = service + '.merge_user_hub.step_13_write_and_publish_user_data.publish: ';
                            var inner_path0, debug_seq0;
                            if (!my_publish) return cb();

                            inner_path0 = my_user_path + 'content.json';
                            debug_seq0 = MoneyNetworkHelper.debug_z_api_operation_start('z_site_publish', pgm + my_hub + ' publish');
                            ZeroFrame.cmd("sitePublish", {inner_path: inner_path0}, function (res) {
                                var pgm = service + '.merge_user_hub.step_13_write_and_publish_user_data.publish sitePublish callback: ';
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq0);
                                if (res != 'ok') {
                                    console.log(pgm + inner_path0 + ' sitePublish failed. error = ' + JSON.stringify(res));
                                    return;
                                }
                                cb();
                            }); // sitePublish

                        }; // publish

                        write_data(function () {
                            write_status(function () {
                                write_like(function () {
                                    publish(function () {
                                        cb13();
                                    }) ;
                                });
                            })
                        });
                        
                    }; // step_13_write_and_publish_user_data

                    // step n: finish doing tasks
                    step_n_done = function () {
                        var pgm = service + '.merge_user_hub.step_n_done: ';
                        cb(null) ;
                    }; // step_n_done

                    // callback chain step 1, .2, ... n
                    step_1_update_content_json(function() {
                        step_2_remove_file_doublets(function() {
                            step_3_get_file_info(function() {
                                step_4_download_files(function() {
                                    step_5_get_data_files(function() {
                                        step_6_get_status_files(function() {
                                            step_7_get_like_files(function() {
                                                step_8_debug_output(function() {
                                                    step_9_merge_user(function() {
                                                        step_8_debug_output(function() {
                                                            step_10_move_other_files(function(){
                                                                step_11_cleanup_hub_user_files(function() {
                                                                    step_12_publish_empty_hub(function() {
                                                                        step_13_write_and_publish_user_data(function() {
                                                                            step_n_done() ;
                                                                        })
                                                                    })
                                                                })
                                                            })
                                                        })
                                                    })
                                                })
                                            })
                                        })
                                    })
                                })
                            })
                        }) ;

                    }) ;

                }) ; // fileGet callback 2

            }) ; // get_my_hub callback 1

        } // merge_user_hub

        //// wrapper for data.json fileGet and fileWrite (cache data.json file in memory)
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
                    var data, empty;
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
                    while (get_data_json_cbs.length) { cb = get_data_json_cbs.shift() ; cb(z_cache.data_json, empty)}
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
            // todo: debug lost Merger:MoneyNetwork permission
            check_merger_permission(pgm, function() {
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
            });
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
        // https://github.com/HelloZeroNet/ZeroNet/issues/1019
        // https://github.com/HelloZeroNet/ZeroNet/issues/989
        // https://github.com/jaros1/Money-Network/issues/181
        // pattern with {n} is no longer allowed. replace with simple [0-9] pattern and use javascript to validate optional filenames
        // Z_CONTENT_OPTIONAL - used on ZeroNet as pattern for optional files
        // MN_CONTENT_OPTIONAL - used internal in MN (validate filenames)
        var Z_CONTENT_OPTIONAL = '^.*[0-9].*$' ;
        var MN_CONTENT_OPTIONAL = '^([0-9]{13}-[0-9]{13}-[0-9]+-chat.json|[0-9]{13}-image.json|[0-9]{13}-[0-9]+-image.json|[0-9a-f]{10}.[0-9]{13})$' ;
        function get_z_content_optional () {
            return Z_CONTENT_OPTIONAL
        }
        function get_mn_content_optional () {
            return MN_CONTENT_OPTIONAL ;
        }

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
                        var i, index, timestamp, error ;
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
                            else if (!z_cache.user_setup.not_online) status.status[index].timestamp = timestamp; // show as online
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
                            var pgm = service + '.zeronet_site_publish write_status_json callback 4: ';
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
                                console.log(pgm + 'res = ' + JSON.stringify(res) + ' (' + debug_seq + ')');
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
                                if (z_cache.user_setup.debug && z_cache.user_setup.debug.check_sha256_addresses) check_sha256_addresses('sitePublish', false, false) ;

                                // todo: debug problem with lost Merger:MoneyNetwork permission.
                                check_merger_permission(pgm, function () {

                                    // check content.json and add optional file support if missing
                                    debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + user_path + '/content.json fileGet') ;
                                    ZeroFrame.cmd("fileGet", {inner_path: user_path + '/content.json', required: false}, function (content) {
                                        var pgm = service + '.zeronet_site_publish fileGet callback 6: ';
                                        var json_raw, content_updated, filename, file_user_seq, cache_filename, cache_status,
                                            logical_deleted_files, now, max_logical_deleted_files, some_time_ago, debug_seq2 ;
                                        MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                                        if (detected_client_log_out(pgm)) return ;
                                        content_updated = false ;

                                        // optional files support:
                                        // 1) <to timestamp>-<from timestamp>-<user_seq>-chat.json - unix timestamp with milliseconds for first and last chat msg in json file
                                        // 2) <timestamp>-image.json - unix timestamp with miliseconds = sent_at timestamp for a message in data.json file
                                        // 3) <timestamp>-<userseq>-image.json - unix timestamp with miliseconds = sent_at timestamp for a message in data.json file
                                        // Z_CONTENT_OPTIONAL has been changed to a very simple pattern for optional files [0-9]
                                        // use MN_CONTENT_OPTIONAL pattern for full optional filename validation
                                        content = JSON.parse(content) ;
                                        if (content.optional == Z_CONTENT_OPTIONAL) {
                                            // optional file support also in place. save to my_files_optional. used in public chat
                                            save_my_files_optional(content.files_optional || {}) ;
                                        }
                                        else {
                                            content.optional = Z_CONTENT_OPTIONAL ;
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
                                        debug_seq2 = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + user_path + '/content.json fileWrite') ;
                                        ZeroFrame.cmd("fileWrite", [user_path + '/content.json', btoa(json_raw)], function (res) {
                                            var pgm = service + '.zeronet_site_publish fileWrite callback 7: ';
                                            var error ;
                                            MoneyNetworkHelper.debug_z_api_operation_end(debug_seq2) ;
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

                                }) ; // check_merger_permission


                            }); // sitePublish callback 5

                        }); // write_status_json callback 4

                    }); // get_status_json callback 3

                }) ; // get_user_seq callback 2

            }); // get_my_user_path callback 1

        } // zeronet_site_publish

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




        //// get user_seq from z_cache or read from data.json file
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

        // sometimes problem with lost Merger:MoneyNetwork permission
        // maybe a ZeroNet bug.
        // maybe a problem after migrating MoneyNetwork to a merger site.
        // maybe a problem with deleted optional files and content.db out of sync
        // check and ensure Merger:MoneyNetwork before file operations
        // no mergerSiteAdd. assuming lost Merger:MoneyNetwork is the problem
        var MERGER_ERROR = "Please check console.log and UI server log. Error occurs after fileGet for not existing optional files. For example content.json file(s) is out of sync with filesystem. For example after manually deleting optional files from filesystem. Error also occurs after fileGet to a bad-file. Try deleting content.db and restart ZeroNet. Otherwise find and delete invalid or sign content.json file" ;
        function get_merger_error () {
            return MERGER_ERROR + '. merge_user_hubs_status.running = ' + merge_user_hubs_status.running ;
        }
        function request_merger_permission (calling_pgm, cb) {
            console.log(calling_pgm + 'Error: Merger:MoneyNetwork permission was lost. ' + MERGER_ERROR) ;
            ZeroFrame.cmd("wrapperPermissionAdd", "Merger:MoneyNetwork", function (res) {
                // continue anyway
                cb() ;
            }) ; // wrapperPermissionAdd callback
        } // request_merger_permission
        function check_merger_permission (calling_pgm, cb) {
            var pgm = service + '.check_merger_permission: ' ;
            ZeroFrame.cmd("siteInfo", {}, function (site_info) {
                var pgm = service + '.check_merger_permission siteInfo callback 1: ';
                // console.log(pgm , 'site_info = ' + JSON.stringify(site_info)) ;
                if (site_info.settings.permissions.indexOf("Merger:MoneyNetwork") == -1) return request_merger_permission(calling_pgm, cb);
                // Merger:MoneyNetwork OK
                cb() ;
            }) ; // siteInfo callback
        } // check_merger_permission

        z_cache.my_files_optional = {} ;
        function save_my_files_optional (files_optional) {
            var pgm = service + '.save_my_files_optional: ' ;
            // console.log(pgm + 'files_optional = ' + JSON.stringify(files_optional));
            get_user_seq(function(user_seq) {
                var key, key_a, optional_regexp, now ;
                // console.log(pgm + 'user_seq = ' + user_seq) ;
                // ready. update z_cache.files_optional (full list) and my_files_optional (filter with user_seq)
                for (key in z_cache.my_files_optional) delete z_cache.my_files_optional[key] ;
                z_cache.files_optional = files_optional || {} ;
                if (!files_optional) return ;
                optional_regexp = new RegExp(MN_CONTENT_OPTIONAL) ;
                now = new Date().getTime() ;
                for (key in files_optional) {
                    key_a = key.split('-') ;
                    if (!key.match(optional_regexp)) console.log(pgm + 'invalid files_optional key ' + key) ; // invalid optional file name
                    else if (key_a[0] > '' + now) console.log(pgm + 'invalid files_optional key ' + key) ; // timestamp in the future
                    else if (files_optional[key].size <= 2) null ; // debug('public_chat', pgm + 'ignoring empty logical deleted json file ' + key) ;
                    else if (!user_seq || ('' + user_seq == key_a[2])) z_cache.my_files_optional[key] = files_optional[key] ; // ok
                } // for key
                // console.log(pgm + 'user_seq = ' + user_seq + ', my_files_optional = ' + JSON.stringify(my_files_optional)) ;
            }) ; // get_user_seq
        } // save_my_files_optional

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
        function get_files_optional_cache() {
            return files_optional_cache ;
        }
        function clear_files_optional_cache() {
            for (var key in files_optional_cache) delete files_optional_cache[key] ;
        }


        // hash with private reactions
        var ls_reactions = {} ;
        function get_ls_reactions () {
            return ls_reactions ;
        }
        function ls_load_reactions () {
            var new_reactions, key ;
            new_reactions = MoneyNetworkHelper.getItem('reactions') ;
            if (new_reactions) new_reactions = JSON.parse(new_reactions) ;
            else new_reactions = {} ;
            for (key in ls_reactions) delete ls_reactions[key] ;
            for (key in new_reactions) ls_reactions[key] = new_reactions[key] ;
        } // load_reactions
        function ls_save_reactions (z_update_1_data_json) {
            var pgm = service + '.save_reactions: ' ;
            MoneyNetworkHelper.setItem('reactions', JSON.stringify(ls_reactions)) ;
            if (z_update_1_data_json) {
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
        } // ls_save_reactions




        var ls_contacts = [] ; // array with contacts
        function get_ls_contacts () {
            return ls_contacts ;
        }
        var ls_contacts_index = { //
            unique_id: {}, // from unique_id to contract
            password_sha256: {}, // from group password sha256 value to group contact
            cert_user_id: {} // from cert_user_id to array with contacts
        } ;
        var ls_contacts_deleted_sha256 = {} ; // hash with sender_sha256 addresses for deleted contacts (deleted outbox messages)
        function get_ls_contacts_deleted_sha256 () {
            return ls_contacts_deleted_sha256 ;
        }

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
                delete ls_contacts_index.password_sha256[password_sha256] ;
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
            var unique_id, contact, online ;
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




        // output debug info in log. For key, see user page and setup.debug hash
        // keys: simple expressions are supported. For example inbox && unencrypted
        function debug (keys, text) {
            MoneyNetworkHelper.debug(keys, text) ;
        } // debug

        // admin only: delete files for inactive users
        var days_before_cleanup_users = 30;
        function get_no_days_before_cleanup () {
            return days_before_cleanup_users ;
        }


        // administrator helpers. cleanup old inactive users. delete test users etc
        var admin_auth_address = ['16R2WrLv3rRrxa8Sdp4L5a1fi7LxADHFaH', '18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ', '1CCiJ97XHgVeJrkbnzLgfXvYRr8QEWxnWF'] ;
        function is_admin () {
            var pgm = service + '.is_admin: ' ;
            if (z_cache.user_setup.guest) return false ;
            var admin =  (admin_auth_address.indexOf(ZeroFrame.site_info.auth_address) != -1) ;
            // console.log(pgm + 'admin = ' + admin) ;
            return admin ;
        }
        var admin_key ;
        function get_admin_key() {
            return admin_key ;
        }
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
        function clear_admin_key() {
            admin_key = null ;
        }


        function cleanup_inactive_users() {
            var pgm = service + '.cleanup_inactive_users: ';
            var info, query, debug_seq ;
            info = '. Skipping cleanup_inactive_users check';
            // check Zeronet status
            if (!z_cache.user_id) {
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
                var i ;
                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                if (res.error) {
                    ZeroFrame.cmd("wrapperNotification", ["error", "Search for inactive users: " + res.error, 5000]);
                    console.log(pgm + "Search for inactive users failed: " + res.error);
                    console.log(pgm + 'query = ' + query);
                    return;
                }
                if (res.length == 0) return; // no more inactive users to cleanup

                console.log(pgm + 'todo: old user account cleanup is no longer working after adding merger site feature. users are on different sites with different admin private keys');
                console.log(pgm + 'res = ' + JSON.stringify(res));
                return ;

                var json_ids = [] ;
                var bytes = 0 ;
                for (i=0 ; i<res.length ; i++) {
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

        function get_my_unique_id () {
            if (z_cache.my_unique_id) z_cache.my_unique_id ;
            if (!ZeroFrame.site_info) return null ; // ZeroFrame not ready - loading
            var my_auth_address = ZeroFrame.site_info.auth_address ;
            if (!my_auth_address) return null ; // not logged in on ZeroNet
            var my_pubkey = MoneyNetworkHelper.getItem('pubkey');
            z_cache.my_unique_id = CryptoJS.SHA256(my_auth_address + '/'  + my_pubkey).toString();
            return z_cache.my_unique_id ;
        } // get_my_unique_id


        // update timestamp in status.json file and modified in content.json.
        // will allow users to communicate with active contacts and ignoring old and inactive contacts
        // small file(s) for quick distribution in ZeroNet
        // - z_update_1_data_json: callback function injected from calling service
        // - is_user_info_empty: callback function injected from calling service
        function i_am_online (z_update_1_data_json, is_user_info_empty) {
            var pgm, info, user_path;
            if (z_cache.user_setup.not_online) pgm = service + '.i_am_not_online: ';
            else pgm = service + '.i_am_online: ';
            info = '. Skipping status.json update';
            // check Zeronet status
            if (!z_cache.user_id) {
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
                    console.log(pgm + 'my_user_seq = ' + my_user_seq + ', user_id = ' + z_cache.user_id) ;
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

                        if (status.hub) {
                            delete status.hub ;
                            status_updated = true ;
                        }

                        for (i=status.status.length-1 ; i >= 0 ; i--) {
                            if (status.status[i].user_seq == my_user_seq) my_user_seq_found = true ;
                            else if (data_user_seqs.indexOf(status.status[i].user_seq) == -1) {
                                status.status.splice(i,1);
                                status_updated = true ;
                            }
                        }
                        if ((z_cache.user_setup.not_online) && my_user_seq_found && !status_updated) {
                            // Account setup - user has selected not to update online timestamp
                            check_pubkey2_cb() ;
                            return ;
                        }
                        if (!my_user_seq_found) {
                            status.status.push({
                                user_seq: my_user_seq,
                                timestamp: new Date().getTime()
                            });
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



        // var ls_msg_factor = 0.67 ; // factor. from ls_msg_size to "real" size. see formatMsgSize filter. used on chat
        var js_messages_seq = 0 ; // internal seq to rows in js_messages.
        var js_messages = [] ; // array with { :contact => contact, :message => message } - one row for each message
        var js_messages_index = { //
            seq: {}, // // from seq to row in js_message. always present and link between js_message_row and message objects
            sender_sha256: {}, // from sender_sha256 to row in js_messages
            local_msg_seq: {}, // from local_msg_seq in message to row in js_messages
            parent: {}         // from parent ("<sent_at>,<auth4>") to row in js_messages
        } ;
        var js_orphan_messages = {} ; // from parent ("<sent_at>,<auth4>") to an array of orphan comments

        function get_js_messages () {
            return js_messages ;
        }
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

        // validate message child parent context.
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
            var js_messages_row, contact, auth4, unique_id, sender, parent, js_child_messages_row ;
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
        } // add_message_parent_index

        // add message to 1) contact, 2) js_messages and 3) js_messages_index
        // load_contacts:
        // - true: called from ls_load_contacts or load_public_chat
        // - false: do not add message to contact.messages array (already there)
        function add_message(contact, message, load_contacts, get_user_reactions) {
            // read like.json file with public reactions
            get_like_json(function (like, like_index, empty) {
                var pgm = service + '.add_message: ' ;
                var js_messages_row, i, unicode, index, title, reactions_index, reaction_info, unique_id, auth_address,
                    like_index_p, k, parent, js_parent_messages_row ;
                if (!contact && !z_cache.user_info.block_public) contact = get_public_contact(true) ;
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
        
        function message_add_local_msg_seq(js_messages_row, local_msg_seq) {
            var message ;
            message = js_messages_row.message ;
            message.local_msg_seq = local_msg_seq ;
            js_messages_index.local_msg_seq[message.local_msg_seq] = js_messages_row ;
        }

        function message_add_sender_sha256(js_messages_row, sender_sha256) {
            var message ;
            message = js_messages_row.message ;
            message.sender_sha256 = sender_sha256 ;
            js_messages_index.sender_sha256[message.sender_sha256] = js_messages_row ;
        }

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






        // export MoneyNetworkHubService
        return {
            get_user_seq: get_user_seq,
            get_data_json: get_data_json,
            write_data_json: write_data_json,
            get_status_json: get_status_json,
            write_status_json: write_status_json,
            get_like_json: get_like_json,
            write_like_json: write_like_json,
            update_like_index: update_like_index,
            get_my_user_hub: get_my_user_hub,
            get_z_cache: get_z_cache,
            check_merger_permission: check_merger_permission,
            get_ls_reactions: get_ls_reactions,
            ls_load_reactions: ls_load_reactions,
            ls_save_reactions: ls_save_reactions,
            get_ls_contacts: get_ls_contacts,
            get_ls_contacts_deleted_sha256: get_ls_contacts_deleted_sha256,
            clear_contacts: clear_contacts,
            add_contact: add_contact,
            remove_contact: remove_contact,
            get_contact_by_unique_id: get_contact_by_unique_id,
            get_contact_by_password_sha256: get_contact_by_password_sha256,
            get_contacts_by_cert_user_id: get_contacts_by_cert_user_id,
            get_contact_name: get_contact_name,
            get_public_contact: get_public_contact,
            get_public_chat_outbox_msg: get_public_chat_outbox_msg,
            check_sha256_addresses: check_sha256_addresses,
            get_z_content_optional: get_z_content_optional,
            get_mn_content_optional: get_mn_content_optional,
            zeronet_site_publish: zeronet_site_publish,
            write_empty_chat_file: write_empty_chat_file,
            save_my_files_optional: save_my_files_optional,
            get_files_optional_cache: get_files_optional_cache,
            clear_files_optional_cache: clear_files_optional_cache,
            is_admin: is_admin,
            get_admin_key: get_admin_key,
            clear_admin_key: clear_admin_key,
            cleanup_inactive_users: cleanup_inactive_users,
            get_no_days_before_cleanup: get_no_days_before_cleanup,
            get_my_unique_id: get_my_unique_id,
            i_am_online: i_am_online,
            get_js_messages: get_js_messages,
            clear_messages: clear_messages,
            add_message_parent_index:  add_message_parent_index,
            add_message: add_message,
            message_add_local_msg_seq: message_add_local_msg_seq,
            message_add_sender_sha256: message_add_sender_sha256,
            get_message_by_seq: get_message_by_seq,
            get_message_by_sender_sha256: get_message_by_sender_sha256,
            get_message_by_local_msg_seq: get_message_by_local_msg_seq,
            remove_message: remove_message,
            recursive_delete_message: recursive_delete_message,
            get_merger_error: get_merger_error
        };

        // end MoneyNetworkHubService
    }]) ;
