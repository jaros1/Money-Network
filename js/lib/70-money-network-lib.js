// fix missing Array.indexOf in IE8
// http://stackoverflow.com/questions/3629183/why-doesnt-indexof-work-on-an-array-ie8
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (elt /*, from*/) {
        var len = this.length >>> 0;

        var from = Number(arguments[1]) || 0;
        from = (from < 0)
            ? Math.ceil(from)
            : Math.floor(from);
        if (from < 0)
            from += len;

        for (; from < len; from++) {
            if (from in this &&
                this[from] === elt)
                return from;
        }
        return -1;
    };
}


// helper functions
var MoneyNetworkHelper = (function () {

    var module = 'MoneyNetworkHelper' ;

    // local or session storage functions ==>

    // sessionStorage and localStorage implementation. direct calls are not working in ZeroNet. Error: The operation is insecure
    // sessionStorage is implemented as a JS object
    // localStorage is implemented as a JS object stored and updates sync asynchronously in ZeroFrame API

    // sessionStorage.
    var session_storage = {} ;

    // localStorage javascript copy is loaded from ZeroFrame API. Initialized asyn. Takes a moment before JS local_storage copy is ready
    var local_storage = { loading: true } ;
    var local_storage_functions = [] ; // functions waiting for localStorage to be ready. see authCtrl.set_register_yn
    function ls_bind(f) {
        if (local_storage.loading) local_storage_functions.push(f);
        else f() ;
    } // ls_bind
    ZeroFrame.cmd("wrapperGetLocalStorage", [], function (res) {
        var pgm = module + '.wrapperGetLocalStorage callback (1): ';
        // console.log(pgm + 'typeof res =' + typeof res) ;
        // console.log(pgm + 'res = ' + JSON.stringify(res)) ;
        if (!res) res = [{}] ;
        res = res[0];
        // moving values received from ZeroFrame API to JS copy of local storage
        // console.log(pgm + 'old local_storage = ' + JSON.stringify(local_storage)) ;
        // console.log(pgm + 'moving values received from ZeroFrame API to JS local_storage copy');
        var key ;
        for (key in local_storage) if (!res.hasOwnProperty(key)) delete local_storage[key] ;
        for (key in res) local_storage[key] = res[key] ;
        // console.log(pgm + 'local_storage = ' + JSON.stringify(local_storage));
        // execute any function waiting for localStorage to be ready
        for (var i=0 ; i<local_storage_functions.length ; i++) {
            var f = local_storage_functions[i] ;
            f();
        }
        local_storage_functions.length = 0 ;
    }) ;

    // write JS copy of local storage back to ZeroFrame API
    function ls_save() {
        var pgm = module + '.ls_save: ' ;
        // console.log(pgm + 'calling wrapperSetLocalStorage');

        ZeroFrame.cmd("wrapperSetLocalStorage", [local_storage], function () {
            var pgm = module + '.ls_save wrapperSetLocalStorage callback: ';
            // console.log(pgm + 'OK');
        }) ;
    } // ls_save

    // initialize array with public avatars from public/images/avatar
    var public_avatars = [] ;
    function load_public_avatars () {
        ZeroFrame.cmd("fileGet", ['content.json', false], function (res) {
            var pgm = module + '.load_public_avatars fileGet callback: ';
            if (res) res = JSON.parse(res) ;
            else res = { files: {} } ;
            for (key in res.files) {
                if (!res.files.hasOwnProperty(key)) continue ;
                if (key.substr(0,20) == 'public/images/avatar') public_avatars.push(key.substr(20,key.length-20)) ;
            } // for key
            // console.log(pgm + 'public_avatars = ' + JSON.stringify(public_avatars));
        })
    } // load_public_avatars
    load_public_avatars() ;
    function get_public_avatars () {
        return public_avatars ;
    }

    // return Last online from contact search array. Only value with typeof = number
    function get_last_online (contact) {
        if (!contact.search) contact.search = [] ;
        for (var i=0 ; i<contact.search.length ; i++) {
            if (typeof contact.search[i].value == 'number') return contact.search[i].value ;
        }
        return null ;
    }

    function set_last_online (contact, last_online) {
        if (!contact.search) contact.search = [] ;
        for (var i=0 ; i<contact.search.length ; i++) {
            if (typeof contact.search[i].value == 'number') {
                contact.search[i].value = last_online ;
                return
            }
        }
        contact.search.push({
            tag: 'Last updated',
            value: last_online,
            privacy: 'Search',
            row: contact.search.length+1
        }) ;
    }

    // update last updated for group chat pseudo contacts
    // return true if any contacts have been updated
    function ls_update_group_last_updated (ls_contacts, ls_contacts_hash) {
        var pgm = module + '.ls_update_group_last_updated: ' ;
        var i, contact, old_last_online, found_last_updated, j, new_last_online, unique_id, participant, k, timestamp ;
        var ls_updated = false ;
        for (i=0 ; i<ls_contacts.length ; i++) {
            contact = ls_contacts[i] ;
            if (contact.type != 'group') continue ;
            if (!contact.search) contact.search = [] ;
            old_last_online = get_last_online(contact) || 0 ;
            new_last_online = old_last_online ;
            for (j=0 ; j<contact.participants.length ; j++) {
                unique_id = contact.participants[j] ;
                participant = ls_contacts_hash[unique_id] ;
                if (!participant) {
                    console.log(pgm + 'warning. group chat participant with unique id ' + unique_id + ' does not exists') ;
                    continue ;
                }
                timestamp = get_last_online(participant) ;
                if (timestamp && (timestamp > new_last_online)) new_last_online = timestamp ;
            } // for j (participants)
            if (old_last_online == new_last_online) continue ;
            set_last_online(contact, new_last_online) ;
        } // for i (contacts)
        return ls_updated ;
    } // ls_update_group_last_updated

    // search ZeroNet for new potential contacts with matching search words
    // add/remove new potential contacts to/from local_storage_contacts array (MoneyNetworkService and ContactCtrl)
    // params:
    // - ls_contacts (array) and ls_contacts_hash (hash) from MoneyNetworkService. required
    // - fnc_when_ready - callback - execute when local_storage_contacts are updated
    // - auth_address - mini update only - update only info for this auth_address - optional
    function z_contact_search (ls_contacts, ls_contacts_hash, fnc_when_ready, auth_address) {
        var pgm = module + '.z_contact_search: ' ;

        // any relevant user info? User must have tags with privacy Search or Hidden to search network
        var user_info, my_search_query, i, row, error ;
        var user_info = getItem('user_info') ;
        if (user_info) user_info = JSON.parse(user_info) ;
        else user_info = [] ;
        var my_search_query = '' ;
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
                z_contact_search (ls_contacts, ls_contacts_hash, fnc_when_ready, null);
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
        var pubkey = getItem('pubkey') ;
        var query = "select json.json_id, users.user_seq from json, users " +
            "where json.directory = '" + directory + "' " +
            "and users.json_id = json.json_id " +
            "and users.pubkey = '" + pubkey + "'";
        debug('select', pgm + 'query 1 = ' + query) ;
        ZeroFrame.cmd("dbQuery", [query], function(res) {
            var pgm = module + '.z_contact_search dbQuery callback 1: ' ;
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

            // new contacts query without modified timestamp from content.json (keyvalue)
            if (auth_address) debug('select', pgm + 'auth_address = ' + auth_address) ;
            var contacts_query =
                "select" +
                "  users.user_seq, users.pubkey, users.avatar as users_avatar, users.guest," +
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
                "  contacts.pubkey as other_pubkey, contacts.guest as other_guest, contacts.auth_address as other_auth_address," +
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
                var pgm = module + '.z_contact_search dbQuery callback 2: ';
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
                for (i=0 ; i<res.length ; i++) {
                    if (!res[i].other_users_avatar) continue ;
                    if (res[i].other_users_avatar == 'jpg') continue ;
                    if (res[i].other_users_avatar == 'png') continue ;
                    if (public_avatars.indexOf(res[i].other_users_avatar) != -1) continue ;
                    debug('invalid_avatars', 'Error. Removing invalid avatar from query result. res[' + i + '] = ' + JSON.stringify(res[i])) ;
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
                            guest: res[i].other_guest,
                            avatar: res[i].other_files_avatar || res[i].other_users_avatar,
                            search: [{ tag: 'Last updated', value: last_updated, privacy: 'Search', row: 1, debug_info: {}}]
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
                            ls_contacts.splice(i,1) ;
                            delete ls_contacts_hash[unique_id];
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
                    ls_contacts.push(new_contact);
                    ls_contacts_hash[unique_id] = new_contact ;
                    // console.log(pgm + 'new_contact = ' + JSON.stringify(new_contact));
                }
                // console.log(pgm + 'local_storage_contacts = ' + JSON.stringify(local_storage_contacts));

                // update Last updated for pseudo group chat contacts.
                ls_update_group_last_updated(ls_contacts, ls_contacts_hash) ;

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


    // values in sessionStorage:
    // - data are discarded when user closes browser tab
    // - only userid and password keys
    // - never <userid> prefix before key
    // - values are not compressed or encrypted

    // values in localStorage:
    // - data are preserved when user closes tab or browser
    // - some values are global values without <userid> prefix. others are user specific values with <userid> prefix
    // - some values are encrypted (keys, authorization and other sensible information)
    // - encryption: key is as only item encrypted with password (human text). All other encrypted items are is encrypted with key (random string)
    // - some values are compressed (users and gifts arrays)
    // - rules (local_storage_rules) are derived from key name
    // - default values are <userid> prefix, no encryption and no compression (write warning in console.log)

    var storage_rules = {
        // basic authorization - see client_login
        key: {session: false, userid: true, compress: true, encrypt: true}, // random password - used for localStorage encryption
        password: {session: true, userid: false, compress: false, encrypt: false}, // session password in clear text
        passwords: {session: false, userid: false, compress: false, encrypt: false}, // array with hashed passwords. size = number of accounts
        prvkey: {session: false, userid: true, compress: true, encrypt: true}, // for encrypted user to user communication
        pubkey: {session: false, userid: true, compress: true, encrypt: false}, // for encrypted user to user communication
        userid: {session: true, userid: false, compress: false, encrypt: false}, // session userid (1, 2, etc) in clear text.
        guestid: {session: false, userid: false, compress: false, encrypt: false}, // guest userid (1, 2, etc). in clear text. Used for cleanup operation
        // user data
        user_info: {session: false, userid: true, compress: true, encrypt: true}, // array with user_info. See user sub page / userCtrl
        contacts: {session: false, userid: true, compress: true, encrypt: true}, // array with contacts. See contacts sub page / contactCtrl
        msg_seq: {session: false, userid: true, compress: true, encrypt: true}, // local msg seq. Sequence. Used in contact.messages
        // todo: avatar and alias is moved to setup but is still used in js code
        avatar: {session: false, userid: true, compress: true, encrypt: false}, // temporary public avatar image. user should upload a custom avatar image
        alias: {session: false, userid: true, compress: true, encrypt: true}, // user alias. Used in chat page
        setup: {session: false, userid: true, compress: true, encrypt: true} // hash with user setup (avatar, alias, sort, filter etc)
    };

    // first character in stored value is an encryption/compression storage flag
    // storage flag makes it possible to select best compression method
    // and storage flag makes it possible to later change storage rules for already saved values
    var storage_flags = {
        a: {compress: 0, encrypt: 0, sequence: 0}, // clear text - not compressed, not encrypted
        b: {compress: 0, encrypt: 1, sequence: 0}, // encrypted only - not compressed
        c: {compress: 1, encrypt: 0, sequence: 0}, // LZString synchronous compression, not encrypted
        d: {compress: 1, encrypt: 1, sequence: 0}, // LZString synchronous compression, compress => encrypt
        e: {compress: 1, encrypt: 1, sequence: 1}, // LZString synchronous compression, encrypt => compress
        f: {compress: 2, encrypt: 0, sequence: 0}, // LZMA level 1 asynchronous compression, not encrypted
        g: {compress: 2, encrypt: 1, sequence: 0}, // LZMA level 1 asynchronous compression, compress => encrypt
        h: {compress: 2, encrypt: 1, sequence: 1}, // LZMA level 1 asynchronous compression, encrypt => compress
        i: {compress: 3, encrypt: 0, sequence: 0}, // compression 3, not encrypted (reserved / not implemented)
        j: {compress: 3, encrypt: 1, sequence: 0}, // compression 3, compress => encrypt (reserved / not implemented)
        k: {compress: 3, encrypt: 1, sequence: 1}, // compression 3, encrypt => compress (reserved / not implemented)
        l: {compress: 4, encrypt: 0, sequence: 0}, // compression 4, not encrypted (reserved / not implemented)
        m: {compress: 4, encrypt: 1, sequence: 0}, // compression 4, compress => encrypt (reserved / not implemented)
        n: {compress: 4, encrypt: 1, sequence: 1}  // compression 4, encrypt => compress (reserved / not implemented)
    };

    // reverse index - from compress*encrypt*sequence (binary 0-19) to storage flag a-n
    var storage_flag_index = {};

    function storage_options_bin_key(storage_options) {
        return 4 * storage_options.compress + 2 * storage_options.encrypt + storage_options.sequence;
    }

    (function () {
        var storage_flag; // a-n
        var index; // 0-19
        for (storage_flag in storage_flags) {
            if (storage_flags.hasOwnProperty(storage_flag)) {
                index = storage_options_bin_key(storage_flags[storage_flag]);
                storage_flag_index[index] = storage_flag;
            }
        }
    })();

    // todo: how to handle "no more space" in local storage?
    // 1) only keep newer gifts and relevant users in local storage
    //    gifts and users arrays should be saved in local storage in one operation to allow automatic space management
    //    add oldest_gift_at timestamp. Ignore gifts with timestamp before oldest_gift_id when sync. gifts with other devices
    //    or oldest_gift_id pointer. Ignore gifts with gift_id < oldest_gift_ud when sync. gifts when other devices
    // 2) a possibility is to store old blocks with gifts and users on server encrypted with pubkey
    //    that is show-more-rows functionality at end of page
    //    send a server request to get old data block. Return old data block and insert into users and gifts js arrays
    //    old data block stored on server can be changed if user info changes, friendship changes, or gifts are change or are deleted

    // symmetric encrypt sensitive data in local storage.
    // password is saved in session storage and is deleted when user closes tab in browser
    // also used for symmetric encryption in communication between clients
    function encrypt(text, password) {
        var output_wa;
        output_wa = CryptoJS.AES.encrypt(text, password, {format: CryptoJS.format.OpenSSL}); //, { mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.AnsiX923, format: CryptoJS.format.OpenSSL });
        return output_wa.toString(CryptoJS.format.OpenSSL);
    }

    function decrypt(text, password) {
        var output_wa;
        output_wa = CryptoJS.AES.decrypt(text, password, {format: CryptoJS.format.OpenSSL}); // , { mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.AnsiX923, format: CryptoJS.format.OpenSSL });
        return output_wa.toString(CryptoJS.enc.Utf8);
    }

    // LZString compress and decompress strings - fast and synchronous compress and decompress
    // https://github.com/pieroxy/lz-string
    // http://pieroxy.net/blog/pages/lz-string/guide.html)
    function compress1(text) {
        return LZString.compressToUTF16(text);
    }

    function decompress1(text) {
        return LZString.decompressFromUTF16(text);
    }

    // LZMA level 1 compress and decompress strings - not as fast as LZString - runs asynchronous
    // setItem uses LZString in compression. At end setItem submit a asynchronous task to check if LZMA level 1 compress is better
    // todo: LZMA disabled until I find a good method to convert byte array output from LZMA.compress into an utf-16 encoded string

    // lzma_compress0 - sequence = 0 - not encrypted or normal compress => encrypt sequence
    // lzma_compress1 - sequence = 1 - encrypted and reverse encrypt => compress sequence

    // params:
    // - key and value - original inputs to setItem
    // - session: true: sessionStorage, false: localStorage
    // - password: null: not encrypted, != null: encrypted
    // - length: length of lzstring compressed value (without storage flag)
    function lzma_compress1(key, value, session, password, length) {
        var pgm = 'lzma_compress1: ';
        value = encrypt(value, password);
        // start compress
        // var lzma = new LZMA;
        LZMA.compress(value, 1, function (value) {
            // compress result received
            console.log(pgm + 'compress result received. value = ' + value);
            if (value.length >= length) return;
            // lzma compress sequence 2 was better than lzstring compress and/or lzma compress sequence = 0 (compress => encrypt)
            console.log(pgm + 'key = ' + key + '. lzma compress sequence 2 was better than lzstring compress and/or lzma compress sequence = 0 (compress => encrypt)');
            // find storage flag and save new compressed value
            var storage_options = {compress: 2, encrypt: 1, sequence: 1};
            var bin_key = storage_options_bin_key(storage_options);
            var storage_flag = storage_flag_index[bin_key];
            if (!storage_flag) {
                console.log(pgm + 'Warning. key ' + key + ' was not optimized. Could not found storage flag for storage options = ' + JSON.stringify(storage_options));
                return;
            }
            value = storage_flag + value;
            // save
            if (session) session_storage[key] = value; // sessionStorage.setItem(key, value);
            else local_storage[key] = value ; // localStorage.setItem(key, value);
        }, null);
    } // lzma_compress1
    function lzma_compress0(key, value, session, password, length) {
        var pgm = 'lzma_compress0: ';
        var save_value = value;
        // start compress
        // var lzma = new LZMA;
        LZMA.compress(value, 1, function (value) {
            // compress result received
            console.log(pgm + 'compress result received. value = ' + value);
            if (password) value = encrypt(value, password);
            if (value.length < length) {
                // lzma compress was better than lzstring compress
                console.log(pgm + 'key = ' + key + '. lzma compress was better than lzstring compress');
                // find storage flag and save new compressed value
                var storage_options = {compress: 2, encrypt: (password ? 1 : 0), sequence: 0};
                var bin_key = storage_options_bin_key(storage_options);
                var storage_flag = storage_flag_index[bin_key];
                if (!storage_flag) {
                    console.log(pgm + 'Warning. key ' + key + ' was not optimized. Could not found storage flag for storage options = ' + JSON.stringify(storage_options));
                    return;
                }
                value = storage_flag + value;
                // save
                if (session) session_storage[key] = value; // sessionStorage.setItem(key, value);
                else local_storage[key] = value ; // localStorage.setItem(key, value);
                length = value.length - 1;
            }
            ;
            // start start_lzma_compress1 if encrypted - sequence = 1 - encrypt before compress
            if (password) lzma_compress1(key, save_value, session, password, length);
        }, null);
    } // check_lzma_compress

    // look storage rules for key. add default values and write warning to console log when using defaults
    function get_local_storage_rule(key) {
        var pgm = 'MoneyNetworkHelper.get_local_storage_rule: ';
        var key_options;
        if (storage_rules.hasOwnProperty(key)) key_options = storage_rules[key];
        else {
            console.log(pgm + 'Warning. ' + key + ' was not found in local_storage_rules hash.');
            key_options = {session: false, userid: true, compress: false, encrypt: false};
        }
        if (!key_options.hasOwnProperty('session')) {
            console.log(pgm + 'Warning. using default value session=false for key ' + key);
            key_options.session = false;
        }
        if (!key_options.hasOwnProperty('userid')) {
            key_options.userid = !key_options.session;
            console.log(pgm + 'Warning. using default value userid=' + key_options.userid + ' for key ' + key);
        }
        if (!key_options.hasOwnProperty('compress')) {
            console.log(pgm + 'Warning. using default value compress=false for key ' + key);
            key_options.compress = false;
        }
        if (!key_options.hasOwnProperty('encrypt')) {
            console.log(pgm + 'Warning. using default value encrpt=false for key ' + key);
            key_options.encrypt = false;
        }
        //if (!key_options.hasOwnProperty('key')) {
        //    console.log(pgm + 'Warning. using default value key=false for key ' + key) ;
        //    key_options.key = false ;
        //}
        return key_options;
    } // get_local_storage_rule


    // get/set item
    function getItem(key) {
        var pgm = 'MoneyNetworkHelper.getItem: ';
        // if (key == 'password') console.log(pgm + 'caller: ' + arguments.callee.caller.toString()) ;
        // console.log(pgm + 'debug 1: key = ' + key) ;
        var pseudo_key = key; // .match(/^gift_[0-9]+$/) ? 'gifts' : key ; // use gifts rule for gift_1, gift_1 etc
        var rule = get_local_storage_rule(pseudo_key);
        if (rule.encrypt) var password_type = (key == 'key' ? 'password' : 'key'); // key is as only variable encrypted with human password
        // userid prefix?
        if (rule.userid) {
            var userid = getItem('userid');
            if ((typeof userid == 'undefined') || (userid == null) || (userid == '')) userid = 0;
            else userid = parseInt(userid);
            if (userid == 0) {
                console.log(pgm + 'Error. key ' + key + ' is stored with userid prefix but userid was not found (not logged in)') ;
                return null;
            }
            key = userid + '_' + key;
        }
        // read stored value
        // console.log(pgm + 'key = ' + key + ', rule.session = ' + rule.session + ', local_storage.loading = ' + local_storage.loading);
        if (!rule.session && local_storage.loading) {
            console.log(pgm + 'LocalStorage are not ready. key = ' + key) ;
            return null ;
        }
        var value = rule.session ? session_storage[key] : local_storage[key]; // localStorage.getItem(key);
        // if (pseudo_key == 'user_info') console.log(pgm + 'debug: local_storage = ' + JSON.stringify(local_storage) + ', value = ' + value) ;
        if ((typeof value == 'undefined') || (value == null) || (value == '')) return null; // key not found

        // get storage flag - how was data stored - first character in value
        var storage_flag = value.substr(0, 1);
        value = value.substr(1);
        var storage_options = storage_flags[storage_flag];
        if (!storage_options) {
            console.log(pgm + 'Error. Invalid storage flag ' + storage_flag + ' was found for key ' + key);
            return null;
        }

        // decompress
        if ((storage_options.compress > 0) && (storage_options.sequence == 1)) {
            // reverse encrypt => compress sequence was used when saving this data. decompress before decrypt
            // console.log(pgm + key + ' before decompress = ' + value) ;
            value = decompress1(value);
        }

        // decrypt
        if (storage_options.encrypt) {
            // console.log(pgm + key + ' before decrypt = ' + value) ;
            var password = getItem(password_type); // use key or password
            if ((typeof password == 'undefined') || (password == null) || (password == '')) {
                console.log(pgm + 'Error. key ' + key + ' is stored encrypted but ' + password_type + ' was not found');
                return null;
            }
            value = decrypt(value, password);
        }

        // decompress
        if ((storage_options.compress > 0) && (storage_options.sequence == 0)) {
            // normal compress => encrypt sequence was used when saving this data. decompress after decrypt
            // console.log(pgm + key + ' before decompress = ' + value) ;
            value = decompress1(value);
        }

        // ready
        // if (storage_options.encrypt || storage_options.compress) console.log(pgm + key + ' after decrypt and decompress = ' + value) ;
        // if (key.match(/oauth/)) console.log('getItem. key = ' + key + ', value = ' + value) ;
        return value;
    } // getItem

    // get length for Item before decryption. Use for calculate encryption overhead for messages
    function getItemSize(key) {
        var pgm = 'MoneyNetworkHelper.getItemSize: ';
        // if (key == 'password') console.log(pgm + 'caller: ' + arguments.callee.caller.toString()) ;
        // console.log(pgm + 'debug 1: key = ' + key) ;
        var pseudo_key = key; // .match(/^gift_[0-9]+$/) ? 'gifts' : key ; // use gifts rule for gift_1, gift_1 etc
        var rule = get_local_storage_rule(pseudo_key);
        if (rule.encrypt) var password_type = (key == 'key' ? 'password' : 'key'); // key is as only variable encrypted with human password
        // userid prefix?
        if (rule.userid) {
            var userid = getItem('userid');
            if ((typeof userid == 'undefined') || (userid == null) || (userid == '')) userid = 0;
            else userid = parseInt(userid);
            if (userid == 0) {
                console.log(pgm + 'Error. key ' + key + ' is stored with userid prefix but userid was not found (not logged in)') ;
                return 0;
            }
            key = userid + '_' + key;
        }
        // read stored value
        // console.log(pgm + 'key = ' + key + ', rule.session = ' + rule.session + ', local_storage.loading = ' + local_storage.loading);
        if (!rule.session && local_storage.loading) {
            console.log(pgm + 'LocalStorage are not ready. key = ' + key) ;
            return 0 ;
        }
        var value = rule.session ? session_storage[key] : local_storage[key]; // localStorage.getItem(key);
        // if (pseudo_key == 'user_info') console.log(pgm + 'debug: local_storage = ' + JSON.stringify(local_storage) + ', value = ' + value) ;
        if ((typeof value == 'undefined') || (value == null) || (value == '')) return 0; // key not found

        return value.length ;
    } // getItemSize


    function setItem(key, value) {
        var pgm = 'MoneyNetworkHelper.setItem: ';
        // console.log(pgm + 'key = ' + key + ', value = ' + value) ;
        var pseudo_key = key.match(/^gift_[0-9]+$/) ? 'gifts' : key; // use gifts rule for gift_1, gift_1 etc
        var rule = get_local_storage_rule(pseudo_key);
        if (rule.encrypt) var password_type = (key == 'key' ? 'password' : 'key'); // key is as only variable encrypted with human password
        // userid prefix?
        if (rule.userid) {
            var userid = getItem('userid');
            if ((typeof userid == 'undefined') || (userid == null) || (userid == '')) userid = 0;
            else userid = parseInt(userid);
            if (userid == 0) {
                // console.log(pgm + 'Error. key ' + key + ' is stored with userid prefix but userid was not found') ;
                return;
            }
            key = userid + '_' + key;
        }
        // check password
        var password;
        if (rule.encrypt) {
            password = getItem(password_type); // use key or password
            if ((typeof password == 'undefined') || (password == null) || (password == '')) {
                console.log(pgm + 'Error. key ' + key + ' is stored encrypted but ' + password_type + ' was not found');
                return;
            }
        }
        var sequence;
        if (rule.compress && rule.encrypt) {
            // compress and encrypt. find best sequence
            // sequence 0 : normal sequence - compress before encrypt
            // sequence 1 : reverse sequence - encrypt before compress
            var value1 = encrypt(compress1(value), password);
            var value2 = compress1(encrypt(value, password));
            if (value1.length <= value2.length) {
                sequence = 0;
                value = value1;
            }
            else {
                sequence = 1;
                value = value2;
            }
        }
        else {
            sequence = 0;
            // compress?
            if (rule.compress) value = compress1(value);
            // encrypt?
            if (rule.encrypt) value = encrypt(value, password);
        }
        // set storage flag - how are data stored - first character in value
        var storage_options = {
            compress: (rule.compress ? 1 : 0),
            encrypt: (rule.encrypt ? 1 : 0),
            sequence: sequence
        };
        var bin_key = storage_options_bin_key(storage_options);
        var storage_flag = storage_flag_index[bin_key];
        if (!storage_flag) {
            console.log(pgm + 'Error. key ' + key + ' was not saved. Could not found storage flag for storage options = ' + JSON.stringify(storage_options));
            return;
        }
        // if (pseudo_key == 'user_info') console.log(pgm + 'debug: key = ' + key + ', value = ' + value) ;
        value = storage_flag + value;
        // save
        // if (key.match(/oauth/)) console.log('setItem. key = ' + key + ', value = ' + value) ;
        if (rule.session) session_storage[key] = value; // sessionStorage.setItem(key, value);
        else local_storage[key] = value; // localStorage.setItem(key, value);
        // optimize compression for saved value

        // todo: disabled until I find a method to convert byte array returned from LZMA.compress into an valid utf-16 string
        // check if lzma compress if better than lzstring compress
        // if (rule.compress) lzma_compress0(key, save_value, rule.session, password, value.length-1) ;
    } // setItem

    function removeItem(key) {
        var pgm = 'MoneyNetworkHelper.setItem: ';
        var pseudo_key = key.match(/^gift_[0-9]+$/) ? 'gifts' : key; // use gifts rule for gift_1, gift_1 etc
        var rule = get_local_storage_rule(pseudo_key);
        // userid prefix?
        if (rule.userid) {
            var userid = getItem('userid');
            if ((typeof userid == 'undefined') || (userid == null) || (userid == '')) userid = 0;
            else userid = parseInt(userid);
            if (userid == 0) {
                console.log(pgm + 'Error. key ' + key + ' is stored with userid prefix but userid was not found');
                return null;
            }
            key = userid + '_' + key;
        }
        // remove
        if (rule.session) delete session_storage[key]; // sessionStorage.removeItem(key);
        else delete local_storage[key]; // localStorage.removeItem(key);
    } // removeItem

    function getUserId() {
        var userid = MoneyNetworkHelper.getItem('userid');
        if (typeof userid == 'undefined') userid = 0;
        else if (userid == null) userid = 0;
        else if (userid == '') userid = 0;
        else userid = parseInt(userid);
        return userid;
    } // getUserId

    // sha256 digest - used for one way password encryption and signatures for gifts and comments
    // arguments: list of input fields to sha256 calculation
    // todo: ignore empty fields at end of input? will allow adding new empty fields to gifts and comments signature without destroying old signatures
    function sha256() {
        var pgm = 'MoneyNetworkHelper.sha256: ';
        var texts = [];
        for (var i = 0; i < arguments.length; i++) {
            switch (typeof arguments[i]) {
                case 'string' :
                    texts.push(arguments[i]);
                    break;
                case 'boolean':
                    texts.push(arguments[i].toString());
                    break;
                case 'number':
                    texts.push(arguments[i].toString());
                    break;
                case 'undefined':
                    texts.push('');
                    break;
                default:
                    // null or an object
                    if (arguments[i] == null) texts.push('');
                    else texts.push(JSON.stringify(arguments[i]));
            } // switch
        }
        ;
        // strip empty fields from end of sha256 input
        while ((texts.length > 0) && (texts[texts.length - 1] == '')) texts.length = texts.length - 1;
        var text = texts.length == 0 ? '' : texts.join(',');
        var sha256 = CryptoJS.SHA256(text).toString(CryptoJS.enc.Latin1);
        // console.log(pgm + 'text = ' + text + ', sha256 = ' + sha256)
        return sha256;
    } // sha256

    // generate password - used as key for local storage encryption and used in client to client communication (symmetric encryption)
    function generate_random_password(length) {
        var character_set = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789![]{}#%&/()=?+-:;_-.@$|£';
        var password = [], index, char;
        for (var i = 0; i < length; i++) {
            index = Math.floor(Math.random() * character_set.length);
            char = character_set.substr(index, 1);
            password.push(char);
        }
        ;
        return password.join('');
    } // generate_random_password

    // client login (password from device_login_form form)
    // 0 = invalid password, > 0 : userid
    // use create_new_account = true to force create a new user account
    // support for more than one user account
    function client_login(password, create_new_account) {
        var pgm = module + '.client_login: ' ;
        var password_sha256, passwords_s, passwords_a, i, userid, did, crypt, pubkey, prvkey, prvkey_aes, giftid_key;
        password_sha256 = sha256(password);
        // passwords: array with hashed passwords. size = number of accounts
        passwords_s = getItem('passwords');
        // console.log(pgm + 'passwords_s = ' + passwords_s) ;
        if ((passwords_s == null) || (passwords_s == '')) passwords_a = [];
        else passwords_a = JSON.parse(passwords_s);
        // console.log(pgm + 'password_sha256 = ' + password_sha256) ;
        // check old accounts
        for (i = 0; i < passwords_a.length; i++) {
            // console.log(pgm + 'passwords_a[' + i + '] = ' + passwords_a[i]) ;
            if (password_sha256 == passwords_a[i]) {
                // log in ok - account exists
                // console.log(pgm + 'login ok') ;
                userid = i + 1;
                // save login
                setItem('userid', userid);
                setItem('password', password);
                load_user_setup() ;
                return userid;
            }
        }
        // password was not found
        if (create_new_account) {
            // create new account
            console.log(pgm + 'create new account');
            userid = passwords_a.length + 1; // sequence = number of user accounts in local storage
            // setup new account
            passwords_a.push(password_sha256);
            passwords_s = JSON.stringify(passwords_a);
            // generate key pair for client to client RSA encryption
            crypt = new JSEncrypt({default_key_size: 2048});
            crypt.getKey();
            pubkey = crypt.getPublicKey();
            prvkey = crypt.getPrivateKey();
            // console.log(pgm + 'new pubkey = ' + pubkey);
            // console.log(pgm + 'new prvkey = ' + prvkey);
            // key for symmetric encryption in localStorage - 80-120 characters (avoid using human text in encryption)
            var key_lng = Math.round(Math.random() * 40) + 80;
            var key = MoneyNetworkHelper.generate_random_password(key_lng);
            // save login in sessionStorage
            // note that password is saved in clear text in sessionStorage
            // please use device log out or close browser tab when finished
            setItem('userid', userid);
            setItem('password', password);
            // save new user account in localStorage
            setItem('key', key);
            setItem('prvkey', prvkey); // private key - only used on this device - never sent to server or other clients
            setItem('pubkey', pubkey); // public key - sent to server and other clients
            setItem('passwords', passwords_s); // array with sha256 hashed passwords. length = number of accounts
            // send local storage updates to ZeroFrame
            ls_save();
            return userid;
        }
        // invalid password (create_new_account=false)
        // console.log(pgm + 'invalid password');
        return 0;
    } // client_login

    // client logout - clear all data in sessisonStorage (userid and password)
    function client_logout() {
        for (var key in session_storage) delete session_storage[key] ;
        for (var key in user_setup) delete user_setup[key] ;
    } // client_logout

    // delete any existing guest account before creating a new guest account
    function delete_guest_account () {
        var pgm = module + '.delete_guest_account: ' ;
        var guestid, passwords, key_prefix, lng, key ;
        guestid = getItem('guestid') ;
        if (!guestid) return ; // no guest account
        // set password to null
        guestid = parseInt(guestid) ;
        passwords = JSON.parse(getItem('passwords'));
        passwords[guestid-1] = null ;
        setItem('passwords', JSON.stringify(passwords));
        // delete all keys starting with <guestid>_
        removeItem('guestid');
        key_prefix = guestid + '_' ;
        lng = key_prefix.length ;
        for (key in local_storage) if (key.substr(0,lng) == key_prefix) delete local_storage[key] ;
        ls_save();
    } // delete_guest_account

    // validate JSON before send and after receive using https://github.com/geraintluff/tv4
    var json_schemas = {} ;
    json_schemas['contact added'] = {
        "type": 'object',
        "title": 'Contact added message. Message with additional user information',
        "properties": {
            "msgtype": { "type": 'string', pattern: '^contact added$'},
            "search": {
                "type": 'array',
                "items": {
                    "type": 'object',
                    "properties": {
                        "tag": { "type": 'string' },
                        "value": { "type": 'string'},
                        "privacy": { "type": 'string', "pattern": '^(Public|Unverified)$'},
                    },
                    "required": ['tag', 'value', 'privacy'],
                    "additionalProperties": false
                }
            },
            "local_msg_seq": { "type": 'integer'},
            "sender_sha256": { "type": 'string', "pattern": '^[0-9a-f]{64}$'}
        },
        "required": ['msgtype', 'search'],
        "additionalProperties": false
    }; // contact added
    json_schemas['contact removed'] = {
        "type": 'object',
        "title": 'Contact removed message',
        "properties": {
            "msgtype": { "type": 'string', pattern: '^contact removed$'},
            "local_msg_seq": { "type": 'integer'},
            "sender_sha256": { "type": 'string', "pattern": '^[0-9a-f]{64}$'}
        },
        "required": ['msgtype'],
        "additionalProperties": false
    }; // contact added
    json_schemas['chat msg'] = {
        "type": 'object',
        "title": 'Send chat message to contact',
        "description": 'Message is required unless delete old chat message. old_local_msg_seq is reference to old chat message to be changed or deleted. Image must be base64uri',
        "properties": {
            "msgtype": { "type": 'string', pattern: '^chat msg$'},
            "message": { "type": 'string'},
            "local_msg_seq": { "type": 'integer'},
            "sender_sha256": { "type": 'string', "pattern": '^[0-9a-f]{64}$'},
            "old_local_msg_seq": { "type": 'integer' },
            "image": { "type": 'string'}
        },
        "required": ['msgtype'],
        "additionalProperties": false
    } ;
    json_schemas['verify'] = {
        "type": 'object',
        "title": 'Send verification request to contact',
        "description": 'Message with sha256 encrypted password. Unencrypted password must be sent to contact in an other trusted communication channal (mail, socialnetwork or whatever)',
        "properties": {
            "msgtype": { "type": 'string', pattern: '^verify$'},
            "password_sha256": { "type": 'string', "pattern": '^[0-9a-f]{64}$'},
            "local_msg_seq": { "type": 'integer'},
            "sender_sha256": { "type": 'string', "pattern": '^[0-9a-f]{64}$'}
        },
        "required": ['msgtype', 'password_sha256'],
        "additionalProperties": false
    } ;
    json_schemas['verified'] = {
        "type": 'object',
        "title": 'Send verification response to contact',
        "properties": {
            "msgtype": { "type": 'string', pattern: '^verified$'},
            "password": { "type": 'string'},
            "local_msg_seq": { "type": 'integer'},
            "sender_sha256": { "type": 'string', "pattern": '^[0-9a-f]{64}$'}
        },
        "required": ['msgtype', 'password'],
        "additionalProperties": false
    } ;
    json_schemas['received'] = {
        "type": 'object',
        "title": 'Send receipt contact. Used for chat messages with image attachment',
        "properties": {
            "msgtype": { "type": 'string', pattern: '^received$'},
            "remote_msg_seq": { "type": 'integer'},
            "local_msg_seq": { "type": 'integer'},
            "sender_sha256": { "type": 'string', "pattern": '^[0-9a-f]{64}$'}
        },
        "required": ['msgtype', 'remote_msg_seq'],
        "additionalProperties": false
    } ;
    json_schemas['group chat'] = {
        "type": 'object',
        "title": 'Start group chat. Send group chat password to participants in chat',
        "properties": {
            "msgtype": { "type": 'string', pattern: '^group chat$'},
            "participants": {
                "type": 'array',
                "items": { "type": 'string', "pattern": '^[0-9a-f]{64}$'},
                "minItems": 1
            },
            "password": { "type": 'string' },
            "local_msg_seq": { "type": 'integer'},
            "sender_sha256": { "type": 'string', "pattern": '^[0-9a-f]{64}$'}
        },
        "required": ['msgtype', 'participants', 'password'],
        "additionalProperties": false
    } ;


    // validate json:
    // - pgm - calling function. for debug messages
    // - msg - additional info in case of errors
    function validate_json (pgm, json, json_schema, msg) {
        // console.log(pgm + 'validating json');
        if (!msg) msg = '' ;
        // remove any null keys before checking json
        for (var key in json) if (json[key] == null) delete json[key];
        // check if schema definition exists
        var error ;
        if (!json_schemas.hasOwnProperty(json_schema)) {
            console.log(pgm + 'Error. JSON schema defintion for ' + json_schema + ' was not found.');
            error = 'JSON schema definition "' + json_schema + '" was not found. ' + msg ;
            console.log(pgm + error);
            return error;
        }
        // validate json
        if (tv4.validate(json, json_schemas[json_schema])) return null;
        // report json error
        var json_error = JSON.parse(JSON.stringify(tv4.error));
        delete json_error.stack;
        var json_errors = JSON.stringify(json_error) ;
        error = 'Error in ' + json_schema + ' JSON. ' + msg ;
        console.log(pgm + error + json_errors);
        return error + '.<br>Error ' + json_errors ;
    } // validate_json

    // for debug. copy of user settings from Account page
    var user_setup = {} ;
    function load_user_setup() {
        var setup = getItem('setup') ;
        if (!setup) return ;
        setup = JSON.parse(setup);
        for (var key in user_setup) delete user_setup[key] ;
        for (key in setup) user_setup[key] = setup[key] ;
    } // load_user_setup

    // output debug info in log. For key, see user page and setup.debug hash
    // keys: simple expressions are supported. For example inbox && unencrypted
    function debug (keys, text) {
        var pgm = module + '. debug: ' ;
        if (!user_setup || !user_setup.debug || !user_setup.debug.enabled) return ;
        // console.log(pgm + 'old keys = ' + keys);
        // console.log(pgm + 'user_setup = ' + JSON.stringify(user_setup));
        var debug_keys = [
            'show_contact_action_filter', 'contact_order_by', 'chat_order_by', 'chat_filter', 'invalid_avatars',
            'unencrypted', 'encrypted', 'file_done', 'select', 'inbox', 'outbox', 'data_cleanup', 'no_pubkey'];
        var i, key, debug_value, regexp ;
        for (i=0 ; i<debug_keys.length ; i++) {
            key = debug_keys[i] ;
            if (user_setup.debug[key]) debug_value = 'true' ;
            else debug_value = 'false' ;
            regexp = new RegExp(key, 'g');
            keys = keys.replace(regexp, debug_value) ;
        }
        // console.log(pgm + 'new keys = ' + keys);
        try {
            if (eval(keys)) console.log(text) ;
        }
        catch (err) {
            console.log(pgm + 'invalid call. keys = ' + keys + ', text = ' + text + ', error = ' + err.message) ;
        }
    } // debug

    // export helpers
    return {
        // local storage helpers
        get_public_avatars: get_public_avatars,
        get_last_online: get_last_online,
        set_last_online: set_last_online,
        ls_update_group_last_updated: ls_update_group_last_updated,
        z_contact_search: z_contact_search,
        getItem: getItem,
        getItemSize: getItemSize,
        setItem: setItem,
        removeItem: removeItem,
        ls_bind: ls_bind,
        ls_save: ls_save,
        getUserId: getUserId,
        client_login: client_login,
        client_logout: client_logout,
        delete_guest_account: delete_guest_account,
        generate_random_password: generate_random_password,
        encrypt: encrypt,
        decrypt: decrypt,
        validate_json: validate_json,
        load_user_setup: load_user_setup,
        debug: debug

    };
})();
// MoneyNetworkHelper end
