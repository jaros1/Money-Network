angular.module('MoneyNetwork')

    .factory('MoneyNetworkEmojiService', ['$timeout', '$rootScope', '$window', '$location', 'dateFilter', 'MoneyNetworkHubService',
                             function($timeout, $rootScope, $window, $location, date, moneyNetworkHubService)
    {
        var service = 'MoneyNetworkEmojiService' ;
        console.log(service + ' loaded') ;


        // cache some important informations from zeronet files
        // - user_seq: from users array in data.json file. using "pubkey" as index to users array
        // - user_seqs: from users array in data.json file.
        // - files_optional: from content.json file. loaded at startup and updated after every sign and publish
        //   todo: add option to enable/disable files_optional cache. must be disabled if multiple users are using same zeronet cert at the same time
        var z_cache = moneyNetworkHubService.get_z_cache() ;

        var standard_reactions = [
            { unicode: "1f603", title: "Like"},
            { unicode: "2764",  title: "Love"},
            { unicode: "1f606", title: "Ha ha"},
            { unicode: "1f62e", title: "Wow"},
            { unicode: "1f622", title: "Sad"},
            { unicode: "1f621", title: "Angry"}
        ] ;

        function get_standard_reactions () {
            var pgm = service + '.get_standard_reactions: ' ;
            // console.log(pgm + 'standard_reactions = ' + JSON.stringify(standard_reactions)) ;
            return standard_reactions ;
        }
        function get_user_reactions () {
            var pgm = service + '.get_user_reactions: ' ;
            if (!z_cache.user_setup.reactions) return standard_reactions ;
            // console.log(pgm + 'user_setup.reactions = ' + JSON.stringify(user_setup.reactions)) ;
            return z_cache.user_setup.reactions ;
        } // get_user_reactions

        // output debug info in log. For key, see user page and setup.debug hash
        // keys: simple expressions are supported. For example inbox && unencrypted
        function debug (keys, text) {
            MoneyNetworkHelper.debug(keys, text) ;
        } // debug

        // select emoji provider. twemoji from maxcdn.com or ZeroNet optional files
        var emoji_folders = ['https://twemoji.maxcdn.com/2/72x72', 'emoji/twitter', 'emoji/apple', 'emoji/google',
            'emoji/facebook', 'emoji/messenger', 'emoji/one', 'emoji/samsung', 'emoji/windows'] ;
        function get_emoji_folders () {
            return emoji_folders ;
        }

        // fuld emoji list - from content.files_optional
        var emojis_full_list = MoneyNetworkHelper.get_emojis() ;

        // initialize short emoji list - only for current emoji folder selection
        // call after client_login and when changing emoji folder in Account page
        var emojis_short_list = {} ;
        function init_emojis_short_list () {
            var pgm = service + '.init_emojis_short_list: ' ;
            var src, emoji_folder, lng, filename, hexcodes, hexcodes_a, i, hexcode, node, max_lng ;
            for (src in emojis_short_list) delete emojis_short_list[src] ;
            if (!z_cache.user_setup.emoji_folder || ([emoji_folders[0], emoji_folders[1]].indexOf(z_cache.user_setup.emoji_folder) != -1)) emoji_folder = 'emoji/twitter' ;
            else emoji_folder = z_cache.user_setup.emoji_folder ;
            // console.log(pgm + 'emojis_full_list = ' + JSON.stringify(emojis_full_list)) ;
            // console.log(pgm + 'emoji_folder = ' + emoji_folder) ;
            lng = emoji_folder.length ;
            max_lng = 0 ;
            for (src in emojis_full_list) {
                if (src.substr(0,lng) != emoji_folder) continue ;
                filename = src.split('/').pop().split('.')[0] ;
                // remove leading 0 from hexcodes. for example 00a9 (copyright emoji)
                hexcodes = filename ;
                hexcodes_a = hexcodes.split('_') ;
                if (hexcodes_a.length > max_lng) max_lng = hexcodes_a.length ;
                for (i=0 ; i<hexcodes_a.length ; i++) {
                    hexcode = hexcodes_a[i] ;
                    while (hexcode.substr(0,1) == '0') hexcode = hexcode.substr(1) ;
                    hexcodes_a[i] = hexcode ;
                }
                hexcodes = hexcodes_a.join('_') ;
                // symbol scan from end to start. nested emojis objects until first symbol with src
                node = emojis_short_list ;
                for (i=hexcodes_a.length-1 ; i >= 0 ; i--) {
                    hexcode = hexcodes_a[i] ;
                    if (!node[hexcode]) node[hexcode] = {} ;
                    node = node[hexcode] ;
                    if (i == 0) node.src = filename ;
                } // for i
            } // for key
            debug('emoji', pgm + 'max_lng = ' + max_lng) ;
            debug('emoji', pgm + 'emojis_short_list = ' + JSON.stringify(emojis_short_list)) ;

            // apply current emoji folder to reactions
            if (!emoji_folders) console.log(pgm + 'issue #134 emoji_folders is undefined. emoji_folders = ' + JSON.stringify(emoji_folders));
            emoji_folder = z_cache.user_setup.emoji_folder || emoji_folders[0] ; // current emoji folder
            if (emoji_folder[emoji_folder.length-1] != '/') emoji_folder += '/' ;
            for (i=0 ; i<standard_reactions.length ; i++) {
                standard_reactions[i].src = emoji_folder + standard_reactions[i].unicode + '.png' ;
            }
            // console.log(pgm + 'standard_reactions = ' + JSON.stringify(standard_reactions));
            if (z_cache.user_setup.reactions) {
                for (i=0 ; i<z_cache.user_setup.reactions.length ; i++) {
                    z_cache.user_setup.reactions[i].src = emoji_folder + z_cache.user_setup.reactions[i].unicode + '.png' ;
                }
                // console.log(pgm + 'user_reactions = ' + JSON.stringify(user_setup.reactions));
            }
        } // init_emojis_short_list

        // helper. string to unicode symbols
        // https://mathiasbynens.be/notes/javascript-unicode
        var punycode = window.punycode ; // exported from 65-markdown-it.js

        // to/from symbol and unicode hex string
        function symbol_to_unicode(str) {
            var symbols, symbols_hex, i ;
            symbols = punycode.ucs2.decode(str) ;
            symbols_hex = [] ;
            for (i=0 ; i<symbols.length ; i++) symbols_hex.push(symbols[i].toString(16)) ;
            return symbols_hex.join('_');
        } // symbol_to_unicode
        function unicode_to_symbol (unicode) {
            var symbols_hex, symbols, i ;
            symbols_hex = unicode.split('_') ;
            symbols = [] ;
            for (i=0 ; i<symbols_hex.length ; i++) symbols.push(parseInt(symbols_hex[i], 16)) ;
            return punycode.ucs2.encode(symbols);
        } // unicode_to_symbol

        // chat messages. extra parse. check url for twemojis and not translated unicode symbols
        var emoji_alt_prefix = punycode.ucs2.decode(' alt="') ;
        var emoji_alt_postfix = punycode.ucs2.decode('" ') ;
        function replace_emojis (str) {
            var pgm = service + '.replace_emojis: ' ;
            var new_url, symbols, symbols_hex, i1, i2, best_i1, best_src, node, in_alt, i3, i4, img_str_start,
                img_str_end, img_symbols_start, img_symbols_end, img_symbols, symbols_updated ;

            // 1: check urls created by markdown-it twemoji parse.
            // Only relevant if user as selected other emoji folder than https://twemoji.maxcdn.com/2/72x72
            if (z_cache.user_setup.emoji_folder && (z_cache.user_setup.emoji_folder != emoji_folders[0])) {
                str = str.replace(/https:\/\/twemoji\.maxcdn\.com\/2\/72x72\/[0-9a-f]+\.png/gm, function (match) {
                    var pgm = service + '.check_twemojis replace callback: ' ;
                    // console.log(pgm + 'match = ' + match) ;
                    new_url = z_cache.user_setup.emoji_folder + '/' + match.split('/').pop() ;
                    if (!emojis_full_list.hasOwnProperty(new_url)) {
                        debug('emoji', pgm + 'Unknown emojis ' + match) ;
                        emojis_full_list[new_url] = false ;
                    }
                    if (!emojis_full_list[new_url]) return match ;
                    return new_url ;
                }) ;
            }

            // 2: check any known but not replaced emoji unicodes in string. scan from end to start. see init_emojis_short_list.
            // ignore emoji symbols in alt: (<img class="emoji" draggable="false" alt="😃"src="emoji/twitter/1f603.png">)
            symbols = punycode.ucs2.decode(str) ;
            symbols_hex = [] ;
            for (i2=0 ; i2<symbols.length ; i2++) symbols_hex.push(symbols[i2].toString(16)) ;
            debug('emoji', pgm + 'str.length = ' + str.length + ', symbols.length = ' + symbols.length +
                ', str = ' + str + ', symbols = ' + JSON.stringify(symbols) +
                ', symbols_hex = ' + JSON.stringify(symbols_hex)) ;
            symbols_updated = false ;
            for (i2=symbols_hex.length-1 ; i2 >= 0 ; i2--)  {
                if (!emojis_short_list[symbols_hex[i2]]) continue ;
                // check for unicode combinations
                i1 = i2 ; node = emojis_short_list ; best_i1 = null ; best_src = null ;
                while ((i1 >= 0) && node[symbols_hex[i1]]) {
                    // console.log(pgm + '1: i1 = ' + i1 + ', symbol_hex[' + i1 + '] = ' + symbols_hex[i1]) ;
                    node = node[symbols_hex[i1]] ;
                    // console.log(pgm + '2: i1 = ' + i1 + ', node = ' + JSON.stringify(node)) ;
                    if (node.src) {
                        best_i1 = i1 ;
                        best_src = node.src ;
                    }
                    i1-- ;
                } // while
                // console.log(pgm + '3: i1 = ' + i1 + ', symbol_hex[' + i1 + '] = ' + symbols_hex[i1]) ;
                if (!best_src) {
                    if (symbols_hex[i2] == 'fe0f') {
                        // variant selector but no emoji was found ending with this variant selector.
                        // remove - error in some test cases ...
                        symbols.splice(i2,1) ;
                        symbols_hex.splice(i2,1) ;
                    }
                    continue ;
                }

                // ignore if emoji symbol is inside an alt="<symbol>" attribute
                in_alt = true ;
                // check alt prefix
                i3 = best_i1-1 ;
                i4 = emoji_alt_prefix.length-1 ;
                while ((i3 >= 0) && (i4 >= 0) && (symbols[i3] == emoji_alt_prefix[i4])) { i3-- ; i4-- }
                if (i4 >= 0) in_alt = false ;
                // check alt postfix
                i3 = i2+1 ;
                i4 = 0 ;
                while ((i3 < symbols.length) && (i4 < emoji_alt_postfix.length ) && (symbols[i3] == emoji_alt_postfix[i4])) { i3++ ; i4++ }
                if (i4 < emoji_alt_postfix.length) in_alt = false;
                debug('emoji', pgm + 'found emoji symbol ' + best_src + ' at pos ' + best_i1 + '..' + i2 + '. in_alt = ' + in_alt) ;
                if (in_alt) {
                    // keep - already in a <img class="emoji" draggable="false" alt="<symbol>" src="<src>">
                    i2 = best_i1 ;
                    continue ;
                }
                // also ignore if using https://twemoji.maxcdn.com/2/72x72 and emoji is not available online
                if (!z_cache.user_setup.emoji_folder || (z_cache.user_setup.emoji_folder == emoji_folders[0])) {
                    if (missing_twemojis.indexOf(best_src) != -1) {
                        // keep unicode character
                        i2 = best_i1 ;
                        continue ;
                    }
                    while (best_src.substr(0,1) == '0') best_src = best_src.substr(1);
                }

                // replace emoji symbol with <img class="emoji" draggable="false" alt="<symbol>" src="<src>">
                img_str_start = '<img class="emoji" draggable="false" alt="' ;
                img_str_end = '" src="' + (z_cache.user_setup.emoji_folder || emoji_folders[0]) + '/' + best_src + '.png">';
                debug('emoji', pgm + 'img tag = ' + img_str_start + '<emoji>' + img_str_end) ;
                img_symbols_start = punycode.ucs2.decode(img_str_start) ;
                img_symbols_end = punycode.ucs2.decode(img_str_end) ;
                img_symbols = [] ;
                while (img_symbols_start.length) img_symbols.push(img_symbols_start.shift()) ;
                for (i3=best_i1 ; i3 <= i2 ; i3++) img_symbols.push(symbols[i3]) ; // inside alt - emoji unicode(s)
                while (img_symbols_end.length) img_symbols.push(img_symbols_end.shift()) ;
                symbols.splice(best_i1, i2-best_i1+1) ;
                while (img_symbols.length) symbols.splice(best_i1, 0, img_symbols.pop()) ;
                symbols_updated = true ;
                i2 = best_i1 ;
            } // for i
            if (symbols_updated) {
                str = punycode.ucs2.encode(symbols) ;
                debug('emoji', pgm + 'new str = ' + str) ;
            }

            return str ;
        } // replace_emojis

        // get list of emojis to be used in be used in reactions (Account page - edit reactions)
        var reaction_list = [] ;
        var reaction_list_full_support = null ;
        function get_reaction_list (full_emoji_support) {
            var i, code, j, missing ;
            if (reaction_list.length && (reaction_list_full_support == full_emoji_support)) return reaction_list ;
            reaction_list.splice(0,reaction_list.length) ;
            for (i=0 ; i<emoji_names.length ; i++) {
                code = emoji_names[i].code ;
                if (full_emoji_support) {
                    // check if emoji is supported by all emoji providers
                    if (missing_twemojis.indexOf(code) != -1) continue ; // not available at https://twemoji.maxcdn.com
                    missing = false ;
                    for (j=1 ; j<emoji_folders.length ; j++) {
                        if (emojis[emoji_folders[j] + '/' + code + '.png']) continue ; // OK for provider
                        missing = true ; // missing for provider
                        break ;
                    }
                    if (missing) continue ;
                }
                reaction_list.push((i+1) + ': ' + unicode_to_symbol(emoji_names[i].code) + ' ' + emoji_names[i].name + ' (' + emoji_names[i].code + ')') ;
            }
            // console.log('reaction_list = ' + JSON.stringify(reaction_list)) ;
            reaction_list_full_support = full_emoji_support ;
            return reaction_list ;
        } // get_reaction_list

        // export MoneyNetworkEmojiService
        return {
            get_standard_reactions: get_standard_reactions,
            get_user_reactions: get_user_reactions,
            get_emoji_folders: get_emoji_folders,
            init_emojis_short_list: init_emojis_short_list,
            replace_emojis: replace_emojis,
            get_reaction_list: get_reaction_list,
            unicode_to_symbol: unicode_to_symbol,
            symbol_to_unicode: symbol_to_unicode
        };

        // end MoneyNetworkEmojiService
    }]) ;
