angular.module('MoneyNetwork')

    .controller('AboutCtrl', ['MoneyNetworkService', function (moneyNetworkService) {
        var self = this;
        var controller = 'AboutCtrl';
        console.log(controller + ' loaded');

        self.no_days_before_cleanup = moneyNetworkService.get_no_days_before_cleanup() ;


        // get list of screendumps in screendumps folder
        self.screendumps = [] ;
        (function () {
            moneyNetworkService.z_file_get(controller, {inner_path: 'screendumps/content.json'}, function (content_str) {
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
            }) ; // z_file_get callback
        })() ;

        // show/hide screendumps.
        var open = {} ;
        self.show_hide = function (prefix) {
            var pgm = controller + '.show_hide: ' ;
            var re, i, filename ;
            re = new RegExp(prefix) ;
            console.log(pgm + 're = ', re) ;
            for (i=0 ; i<self.screendumps.length ; i++) {
                filename = self.screendumps[i].filename ;
                if (filename.match(re)) self.screendumps[i].show = !self.screendumps[i].show ;
            }
            console.log(pgm + 'self.screendumps = ' + JSON.stringify(self.screendumps)) ;
        } ;

        // end AboutCtrl
    }])

;

