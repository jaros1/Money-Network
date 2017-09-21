//
//  API for MoneyNetwork <=> MoneyNetwork wallet communication
//  Requirements:
// - JSEncrypt: https://github.com/travist/jsencrypt
// - cryptMessage: ZeroNet build-in plugin
// - CryptoJS: code.google.com/p/crypto-js
//

// todo:
// - add logout message. MN => wallets & wallet => MN
// - timeout in request = logout for other session = close session.
//   timeout can also be a "server" fault (error in other session). can be verified with a simple ping
//   timeout in simple ping = closed session. OK simple ping = server fault in previous response
// - offline transactions. cleanup request when response is received
// - add done message. send list of done but not removed messages to other session
// - n-n session relations between MoneyNetwork and wallets? MoneyNetwork can have many wallets. A wallet can be used of many MoneyNetwork clones?
// - test offline transactions. for example a money transaction, send, receive, donate, pay, receive payment.
//   W2W transactions. Started by one MN user. Must by received by an other MN user
// - API handshake. MN and wallet sessions will normally use different MoneyNetworkAPI versions. validate all messages before send/after receive.
//   sessions must exchange list of supported/allowed messages.
//   json schema compare?
// - ping with permissions response? Or permissions check after wallet ping.
//   MN must know if send/receive money permission have been granted and if confirm transaction dialog is needed
// - wallet.json - add fee info. fee paid by sender, receiver or shared. fee added or subtracted from transaction amount
// - wallet.json - add external api url. for example https://www.blocktrail.com/api/docs for W2 (url er currency info)

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

    // this_user_path validation
    // 1: must be a user_path(is_user_path)
    // 2: readonly. not 100%. user can change ZeroId. OK but old MoneyNetworkAPI objects with old ZeroId must be destroyed
    // 3: user must be logged in and auth_address must be correct
    // should return true/false. maybe also in a cb function
    // should somethimes throw an error
    // should reset this_user_path after errors
    var this_user_path ;
    function set_this_user_path (user_path, options) {
        var cb, error, ok, other_session_filename, delete_sessions, i, encrypt ;
        if (!options) options = {} ;
        options = JSON.parse(JSON.stringify(options)) ;
        cb = typeof options.cb == 'function' ? options.cb : null ;
        error = function (text) {
            this_user_path = null ;
            if (cb) cb(text);
            if (options.throw) throw text ;
            return false ; // not working inside siteInfo callback
        };
        ok = function() {
            this_user_path = user_path ;
            if (cb) cb(null) ;
            return true ; // // not working inside siteInfo callback
        };
        if (!is_user_path(user_path)) return error('"' + user_path + '" is not a valid user path. please use "merged-MoneyNetwork/<hub>/data/users/<auth_address>/" as user_path') ;
        if (options.readonly) {
            // readonly inside a MoneyNetworkAPI instance.
            readonly({this_user_path: user_path}, 'this_user_path', this_user_path) ;
        }
        else if (this_user_path && (user_path != this_user_path)) {
            // this_user_path changing in MoneyNetworkAPILib. OK to change user_path for this session, but any MoneyNetworkAPI instance using old user path is now invalid and must be destroyed
            delete_sessions = [] ;
            for (other_session_filename in sessions) {
                if (!sessions[other_session_filename].encrypt) continue ;
                if (sessions[other_session_filename].encrypt.destroyed) continue ;
                if (sessions[other_session_filename].this_user_path != this_user_path) continue ;
                delete_sessions.push(other_session_filename) ;
            }
            for (i=0 ; i<delete_sessions.length ; i++) {
                other_session_filename = delete_sessions[i] ;
                encrypt = sessions[other_session_filename].encrypt ;
                delete sessions[other_session_filename] ;
                encrypt.destroy('this_user_path changed') ;
            }
            if (delete_sessions.length && !Object.keys(sessions).length) {
                window.clearTimeout(demon_id) ;
                demon_id = null ;
            }
            this_user_path = null ;
        }
        if (!ZeroFrame) return error('ZeroFrame is required. Please inject ZeroFrame into MoneyNetworkAPILib before setting this_user_path') ;
        // check auth_address in this_user_path
        if (!cb) options.throw = true ;
        // assuming new this_user_path is connect
        this_user_path = user_path ;
        ZeroFrame.cmd("siteInfo", {}, function (site_info) {
            var regexp ;
            if (!site_info.cert_user_id) {
                this_user_path = null ;
                return error('invalid call. options.this_user_path must be null for a not logged in user') ;
            }
            regexp = new RegExp('\/' + site_info.auth_address + '\/$') ;
            if (!user_path.match(regexp)) {
                this_user_path = null ;
                return error('invalid call. auth_address in options.this_user_path is not correct. this_user_path = ' + user_path + '. site_info.auth_address = ' + site_info.auth_address) ;;
            }
            return ok() ;
        }); // siteInfo callback
        return true ; // result not ready. assuming OK
    } // set_this_user_path

    // this_session_prvkey validation (JSEncrypt private key)
    // 1: readonly for old MoneyNetworkAPI instances
    // 2: OK to change in MoneyNetworkAPILib but any instance using old prvkey must be destroyed
    var this_session_prvkey ;
    function set_this_session_prvkey (prvkey) {
        var delete_sessions, other_session_filename, i, encrypt ;
        if (this_session_prvkey && (prvkey != this_session_prvkey)) {
            // 2: OK to change in MoneyNetworkAPILib but any instance using old prvkey must be destroyed
            delete_sessions = [] ;
            for (other_session_filename in sessions) {
                if (!sessions[other_session_filename].encrypt) continue ;
                if (sessions[other_session_filename].encrypt.destroyed) continue ;
                if (sessions[other_session_filename].this_session_prvkey != this_session_prvkey) continue ;
                delete_sessions.push(other_session_filename) ;
            }
            for (i=0 ; i<delete_sessions.length ; i++) {
                other_session_filename = delete_sessions[i] ;
                encrypt = sessions[other_session_filename].encrypt ;
                delete sessions[other_session_filename] ;
                encrypt.destroy('this_session_prvkey changed') ;
            }
            if (delete_sessions.length && !Object.keys(sessions).length) {
                window.clearTimeout(demon_id) ;
                demon_id = null ;
            }
        }
        this_session_prvkey = prvkey ;
    } // set_this_session_prvkey

    // this_session_userid2 validation (private userid for cryptMessage decrypt - sub private key)
    // 1: readonly for old MoneyNetworkAPI instances
    // 2: OK to change in MoneyNetworkAPILib but any instance using old prvkey must be destroyed
    var this_session_userid2 = null ;
    function set_this_session_userid2 (userid2) {
        var pgm = module + '.set_this_session_userid2: ' ;
        var delete_sessions, other_session_filename, i, encrypt ;
        if (userid2 == null) userid2 = 0 ;
        if (typeof userid2 == 'undefined') userid2 = 0 ;
        if ((this_session_userid2 != null) && (userid2 != this_session_userid2)) {
            // 2: OK to change in MoneyNetworkAPILib but any instance using old prvkey must be destroyed
            if (debug) console.log(pgm + 'userid2 changed. destroy old MoneyNetworkAPI instances with userid2 = ' + this_session_userid2) ;
            delete_sessions = [] ;
            for (other_session_filename in sessions) {
                if (!sessions[other_session_filename].encrypt) continue ;
                if (sessions[other_session_filename].encrypt.destroyed) continue ;
                if (sessions[other_session_filename].this_session_userid2 != this_session_userid2) continue ;
                delete_sessions.push(other_session_filename) ;
            }
            for (i=0 ; i<delete_sessions.length ; i++) {
                other_session_filename = delete_sessions[i] ;
                encrypt = sessions[other_session_filename].encrypt ;
                delete sessions[other_session_filename] ;
                encrypt.destroy('this_session_userid2 changed') ;
            }
            if (delete_sessions.length && !Object.keys(sessions).length) {
                window.clearTimeout(demon_id) ;
                demon_id = null ;
            }
        }
        this_session_userid2 = userid2 ;
        // console.log(pgm + 'this_session_userid2 = ' + this_session_userid2) ;
    } // set_this_session_userid2

    var debug, ZeroFrame, process_message_cb, interval, optional;
    function config(options) {
        var pgm = module + '.config: ';
        var error, regexp, check_auth_address ;
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
        if (options.this_user_path) set_this_user_path(options.this_user_path, {throw: true}) ;
        if (options.this_session_prvkey) set_this_session_prvkey(options.this_session_prvkey) ;
        if (options.hasOwnProperty('this_session_userid2')) set_this_session_userid2(options.this_session_userid2) ;
    } // config

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
    function get_this_session_prvkey() {
        return this_session_prvkey ;
    }
    function get_this_session_userid2() {
        var pgm = module + '.get_this_session_userid2: ' ;
        // console.log(pgm + 'this_session_userid2 = ' + this_session_userid2) ;
        return this_session_userid2 ;
    }

    // wallet:
    // - false; MoneyNetwork, site_address !=  1JeHa67QEvrrFpsSow82fLypw8LoRcmCXk
    // - true: MoneyNetwork wallet. site_address == '1JeHa67QEvrrFpsSow82fLypw8LoRcmCXk
    // used for this_session_filename, other_session_filename, send_message, demon etc
    var wallet; // null, x, true or false
    var get_wallet_cbs = []; // callbacks waiting for get_wallet response
    function get_wallet(cb) {
        var pgm = module + '.get_wallet: ';
        if (!ZeroFrame) throw pgm + 'ZeroFrame is missing. Please use ' + module + '.init({ZeroFrame:xxx}) to inject ZeroFrame API into this library';
        if (!cb) cb = function () {};
        if (wallet == 'x') {
            // wait. first get_wallet request is executing
            get_wallet_cbs.push(cb);
            console.log(pgm + 'wallet = x. get_wallet_cbs.length = ' + get_wallet_cbs.length) ;
            return;
        }
        if ([true, false].indexOf(wallet) != -1) return cb(wallet); // ready
        // first get_wallet request. check site address and set wallet = true or false. x while executing
        wallet = 'x';
        ZeroFrame.cmd("siteInfo", {}, function (site_info) {
            var pgm = module + '.get_wallet siteInfo callback' ;
            wallet = (site_info.address != '1JeHa67QEvrrFpsSow82fLypw8LoRcmCXk');
            console.log(pgm + 'wallet = ' + wallet + '. get_wallet_cbs.length = ' + get_wallet_cbs.length) ;
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
    var demon_id;
    var sessions = {}; // other session filename => session info
    var done = {}; // filename => cb or true. cb: callback waiting for file. true: processed
    var offline = {}; // other session filename => true (loading) or array with offline transactions
    // options:
    // - cb: session level callback function to handle incoming messages for this sessionide
    // - encrypt: MoneyNetworkAPI instance for this sessionid. Used for encrypt and decrypt. injected into callback function
    // - constructor: called from MoneyNetworkAPI constructor. error message is not reported back in catch (e) { e.message }
    function add_session(sessionid, options) {
        var pgm = module + '.add_session: ';
        var cb, encrypt, sha256, constructor, error, session_at ;
        if (typeof options == 'object') constructor = options.constructor ;
        error = function (text) {
            if (constructor) console.log(pgm + text) ; // new MoneyNetworkAPI. no error.message in catch
            throw pgm + text ;
        } ;
        if (typeof sessionid != 'string') error('invalid call. param 1 sessionid must be a string') ;
        if (['', 'undefined'].indexOf(sessionid) != -1) error('invalid call. param 1 sessionid "' + sessionid + '" is not allowed') ;
        if (!options) options = {} ;
        if (typeof options != 'object') error('invalid call. param 2 options must be an object') ;
        cb = options.cb ;
        encrypt = options.encrypt ;
        if (cb && (typeof cb != 'function')) error('invalid call. param 2 options.cb must be null or a callback function to handle incoming messages') ;
        if (encrypt && !is_MoneyNetworkAPI(encrypt)) error('invalid call. param 2 options.encrypt must be null or an instance of MoneyNetworkAPI') ;
        session_at = new Date().getTime() ;
        if (encrypt) encrypt.session_at = session_at ;
        sha256 = CryptoJS.SHA256(sessionid).toString();
        if (typeof wallet == 'undefined') {
            console.log(pgm + 'first get_wallet request. get_sessions request must wait for get_wallet request to finish') ;
            get_wallet_cbs.push(function() {}) ;
        }
        get_wallet(function (wallet) {
            var this_session_filename, other_session_filename, start_demon ;
            this_session_filename = wallet ? sha256.substr(sha256.length - 10) : sha256.substr(0, 10) ;
            other_session_filename = wallet ? sha256.substr(0, 10) : sha256.substr(sha256.length - 10);
            // if (debug) console.log(pgm + 'sessionid = ' + sessionid + ', sha256 = ' + sha256 + ', wallet = ' + wallet + ', other_session_filename = ' + other_session_filename);
            // if (sessions[other_session_filename]) return null; // known sessionid
            start_demon = (Object.keys(sessions).length == 0);
            if (!sessions[other_session_filename]) {
                console.log(pgm + 'monitoring other_session_filename ' + other_session_filename + ', sessionid = ' + sessionid);
                sessions[other_session_filename] = {
                    sessionid: sessionid,
                    session_at: session_at,
                    this_session_filename: this_session_filename
                };
            }
            if (cb) sessions[other_session_filename].cb = cb ;
            if (encrypt) sessions[other_session_filename].encrypt = encrypt ;
            if (start_demon) {
                demon_id = setInterval(demon, (interval || 500));
                if (debug) console.log(pgm + 'Started demon. process id = ' + demon_id);
            }
        }); // get_wallet callback
    } // add_session

    // return session
    function get_session (sessionid, cb) {
        var pgm = module + '.get_sessions: ' ;
        var retry_get_session, fake_get_wallet_cb, other_session_filename, session_info ;
        console.log(pgm + 'get_wallet_cbs.length = ' + get_wallet_cbs.length) ;
        if (get_wallet_cbs.length) {
            // wait for get_wallet queue to empty before returning sessions (get_session_filenames)
            retry_get_session = function() {
                get_session(sessionid, cb) ;
            };
            fake_get_wallet_cb = function() {
                // wait a moment to empty get_wallet_cbs queue
                setTimeout(retry_get_session, 200) ;
            };
            get_wallet_cbs.push(fake_get_wallet_cb) ;
            return ;
        }
        for (other_session_filename in sessions) {
            session_info = sessions[other_session_filename];
            if (session_info.encrypt && session_info.encrypt.destroyed) continue;
            if (session_info.sessionid != sessionid) continue ;
            console.log(pgm + 'found session with sessionid ' + sessionid) ;
            return cb(session_info) ;
        }
        cb() ;
    } // get_session

    function get_sessions (cb) {
        var pgm = module + '.get_sessions: ' ;
        var array, other_session_filename, session_info1, session_info2, key, retry_get_sessions, fake_get_wallet_cb ;
        console.log(pgm + 'get_wallet_cbs.length = ' + get_wallet_cbs.length) ;
        if (get_wallet_cbs.length) {
            // wait for get_wallet queue to empty before returning sessions (get_session_filenames)
            retry_get_sessions = function() {
                get_sessions(cb) ;
            };
            fake_get_wallet_cb = function() {
                // wait a moment to empty get_wallet_cbs queue
                setTimeout(retry_get_sessions, 200) ;
            };
            get_wallet_cbs.push(fake_get_wallet_cb) ;
            return ;
        }

        array = [] ;
        for (other_session_filename in sessions) {
            session_info1 = sessions[other_session_filename] ;
            if (session_info1.encrypt && session_info1.encrypt.destroyed) continue ;
            session_info2 = { other_session_filename: other_session_filename} ;
            for (key in session_info1) {
                if (!session_info1.hasOwnProperty(key)) continue ;
                if (key == 'encrypt') continue ; // Blocked a frame with origin "null" from accessing a cross-origin frame error for returned encrypt object?!
                session_info2[key] = session_info1[key] ;
            } // for key
            array.push(session_info2) ;
        } // for other_session_filename
        cb(array) ;
    } // get_sessions

    // delete session. session removed by client.
    function delete_session (sessionid) {
        var pgm = module + '.delete_session: ' ;
        var other_session_filename ;
        for (other_session_filename in sessions) {
            if (sessions[other_session_filename].sessionid != sessionid) continue ;
            delete sessions[other_session_filename] ;
            if (Object.keys(sessions).length) {
                window.clearTimeout(demon_id) ;
                demon_id = null ;
            }
            return true ;
        }
        if (debug) console.log(pgm + 'Unknown sessionid ' + sessionid) ;
        return false ;
    } // delete_session

    // delete all sessions and stop demon process. for example after client log out
    function delete_all_sessions() {
        var other_session_filename, count ;
        if (Object.keys(sessions).length) {
            window.clearTimeout(demon_id) ;
            demon_id = null ;
        }
        count = 0 ;
        for (other_session_filename in sessions) {
            delete sessions[other_session_filename] ;
            count++ ;
        }
        return count ;
    } // delete_all_sessions

    // delete all sessions and reset all data in this lib
    function clear_all_data() {
        delete_all_sessions() ;
        debug = null ;
        ZeroFrame = null ;
        process_message_cb = null ;
        interval = null ;
        optional = null ;
        this_user_path = null ;
    } // clear_all_data

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
        var pgm = module + '.wait_for_file: ';
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
        if (!cb) {
            if (debug) console.log(pgm + 'ignoring incoming message with filename ' + response_filename + '. request = ' + JSON.stringify(request)) ;
            else console.log(pgm + 'no debug 1') ;
            done[response_filename] = true ;
            return null ;
        }
        if (!timeout_at) timeout_at = (new Date().getTime()) + 30000;
        done[response_filename] = {request: request, timeout_at: timeout_at, cb: cb};
        if (debug) console.log(pgm + 'added a callback function for ' + response_filename + '. request = ' + JSON.stringify(request) + ', done[' + response_filename + '] = ' + JSON.stringify(done[response_filename]));
        else console.log(pgm + 'no debug 2') ;
        return null;
    } // wait_for_file

    var timestamp_re = /^[0-9]{13}$/ ;
    function demon() {
        var pgm = module + '.demon: ';
        var filename, query, session_filename, first, now;
        // check for expired callbacks. processes waiting for a response
        now = new Date().getTime();
        for (filename in done) {
            if (done[filename] == true) continue;
            console.log(pgm + 'done[' + filename + ']=' + JSON.stringify(done[filename]) + ', now = ' + now) ;
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
            var i, directory, filename, session_filename, file_timestamp, cb, other_user_path, inner_path, encrypt,
                loading_offline_transactions, start_load_offline_transactions, old_timestamps, file_timestamps;
            if (res.error) {
                console.log(pgm + 'query failed. error = ' + res.error);
                console.log(pgm + 'query = ' + query);
                clearInterval(demon_id);
                return;
            }
            if (!res.length) return;
            loading_offline_transactions = {} ;
            old_timestamps = {} ;
            // process new incoming messages
            for (i = 0; i < res.length; i++) {
                directory = res[i].directory;
                filename = res[i].filename;
                session_filename = filename.substr(0,10) ;
                if (done[filename] == true) continue; // already done
                if (loading_offline_transactions[session_filename]) continue ; // loading file with offline transactions. wait until next demon dbQuery
                // check file timestamp. note special timestamp 0 for array with old offline transactions
                file_timestamp = filename.substr(11) ;
                if (!file_timestamp.match(timestamp_re)) {
                    console.log(pgm + 'invalid filename ' + filename + '. must end with a 13 digits timestamp') ;
                    done[filename] = true;
                    continue;
                }
                file_timestamp = parseInt(file_timestamp) ;
                if (file_timestamp == 0) {
                    // special file <session_filename>.0000000000000 with "old" offline transactions.
                    // must be loaded before processing incoming messages from this session
                    if (!offline[session_filename]) {
                        offline[session_filename] = true ; // loading/global
                        loading_offline_transactions[session_filename] = true ; // loading/local
                        start_load_offline_transactions = function() {
                            load_offline_transactions(directory, filename) ;
                        } ;
                        setTimeout(start_load_offline_transactions, 0) ;
                        continue ;
                    }
                }
                if (offline[session_filename] == true) {
                    // wait. loading file with offline transactions for this session
                    loading_offline_transactions[session_filename] = true ; // loading
                    continue ;
                }
                if (!offline[session_filename]) {
                    // first demon call for this session. no <session_filename>.0000000000000 file. no offline transactions.
                    // all old messages for this session must be marked as done
                    if ((file_timestamp < sessions[session_filename].session_at - 60000) && !done[filename]) {
                        // first demon call for this session. collect timestamps for old messages that should not be processed
                        console.log(pgm + 'first demon call for this session. session_filename = ' + session_filename + ', file_timestamp = ' + file_timestamp + ', session_at = ' + sessions[session_filename].session_at) ;
                        if (!old_timestamps[session_filename]) old_timestamps[session_filename] = [] ;
                        old_timestamps[session_filename].push(file_timestamp) ;
                        continue ;
                    }
                }
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
                //cb(inner_path, encrypt) ;
                try {
                    cb(inner_path, encrypt)
                }
                catch (e) {
                    console.log(pgm + 'Error when processing incomming message ' + inner_path + '. error = ' + e.message)
                }
                // done.
                done[filename] = true;
            } // for i
            if (!Object.keys(old_timestamps).length) return ;

            // first demon call for one or more sessions. mark old not offline transactions as done
            console.log(pgm + 'old_timestamps = ' + JSON.stringify(old_timestamps)) ;
            for (session_filename in old_timestamps) {
                // mark as done
                file_timestamps =  old_timestamps[session_filename] ;
                for (i=0 ; i<file_timestamps.length ; i++) {
                    file_timestamp = file_timestamps[i] ;
                    filename = session_filename + '.' + file_timestamp ;
                    done[filename] = true ;
                }
                // empty offline transactions table
                offline[session_filename] = [] ;
            }

        }); // dbQuery callback

    } // demon

    // load file <session_filename>.0000000000000 with offline transactions for this session.
    // that is messages with timestamp < session_at (session added/started) that must be read at startup
    function load_offline_transactions(directory, filename1) {
        var pgm = module + '.load_offline_transactions: ' ;
        var error, session_filename, encrypt, other_user_path, inner_path ;
        session_filename = filename1.substr(0,10) ;
        error = function (text) {
            console.log(pgm + text) ;
            offline[session_filename] = [] ;
            done[filename1] = true;
        };
        encrypt = sessions[session_filename].encrypt ;
        if (encrypt.destroyed) return error('Session with other_session_filename ' + session_filename + ' has been destroyed') ;
        other_user_path = 'merged-MoneyNetwork/' + directory + '/' ;
        inner_path = other_user_path + filename1;
        if (!encrypt.other_user_path) encrypt.setup_encryption({other_user_path: other_user_path}) ;
        if (other_user_path != encrypt.other_user_path) return error('Rejected incoming message ' + inner_path + '. Expected incoming messages for this session to come from ' + encrypt.other_user_path) ;
        // 1: get file
        ZeroFrame.cmd("fileGet", {inner_path: inner_path, required: false}, function (json_str) {
            var pgm = module + '.load_offline_transactions fileGet callback 1: ';
            var encrypted_json ;
            if (!json_str) return error('filename ' + inner_path + ' was not found') ;
            encrypted_json = JSON.parse(json_str) ;
            // 2: decrypt
            encrypt.decrypt_json(encrypted_json, function (array) {
                var pgm = module + '.load_offline_transactions decrypt_json callback 2: ';
                var query ;
                if (!array) return error(inner_path + ' decrypt failed') ;
                // 3: dbQuery. find old incoming messages not in offline transactions array. must be marked as done
                query =
                    "select json.directory, files_optional.filename " +
                    "from files_optional, json " +
                    "where files_optional.filename like '" + session_filename + ".%'" +
                    "and json.json_id = files_optional.json_id " +
                    "order by substr(files_optional.filename, 12)";
                // if (debug) console.log(pgm + 'query = ' + query) ;
                ZeroFrame.cmd("dbQuery", [query], function (res) {
                    var pgm = module + '.load_offline_transactions dbQuery callback 3: ';
                    var i, filename2, file_timestamp ;
                    if (res.error) return error('query failed. error = ' + res.error + ', query = ' + query);
                    for (i=0 ; i<res.length ; i++) {
                        filename2 = res[i].filename;
                        file_timestamp = filename2.substr(11);
                        if (!file_timestamp.match(timestamp_re)) continue; // invalid filename. will be filtered in demon loop
                        file_timestamp = parseInt(file_timestamp);
                        if ((file_timestamp < sessions[session_filename].session_at - 60000) && (array.indexOf(file_timestamp) == -1)) {
                            // old file and not a offline transaction. mark as done
                            done[filename2] = true;
                        }
                    }
                    // ready for next demon call
                    offline[session_filename] = array ;
                    done[filename1] = true;
                }) ; // dbQuery callback 3
            }) ; // decrypt_json callback 2
        }) ; // fileGet callback 1

    } // load_offline_transactions

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

    // Json schemas for json validation of ingoing and outgoing messages
    var json_schemas = {

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
            "title": 'Generic response with an optional error message/code',
            "properties": {
                "msgtype": {"type": 'string', "pattern": '^response$'},
                "error": {"type": 'string'}
            },
            "required": ['msgtype'],
            "additionalProperties": false
        }, // response

        "ping": {
            "type": 'object',
            "title": 'Simple session ping. Expects Timeout or OK response',
            "description": 'Permissions=true: request permissions info in ping response (open_wallet, request_balance etc)',
            "properties": {
                "msgtype": {"type": 'string', "pattern": '^ping$'},
                "permissions": {"type": 'boolean'}
            },
            "required": ['msgtype'],
            "additionalProperties": false
        }, // ping

        "get_balance": {
            "type": 'object',
            "title": 'MN: send get_balance request to wallet session',
            "description": 'Wallet session must return a balance (OK) or response (error) message. Boolean flags: Open and/or close wallet before/after get_balance request',
            "properties": {
                "msgtype": {"type": 'string', "pattern": '^get_balance$'},
                "open_wallet": {"type": 'boolean'},
                "close_wallet": {"type": 'boolean'}
            },
            "required": ['msgtype'],
            "additionalProperties": false
        }, // get_balance

        "balance": {
            "type": 'object',
            "title": 'Wallet: response. return balance info to MN',
            "properties": {
                "msgtype": {"type": 'string', "pattern": '^balance$'},
                "balance": {
                    "type": 'array',
                    "items": {
                        "type": 'object',
                        "properties": {
                            "code": {"type": 'string', "minLength": 2, "maxLength": 5},
                            "amount": {"type": 'number'}
                        },
                        "required": ['code', 'amount'],
                        "additionalProperties": false
                    }
                },
                "balance_at": {"type": "number", "multipleOf": 1.0}
            },
            "required": ['msgtype', 'balance', 'balance_at'],
            "additionalProperties": false
        }, // balance

        "wallet": {
            "type": 'object',
            "title": 'Public wallet information in wallet.json files',
            "description": 'wallet_* fields from site_info. currencies is a list of supported currencies, api_url is optional url to external API and hub is a random wallet data hub address. wallet_sha256 is sha256 signature for {wallet_address, wallet_domain, wallet_title, wallet_description, currencies, api_url} hash',
            "properties": {
                "msgtype": {"type": 'string', "pattern": '^wallet$'},
                "wallet_address": {"type": 'string'},
                "wallet_domain": {"type": 'string'},
                "wallet_title": {"type": 'string'},
                "wallet_description": {"type": 'string'},
                "currencies": {
                    "type": 'array',
                    "description": 'List of supported currencies. code is a (pseudo) currency iso code. Optional URL to currency information on the www',
                    "items": {
                        "type": 'object',
                        "properties": {
                            "code": {"type": 'string', "minLength": 2, "maxLength": 5},
                            "name": {"type": 'string'},
                            "url": {"type": 'string'},
                            "units": {
                                "type": 'array',
                                "description": 'Optional unit list. For example units: [{ unit: BitCoin, factor: 1 },{ unit: Satoshi, factor: 0.00000001 }]',
                                "items": {
                                    "type": 'object',
                                    "properties": {
                                        "unit": {"type": 'string'},
                                        "factor": {"type": 'number'}
                                    },
                                    "required": ['unit', 'factor'],
                                    "additionalProperties": false
                                },
                                "minItems": 1
                            }
                        },
                        "required": ['code', 'name'],
                        "additionalProperties": false
                    },
                    "minItems": 1
                },
                "api_url": {"type": 'string'},
                "wallet_sha256": {"type": 'string', "pattern": '^[0-9a-f]{64}$'},
                "hub": {"type": 'string'}
            },
            "required": ['msgtype', 'wallet_sha256', 'currencies'],
            "additionalProperties": false
        }, // wallet

        "prepare_mt_request": {
            "type": 'object',
            "title": 'Validate money transactions before send chat message with money transactions',
            "description": 'MN: send money transactions to wallet before send chat message to contact. Multiple money transactions are allowed. Wallet must return error message or json with transaction details for each money transaction',
            "properties": {
                "msgtype": {"type": 'string', "pattern": '^prepare_mt_request$'},
                "contact": {
                    "description": 'Info about receiver of chat message / money transactions request. auth_address is the actual contact id and should be unique. alias and cert_user_id are human text info only and are not unique / secure contact info',
                    "type": 'object',
                    "properties": {
                        "alias": { "type": 'string'},
                        "cert_user_id": { "type": 'string'},
                        "auth_address": { "type": 'string'}
                    },
                    "required": ['alias', 'cert_user_id', 'auth_address'],
                    "additionalProperties": false
                },
                "money_transactions": {
                    "type": 'array',
                    "items": {
                        "type": 'object',
                        "properties": {
                            "action": { "type": 'string', "pattern": '^(Send|Request)$'},
                            "code": {"type": 'string', "minLength": 2, "maxLength": 5},
                            "amount": {"type": 'number'}
                        },
                        "required": ['action', 'code', 'amount'],
                        "additionalProperties": false
                    }
                }
            },
            "required": ['msgtype', 'contact', 'money_transactions'],
            "additionalProperties": false
        }, // prepare_mt_request

        "notification" : {
            "type": 'object',
            "title": 'MN/Wallet. Send notification, see wrapperNotification, to other session',
            "description": 'For example: wallet session is waiting for user confirmation (money transfer)',
            "properties": {
                "msgtype": {"type": 'string', "pattern": '^notification$'},
                "type": { "type": 'string', "pattern": '^(info|error|done)$'},
                "message": { "type": 'string'},
                "timeout": { "type": 'number'}
            },
            "required": ['msgtype', 'type'],
            "additionalProperties": false
        } // notification

    }; // json_schemas

    // minimum validate json before encrypt & send and after receive & decrypt using https://github.com/geraintluff/tv4
    // json messages between MoneyNetwork and MoneyNetwork wallet must be valid
    // params:
    // - calling_pgm: calling function. for debug messages
    // - json: request or response
    // - request_msgtype: request: null, response: request.msgtype
    function validate_json(calling_pgm, json, request_msgtype) {
        var pgm = module + '.validate_json: ';
        var json_schema, json_error;
        if (!json || !json.msgtype) return 'required msgtype is missing in json message';
        json_schema = json_schemas[json.msgtype];
        if (!json_schema) return 'Unknown msgtype ' + json.msgtype;
        if (request_msgtype && (json.msgtype != 'response')) {
            // validate request => response combinations
            if (request_msgtype == 'response') return 'Invalid request msgtype ' + request_msgtype;
            if (!json_schemas[request_msgtype]) return 'Unknown request msgtype ' + request_msgtype;
            if ((request_msgtype == 'pubkeys') && (json.msgtype == 'pubkeys')) null; // OK combination
            else if ((request_msgtype == 'get_data') && (json.msgtype == 'data')) null; // OK combination
            else if ((request_msgtype == 'get_password') && (json.msgtype == 'password')) null; // OK combination
            else if ((request_msgtype == 'get_balance') && (json.msgtype == 'balance')) null; // OK combination
            else return 'Invalid ' + request_msgtype + ' request ' + json.msgtype + ' response combination';
        }
        if (typeof tv4 === 'undefined') {
            if (debug) console.log(pgm + 'warning. skipping ' + json.msgtype + ' json validation. tv4 is not defined');
            return;
        }
        // validate json
        if (tv4.validate(json, json_schema, pgm)) return null; // json is OK
        // report json error
        json_error = JSON.parse(JSON.stringify(tv4.error));
        delete json_error.stack;
        console.log(pgm + 'json_error = ', json_error) ;
        return 'Error in ' + json.msgtype + ' JSON. ' + JSON.stringify(json_error);
    } // validate_json

    // helper. calculate wallet_sha256 from other wallet fields (minimize wallet.json disk usage)
    function calc_wallet_sha256 (wallet) {
        var pgm = module + '.calc_wallet_sha256: ';
        var wallet_sha256_json, wallet_sha256 ;
        if (!wallet.wallet_address || !wallet.wallet_title || !wallet.wallet_description || !wallet.currencies) {
            this.log(pgm + 'cannot calculate wallet_sha256 for wallet ' + JSON.stringify(wallet))  ;
            return null ;
        }
        wallet_sha256_json = {
            wallet_address: wallet.wallet_address,
            wallet_domain: wallet.wallet_domain,
            wallet_title: wallet.wallet_title,
            wallet_description: wallet.wallet_description,
            currencies: wallet.currencies,
            api_url: wallet.api_url
        } ;
        wallet_sha256 = CryptoJS.SHA256(JSON.stringify(wallet_sha256_json)).toString();
        return wallet_sha256 ;
    } // calc_wallet_sha256

    // helper. get wallet info from sha256 value (minimize wallet.json disk usage)
    // param: wallet_sha256. sha256 string or array with sha256 strings
    var wallet_info_cache = {} ; // sha256 => wallet_info
    function get_wallet_info (wallet_sha256, cb) {
        var pgm = module + '.get_wallet_info: ';
        var i, re, results, query, sha256 ;
        if (!wallet_sha256) return cb({error: 'invalid call. param 1 must be a string or an array of strings'}) ;
        if (typeof wallet_sha256 == 'string') wallet_sha256 = [wallet_sha256] ;
        if (!wallet_sha256.length) return cb({error: 'invalid call. param 1 must be a string or an array of strings'}) ;
        re = new RegExp('^[0-9a-f]{64}$') ;
        for (i=0 ; i<wallet_sha256.length ; i++) {
            if (typeof wallet_sha256[i] != 'string') return cb({error: 'invalid call. param 1 must be a string or an array of strings'}) ;
            if (!wallet_sha256[i].match(re)) return cb({error: 'invalid call. param 1 must be a sha256 string value or an array of sha256 string values'}) ;
        }
        if (typeof cb != 'function') return cb({error: 'invalid call. param 2 must be a callback function'});
        if (!ZeroFrame) cb({error: 'invalid call. ZeroFrame is missing. Please use ' + module + '.init({ZeroFrame:xxx}) to inject ZeroFrame API into this library'});

        results = {} ; // sha256 => wallet_info

        // check cache
        for (i=wallet_sha256.length-1 ; i>=0 ; i--) {
            sha256 = wallet_sha256[i] ;
            if (!wallet_info_cache[sha256]) continue ; // not in cache
            // found in cache
            results[sha256] = JSON.parse(JSON.stringify(wallet_info_cache[sha256])) ;
            wallet_sha256.splice(i,1) ;
        }
        if (!wallet_sha256.length) return cb(results) ; // all sha256 values were found in cache

        // find wallets with full wallet info for the missing wallet_sha256 values
        query =
            "select  wallet_sha256.value as wallet_sha256, json.directory " +
            "from keyvalue as wallet_sha256, keyvalue, json " +
            "where wallet_sha256.key = 'wallet_sha256' " +
            "and wallet_sha256.value in " ;
        for (i=0 ; i<wallet_sha256.length ; i++) {
            query += i==0 ? '(' : ',' ;
            query += " '" + wallet_sha256[i] + "'" ;
        }
        query +=
            ") and keyvalue.json_id = wallet_sha256.json_id " +
            "and keyvalue.value is not null " +
            "and keyvalue.key like 'wallet_%' " +
            "and json.json_id = keyvalue.json_id " +
            "group by  wallet_sha256.value, keyvalue.json_id " +
            "having count(*) >= 4" ;

        if (debug) console.log(pgm + 'query ? = ' + query);
        ZeroFrame.cmd("dbQuery", [query], function (wallets) {
            var pgm = module + '.get_wallet_info dbQuery callback: ' ;
            var error, check_wallet ;
            if (wallets.error) {
                error = 'failed to find full wallet information. error = ' + wallets.error ;
                console.log(pgm + error);
                console.log(pgm + 'query = ' + query);
                return cb({error: error});
            }
            if (!wallets.length) {
                error = 'could not find any wallet.json with full wallet info for wallet_sha256 in ' + JSON.stringify(wallet_sha256) ;
                console.log(pgm + error);
                console.log(pgm + 'query = ' + query);
                return cb({error: error});
            }
            console.log(pgm + 'wallets = ' + JSON.stringify(wallets)) ;

            // lookup and check wallets one by one. One fileGet for each wallet.json file
            check_wallet = function () {
                var pgm = module + '.get_wallet_info.check_wallet: ' ;
                var row, inner_path ;
                row = wallets.shift() ;
                if (!row) return cb(results, true) ; // done
                if (results[row.wallet_sha256]) return check_wallet() ; // wallet info is already found for this sha256 value
                // check wallet.json file
                inner_path = 'merged-MoneyNetwork/' + row.directory + '/wallet.json' ;
                ZeroFrame.cmd("fileGet", {inner_path: inner_path, required: false}, function (wallet_str) {
                    var pgm = module + '.get_wallet_info.check_wallet fileGet callback: ' ;
                    var wallet, error, calculated_sha256 ;
                    if (!wallet_str) {
                        console.log(pgm + 'wallet.json was not found. inner_path = ' + inner_path);
                        return check_wallet(); // next wallet
                    }
                    try {
                        wallet = JSON.parse(wallet_str);
                    }
                    catch (e) {
                        console.log(pgm + 'wallet.json is invalid. inner_path = ' + inner_path + '. error = ' + e.message);
                        return check_wallet(); // next wallet
                    }
                    console.log(pgm + 'wallet = ' + JSON.stringify(wallet));
                    //wallet = {
                    //    "msgtype": "wallet",
                    //    "wallet_address": "1LqUnXPEgcS15UGwEgkbuTbKYZqAUwQ7L1",
                    //    "wallet_title": "MoneyNetworkW2",
                    //    "wallet_description": "Money Network - Wallet 2 - BitCoins www.blocktrail.com - runner jro",
                    //    "currencies": [{
                    //        "code": "tBTC",
                    //        "name": "Test Bitcoin",
                    //        "url": "https://en.bitcoin.it/wiki/Testnet",
                    //        "units": [{"unit": "BitCoin", "factor": 1}, {"unit": "Satoshi", "factor": 1e-8}]
                    //    }],
                    //    "hub": "1HXzvtSLuvxZfh6LgdaqTk4FSVf7x8w7NJ",
                    //    "wallet_sha256": "6ef0247021e81ae7ae1867a685f0e84cdb8a61838dc25656c4ee94e4f20acb74"
                    //};
                    // validate wallet.json after read
                    error = validate_json(pgm, wallet) ;
                    if (error) {
                        console.log(pgm + 'wallet.json was found but is invalid. error = ' + error + ', wallet = ' + JSON.stringify(wallet));
                        return check_wallet(); // next wallet
                    }
                    // check wallet_sha256
                    // full wallet info. test wallet_sha256 signature
                    calculated_sha256 = calc_wallet_sha256(wallet);
                    if (!calculated_sha256) {
                        console.log(pgm + 'wallet.json was found but is invalid. wallet_sha256 could not be calculated, wallet = ' + JSON.stringify(wallet));
                        return check_wallet() ; // next wallet
                    }
                    if (calculated_sha256 != wallet.wallet_sha256) {
                        console.log(pgm + 'wallet.json was found but is invalid. expected calculated_sha256 = ' + calculated_sha256 + '. found wallet.wallet_sha256 = ' + wallet.wallet_sha256 + ', wallet = ' + JSON.stringify(wallet));
                        return check_wallet() ; // next wallet
                    }
                    // OK. save wallet info.
                    results[row.wallet_sha256] = {
                        wallet_address: wallet.wallet_address,
                        wallet_domain: wallet.wallet_domain,
                        wallet_title: wallet.wallet_title,
                        wallet_description: wallet.wallet_description,
                        currencies: wallet.currencies,
                        api_url: wallet.api_url,
                        wallet_sha256: row.wallet_sha256
                    } ;
                    wallet_info_cache[row.wallet_sha256] = JSON.parse(JSON.stringify(results[row.wallet_sha256])) ;
                    // next wallet
                    check_wallet() ;
                }) ; // fileGet callback

            } ; // check_wallet
            // start loop
            check_wallet() ;

        }) ; // dbQuery callback 1



    } // get_wallet_info

    // export MoneyNetworkAPILib
    return {
        config: config,
        set_this_user_path: set_this_user_path,
        set_this_session_prvkey: set_this_session_prvkey,
        set_this_session_userid2: set_this_session_userid2,
        get_ZeroFrame: get_ZeroFrame,
        get_optional: get_optional,
        get_this_user_path: get_this_user_path,
        get_this_session_prvkey: get_this_session_prvkey,
        get_this_session_userid2: get_this_session_userid2,
        is_user_path: is_user_path,
        get_wallet: get_wallet,
        is_session: is_session,
        add_session: add_session,
        get_session: get_session,
        get_sessions: get_sessions,
        wait_for_file: wait_for_file,
        delete_session: delete_session,
        delete_all_sessions: delete_all_sessions,
        clear_all_data: clear_all_data,
        aes_encrypt: aes_encrypt,
        aes_decrypt: aes_decrypt,
        validate_json: validate_json,
        calc_wallet_sha256: calc_wallet_sha256,
        get_wallet_info: get_wallet_info
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
// - extra. hash with any additional session info. Not used by MoneyNetworkAPI
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
    // this.this_session_prvkey = options.prvkey || null;    // JSEncrypt private key for this session (decrypt ingoing messages)
    if (options.prvkey) MoneyNetworkAPILib.set_this_session_prvkey(options.prvkey);
    this.this_session_prvkey = MoneyNetworkAPILib.get_this_session_prvkey() ;

    if (options.hasOwnProperty('userid2')) MoneyNetworkAPILib.set_this_session_userid2(options.userid2);
    this.this_session_userid2 = MoneyNetworkAPILib.get_this_session_userid2() || 0 ;
    // this.log(pgm, 'this_session_userid2 = ' + this.this_session_userid2) ;

    // user paths
    if (options.this_user_path) MoneyNetworkAPILib.config({this_user_path: options.this_user_path});
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
    this.extra = options.extra ;
    if (this.sessionid) {
        // monitor incoming messages for this sessionid.
        MoneyNetworkAPILib.add_session(this.sessionid, {encrypt: this, cb: this.cb, constructor:true}) ;
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

MoneyNetworkAPI.prototype.log = function (calling_pgm, text) {
    var pgm = this.module + '.log: ' ;
    var prefix;
    if (!this.debug) return;
    if (arguments.length != 2) throw pgm + 'invalid call. two arguments pgm and text expected' ;
    prefix = this.debug == true ? '' : this.debug + ': ';
    console.log(calling_pgm + prefix + text);
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
    if (!this[self_property] || !options[options_property] || (this[self_property] == options[options_property])) return ;
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
        MoneyNetworkAPILib.set_this_session_prvkey(options.prvkey);
    }
    this.this_session_prvkey = MoneyNetworkAPILib.get_this_session_prvkey() ;

    if (options.userid2) {
        self.readonly(options,'userid2') ;
        MoneyNetworkAPILib.set_this_session_userid2(options.userid2);
    }
    this.this_session_userid2 = MoneyNetworkAPILib.get_this_session_userid2() || 0 ;
    // this.log(pgm, 'this_session_userid2 = ' + this.this_session_userid2) ;

    if (options.hasOwnProperty('userid2')) {
        self.readonly(options,'userid2') ;
        this.this_session_userid2 = options.userid2;
    }
    // user paths. full merger site paths
    if (options.this_user_path) {
        // this session. this instance only. readonly and auth_address must be correct (callback)
        MoneyNetworkAPILib.set_this_user_path(
            options.this_user_path, {
                throw: true,
                readonly: true,
                cb: function (error) {
                    if (error) console.log(pgm + error) ;
                    else {
                        self.this_user_path = options.this_user_path ;
                        if (!self.this_user_path) self.this_user_path = MoneyNetworkAPILib.get_this_user_path() ;
                    }
                }
            }
        ) ;
    }
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
    if (options.extra) this.extra = options.extra ;
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

// destroy/delete MoneyNetworkAPI instance
MoneyNetworkAPI.prototype.destroy = function (reason) {
    var self, key ;
    if (arguments.length == 0) reason = true ;
    self = this ;
    self.destroyed = reason ;
    for (key in self) if (['destroyed', 'module'].indexOf(key) == -1) delete self[key] ;
};

MoneyNetworkAPI.prototype.check_destroyed = function (pgm) {
    if (!this.destroyed) return ;
    throw pgm + 'MoneyNetworkAPI instance has been destroyed. reason = ' + this.destroyed ;
}; // check_destroyed

// get session filenames for MN <=> wallet communication
MoneyNetworkAPI.prototype.get_session_filenames = function (cb) {
    var pgm = this.module + '.get_session_filenames: ' ;
    var self;
    self = this;
    this.check_destroyed(pgm) ;
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
    this.check_destroyed(pgm) ;
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
    this.check_destroyed(pgm) ;
    if (!this.this_session_prvkey) throw pgm + 'decrypt_1 failed. prvkey is missing in encryption setup';
    encrypted_array = JSON.parse(encrypted_text_1);
    key = encrypted_array[0];
    encrypted_text = encrypted_array[1];
    encrypt = new JSEncrypt();
    encrypt.setPrivateKey(this.this_session_prvkey);
    password = encrypt.decrypt(key);
    if (!password) this.log(pgm, 'error. password is null. key = ' + key + ', this_session_prvkey = ' + this.this_session_prvkey) ;
    output_wa = CryptoJS.AES.decrypt(encrypted_text, password, {format: CryptoJS.format.OpenSSL}); // , { mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.AnsiX923, format: CryptoJS.format.OpenSSL });
    clear_text = output_wa.toString(CryptoJS.enc.Utf8);
    cb(clear_text)
}; // decrypt_1

// 2: cryptMessage encrypt/decrypt using ZeroNet cryptMessage plugin (pubkey2)
MoneyNetworkAPI.prototype.encrypt_2 = function (encrypted_text_1, cb) {
    var pgm = this.module + '.encrypt_2: ';
    var self = this;
    this.check_destroyed(pgm) ;
    if (!this.ZeroFrame) throw pgm + 'encryption failed. ZeroFrame is missing in encryption setup';
    if (!this.other_session_pubkey2) throw pgm + 'encryption failed. Pubkey2 is missing in encryption setup';
    // 1a. get random password
    this.log(pgm, 'encrypted_text_1 = ' + encrypted_text_1 + '. calling aesEncrypt');
    this.ZeroFrame.cmd("aesEncrypt", [""], function (res1) {
        var pgm = self.module + '.encrypt_2 aesEncrypt callback 1: ';
        var password;
        password = res1[0];
        self.check_destroyed(pgm) ;
        self.log(pgm, 'aesEncrypt OK. password = ' + password + '. calling eciesEncrypt');
        // 1b. encrypt password
        self.ZeroFrame.cmd("eciesEncrypt", [password, self.other_session_pubkey2], function (key) {
            var pgm = self.module + '.encrypt_2 eciesEncrypt callback 2: ';
            self.log(pgm, 'self.other_session_pubkey2 = ' + self.other_session_pubkey2 + ', key = ' + key);
            // 1c. encrypt text
            self.check_destroyed(pgm) ;
            self.log(pgm, 'eciesEncrypt OK. calling aesEncrypt');
            self.ZeroFrame.cmd("aesEncrypt", [encrypted_text_1, password], function (res3) {
                var pgm = self.module + '.encrypt_2 aesEncrypt callback 3: ';
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
    this.check_destroyed(pgm) ;
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
        var pgm = self.module + '.decrypt_2 eciesDecrypt callback 1: ';
        if (!password) throw pgm + 'key eciesDecrypt failed. key = ' + key + ', userid2 = ' + JSON.stringify(self.this_session_userid2 + ', MoneyNetworkAPILib.get_this_session_userid2 = ' + MoneyNetworkAPILib.get_this_session_userid2());
        // 1b. decrypt encrypted_text
        self.log(pgm, 'eciesDecrypt OK. password = ' + password + ', calling aesDecrypt');
        self.ZeroFrame.cmd("aesDecrypt", [iv, encrypted_text, password], function (encrypted_text_1) {
            var pgm = self.module + '.decrypt_2 aesDecrypt callback 2: ';
            self.log(pgm, 'aesDecrypt OK. encrypted_text_1 = ' + encrypted_text_1);
            cb(encrypted_text_1);
        }); // aesDecrypt callback 2
    }); // eciesDecrypt callback 1
}; // decrypt_2

// 3: symmetric encrypt/decrypt using sessionid
MoneyNetworkAPI.prototype.encrypt_3 = function (encrypted_text_2, cb) {
    var pgm = this.module + '.encrypt_3: ';
    this.check_destroyed(pgm) ;
    if (!this.sessionid) throw pgm + 'encrypt_3 failed. sessionid is missing in encryption setup';
    var encrypted_text_3;
    encrypted_text_3 = MoneyNetworkAPILib.aes_encrypt(encrypted_text_2, this.sessionid);
    cb(encrypted_text_3);
}; // encrypt_3
MoneyNetworkAPI.prototype.decrypt_3 = function (encrypted_text_3, cb) {
    var pgm = this.module + '.decrypt_3: ';
    var encrypted_text_2;
    this.check_destroyed(pgm) ;
    if (!this.sessionid) throw pgm + 'decrypt_3 failed. sessionid is missing in encryption setup';
    encrypted_text_2 = MoneyNetworkAPILib.aes_decrypt(encrypted_text_3, this.sessionid);
    cb(encrypted_text_2)
}; // decrypt_3

// encrypt/decrypt json messages
// encryptions: integer or array of integers: 1 cryptMessage, 2 JSEncrypt, 3 symmetric encryption
MoneyNetworkAPI.prototype.encrypt_json = function (json, encryptions, cb) {
    var pgm = this.module + '.encrypt_json: ';
    var self, encryption;
    this.check_destroyed(pgm) ;
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
    this.check_destroyed(pgm) ;
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
    this.check_destroyed(pgm) ;
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
    this.check_destroyed(pgm) ;
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

// send json message encrypted to other session and optional wait for response
// params:
// - json: message to send. should include a msgtype
// - options. hash with options for send_message operation
//   - response: wait for response? null, true, false or timeout (=true) in milliseconds.
//   - timestamp: timestamp to be used in filename for outgoing message. Only used when sending response
//   - msgtype: request msgtype. only used when sending response. Used for json validation
//   - request: request timestamp. only used when sending response. Added to response json after validation. used for offline transactions
//   - timeout_at: timestamp. only used when sending response. other session expects response before timeout_at. cleanup response after timeout
//   - offline: boolean or an array. start an offline transaction (send, receive, pay, receive payment).
//     true: calling app must handle offline transaction administration (cleanup)
//     array: add timestamp to array and to <this_session_filename>.0000000000000 file
// - cb: callback. returns an empty hash, a hash with an error messsage or a response
MoneyNetworkAPI.prototype.send_message = function (request, options, cb) {
    var pgm = this.module + '.send_message: ';
    var self, response, request_msgtype, request_timestamp, encryptions, error, request_at, request_file_timestamp,
        default_timeout, timeout_at, month, year, cleanup_in, offline_transaction, request_timeout_at ;
    self = this;
    this.check_destroyed(pgm) ;

    request_at = new Date().getTime();

    // get params
    if (!options) options = {};
    response = options.response;
    request_file_timestamp = options.timestamp || request_at ; // timestamp - only if request json is a response to a previous request
    request_msgtype = options.msgtype; // only if request json is a response to a previous request
    request_timestamp = options.request ; // only if request json is a response to a previous request
    if (options.offline) {
        if (Array.isArray(options.offline)) offline_transaction = options.offline ;
        else offline_transaction = true ;
    }
    if (options.timeout_at && (typeof options.timeout_at == 'number')) {
        // sending a response to a previous request
        request_timeout_at = options.timeout_at ;
        if (request_at > request_timeout_at) return cb({error: 'Cannot send message. Request timeout at ' + request_timeout_at}) ;
    }

    encryptions = options.hasOwnProperty('encryptions') ? options.encryptions : [1, 2, 3];
    if (typeof encryptions == 'number') encryptions = [encryptions];
    if (!cb) cb = function () {};

    // check setup
    // ZeroNet state
    if (!this.ZeroFrame) return cb({error: 'Cannot send message. ZeroFrame is missing in setup'});
    if (!this.ZeroFrame.site_info) return cb({error: 'Cannot send message. ZeroFrame is not finished loading'});
    if (!this.ZeroFrame.site_info.cert_user_id) return cb({error: 'Cannot send message. No cert_user_id. ZeroNet certificate is not selected'});
    // Outgoing encryption
    if (!this.other_session_pubkey && (encryptions.indexOf(1) != -1)) return cb({error: 'Cannot JSEncrypt encrypt outgoing message. pubkey is missing in encryption setup'}); // encrypt_1
    if (!this.other_session_pubkey2 && (encryptions.indexOf(2) != -1)) return cb({error: 'Cannot cryptMessage encrypt outgoing message. Pubkey2 is missing in encryption setup'}); // encrypt_2
    if (!this.sessionid && (encryptions.indexOf(3) != -1)) return cb({error: 'Cannot symmetric encrypt outgoing message. sessionid is missing in encryption setup'}); // encrypt_3
    if (!this.this_user_path) this.this_user_path = MoneyNetworkAPILib.get_this_user_path() ;
    if (!this.this_user_path) return cb({error: 'Cannot send message. this_user_path is missing in setup'});
    if (!MoneyNetworkAPILib.is_user_path(this.this_user_path)) cb({error: 'Cannot send message. "' + this.this_user_path + '" is not a valid user path. Please use "merged-MoneyNetwork/<hub>/data/users/<auth_address>/" as user_path'});
    if (response) {
        // Ingoing encryption
        if (!this.this_session_prvkey && (encryptions.indexOf(1) != -1) && (request.msgtype != 'get_password')) return cb({error: 'Cannot JSEncrypt decrypt expected ingoing receipt. prvkey is missing in encryption setup'}); // decrypt_1
        // decrypt_2 OK. cert_user_id already checked
        // decrypt_3 OK. sessionid already checked
    }

    // validate message. all messages are validated before send and after received
    // messages: pubkeys, save_data, get_data, delete_data
    error = MoneyNetworkAPILib.validate_json(pgm, request, request_msgtype);
    if (error) {
        error = 'Cannot send message. ' + error;
        this.log(pgm, error);
        this.log(pgm, 'request = ' + JSON.stringify(request));
        return cb({error: error});
    }
    if (request_msgtype && (typeof request_timestamp == 'number')) {
        // sending a response to a previous request.
        // add request timestamp (filename) to response json after validation
        request = JSON.parse(JSON.stringify(request)) ;
        request.request = request_timestamp ;
    }

    // response? true, false or a number (timeout in milliseconds).
    default_timeout = 10000 ;
    if (response) {
        // response requested. true or number. wait for response.
        if (typeof response == 'number') {
            if (response < 100) response = 100 ; // timeout minimum 0.1 second
        }
        else response = default_timeout; // true = default timeout = 10 seconds
        cleanup_in = response ;
        timeout_at = request_at + response;
        year = 1000 * 60 * 60 * 24 * 365.2425;
        month = year / 12;
        // use a random timestamp 1 year ago as response filename
        response = request_at - 11 * month - Math.floor(Math.random() * month * 2); // random timestamp one year ago
        request = JSON.parse(JSON.stringify(request));
        request.response = response;
        request.timeout_at = timeout_at ;
    }

    // 1: recheck this_user_path before sending message. can have changed. user may have logged out
    this.ZeroFrame.cmd("siteInfo", {}, function (site_info) {
        var pgm = self.module + '.send_message siteInfo callback 1: ';
        var regexp ;
        if (!site_info.cert_user_id) {
            self.destroy('User log out') ;
            return cb({error: 'invalid call. this_user_path must be null for a not logged in user'}) ;
        }
        regexp = new RegExp('\/' + site_info.auth_address + '\/$') ;
        if (!self.this_user_path.match(regexp)) {
            self.destroy('Changed certificate') ;
            return cb({error: 'invalid call. auth_address in this_user_path is not correct. this_user_path = ' + self.this_user_path + '. site_info.auth_address = ' + site_info.auth_address}) ;
        }
        // 2: get filenames
        self.get_session_filenames(function (this_session_filename, other_session_filename, unlock_pwd2) {
            var pgm = self.module + '.send_message get_session_filenames callback 2: ';

            // 3: encrypt json
            self.encrypt_json(request, encryptions, function (encrypted_json) {
                var pgm = self.module + '.send_message encrypt_json callback 3: ';
                self.log(pgm, 'encrypted_json = ' + JSON.stringify(encrypted_json));

                // 4: add optional files support
                self.add_optional_files_support(function (res) {
                    var pgm = self.module + '.send_message add_optional_files_support callback 4: ';
                    var inner_path3, json_raw;
                    if (!res || res.error) return cb({error: 'Cannot send message. Add optional files support failed. ' + JSON.stringify(res)});
                    // 5: write file
                    inner_path3 = self.this_user_path + this_session_filename + '.' + request_file_timestamp;
                    json_raw = unescape(encodeURIComponent(JSON.stringify(encrypted_json, null, "\t")));
                    self.log(pgm, 'writing optional file ' + inner_path3);
                    self.ZeroFrame.cmd("fileWrite", [inner_path3, btoa(json_raw)], function (res) {
                        var pgm = self.module + '.send_message fileWrite callback 5: ';
                        var inner_path5, save_offline_transaction;
                        self.log(pgm, 'res = ' + JSON.stringify(res));

                        // 6: offline transaction only. add timestamp to optional_transaction array and special file
                        var save_offline_transaction = function (cb) {
                            var pgm = self.module + '.send_message.save_offline_transaction: ';
                            if (!offline_transaction || (offline_transaction == true)) return cb() ; // continue with sign
                            // offline_transaction is an array
                            // add to array
                            if (offline_transaction.indexOf(request_file_timestamp) == -1) offline_transaction.push(offline_transaction) ;
                            // add to file <this_session_filename>.0000000000000
                            self.encrypt_json(offline_transaction, encryptions, function (encrypted_offline_transaction) {
                                var pgm = self.module + '.send_message.save_offline_transaction encrypt_json callback 6.1: ';
                                var inner_path1, json_raw ;

                                inner_path1 = self.this_user_path + this_session_filename + '.0000000000000' ;
                                json_raw = unescape(encodeURIComponent(JSON.stringify(encrypted_offline_transaction, null, "\t")));
                                self.log(pgm, 'writing optional file ' + inner_path1);
                                self.ZeroFrame.cmd("fileWrite", [inner_path1, btoa(json_raw)], function (res) {
                                    var pgm = self.module + '.send_message.save_offline_transaction fileWrite callback 6.2: ';
                                    self.log(pgm, 'res = ' + JSON.stringify(res));
                                    // continue with sign
                                    cb() ;
                                }) ; // fileWrite callback 2

                            }) ; // encrypt_json callback 1

                        } ; // save_offline_transaction
                        save_offline_transaction(function() {
                            var pgm = self.module + '.send_message.save_offline_transaction callback 6: ';
                            // 7: siteSign. publish not needed for within client communication
                            inner_path5 = self.this_user_path + 'content.json';
                            self.log(pgm, 'sign content.json with new optional file ' + inner_path3);
                            self.ZeroFrame.cmd("siteSign", {inner_path: inner_path5}, function (res) {
                                var pgm = self.module + '.send_message siteSign callback 7: ';
                                var delete_request, cleanup_job_id, inner_path6 ;
                                self.log(pgm, 'res = ' + JSON.stringify(res));

                                if (request.request) {
                                    console.log(pgm + 'sending a response to a previous request. start cleanup job to response. must delete response file after request timeout');
                                    cleanup_in = request_timeout_at - request_at ;
                                    console.log(pgm + 'request_at          = ' + request_at) ;
                                    console.log(pgm + 'request_timeout_at  = ' + request_timeout_at) ;
                                    console.log(pgm + 'cleanup_in          = ' + cleanup_in) ;
                                }
                                if (offline_transaction || (!response && !request.request)) return cb({}); // exit. offline transaction or not response and no request cleanup job

                                // delete request file. submit cleanup job
                                delete_request = function() {
                                    var pgm = self.module + '.send_message.delete_request callback: ';
                                    cleanup_job_id = null ;
                                    console.log(pgm + 'deleting ' + inner_path3) ;
                                    ZeroFrame.cmd("fileDelete", inner_path3, function (res) {
                                        var pgm = self.module + '.send_message.delete_request fileDelete callback: ';
                                        console.log(pgm + 'deleted ' + inner_path3 + ', res = ' + JSON.stringify(res));
                                        // no need for siteSign. file will be removed from content.json at next sign/publish
                                    }) ; // deleteDelete
                                }; // delete_request
                                console.log(pgm + 'Submit delete_request job for ' + inner_path3 + '. starts delete_request job in ' + (cleanup_in || default_timeout) + ' milliseconds' ) ;
                                cleanup_job_id = setTimeout(delete_request, (cleanup_in || default_timeout)) ;
                                if (!response) return cb({}) ; // exit. response was not requested. request cleanup job started

                                // 8: is MoneyNetworkAPIDemon monitoring incoming messages for this sessionid?
                                MoneyNetworkAPILib.is_session(self.sessionid, function (is_session) {
                                    var pgm = self.module + '.send_message is_session callback 8: ';
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
                                            var pgm = self.module + '.send_message.get_and_decrypt fileGet callback 8.1: ';
                                            var encrypted_response, error, request_timestamp;
                                            if (!response_str) return cb({error: 'fileGet for receipt failed. Request was ' + JSON.stringify(request) + '. inner_path was ' + inner_path});
                                            encrypted_response = JSON.parse(response_str);
                                            console.log(pgm + 'encrypted_response = ' + response_str + ', sessionid = ' + self.sessionid) ;
                                            // read response. run cleanup job now
                                            if (cleanup_job_id) clearTimeout(cleanup_job_id);
                                            setTimeout(delete_request, 0) ;
                                            // decrypt response
                                            self.decrypt_json(encrypted_response, function (response) {
                                                var pgm = self.module + '.send_message.get_and_decrypt decrypt_json callback 8.2: ';
                                                // remove request timestamp before validation
                                                request_timestamp = response.request ; delete response.request ;
                                                // validate response
                                                error = MoneyNetworkAPILib.validate_json(pgm, response, request.msgtype);
                                                if (!error && (request_timestamp != request_file_timestamp)) {
                                                    // difference between timestamp in request filename and request timestamp in response!
                                                    error = 'Expected request = ' + request_file_timestamp + ', found request = ' + request_timestamp ;
                                                }
                                                if (error) response.request = request_timestamp ;
                                                if (error) {
                                                    error = request.msgtype + ' response is not valid. ' + error;
                                                    self.log(pgm, error);
                                                    self.log(pgm, 'request = ' + JSON.stringify(request));
                                                    self.log(pgm, 'response = ' + JSON.stringify(response));
                                                    return cb({error: error});
                                                }

                                                // return decrypted response
                                                self.log(pgm, 'response = ' + JSON.stringify(response) +
                                                    ', request_timestamp = ' + request_timestamp +
                                                    ', request_file_timestamp = ' + request_file_timestamp);
                                                cb(response);
                                            }); // decrypt_json callback 8.2
                                        }); // fileGet callback 8.1
                                    }; // get_and_decrypt

                                    response_filename = other_session_filename + '.' + response;
                                    if (is_session) {
                                        // demon is running and is monitoring incoming messages for this sessionid
                                        self.log(pgm, 'demon is running. wait for response file ' + response_filename + '. cb = get_and_decrypt') ;
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
                                            var pgm = self.module + '.send_message.wait_for_response 8: ';
                                            var now;
                                            now = new Date().getTime();
                                            if (now > timeout_at) return cb({error: 'Timeout while waiting for response. Request was ' + JSON.stringify(request) + '. Expected response filename was ' + response_filename});
                                            // 9: dbQuery
                                            self.ZeroFrame.cmd("dbQuery", [query], function (res) {
                                                var pgm = self.module + '.send_message.wait_for_receipt dbQuery callback 9: ';
                                                var inner_path9;
                                                if (res.error) return cb({error: 'Wait for receipt failed. Json message was ' + JSON.stringify(request) + '. dbQuery error was ' + res.error});
                                                if (!res.length) {
                                                    setTimeout(wait_for_response, 500);
                                                    return;
                                                }
                                                inner_path9 = res[0].inner_path;
                                                // 10: get_and_decryt
                                                get_and_decrypt(inner_path9);

                                            }); // dbQuery callback 9
                                        }; // wait_for_response 8
                                        setTimeout(wait_for_response, 250);
                                    }
                                }); // is_session callback callback 8

                            }); // siteSign callback 7 (content.json)

                        }) ; // save_offline_transaction callback 6

                    }); // writeFile callback 5 (request)
                }); // add_optional_files_support callback 4
            }); // encrypt_json callback 3
        }); // get_filenames callback 2
    }); // siteInfo callback 1

}; // send_message

// end MoneyNetworkAPI class
