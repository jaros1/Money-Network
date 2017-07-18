//
//  API for MoneyNetwork <=> MoneyNetwork wallet communication
//  Requirements:
// - JSEncrypt: https://github.com/travist/jsencrypt
// - cryptMessage: ZeroNet build-in plugin
// - CryptoJS: code.google.com/p/crypto-js
//

// todo:
// - remove old messages / do not reprocess old messages after page reload / new connect
// - add logout message. MN => wallets & wallet => MN
// - timeout in request = logout for other session = close session.
//   timeout can also be a "server" fault (error in other session). can be verified with a simple ping
//   timeout in simple ping = closed session. OK simple ping = server fault in previous response
// - add remove_session message. No reason to listen for incoming messages from a closed session
// - remember user_path in ingoing messages. all ingoing messages should be from identical user_path.
//   changed hub or auth_address => new session handshake or restore required

// MoneyNetworkAPILib. Demon. Monitor and process incoming messages from other session(s)
var MoneyNetworkAPILib = (function () {

    var module = 'MoneyNetworkAPILib';

    // validate important objects
    // validate ZeroFrame. must have a cmd function
    function is_ZeroFrame (ZeroFrame) {
        if (!ZeroFrame) return false ;
        if (typeof ZeroFrame.cmd != 'function') return false ;
        return true ;
    }
    // validate MoneyNetworkAPI. must have [...] functions
    function is_MoneyNetworkAPI (encrypt) {
        var pgm = module + '.is_MoneyNetworkAPI: ' ;
        if (!encrypt) return false ;
        return encrypt instanceof MoneyNetworkAPI ;
    }
    // validate user_path format: merged-MoneyNetwork/<hub>/data/users/<auth_address>/
    var user_path_regexp ;
    (function(){
        var bitcoin_adr = '1[a-km-zA-HJ-NP-Z1-9]{25,34}' ;
        user_path_regexp = new RegExp('^merged-MoneyNetwork\/' + bitcoin_adr + '\/data\/users\/' + bitcoin_adr + '\/$') ;
    })() ;
    function is_user_path (user_path) {
        if (typeof user_path != 'string') return false ;
        return user_path.match(user_path_regexp) ;
    } // is_user_path

    // readonly. most config values in MoneyNetworkAPILib is readonly
    function readonly(options, property, old_value) {
        var pgm = module + '.init: ';
        var error ;
        if (!old_value || !options[property] || (old_value == options[property])) return ;
        error = pgm +
            'invalid call. ' + property + ' cannot be changed. ' +
            'old value was ' + old_value + '. new value is ' + options[property] ;
        throw error ;
    } // readonly

    var debug, ZeroFrame, process_message_cb, interval, optional, this_user_path;    // init: inject ZeroFrame API into this library.
    function config(options) {
        var pgm = module + '.init: ';
        var error, regexp ;
        if (options.hasOwnProperty('debug')) debug = options.debug; // true, string or false
        if (options.ZeroFrame) {
            // required. inject ZeroFrame API into demon process
            if (!is_ZeroFrame(options.ZeroFrame)) throw pgm + 'invalid call. options.ZeroFrame is not a ZeroFrame API object' ;
            ZeroFrame = options.ZeroFrame;
        }
        if (options.cb) {
            // generic callback to handle all incoming messages. use wait_for_file to add callback for specific incoming messages and use add_session to add callback for a specific sessionid
            if (typeof options.cb != 'function') throw pgm + 'invalid call. options.cb is not a function' ;
            process_message_cb = options.cb;
        }
        if (options.interval) {
            // milliseconds between each demon check (dbQuery call). default 500 milliseconds between each check
            if (typeof options.interval != 'number') throw pgm + 'invalid call. options.interval is not a number' ;
            if (options.interval < 100) options.interval = 100 ;
            interval = options.interval;
        }
        if (options.optional) {
            // optional files pattern. add only if MoneyNetworkAPI should ensure optional files support in content.json file before sending message to other session
            if (typeof options.optional != 'string') throw pgm + 'invalid call. options.optional is not a string' ;
            readonly(options, 'optional', optional) ;
            try { regexp = new RegExp(options.optional)}
            catch (e) { throw pgm + 'invalid call. options.optional is an invalid regular expression' }
            optional = options.optional;
        }
        if (options.this_user_path) {
            // full merger site user path "merged-MoneyNetwork/<hub>/data/users/<auth_address>/". ZeroNet user login required.
            if (!is_user_path(options.this_user_path)) throw pgm + 'invalid call. options.this_user_path is not a valid user path. please use "merged-MoneyNetwork/<hub>/data/users/<auth_address>/" as user_path' ;
            readonly(options, 'this_user_path', this_user_path) ;
            this_user_path = options.this_user_path ;
            if (ZeroFrame) {
                ZeroFrame.cmd("siteInfo", {}, function (site_info) {
                    var regexp ;
                    if (!this_user_path) return ; // OK. reset duing siteInfo request
                    if (!site_info.auth_address) {
                        this_user_path = null ;
                        throw pgm + 'invalid call. options.this_user_path must be null for a not logged in user' ;
                    }
                    regexp = new RegExp('\/' + site_info.auth_address + '\/$') ;
                    if (!this_user_path.match(regexp)) {
                        error = pgm + 'invalid call. auth_address in options.this_user_path is not correct. this_user_path = ' + this_user_path + '. site_info.auth_address = ' + site_info.auth_address
                        this_user_path = null ;
                        throw error ;
                    }
                }); // siteInfo callback
            }
        }
    } // init

    // check if ZeroFrame has been injected into this library
    function get_ZeroFrame() {
        return ZeroFrame;
    } // get_ZeroFrame

    // check if optional pattern has been injected into this library
    function get_optional() {
        return optional ;
    }
    // check if user_path has been injected into this library
    function get_this_user_path() {
        return this_user_path ;
    }

    // wallet:
    // - false; MoneyNetwork, site_address !=  1JeHa67QEvrrFpsSow82fLypw8LoRcmCXk
    // - true: MoneyNetwork wallet. site_address == '1JeHa67QEvrrFpsSow82fLypw8LoRcmCXk
    // used for this_session_filename, other_session_filename, send_message, demon etc
    var wallet; // null, x, true or false
    var get_wallet_cbs = []; // callbacks waiting for get_wallet response
    function get_wallet(cb) {
        var pgm = module + '.get: ';
        if (!ZeroFrame) throw pgm + 'ZeroFrame is missing. Please use ' + module + '.init({ZeroFrame:xxx}) to inject ZeroFrame API into this library';
        if (!cb) cb = function () {};
        if (wallet == 'x') {
            // wait. first get_wallet request is executing
            get_wallet_cbs.push(cb);
            return;
        }
        if ([true, false].indexOf(wallet) != -1) return cb(wallet); // ready
        // first get_wallet request. check site address and set wallet = true or false. x while executing
        wallet = 'x';
        ZeroFrame.cmd("siteInfo", {}, function (site_info) {
            wallet = (site_info.address != '1JeHa67QEvrrFpsSow82fLypw8LoRcmCXk');
            cb(wallet);
            while (get_wallet_cbs.length) {
                cb = get_wallet_cbs.shift();
                cb(wallet)
            }
        });
    } // get_wallet

    // add session to watch list, First add session call will start a demon process checking for incoming messages
    // - session: hash with session info or api client returned from new MoneyNetworkAPI() call
    // - optional cb: function to handle incoming message. cb function must be supplied in init or
    var sessions = {}; // other session filename => session info
    var done = {}; // filename => cb or true. cb: callback waiting for file. true: processed
    // options:
    // - cb: session level callback function to handle incoming messages for this sessionide
    // - encrypt: MoneyNetworkAPI instance for this sessionid. Used for encrypt and decrypt. injected into callback function
    function add_session(sessionid, options) {
        var pgm = module + '.add_session: ';
        var cb, encrypt, sha256, other_session_filename, start_demon;
        if (typeof sessionid != 'string') throw pgm + 'invalid call. param 1 sessionid must be a string' ;
        if (!options) options = {} ;
        if (typeof options != 'object') throw pgm + 'invalid call. param 2 options must be an object' ;
        cb = options.cb ;
        encrypt = options.encrypt ;
        if (cb && (typeof cb != 'function')) throw pgm + 'invalid call. param 2 options.cb must be null or a callback function to handle incoming messages' ;
        if (encrypt && !is_MoneyNetworkAPI(encrypt)) throw pgm + 'invalid call. param 2 options.encrypt must be null or an instance of MoneyNetworkAPI' ;
        sha256 = CryptoJS.SHA256(sessionid).toString();
        get_wallet(function (wallet) {
            other_session_filename = wallet ? sha256.substr(0, 10) : sha256.substr(sha256.length - 10);
            if (debug) console.log(pgm + 'sessionid = ' + sessionid + ', sha256 = ' + sha256 + ', wallet = ' + wallet + ', other_session_filename = ' + other_session_filename);
            // if (sessions[other_session_filename]) return null; // known sessionid
            start_demon = (Object.keys(sessions).length == 0);
            if (!sessions[other_session_filename]) {
                console.log(pgm + 'monitoring other_session_filename ' + other_session_filename);
                sessions[other_session_filename] = {sessionid: sessionid, session_at: new Date().getTime()};
            }
            if (cb) sessions[other_session_filename].cb = cb ;
            if (encrypt) sessions[other_session_filename].encrypt = encrypt ;
            if (start_demon) {
                demon_id = setInterval(demon, (interval || 500));
                if (debug) console.log(pgm + 'Started demon. process id = ' + demon_id);
            }
        }); // get_wallet callback
    } // add_session

    // return cb(true) if demon is monitoring incoming messages for sessionid
    function is_session(sessionid, cb) {
        var pgm = module + '.add_session: ';
        var sha256, other_session_filename;
        sha256 = CryptoJS.SHA256(sessionid).toString();
        get_wallet(function (wallet) {
            other_session_filename = wallet ? sha256.substr(0, 10) : sha256.substr(sha256.length - 10);
            cb(sessions[other_session_filename] ? true : false);
        });
    } // is_session

    // register callback to handle incoming message with this filename
    function wait_for_file(request, response_filename, timeout_at, cb) {
        var pgm = module + '.wait_for_message: ';
        var session_filename ;
        // check parameters
        if (typeof request != 'object') throw pgm + 'invalid call. expected param 1 request to be an object (json). request = ' + JSON.stringify(request);
        if (!request.msgtype) throw pgm + 'invalid call. expected param 1 request to have a msgtype. request = ' + JSON.stringify(request);
        if (typeof response_filename != 'string') throw pgm + 'invalid call. expected param 2 response_filename to be a string. response_filename = ' + JSON.stringify(response_filename);
        if (!response_filename.match(/^[0-9a-f]{10}\.[0-9]{13}/)) throw pgm + 'invalid call. invalid param 2 response_filename = ' + response_filename + '. invalid format';
        session_filename = response_filename.substr(0,10) ;
        if (!sessions[session_filename]) throw pgm + 'invalid call. invalid param 2 response_filename = ' + response_filename + '. unknown other session filename ' + session_filename;
        if (timeout_at && (typeof timeout_at != 'number')) throw pgm + 'invalid call. invalid param 3 timeout 3 = ' + JSON.stringify(timeout_at);
        if (cb && (typeof cb != 'function')) throw pgm + 'invalid call. invalid param 4 cb. expected a function. cb = ' + JSON.stringify(cb);
        if (done[response_filename]) return 'Error. ' + response_filename + ' already done or callback object already defined';
        if (!timeout_at) timeout_at = (new Date().getTime()) + 30000;
        if (!cb) cb = function () {}; // ignored message (read by an other process)
        done[response_filename] = {request: request, timeout_at: timeout_at, cb: cb};
        if (debug) console.log(pgm + 'added a callback function for ' + response_filename + '. waiting request is ' + JSON.stringify(request));
        return null;
    } // wait_for_file

    var demon_id;

    function demon() {
        var pgm = module + '.demon: ';
        var filename, query, session_filename, first, now;
        // check for expired callbacks
        now = new Date().getTime();
        for (filename in done) {
            if (done[filename] == true) continue;
            if (done[filename].timeout_at > now) continue;
            console.log(pgm + 'timeout. running callback for ' + filename);
            try {
                done[filename].cb({error: 'Timeout while waiting for ' + filename + '. request was ' + JSON.stringify(done[filename].request)});
            }
            catch (e) {
                console.log(pgm + 'Error when processing incomming message ' + filename + '. error = ' + e.message + '. request was ' + JSON.stringify(done[filename].request))
            }
            done[filename] = true;
        } // for i
        // find any new messages
        first = true;
        query =
            "select json.directory, files_optional.filename " +
            "from files_optional, json " +
            "where ";
        for (session_filename in sessions) {
            query += first ? "(" : " or ";
            query += "files_optional.filename like '" + session_filename + ".%'";
            first = false ;
        }
        query +=
            ") and json.json_id = files_optional.json_id " +
            "order by substr(files_optional.filename, 12)";
        if (first) {
            console.log(pgm + 'error. no sessions were found');
            clearInterval(demon_id);
            return;
        }
        // if (debug) console.log(pgm + 'query = ' + query) ;
        ZeroFrame.cmd("dbQuery", [query], function (res) {
            var pgm = module + '.demon dbQuery callback: ';
            var i, directory, filename, session_filename, cb, other_user_path, inner_path, encrypt;
            if (res.error) {
                console.log(pgm + 'query failed. error = ' + res.error);
                console.log(pgm + 'query = ' + query);
                clearInterval(demon_id);
                return;
            }
            if (!res.length) return;
            // process new incoming messages
            for (i = 0; i < res.length; i++) {
                directory = res[i].directory;
                filename = res[i].filename;
                session_filename = filename.substr(0,10) ;
                if (done[filename] == true) continue; // already done
                encrypt = sessions[session_filename].encrypt ;
                other_user_path = 'merged-MoneyNetwork/' + directory + '/' ;
                inner_path = other_user_path + filename;
                if (!encrypt.other_user_path) encrypt.setup_encryption({other_user_path: other_user_path}) ;
                if (other_user_path != encrypt.other_user_path) {
                    console.log(pgm + 'Rejected incoming message ' + inner_path + '. Expected incoming messages for this session to come from ' + encrypt.other_user_path) ;
                    done[filename] = true;
                    continue ;
                }
                if (done[filename]) cb = done[filename].cb ; // message level callback
                else if (sessions[session_filename].cb) cb = sessions[session_filename].cb ; // session level callback
                else cb = process_message_cb; // generic callback
                if (!cb) {
                    console.log(pgm + 'Error when processing incomming message ' + inner_path + '. No process callback found');
                    done[filename] = true;
                    continue;
                }
                // execute callback. inject MoneyNetworkAPI instance into callback method
                try {
                    cb(inner_path, encrypt)
                }
                catch (e) {
                    console.log(pgm + 'Error when processing incomming message ' + inner_path + '. error = ' + e.message)
                }
                // done.
                done[filename] = true;
            } // for i

        }); // dbQuery callback

    } // demon

    // symmetric encrypt/decrypt helpers
    function aes_encrypt(text, password) {
        var output_wa;
        output_wa = CryptoJS.AES.encrypt(text, password, {format: CryptoJS.format.OpenSSL}); //, { mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.AnsiX923, format: CryptoJS.format.OpenSSL });
        return output_wa.toString(CryptoJS.format.OpenSSL);
    } // aes_encrypt
    function aes_decrypt(text, password) {
        var output_wa;
        output_wa = CryptoJS.AES.decrypt(text, password, {format: CryptoJS.format.OpenSSL}); // , { mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.AnsiX923, format: CryptoJS.format.OpenSSL });
        return output_wa.toString(CryptoJS.enc.Utf8);
    } // aes_decrypt

    // export MoneyNetworkAPILib
    return {
        config: config,
        get_ZeroFrame: get_ZeroFrame,
        get_optional: get_optional,
        get_this_user_path: get_this_user_path,
        is_user_path: is_user_path,
        get_wallet: get_wallet,
        is_session: is_session,
        add_session: add_session,
        wait_for_file: wait_for_file,
        aes_encrypt: aes_encrypt,
        aes_decrypt: aes_decrypt
    };

})(); // MoneyNetworkAPILib

// MoneyNetworkAPI

// constructor. setup encrypted session between MN and wallet.
// see also MoneyNetworkAPILib.config and MoneyNetworkAPI.setup_encryption
// multiple setup calls are allowed but some values cannot be changed for an existing session
// - debug: true, false or a string (=true). extra messages in browser console for this session
// - ZeroFrame: inject ZeroNet ZeroFrame API class into MoneyNetworkAPI
// - sessionid: a random string. a secret shared between MN and wallet session. used for encryption, session filenames and unlock pwd2 password
// - pubkey (JSEncrypt) and pubkey2 (cryptMessage). Other session public keys for encryption
// - prvkey (JSEncrypt) and userid2 (cryptMessage). This session private keys for encryption
// - this_user_path and other_user_path. full merger site user path string "merged-MoneyNetwork/<hub>/data/users/<auth_address>/"
// - optional. optional files pattern to be added to user content.json file (new users).
// - cb. callback function to process incoming messages for this session
var MoneyNetworkAPI = function (options) {
    var pgm = 'new MoneyNetworkAPI: ';
    var missing_keys, key, prefix;
    options = options || {};
    this.module = 'MoneyNetworkAPI'; // for debug messages
    this.version = '0.0.1'; // very unstable
    this.debug = options.hasOwnProperty('debug') ? options.debug : false;
    // ZeroFrame API
    if (options.ZeroFrame) MoneyNetworkAPILib.config({ZeroFrame: options.ZeroFrame}) ;
    this.ZeroFrame = MoneyNetworkAPILib.get_ZeroFrame() ;
    // sessionid
    if (options.sessionid && (typeof options.sessionid != 'string')) throw pgm + 'invalid call. options.sessionid must be a string' ;
    this.sessionid = options.sessionid || null;
    // other session public keys
    this.other_session_pubkey = options.pubkey || null;
    this.other_session_pubkey2 = options.pubkey2 || null;
    // this session private keys
    this.this_session_prvkey = options.prvkey || null;    // JSEncrypt private key for this session (decrypt ingoing messages)
    this.this_session_userid2 = options.userid2 || 0;     // cryptMessage "userid" for this session (decrypt ingoing messages). default 0
    // user paths
    if (options.this_user_path) MoneyNetworkAPILib.config({user_path: options.this_user_path});
    this.this_user_path = MoneyNetworkAPILib.get_this_user_path() ;
    // user_path for other session. should be set after reading first incoming message for a new session. cannot change doing a session
    if (options.other_user_path && !MoneyNetworkAPILib.is_user_path(options.other_user_path)) throw pgm + 'invalid options.other_user_path' ;
    this.other_user_path = options.other_user_path ;
    // optional files pattern. add if MoneyNetworkAPI should add optional files support in content.json file before sending message to other session
    this.this_optional = options.optional;
    if (this.this_optional) MoneyNetworkAPILib.config({optional: this.this_optional});
    this.this_optional = MoneyNetworkAPILib.get_optional() ;
    // optional callback function process incoming messages for this session
    this.cb = options.cb ;
    if (this.sessionid) {
        // monitor incoming messages for this sessionid.
        MoneyNetworkAPILib.add_session(this.sessionid, {encrypt: this, cb: this.cb}) ;
    }
    else {
        // unknown sessionid. used for get_password message (session restore)
        if (options.this_session_filename) this.this_session_filename = options.this_session_filename;
        if (options.other_session_filename) this.other_session_filename = options.other_session_filename;
    }
    if (!this.debug) return;
    // debug: check encryption setup status:
    missing_keys = [];
    for (key in this) {
        if (['sessionid', 'other_session_pubkey', 'other_session_pubkey2', 'this_session_prvkey', 'this_session_userid2'].indexOf(key) == -1) continue;
        if (this[key] == null) missing_keys.push(key);
        // else if (this.debug) console.log(pgm + key + ' = ' + this[key]) ;
    }
    prefix = this.debug == true ? '' : this.debug + ': ';
    if (missing_keys.length == 0) console.log(pgm + prefix + 'Encryption setup done');
    else console.log(pgm + prefix + 'Encryption setup: waiting for ' + missing_keys.join(', '));
}; // MoneyNetworkAPI

MoneyNetworkAPI.prototype.log = function (pgm, text) {
    var prefix;
    if (!this.debug) return;
    prefix = this.debug == true ? '' : this.debug + ': ';
    console.log(pgm + prefix + text);
}; // log

// map external and internal property names
MoneyNetworkAPI.prototype.internal_property = function (external_property) {
    if (external_property == 'pubkey') return 'other_session_pubkey' ;
    else if (external_property == 'pubkey2') return 'other_session_pubkey2' ;
    else if (external_property == 'optional') return 'this_optional' ;
    else return external_property ;
} ; // internal_property

// readonly. most values in a MoneyNetworkAPI instance are readonly and cannot be changed
MoneyNetworkAPI.prototype.readonly = function (options, options_property) {
    var pgm = this.module + '.setup_encryption: ';
    var self_property, error ;
    self_property = this.internal_property(options_property) ;
    if (!self[self_property] || !options[options_property] || (self[self_property] == options[options_property])) return ;
    error = pgm +
        'invalid call. ' + options_property + ' cannot be changed. ' +
        'please use new MoneyNetworkAPI to initialize a new instance with new ' + options_property + '. ' +
        'old value was ' + self[self_property] + '. new value is ' + options[options_property] ;
    throw error ;
}; // readonly

// setup encrypted session between MN and wallet.
// see also MoneyNetworkAPILib.config and MoneyNetworkAPI.constructor
// multiple setup calls are allowed but some values cannot be changed for an existing session
// - debug: true, false or a string (=true). extra messages in browser console for this session
// - ZeroFrame: inject ZeroNet ZeroFrame API class into MoneyNetworkAPI
// - sessionid: a random string. a secret shared between MN and wallet session. used for encryption, session filenames and unlock pwd2 password
// - pubkey (JSEncrypt) and pubkey2 (cryptMessage). Other session public keys for encryption
// - prvkey (JSEncrypt) and userid2 (cryptMessage). This session private keys for encryption
// - this_user_path and other_user_path. full merger site user path string "merged-MoneyNetwork/<hub>/data/users/<auth_address>/"
// - optional. optional files pattern to be added to user content.json file (new users).
// - cb. callback function to process incoming messages for this session
MoneyNetworkAPI.prototype.setup_encryption = function (options) {
    var pgm = this.module + '.setup_encryption: ';
    var self, is_new_sessionid, key, missing_keys, error;
    self = this ;
    if (options.hasOwnProperty('debug')) this.debug = options.debug;
    // ZeroFrame API
    if (options.ZeroFrame) MoneyNetworkAPILib.config({ZeroFrame: options.ZeroFrame}) ;
    else if (!this.ZeroFrame) this.ZeroFrame = MoneyNetworkAPILib.get_ZeroFrame() ;
    // sessionid
    if (options.sessionid) {
        self.readonly(options,'sessionid') ;
        is_new_sessionid = !this.sessionid  ; // call add_session. monitor incoming messages for this sessionid
        this.sessionid = options.sessionid;
    }
    // other session public keys
    if (options.pubkey) {
        self.readonly(options,'pubkey') ;
        this.other_session_pubkey = options.pubkey;
    }
    if (options.pubkey2) {
        self.readonly(options,'pubkey2') ;
        this.other_session_pubkey2 = options.pubkey2;
    }
    // this session private keys
    if (options.prvkey) {
        self.readonly(options,'prvkey') ;
        this.this_session_prvkey = options.prvkey;
    }
    if (options.hasOwnProperty('userid2')) {
        self.readonly(options,'userid2') ;
        this.this_session_userid2 = options.userid2;
    }
    if (options.this_user_path) {
        self.readonly(options,'this_user_path') ;
        this.this_user_path = options.this_user_path;
        MoneyNetworkAPILib.config({user_path: this.this_user_path})
    }
    // user paths. full merger site paths
    if (!this.this_user_path) this.this_user_path = MoneyNetworkAPILib.get_this_user_path() ;
    if (options.other_user_path) {
        if (!MoneyNetworkAPILib.is_user_path(options.other_user_path)) throw pgm + 'invalid options.other_user_path' ;
        self.readonly(options,'other_user_path') ;
        this.other_user_path = options.other_user_path ;
    }
    // optional files pattern. add if API should add optional files support in content.json file before sending message to other session
    if (options.optional) MoneyNetworkAPILib.config({optional: this.optional}) ;
    else if (!this.this_optional) this.this_optional = MoneyNetworkAPILib.get_optional() ;
    if (options.cb) this.cb = options.cb ;
    if (this.sessionid) {
        // known sessionid. new or old session
        if (is_new_sessionid) {
            // monitor incoming messages for this sessionid. cb. optional session level callback function to handle incoming messages for this sessionid
            MoneyNetworkAPILib.add_session(this.sessionid, {encrypt: this, cb: this.cb}) ;
        }
    }
    else {
        // unknown sessionid. restoring old session. used for get_password message (session restore)
        if (options.this_session_filename) this.this_session_filename = options.this_session_filename;
        if (options.other_session_filename) this.other_session_filename = options.other_session_filename;
    }
    if (!this.debug) return;
    // debug: check encryption setup status:
    missing_keys = [];
    for (key in this) {
        if (['sessionid', 'other_session_pubkey', 'other_session_pubkey2', 'this_session_prvkey', 'this_session_userid2'].indexOf(key) == -1) continue;
        if (this[key] == null) missing_keys.push(key);
    }
    if (missing_keys.length == 0) this.log(pgm, 'Encryption setup done');
    else this.log(pgm, 'Encryption setup: waiting for ' + missing_keys.join(', '));
}; // setup_encryption

// get session filenames for MN <=> wallet communication
MoneyNetworkAPI.prototype.get_session_filenames = function (cb) {
    var pgm = this.module + '.get_session_filenames: ' ;
    var self;
    self = this;
    if (!this.sessionid) {
        // no sessionid. must part of a session restore call
        return cb(this.this_session_filename, this.other_session_filename, null);
    }
    else {
        // session. find filenames and unlock password from sha256 signature
        MoneyNetworkAPILib.get_wallet(function (wallet) {
            var sha256, moneynetwork_session_filename, wallet_session_filename;
            sha256 = CryptoJS.SHA256(self.sessionid).toString();
            moneynetwork_session_filename = sha256.substr(0, 10); // first 10 characters of sha256 signature
            wallet_session_filename = sha256.substr(sha256.length - 10); // last 10 characters of sha256 signature
            self.this_session_filename = wallet ? wallet_session_filename : moneynetwork_session_filename;
            self.other_session_filename = wallet ? moneynetwork_session_filename : wallet_session_filename;
            self.unlock_pwd2 = sha256.substr(27, 10); // for restore session. unlock pwd2 password in get_password request
            self.log(pgm, 'wallet = ' + wallet + ', this_session_filename = ' + self.this_session_filename + ', other_session_filename = ' + self.other_session_filename) ;
            cb(self.this_session_filename, self.other_session_filename, self.unlock_pwd2);
        }); // get_wallet
    }
}; // get_session_filenames

MoneyNetworkAPI.prototype.generate_random_string = function (length, use_special_characters) {
    var character_set = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    if (use_special_characters) character_set += '![]{}#%&/()=?+-:;_-.@$|£';
    var string = [], index, char;
    for (var i = 0; i < length; i++) {
        index = Math.floor(Math.random() * character_set.length);
        char = character_set.substr(index, 1);
        string.push(char);
    }
    return string.join('');
}; // generate_random_string

// 1: JSEncrypt encrypt/decrypt using pubkey/prvkey
MoneyNetworkAPI.prototype.encrypt_1 = function (clear_text_1, cb) {
    var pgm = this.module + '.encrypt_1: ';
    var password, encrypt, key, output_wa, encrypted_text, encrypted_array;
    this.log(pgm, 'other_session_pubkey = ' + this.other_session_pubkey);
    if (!this.other_session_pubkey) throw pgm + 'encrypt_1 failed. pubkey is missing in encryption setup';
    encrypt = new JSEncrypt();
    encrypt.setPublicKey(this.other_session_pubkey);
    password = this.generate_random_string(100, true);
    key = encrypt.encrypt(password);
    output_wa = CryptoJS.AES.encrypt(clear_text_1, password, {format: CryptoJS.format.OpenSSL}); //, { mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.AnsiX923, format: CryptoJS.format.OpenSSL });
    encrypted_text = output_wa.toString(CryptoJS.format.OpenSSL);
    encrypted_array = [key, encrypted_text];
    cb(JSON.stringify(encrypted_array));
}; // encrypt_1
MoneyNetworkAPI.prototype.decrypt_1 = function (encrypted_text_1, cb) {
    var pgm = this.module + 'decrypt_1: ';
    var encrypted_array, key, encrypted_text, encrypt, password, output_wa, clear_text;
    if (!this.this_session_prvkey) throw pgm + 'decrypt_1 failed. prvkey is missing in encryption setup';
    encrypted_array = JSON.parse(encrypted_text_1);
    key = encrypted_array[0];
    encrypted_text = encrypted_array[1];
    encrypt = new JSEncrypt();
    encrypt.setPrivateKey(this.this_session_prvkey);
    password = encrypt.decrypt(key);
    output_wa = CryptoJS.AES.decrypt(encrypted_text, password, {format: CryptoJS.format.OpenSSL}); // , { mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.AnsiX923, format: CryptoJS.format.OpenSSL });
    clear_text = output_wa.toString(CryptoJS.enc.Utf8);
    cb(clear_text)
}; // decrypt_1

// 2: cryptMessage encrypt/decrypt using ZeroNet cryptMessage plugin (pubkey2)
MoneyNetworkAPI.prototype.encrypt_2 = function (encrypted_text_1, cb) {
    var pgm = this.module + '.encrypt_2: ';
    var self = this;
    if (!this.ZeroFrame) throw pgm + 'encryption failed. ZeroFrame is missing in encryption setup';
    if (!this.other_session_pubkey2) throw pgm + 'encryption failed. Pubkey2 is missing in encryption setup';
    // 1a. get random password
    this.log(pgm, 'encrypted_text_1 = ' + encrypted_text_1 + '. calling aesEncrypt');
    this.ZeroFrame.cmd("aesEncrypt", [""], function (res1) {
        var password;
        password = res1[0];
        self.log(pgm, 'aesEncrypt OK. password = ' + password + '. calling eciesEncrypt');
        // 1b. encrypt password
        self.ZeroFrame.cmd("eciesEncrypt", [password, self.other_session_pubkey2], function (key) {
            self.log(pgm, 'self.other_session_pubkey2 = ' + self.other_session_pubkey2 + ', key = ' + key);
            // 1c. encrypt text
            self.log(pgm, 'eciesEncrypt OK. calling aesEncrypt');
            self.ZeroFrame.cmd("aesEncrypt", [encrypted_text_1, password], function (res3) {
                var iv, encrypted_text, encrypted_array, encrypted_text_2;
                self.log(pgm, 'aesEncrypt OK');
                // forward encrypted result to next function in encryption chain
                iv = res3[1];
                encrypted_text = res3[2];
                encrypted_array = [key, iv, encrypted_text];
                encrypted_text_2 = JSON.stringify(encrypted_array);
                self.log(pgm, 'encrypted_text_2 = ' + encrypted_text_2);
                cb(encrypted_text_2);
            }); // aesEncrypt callback 3
        }); // eciesEncrypt callback 2
    }); // aesEncrypt callback 1
}; // encrypt_2
MoneyNetworkAPI.prototype.decrypt_2 = function (encrypted_text_2, cb) {
    var pgm = this.module + '.decrypt_2: ';
    var self, encrypted_array, key, iv, encrypted_text;
    self = this;
    if (!this.ZeroFrame) throw pgm + 'decryption failed. ZeroFrame is missing in encryption setup';
    this.log(pgm, 'encrypted_text_2 = ' + encrypted_text_2);
    encrypted_array = JSON.parse(encrypted_text_2);
    key = encrypted_array[0];
    iv = encrypted_array[1];
    encrypted_text = encrypted_array[2];
    // 1a. decrypt key = password
    this.log(pgm, 'calling eciesDecrypt');
    this.ZeroFrame.cmd("eciesDecrypt", [key, this.this_session_userid2], function (password) {
        if (!password) throw pgm + 'key eciesDecrypt failed. key = ' + key + ', userid2 = ' + JSON.stringify(self.this_session_userid2);
        // 1b. decrypt encrypted_text
        self.log(pgm, 'eciesDecrypt OK. password = ' + password + ', calling aesDecrypt');
        self.ZeroFrame.cmd("aesDecrypt", [iv, encrypted_text, password], function (encrypted_text_1) {
            self.log(pgm, 'aesDecrypt OK. encrypted_text_1 = ' + encrypted_text_1);
            cb(encrypted_text_1);
        }); // aesDecrypt callback 2
    }); // eciesDecrypt callback 1
}; // decrypt_2

// 3: symmetric encrypt/decrypt using sessionid
MoneyNetworkAPI.prototype.encrypt_3 = function (encrypted_text_2, cb) {
    var pgm = this.module + '.encrypt_3: ';
    if (!this.sessionid) throw pgm + 'encrypt_3 failed. sessionid is missing in encryption setup';
    var encrypted_text_3;
    encrypted_text_3 = MoneyNetworkAPILib.aes_encrypt(encrypted_text_2, this.sessionid);
    cb(encrypted_text_3);
}; // encrypt_3
MoneyNetworkAPI.prototype.decrypt_3 = function (encrypted_text_3, cb) {
    var pgm = this.module + '.decrypt_3: ';
    var encrypted_text_2;
    if (!this.sessionid) throw pgm + 'decrypt_3 failed. sessionid is missing in encryption setup';
    encrypted_text_2 = MoneyNetworkAPILib.aes_decrypt(encrypted_text_3, this.sessionid);
    cb(encrypted_text_2)
}; // decrypt_3

// encrypt/decrypt json messages
// encryptions: integer or array of integers: 1 cryptMessage, 2 JSEncrypt, 3 symmetric encryption
MoneyNetworkAPI.prototype.encrypt_json = function (json, encryptions, cb) {
    var pgm = this.module + '.encrypt_json: ';
    var self, encryption;
    self = this;
    if (typeof encryptions == 'number') encryptions = [encryptions];
    if (encryptions.length == 0) return cb(json); // done
    encryption = encryptions.shift();
    if (encryption == 1) {
        this.log(pgm, 'this.other_session_pubkey = ' + this.other_session_pubkey);
        this.encrypt_1(JSON.stringify(json), function (encrypted_text) {
            json = {
                encryption: encryption,
                message: encrypted_text
            };
            self.encrypt_json(json, encryptions, cb);
        });
    }
    else if (encryption == 2) {
        this.log(pgm, 'this.other_session_pubkey2 = ' + this.other_session_pubkey2);
        this.encrypt_2(JSON.stringify(json), function (encrypted_text) {
            json = {
                encryption: encryption,
                message: encrypted_text
            };
            self.encrypt_json(json, encryptions, cb);
        });
    }
    else if (encryption == 3) {
        this.log(pgm, 'this.sessionid = ' + this.sessionid);
        this.encrypt_3(JSON.stringify(json), function (encrypted_text) {
            json = {
                encryption: encryption,
                message: encrypted_text
            };
            self.encrypt_json(json, encryptions, cb);
        });
    }
    else {
        console.log(pgm + 'Error. Unsupported encryption ' + encryption);
        return cb(json);
    }
}; // encrypt_json
MoneyNetworkAPI.prototype.decrypt_json = function (json, cb) {
    var pgm = this.module + '.decrypt_json: ';
    var self;
    self = this;
    if (!json.hasOwnProperty('encryption')) {
        if (json.msgtype != 'pubkeys') this.log(pgm, 'Warning. received unencrypted json message ' + JSON.stringify(json));
        cb(json);
    }
    else if (json.encryption == 1) {
        this.decrypt_1(json.message, function (decrypted_text) {
            var json;
            json = JSON.parse(decrypted_text);
            if (json.hasOwnProperty('encryption')) self.decrypt_json(json, cb);
            else cb(json); // done
        });
    }
    else if (json.encryption == 2) {
        this.decrypt_2(json.message, function (decrypted_text) {
            var json;
            json = JSON.parse(decrypted_text);
            if (json.hasOwnProperty('encryption')) self.decrypt_json(json, cb);
            else cb(json); // done
        });
    }
    else if (json.encryption == 3) {
        this.decrypt_3(json.message, function (decrypted_text) {
            var json;
            json = JSON.parse(decrypted_text);
            if (json.hasOwnProperty('encryption')) self.decrypt_json(json, cb);
            else cb(json); // done
        });
    }
    else {
        console.log(pgm + 'Unsupported encryption ' + json.encryption);
        return cb(json);
    }
}; // decrypt_json

// helper: get and write content.json file
MoneyNetworkAPI.prototype.get_content_json = function (cb) {
    var pgm = this.module + '.get_content_json: ';
    var self, inner_path;
    self = this;
    if (!this.this_user_path) this.this_user_path = MoneyNetworkAPILib.get_this_user_path() ;
    if (!this.this_user_path) return cb(); // error. user_path is required
    inner_path = this.this_user_path + 'content.json';
    // 1: fileGet
    this.ZeroFrame.cmd("fileGet", {inner_path: inner_path, required: false}, function (content_str) {
        var content, json_raw;
        if (content_str) {
            content = JSON.parse(content_str);
            return cb(content);
        }
        else content = {};
        if (!self.this_optional) return cb(content); // maybe an error but optional files support was not requested
        // 2: fileWrite (empty content.json file)
        // new content.json file and optional files support requested. write + sign + get
        json_raw = unescape(encodeURIComponent(JSON.stringify(content, null, "\t")));
        self.ZeroFrame.cmd("fileWrite", [inner_path, btoa(json_raw)], function (res) {
            var pgm = self.module + '.get_content_json fileWrite callback 2: ';
            self.log(pgm, 'res = ' + JSON.stringify(res));
            if (res != 'ok') return cb(); // error: fileWrite failed
            // 3: siteSign
            self.ZeroFrame.cmd("siteSign", {inner_path: inner_path}, function (res) {
                var pgm = self.module + '.get_content_json siteSign callback 3: ';
                self.log(pgm, 'res = ' + JSON.stringify(res));
                if (res != 'ok') return cb(); // error: siteSign failed
                // 4: fileGet
                self.ZeroFrame.cmd("fileGet", {inner_path: inner_path, required: true}, function (content_str) {
                    var content;
                    if (!content_str) return cb(); // error. second fileGet failed
                    content = JSON.parse(content_str);
                    cb(content);
                }); // fileGet callback 4
            }); // siteSign callback 3
        }); // fileWrite callback 2
    }); // fileGet callback 1
}; // get_content_json

// add optional files support to content.json file
MoneyNetworkAPI.prototype.add_optional_files_support = function (cb) {
    var pgm = this.module + '.add_optional_files_support: ';
    var self;
    self = this;
    if (!this.this_optional) return cb({}); // not checked. optional files support must be added by calling code
    // check ZeroNet state279
    if (!this.ZeroFrame) return cb({error: 'Cannot add optional files support to content.json. ZeroFrame is missing in setup'});
    if (!this.ZeroFrame.site_info) return cb({error: 'Cannot add optional files support to content.json. ZeroFrame is not finished loading'});
    if (!this.ZeroFrame.site_info.cert_user_id) return cb({error: 'Cannot add optional files support to content.json. No cert_user_id. ZeroNet certificate is missing'});
    if (!this.this_user_path) this.this_user_path = MoneyNetworkAPILib.get_this_user_path() ;
    if (!this.this_user_path) return cb({error: 'Cannot add optional files support to content.json. user_path is missing in setup'});
    // ready for checking/adding optional files support in/to content.json file
    // 1: get content.json. will create empty signed content.json if content.json is missing
    this.get_content_json(function (content) {
        var inner_path, json_raw;
        if (!content) return cb({error: 'fileGet content.json failed'});
        if (content.optional == self.this_optional) return cb({}); // optional files support already OK
        // add optional files support
        content.optional = self.this_optional;
        // 2: write content.json
        inner_path = self.this_user_path + 'content.json';
        json_raw = unescape(encodeURIComponent(JSON.stringify(content, null, "\t")));
        self.ZeroFrame.cmd("fileWrite", [inner_path, btoa(json_raw)], function (res) {
            var pgm = self.module + '.add_optional_files_support fileWrite callback 2: ';
            self.log(pgm, 'res = ' + JSON.stringify(res));
            if (res != 'ok') return cb({error: 'fileWrite failed. error = ' + res}); // error: fileWrite failed
            // 3: siteSign
            self.ZeroFrame.cmd("siteSign", {inner_path: inner_path}, function (res) {
                var pgm = self.module + '.add_optional_files_support siteSign callback 3: ';
                self.log(pgm, 'res = ' + JSON.stringify(res));
                if (res != 'ok') return cb({error: 'siteSign failed. error = ' + res}); // error: siteSign failed
                // optional files support added
                cb({});
            }); // siteSign callback 3
        }); // fileWrite callback 2
    }); // get_content_json callback 1
}; // add_optional_files_support

// Json schemas for json validation of ingoing and outgoing messages
MoneyNetworkAPI.json_schemas = {

    "pubkeys": {
        "type": 'object',
        "title": 'Send pubkeys (JSEncrypt and cryptMessage) to other session',
        "description": 'MoneyNetwork: sends unencrypted pubkeys message to Wallet without a session password. Wallet: returns an encrypted pubkeys message to MoneyNetwork including a session password. pubkey is public key from JSEncrypt. pubkey2 is public key from cryptMessage. Password used for session restore. See get_password and password messages',
        "properties": {
            "msgtype": {"type": 'string', "pattern": '^pubkeys$'},
            "pubkey": {"type": 'string'},
            "pubkey2": {"type": 'string'},
            "password": {"type": 'string'}
        },
        "required": ['msgtype', 'pubkey', 'pubkey2'],
        "additionalProperties": false
    }, // pubkeys

    "save_data": {
        "type": 'object',
        "title": 'Wallet: Save encrypted wallet data in MoneyNetwork',
        "description": "Optional message. Can be used to save encrypted data in an {key:value} object in MoneyNetwork localStorage.",
        "properties": {
            "msgtype": {"type": 'string', "pattern": '^save_data$'},
            "data": {
                "type": 'array',
                "items": {
                    "type": 'object',
                    "properties": {
                        "key": {"type": 'string'},
                        "value": {"type": 'string'}
                    },
                    "required": ['key'],
                    "additionalProperties": false
                },
                "minItems": 1
            }
        },
        "required": ['msgtype', 'data'],
        "additionalProperties": false
    }, // save_data

    "get_data": {
        "type": 'object',
        "title": 'Wallet: Get encrypted data from MoneyNetwork',
        "description": "Optional message. Can be used to request encrypted wallet data from MoneyNetwork localStorage",
        "properties": {
            "msgtype": {"type": 'string', "pattern": '^get_data$'},
            "keys": {
                "type": 'array',
                "items": {"type": 'string'},
                "minItems": 1
            }
        },
        "required": ['msgtype', 'keys'],
        "additionalProperties": false
    }, // get_data

    "data": {
        "type": 'object',
        "title": 'MoneyNetwork: get_data response to with requested encrypted wallet data',
        "description": "Optional message. Return requested encrypted data to wallet",
        "properties": {
            "msgtype": {"type": 'string', "pattern": '^data$'},
            "data": {
                "type": 'array',
                "items": {
                    "type": 'object',
                    "properties": {
                        "key": {"type": 'string'},
                        "value": {"type": 'string'}
                    },
                    "required": ['key'],
                    "additionalProperties": false
                }
            }
        }
    }, // data

    "delete_data": {
        "type": 'object',
        "title": 'Wallet: Delete encrypted data saved in MoneyNetwork',
        "description": "Optional message. Delete encrypted wallet data from MoneyNetwork localStorage. No keys property = delete all data",
        "properties": {
            "msgtype": {"type": 'string', "pattern": '^delete_data$'},
            "keys": {
                "type": 'array',
                "items": {"type": 'string'},
                "minItems": 1
            }
        },
        "required": ['msgtype'],
        "additionalProperties": false
    }, // delete_data

    "get_password": {
        "type": 'object',
        "title": 'Wallet: Restore old session. Request pwd2 from MN',
        "description": 'Pwd2 was sent to MN in first pubkeys message. Session restore. Unlock and return pwd2 to wallet session',
        "properties": {
            "msgtype": {"type": 'string', "pattern": '^get_password$'},
            "pubkey": {"type": 'string'},
            "pubkey2": {"type": 'string'},
            "unlock_pwd2": {"type": 'string'}
        },
        "required": ["msgtype", "pubkey", "pubkey2", "unlock_pwd2"],
        "additionalProperties": false
    }, // get_password

    "password": {
        "type": 'object',
        "title": 'MN: Restore old session. Return unlocked password pwd2 to wallet session',
        "properties": {
            "msgtype": {"type": 'string', "pattern": '^password$'},
            "password": {"type": 'string'}
        },
        "required": ["msgtype", "password"],
        "additionalProperties": false
    }, // password

    "response": {
        "type": 'object',
        "title": 'Generic response with an optional error message',
        "properties": {
            "msgtype": {"type": 'string', "pattern": '^response$'},
            "error": {"type": 'string'}
        },
        "required": ['msgtype'],
        "additionalProperties": false
    } // response

}; // json_schemas

// minimum validate json before encrypt & send and after receive & decrypt using https://github.com/geraintluff/tv4
// json messages between MoneyNetwork and MoneyNetwork wallet must be valid
// params:
// - calling_pgm: calling function. for debug messages
// - json: request or response
// - request_msgtype: request: null, response: request.msgtype
MoneyNetworkAPI.prototype.validate_json = function (calling_pgm, json, request_msgtype) {
    var pgm = this.module + '.validate_json: ';
    var json_schema, json_error;
    if (!json || !json.msgtype) return 'required msgtype is missing in json message';
    json_schema = MoneyNetworkAPI.json_schemas[json.msgtype];
    if (!json_schema) return 'Unknown msgtype ' + json.msgtype;
    if (request_msgtype) {
        // validate request => response combinations
        if (request_msgtype == 'response') return 'Invalid request msgtype ' + request_msgtype;
        if (!MoneyNetworkAPI.json_schemas[request_msgtype]) return 'Unknown request msgtype ' + request_msgtype;
        if (json.msgtype == 'response') null; // response OK for any request msgtype
        else if ((request_msgtype == 'pubkeys') && (json.msgtype == 'pubkeys')) null; // OK combination
        else if ((request_msgtype == 'get_data') && (json.msgtype == 'data')) null; // OK combination
        else if ((request_msgtype == 'get_password') && (json.msgtype == 'password')) null; // OK combination
        else return 'Invalid ' + request_msgtype + ' request ' + json.msgtype + ' response combination';
    }
    if (typeof tv4 === 'undefined') {
        this.log(pgm, 'warning. skipping ' + json.msgtype + ' json validation. tv4 is not defined');
        return;
    }
    // validate json
    if (tv4.validate(json, json_schema, pgm)) return null; // json is OK
    // report json error
    json_error = JSON.parse(JSON.stringify(tv4.error));
    delete json_error.stack;
    return 'Error in ' + json.msgtype + ' JSON. ' + JSON.stringify(json_error);
}; // validate_json

// send json message encrypted to other session and optional wait for response
// params:
// - json: message to send. should include a msgtype
// - options. hash with options for send_message operation
//   - response: wait for response? null, true, false or timeout (=true) in milliseconds
//   - timestamp: timestamp to be used in filename for outgoing message. Only used when sending receipts.
//   - msgtype: request msgtype. only used when sending response. Used for json validation
// - cb: callback. returns an empty hash, hash with an error messsage or response
MoneyNetworkAPI.prototype.send_message = function (request, options, cb) {
    var pgm = this.module + '.send_message: ';
    var self, response, timestamp, msgtype, encryptions, error, request_at, timeout_at, month, year;
    self = this;

    // get params
    if (!options) options = {};
    response = options.response;
    timestamp = options.timestamp;
    msgtype = options.msgtype;
    encryptions = options.hasOwnProperty('encryptions') ? options.encryptions : [1, 2, 3];
    if (typeof encryptions == 'number') encryptions = [encryptions];
    if (!cb) cb = function () {};

    // check setup
    // ZeroNet state
    if (!this.ZeroFrame) return cb({error: 'Cannot send message. ZeroFrame is missing in setup'});
    if (!this.ZeroFrame.site_info) return cb({error: 'Cannot send message. ZeroFrame is not finished loading'});
    if (!this.ZeroFrame.site_info.cert_user_id) return cb({error: 'Cannot send message. No cert_user_id. ZeroNet certificate is missing'});
    // Outgoing encryption
    if (!this.other_session_pubkey && (encryptions.indexOf(1) != -1)) return cb({error: 'Cannot JSEncrypt encrypt outgoing message. pubkey is missing in encryption setup'}); // encrypt_1
    if (!this.other_session_pubkey2 && (encryptions.indexOf(2) != -1)) return cb({error: 'Cannot cryptMessage encrypt outgoing message. Pubkey2 is missing in encryption setup'}); // encrypt_2
    if (!this.sessionid && (encryptions.indexOf(3) != -1)) return cb({error: 'Cannot symmetric encrypt outgoing message. sessionid is missing in encryption setup'}); // encrypt_3
    if (!this.this_user_path) this.this_user_path = MoneyNetworkAPILib.get_this_user_path() ;
    if (!this.this_user_path) return cb({error: 'Cannot send message. this_user_path is missing in setup'});
    if (response) {
        // Ingoing encryption
        if (!this.this_session_prvkey && (encryptions.indexOf(1) != -1) && (request.msgtype != 'get_password')) return cb({error: 'Cannot JSEncrypt decrypt expected ingoing receipt. prvkey is missing in encryption setup'}); // decrypt_1
        // decrypt_2 OK. cert_user_id already checked
        // decrypt_3 OK. sessionid already checked
    }

    // validate message. all messages are validated before send and after received
    // messages: pubkeys, save_data, get_data, delete_data
    error = this.validate_json(pgm, request, msgtype);
    if (error) {
        error = 'Cannot send message. ' + error;
        this.log(pgm, error);
        this.log(pgm, 'request = ' + JSON.stringify(request));
        return cb({error: error});
    }

    // receipt?
    request_at = new Date().getTime();
    if (response) {
        // receipt requested. wait for receipt. use a random timestamp 1 year ago as receipt filename
        if (typeof response == 'number') timeout_at = request_at + response;
        else timeout_at = request_at + 10000; // timeout = 10 seconds
        year = 1000 * 60 * 60 * 24 * 365.2425;
        month = year / 12;
        response = request_at - 11 * month - Math.floor(Math.random() * month * 2);
        request = JSON.parse(JSON.stringify(request));
        request.response = response;
    }

    // 1: get filenames
    this.get_session_filenames(function (this_session_filename, other_session_filename, unlock_pwd2) {
        var pgm = self.module + '.send_message get_session_filenames callback 1: ';

        // 2: encrypt json
        self.encrypt_json(request, encryptions, function (encrypted_json) {
            var pgm = self.module + '.send_message encrypt_json callback 2: ';
            self.log(pgm, 'encrypted_json = ' + JSON.stringify(encrypted_json));

            // 3: add optional files support
            self.add_optional_files_support(function (res) {
                var pgm = self.module + '.send_message add_optional_files_support callback 3: ';
                var inner_path3, json_raw;
                if (!res || res.error) return cb({error: 'Cannot send message. Add optional files support failed. ' + JSON.stringify(res)});
                // 4: write file
                inner_path3 = self.this_user_path + this_session_filename + '.' + (timestamp || request_at);
                json_raw = unescape(encodeURIComponent(JSON.stringify(encrypted_json, null, "\t")));
                self.log(pgm, 'writing optional file ' + inner_path3);
                self.ZeroFrame.cmd("fileWrite", [inner_path3, btoa(json_raw)], function (res) {
                    var pgm = self.module + '.send_message fileWrite callback 4: ';
                    var inner_path4;
                    self.log(pgm, 'res = ' + JSON.stringify(res));
                    // 5: siteSign. publish not needed for within client communication
                    inner_path4 = self.this_user_path + 'content.json';
                    self.log(pgm, 'sign content.json with new optional file ' + inner_path3);
                    self.ZeroFrame.cmd("siteSign", {inner_path: inner_path4}, function (res) {
                        var pgm = self.module + '.send_message siteSign callback 5: ';
                        self.log(pgm, 'res = ' + JSON.stringify(res));
                        if (!response) return cb({}); // exit. receipt was not requested.

                        // 6: is MoneyNetworkAPIDemon monitoring incoming messages for this sessionid?
                        MoneyNetworkAPILib.is_session(self.sessionid, function (is_session) {
                            var pgm = self.module + '.send_message is_session callback 6: ';
                            var get_and_decrypt, response_filename, error, query, wait_for_response;
                            self.log(pgm, 'is_session = ' + is_session);

                            // fileGet and json_decrypt
                            get_and_decrypt = function (inner_path) {
                                var pgm = self.module + '.send_message.get_and_decrypt: ';
                                if (typeof inner_path == 'object') {
                                    self.log(pgm, 'inner_path is an object. must be a timeout error returned from MoneyNetworkAPILib.wait_for_file function. inner_path = ' + JSON.stringify(inner_path)) ;
                                    return cb(inner_path);
                                }
                                self.ZeroFrame.cmd("fileGet", {inner_path: inner_path, required: true}, function (response_str) {
                                    var pgm = self.module + '.send_message.get_and_decrypt fileGet callback 6.1: ';
                                    var encrypted_response, error;
                                    if (!response_str) return cb({error: 'fileGet for receipt failed. Request was ' + JSON.stringify(request) + '. inner_path was ' + inner_path});
                                    encrypted_response = JSON.parse(response_str);
                                    // decrypt response
                                    self.decrypt_json(encrypted_response, function (response) {
                                        var pgm = self.module + '.send_message.get_and_decrypt decrypt_json callback 6.2: ';
                                        // validate response
                                        error = self.validate_json(pgm, response, request.msgtype);
                                        if (error) {
                                            error = request.msgtype + ' response is not valid. ' + error;
                                            self.log(pgm, error);
                                            self.log(pgm, 'request = ' + JSON.stringify(request));
                                            self.log(pgm, 'response = ' + JSON.stringify(response));
                                            return cb({error: error});
                                        }


                                        // return decrypted response
                                        self.log(pgm, 'response = ' + JSON.stringify(response));
                                        cb(response);
                                    }); // decrypt_json callback 6.2
                                }); // fileGet callback 6.1
                            }; // get_and_decrypt

                            response_filename = other_session_filename + '.' + response;
                            if (is_session) {
                                // demon is running and is monitoring incoming messages for this sessionid
                                error = MoneyNetworkAPILib.wait_for_file(request, response_filename, timeout_at, get_and_decrypt);
                                if (error) return cb({error: error});
                            }
                            else {
                                // demon is not running or demon is not monitoring this sessionid

                                // 7: wait for response. loop. wait until timeout_at
                                query =
                                    "select 'merged-MoneyNetwork' || '/' || json.directory || '/'   ||  files_optional.filename as inner_path " +
                                    "from files_optional, json " +
                                    "where files_optional.filename = '" + response_filename + "' " +
                                    "and json.json_id = files_optional.json_id";

                                // loop
                                wait_for_response = function () {
                                    var pgm = self.module + '.send_message.wait_for_response 7: ';
                                    var now;
                                    now = new Date().getTime();
                                    if (now > timeout_at) return cb({error: 'Timeout while waiting for response. Request was ' + JSON.stringify(request) + '. Expected response filename was ' + response_filename});
                                    // 7: dbQuery
                                    self.ZeroFrame.cmd("dbQuery", [query], function (res) {
                                        var pgm = self.module + '.send_message.wait_for_receipt dbQuery callback 8: ';
                                        var inner_path8;
                                        if (res.error) return cb({error: 'Wait for receipt failed. Json message was ' + JSON.stringify(request) + '. dbQuery error was ' + res.error});
                                        if (!res.length) {
                                            setTimeout(wait_for_response, 500);
                                            return;
                                        }
                                        inner_path8 = res[0].inner_path;
                                        // 8: get_and_decryt
                                        get_and_decrypt(inner_path8);

                                    }); // dbQuery callback 8
                                }; // wait_for_response 7
                                setTimeout(wait_for_response, 250);
                            }

                        }); // is_session callback callback 6
                    }); // siteSign callback 5 (content.json)
                }); // writeFile callback 4 (request)
            }); // add_optional_files_support callback 3
        }); // encrypt_json callback 2
    }); // get_filenames callback 1

}; // send_message

// end MoneyNetworkAPI class
