angular.module('MoneyNetwork')

    .controller('AboutCtrl', ['MoneyNetworkService', '$rootScope', function (moneyNetworkService, $rootScope) {
        var self = this;
        var controller = 'AboutCtrl';
        console.log(controller + ' loaded');

        self.no_days_before_cleanup = moneyNetworkService.get_no_days_before_cleanup() ;


        // get list of screendumps in screendumps folder
        self.screendumps = [] ;
        (function () {
            moneyNetworkService.z_file_get(controller, {inner_path: 'screendumps/content.json'}, function (content_str) {
                var pgm = controller + ' start z_file_get callback 1: ';
                var content, files, filename, text ;
                if (!content_str) {
                    console.log(controller + ': error. cannot show screendumps. screendumps/content.json file was not found') ;
                    return ;
                }
                try {
                    content = JSON.parse(content_str) ;
                }
                catch (e) {
                    console.log(controller + ': error. cannot show screendumps. screendumps/content.json is invalid. error = ' + e.message) ;
                    return ;
                }
                if (!content.files_optional || !Object.keys(content.files_optional).length) {
                    console.log(controller + ': error. cannot show screendumps. no screendumps were found in screendumps/content.json') ;
                    return ;
                }
                for (filename in content.files_optional) {
                    try {
                        text = filename.substr(0,filename.length-4).split('-') ;
                        text.splice(0, 2) ;
                        text.splice(1, 0, ':') ;
                        text = text.join(' ') ;
                        text = text.charAt(0).toUpperCase() + text.slice(1) + ':';
                    }
                    catch (e) {
                        text = filename ;
                    }
                    self.screendumps.push({
                        filename: filename,
                        text: text,
                        src: 'screendumps/' + filename,
                        show: false}) ;
                }
                self.screendumps.sort(function (a,b) {
                    var fileid1, fileid2 ;
                    fileid1 = parseInt(a.filename.split('-')[0]) ;
                    fileid2 = parseInt(b.filename.split('-')[0]) ;
                    return fileid1 - fileid2 ;
                }) ;

                console.log(controller + ': self.screendumps = ' + JSON.stringify(self.screendumps)) ;
                //self.screendumps = [{
                //    "filename": "1000-mn-login-cert-and-merger-notifications.png",
                //    "text": "Login : cert and merger notifications:",
                //    "src": "screendumps/1000-mn-login-cert-and-merger-notifications.png",
                //    "show": false
                //}, {
                //    "filename": "1010-mn-login-register-new-user.png",
                //    "text": "Login : register new user:",
                //    "src": "screendumps/1010-mn-login-register-new-user.png",
                //    "show": false
                //}, {
                //    "filename": "1100-mn-account-update-user-info.png",
                //    "text": "Account : update user info:",
                //    "src": "screendumps/1100-mn-account-update-user-info.png",
                //    "show": false
                //}, {
                //    "filename": "1300-mn-chat.png",
                //    "text": "Chat ::",
                //    "src": "screendumps/1300-mn-chat.png",
                //    "show": false
                //}, {
                //    "filename": "1380-mn-chat-send-money.png",
                //    "text": "Chat : send money:",
                //    "src": "screendumps/1380-mn-chat-send-money.png",
                //    "show": false
                //}, {
                //    "filename": "1381-mn-chat-send-money.png",
                //    "text": "Chat : send money:",
                //    "src": "screendumps/1381-mn-chat-send-money.png",
                //    "show": false
                //}, {
                //    "filename": "1400-mn-wallet-test-start.png",
                //    "text": "Wallet : test start:",
                //    "src": "screendumps/1400-mn-wallet-test-start.png",
                //    "show": false
                //}, {
                //    "filename": "1401-mn-wallet-test-start.png",
                //    "text": "Wallet : test start:",
                //    "src": "screendumps/1401-mn-wallet-test-start.png",
                //    "show": false
                //}, {
                //    "filename": "1450-mn-wallet-test-ok.png",
                //    "text": "Wallet : test ok:",
                //    "src": "screendumps/1450-mn-wallet-test-ok.png",
                //    "show": false
                //}, {
                //    "filename": "2010-w2-w2-cert-and-merger-permission.png",
                //    "text": "W2 : cert and merger permission:",
                //    "src": "screendumps/2010-w2-w2-cert-and-merger-permission.png",
                //    "show": false
                //}, {
                //    "filename": "2020-w2-w2-create-wallet.png",
                //    "text": "W2 : create wallet:",
                //    "src": "screendumps/2020-w2-w2-create-wallet.png",
                //    "show": false
                //}];

                // check files in screendumps folder
                ZeroFrame.cmd("fileList", ['screendumps'], function(files) {
                    var pgm = controller + ' start fileList callback 3: ';
                    var i, j ;
                    console.log(pgm + 'files = ' + JSON.stringify(files)) ;
                    //files = ["2020-w2-w2-create-wallet.png", "1400-mn-wallet-test-start.png", "1380-mn-chat-send-money.png", "1300-mn-chat.png", "1401-mn-wallet-test-start.png", "2010-w2-w2-cert-and-merger-permission.png", "1000-mn-login-cert-and-merger-notifications.png", "1381-mn-chat-send-money.png", "1450-mn-wallet-test-ok.png", "content.json", "1010-mn-login-register-new-user.png", "1100-mn-account-update-user-info.png"];
                    for (i=0 ; i<files.length ; i++) {
                        filename = files[i] ;
                        for (j=0 ; j<self.screendumps.length ; j++) {
                            if (self.screendumps[j].filename == files[i]) {
                                self.screendumps[j].files = true ;
                                break ;
                            }
                        } // for j
                    } // for i
                    console.log(controller + ': self.screendumps = ' + JSON.stringify(self.screendumps)) ;

                }) ; // fileList callback 2

            }) ; // z_file_get callback 1
        })() ;

        // show/hide screendumps.
        self.show_hide = function (prefix) {
            var pgm = controller + '.show_hide: ' ;
            var re, i, filename, download, get_screendump ;
            re = new RegExp(prefix) ;
            console.log(pgm + 're = ', re) ;
            download = [] ;
            for (i=0 ; i<self.screendumps.length ; i++) {
                filename = self.screendumps[i].filename ;
                if (filename.match(re)) {
                    self.screendumps[i].show = !self.screendumps[i].show ;
                    if (self.screendumps[i].show && !self.screendumps[i].files) download.push(self.screendumps[i].filename) ;
                }
            }
            console.log(pgm + 'self.screendumps = ' + JSON.stringify(self.screendumps)) ;
            console.log(pgm + 'downloads = ' + JSON.stringify(download)) ;

            get_screendump = function() {
                var pgm = controller + '.show_hide.get_screendump: ' ;
                var filename, inner_path ;
                if (!download.length) return ;
                filename = download.shift() ;
                inner_path = 'screendumps/' + filename ;
                console.log(pgm + 'downloading ' + inner_path) ;
                ZeroFrame.cmd("fileGet", {inner_path: inner_path, required: true, format: 'base64'}, function(data) {
                    var i ;
                    if (data) {
                        for (i=0 ; i<self.screendumps.length ; i++) if (self.screendumps[i].filename == filename) self.screendumps[i].files = true ;
                        console.log(pgm + filename + ' download OK') ;
                        $rootScope.$apply() ;
                    }
                    else console.log(pgm + filename + ' download failed') ;
                    // next download
                    get_screendump() ;
                }) ;
            } ; // get_screendump
            get_screendump() ;

        } ; // show_hide

        // end AboutCtrl
    }])

;

