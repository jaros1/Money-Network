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

    function ls_get () {
        return local_storage ;
    }

    // write JS copy of local storage back to ZeroFrame API
    function ls_save() {
        var pgm = module + '.ls_save: ' ;
        // console.log(pgm + 'calling wrapperSetLocalStorage');

        ZeroFrame.cmd("wrapperSetLocalStorage", [local_storage], function () {
            var pgm = module + '.ls_save wrapperSetLocalStorage callback: ';
            // console.log(pgm + 'OK');
        }) ;
    } // key

    // delete all localStorage data
    function ls_clear() {
        for (var key in local_storage) delete local_storage[key] ;
        ls_save()
    } // ls_clear


    // localStorage export/import. Used in Account page / userCtrl
    // https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/btoa#Unicode_strings
    // ucs-2 string to base64 encoded ascii
    function utoa(str) {
        return window.btoa(unescape(encodeURIComponent(str)));
    }
    // base64 encoded ascii to ucs-2 string
    function atou(str) {
        return decodeURIComponent(escape(window.atob(str)));
    }

    var ls_export_import_test ;
    function ls_export (filename) {
        var pgm = module + '.ls_export: ' ;
        var ls, ls_str, ls_str64, blob ;
        // localStorage only export
        ls = {
            timestamp: new Date().getTime(),
            local_storage: local_storage
        } ;
        ls_str = JSON.stringify(ls);
        ls_export_import_test = ls_str ;
        // console.log(pgm + 'ls_str = ' + ls_str) ;
        ls_str64 = utoa(ls_str) ;
        blob = new Blob([ls_str64], {type: "text/plain;charset=utf-8"});
        // console.log(pgm + 'filename = ' + filename) ;
        saveAs(blob, filename);
    } // ls_export
    function ls_import (file, cb) {
        var pgm = module + '.ls_import: ' ;
        var reader, ls_str64, ls_str, ls, key, error ;
        reader = new FileReader();
        reader.onload = function () {
            ls_str64 = reader.result;
            ls_str = atou(ls_str64) ;
            // console.log(pgm + 'ls_str = ' + ls_str) ;
            if (ls_export_import_test) {
                if (ls_str == ls_export_import_test) console.log(pgm + 'Test OK. import == export') ;
                else console.log(pgm + 'Test failed. import != export') ;
            }
            ls = JSON.parse (ls_str).local_storage ;
            if (!ls) {
                error = 'no localStorage data was found in file' ;
                console.log(pgm + error) ;
                if (cb) cb(error) ;
                return ;
            }
            // import ok. overwrite existing localStorage
            for (key in local_storage) delete local_storage[key] ;
            for (key in ls) local_storage[key] = ls[key] ;
            ls_save() ;
            // callback. for example client_logout
            if (cb) cb(null) ;
        }; // onload
        try {
            reader.readAsText(file);
        }
        catch (err) {
            error = 'import failed: ' + err.message ;
            console.log(pgm + error) ;
            if (cb) cb(error) ;
            return ;
        }
    } // ls_import

    // initialize array with public avatars from public/images/avatar
    var public_avatars = [] ;
    function load_public_avatars () {
        ZeroFrame.cmd("fileGet", ['content.json', false], function (res) {
            var pgm = module + '.load_public_avatars fileGet callback: ';
            if (res) res = JSON.parse(res) ;
            else res = { files: {} } ;
            for (var key in res.files) {
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
            tag: 'Online',
            value: last_online,
            privacy: 'Search',
            row: contact.search.length+1
        }) ;
    }




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
        // user authorization - see client_login
        login: {session: false, userid: false, compress: false, encrypt: false}, // enable/disable local log in. disabled: use password = ''
        key: {session: false, userid: true, compress: true, encrypt: true}, // random password - used for localStorage encryption
        password: {session: true, userid: false, compress: false, encrypt: false}, // session password in clear text
        passwords: {session: false, userid: false, compress: false, encrypt: false}, // array with hashed passwords. size = number of accounts
        prvkey: {session: false, userid: true, compress: true, encrypt: true}, // for encrypted user to user communication
        pubkey: {session: false, userid: true, compress: true, encrypt: false}, // for encrypted user to user communication (JSEncrypt)
        pubkey2: {session: false, userid: true, compress: true, encrypt: false}, // for encrypted user to user communication (ZeroNet CryptMessage plugin)
        userid: {session: true, userid: false, compress: false, encrypt: false}, // session userid (1, 2, etc) in clear text.
        guestid: {session: false, userid: false, compress: false, encrypt: false}, // guest userid (1, 2, etc). in clear text. Used for cleanup operation
        // user data
        user_info: {session: false, userid: true, compress: true, encrypt: true}, // array with user_info. See user sub page / userCtrl
        contacts: {session: false, userid: true, compress: true, encrypt: true}, // array with contacts. See contacts sub page / contactCtrl
        deleted_sha256: {session: false, userid: true, compress: true, encrypt: true}, // array with sender_sha256 addresses from deleted contacts
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
        f: {compress: 2, encrypt: 0, sequence: 0}, // compression 2, not used, LZMA level 1 asynchronous compression, not encrypted
        g: {compress: 2, encrypt: 1, sequence: 0}, // compression 2, not used, LZMA level 1 asynchronous compression, compress => encrypt
        h: {compress: 2, encrypt: 1, sequence: 1}, // compression 2, not used, LZMA level 1 asynchronous compression, encrypt => compress
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

        // console.log(pgm + 'key = ' + key + ', use_login = ' + use_login);
        if (use_login || !key_options.encrypt) return key_options;
        else {
            // not using local log in. disable localStorage encryption
            key_options = JSON.parse(JSON.stringify(key_options)) ;
            key_options.encrypt = false ;
            return key_options ;
        }
    } // get_local_storage_rule

    // cache getItem('login'). used in almost all get/set operations
    var use_login = true ;
    function use_login_changed() {
        use_login = JSON.parse(getItem('login')) ;
    }

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
        // strip empty fields from end of sha256 input
        while ((texts.length > 0) && (texts[texts.length - 1] == '')) texts.length = texts.length - 1;
        var text = texts.length == 0 ? '' : texts.join(',');
        var sha256 = CryptoJS.SHA256(text).toString(CryptoJS.enc.Latin1);
        // console.log(pgm + 'text = ' + text + ', sha256 = ' + sha256)
        return sha256;
    } // sha256

    // generate password - used as key for local storage encryption and used in client to client communication (symmetric encryption)
    function generate_random_password(length) {
        var character_set = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789![]{}#%&/()=?+-:;_-.@$|£';
        var password = [], index, char;
        for (var i = 0; i < length; i++) {
            index = Math.floor(Math.random() * character_set.length);
            char = character_set.substr(index, 1);
            password.push(char);
        }
        return password.join('');
    } // generate_random_password

    // post login. add/update pubkey2 (used in ZeroNet CryptMessage plugin)
    function get_cryptmessage_pubkey2 () {
        var pgm = module + '.get_cryptmessage_pubkey2: ' ;
        var old_pubkey2 = getItem('pubkey2') ;
        // get pubkey2 for this userid
        var userid = parseInt(getItem('userid')) ;
        ZeroFrame.cmd("userPublickey", [userid], function (pubkey2) {
            if (old_pubkey2 == pubkey2) return ;
            if (old_pubkey2) console.log(pgm + 'updating pubkey2. user must have switched ZeroNet certificate') ;
            setItem('pubkey2', pubkey2) ;
            ls_save() ;
        }); // userPublickey
    } // get_cryptmessage_pubkey2


    // client login (password from device_login_form form)
    // 0 = invalid password, > 0 : userid
    // use create_new_account = true to force create a new user account
    // support for more than one user account
    function client_login(password, create_new_account, keysize) {
        var pgm = module + '.client_login: ' ;
        var password_sha256, passwords_s, passwords_a, i, userid, crypt, pubkey, prvkey;
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
                get_cryptmessage_pubkey2() ;
                load_user_setup() ;
                return userid;
            }
        }
        // password was not found
        if (create_new_account) {
            // create new account
            if (keysize == 256) keysize = 1024 ; // user has selected cryptMessage. generate a 1024 JSEncrypt key anyway
            else if ([1024,2048,4096,8192].indexOf(keysize) == -1) keysize = 2048 ;
            // console.log(pgm + 'create new account. JSEncrypt keysize = ' + keysize);
            userid = passwords_a.length + 1; // sequence = number of user accounts in local storage
            // setup new account
            passwords_a.push(password_sha256);
            passwords_s = JSON.stringify(passwords_a);
            // generate key pair for client to client RSA encryption
            crypt = new JSEncrypt({default_key_size: keysize});
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
            get_cryptmessage_pubkey2() ;
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

    function change_password (old_password, new_password) {
        var password, userid, passwords, key, old_password_sha256, new_password_sha256, i  ;
        userid = parseInt(getItem('userid')) ;
        passwords = JSON.parse(getItem('passwords')) ;
        password = getItem('password') ;
        key = getItem('key') ;
        old_password_sha256 = sha256(old_password) ;
        new_password_sha256 = sha256(new_password) ;
        if (!userid) return 'Not logged in' ;
        if (password != old_password) return 'Invalid old password' ;
        if (passwords[userid-1] != old_password_sha256) return 'Invalid old password' ;
        for (i=0 ; i<passwords.length ; i++) {
            if (passwords[i] == new_password_sha256) return 'Invalid new password' ;
        }
        // ready to change password
        passwords[userid-1] = new_password_sha256 ;
        setItem('password', new_password) ;
        setItem('key', key) ;
        setItem('passwords', JSON.stringify(passwords)) ;
        ls_save() ;
        return null ;
    } // change_password

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
    var json_schemas = {};
    json_schemas['contact added'] = {
        "type": 'object',
        "title": 'Contact added message. Message with additional user information',
        "properties": {
            "msgtype": {"type": 'string', pattern: '^contact added$'},
            "search": {
                "type": 'array',
                "items": {
                    "type": 'object',
                    "properties": {
                        "tag": {"type": 'string'},
                        "value": {"type": 'string'},
                        "privacy": {"type": 'string', "pattern": '^(Public|Unverified)$'},
                    },
                    "required": ['tag', 'value', 'privacy'],
                    "additionalProperties": false
                }
            },
            "local_msg_seq": {"type": 'integer'},
            "sender_sha256": {"type": 'string', "pattern": '^[0-9a-f]{64}$'},
            "feedback": {
                "type": 'object',
                "properties": {
                    "received": {
                        "type": 'array',
                        "items": {"type": 'integer'},
                        "minItems": 1
                    },
                    "sent": {
                        "type": 'array',
                        "items": {"type": 'integer'},
                        "minItems": 1
                    }
                },
                "additionalProperties": false
            },
            "sent_at": {"type": 'integer'},
            "message_sha256": {"type": 'string', "pattern": '^[0-9a-f]{64}$'}
        },
        "required": ['msgtype', 'search'],
        "additionalProperties": false
    }; // contact added
    json_schemas['contact removed'] = {
        "type": 'object',
        "title": 'Contact removed message',
        "properties": {
            "msgtype": {"type": 'string', pattern: '^contact removed$'},
            "local_msg_seq": {"type": 'integer'},
            "sender_sha256": {"type": 'string', "pattern": '^[0-9a-f]{64}$'},
            "feedback": {
                "type": 'object',
                "properties": {
                    "received": {
                        "type": 'array',
                        "items": {"type": 'integer'},
                        "minItems": 1
                    },
                    "sent": {
                        "type": 'array',
                        "items": {"type": 'integer'},
                        "minItems": 1
                    }
                },
                "additionalProperties": false
            },
            "sent_at": {"type": 'integer'},
            "message_sha256": {"type": 'string', "pattern": '^[0-9a-f]{64}$'}
        },
        "required": ['msgtype'],
        "additionalProperties": false
    }; // contact added
    json_schemas['chat msg'] = {
        "type": 'object',
        "title": 'Send chat message to contact',
        "description": 'Message is required unless delete old chat message. old_local_msg_seq is reference to old chat message to be changed or deleted. Image must be base64uri. sent_at and message_sha256 are used when resending lost messages',
        "properties": {
            "msgtype": {"type": 'string', pattern: '^chat msg$'},
            "message": {"type": 'string'},
            "local_msg_seq": {"type": 'integer'},
            "sender_sha256": {"type": 'string', "pattern": '^[0-9a-f]{64}$'},
            "old_local_msg_seq": {"type": 'integer'},
            "image": {"type": ['string', 'boolean']},
            "feedback": {
                "type": 'object',
                "description": 'Feedback info. Has message been received? Normal chat, type integer, with local_msg_seq. Group chat, type string, with participant, local_msg_seq',
                "properties": {
                    "sent": {
                        "type": 'array',
                        "items": {"type": ['integer', 'string']},
                        "minItems": 1
                    },
                    "received": {
                        "type": 'array',
                        "items": {"type": ['integer', 'string']},
                        "minItems": 1
                    }
                },
                "additionalProperties": false
            },
            "sent_at": {"type": 'integer'},
            "message_sha256": {"type": 'string', "pattern": '^[0-9a-f]{64}$'}
        },
        "required": ['msgtype'],
        "additionalProperties": false
    };
    json_schemas['verify'] = {
        "type": 'object',
        "title": 'Send verification request to contact',
        "description": 'Message with sha256 encrypted password. Unencrypted password must be sent to contact in an other trusted communication channal (mail, socialnetwork or whatever)',
        "properties": {
            "msgtype": {"type": 'string', pattern: '^verify$'},
            "password_sha256": {"type": 'string', "pattern": '^[0-9a-f]{64}$'},
            "local_msg_seq": {"type": 'integer'},
            "sender_sha256": {"type": 'string', "pattern": '^[0-9a-f]{64}$'},
            "feedback": {
                "type": 'object',
                "properties": {
                    "received": {
                        "type": 'array',
                        "items": {"type": 'integer'},
                        "minItems": 1
                    },
                    "sent": {
                        "type": 'array',
                        "items": {"type": 'integer'},
                        "minItems": 1
                    }
                },
                "additionalProperties": false
            },
            "sent_at": {"type": 'integer'},
            "message_sha256": {"type": 'string', "pattern": '^[0-9a-f]{64}$'}
        },
        "required": ['msgtype', 'password_sha256'],
        "additionalProperties": false
    };
    json_schemas['verified'] = {
        "type": 'object',
        "title": 'Send verification response to contact',
        "properties": {
            "msgtype": {"type": 'string', pattern: '^verified$'},
            "password": {"type": 'string'},
            "local_msg_seq": {"type": 'integer'},
            "sender_sha256": {"type": 'string', "pattern": '^[0-9a-f]{64}$'},
            "feedback": {
                "type": 'object',
                "properties": {
                    "received": {
                        "type": 'array',
                        "items": {"type": 'integer'},
                        "minItems": 1
                    },
                    "sent": {
                        "type": 'array',
                        "items": {"type": 'integer'},
                        "minItems": 1
                    }
                },
                "additionalProperties": false
            },
            "sent_at": {"type": 'integer'},
            "message_sha256": {"type": 'string', "pattern": '^[0-9a-f]{64}$'}
        },
        "required": ['msgtype', 'password'],
        "additionalProperties": false
    };
    json_schemas['received'] = {
        "type": 'object',
        "title": 'Send receipt contact. Used for chat messages with image attachment',
        "properties": {
            "msgtype": {"type": 'string', pattern: '^received$'},
            "remote_msg_seq": {"type": 'integer'},
            "local_msg_seq": {"type": 'integer'},
            "sender_sha256": {"type": 'string', "pattern": '^[0-9a-f]{64}$'},
            "feedback": {
                "type": 'object',
                "properties": {
                    "received": {
                        "type": 'array',
                        "items": {"type": 'integer'},
                        "minItems": 1
                    },
                    "sent": {
                        "type": 'array',
                        "items": {"type": 'integer'},
                        "minItems": 1
                    }
                },
                "additionalProperties": false
            },
            "sent_at": {"type": 'integer'},
            "message_sha256": {"type": 'string', "pattern": '^[0-9a-f]{64}$'}
        },
        "required": ['msgtype', 'remote_msg_seq'],
        "additionalProperties": false
    };
    json_schemas['group chat'] = {
        "type": 'object',
        "title": 'Start group chat. Send group chat password to participants in chat',
        "properties": {
            "msgtype": {"type": 'string', pattern: '^group chat$'},
            "participants": {
                "type": 'array',
                "items": {"type": 'string', "pattern": '^[0-9a-f]{64}$'},
                "minItems": 1
            },
            "password": {"type": 'string'},
            "local_msg_seq": {"type": 'integer'},
            "sender_sha256": {"type": 'string', "pattern": '^[0-9a-f]{64}$'},
            "feedback": {
                "type": 'object',
                "properties": {
                    "received": {
                        "type": 'array',
                        "items": {"type": 'integer'},
                        "minItems": 1
                    },
                    "sent": {
                        "type": 'array',
                        "items": {"type": 'integer'},
                        "minItems": 1
                    }
                },
                "additionalProperties": false
            },
            "sent_at": {"type": 'integer'}
        },
        "required": ['msgtype', 'participants', 'password'],
        "additionalProperties": false
    };
    // two internal lost message notifications in UI. Not sent or received to/from other users
    json_schemas['lost msg'] = {
        "type": 'object',
        "title": 'Lost message notification in UI',
        "description": 'Lost message detected in feedback information. See add_feedback_info and receive_feedback_info',
        "properties": {
            "msgtype": {"type": 'string', pattern: '^lost msg$'},
            "local_msg_seq": {"type": 'integer'}
        },
        "required": ['msgtype', 'local_msg_seq'],
        "additionalProperties": false
    };
    json_schemas['lost msg2'] = {
        "type": 'object',
        "title": 'Lost message notification in UI',
        "description": 'Decrypt error when reading message. Happens for cryptMessage encrypted to an other ZeroNet certificate. User has switched certificate. See process_incoming_cryptmessage. cert_user_ids are possible ZeroNet certificates for decryption. Unique and res are original parameters for process_incoming_cryptmessage call',
        "properties": {
            "msgtype": {"type": 'string', pattern: '^lost msg2$'},
            "message_sha256": {"type": 'string', "pattern": '^[0-9a-f]{64}$'},
            "cert_user_ids": {
                "type": 'array',
                "items": {"type": 'string'},
                "minItems": 1
            },
            "unique_id": {"type": 'string', "pattern": '^[0-9a-f]{64}$'},
            "res": {
                "type": 'object'
            }
        },
        "required": ['msgtype', 'message_sha256', 'cert_user_ids', 'unique_id', 'res'],
        "additionalProperties": false
    };
    // user files:
    json_schemas['data.json'] = {
        "type": 'object',
        "title": 'User data.json file. User info, user search tags and user private messages',
        "properties": {
            "version": { "type": 'integer' },
            "users": {
                "type": 'array',
                "description": 'Array with localStorage users. Unique user user_seq used in data.json, status.json and in filenames for optional files',
                "items": {
                    "type": 'object',
                    "properties": {
                        "user_seq": { "type": 'integer'},
                        "pubkey": { "type": 'string'},
                        "pubkey2": { "type": 'string'},
                        "encryption": { "type": 'string', "pattern": '^(1|2)$'},
                        "avatar": { "type": ['string']},
                        "guest": { "type": 'boolean'}
                    },
                    "required": [ 'user_seq', 'pubkey', 'pubkey2', 'encryption'],
                    "additionalProperties": false
                },
                "minItems": 1
            },
            "search": {
                "type": 'array',
                "description": 'Array with public search tags (matching/searching for users)',
                "properties": {
                    "user_seq": { "type": 'integer'},
                    "tag": { "type": 'string'},
                    "value": { "type": 'string'}
                },
                "required": [ 'user_seq', 'tag', 'value'],
                "additionalProperties": false
            },
            "msg": {
                "type": 'array',
                "description": 'Array with encrypted messages. Cleanup rutine will delete old messages, received or not. key is public key encrypted random password. message encrypted with this random password. null key used for group chat',
                "properties": {
                    "user_seq": { "type": 'integer'},
                    "timestamp": { "type": 'integer'},
                    "receiver_sha256": { "type": 'string', "pattern": '^[0-9a-f]{64}$'},
                    "key": { "type": 'string'},
                    "message": { "type": 'string'},
                    "message_sha256": { "type": 'string', "pattern": '^[0-9a-f]{64}$'},

                },
                "required": ['user_seq', 'timestamp', 'receiver_sha256', 'message', 'message_sha256'],
                "additionalProperties": false
            }
        },
        "required": ['version', 'users'],
        "additionalProperties": false
    } ;
    json_schemas['status.json'] = {
        "type": 'object',
        "title": 'User status.json file. Last online timestamp. Can be disabled by user',
        "properties": {
            "version": { "type": 'integer' },
            "status": {
                "type": 'array',
                "items": {
                    "type": 'object',
                    "properties": {
                        "user_seq": { "type": 'integer'},
                        "timestamp": { "type": 'integer'}
                    },
                    "required": ['user_seq', 'timestamp'],
                    "additionalProperties": false
                },
                "minItems": 1
            }
        },
        "required": ['version', 'status'],
        "additionalProperties": false
    } ;
    // optional files:
    json_schemas['chat-file'] = {
        "type": 'object',
        "title": 'Optional file with unencrypted public chat',
        "description": 'filename: <to unix timestamp>-<from unix timestamp>-<user seq>.json. Timestamps (13 digits) for first and last message in msg array',
        "properties": {
            "version": { "type": 'integer' },
            "msg": {
                "type": 'array',
                "items": {
                    "type": 'object',
                    "properties": {
                        "user_seq": { "type": 'integer'},
                        "timestamp": { "type": 'integer' },
                        "message": { "type": 'string'},
                        "image": { "type": 'string'},
                        "storage": {
                            "type": 'object',
                            "description": 'encryption/compression flags for string fields in message. Only c1=LZString.compress is used in public chat files',
                            "properties": {
                                "message": { "type": 'string', "pattern": '^c1$'},
                                "image": { "type": 'string', "pattern": '^c1$'}
                            },
                            "additionalProperties": false
                        }
                    },
                    "required": ['user_seq', 'timestamp', 'message'],
                    "additionalProperties": false
                },
                "minItems": 1
            }
        },
        "required": ['version', 'msg'],
        "additionalProperties": false
    } ;
    json_schemas['image-file'] = {
        "type": 'object',
        "title": 'Optional file with encrypted image (private or group chat)',
        "description": 'filename: <unix timestamp>-<user seq>.json. Timestamp 13 digits = sent_at timestamp in encrypted message in msg array in data.json file. Same encryption password used for message and image',
        "properties": {
            "image": { "type": 'string'},
            "storage": {
                "type": 'object',
                "description": 'encryption/compression flags for image. c1=LZString.compress, e1=JSEncrypt, e2=cryptMessage. Comma to seperate multiple flags. Encryption must match encryption in message',
                "properties": {
                    "image": { "type": 'string'}
                },
                "additionalProperties": false
            }

        },
        "required": ['image', 'storage'],
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
            'unencrypted', 'encrypted', 'file_done', 'select', 'inbox', 'outbox', 'data_cleanup', 'no_pubkey',
            'edit_alias', 'feedback_info', 'lost_message', 'spam_filter', 'public_chat', 'infinite_scroll'];
        var i, key, debug_value, regexp ;
        for (i=0 ; i<debug_keys.length ; i++) {
            key = debug_keys[i] ;
            if (user_setup.debug[key]) debug_value = 'true' ;
            else debug_value = 'false' ;
            regexp = new RegExp(key, 'g');
            keys = keys.replace(regexp, debug_value) ;
        }
        // console.log(pgm + 'new keys = ' + keys);
        var regexp ;
        try {
            if (eval(keys)) {
                // shorten long strings. for example images
                regexp = new RegExp('"([^"]{500,}?)"','g');
                text = text.replace(regexp, function(match, $1, $2, offset, original) { return $1.substr(0,480) + '...' }) ;
                console.log(text) ;
            }
        }
        catch (err) {
            console.log(pgm + 'invalid call. keys = ' + keys + ', text = ' + text + ', error = ' + err.message) ;
        }
    } // debug

    // as JSON.stringify but shorten long message and image. Also used in debug
    function stringify (json) {
        var str = JSON.stringify(json) ;
        var regexp = new RegExp('"([^"]{500,}?)"','g');
        return str.replace(regexp, function(match, $1, $2, offset, original) { return $1.substr(0,480) + '...' }) ;
    }

    var fake_user_names = ["Annalise Glover", "Hollis Ortiz", "Bertha Schaefer", "Santino Grant", "Elbert Greenfelder",
        "Katharina Leffler", "Ernie Schroeder", "Layla Stracke", "Estevan Howell", "Bonnie Torp", "Nolan Bogisich",
        "Lisandro Walsh", "Colten Gislason", "Allen Davis", "Dayne Feest", "Santiago Ebert", "Bo Johnson", "Kelli Mraz",
        "Maritza Kling", "Antonette Donnelly", "Leanna Schuppe", "Melyna Heathcote", "Theo Bins", "Vernice Keebler",
        "Tressa Balistreri", "Frank Steuber", "Tiffany Bode", "Zion Zemlak", "Sabrina Bradtke", "Raphaelle Conroy",
        "Lizzie Bogisich", "Kaci Russel", "Josephine Ernser", "Stephania Cremin", "Alexane Gaylord", "Theo Adams",
        "Carmel Mayert", "Larissa Powlowski", "Gisselle Effertz", "Cordelia Boyer", "Josianne Beatty", "Jo Von",
        "Timothy Weissnat", "Neha Kerluke", "Dan Wiza", "Kelley Klein", "Demetris Morissette", "Jessika Leuschke",
        "Jena Runolfsdottir", "Willis Bradtke", "Gloria Fay", "Brandy Collier", "Brad Hahn", "Boris Klocko", "Ismael Yost",
        "Ramona Stroman", "Melba Schimmel", "Charlene Auer", "Lonny Denesik", "Geo Koss", "Oleta Bauch",
        "Anderson Runolfsdottir", "Harry Conn", "Yasmine Ward", "Neil Hahn", "Nolan Hilll", "Spencer Hagenes",
        "Leann VonRueden", "Ludie Ritchie", "Wayne Larson", "Nelle Batz", "Rosella Lynch", "London Oberbrunner",
        "Frederick Nienow", "Daphne Dietrich", "Maegan Keebler", "Woodrow Feil", "Stefan Wiza", "Lindsay Gibson",
        "Martina Larson", "Wendell Jacobi", "Libbie Rogahn", "Glenda Ryan", "Bethany Cassin", "Hannah Ryan",
        "Chaya Schmidt", "Nikita Nolan", "Vivian Moore", "Clemens Jast", "Emilia Hagenes", "Lilyan Shields",
        "Johann Jacobs", "Dandre Breitenberg", "Graciela Johnson", "Lera Swift", "Otho Reynolds", "Orrin Reynolds",
        "Theodora Bartoletti", "Annalise Gorczany", "Rubie Jacobson", "Gaetano Osinski", "Yvonne Heidenreich",
        "Diana Stoltenberg", "Andres Harris", "Randall Gibson", "Gust Donnelly", "Brandy Hayes", "Lew Stroman",
        "Ali Monahan", "Ralph Hessel", "Kennith Berge", "Bryon Graham", "Susan Corwin", "Tania Gerhold", "Ransom Abshire",
        "Kasey Denesik", "Tanya Corwin", "Lora Hahn", "Erna Gerhold"
    ];
    function get_fake_name() {
        var index = Math.floor(Math.random() * fake_user_names.length);
        return  fake_user_names[index] ;
    }

    // export helpers
    return {
        // local storage helpers
        get_public_avatars: get_public_avatars,
        get_last_online: get_last_online,
        set_last_online: set_last_online,
        use_login_changed: use_login_changed,
        getItem: getItem,
        getItemSize: getItemSize,
        setItem: setItem,
        removeItem: removeItem,
        ls_get: ls_get,
        ls_bind: ls_bind,
        ls_save: ls_save,
        ls_clear: ls_clear,
        utoa: utoa, atou: atou,
        ls_export: ls_export,
        ls_import: ls_import,
        getUserId: getUserId,
        client_login: client_login,
        client_logout: client_logout,
        change_password: change_password,
        delete_guest_account: delete_guest_account,
        generate_random_password: generate_random_password,
        encrypt: encrypt,
        decrypt: decrypt,
        compress1: compress1,
        decompress1: decompress1,
        validate_json: validate_json,
        load_user_setup: load_user_setup,
        debug: debug,
        stringify: stringify,
        get_fake_name: get_fake_name,
        sha256: sha256
    };
})();
// MoneyNetworkHelper end
