//
//  API for MoneyNetwork <=> MoneyNetwork wallet communication
//
var MoneyNetworkAPI = function (options) {
    options = options || {};
    this.sessionid = options.sessionid || null ;           // MoneyNetwork sessionid. Shared between MoneyNetwork and MoneyNetwork wallet session
    this.other_session_pubkey = options.pubkey || null ;   // JSEncrypt pubkey from other session (encrypt outgoing messages)
    this.other_session_pubkey2 = options.pubkey2 || null ; // cryptMessage public key from other session (encrypt outgoing messages)
    this.this_session_prvkey = options.prvkey || null ;    // JSEncrypt private key for this session (decrypt ingoing messages)
    this.this_session_userid2 = options.userid2||0 ;       // cryptMessage "userid" for this session (decrypt ingoing messages)
    this.debug = options.hasOwnProperty('debug') ? options.debug : false ;
    this.module = 'MoneyNetworkAPI' ; // for debug messages
} ; // MoneyNetworkAPI

MoneyNetworkAPI.prototype.setup_encryption = function (options) {
    var pgm = this.module + '.setup_encryption: ' ;
    var key, missing_keys ;
    if (options.sessionid) this.sessionid = options.sessionid ;
    if (options.pubkey)    this.other_session_pubkey = options.pubkey ;
    if (options.pubkey2)   this.other_session_pubkey2 = options.pubkey2 ;
    if (options.prvkey)    this.this_session_prvkey = options.prvkey ;
    if (options.hasOwnProperty('userid2')) this.this_session_userid2 = options.userid2 ;
    if (options.hasOwnProperty('debug'))  this.debug = options.debug ;
    if (!this.debug) return ;
    // debug: encryption setup status:
    missing_keys = [] ;
    for (key in this) {
        if (['sessionid', 'other_session_pubkey', 'other_session_pubkey2', 'this_session_prvkey', 'this_session_userid2'].indexOf(key) == -1) continue ;
        if (this[key] == null) missing_keys.push(key) ;
        else if (this.debug) console.log(pgm + key + ' = ' + this[key]) ;
    }
    if (missing_keys.length == 0) console.log(pgm + 'Encryption setup done') ;
    else console.log(pgm + 'Encryption setup: waiting for ' + missing_keys.join(', ')) ;

} ; // setup_encryption

MoneyNetworkAPI.prototype.generate_random_string = function (length, use_special_characters) {
    var character_set = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    if (use_special_characters) character_set += '![]{}#%&/()=?+-:;_-.@$|£' ;
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
    var pgm = this.module + '.encrypt_1: ' ;
    var password, encrypt, key, output_wa, encrypted_text, encrypted_array ;
    if (this.debug) console.log(pgm + 'other_session_pubkey = ' + this.other_session_pubkey) ;
    if (!this.other_session_pubkey) throw pgm + 'encrypt_1 failed. pubkey is missing in encryption setup' ;
    encrypt = new JSEncrypt();
    encrypt.setPublicKey(this.other_session_pubkey);
    password = this.generate_random_string(100, true) ;
    key = encrypt.encrypt(password);
    output_wa = CryptoJS.AES.encrypt(clear_text_1, password, {format: CryptoJS.format.OpenSSL}); //, { mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.AnsiX923, format: CryptoJS.format.OpenSSL });
    encrypted_text = output_wa.toString(CryptoJS.format.OpenSSL);
    encrypted_array = [key, encrypted_text] ;
    cb(JSON.stringify(encrypted_array)) ;
}; // encrypt_1
MoneyNetworkAPI.prototype.decrypt_1 = function (encrypted_text_1, cb) {
    var pgm = this.module + 'decrypt_1: ' ;
    var encrypted_array, key, encrypted_text, encrypt, password, output_wa, clear_text ;
    if (!this.this_session_prvkey) throw pgm + 'decrypt_1 failed. prvkey is missing in encryption setup' ;
    encrypted_array = JSON.parse(encrypted_text_1) ;
    key = encrypted_array[0] ;
    encrypted_text = encrypted_array[1] ;
    encrypt = new JSEncrypt();
    encrypt.setPrivateKey(this.this_session_prvkey);
    password = encrypt.decrypt(key);
    output_wa = CryptoJS.AES.decrypt(encrypted_text, password, {format: CryptoJS.format.OpenSSL}); // , { mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.AnsiX923, format: CryptoJS.format.OpenSSL });
    clear_text = output_wa.toString(CryptoJS.enc.Utf8);
    cb(clear_text)
}; // decrypt_1

// 2: cryptMessage encrypt/decrypt using ZeroNet cryptMessage plugin (pubkey2)
MoneyNetworkAPI.prototype.encrypt_2 = function (encrypted_text_1, cb) {
    var pgm = this.module + '.encrypt_2: ' ;
    var self = this ;
    if (!this.other_session_pubkey2) throw pgm + 'encryption failed. Pubkey2 is missing in encryption setup' ;
    // 1a. get random password
    if (this.debug) console.log(pgm + 'calling aesEncrypt') ;
    ZeroFrame.cmd("aesEncrypt", [""], function (res1) {
        var password ;
        password = res1[0];
        if (self.debug) console.log(pgm + 'aesEncrypt OK. calling eciesEncrypt') ;
        // 1b. encrypt password
        ZeroFrame.cmd("eciesEncrypt", [password, self.other_session_pubkey2], function (key) {
            // 1c. encrypt text
            if (self.debug) console.log(pgm + 'eciesEncrypt OK. calling aesEncrypt') ;
            ZeroFrame.cmd("aesEncrypt", [encrypted_text_1, password], function (res3) {
                var iv, encrypted_text, encrypted_array, encrypted_text_2 ;
                if (self.debug) console.log(pgm + 'aesEncrypt OK') ;
                // forward encrypted result to next function in encryption chain
                iv = res3[1] ;
                encrypted_text = res3[2];
                encrypted_array = [key, iv, encrypted_text] ;
                encrypted_text_2 = JSON.stringify(encrypted_array) ;
                if (self.debug) console.log(pgm + 'encrypted_text_1 = ' + encrypted_text_2) ;
                cb(encrypted_text_2) ;
            }) ; // aesEncrypt callback 3
        }) ; // eciesEncrypt callback 2
    }) ; // aesEncrypt callback 1
}; // encrypt_2
MoneyNetworkAPI.prototype.decrypt_2 = function (encrypted_text_2, cb) {
    var pgm = this.module + '.decrypt_1: ' ;
    var encrypted_array, key, iv, encrypted_text ;
    if (this.debug) console.log(pgm + 'encrypted_text_2 = ' + encrypted_text_2) ;
    encrypted_array = JSON.parse(encrypted_text_2) ;
    key = encrypted_array[0] ;
    iv = encrypted_array[1] ;
    encrypted_text = encrypted_array[2] ;
    // 1a. decrypt key = password
    if (this.debug) console.log(pgm + 'calling eciesDecrypt') ;
    ZeroFrame.cmd("eciesDecrypt", [key, this.this_session_userid2], function(password) {
        if (!password) throw pgm + 'key eciesDecrypt failed. userid2 = ' + this.this_session_userid2 ;
        // 1b. decrypt encrypted_text
        if (this.debug) console.log(pgm + 'eciesDecrypt OK. calling aesDecrypt') ;
        ZeroFrame.cmd("aesDecrypt", [iv, encrypted_text, password], function (encrypted_text_1) {
            if (this.debug) console.log(pgm + 'aesDecrypt OK') ;
            cb(encrypted_text_1) ;
        }) ; // aesDecrypt callback 2
    }) ; // eciesDecrypt callback 1
}; // decrypt_2

// 3: symmetric encrypt/decrypt using sessionid
MoneyNetworkAPI.prototype.encrypt_3 = function (encrypted_text_2, cb) {
    var pgm = this.module + '.encrypt_3: ' ;
    if (!this.sessionid) throw pgm + 'encrypt_3 failed. sessionid is missing in encryption setup' ;
    var output_wa, encrypted_text_3 ;
    output_wa = CryptoJS.AES.encrypt(encrypted_text_2, this.sessionid, {format: CryptoJS.format.OpenSSL}); //, { mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.AnsiX923, format: CryptoJS.format.OpenSSL });
    encrypted_text_3 = output_wa.toString(CryptoJS.format.OpenSSL);
    cb(encrypted_text_3) ;
}; // encrypt_3
MoneyNetworkAPI.prototype.decrypt_3 = function (encrypted_text_3, cb) {
    var pgm = this.module + '.decrypt_3: ' ;
    var output_wa, encrypted_text_2 ;
    if (!this.sessionid) throw pgm + 'decrypt_3 failed. sessionid is missing in encryption setup' ;
    output_wa = CryptoJS.AES.decrypt(encrypted_text_3, this.sessionid, {format: CryptoJS.format.OpenSSL}); // , { mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.AnsiX923, format: CryptoJS.format.OpenSSL });
    encrypted_text_2 = output_wa.toString(CryptoJS.enc.Utf8);
    cb(encrypted_text_2)
}; // decrypt_3

// encrypt/decrypt json messages
// encryptions: integer or array of integers: 1 cryptMessage, 2 JSEncrypt, 3 symmetric encryption
MoneyNetworkAPI.prototype.encrypt_json = function(json, encryptions, cb) {
    var pgm = this.module + '.encrypt_json: ' ;
    var self, encryption;
    self = this ;
    if (typeof encryptions == 'number') encryptions = [encryptions];
    if (encryptions.length == 0) return cb(json); // done
    encryption = encryptions.shift();
    if (encryption == 1) {
        if (this.debug) console.log(pgm + 'this.other_session_pubkey = ' + this.other_session_pubkey) ;
        this.encrypt_1(JSON.stringify(json), function (encrypted_text) {
            json = {
                encryption: encryption,
                message: encrypted_text
            };
            self.encrypt_json(json, encryptions, cb);
        });
    }
    else if (encryption == 2) {
        if (this.debug) console.log(pgm + 'this.other_session_pubkey2 = ' + this.other_session_pubkey2) ;
        this.encrypt_2(JSON.stringify(json), function (encrypted_text) {
            json = {
                encryption: encryption,
                message: encrypted_text
            };
            self.encrypt_json(json, encryptions, cb);
        });
    }
    else if (encryption == 3) {
        if (this.debug) console.log(pgm + 'this.sessionid = ' + this.sessionid) ;
        this.encrypt_3(JSON.stringify(json), function (encrypted_text) {
            json = {
                encryption: encryption,
                message: encrypted_text
            };
            self.encrypt_json(json, encryptions, cb);
        });
    }
    else {
        console.log(pgm + 'Unsupported encryption ' + encryption);
        return cb(json);
    }
    //encrypt(JSON.stringify(json), (function(_this) {
    //    return function (encrypted_text) {
    //        json = {
    //            encryption: encryption,
    //            message: encrypted_text
    //        };
    //        _this.encrypt_json(json, encryptions, cb);
    //    };
    //})(this));
}; // encrypt_json
MoneyNetworkAPI.prototype.decrypt_json = function (json, cb) {
    var pgm = this.module + '.decrypt_json: ' ;
    var self, decrypt_json, decrypt ;
    self = this ;
    decrypt_json = self.decrypt_json ;
    if (json.encryption == 1) {
        this.decrypt_1(json.message, function (decrypted_text) {
            var json ;
            json = JSON.parse(decrypted_text) ;
            if (json.hasOwnProperty('encryption')) self.decrypt_json(json, cb) ;
            else cb(json) ; // done
        });
    }
    else if (json.encryption == 2) {
        this.decrypt_2(json.message, function (decrypted_text) {
            var json ;
            json = JSON.parse(decrypted_text) ;
            if (json.hasOwnProperty('encryption')) self.decrypt_json(json, cb) ;
            else cb(json) ; // done
        });
    }
    else if (json.encryption == 3) {
        this.decrypt_3(json.message, function (decrypted_text) {
            var json ;
            json = JSON.parse(decrypted_text) ;
            if (json.hasOwnProperty('encryption')) self.decrypt_json(json, cb) ;
            else cb(json) ; // done
        });
    }
    else {
        console.log(pgm + 'Unsupported encryption ' + json.encryption);
        return cb(json);
    }
}; // decrypt_json

// end MoneyNetworkAPI
