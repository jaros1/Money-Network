//
//  API for MoneyNetwork <=> MoneyNetwork wallet communication
//
var MoneyNetworkAPI = (function () {

    var module = 'MoneyNetworkAPI' ; // for debug messages




    // encryption/decryption helpers

    var encryption_setup = {
        sessionid: null,  // MoneyNetwork sessionid. Shared between MoneyNetwork and MoneyNetwork wallet session
        other_session_pubkey: null,// JSEncrypt pubkey from other session (encrypt outgoing messages)
        other_session_pubkey2: null,// cryptMessage public key from other session (encrypt outgoing messages)
        this_session_prvkey: null, // JSEncrypt private key for this session (decrypt ingoing messages)
        this_session_userid2: 0, // cryptMessage "userid" for this session (decrypt ingoing messages)
        debug: false
    } ;
    function setup_encryption (hash) {
        var pgm = module + '.setup_encryption: ' ;
        var key, missing_keys ;
        if (hash.sessionid) encryption_setup.sessionid = hash.sessionid ;
        if (hash.pubkey)    encryption_setup.other_session_pubkey = hash.pubkey ;
        if (hash.pubkey2)   encryption_setup.other_session_pubkey2 = hash.pubkey2 ;
        if (hash.prvkey)    encryption_setup.this_session_prvkey = hash.prvkey ;
        if (hash.hasOwnProperty('userid2')) encryption_setup.this_session_userid2 = hash.userid2 ;
        if (hash.hasOwnProperty('debug'))  encryption_setup.debug = hash.debug ;
        if (!encryption_setup.debug) return ;
        // encryption setup status:
        missing_keys = [] ;
        for (key in encryption_setup) if (encryption_setup[key] == null) missing_keys.push(key) ;
        if (missing_keys.length == 0) console.log(pgm + 'Encryption setup done') ;
        else console.log(pgm + 'Encryption setup: waiting for ' + missing_keys.join(', ')) ;
    } // setup_encryption

    function generate_random_string(length, use_special_characters) {
        var character_set = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        if (use_special_characters) character_set += '![]{}#%&/()=?+-:;_-.@$|£' ;
        var string = [], index, char;
        for (var i = 0; i < length; i++) {
            index = Math.floor(Math.random() * character_set.length);
            char = character_set.substr(index, 1);
            string.push(char);
        }
        return string.join('');
    } // generate_random_string

    // 1: cryptMessage encrypt/decrypt using ZeroNet cryptMessage plugin (pubkey2)
    function encrypt_1 (clear_text, cb) {
        var pgm = module + '.encrypt_1: ' ;
        if (!encryption_setup.other_session_pubkey2) throw pgm + 'encryption failed. Pubkey2 is missing in encryption setup' ;
        // 1a. get random password
        if (encryption_setup.debug) console.log(pgm + 'calling aesEncrypt') ;
        ZeroFrame.cmd("aesEncrypt", [""], function (res1) {
            var password ;
            password = res1[0];
            if (encryption_setup.debug) console.log(pgm + 'aesEncrypt OK. calling eciesEncrypt') ;
            // 1b. encrypt password
            ZeroFrame.cmd("eciesEncrypt", [password, encryption_setup.other_session_pubkey2], function (key) {
                // 1c. encrypt text
                if (encryption_setup.debug) console.log(pgm + 'eciesEncrypt OK. calling aesEncrypt') ;
                ZeroFrame.cmd("aesEncrypt", [clear_text, password], function (res3) {
                    var iv, encrypted_text, encrypted_array, encrypted_text_1 ;
                    if (encryption_setup.debug) console.log(pgm + 'aesEncrypt OK') ;
                    // forward encrypted result to next function in encryption chain
                    iv = res3[1] ;
                    encrypted_text = res3[2];
                    encrypted_array = [key, iv, encrypted_text] ;
                    encrypted_text_1 = JSON.stringify(encrypted_array) ;
                    if (encryption_setup.debug) console.log(pgm + 'encrypted_text_1 = ' + encrypted_text_1) ;
                    cb(encrypted_text_1) ;
                }) ; // aesEncrypt callback 3
            }) ; // eciesEncrypt callback 2
        }) ; // aesEncrypt callback 1
    } // encrypt_1
    function decrypt_1 (encrypted_text_1, cb) {
        var pgm = module + '.decrypt_1: ' ;
        var encrypted_array, key, iv, encrypted_text, user_id ;
        if (encryption_setup.debug) console.log(pgm + 'encrypted_text_1 = ' + encrypted_text_1) ;
        encrypted_array = JSON.parse(encrypted_text_1) ;
        key = encrypted_array[0] ;
        iv = encrypted_array[1] ;
        encrypted_text = encrypted_array[2] ;
        // 1a. decrypt key = password
        if (encryption_setup.debug) console.log(pgm + 'calling eciesDecrypt') ;
        ZeroFrame.cmd("eciesDecrypt", [key, encryption_setup.this_session_userid2], function(password) {
            if (!password) throw pgm + 'key eciesDecrypt failed. userid2 = ' + encryption_setup.this_session_userid2 ;
            // 1b. decrypt encrypted_text
            if (encryption_setup.debug) console.log(pgm + 'eciesDecrypt OK. calling aesDecrypt') ;
            ZeroFrame.cmd("aesDecrypt", [iv, encrypted_text, password], function (clear_text) {
                if (encryption_setup.debug) console.log(pgm + 'aesDecrypt OK') ;
                cb(clear_text) ;
            }) ; // aesDecrypt callback 2
        }) ; // eciesDecrypt callback 1
    } // decrypt_1

    // 2: JSEncrypt encrypt/decrypt using pubkey/prvkey
    function encrypt_2 (encrypted_text_1, cb) {
        var pgm = module + '.encrypt_2: ' ;
        var password, encrypt, key, output_wa, encrypted_text, encrypted_array ;
        if (!encryption_setup.other_session_pubkey) throw pgm + 'encrypt_2 failed. pubkey is missing in encryption setup' ;
        encrypt = new JSEncrypt();
        encrypt.setPublicKey(encryption_setup.other_session_pubkey);
        password = generate_random_string(100, true) ;
        key = encrypt.encrypt(password);
        output_wa = CryptoJS.AES.encrypt(encrypted_text_1, password, {format: CryptoJS.format.OpenSSL}); //, { mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.AnsiX923, format: CryptoJS.format.OpenSSL });
        encrypted_text = output_wa.toString(CryptoJS.format.OpenSSL);
        encrypted_array = [key, encrypted_text] ;
        cb(JSON.stringify(encrypted_array)) ;
    } // encrypt_2
    function decrypt_2 (encrypted_text_2, cb) {
        var pgm = module + 'decrypt_2: ' ;
        var encrypted_array, key, encrypted_text, encrypt, password, output_wa, encrypted_text_1 ;
        if (!encryption_setup.this_session_prvkey) throw pgm + 'decrypt_2 failed. prvkey is missing in encryption setup' ;
        encrypted_array = JSON.parse(encrypted_text_2) ;
        key = encrypted_array[0] ;
        encrypted_text = encrypted_array[1] ;
        encrypt = new JSEncrypt();
        encrypt.setPrivateKey(encryption_setup.this_session_prvkey);
        password = encrypt.decrypt(key);
        output_wa = CryptoJS.AES.decrypt(encrypted_text, password, {format: CryptoJS.format.OpenSSL}); // , { mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.AnsiX923, format: CryptoJS.format.OpenSSL });
        encrypted_text_1 = output_wa.toString(CryptoJS.enc.Utf8);
        cb(encrypted_text_1)
    } // decrypt_2

    // 3: symmetric encrypt/decrypt using sessionid
    function encrypt_3 (encrypted_text_2, cb) {
        var pgm = module + '.encrypt_3: ' ;
        if (!encryption_setup.sessionid) throw pgm + 'encrypt_3 failed. sessionid is missing in encryption setup' ;
        var output_wa, encrypted_text_3 ;
        output_wa = CryptoJS.AES.encrypt(encrypted_text_2, encryption_setup.sessionid, {format: CryptoJS.format.OpenSSL}); //, { mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.AnsiX923, format: CryptoJS.format.OpenSSL });
        encrypted_text_3 = output_wa.toString(CryptoJS.format.OpenSSL);
        cb(encrypted_text_3) ;
    } // encrypt_3
    function decrypt_3 (encrypted_text_3, cb) {
        var pgm = module + '.decrypt_3: ' ;
        var output_wa, encrypted_text_2 ;
        if (!encryption_setup.sessionid) throw pgm + 'decrypt_3 failed. sessionid is missing in encryption setup' ;
        output_wa = CryptoJS.AES.decrypt(encrypted_text_3, encryption_setup.sessionid, {format: CryptoJS.format.OpenSSL}); // , { mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.AnsiX923, format: CryptoJS.format.OpenSSL });
        encrypted_text_2 = output_wa.toString(CryptoJS.enc.Utf8);
        cb(encrypted_text_2)
    } // decrypt_3

    // encrypt/decrypt json messages
    // clear text => 1 cryptMessage => 2 JSEncrypt => 3 symmetric => encrypted message
    function encrypt_json(json, cb) {
        var clear_text = JSON.stringify(json) ;
        encrypt_1(clear_text, function (encrypted_text_1) {
            encrypt_2(encrypted_text_1, function (encrypted_text_2) {
                encrypt_3(encrypted_text_2, function (encrypted_text_3) {
                    cb(encrypted_text_3) ;
                }) ; // encrypt_3 callback 3
            }) ; // encrypt_2 callback 2
        }) ; // encrypt_1 callback 1
        cb(json) ;
    } // encrypt_json
    // encrypted message => 3 symmetric => 2 JSEncrypt => 1 cryptMessage => clear text
    function decrypt_json(encrypted_text_3, cb) {
        var pgm = module + '.decrypt_json: ' ;
        if (encryption_setup.debug) console.log(pgm + 'calling decrypt_3') ;
        decrypt_3(encrypted_text_3, function (encrypted_text_2) {
            if (encryption_setup.debug) console.log(pgm + 'decrypt_3 OK. calling decrypt_2') ;
            decrypt_2(encrypted_text_2, function (encrypted_text_1) {
                if (encryption_setup.debug) console.log(pgm + 'decrypt_2 OK. calling decrypt_1') ;
                decrypt_1(encrypted_text_1, function (clear_text) {
                    if (encryption_setup.debug) console.log(pgm + 'decrypt_1 OK') ;
                    var json = JSON.parse(clear_text) ;
                    cb(json) ;
                }) ;
            }) ;
        }) ;
    } // decrypt_json

    // export helpers
    return {
        setup_encryption: setup_encryption,
        encrypt_json: encrypt_json,
        decrypt_json: decrypt_json
    };
})();
// MoneyNetworkAPI
