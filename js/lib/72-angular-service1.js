angular.module('MoneyNetwork')

    // MoneyNetworkHubService
    // - get/write wrappers for data.json, status.json and like.json
    // - get user data hub
    // - merge user data hubs operation

    .factory('MoneyNetworkHubService', ['$timeout', function($timeout) {
        var service = 'MoneyNetworkHubService' ;
        console.log(service + ' loaded') ;

        function detected_client_log_out (pgm) {
            if (z_cache.user_id) return false ;
            console.log(pgm + 'stop. client log out. stopping ' + pgm + ' process') ;
            return true ;
        }

        //// convert data.json file to newest version / structure
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
            if (z_cache.my_user_hub) return cb(z_cache.my_user_hub) ;
            z_cache.my_user_hub = true ;

            // get a list of MoneyNetwork User data hubs
            ZeroFrame.cmd("mergerSiteList", [true], function (merger_sites) {
                var pgm = service + '.get_my_hub mergerSiteList callback 1: ' ;
                var user_data_hubs, hub, query, debug_seq, i ;
                user_data_hubs = [] ;
                if (!merger_sites || merger_sites.error) console.log(pgm + 'mergerSiteList failed. merger_sites = ' + JSON.stringify(merger_sites)) ;
                else for (hub in merger_sites) {
                    if (merger_sites[hub].content.title.match(/user data hub/i)) user_data_hubs.push(hub);
                }
                // console.log(pgm + 'user_data_hubs = ' + JSON.stringify(user_data_hubs));
                // user_data_hubs = ["1PgyTnnACGd1XRdpfiDihgKwYRRnzgz2zh","1922ZMkwZdFjKbSAdFR1zA5YBHMsZC51uc"]

                // Use content.modified timestamp as sort condition if multiple user data hub. data.json file must exists.
                query =
                    "select substr(json.directory, 1, instr(json.directory,'/')-1) as hub " +
                    "from json, keyvalue " +
                    "where " ;
                if (user_data_hubs.length) {
                    for (i=0 ; i<user_data_hubs.length ; i++) {
                        hub = user_data_hubs[i] ;
                        if (i == 0) query += "(" ; else query += "or " ;
                        query += "json.directory = '" + hub + "/data/users/" + ZeroFrame.site_info.auth_address + "' "
                    }
                    query += ") " ;
                }
                else query += "(1 = 2) " ;
                query +=
                    "and json.file_name = 'content.json' " +
                    "and keyvalue.json_id = json.json_id " +
                    "and keyvalue.key = 'modified' " +
                    "order by keyvalue.key desc" ;

                debug('select', pgm + 'query 17 (MS OK) = ' + query);
                debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_db_query', pgm + 'query 17') ;
                ZeroFrame.cmd("dbQuery", [query], function (res) {
                    var pgm = service + '.get_my_hub dbQuery callback 2: ' ;
                    var i, merge_job ;
                    // if (detected_client_log_out(pgm)) return ;
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq) ;
                    var execute_pending_callbacks = function () {
                        while (get_my_user_hub_cbs.length) { cb = get_my_user_hub_cbs.shift() ; cb(z_cache.my_user_hub)}
                    };
                    if (res.error) {
                        console.log(pgm + "user data hub lookup failed: " + res.error);
                        console.log(pgm + 'query = ' + query);
                        z_cache.my_user_hub = get_default_user_hub() ;
                        cb(z_cache.my_user_hub) ;
                        return;
                    }
                    if (res.length) {
                        // old user found
                        z_cache.my_user_hub = res[0].hub ; // return hub for last updated content.json
                        console.log(pgm + 'hub = ' + z_cache.my_user_hub) ;
                        cb(z_cache.my_user_hub) ;
                        execute_pending_callbacks() ;
                        if (res.length > 1) {
                            // possible doublet or conflicting user information.
                            // allow data loading for current process to finish before starting merge and delete operation
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
                        return ;
                    }
                    // new user. get user data hub from
                    // 1) list of MoneyNetwork merger sites (mergerSiteList)
                    // 2) default_hubs from site_info.content.sessions.default_hubs
                    if (user_data_hubs.length) {
                        i = Math.floor(Math.random() * user_data_hubs.length);
                        z_cache.my_user_hub = user_data_hubs[i] ;
                    }
                    else z_cache.my_user_hub = get_default_user_hub() ;
                    console.log(pgm + 'hub = ' + z_cache.my_user_hub) ;
                    cb(z_cache.my_user_hub) ;
                    execute_pending_callbacks() ;
                }) ; // dbQuery callback 2

            }) ; // mergerSiteList callback 1

        } // get_my_user_hub

        // merge old user hub data into current user hub and delete old user hub data
        function merge_user_hubs (hubs) {
            var pgm = service + '.merge_user_hubs: ' ;
            var hub ;
            if (!hubs.length) return ;
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
                var hub_user_path, my_user_path, inner_path0, debug_seq0 ;
                hub_user_path = 'merged-MoneyNetwork/' + hub + '/data/users/' + ZeroFrame.site_info.auth_address + '/' ;
                my_user_path = 'merged-MoneyNetwork/' + my_hub + '/data/users/' + ZeroFrame.site_info.auth_address + '/' ;
                // read hub content.json
                inner_path0 = hub_user_path + 'content.json' ;
                debug_seq0 = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + inner_path0 + ' fileGet') ;
                ZeroFrame.cmd("fileGet", {inner_path: inner_path0, required: false}, function (hub_content_str) {
                    var pgm = service + '.merge_user_hub fileGet callback 2: ';
                    var hub_content, my_content, hub_data, my_data, hub_status, my_status,  my_like, hub_like,
                        step_1_remove_file_doublets, step_2_get_file_info, step_3_download_files, step_4_get_data_files,
                        step_5_get_status_files, step_6_get_like_files, step_7_debug_output, step_8_merge_user,
                        step_9_move_other_files, step_10_cleanup_hub_user_files, step_11_publish_empty_hub,
                        step_12_write_and_publish_user_data, step_n_done,
                        my_data_updated, my_status_updated, my_like_updated, my_publish, hub_publish ;
                    MoneyNetworkHelper.debug_z_api_operation_end(debug_seq0);
                    // console.log(pgm + 'content_str = ' + content_str) ;
                    if (!hub_content_str) {
                        console.log(pgm + 'error. ' + inner_path0 + ' was not found') ;
                        return cb(null) ;
                    }
                    hub_content = JSON.parse(hub_content_str) ;
                    if (!hub_content.files_optional) hub_content.files_optional = [] ;

                    // any files to merge into current user hub?
                    if ((Object.keys(hub_content.files).length == 0) &&
                        (Object.keys(hub_content.files_optional).length == 0)) return cb(null) ;
                    // console.log(pgm + 'files = ' + JSON.stringify(hub_content.files)) ;
                    // console.log(pgm + 'files_optional = ' + JSON.stringify(hub_content.files_optional)) ;

                    // keep track of pending file updates and publish operations
                    my_data_updated = false ;
                    my_status_updated = false ;
                    my_like_updated = false ;
                    my_publish = false ;
                    hub_publish = false ;

                    // step 1: remove optional files already in current user hub (identical filename and sha512 signature)
                    step_1_remove_file_doublets = function (cb2) {
                        var inner_path0, debug_seq0 ;
                        if (Object.keys(hub_content.files_optional).length == 0) return cb2() ;
                        // read my content.json (current user hub)
                        inner_path0 = my_user_path + 'content.json' ;
                        debug_seq0 = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + inner_path0 + ' fileGet') ;
                        ZeroFrame.cmd("fileGet", {inner_path: inner_path0, required: false}, function (content_str) {
                            var pgm = service + '.merge_user_hub.step_1_remove_file_doublets fileGet callback: ';
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

                    } ; // step_1_remove_file_doublets

                    // step 2: get optional file info
                    // 1) size=2: deleted optional file
                    // 2) check bad_files list. do not try to download files on bad-files list
                    step_2_get_file_info = function (cb3) {
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
                        // check file info for image json file
                        ZeroFrame.cmd("optionalFileInfo", [filename], function (file_info) {
                            var pgm = service + '.merge_user_hub.step_2_get_file_info optionalFileInfo callback 2: ';
                            hub_content.files_optional[key].file_info = file_info || {} ;
                            // continue with next optional file
                            step_2_get_file_info(cb3) ;
                        }) ; // optionalFileInfo
                    } ; // step_2_get_file_info

                    // step 3: download any missing optional files
                    step_3_download_files = function (cb4) {
                        var key, filename, debug_seq0 ;
                        if (Object.keys(hub_content.files_optional).length == 0) return cb4() ;
                        // find next optional file to download
                        for (key in hub_content.files_optional) {
                            if (hub_content.files_optional[key].size == 2) continue ; // deleted marked optional file
                            if (!hub_content.files_optional[key].file_info.is_downloaded &&
                                !hub_content.files_optional[key].file_info.peer) continue ; // not downloaded and no peers
                            if (hub_content.files_optional[key].file_info.is_downloaded == -1) continue ; // download failed
                            if (hub_content.files_optional[key].file_str) continue ; // already downloaded
                            filename = hub_user_path + key ;
                            break ;
                        }
                        if (!filename) return cb4() ; // next step: done with optional file downloads

                        debug_seq0 = MoneyNetworkHelper.debug_z_api_operation_start('z_file_get', pgm + filename + ' fileGet') ;
                        ZeroFrame.cmd("fileGet", {inner_path: filename, required: true}, function (file_str) {
                            var pgm = service + '.merge_user_hub.step_2_download_files fileGet callback: ';
                            MoneyNetworkHelper.debug_z_api_operation_end(debug_seq0);
                            if (!file_str) hub_content.files_optional[key].file_info.is_downloaded = -1 ; // download failed
                            hub_content.files_optional[key].file_str = file_str ;
                            // continue with next download
                            step_3_download_files(cb4) ;
                        }) ; // fileGet callback
                    }; // step_3_download_files

                    step_4_get_data_files = function (cb5) {
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
                                var pgm = service + '.merge_user_hub.step_4_get_data_files fileGet callback 2: ';
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
                    }; // step_4_get_data_files

                    step_5_get_status_files = function (cb6) {
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
                                var pgm = service + '.merge_user_hub.step_5_get_status_files fileGet callback 2: ';
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
                    }; // step_5_get_status_files

                    step_6_get_like_files = function (cb7) {
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
                                var pgm = service + '.merge_user_hub.step_5_get_like_files fileGet callback 2: ';
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
                    }; // step_6_get_like_files

                    step_7_debug_output = function(cb8) {
                        var pgm = service + '.merge_user_hub.step_7_debug_output: ';
                        return cb8() ;
                        console.log(pgm + 'files_optional = ' + JSON.stringify(hub_content.files_optional)) ;
                        console.log(pgm + 'my_data = ' + JSON.stringify(my_data));
                        console.log(pgm + 'hub_data = ' + JSON.stringify(hub_data));
                        console.log(pgm + 'my_status = ' + JSON.stringify(my_status));
                        console.log(pgm + 'hub_status = ' + JSON.stringify(hub_status));
                        console.log(pgm + 'my_like = ' + JSON.stringify(my_like));
                        console.log(pgm + 'hub_like = ' + JSON.stringify(hub_like));
                    }; // step_7_debug_output

                    // todo: what about max user directory size. below limit before merge. over limit after merge
                    step_8_merge_user = function (cb9) {
                        var pgm = service + '.merge_user_hub.step_8_merge_user: ';
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
                            var pgm = service + '.merge_user_hub.step_8_merge_user.move_user_files: ';
                            var key, re1, re2, match, hub_filename, filename_splitted, my_filename, inner_path0,
                                debug_seq0, file_str, json_raw ;
                            if (Object.keys(hub_content.files_optional).length == 0) return step_8_merge_user(cb9) ; // next user
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
                            if (!match) return step_8_merge_user(cb9); // continue with next user

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

                    }; // step_8_merge_user

                    // step_9_move_other_files. Etc optional files not ending with -<user_seq>-chat.json or -<user_seq>-image.json
                    step_9_move_other_files = function (cb10) {
                        var pgm = service + '.merge_user_hub.step_9_move_other_files: ';
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
                            return step_9_move_other_files(cb10); // next file
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
                                return step_9_move_other_files(cb10); // next file
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
                                step_9_move_other_files(cb10); // next file
                            }); // fileDelete callback

                        }); // fileWrite callback

                    }; // step_9_move_other_files

                    step_10_cleanup_hub_user_files = function(cb11) {
                        var pgm = service + '.merge_user_hub.step_10_cleanup_hub_user_files: ';
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
                            step_10_cleanup_hub_user_files(cb11) ;
                        }) ; // fileDelete callback
                    }; // step_10_cleanup_hub_user_files

                    step_11_publish_empty_hub = function (cb12) {
                        var pgm = service + '.merge_user_hub.step_11_publish_empty_hub: ';
                        var json_raw, inner_path, debug_seq ;
                        if (!hub_publish) return cb12() ;

                        // write hub content without any optional files to prevent missing optional files error
                        delete hub_content.files_optional ;
                        json_raw = unescape(encodeURIComponent(JSON.stringify(hub_content, null, "\t")));
                        inner_path = hub_user_path + 'content.json' ;
                        debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + inner_path + ' fileWrite') ;
                        ZeroFrame.cmd("fileWrite", [inner_path , btoa(json_raw)], function (res) {
                            var pgm = service + '.merge_user_hub.step_11_publish_empty_hub fileWrite callback 1: ';
                            MoneyNetworkHelper.debug_z_api_operation_end(debug_seq);
                            if (res != 'ok') {
                                console.log(pgm + inner_path + ' fileWrite failed. error = ' + JSON.stringify(res)) ;
                                return ;
                            }
                            // sign and publish
                            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_site_publish', pgm + hub + ' publish') ;
                            ZeroFrame.cmd("sitePublish", {inner_path: inner_path}, function (res) {
                                var pgm = service + '.merge_user_hub.step_11_publish_empty_hub sitePublish callback 2: ';
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq);
                                if (res != 'ok') {
                                    console.log(pgm + inner_path + ' sitePublish failed. error = ' + JSON.stringify(res)) ;
                                    return ;
                                }
                                cb12() ;
                            }) ; // sitePublish
                        }) ; // fileWrite callback 1
                    }; // step_11_publish_empty_hub

                    step_12_write_and_publish_user_data = function (cb13) {
                        var pgm = service + '.merge_user_hub.step_12_write_and_publish_user_data: ';
                        var write_data, write_status, write_like, publish ;
                        
                        write_data = function (cb) {
                            var pgm = service + '.merge_user_hub.step_12_write_and_publish_user_data.write_data: ';
                            var json_raw, inner_path, debug_seq ;
                            if (!my_data_updated) return cb() ;
                            my_publish = true ;
                            json_raw = unescape(encodeURIComponent(JSON.stringify(my_data, null, "\t")));
                            inner_path = hub_user_path + 'data.json' ;
                            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + inner_path + ' fileWrite') ;
                            ZeroFrame.cmd("fileWrite", [inner_path , btoa(json_raw)], function (res) {
                                var pgm = service + '.merge_user_hub.step_11_publish_empty_hub fileWrite callback 1: ';
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq);
                                if (res != 'ok') {
                                    console.log(pgm + inner_path + ' fileWrite failed. error = ' + JSON.stringify(res)) ;
                                    return ;
                                }
                                cb() ;
                            }) ;
                        } ; // write_data

                        write_status = function (cb) {
                            var pgm = service + '.merge_user_hub.step_12_write_and_publish_user_data.write_status: ';
                            var json_raw, inner_path, debug_seq ;
                            if (!my_status_updated) return cb() ;
                            my_publish = true ;
                            json_raw = unescape(encodeURIComponent(JSON.stringify(my_status, null, "\t")));
                            inner_path = hub_user_path + 'status.json' ;
                            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + inner_path + ' fileWrite') ;
                            ZeroFrame.cmd("fileWrite", [inner_path , btoa(json_raw)], function (res) {
                                var pgm = service + '.merge_user_hub.step_11_publish_empty_hub fileWrite callback 1: ';
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq);
                                if (res != 'ok') {
                                    console.log(pgm + inner_path + ' fileWrite failed. error = ' + JSON.stringify(res)) ;
                                    return ;
                                }
                                cb() ;
                            }) ;
                        } ; // write_status

                        write_like = function (cb) {
                            var pgm = service + '.merge_user_hub.step_12_write_and_publish_user_data.write_like: ';
                            var json_raw, inner_path, debug_seq ;
                            if (!my_like_updated) return cb() ;
                            my_publish = true ;
                            json_raw = unescape(encodeURIComponent(JSON.stringify(my_like, null, "\t")));
                            inner_path = hub_user_path + 'like.json' ;
                            debug_seq = MoneyNetworkHelper.debug_z_api_operation_start('z_file_write', pgm + inner_path + ' fileWrite') ;
                            ZeroFrame.cmd("fileWrite", [inner_path , btoa(json_raw)], function (res) {
                                var pgm = service + '.merge_user_hub.step_11_publish_empty_hub fileWrite callback 1: ';
                                MoneyNetworkHelper.debug_z_api_operation_end(debug_seq);
                                if (res != 'ok') {
                                    console.log(pgm + inner_path + ' fileWrite failed. error = ' + JSON.stringify(res)) ;
                                    return ;
                                }
                                cb() ;
                            }) ;
                        } ; // write_like

                        publish = function (cb) {
                            var pgm = service + '.merge_user_hub.step_12_write_and_publish_user_data.publish: ';
                            var inner_path0, debug_seq0;
                            if (!my_publish) return cb();

                            inner_path0 = my_user_path + 'content.json';
                            debug_seq0 = MoneyNetworkHelper.debug_z_api_operation_start('z_site_publish', pgm + my_hub + ' publish');
                            ZeroFrame.cmd("sitePublish", {inner_path: inner_path0}, function (res) {
                                var pgm = service + '.merge_user_hub.step_12_write_and_publish_user_data.publish sitePublish callback: ';
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
                        
                    }; // step_12_write_and_publish_user_data

                    // step n: finish doing tasks
                    step_n_done = function () {
                        var pgm = service + '.merge_user_hub.step_n_done: ';
                        cb(null) ;
                    }; // step_n_done

                    // callback chain step 1, .2, ... n
                    step_1_remove_file_doublets(function() {
                        step_2_get_file_info(function() {
                            step_3_download_files(function() {
                                step_4_get_data_files(function() {
                                    step_5_get_status_files(function() {
                                        step_6_get_like_files(function() {
                                            step_7_debug_output(function() {
                                                step_8_merge_user(function() {
                                                    step_7_debug_output(function() {
                                                        step_9_move_other_files(function(){
                                                            step_10_cleanup_hub_user_files(function() {
                                                                step_11_publish_empty_hub(function() {
                                                                    step_12_write_and_publish_user_data(function() {
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

        // cache some important informations from zeronet files
        // - user_seq: from users array in data.json file. using "pubkey" as index to users array
        // - user_seqs: from users array in data.json file.
        // - files_optional: from content.json file. loaded at startup and updated after every sign and publish
        //   todo: add option to enable/disable files_optional cache. must be disabled if multiple users are using same zeronet cert at the same time
        var z_cache = {} ;

        function get_z_cache () {
            return z_cache ;
        }

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
            var pgm = service + '.check_merger_permission: ' ;
            ZeroFrame.cmd("siteInfo", {}, function (site_info) {
                var pgm = service + '.check_merger_permission siteInfo callback 1: ';
                // console.log(pgm , 'site_info = ' + JSON.stringify(site_info)) ;
                if (site_info.settings.permissions.indexOf("Merger:MoneyNetwork") == -1) return request_merger_permission(calling_pgm, cb);
                // Merger:MoneyNetwork OK
                cb() ;
            }) ; // siteInfo callback
        } // check_merger_permission

        // output debug info in log. For key, see user page and setup.debug hash
        // keys: simple expressions are supported. For example inbox && unencrypted
        function debug (keys, text) {
            MoneyNetworkHelper.debug(keys, text) ;
        } // debug

        // export MoneyNetworkHubService
        return {
            get_user_seq: get_user_seq,
            get_data_json: get_data_json,
            write_data_json: write_data_json,
            get_status_json: get_status_json,
            write_status_json: write_status_json,
            get_like_json: get_like_json,
            write_like_json: write_like_json,
            get_my_user_hub: get_my_user_hub,
            get_z_cache: get_z_cache,
            check_merger_permission: check_merger_permission
        };

        // end MoneyNetworkHubService
    }]) ;
