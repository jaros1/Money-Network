angular.module('MoneyNetwork')

    .controller('MoneyCtrl', ['$window', function ($window) {
        var self = this;
        var controller = 'MoneyCtrl';
        console.log(controller + ' loaded');

        // send encrypted message to myself
        var original_json = {
            "user_seq": 1,
            "receiver_sha256": "0801990787ed1b1c478af4b4a1930702327a9db0cfcf96b6a22131f1a0100e6c",
            "key": "auBe6GGypPv48kRBUK8MEH6nYK+uDlmg5cb5nCyefI6ly0WM8o8c3sAcg3jkHFXve8d0hUuuZk7cMC2R+6al2nNnGEkIZhSh2pfb0V9J+PXGVmpNj9ll5y9nFKnroTxBz2XH6qUJXHARD9I7ltf+GuG9cOZdPLyRv0DMQ089e5RNnenzKBUhQF5zTL81ae/f+7QsqCNaFKLedWltDe0Sdv7xyOYdgOUFJsxdLdqakzyoNM0cH0pDim3Mmdopga15kjEVfY5gPNgdsl4rrlJkg3F8kwdoTdXg+OLfWJ4BATMrDuRGbCQkJZg4JANoWhV50NxXX5HJoUb1RYTImGRC2A==",
            "message": "U2FsdGVkX19fdpvzFvKuIUOzyx1eM7sgAPEJcWXcjHgvpxeRPZzgytHOnD1tdP6u8NIwn+nszwBN/Gl1Cbdm8IDBczSHkxNh2/I4kDWnFJWsyh0QGaU3E5RDN/K1GeeCy6c+IXnCas+pli4M51r8ijiTRkS1ta2QnB6uNRx0WuiRtIjo/adI+uyC7Xbkv3g9VkTxLrolhcc8Xu9pMZXz/xpi1S4BHKjzxqR339x3Ie/9ieasRY8xJ2I3iXYqmZeStj0mN6JayneO5UHMPUyabMlS2yklvn1KcH4Bzt6y/mSxVtX8lnWPqU+w49XZ+yWfNFyNY7l3Al8XkiUHfewfzg==",
            "message_sha256": "c193ed82e2b785b6fa21d005e3d9350ffb542c0055ab1bbb80d7fa8e9e8c4325",
            "timestamp": 1480826880820
        };

        // encrypt step 1 - generate random password
        ZeroFrame.cmd("aesEncrypt", [""], function (res) {
            var pgm = controller + ' aesEncrypt callback 1: ';
            var password = res[0];

            // encrypt step 2 - ecies encrypted password = key
            var pubkey = MoneyNetworkHelper.getItem('pubkey2'); // userid (integer) has used when generating this public key

            return ZeroFrame.cmd("eciesEncrypt", [password, pubkey], function (key) {
                var pgm = controller + ' eciesEncrypt callback 2: ';

                // encrypt step 3 - aes encrypt message
                ZeroFrame.cmd("aesEncrypt", [JSON.stringify(original_json), password], function (res) {
                    var pgm = controller + ' aesEncrypt callback 3: ';
                    var iv = res[1], encrypted = res[2];
                    var original_json_encrypted = iv + "," + encrypted;
                    var data_json_row = { key: key, message: original_json_encrypted} ;

                    // encrypt step 4 - send message (data.json must be used)
                    decrypt_message(data_json_row) ;

                }); // callback 3

            }); // callback 2

        }); // callback 1

        // decrypt message
        function decrypt_message (data_json_row) {
            var pgm = controller + '.decrypt_message: ';

            // decrypt step 1 - receive encrypted message ;
            var key = data_json_row.key ;
            var message = data_json_row.message ;
            var message_array = message.split(',') ;
            var iv = message_array[0] ;
            var encrypted = message_array[1] ;

            // decrypt step 1 - decrypt key = password
            var userid = parseInt(MoneyNetworkHelper.getItem('userid'));

            ZeroFrame.cmd("eciesDecrypt", [key, userid], function(password) {
                var pgm = controller + '.decrypt_message eciesDecrypt callback 1: ' ;

                // decrypt step 2 - decrypt message
                ZeroFrame.cmd("aesDecrypt", [iv, encrypted, password], function (res) {
                    var pgm = controller + '.decrypt_message aesDecrypt callback 2: ' ;
                    var received_json = JSON.parse(res) ;

                    if (JSON.stringify(original_json) == JSON.stringify(received_json)) console.log(pgm + 'Test OK') ;
                    else console.log(pgm + 'Test NOT OK') ;

                }) ; // callback 2

            }); // callback 1

        } // decrypt_message

        // end MoneyCtrl
    }])

;