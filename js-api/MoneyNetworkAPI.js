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
// - use MN log syntax in in log. for example: <inner_path> fileWrite started. <inner_path> fileWrite finished. res = <res>
// - add MN debug messages for ZeroNet API calls. See debug_z_api_operation_start and debug_z_api_operation_end
// - add API version.


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

    var debug = false, debug_seq = 0, debug_operations = {}, ZeroFrame, demon_cb, demon_cb_fileget, demon_cb_decrypt, interval, optional;

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
            demon_cb = options.cb;
            if (options.cb_fileget) demon_cb_fileget = true ; // fileGet in demon process
            if (options.cb_decrypt) demon_cb_decrypt = true ; // decrypt in demon process
            if (demon_cb_decrypt) demon_cb_fileget = true ; // cannot decrypt without fileGet
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

    // debug ZeroFrame API calls.
    // call debug_z_api_operation_start before API call and debug_z_api_operation_end after API call
    // todo: add check for long running ZeroFrame API operations. Publish can take some time. optional fileGet can take some time. Other operations should be fast
    function debug_z_api_operation_pending () {
        var keys = Object.keys(debug_operations) ;
        if (keys.length == 0) return 'No pending ZeroNet API operations' ;
        if (keys.length == 1) return '1 pending ZeroNet API operation (' + keys[0] + ')' ;
        return keys.length + ' pending ZeroNet API operations (' + keys.join(',') + ')' ;
    }
    // debug: "global" MoneyNetworkAPI debug option (null, true, false or a string)
    // debug_this: null, true or false. debug option only for this call
    // cmd: ZeroFrame cmd
    function debug_z_api_operation_start (pgm, inner_path, cmd, debug_this) {
        debug_seq++ ;
        debug_operations[debug_seq] = {
            pgm: pgm,
            inner_path: inner_path,
            cmd: cmd,
            debug_this: debug_this,
            started_at: new Date().getTime()
        } ;
        if (debug || debug_this) console.log(pgm + (inner_path ? inner_path + ' ' : '') + cmd + ' started (' + debug_seq + '). ' + debug_z_api_operation_pending()) ;
        return debug_seq ;
    } // debug_z_api_operation_start
    function debug_z_api_operation_end (debug_seq, res) {
        var pgm, inner_path, cmd, debug_this, started_at, finished_at, elapsed_time ;
        if (!debug_operations[debug_seq]) throw pgm + 'error. ZeroNet API operation with seq ' + debug_seq + ' was not found' ;
        pgm = debug_operations[debug_seq].pgm ;
        inner_path = debug_operations[debug_seq].inner_path ;
        cmd = debug_operations[debug_seq].cmd ;
        debug_this = debug_operations[debug_seq].debug_this ;
        started_at = debug_operations[debug_seq].started_at ;
        delete debug_operations['' + debug_seq] ;
        finished_at = new Date().getTime() ;
        elapsed_time = finished_at - started_at ;
        if (debug || debug_this) console.log(pgm + (inner_path ? inner_path + ' ' : '') + cmd + ' finished' + (res ? '. res = ' + JSON.stringify(res) : '') + '. elapsed time ' + elapsed_time + ' ms (' + debug_seq + '). ' + debug_z_api_operation_pending()) ;
    } // debug_z_api_operation_end

    // global variables client and master. used in MN <=> wallet communication:
    // - client false/master true; MoneyNetwork, site_address !=  1JeHa67QEvrrFpsSow82fLypw8LoRcmCXk. server = true
    // - client true/master false: MoneyNetwork wallet. site_address == '1JeHa67QEvrrFpsSow82fLypw8LoRcmCXk, master = false
    // used for this_session_filename, other_session_filename, send_message, demon etc
    var client, server; // null, x, true or false
    var is_client_cbs = []; // callbacks waiting for is_client response
    function is_client(cb) {
        var pgm = module + '.is_client: ';
        var debug_seq ;
        if (!ZeroFrame) throw pgm + 'ZeroFrame is missing. Please use ' + module + '.init({ZeroFrame:xxx}) to inject ZeroFrame API into this library';
        if (!cb) cb = function () {};
        if (client == 'x') {
            // wait. first is_client request is executing
            is_client_cbs.push(cb);
            if (debug) console.log(pgm + 'client = x. is_client.length = ' + is_client_cbs.length) ;
            return;
        }
        if ([true, false].indexOf(client) != -1) return cb(client); // ready
        // first is_client request. check site address and set client = true or false. x while executing
        client = 'x';
        debug_seq = debug_z_api_operation_start(pgm, 'n/a', 'siteInfo') ;
        ZeroFrame.cmd("siteInfo", {}, function (site_info) {
            var pgm = module + '.is_client siteInfo callback: ' ;
            debug_z_api_operation_end(debug_seq, site_info ? 'Ok' : 'Failed') ;
            client = (site_info.address != '1JeHa67QEvrrFpsSow82fLypw8LoRcmCXk');
            server = !client ;
            if (debug) console.log(pgm + 'client = ' + client + '. is_client_cbs.length = ' + is_client_cbs.length) ;
            cb(client);
            while (is_client_cbs.length) {
                cb = is_client_cbs.shift();
                cb(client)
            }
        });
    } // is_client

    // add session to watch list, First add session call will start a demon process checking for incoming messages
    // - session: hash with session info or api client returned from new MoneyNetworkAPI() call
    // - optional cb: function to handle incoming message. cb function must be supplied in init or
    var demon_id;
    var sessions = {}; // other session filename => session info
    var done = {}; // filename => cb or true. cb: callback waiting for file. true: processed
    var offline = {}; // other session filename => true (loading) or array with offline transactions
    // options:
    // - cb: session level callback function to handle incoming messages for this sessionid
    // - encrypt: MoneyNetworkAPI instance for this sessionid. Used for encrypt and decrypt. injected into callback function
    // - constructor: called from MoneyNetworkAPI constructor. error message is not reported back in catch (e) { e.message }
    function add_session(sessionid, options) {
        var pgm = module + '.add_session: ';
        var cb, encrypt, sha256, constructor, error, session_at, is_client2, cb_fileget, cb_decrypt ;
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
        if (options.cb_fileget) cb_fileget = true ;
        if (options.cb_decrypt) cb_decrypt = true  ;
        session_at = new Date().getTime() ;
        if (encrypt) encrypt.session_at = session_at ;
        sha256 = CryptoJS.SHA256(sessionid).toString();
        if (typeof client == 'undefined') {
            // todo: this looks strange ...
            if (debug) console.log(pgm + 'todo: first is_client request. get_sessions request must wait for is_client request to finish') ;
            is_client_cbs.push(function() {}) ;
        }
        // extend is_client.
        is_client2 = function (cb) {
            if (encrypt && (encrypt.client || encrypt.master)) cb(encrypt.client) ; // instance level master/client role. W2W communication
            else is_client(cb) ; // global level master/client role. M2W communication
        } ;
        is_client2(function (client) {
            var this_session_filename, other_session_filename, start_demon ;
            this_session_filename = client ? sha256.substr(sha256.length - 10) : sha256.substr(0, 10) ;
            other_session_filename = client ? sha256.substr(0, 10) : sha256.substr(sha256.length - 10);
            // if (debug) console.log(pgm + 'sessionid = ' + sessionid + ', sha256 = ' + sha256 + ', wallet = ' + wallet + ', other_session_filename = ' + other_session_filename);
            // if (sessions[other_session_filename]) return null; // known sessionid
            start_demon = (Object.keys(sessions).length == 0);
            if (!sessions[other_session_filename]) {
                if (debug) console.log(pgm + 'monitoring other_session_filename ' + other_session_filename + ', sessionid = ' + sessionid);
                sessions[other_session_filename] = {
                    sessionid: sessionid,
                    session_at: session_at,
                    this_session_filename: this_session_filename
                };
            }
            else console.log(pgm + 'todo: warning. multiple add_session calls for other_session_filename ' + other_session_filename) ;
            if (cb) sessions[other_session_filename].cb = cb ;
            if (cb_fileget) sessions[other_session_filename].cb_fileget = cb_fileget ;
            if (cb_decrypt) sessions[other_session_filename].cb_decrypt = cb_decrypt ;
            if (cb_decrypt) cb_fileget = true ;
            if (encrypt) sessions[other_session_filename].encrypt = encrypt ;
            if (start_demon) {
                demon_id = setInterval(demon, (interval || 500));
                if (debug) console.log(pgm + 'Started demon. process id = ' + demon_id);
            }
            if (debug) {
                // list sessions and debug info. See issue https://github.com/jaros1/Money-Network-W2/issues/15
                for (other_session_filename in sessions) {
                    encrypt = sessions[other_session_filename].encrypt ;
                    console.log(pgm + 'other_session_filename ' + other_session_filename + (encrypt && encrypt.debug ? ' should be processed by ' + encrypt.debug : '')) ;
                }
            }
        }); // is_client callback
    } // add_session

    // return session
    function get_session (sessionid, cb) {
        var pgm = module + '.get_session: ' ;
        var retry_get_session, fake_is_client_cb, other_session_filename, session_info ;
        if (debug) console.log(pgm + 'is_client_cbs.length = ' + is_client_cbs.length) ;
        if (is_client_cbs.length) {
            // wait for is_client queue to empty before returning sessions (get_session_filenames)
            retry_get_session = function() {
                get_session(sessionid, cb) ;
            };
            fake_is_client_cb = function() {
                // wait a moment to empty is_client_cbs queue
                setTimeout(retry_get_session, 200) ;
            };
            is_client_cbs.push(fake_is_client_cb) ;
            return ;
        }
        for (other_session_filename in sessions) {
            session_info = sessions[other_session_filename];
            if (session_info.encrypt && session_info.encrypt.destroyed) continue;
            if (session_info.sessionid != sessionid) continue ;
            console.log(pgm + 'found session with sessionid ' + sessionid) ;
            return cb(session_info) ;
        }
        console.log(pgm + 'could not find any session with sessionid ' + sessionid) ;
        cb() ;
    } // get_session

    function get_sessions (cb) {
        var pgm = module + '.get_sessions: ' ;
        var array, other_session_filename, session_info1, session_info2, key, retry_get_sessions, fake_is_client_cb ;
        if (debug) console.log(pgm + 'is_client_cbs.length = ' + is_client_cbs.length) ;
        if (is_client_cbs.length) {
            // wait for is_client_cbs queue to empty before returning sessions (get_session_filenames)
            retry_get_sessions = function() {
                get_sessions(cb) ;
            };
            fake_is_client_cb = function() {
                // wait a moment to empty is_client_cbs queue
                setTimeout(retry_get_sessions, 200) ;
            };
            is_client_cbs.push(fake_is_client_cb) ;
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
        demon_cb = null ;
        interval = null ;
        optional = null ;
        this_user_path = null ;
    } // clear_all_data

    // return true if demon is monitoring incoming messages for sessionid
    function is_session(sessionid) {
        var pgm = module + '.add_session: ';
        var sha256;
        sha256 = CryptoJS.SHA256(sessionid).toString();
        return (sessions[sha256.substr(0, 10)] || sessions[sha256.substr(sha256.length - 10)]) ;
    } // is_session

    // register callback to handle incoming message (response) with this filename
    // options:
    // - request: request json message. for debug messages
    // - timeout: ńumber of ms before timeout.
    // - cb: callback to handle incoming message
    // - cb_fileget: boolean: fileGet file before calling callback cb
    // - cb_decrypt: boolean: decrypt message before calling callback cb
    function wait_for_file(response_filename, options) {
        var pgm = module + '.wait_for_file: ';
        var error, session_filename, timeout_at, cb_fileget, cb_decrypt ;
        error = function (error) {
            console.log(pgm + error) ;
            return error ;
        }
        // check parameters
        // parameter 1: response_filename
        if (typeof response_filename != 'string') return error('invalid call. expected response_filename to be a string. response_filename = ' + JSON.stringify(response_filename));
        if (!response_filename.match(/^[0-9a-f]{10}(-i|-e|-o|-io|-p)?\.[0-9]{13}$/)) return error('invalid call. invalid response_filename = ' + response_filename + '. invalid format');
        session_filename = response_filename.substr(0,10) ;
        if (!sessions[session_filename]) return error('invalid call. invalid param 1 response_filename = ' + response_filename + '. unknown other session filename ' + session_filename);
        // parameter 2: options
        if (!options) options = {} ;
        if (options.request) {
            if (typeof options.request != 'object') return error('invalid call. expected options.request to be a object. null or request json message. options.request = ' + JSON.stringify(options.request));
            if (!options.request.msgtype) return error('invalid call. expected options.request to have a msgtype. request = ' + JSON.stringify(request));
        }
        if (options.timeout_at && (typeof options.timeout_at != 'number')) return error('invalid call. options.timeout_at is not a unix timestamp. timeout_at = ' + JSON.stringify(options.timeout_at));
        if (options.cb && (typeof options.cb != 'function')) return error('invalid call. expected options.cb be a function. cb = ' + JSON.stringify(options.cb));
        if (done[response_filename]) return error(response_filename + ' already done or callback object already defined');
        if (!options.cb) {
            if (debug) console.log(pgm + 'ignoring incoming message with filename ' + response_filename + '. options.request = ' + JSON.stringify(options.request)) ;
            done[response_filename] = true ;
            return null ;
        }
        if (options.cb_fileget) cb_fileget = true ;
        if (options.cb_decrypt) cb_decrypt = true ;
        if (cb_decrypt) cb_fileget = true ;
        timeout_at = options.timeout_at || ((new Date().getTime()) + 30000);
        done[response_filename] = {
            request: options.request,
            timeout_at: timeout_at,
            cb: options.cb,
            cb_fileget: cb_fileget,
            cb_decrypt: cb_decrypt
        };
        if (debug) console.log(pgm + 'added a callback function for ' + response_filename + '. request = ' + JSON.stringify(options.request) + ', done[' + response_filename + '] = ' + JSON.stringify(done[response_filename]));
        return null;
    } // wait_for_file


    var timestamp_re = /^[0-9]{13}$/ ;
    function demon() {
        var pgm = module + '.demon: ';
        var filename, api_query_1, session_filename, first, now, debug_seq;
        // check for expired callbacks. processes waiting for a response
        now = new Date().getTime();
        for (filename in done) {
            if (done[filename] == true) continue;
            if (debug) console.log(pgm + 'done[' + filename + ']=' + JSON.stringify(done[filename]) + ', now = ' + now) ;
            if (done[filename].timeout_at > now) continue;
            if (debug) console.log(pgm + 'timeout. running callback for ' + filename);
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
        api_query_1 =
            "select json.directory, files_optional.filename " +
            "from files_optional, json " +
            "where ";
        for (session_filename in sessions) {
            api_query_1 += first ? "(" : " or ";
            api_query_1 += "files_optional.filename like '" + session_filename + "%'";
            first = false ;
        }
        api_query_1 +=
            ") and json.json_id = files_optional.json_id " +
            "order by substr(files_optional.filename, instr(files_optional.filename,'.'))";
        if (first) {
            console.log(pgm + 'error. no sessions were found');
            clearInterval(demon_id);
            return;
        }
        // if (debug) console.log(pgm + 'api query 1 = ' + api_query_1) ;
        // debug_seq = debug_z_api_operation_start(pgm, 'api query 1', 'dbQuery') ;
        ZeroFrame.cmd("dbQuery", [api_query_1], function (res) {
            var pgm = module + '.demon dbQuery callback: ';
            var i, directory, filename, session_filename, file_timestamp, cb, other_user_path, inner_path, encrypt,
                pos, re, match, optional, now, fileget, decrypt, step_1_fileget, step_2_decrypt, step_3_run_cb ;
            // debug_z_api_operation_end(debug_seq, !res || res.error ? 'failed' : 'OK') ;
            if (res.error) {
                console.log(pgm + 'query failed. error = ' + res.error);
                console.log(pgm + 'query = ' + api_query_1);
                clearInterval(demon_id);
                return;
            }
            now = new Date().getTime();
            // sql filename like check is weak. regular expressions not supported by zeronet sqlite db. full check now
            re = /^[0-9a-f]{10}(-i|-e|-o|-io|-p)?\.[0-9]{13}$/ ;

            // process new incoming messages
            for (i = 0; i < res.length; i++) {
                directory = res[i].directory;
                filename = res[i].filename;
                match = filename.match(re) ;
                if (!match) {
                    console.log(pgm + 'ignoring incoming message with invalid filename ' + filename) ;
                    continue ;
                }
                optional = match[1] ;
                session_filename = filename.substr(0,10) ;
                if (done[filename] == true) continue; // already done

                // console.log(pgm + 'filename = ' + filename + ', optional = ' + optional) ; // should be filename modifier (null, -i, -e, -o, -io or -p)
                // check file timestamp (filetype)
                pos = filename.indexOf('.') ;
                file_timestamp = pos == -1 ? '' : filename.substr(pos+1) ;
                if (!file_timestamp.match(timestamp_re)) {
                    if (debug) console.log(pgm + 'invalid filename ' + filename + '. must end with a 13 digits timestamp. file_timestamp was ' + file_timestamp) ;
                    done[filename] = true;
                    continue;
                }
                // check file timestamp. ignore old messages. ignore messages in the future. other client clock maybe wrong
                file_timestamp = parseInt(file_timestamp) ;
                encrypt = sessions[session_filename].encrypt ;

                if (!done[filename] && encrypt && encrypt.session_at && (['-o', '-io'].indexOf(optional) == -1)) {
                    // not a response. not a offline transaction. compare file timestamp with session start
                    if (file_timestamp + 60000 - encrypt.session_at < 0) {
                        console.log(pgm + 'ignoring old incoming message ' + filename + '. session started at ' + encrypt.session_at) ;
                        done[filename] = true ;
                        continue ;
                    }
                }
                if (file_timestamp - now - 60000 > 0) {
                    console.log(pgm + 'ignoring incoming message ' + filename + ' with timestamp in the future. now = ' + now) ;
                    done[filename] = true ;
                    continue ;
                }
                other_user_path = 'merged-MoneyNetwork/' + directory + '/' ;
                inner_path = other_user_path + filename;
                if (!encrypt.other_user_path) encrypt.setup_encryption({other_user_path: other_user_path}) ;
                if (other_user_path != encrypt.other_user_path) {
                    console.log(pgm + 'Rejected incoming message ' + inner_path + '. Expected incoming messages for this session to come from ' + encrypt.other_user_path) ;
                    done[filename] = true;
                    continue ;
                }
                if (done[filename]) {
                    // message level callback. see wait_for_file
                    cb = done[filename].cb ;
                    fileget = done[filename].cb_fileget ;
                    decrypt = done[filename].cb_decrypt ;
                }
                else if (sessions[session_filename].cb) {
                    // MoneyNetworkAPI instance callback. see new MoneyNetworkAPI / MoneyNetworkAPI.setup_encryption
                    cb = sessions[session_filename].cb ;
                    fileget = sessions[session_filename].cb_fileget ;
                    decrypt = sessions[session_filename].cb_decrypt ;
                }
                else {
                    // global callback. See MoneyNetworkAPILib.config
                    cb = demon_cb;
                    fileget = demon_cb_fileget ;
                    decrypt = demon_cb_decrypt ;
                }
                if (!cb) {
                    console.log(pgm + 'Error when processing incomming message ' + inner_path + '. No process callback found');
                    done[filename] = true;
                    continue;
                }
                if (optional == '-p') {
                    // published messages. processed by demon
                    fileget = true ;
                    decrypt = true ;
                }
                if (decrypt) fileget = true ;

                // callback chain with optional fileGet and decrypt operations
                step_3_run_cb = function (encrypted_json, json) {
                    if (debug) console.log(pgm + 'calling cb with ' + inner_path + (encrypt.debug ? ' and ' + encrypt.debug : '')) ;
                    try { cb(inner_path, encrypt, encrypted_json, json) }
                    catch (e) { console.log(pgm + 'Error when processing incomming message ' + inner_path + '. error = ' + e.message)}
                } ;
                step_2_decrypt = function (encrypted_json) {
                    if (!decrypt) return step_3_run_cb(encrypted_json, null) ; // cb must decrypt
                    encrypt.decrypt_json(encrypted_json, function (json) {
                        step_3_run_cb(encrypted_json, json) ;
                    }) ;
                } ;
                step_1_fileget = function() {
                    var options ;
                    if (!fileget) return step_3_run_cb(null, null) ; // cb must fileGet and decrypt
                    options = { inner_path: inner_path} ;
                    // filetypes: -i, -e, -o, -io, -p
                    if (['-e', '-o'].indexOf(optional) != -1) {
                        // wallet to wallet communication. fileGet often fails for optional fileGet. 0 or 1 peer. wait for max 5 minutes
                        options.required = true ;
                        options.timeout = 60 ;
                        options.timeout_count = 5 ;
                    }
                    z_file_get(pgm, options, function (json_str) {
                        var encrypted_json ;
                        if (!json_str) return step_3_run_cb(null, null) ; // timeout / file not found
                        try {
                            encrypted_json = JSON.parse(json_str) ;
                        }
                        catch (e) {
                            console.log(pgm + inner_path + ' is invalid. json_str = ' + json_str + ', error = ' + e.message) ;
                            return step_3_run_cb(json_str, null) ;
                        }
                        step_2_decrypt(encrypted_json) ;
                    }) ;
                }  ;
                step_1_fileget() ;
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

    // Json schemas for json validation of ingoing and outgoing MoneyNetworkAPI messages
    var json_schemas = {
        wallet: {},
        mn: {},
        api: {

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
                "description": 'wallet_* fields from site_info. currencies is a list of supported currencies, api_url is optional url to external API documentation and hub is a random wallet data hub address. wallet_sha256 is sha256 signature for {wallet_address, wallet_domain, wallet_title, wallet_description, currencies, api_url} hash',
                "properties": {
                    "msgtype": {"type": 'string', "pattern": '^wallet$'},
                    "wallet_address": {"type": 'string'},
                    "wallet_domain": {"type": 'string'},
                    "wallet_title": {"type": 'string'},
                    "wallet_description": {"type": 'string'},
                    "currencies": {
                        "type": 'array',
                        "description": 'List of supported currencies. code is a (pseudo) currency iso code, short currency name, optional currency description (text), optional URL with currency information, optional fee information (text) and optional list with currency units',
                        "items": {
                            "type": 'object',
                            "properties": {
                                "code": {"type": 'string', "minLength": 2, "maxLength": 5},
                                "name": {"type": 'string'},
                                "description": {"type": 'string'},
                                "url": {"type": 'string'},
                                "fee_info": {"type": 'string'},
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
                "required": ['msgtype', 'wallet_sha256'],
                "additionalProperties": false
            }, // wallet

            // money transactions step 1: validate and optional return some json to be included in chat msg with money transactions. return prepare_mt_response or error response
            "prepare_mt_request": {
                "type": 'object',
                "title": 'Validate money transactions before send chat message with money transactions',
                "description": 'MN: validate money transactions in wallet session before send chat message to contact. Multiple money transactions are allowed. Money_transactionid. Wallet must return error message or json with transaction details for each money transaction',
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
                    "open_wallet": {"type": 'boolean', "description": 'Open wallet before prepare_mt_request?'},
                    "close_wallet": {"type": 'boolean', "description": 'Close wallet after prepare_mt_request?'},
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
                        },
                        "minItems": 1
                    },
                    "money_transactionid": { "type": 'string', "minLength": 60, "maxLength": 60, "description": 'Transaction id or session id. Random string. Unique for this money transaction chat message. Shared between 2 MN sessions and 2 wallet sessions'}
                },
                "required": ['msgtype', 'contact', 'money_transactions', 'money_transactionid'],
                "additionalProperties": false
            }, // prepare_mt_request

            "prepare_mt_response": {
                "type": 'object',
                "title": 'prepare_mt_request response',
                "description": 'array with json to be included in chat message to contact. One json for each money transaction in prepare_mt_request',
                "properties": {
                    "msgtype": {"type": 'string', "pattern": '^prepare_mt_response$'},
                    "jsons": {
                        "type": 'array',
                        "minItems": 1
                    }
                },
                "required": ['msgtype', 'jsons'],
                "additionalProperties": false
            }, // prepare_mt_response

            // money transaction step 2: tell wallet session that chat msg with money transactions has been sent to receiver
            "send_mt": {
                "type": 'object',
                "title": 'Send money transaction(s) to receiver',
                "description": 'MN: tell wallet session that money transactions chat message has been send to receiver. wallet must prepare for wallet to wallet communication',
                "properties": {
                    "msgtype": {"type": 'string', "pattern": '^send_mt$'},
                    "money_transactionid": { "type": 'string', "minLength": 60, "maxLength": 60, "description": 'Same money_transactionid as in prepare_mt_request'}
                },
                "required": ['msgtype', 'money_transactionid'],
                "additionalProperties": false
            }, // send_mt

            // money transactions step 3: validate received money transactions. return OK response or error response
            "check_mt": {
                "type": 'object',
                "title": 'check money transactions received from contact in chat message',
                "description": 'See prepare_mt_request and prepare_mt_response for details.',
                "properties": {
                    "msgtype": { "type": 'string', "pattern": '^check_mt$'},
                    "contact": {
                        "description": 'Info about sender of chat message / money transactions request. auth_address is the actual contact id and should be unique. alias and cert_user_id are human text info only and are not unique / secure contact info',
                        "type": 'object',
                        "properties": {
                            "alias": { "type": 'string'},
                            "cert_user_id": { "type": 'string'},
                            "auth_address": { "type": 'string'}
                        },
                        "required": ['alias', 'cert_user_id', 'auth_address'],
                        "additionalProperties": false
                    },
                    "open_wallet": {"type": 'boolean'},
                    "close_wallet": {"type": 'boolean'},
                    "money_transactions": {
                        "type": 'array',
                        "items": {
                            "type": 'object',
                            "properties": {
                                "action": { "type": 'string', "pattern": '^(Send|Request)$'},
                                "code": {"type": 'string', "minLength": 2, "maxLength": 5},
                                "amount": {"type": 'number'},
                                "json": {}
                            },
                            "required": ['action', 'code', 'amount', 'json'],
                            "additionalProperties": false
                        },
                        "minItems": 1
                    },
                    "money_transactionid": { "type": 'string', "minLength": 60, "maxLength": 60, "description": 'Same money_transactionid as in prepare_mt_request and send_mt'}
                },
                "required": ['msgtype', 'contact', 'money_transactions', 'money_transactionid'],
                "additionalProperties": false
            }, // check_mt

            // money transactions step 4: all validation OK. start actual money transaction(s) (wallet to wallet)
            "start_mt": {
                "type": 'object',
                "title": 'Start money transaction(s)',
                "description": 'MN: tell wallet session(s) to execute money transactions received in check_mt request',
                "properties": {
                    "msgtype": {"type": 'string', "pattern": '^start_mt$'},
                    "money_transactionid": { "type": 'string', "minLength": 60, "maxLength": 60, "description": 'Same money_transactionid as in check_mt_request'}
                },
                "required": ['msgtype', 'money_transactionid'],
                "additionalProperties": false
            }, // start_mt

            // publish sync. between MN and wallet sessions. minimum interval between publish is 16 seconds
            "publish_started": {
                "type": 'object',
                "title": 'Send publish start timestamp to other session',
                "description": 'Other session (MN or wallets) should wait for published message before continue. Max one publish every 16 seconds',
                "properties": {
                    "msgtype": {"type": 'string', "pattern": '^publish_started$'},
                    "publish_started_at": {"type": "number", "multipleOf": 1.0}
                },
                "required": ['msgtype', 'publish_started_at'],
                "additionalProperties": false
            }, // publish_started

            "get_published": {
                "type": 'object',
                "title": 'Request timestamp for last OK publish from other session',
                "properties": {
                    "msgtype": {"type": 'string', "pattern": '^get_published$'}
                },
                "required": ['msgtype'],
                "additionalProperties": false
            }, // get_published

            "published": {
                "type": 'object',
                "title": 'Send timestamp for last OK publish to other session',
                "description": 'get_publish_response. Also used after OK or failed publish',
                "properties": {
                    "msgtype": {"type": 'string', "pattern": '^published$'},
                    "last_published_at": {"type": "number", "multipleOf": 1.0}
                },
                "required": ['msgtype', 'published_at'],
                "additionalProperties": false

            }, // published

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

        } // api

    } ; // json_schemas

    // inject extra json schemas. For example schemas used internally in MN or internally in wallets
    // subsystem: mn, wallet or whatever.
    function add_json_schemas (extra_json_schemas, subsystem) {
        var pgm = module + '.add_json_schemas: ' ;
        var key ;
        if (!subsystem) subsystem = 'wallet' ;
        if ((typeof subsystem != 'string') || (subsystem == 'api')) {
            console.log(pgm + 'error. invalid call. second parameter subsystem must be a string <> api. setting subsystem to wallet') ;
            subsystem = 'wallet' ;
        }
        if (!json_schemas[subsystem]) json_schemas[subsystem] = {} ;
        for (key in extra_json_schemas) {
            json_schemas[subsystem][key] = JSON.parse(JSON.stringify(extra_json_schemas[key])) ;
        }
    }

    // json validation. find "subsystem" for json schema (json.msgtype)
    // start with extra injected json schemas (wallets). end with core systems (mn and api)
    function get_subsystem (msgtype) {
        var key ;
        if (json_schemas['wallet'][msgtype]) return 'wallet' ;
        // try other non api and mn subsystem names (w2, wallet2 etc)
        for (key in json_schemas) {
            if (['api', 'mn'].indexOf(key) != -1) continue ;
            if (json_schemas[key][msgtype]) return key ;
        }
        // check core system (mn and api)
        if (json_schemas['mn'][msgtype]) return 'mn' ;
        else return 'api' ;
    } // get_subsystem

    // validate json before encrypt & send and after receive & decrypt using https://github.com/geraintluff/tv4
    // json messages between MoneyNetwork and MoneyNetwork wallet must be valid
    // params:
    // - calling_pgm: calling function. for debug messages
    // - json: request or response
    // - request_msgtype: request: null, response: request.msgtype
    // - subsystem (json schema definitions): calling subsystem (api, mn, wallet etc). null: search 1) wallet, 2) default is wallet
    function validate_json(calling_pgm, json, request_msgtype, subsystem) {
        var pgm = module + '.validate_json: ';
        var json_schema, json_error, key;
        if (!json || !json.msgtype) return 'required msgtype is missing in json message (parameter 2)';
        // check/search json schema definition
        if (subsystem && (typeof subsystem != 'string')) return 'Invalid subsystem parameter 4. Must be a string (api, mn, wallet, etc)' ;
        if (!subsystem) subsystem = get_subsystem((json.msgtype)) ;
        // check json schema
        json_schema = json_schemas[subsystem][json.msgtype];
        if (!json_schema) return 'Unknown msgtype ' + json.msgtype + ' (subsystem = ' + subsystem + ')';
        if (request_msgtype && (json.msgtype != 'response')) {
            // validate request => response combinations
            if (request_msgtype == 'response') return 'Invalid request msgtype ' + request_msgtype;
            if (!json_schemas[subsystem][request_msgtype]) return 'Unknown request msgtype ' + request_msgtype;
            if ((request_msgtype == 'pubkeys') && (json.msgtype == 'pubkeys')) null; // OK combination
            else if ((request_msgtype == 'get_data') && (json.msgtype == 'data')) null; // OK combination
            else if ((request_msgtype == 'get_password') && (json.msgtype == 'password')) null; // OK combination
            else if ((request_msgtype == 'get_balance') && (json.msgtype == 'balance')) null; // OK combination
            else if ((request_msgtype == 'prepare_mt_request') && (json.msgtype == 'prepare_mt_response')) null; // OK combination
            else if ((request_msgtype == 'get_published') && (json.msgtype == 'published')) null; // OK combination
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
    // wallet must be valid json (see validate_json). return null if doublet code or doublet units
    var pseudo_wallet_sha256 = '0000000000000000000000000000000000000000000000000000000000000000' ;
    function calc_wallet_sha256 (wallet) {
        var pgm = module + '.calc_wallet_sha256: ';
        var new_wallet, wallet_sha256, i, codes, currency, new_currency, j, unit, units, pseudo_wallet_sha256_added ;
        if (!wallet.wallet_sha256) {
            wallet.wallet_sha256 = pseudo_wallet_sha256 ;
            pseudo_wallet_sha256_added = true ;
        }
        if (validate_json(pgm, wallet, null, 'api')) {
            // wallet is invalid. abort wallet_sha256 calc
            if (pseudo_wallet_sha256_added) delete wallet.wallet_sha256 ;
            return null ;
        }
        if (pseudo_wallet_sha256_added) delete wallet.wallet_sha256 ;
        if (debug) console.log(pgm + 'todo: normalize currencies list. sort and  fixed order of properties. see wallet schema definition');
        new_wallet = {
            wallet_address: wallet.wallet_address,
            wallet_domain: wallet.wallet_domain,
            wallet_title: wallet.wallet_title,
            wallet_description: wallet.wallet_description,
            currencies: [],
            api_url: wallet.api_url
        } ;
        codes = [] ;
        for (i=0 ; i<wallet.currencies.length ; i++) {
            // check doublet currency code
            currency = wallet.currencies[i] ;
            if (codes.indexOf(currency.code) != -1) {
                console.log(pgm + 'doublet currency code ' + currency.code + ' in wallet ' + JSON.stringify(wallet)) ;
                return null ;
            }
            codes.push(currency.code) ;
            // insert normalized currency into currencies array
            new_currency = {
                code: currency.code,
                name: currency.name,
                description: currency.description,
                url: currency.url,
                fee_info: currency.fee_info,
                units: currency.units ? [] : null
            } ;
            new_wallet.currencies.push(new_currency) ;
            if (!currency.units) continue ;
            // add units to currency
            units = [] ;
            for (j=0 ; j<currency.units.length ; j++) {
                unit = currency.units[j] ;
                // check doublet unit code
                if (units.indexOf(unit.unit) != -1) {
                    console.log(pgm + 'doublet unit ' + unit.unit + ' in wallet ' + JSON.stringify(wallet)) ;
                    return null ;
                }
                units.push(unit.unit) ;
                // insert normalized unit into units array
                new_currency.units.push({ unit: unit.unit, factor: unit.factor }) ;
            } // for j
            // sort units array
            new_currency.units.sort(function(a,b) { return b.unit > a.unit ? 1 : -1 }) ;
        } // for i
        // sort currencies array
        new_wallet.currencies.sort(function (a,b) { return b.code > a.code ? 1 : -1 }) ;
        // to json + sha256
        wallet_sha256 = CryptoJS.SHA256(JSON.stringify(new_wallet)).toString();
        return wallet_sha256 ;
    } // calc_wallet_sha256

    // helper. get wallet info from sha256 value (minimize wallet.json disk usage)
    // param:
    // - wallet_sha256. sha256 string or array with sha256 strings
    // - cb. callback. return hash with full wallet info for each wallet_sha256 + refresh_ui = true/false
    var wallet_info_cache = {} ; // sha256 => wallet_info
    function get_wallet_info (wallet_sha256, cb) {
        var pgm = module + '.get_wallet_info: ';
        var i, re, results, api_query_3, sha256, debug_seq, refresh_angular_ui ;
        refresh_angular_ui = false ;
        if (!wallet_sha256) return cb({error: 'invalid call. param 1 must be a string or an array of strings'}) ;
        if (typeof wallet_sha256 == 'string') wallet_sha256 = [wallet_sha256] ;
        if (!Array.isArray(wallet_sha256)) return cb({error: 'invalid call. param 1 must be a string or an array of strings'}) ;
        re = new RegExp('^[0-9a-f]{64}$') ;
        for (i=0 ; i<wallet_sha256.length ; i++) {
            if (typeof wallet_sha256[i] != 'string') return cb({error: 'invalid call. param 1 must be a string or an array of strings'}) ;
            if (!wallet_sha256[i].match(re)) return cb({error: 'invalid call. param 1 must be a sha256 string value or an array of sha256 string values'}) ;
        }
        if (typeof cb != 'function') return cb({error: 'invalid call. param 2 must be a callback function'});
        if (!ZeroFrame) cb({error: 'invalid call. ZeroFrame is missing. Please use ' + module + '.init({ZeroFrame:xxx}) to inject ZeroFrame API into this library'});

        results = {} ; // sha256 => wallet_info
        if (!wallet_sha256.length) return cb(results,refresh_angular_ui) ;

        // check cache
        for (i=wallet_sha256.length-1 ; i>=0 ; i--) {
            sha256 = wallet_sha256[i] ;
            if (!wallet_info_cache[sha256]) continue ; // not in cache
            // found in cache
            results[sha256] = JSON.parse(JSON.stringify(wallet_info_cache[sha256])) ;
            wallet_sha256.splice(i,1) ;
        }
        if (!wallet_sha256.length) return cb(results, refresh_angular_ui) ; // all sha256 values were found in cache

        // find wallets with full wallet info for the missing wallet_sha256 values
        api_query_3 =
            "select  wallet_sha256.value as wallet_sha256, json.directory " +
            "from keyvalue as wallet_sha256, keyvalue, json " +
            "where wallet_sha256.key = 'wallet_sha256' " +
            "and wallet_sha256.value in " ;
        for (i=0 ; i<wallet_sha256.length ; i++) {
            api_query_3 += i==0 ? '(' : ',' ;
            api_query_3 += " '" + wallet_sha256[i] + "'" ;
        }
        api_query_3 +=
            ") and keyvalue.json_id = wallet_sha256.json_id " +
            "and keyvalue.value is not null " +
            "and keyvalue.key like 'wallet_%' " +
            "and json.json_id = keyvalue.json_id " +
            "group by  wallet_sha256.value, keyvalue.json_id " +
            "having count(*) >= 4" ;
        if (debug) console.log(pgm + 'api query 3 = ' + api_query_3);

        debug_seq = debug_z_api_operation_start(pgm, 'api query 3', 'dbQuery') ;
        ZeroFrame.cmd("dbQuery", [api_query_3], function (wallets) {
            var pgm = module + '.get_wallet_info dbQuery callback: ' ;
            var error, check_wallet ;
            debug_z_api_operation_end(debug_seq, !wallets || wallets.error ? 'Failed' : 'OK') ;
            refresh_angular_ui = true ;
            if (wallets.error) {
                error = 'failed to find full wallet information. error = ' + wallets.error ;
                console.log(pgm + error);
                console.log(pgm + 'query = ' + api_query_3);
                return cb({error: error});
            }
            if (!wallets.length) {
                error = 'could not find any wallet.json with full wallet info for wallet_sha256 in ' + JSON.stringify(wallet_sha256) ;
                console.log(pgm + error);
                console.log(pgm + 'query = ' + api_query_3);
                return cb({error: error});
            }
            console.log(pgm + 'wallets = ' + JSON.stringify(wallets)) ;

            // lookup and check wallets one by one. One fileGet for each wallet.json file
            check_wallet = function () {
                var pgm = module + '.get_wallet_info.check_wallet: ' ;
                var row, inner_path, debug_seq ;
                row = wallets.shift() ;
                if (!row) return cb(results, refresh_angular_ui) ; // done
                if (results[row.wallet_sha256]) return check_wallet() ; // wallet info is already found for this sha256 value
                // check wallet.json file
                inner_path = 'merged-MoneyNetwork/' + row.directory + '/wallet.json' ;
                debug_seq = debug_z_api_operation_start(pgm, inner_path, 'fileGet');
                ZeroFrame.cmd("fileGet", {inner_path: inner_path, required: false}, function (wallet_str) {
                    var pgm = module + '.get_wallet_info.check_wallet fileGet callback: ' ;
                    var wallet, error, calculated_sha256 ;
                    debug_z_api_operation_end(debug_seq, wallet_str ? 'OK' : 'Not found') ;
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
                    error = validate_json(pgm, wallet, null, 'api') ;
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


    // ZeroFrame wrappers:
    // - mergerSiteAdd
    // - fileGet
    // - fileWrite
    // - sitePublish
    var new_hub_file_get_cbs = {} ; // any fileGet callback waiting for hub to be ready?
    function z_merger_site_add (hub, cb) {
        var pgm = module + '.z_merger_site_add: ' ;
        ZeroFrame.cmd("mergerSiteAdd", [hub], function (res) {
            var pgm = module + '.z_merger_site_add mergerSiteAdd callback: ' ;
            console.log(pgm + 'res = '+ JSON.stringify(res));
            if (res == 'ok') {
                console.log(pgm + 'new hub ' + hub + ' was added. hub must be ready. wait for jsons (dbQuery) before first fileGet request to new hub') ;
                if (!new_hub_file_get_cbs[my_user_hub]) new_hub_file_get_cbs[my_user_hub] = [] ; // fileGet callbacks waiting for mergerSiteAdd operation to finish
                // start demon process. waiting for new user data hub to be ready
                setTimeout(monitor_first_hub_event, 250) ;
            }
            cb(res) ;
        }) ; // mergerSiteAdd callback 3
    } // z_merger_site_add

    // demon. dbQuery. check for any json for new user data hub before running any fileGet operations
    function monitor_first_hub_event () {
        var pgm = module + '.monitor_first_hub_event: ' ;
        var api_query_4, debug_seq ;
        if (!Object.keys(new_hub_file_get_cbs).length) return ; // no new hubs to monitor

        api_query_4 =
            "select substr(directory, 1, instr(directory,'/')-1) as hub, count(*) as rows " +
            "from json " +
            "group by substr(directory, 1, instr(directory,'/')-1);" ;
        debug_seq = debug_z_api_operation_start(pgm, 'api query 4', 'dbQuery', show_debug('z_db_query')) ;
        ZeroFrame.cmd("dbQuery", [api_query_4], function (res) {
            var pgm = service + '.monitor_first_hub_event dbQuery callback: ';
            var hub, i, cbs, cb;
            // if (detected_client_log_out(pgm)) return ;
            debug_z_api_operation_end(debug_seq, (!res || res.error) ? 'Failed. error = ' + JSON.stringify(res) : 'OK');
            if (res.error) {
                console.log(pgm + "first hub lookup failed: " + res.error);
                console.log(pgm + 'query = ' + api_query_4);
                for (hub in new_hub_file_get_cbs) console.log(pgm + 'error: ' + new_hub_file_get_cbs[hub].length + ' callbacks are waiting forever for hub ' + hub) ;
                return ;
            }
            for (i=0 ; i<res.length ; i++) {
                hub = res[i].hub ;
                if (!new_hub_file_get_cbs[hub]) continue ;
                console.log(pgm + 'new user data hub ' + hub + ' is ready. ' + new_hub_file_get_cbs[hub].length + ' fileGet operations are waiting in callback queue. running callbacks now') ;
                // move to temporary cbs array
                cbs = [] ;
                while (new_hub_file_get_cbs[hub].length) {
                    cb = new_hub_file_get_cbs[hub].shift() ;
                    cbs.push(cb) ;
                }
                delete new_hub_file_get_cbs[hub] ;
                // run cbs
                while (cbs.length) {
                    cb = cbs.shift() ;
                    cb() ;
                }
            }
            setTimeout(monitor_first_hub_event, 250) ;
        }) ; // dbQuery callback

    } // monitor_first_hub_event

    // - todo: add long running operation warning to debug_z_api_operation_pending
    var inner_path_re1 = /data\/users\// ; // user directory?
    var inner_path_re2 = /^data\/users\// ; // invalid inner_path. old before merger-site syntax
    var inner_path_re3 = /^merged-MoneyNetwork\/(.*?)\/data\/users\/content\.json$/ ; // extract hub
    var inner_path_re4 = /^merged-MoneyNetwork\/(.*?)\/data\/users\/(.*?)\/(.*?)$/ ; // extract hub, auth_address and filename

    function z_file_get (pgm, options, cb) {
        var inner_path, match2, hub, pos, filename, extra, optional_file, get_optional_file_info ;

        // Check ZeroFrame
        if (!ZeroFrame) throw pgm + 'fileGet aborted. ZeroFrame is missing. Please use ' + module + '.init({ZeroFrame:xxx}) to inject ZeroFrame API into ' + module;

        inner_path = options.inner_path ;
        if (inner_path.match(inner_path_re1)) {
            // path to user directory.
            // check inner_path (old before merger site syntax data/users/<auth_address>/<filename>
            if (inner_path.match(inner_path_re2)) throw pgm + 'Invalid fileGet path. Not a merger-site path. inner_path = ' + inner_path ;
            // check new merger site syntax merged-MoneyNetwork/<hub>/data/users/<auth_address>/<filename>
            match2 = inner_path.match(inner_path_re3) || inner_path.match(inner_path_re4);
            if (match2) {
                // check hub
                hub = match2[1] ;
                if (new_hub_file_get_cbs[hub]) {
                    console.log(pgm + 'new hub ' + hub + '. waiting with fileGet request for ' + inner_path) ;
                    new_hub_file_get_cbs[hub].push(function() { z_file_get (pgm, options, cb) }) ;
                    return ;
                }
            }
            else throw pgm + 'Invalid fileGet path. Not a merger-site path. inner_path = ' + inner_path ;
        }
        else optional_file = false ; // workaround for optional fileGet is not relevant outside user directories

        // optional fileGet operation? Some issues with optional fileGet calls
        // problem with hanging fileGet operation for delete optional files.
        // and an issue with fileGet operation for optional files without any peer (peer information is not always 100% correct)
        pos = inner_path.lastIndexOf('/') ;
        filename = inner_path.substr(pos+1, inner_path.length-pos) ;

        // todo: use files_allowed from content.json. not a hardcoded list of normal files
        // todo: optional pattern. maybe optional files pattern overrules files_allowed pattern?
        extra = {} ;
        extra.optional_file = (['content.json', 'data.json', 'status.json', 'like.json', 'avatar.jpg', 'avatar.png', 'wallet.json'].indexOf(filename) == -1);
        if (options.timeout_count) {
            // special MN option. retry optional fileGet <timeout_count> times. First fileGet will often fail with timeout
            extra.timeout_count = options.timeout_count ;
            delete options.timeout_count ;
        }
        if (debug) console.log(pgm + 'filename = ' + JSON.stringify(filename) + ', optional_file = ' + extra.optional_file) ;

        // optional step. get info about optional file before fileGet operation
        // "!file_info.is_downloaded && !file_info.peer" should be not downloaded optional files without any peers
        // but the information is not already correct. peer can be 0 and other client is ready to serve optional file.
        // try a fileGet with required and a "short" timeout
        get_optional_file_info = function (cb) {
            if (!extra.optional_file) return cb(null) ;
            ZeroFrame.cmd("optionalFileInfo", [inner_path], function (file_info) {
                if (debug) console.log(pgm + 'file_info = ' + JSON.stringify(file_info)) ;
                cb(file_info) ;
            }) ; // optionalFileInfo
        } ; // get_optional_file_info
        get_optional_file_info(function(file_info) {
            var cb2_done, cb2, cb2_timeout, timeout, process_id, debug_seq, warnings, old_options ;
            extra.file_info = file_info ;
            if (extra.optional_file && !file_info) {
                if (debug) console.log(pgm + 'optional fileGet and no optional file info. must be a deleted optional file. abort fileGet operation') ;
                return cb(null, extra) ;
            }
            if (extra.optional_file) {
                // some additional checks and warnings.
                if (!file_info) {
                    if (debug) console.log(pgm + 'optional fileGet and no optional file info. must be a deleted optional file. abort fileGet operation') ;
                    return cb(null, extra) ;
                }
                if (!file_info.is_downloaded && !file_info.peer) {
                    // not downloaded optional files and (maybe) no peers! peer information is not always correct
                    if (debug) console.log(pgm + 'warning. starting fileGet operation for optional file without any peers. file_info = ' + JSON.stringify(file_info)) ;
                    warnings = [] ;
                    old_options = JSON.stringify(options) ;
                    if (!options.required) {
                        options.required = true ;
                        warnings.push('added required=true to fileGet operation') ;
                    }
                    if (!options.timeout) {
                        options.timeout = 60 ;
                        warnings.push('added timeout=60 to fileGet operation') ;
                    }
                    if (warnings.length && debug) console.log(pgm + 'Warning: ' + warnings.join('. ') + '. old options = ' + old_options + ', new_options = ' + JSON.stringify(options)) ;
                }
            }

            // extend cb. add ZeroNet API debug messages + timeout processing.
            // cb2 is run as fileGet callback or is run by setTimeout (sometimes problem with optional fileGet operation running forever)
            cb2_done = false ;
            cb2 = function (data, timeout) {
                var options_clone ;
                if (process_id) {
                    try {$timeout.cancel(process_id)}
                    catch (e) {}
                    process_id = null ;
                }
                if (cb2_done) return ; // cb2 has already run
                cb2_done = true ;
                if (timeout) extra.timeout = timeout ;
                // MoneyNetworkHelper.debug_z_api_operation_end(debug_seq);
                debug_z_api_operation_end(debug_seq, data ? 'OK' : 'Not found');

                if (!data && extra.optional_file && extra.hasOwnProperty('timeout_count') && (extra.timeout_count > 0)) {
                    if (debug) console.log(pgm + inner_path + ' fileGet failed. timeout_count was ' + extra.timeout_count) ;
                    if (extra.timeout_count > 0) {
                        // optional fileGet failed. called with a timeout_count. Retry operation
                        options_clone = JSON.parse(JSON.stringify(options)) ;
                        options_clone.timeout_count = extra.timeout_count ;
                        options_clone.timeout_count-- ;
                        if (debug) console.log(pgm + 'retrying ' + inner_path + ' fileGet with timeout_count = ' + options_clone.timeout_count) ;
                        z_file_get(pgm, options_clone, cb) ;
                        return ;
                    }
                }
                cb(data, extra) ;
            } ; // fileGet callback

            // force timeout after timeout || 60 seconds
            cb2_timeout = function () {
                cb2(null, true) ;
            };
            timeout = options.timeout || 60 ; // timeout in seconds
            process_id = setTimeout(cb2_timeout, timeout*1000) ;

            // start fileGet
            debug_seq = debug_z_api_operation_start(pgm, inner_path, 'fileGet') ;
            ZeroFrame.cmd("fileGet", options, cb2) ;

        }) ; // get_optional_file_info callback

    } // z_file_get

    // ZeroFrame fileWrite wrapper.
    // inner_path must be a merger site path
    // auth_address must be auth_address for current user
    // max one fileWrite process. Other fileWrite processes must wait (This file still in sync, if you write is now, then the previous content may be lost)
    var z_file_write_cbs = [] ; // cbs waiting for other fileWrite to finish
    var z_file_write_running = false ;
    function z_file_write (pgm, inner_path, content, cb) {
        var match2, auth_address, this_file_write_cb, debug_seq ;
        if (!ZeroFrame) throw pgm + 'fileWrite aborted. ZeroFrame is missing. Please use ' + module + '.init({ZeroFrame:xxx}) to inject ZeroFrame API into ' + module;
        if (!inner_path || inner_path.match(inner_path_re2)) throw pgm + 'Invalid fileWrite path. Not a merger-site path. inner_path = ' + inner_path ;
        match2 = inner_path.match(inner_path_re4) ;
        if (match2) {
            auth_address = match2[2] ;
            if (!ZeroFrame.site_info) throw pgm + 'fileWrite aborted. ZeroFrame is not yet ready' ;
            if (!ZeroFrame.site_info.cert_user_id) throw pgm + 'fileWrite aborted. No ZeroNet certificate selected' ;
            if (auth_address != ZeroFrame.site_info.auth_address) {
                console.log(pgm + 'inner_path = ' + inner_path + ', auth_address = ' + auth_address + ', ZeroFrame.site_info.auth_address = ' + ZeroFrame.site_info.auth_address);
                throw pgm + 'fileWrite aborted. Writing to an invalid user directory.' ;
            }
        }
        else throw pgm + 'Invalid fileGet path. Not a merger-site path. inner_path = ' + inner_path ;

        if (z_file_write_running) {
            // wait for previous fileWrite process to finish
            z_file_write_cbs.push({inner_path: inner_path, content: content, cb: cb}) ;
            return ;
        }
        z_file_write_running = true ;

        // extend cb.
        this_file_write_cb = function(res) {
            var next_file_write_cb, run_cb ;
            z_file_write_running = false ;
            debug_z_api_operation_end(debug_seq, res == 'ok' ? 'OK' : 'Failed. error = ' + JSON.stringify(res));
            run_cb = function () { cb(res)} ;
            setTimeout(run_cb, 0) ;
            if (!z_file_write_cbs.length) return ;
            next_file_write_cb = z_file_write_cbs.shift() ;
            z_file_write(pgm, next_file_write_cb.inner_path, next_file_write_cb.content, next_file_write_cb.cb) ;
        }; // cb2

        debug_seq = debug_z_api_operation_start(pgm, inner_path, 'fileWrite') ;
        ZeroFrame.cmd("fileWrite", [inner_path, content], this_file_write_cb) ;

    } // z_file_write

    // sitePublish. long running operation.
    // sitePublish must wait for previous publish to finish
    // sitePublish must wait for long running update transactions (write and delete) to finish before starting publish
    // long running update transactions must wait until publish has finished
    // use start_transaction and end_transaction
    var transactions = {} ; // timestamp => object with transaction info

    function start_transaction(pgm, cb) {
        var transaction_timestamp, key;
        if (typeof cb != 'function') throw module + 'start_transaction: invalid call. second parameter cb must be a callback function';

        transaction_timestamp = new Date().getTime();
        while (transactions[transaction_timestamp]) transaction_timestamp++;
        transactions[transaction_timestamp] = {
            pgm: pgm,
            created_at: transaction_timestamp,
            cb: cb,
            running: false
        };
        // any running transactions
        for (key in transactions) {
            if (transactions[key].running) {
                // wait
                if (debug) console.log(module + 'transactions: paused ' + pgm + '. ' + (Object.keys(transactions).length - 1) + ' transactions in queue (1 running)');
                return;
            }
        }
        // start now
        transactions[transaction_timestamp].running = true;
        transactions[transaction_timestamp].started_at = transaction_timestamp;
        transactions[transaction_timestamp].cb(transaction_timestamp);


    } // start_transaction

    function end_transaction (transaction_timestamp) {
        var pgm = module + '.end_update_transaction: ' ;
        var now, waittime, elapsedtime, key ;
        if (!transactions[transaction_timestamp]) throw 'could not find any transaction with transaction_timestamp = ' + transaction_timestamp;
        now = new Date().getTime() ;
        transactions[transaction_timestamp].running = false ;
        transactions[transaction_timestamp].finished_at = now ;
        waittime = transactions[transaction_timestamp].started_at - transactions[transaction_timestamp].created_at ;
        elapsedtime = transactions[transaction_timestamp].finished_at - transactions[transaction_timestamp].started_at ;
        if (debug) console.log(module + '.transactions: finished running ' + transactions[transaction_timestamp].pgm + ', waittime = ' + waittime + ' ms. elapsed time = ' + elapsedtime + ' ms');
        delete transactions[transaction_timestamp] ;
        if (!Object.keys(transactions).length) return ;
        for (key in transactions) {
            // start next long running transaction or publish
            transactions[key].running = true ;
            transactions[key].started_at = now ;
            waittime = transactions[key].started_at - transactions[key].created_at ;
            if (debug) console.log(module + '.transactions: starting ' + transactions[key].pgm + '. waittime ' + waittime + ' ms') ;
            transactions[key].cb(key) ;
            break ;
        }
    } // end_transaction

    // keep track of last OK publish timestamp. minimum interval between publish is 16 seconds (shared for MN and MN wallet sites)
    // set in z_site_publish in this client (MN or wallet)
    // set by incoming published messages from other MN sessions (MN or wallets)

    var last_published = 0 ; // timestamp for last OK publish. minimum interval between publish is 16 seconds (MN and wallets)
    function get_last_published () {
        return last_published ;
    }
    function set_last_published (timestamp) {
        var pgm = module + '.set_last_published: ' ;
        var old_last_published, updated, elapsed ;
        if (!timestamp) timestamp = new Date().getTime() ;
        if (timestamp > 9999999999) timestamp = Math.floor(timestamp / 1000) ;
        old_last_published = last_published ;
        if (timestamp > last_published) {
            last_published = timestamp ;
            updated = true ;
        }
        else updated = false ;
        elapsed = last_published - old_last_published ;
        console.log(pgm + 'elapsed = ' + elapsed + ', old_last_published = ' + old_last_published + ', last_publish = ' + last_published) ;
        return updated ;
    }

    // sitePublish
    // - privatekey is not supported
    // - inner_path must be an user directory /^merged-MoneyNetwork\/(.*?)\/data\/users\/content\.json$/ path
    // - minimum interval between publish is 16 seconds (shared for MN and MN wallet sites)
    function z_site_publish (options, cb) {
        var pgm = module + '.z_site_publish: ' ;
        var inner_path, match4, auth_address, filename, hub ;
        if (!ZeroFrame) throw pgm + 'sitePublish aborted. ZeroFrame is missing. Please use ' + module + '.init({ZeroFrame:xxx}) to inject ZeroFrame API into ' + module;
        // check private key
        if (options.privatekey) {
            console.log(pgm + 'warning. siteSign with privatekey is not supported. Ignoring privatekey') ;
            delete options.privatekey ;
        }
        // check inner_path
        inner_path = options.inner_path ;
        if (!inner_path || inner_path.match(inner_path_re2)) throw 'sitePublish aborted. Not a merger-site path. inner_path = ' + inner_path ; // old before moving to merger sites
        if (!(match4=inner_path.match(inner_path_re4))) throw 'sitePublish aborted. Not a merger-site path. inner_path = ' + inner_path ;
        auth_address = match4[2] ;
        if (!ZeroFrame.site_info) throw 'sitePublish aborted. ZeroFrame is not yet ready' ;
        if (!ZeroFrame.site_info.cert_user_id) throw 'sitePublish aborted. No ZeroNet certificate selected' ;
        if (auth_address != ZeroFrame.site_info.auth_address) {
            console.log(pgm + 'inner_path = ' + inner_path + ', auth_address = ' + auth_address + ', ZeroFrame.site_info.auth_address = ' + ZeroFrame.site_info.auth_address);
            throw pgm + 'sitePublish aborted. Publishing an other user directory.' ;
        }
        filename = match4[3] ;
        if (filename != 'content.json') {
            console.log(pgm + 'warning. sitePublish should be called with path to user content.json file. inner_path = ' + JSON.stringify(inner_path)) ;
            hub = match4[1] ;
            inner_path = 'merged-MoneyNetwork/' + hub + '/data/users/' + auth_address + '/content.json' ;
            options.inner_path = inner_path ;
        }

        // start publish transaction. publish must wait for long running update transactions to wait
        start_transaction(pgm, function(transaction_timestamp){

            var debug_seq ;
            debug_seq = debug_z_api_operation_start(pgm, inner_path, 'sitePublish') ;
            ZeroFrame.cmd("sitePublish", options, function (res) {
                var run_cb ;
                debug_z_api_operation_end(debug_seq, res == 'ok' ? 'OK' : 'Failed. error = ' + JSON.stringify(res));
                if (res == 'ok') set_last_published() ;
                // run sitePublish cb callback (content published)
                run_cb = function () { cb(res)} ;
                setTimeout(run_cb, 0) ;
                // end transaction. start any transaction waiting for publish to finish
                end_transaction(transaction_timestamp) ;
            }) ; // sitePublish callback 2
        }) ; // start_transaction callback 1
    } // z_site_publish


    // export MoneyNetworkAPILib
    return {
        config: config,
        set_this_user_path: set_this_user_path,
        get_ZeroFrame: get_ZeroFrame,
        get_optional: get_optional,
        get_this_user_path: get_this_user_path,
        is_user_path: is_user_path,
        is_client: is_client,
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
        add_json_schemas: add_json_schemas,
        get_subsystem: get_subsystem,
        validate_json: validate_json,
        calc_wallet_sha256: calc_wallet_sha256,
        get_wallet_info: get_wallet_info,
        debug_z_api_operation_start:debug_z_api_operation_start,
        debug_z_api_operation_end: debug_z_api_operation_end,
        start_transaction: start_transaction,
        end_transaction: end_transaction,
        z_merger_site_add: z_merger_site_add,
        z_file_get: z_file_get,
        z_file_write: z_file_write,
        z_site_publish: z_site_publish,
        set_last_published: set_last_published,
        get_last_published: get_last_published
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
// - master. only used for wallet to wallet communication. set client/master role for API instance and ignores global client/master setting
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
    if (options.prvkey) this.this_session_prvkey = options.prvkey ;
    if (options.hasOwnProperty('userid2')) this.this_session_userid2 = options.userid2 ;

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
    if (options.cb) {
        if (typeof options.cb != 'function') throw pgm + 'invalid call. options.cb is not a function' ;
        this.cb = options.cb ;
        if (options.cb_fileget) this.cb_fileget = true ; // fileGet in demon process
        if (options.cb_decrypt) this.cb_decrypt = true ; // decrypt in demon process
        if (this.cb_decrypt) this.cb_fileget = true ; // cannot decrypt without fileGet
    }
    // extra info not used by MoneyNetworkAPI
    this.extra = options.extra ;
    // set master/client role on MoneyNetworkAPI instance level. Used in wallet to wallet communication
    if (options.hasOwnProperty('master')) {
        if (typeof options.master != 'boolean') throw pgm + 'invalid call. options.master must be a boolean' ;
        if (!this.sessionid) throw pgm + 'invalid call. sessionid is required when using the master parameter' ;
        this.master = options.master ;
        this.client = !this.master ;
    }
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
        this.this_session_prvkey = options.prvkey;
    }

    if (options.userid2) {
        self.readonly(options,'userid2') ;
        this.this_session_userid2 = options.userid2 ;
    }

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
    // optional callback function process incoming messages for this session
    if (options.cb) {
        if (typeof options.cb != 'function') throw pgm + 'invalid call. options.cb is not a function' ;
        this.cb = options.cb ;
        if (options.cb_fileget) this.cb_fileget = true ; // fileGet in demon process
        if (options.cb_decrypt) this.cb_decrypt = true ; // decrypt in demon process
        if (this.cb_decrypt) this.cb_fileget = true ; // cannot decrypt without fileGet
    }
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

MoneyNetworkAPI.prototype.is_client = function (cb) {
    if (this.client || this.master) cb(this.client) ; // W2W communication. Wallet that starts the communication is the master.
    else MoneyNetworkAPILib.is_client(cb) ; // MN2W communication. MN session is always the master.
} ; // is_client

// get session filenames for MN <=> wallet communication
MoneyNetworkAPI.prototype.get_session_filenames = function (cb) {
    var pgm = this.module + '.get_session_filenames: ' ;
    var self;
    self = this;
    this.check_destroyed(pgm) ;
    if (!this.sessionid) {
        // no sessionid. must part of a wallet session restore call. wallet session must send get_password request to MN to restore sessionid from Ls
        return cb(this.this_session_filename, this.other_session_filename, null);
    }
    else {
        // session. find filenames and unlock password from sha256 signature
        self.is_client(function (client) {
            var sha256, moneynetwork_session_filename, wallet_session_filename;
            sha256 = CryptoJS.SHA256(self.sessionid).toString();
            moneynetwork_session_filename = sha256.substr(0, 10); // first 10 characters of sha256 signature
            wallet_session_filename = sha256.substr(sha256.length - 10); // last 10 characters of sha256 signature
            self.this_session_filename = client ? wallet_session_filename : moneynetwork_session_filename;
            self.other_session_filename = client ? moneynetwork_session_filename : wallet_session_filename;
            self.unlock_pwd2 = sha256.substr(27, 10); // for restore session. unlock pwd2 password in get_password request
            self.log(pgm, 'wallet = ' + client + ', this_session_filename = ' + self.this_session_filename + ', other_session_filename = ' + self.other_session_filename) ;
            cb(self.this_session_filename, self.other_session_filename, self.unlock_pwd2);
        }); // is_client
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
    var self, debug_seq0 ;
    self = this;
    this.check_destroyed(pgm) ;
    if (!this.ZeroFrame) throw pgm + 'encryption failed. ZeroFrame is missing in encryption setup';
    if (!this.other_session_pubkey2) throw pgm + 'encryption failed. Pubkey2 is missing in encryption setup';
    // 1a. get random password
    this.log(pgm, 'encrypted_text_1 = ' + encrypted_text_1 + '. calling aesEncrypt');
    debug_seq0 = MoneyNetworkAPILib.debug_z_api_operation_start(pgm, 'n/a', 'aesEncrypt') ;
    this.ZeroFrame.cmd("aesEncrypt", [""], function (res1) {
        var pgm = self.module + '.encrypt_2 aesEncrypt callback 1: ';
        var password, debug_seq1;
        MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq0, res1[0] ? 'OK' : 'Failed') ;
        password = res1[0];
        self.check_destroyed(pgm) ;
        // 1b. encrypt password
        debug_seq1 = MoneyNetworkAPILib.debug_z_api_operation_start(pgm, 'n/a', 'eciesEncrypt') ;
        self.ZeroFrame.cmd("eciesEncrypt", [password, self.other_session_pubkey2], function (key) {
            var pgm = self.module + '.encrypt_2 eciesEncrypt callback 2: ';
            var debug_seq2 ;
            MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq1, key ? 'OK' : 'Failed') ;
            self.log(pgm, 'self.other_session_pubkey2 = ' + self.other_session_pubkey2 + ', key = ' + key);
            // 1c. encrypt text
            self.check_destroyed(pgm) ;
            debug_seq2 = MoneyNetworkAPILib.debug_z_api_operation_start(pgm, 'n/a', 'aesEncrypt') ;
            self.ZeroFrame.cmd("aesEncrypt", [encrypted_text_1, password], function (res3) {
                var pgm = self.module + '.encrypt_2 aesEncrypt callback 3: ';
                var iv, encrypted_text, encrypted_array, encrypted_text_2;
                MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq2, res3 ? 'OK' : 'Failed');
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
    var self, encrypted_array, key, iv, encrypted_text, debug_seq0;
    this.check_destroyed(pgm) ;
    self = this;
    if (!this.ZeroFrame) throw pgm + 'decryption failed. ZeroFrame is missing in encryption setup';
    this.log(pgm, 'encrypted_text_2 = ' + encrypted_text_2);
    encrypted_array = JSON.parse(encrypted_text_2);
    key = encrypted_array[0];
    iv = encrypted_array[1];
    encrypted_text = encrypted_array[2];
    // 1a. decrypt key = password
    debug_seq0 = MoneyNetworkAPILib.debug_z_api_operation_start(pgm, key, 'eciesDecrypt') ;
    this.ZeroFrame.cmd("eciesDecrypt", [key, (this.this_session_userid2 || 0)], function (password) {
        var pgm = self.module + '.decrypt_2 eciesDecrypt callback 1: ';
        var debug_seq1 ;
        MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq0, password ? 'OK' : 'Failed') ;
        if (!password) throw pgm + 'key eciesDecrypt failed. key = ' + key + ', userid2 = ' + JSON.stringify(self.this_session_userid2 || 0);
        // 1b. decrypt encrypted_text
        debug_seq1 = MoneyNetworkAPILib.debug_z_api_operation_start(pgm, null, 'aesDecrypt') ;
        self.ZeroFrame.cmd("aesDecrypt", [iv, encrypted_text, password], function (encrypted_text_1) {
            var pgm = self.module + '.decrypt_2 aesDecrypt callback 2: ';
            MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq1, encrypted_text_1 ? 'OK' : 'Failed') ;
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
// encryption layers: integer or array of integers: 1 JSEncrypt, 2, cryptMessage, 3 symmetric encryption
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
    var self, inner_path, debug_seq0;
    this.check_destroyed(pgm) ;
    self = this;
    if (!this.this_user_path) this.this_user_path = MoneyNetworkAPILib.get_this_user_path() ;
    if (!this.this_user_path) return cb(); // error. user_path is required
    inner_path = this.this_user_path + 'content.json';
    // 1: fileGet
    this.log(pgm, inner_path + ' fileGet started') ;
    debug_seq0 = MoneyNetworkAPILib.debug_z_api_operation_start(pgm, inner_path, 'fileGet') ;
    MoneyNetworkAPILib.z_file_get(pgm, {inner_path: inner_path, required: false}, function (content_str) {
        var pgm = self.module + '.get_content_json fileGet callback 1: ';
        var content, json_raw;
        MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq0, content_str ? 'OK' : 'Not found') ;
        if (content_str) {
            content = JSON.parse(content_str);
            return cb(content);
        }
        else content = {};
        if (!self.this_optional) return cb(content); // maybe an error but optional files support was not requested
        // 2: fileWrite (empty content.json file)
        // new content.json file and optional files support requested. write + sign + get
        json_raw = unescape(encodeURIComponent(JSON.stringify(content, null, "\t")));
        MoneyNetworkAPILib.z_file_write(pgm, inner_path, btoa(json_raw), function (res) {
            var pgm = self.module + '.get_content_json fileWrite callback 2: ';
            var debug_seq2 ;
            self.log(pgm, 'res = ' + JSON.stringify(res));
            if (res != 'ok') return cb(); // error: fileWrite failed
            // 3: siteSign
            debug_seq2 = MoneyNetworkAPILib.debug_z_api_operation_start(pgm, inner_path, 'siteSign');
            self.ZeroFrame.cmd("siteSign", {inner_path: inner_path}, function (res) {
                var pgm = self.module + '.get_content_json siteSign callback 3: ';
                var debug_seq3 ;
                MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq2, res == 'ok' ? 'OK' : 'Failed. error = ' + JSON.stringify(res)) ;
                self.log(pgm, 'res = ' + JSON.stringify(res));
                if (res != 'ok') return cb(); // error: siteSign failed
                // 4: fileGet
                debug_seq3 = MoneyNetworkAPILib.debug_z_api_operation_start(pgm, inner_path, 'fileGet') ;
                MoneyNetworkAPILib.z_file_get(pgm, {inner_path: inner_path, required: true}, function (content_str) {
                    var content;
                    MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq3, content_str ? 'OK' : 'Not found');
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
        var pgm = self.module + '.add_optional_files_support get_content_json callback 1: ';
        var inner_path, json_raw, optional_files;
        if (!content) return cb({error: 'fileGet content.json failed'});
        self.log(pgm, 'content.modified = ' + content.modified) ;
        if (content.optional == self.this_optional) {
            // optional files support already OK.
            return cb({});
        }
        // add optional files support
        self.log(pgm, 'adding optional to content.json. old optional = ' + JSON.stringify(content.optional) + ', new optional = ' + JSON.stringify(self.this_optional)) ;
        content.optional = self.this_optional;
        // 2: write content.json
        inner_path = self.this_user_path + 'content.json';
        json_raw = unescape(encodeURIComponent(JSON.stringify(content, null, "\t")));
        MoneyNetworkAPILib.z_file_write(pgm, inner_path, btoa(json_raw), function(res) {
            var pgm = self.module + '.add_optional_files_support fileWrite callback 2: ';
            var debug_seq2 ;
            self.log(pgm, 'res = ' + JSON.stringify(res));
            if (res != 'ok') return cb({error: 'fileWrite failed. error = ' + res}); // error: fileWrite failed
            // 3: siteSign
            debug_seq2 = MoneyNetworkAPILib.debug_z_api_operation_start(pgm, inner_path, 'siteSign');
            self.ZeroFrame.cmd("siteSign", {inner_path: inner_path}, function (res) {
                var pgm = self.module + '.add_optional_files_support siteSign callback 3: ';
                MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq2, res == 'ok' ? 'OK' : 'Failed. error = ' + JSON.stringify(res));
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
//   - optional: session filename extension used for optional files. default found via json.msgtype => subsystem. api: i, other: e
//     i    - <session filename>-i.<timestamp> - internal API communication between MN and wallet. not published and no distribution help is needed
//     e    - <session filename>-e.<timestamp> - external wallet to wallet communication. published and distribution help would be nice
//     o    - <session filename>-o.<timestamp> - offline wallet to wallet communication. published. distribution help would be nice.
//     io   - <session filename>-io.<timestamp> - internal and offline. offline messages between wallet and mn sessions. no distribution help is needed
//     p    - <session filename>-p.<timestamp> - internal API communication between MN and wallets. not published and no distribution help is needed (publishing messages)
//     null - <session filename>.<timestamp> - normal file. distributed to all peers. used only as a fallback option when optional file distribution fails
//   - subsystem: calling subsystem. for example api, mn or wallet. used for json schema validations
// - cb: callback. returns an empty hash, a hash with an error messsage or a response
MoneyNetworkAPI.prototype.send_message = function (request, options, cb) {
    var pgm = this.module + '.send_message: ';
    var self, response, request_msgtype, request_timestamp, encryptions, error, request_at, request_file_timestamp,
        default_timeout, timeout_at, month, year, cleanup_in, offline_transaction, request_timeout_at, debug_seq0,
        subsystem, optional ;
    self = this;
    this.check_destroyed(pgm) ;

    if (!cb) cb = function (response) {
        self.log(pgm, 'response = ' + JSON.stringify(response));
    };
    if (typeof cb != 'function') throw pgm + 'Invalid call. parameter 3 cb must be a callback function' ;

    this.log(pgm, 'request = ' + JSON.stringify(request)) ;
    request_at = new Date().getTime();

    // get params
    if (!options) options = {};
    response = options.response;
    request_file_timestamp = options.timestamp || request_at ; // timestamp - only if request json is a response to a previous request
    request_msgtype = options.msgtype; // only if request json is a response to a previous request
    request_timestamp = options.request ; // only if request json is a response to a previous request
    if (options.offline) throw pgm + pgm + 'options.offline is no longer supported. Please use options.optional and/or options.subsystem instead' ;
    if (options.timeout_at && (typeof options.timeout_at == 'number')) {
        // sending a response to a previous request
        request_timeout_at = options.timeout_at ;
        if (request_at > request_timeout_at) return cb({error: 'Cannot send message. Request timeout at ' + request_timeout_at}) ;
    }
    encryptions = options.hasOwnProperty('encryptions') ? options.encryptions : [1, 2, 3];
    if (typeof encryptions == 'number') encryptions = [encryptions];
    subsystem = options.subsystem ;
    if (subsystem && (typeof subsystem != 'string')) return cb({error: 'Cannot send message. options.subsystem must be a string'}) ;
    if (!subsystem) subsystem = MoneyNetworkAPILib.get_subsystem(request_msgtype) ;
    // use normal file or optional file (internal, external, offline etc). any file with - in filename is an optional file
    if (options.hasOwnProperty('optional')) {
        // set by calling client
        if ([null, 'i', 'e', 'o', 'io', 'p'].indexOf(options.optional) == -1) return cb({error: 'Cannot send message. optional file extension must be null, i, e, o, io or p'}) ;
        if (options.optional == null) optional = '' ; // normal file
        else optional = '-' + options.optional ; // optional file
    }
    else if ((subsystem == 'api') && (['publish_started','get_published','published'].indexOf(request.msgtype) != -1)) {
        // optional file used in special published messages between MN sessions
        optional = 'p' ;
    }
    else optional = subsystem == 'api' ? '-i' : '-e' ; // optional file (internal or external)
    self.log(pgm, 'msgtype = ' + request.msgtype + ', subsystem = ' + subsystem + ', optional = ' + optional) ;

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
    error = MoneyNetworkAPILib.validate_json(pgm, request, request_msgtype, subsystem);
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
    debug_seq0 = MoneyNetworkAPILib.debug_z_api_operation_start(pgm, null, 'siteInfo') ;
    this.ZeroFrame.cmd("siteInfo", {}, function (site_info) {
        var pgm = self.module + '.send_message siteInfo callback 1: ';
        var regexp ;
        MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq0, site_info ? 'OK' : 'Failed');
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
            var encryptions_clone ;

            // 3: encrypt json
            encryptions_clone = JSON.parse(JSON.stringify(encryptions)) ;
            self.encrypt_json(request, encryptions, function (encrypted_json) {
                var pgm = self.module + '.send_message encrypt_json callback 3: ';
                self.log(pgm, 'encrypted_json = ' + JSON.stringify(encrypted_json));

                // 4: add optional files support
                self.add_optional_files_support(function (res) {
                    var pgm = self.module + '.send_message add_optional_files_support callback 4: ';
                    var inner_path4, json_raw;
                    if (!res || res.error) return cb({error: 'Cannot send message. Add optional files support failed. ' + JSON.stringify(res)});

                    // 5: write file
                    inner_path4 = self.this_user_path + this_session_filename + optional + '.' + request_file_timestamp;
                    json_raw = unescape(encodeURIComponent(JSON.stringify(encrypted_json, null, "\t")));
                    MoneyNetworkAPILib.z_file_write(pgm, inner_path4, btoa(json_raw), function (res) {
                        var pgm = self.module + '.send_message fileWrite callback 5: ';
                        var inner_path5, debug_seq5;
                        // 6: siteSign. publish not needed for within client communication
                        inner_path5 = self.this_user_path + 'content.json';
                        self.log(pgm, 'sign content.json with new optional file ' + inner_path4);
                        debug_seq5 = MoneyNetworkAPILib.debug_z_api_operation_start(pgm, inner_path5, 'siteSign');
                        self.ZeroFrame.cmd("siteSign", {inner_path: inner_path5, remove_missing_optional: true}, function (res) {
                            var pgm = self.module + '.send_message siteSign callback 6: ';
                            var debug_seq6;
                            MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq5, res == 'ok' ? 'OK' : 'Failed. error = ' + JSON.stringify(res));
                            self.log(pgm, 'res = ' + JSON.stringify(res));

                            // 7: check file_info for outgoing optional file. must be different from incoming optional files ...
                            // todo: do not check optional file info for normal files (optional = '')
                            debug_seq6 = MoneyNetworkAPILib.debug_z_api_operation_start(pgm, inner_path4, 'optionalFileInfo');
                            ZeroFrame.cmd("optionalFileInfo", [inner_path4], function (file_info) {
                                var pgm = self.module + '.send_message.optionalFileInfo callback 7: ';
                                var delete_request, cleanup_job_id, get_and_decrypt, response_filename, error, api_query_5, wait_for_response;
                                MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq6, file_info ? 'OK' : 'Failed');
                                // self.log(pgm, 'file_info (outgoing) = ' + JSON.stringify(file_info)) ;
                                //info_info = {
                                //    "inner_path": "data/users/18DbeZgtVCcLghmtzvg4Uv8uRQAwR8wnDQ/b6670bccc3.1508999548065",
                                //    "uploaded": 0,
                                //    "is_pinned": 1,
                                //    "time_accessed": 0,
                                //    "site_id": 38,
                                //    "is_downloaded": 1,
                                //    "file_id": 20386,
                                //    "peer": 1,
                                //    "time_added": 1508999548,
                                //    "hash_id": 303,
                                //    "time_downloaded": 1508999548,
                                //    "size": 548
                                //};
                                // outgoing optional file:
                                // - is_pinned=1, is_downloaded=1 and time_added=time_downloaded

                                if (request.request) {
                                    self.log(pgm, 'sending a response to a previous request. start cleanup job to response. must delete response file after request timeout');
                                    cleanup_in = request_timeout_at - request_at;
                                    self.log(pgm, 'request_at          = ' + request_at);
                                    self.log(pgm, 'request_timeout_at  = ' + request_timeout_at);
                                    self.log(pgm, 'cleanup_in          = ' + cleanup_in);
                                }
                                if ((['-o','-io'].indexOf(optional) != -1) || (!response && !request.request)) return cb({}); // exit. offline transaction or not response and no request cleanup job

                                // delete request file. submit cleanup job
                                delete_request = function () {
                                    var pgm = self.module + '.send_message.delete_request callback 0: ';
                                    var debug_seq1;
                                    if (!cleanup_job_id) return; // already run
                                    cleanup_job_id = null;
                                    // problem with fileDelete: Delete error: [Errno 2] No such file or directory. checking file before fileDelete operation
                                    // step 1: check file before fileDelete
                                    debug_seq1 = MoneyNetworkAPILib.debug_z_api_operation_start(pgm, inner_path4, 'fileGet');
                                    MoneyNetworkAPILib.z_file_get(pgm, {inner_path: inner_path4, required: false, timeout: 1}, function (res1) {
                                        var pgm = self.module + '.send_message.delete_request fileGet callback 1: ';
                                        var debug_seq2;
                                        MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq1, res1 ? 'OK' : 'Not found');
                                        if (!res1) {
                                            console.log(pgm + 'warning. optional file ' + inner_path4 + ' was not found');
                                            return;
                                        }
                                        // transaction. don't delete files while publishing
                                        MoneyNetworkAPILib.start_transaction(pgm, function (transaction_timestamp) {
                                            // step 2: fileDelete
                                            debug_seq2 = MoneyNetworkAPILib.debug_z_api_operation_start(pgm, inner_path4, 'fileDelete');
                                            ZeroFrame.cmd("fileDelete", inner_path4, function (res2) {
                                                var pgm = self.module + '.send_message.delete_request fileDelete callback 2: ';
                                                var debug_seq3;
                                                MoneyNetworkAPILib.end_transaction(transaction_timestamp);
                                                if ((res2 == 'ok') || (!res2.error.match(/No such file or directory/))) {
                                                    MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq2, res2 == 'ok' ? 'OK' : 'Failed. error = ' + JSON.stringify(res2));
                                                    return;
                                                }
                                                // step 3: check file after fileDelete
                                                // fileDelete returned No such file or directory. Recheck that file has been deleted
                                                self.log(pgm, 'issue 1140. https://github.com/HelloZeroNet/ZeroNet/issues/1140. step 2 FileDelete returned No such file or directory');
                                                debug_seq3 = MoneyNetworkAPILib.debug_z_api_operation_start(pgm, inner_path4, 'fileGet');
                                                MoneyNetworkAPILib.z_file_get(pgm, {inner_path: inner_path4, required: false, timeout: 1}, function (res3) {
                                                    var pgm = self.module + '.send_message.delete_request fileGet callback 3: ';
                                                    MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq3, res3 ? 'OK' : 'Not found');
                                                    if (!res3) {
                                                        // everything is fine. request file was deleted correct in step 2
                                                        MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq2, 'OK');
                                                    }
                                                    else {
                                                        self.log(pgm, 'issue 1140. something is very wrong. first fileGet returned OK, fileDelete returned No such file or directory and last fileGet returned OK');
                                                        MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq2, res2 == 'ok' ? 'OK' : 'Failed. error = ' + JSON.stringify(res2));
                                                    }
                                                });
                                            }); // fileDelete callback

                                        });

                                    }); // fileGet callback

                                }; // delete_request
                                self.log(pgm, 'Submit delete_request job for ' + inner_path4 + '. starts delete_request job in ' + (cleanup_in || default_timeout) + ' milliseconds');
                                cleanup_job_id = setTimeout(delete_request, (cleanup_in || default_timeout));
                                if (!response) return cb({}); // exit. response was not requested. request cleanup job started

                                // fileGet and json_decrypt
                                get_and_decrypt = function (inner_path) {
                                    var pgm = self.module + '.send_message.get_and_decrypt: ';
                                    var debug_seq0, now;
                                    if (typeof inner_path == 'object') {
                                        self.log(pgm, 'inner_path is an object. must be a timeout error returned from MoneyNetworkAPILib.wait_for_file function. inner_path = ' + JSON.stringify(inner_path));
                                        return cb(inner_path);
                                    }
                                    if (timeout_at) {
                                        now = new Date().getTime();
                                        self.log(pgm, 'todo: fileGet: add timeout to fileGet call. required must also be false. now = ' + now + ', timeout_at = ' + new Date().getTime() + ', timeout = ' + (timeout_at - now));
                                    }
                                    debug_seq0 = MoneyNetworkAPILib.debug_z_api_operation_start(pgm, inner_path, 'fileGet');
                                    MoneyNetworkAPILib.z_file_get(pgm, {inner_path: inner_path, required: true}, function (response_str) {
                                        var pgm = self.module + '.send_message.get_and_decrypt fileGet callback 8.1: ';
                                        var encrypted_response, error, request_timestamp;
                                        MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq0, response_str ? 'OK' : 'Not found');
                                        if (!response_str) return cb({error: 'fileGet for receipt failed. Request was ' + JSON.stringify(request) + '. inner_path was ' + inner_path});
                                        encrypted_response = JSON.parse(response_str);
                                        self.log(pgm, 'encrypted_response = ' + response_str + ', sessionid = ' + self.sessionid);
                                        // read response. run cleanup job now
                                        if (cleanup_job_id) {
                                            clearTimeout(cleanup_job_id);
                                            setTimeout(delete_request, 0);
                                        }
                                        // decrypt response
                                        self.decrypt_json(encrypted_response, function (response) {
                                            var pgm = self.module + '.send_message.get_and_decrypt decrypt_json callback 8.2: ';
                                            // remove request timestamp before validation
                                            request_timestamp = response.request;
                                            delete response.request;
                                            // validate response
                                            error = MoneyNetworkAPILib.validate_json(pgm, response, request.msgtype, subsystem);
                                            if (!error && (request_timestamp != request_file_timestamp)) {
                                                // difference between timestamp in request filename and request timestamp in response!
                                                error = 'Expected request = ' + request_file_timestamp + ', found request = ' + request_timestamp;
                                            }
                                            if (error) response.request = request_timestamp;
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

                                response_filename = other_session_filename + optional + '.' + response;

                                // 8: is MoneyNetworkAPIDemon monitoring incoming messages for this sessionid?
                                if (MoneyNetworkAPILib.is_session(self.sessionid)) {
                                    // demon is running and is monitoring incoming messages for this sessionid
                                    self.log(pgm, 'demon is running. wait for response file ' + response_filename + '. cb = get_and_decrypt');
                                    error = MoneyNetworkAPILib.wait_for_file(response_filename, {request: request, timeout_at: timeout_at, cb: get_and_decrypt});
                                    if (error) return cb({error: error});
                                }
                                else {
                                    // demon is not running or demon is not monitoring this sessionid

                                    // 7: wait for response. loop. wait until timeout_at
                                    api_query_5 =
                                        "select 'merged-MoneyNetwork' || '/' || json.directory || '/'   ||  files_optional.filename as inner_path " +
                                        "from files_optional, json " +
                                        "where files_optional.filename = '" + response_filename + "' " +
                                        "and json.json_id = files_optional.json_id";
                                    self.log(pgm, 'api query 5 = ' + api_query_5) ;

                                    // loop
                                    wait_for_response = function () {
                                        var pgm = self.module + '.send_message.wait_for_response 8: ';
                                        var now, debug_seq8;
                                        now = new Date().getTime();
                                        if (now > timeout_at) return cb({error: 'Timeout while waiting for response. Request was ' + JSON.stringify(request) + '. Expected response filename was ' + response_filename});
                                        // 9: dbQuery
                                        debug_seq8 = MoneyNetworkAPILib.debug_z_api_operation_start(pgm, 'api query 5', 'dbQuery');
                                        self.ZeroFrame.cmd("dbQuery", [api_query_5], function (res) {
                                            var pgm = self.module + '.send_message.wait_for_receipt dbQuery callback 9: ';
                                            var inner_path9;
                                            MoneyNetworkAPILib.debug_z_api_operation_end(debug_seq8, (!res || res.error) ? 'Failed' : 'OK');
                                            if (res.error) return cb({error: 'Wait for receipt failed. Json message was ' + JSON.stringify(request) + '. dbQuery error was ' + res.error});
                                            if (!res.length) {
                                                setTimeout(wait_for_response, 500);
                                                return;
                                            }
                                            inner_path9 = res[0].inner_path;
                                            // 10: get_and_decryt
                                            get_and_decrypt(inner_path9);

                                        }); // dbQuery callback 9
                                    }; // wait_for_response callback 8
                                    setTimeout(wait_for_response, 250);
                                }

                            }); // optionalFileInfo callback 8

                        }); // siteSign callback 7 (content.json)

                    }); // writeFile callback 5 (request)
                }); // add_optional_files_support callback 4
            }); // encrypt_json callback 3
        }); // get_filenames callback 2
    }); // siteInfo callback 1

}; // send_message

// end MoneyNetworkAPI class