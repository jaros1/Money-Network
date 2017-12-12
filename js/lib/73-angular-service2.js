angular.module('MoneyNetwork')

    // MoneyNetworkEmojiService:
    // - emojis helpers (emojis in messages and reactions)
    // - user_info and user_setup helpers
    // - contact and message sort

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

        //
        // Emojis helpers
        //

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
        function get_emoji_folder() {
            return z_cache.user_setup.emoji_folder || emoji_folders[0] ;
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
        moneyNetworkHubService.inject_functions({symbol_to_unicode: symbol_to_unicode}) ;
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

        //
        // user info helpers
        //

        // user info. Array with tag, value and privacy.
        // saved in localStorage. Shared with contacts depending on privacy choice
        z_cache.user_info = [] ;
        function empty_user_info_line() {
            return { tag: '', value: '', privacy: ''} ;
        }
        function is_user_info_empty () {
            var user_info_clone, empty_user_info_line_str, i, row ;
            if (z_cache.user_info.length == 0) return true ;
            empty_user_info_line_str = JSON.stringify(empty_user_info_line()) ;
            user_info_clone = JSON.parse(JSON.stringify(z_cache.user_info)) ;
            for (i=0 ; i<user_info_clone.length ; i++) {
                row = user_info_clone[i] ;
                delete row['$$hashKey'] ;
                if (JSON.stringify(row) != empty_user_info_line_str) return false ;
            }
            return true ;
        } //  is_user_info_empty


        function guest_account_user_info() {
            var pgm = service + '.guest_account_user_info: ' ;
            // todo: add more info to new guest account
            var timezone = (new Date()).getTimezoneOffset()/60 ;
            var language = navigator.languages ? navigator.languages[0] : navigator.language;
            return [
                { tag: 'Name', value: 'Guest', privacy: 'Search'},
                { tag: '%', value: '%', privacy: 'Search'},
                { tag: 'Timezone', value: '' + timezone, privacy: 'Hidden'},
                { tag: 'Language', value: '' + language, privacy: 'Hidden'}
            ] ;
        }

        function new_account_user_info() {
            var pgm = service + '.new_account_user_info: ' ;
            var cert_user_id, index, name, alias, timezone, language ;
            cert_user_id = ZeroFrame.site_info.cert_user_id ;
            name = 'n/a' ;
            if (!cert_user_id) name = MoneyNetworkHelper.get_fake_name() ;
            else {
                index = cert_user_id.indexOf('@') ;
                if (cert_user_id.substr(index) == '@moneynetwork.bit') name = MoneyNetworkHelper.get_fake_name() ;
                else name = cert_user_id.substr(0,index) ;
            }
            index = name.indexOf(' ') ;
            if (index == -1) alias = name ;
            else alias = name.substr(0,index);
            z_cache.user_setup.alias = alias ;
            timezone = (new Date()).getTimezoneOffset()/60 ;
            language = navigator.languages ? navigator.languages[0] : navigator.language;
            return [
                { tag: 'Name', value: name, privacy: 'Search'},
                { tag: '%', value: '%', privacy: 'Search'},
                { tag: 'Timezone', value: '' + timezone, privacy: 'Hidden'},
                { tag: 'Language', value: '' + language, privacy: 'Hidden'}
            ] ;
        }
        function load_user_info (create_new_account, guest) {
            var pgm = service + '.load_user_info: ';
            // load user info from local storage
            var user_info_str, new_user_info ;
            if (create_new_account) {
                if (guest) new_user_info = guest_account_user_info();
                else new_user_info = new_account_user_info() ;
            }
            else {
                user_info_str = MoneyNetworkHelper.getItem('user_info') ;
                if (user_info_str) {
                    try {
                        new_user_info = JSON.parse(user_info_str) ;
                    }
                    catch (e) {
                        console.log(pgm + 'error. user_info was invalid. error = ' + e.message) ;
                        new_user_info = [empty_user_info_line()] ;
                    }
                }
                else new_user_info = [empty_user_info_line()] ;
            }
            z_cache.user_info.splice(0,z_cache.user_info.length) ;
            for (var i=0 ; i<new_user_info.length ; i++) z_cache.user_info.push(new_user_info[i]) ;
            if (create_new_account) save_user_info() ;
        }
        function get_user_info () {
            return z_cache.user_info ;
        }

        function save_user_info (cb) {
            var pgm = service + '.save_user_info: ';

            // cleanup user_info before save
            var user_info_clone = JSON.parse(JSON.stringify(z_cache.user_info)) ;
            for (var i=0 ; i<user_info_clone.length ; i++) {
                delete user_info_clone[i]['$$hashKey']
            }
            MoneyNetworkHelper.setItem('user_info', JSON.stringify(user_info_clone)) ;

            $timeout(cb) ;
        } // save_user_info

        //
        // user setup helpers
        //

        // user setup: avatar, alias, contact sort, contact filters, chat sort, spam filters
        z_cache.user_setup = {} ;
        function load_user_setup (keysize) {
            var new_user_setup, key, guest_id, guest ;
            new_user_setup = JSON.parse(MoneyNetworkHelper.getItem('setup')) ;
            for (key in z_cache.user_setup) delete z_cache.user_setup[key] ;
            for (key in new_user_setup) z_cache.user_setup[key] = new_user_setup[key] ;
            // add missing defaults
            guest_id = MoneyNetworkHelper.getItem('guestid');
            guest = (guest_id == '' + z_cache.user_id) ;
            if (guest) z_cache.user_setup.guest = guest ;
            if (!z_cache.user_setup.contact_filters) z_cache.user_setup.contact_filters = {
                all: 'green',
                new: 'green',
                unverified: 'green',
                verified: 'green',
                ignore: 'green'
            } ;
            if (!z_cache.user_setup.contact_filters.hasOwnProperty('guest')) {
                z_cache.user_setup.contact_filters.guest = 'green' ;
            }
            if (!z_cache.user_setup.contact_sort) z_cache.user_setup.contact_sort = contact_sort_options[0] ;
            if (z_cache.user_setup.contact_sort == 'Last updated') z_cache.user_setup.contact_sort = 'Last online' ;
            if (!z_cache.user_setup.chat_sort) z_cache.user_setup.chat_sort = chat_sort_options[0] ;
            if (!z_cache.user_setup.hasOwnProperty('block_guests')) z_cache.user_setup.block_guests = false ; // !guest ; todo:
            if (!z_cache.user_setup.hasOwnProperty('block_ignored')) z_cache.user_setup.block_ignored = false ;
            if (!z_cache.user_setup.hasOwnProperty('public_chat')) z_cache.user_setup.public_chat = true; // guest ; todo:
            if (!z_cache.user_setup.hasOwnProperty('two_panel_chat')) z_cache.user_setup.two_panel_chat = true ;
            if (!z_cache.user_setup.alias) z_cache.user_setup.alias = 'Me';
            if (!z_cache.user_setup.encryption) z_cache.user_setup.encryption = keysize == 256 ? '2' : '1' ;
            MoneyNetworkAPILib.config({debug: z_cache.user_setup.debug && z_cache.user_setup.debug.money_network_api}) ;
        }
        function save_user_setup () {
            var i ;
            if (z_cache.user_setup.reactions) {
                for (i=0 ; i<z_cache.user_setup.length ; i++) {
                    delete z_cache.user_setup[i].src ;
                    delete z_cache.user_setup[i]["$$hashKey"] ;
                }
            }
            MoneyNetworkHelper.setItem('setup', JSON.stringify(z_cache.user_setup));
            MoneyNetworkHelper.ls_save();
        }

        //
        // sort helpers
        //

        // sort used in network and chat pages
        var contact_sort_options = ['Last online', 'User name', 'Last chat msg', 'Number chat msg', 'ZeroNet disk usage', 'Browser disk usage'];
        function get_contact_sort_options () {
            return contact_sort_options ;
        }
        function get_contact_sort_title () {
            var contact_sort_title = contact_sort_options[0];
            for (var i=1 ; i<contact_sort_options.length ; i++) {
                if (i<contact_sort_options.length-1) contact_sort_title += ", " ;
                else contact_sort_title += " or " ;
                contact_sort_title += contact_sort_options[i] ;
            }
            return contact_sort_title ;
        }
        function contact_order_by (contact) {
            var user_name, pgm, sort, i, message, unix_timestamp, short_date ;
            // find user name. for sort and debug
            if (contact.alias) user_name = contact.alias ;
            else if (contact.type == 'group') user_name = contact.unique_id.substr(0,13) ;
            else user_name = contact.cert_user_id ;
            while (user_name.length < 26) user_name += ' ' ;
            pgm = service + '. contact_order_by: user_name = ' + user_name + ', ' ;
            // check angularJS orderBy params
            //console.log(pgm + 'arguments.length = ' + arguments.length );
            //for (i=0 ; i<arguments.length ; i++) console.log(pgm + 'argument[' + i + '] = ' + JSON.stringify(arguments[i])) ;
            sort = 0 ;
            unix_timestamp = false ;
            if (z_cache.user_setup.contact_sort== 'Last online') {
                unix_timestamp = true ;
                sort = -MoneyNetworkHelper.get_last_online(contact) ;
            }
            if (z_cache.user_setup.contact_sort== 'User name') {
                sort = user_name ;
            }
            if (z_cache.user_setup.contact_sort== 'Last chat msg') {
                unix_timestamp = true;
                if (contact.messages && (contact.messages.length > 0)) {
                    sort = -contact.messages[contact.messages.length - 1].sent_at;
                }
            }
            if (z_cache.user_setup.contact_sort== 'Number chat msg') {
                if (contact.messages) sort = -contact.messages.length ;
            }
            if (z_cache.user_setup.contact_sort== 'ZeroNet disk usage') {
                if (contact.messages) {
                    for (i=0 ; i<contact.messages.length ; i++) {
                        message = contact.messages[i] ;
                        if ((message.folder == 'outbox') && message.zeronet_msg_size) sort -= message.zeronet_msg_size ;
                    }
                }
            }
            if (z_cache.user_setup.contact_sort== 'Browser disk usage') { // localStorage
                if (contact.messages) {
                    for (i=0 ; i<contact.messages.length ; i++) {
                        message = contact.messages[i] ;
                        if (message.ls_msg_size) sort -= message.ls_msg_size ;
                    }
                }
            }
            message = pgm + z_cache.user_setup.contact_sort + ' = ' + sort ;
            message += ' (' + typeof sort + ')' ;
            if (unix_timestamp) {
                short_date  = date(-sort*1000, 'short') ;
                if (short_date == 'Invalid Date') {
                    sort = 0 ;
                    short_date  = date(-sort*1000, 'short')
                }
                message += ', unix timestamp = ' + short_date ;
            }
            debug('contact_order_by', message) ;
            return sort ;
        } // contact_order_by

        var chat_sort_options = ['Last message', 'ZeroNet disk usage', 'Browser disk usage'] ;
        function get_chat_sort_options () {
            return chat_sort_options ;
        }
        function get_chat_sort_title () {
            var chat_sort_title = chat_sort_options[0];
            for (var i=1 ; i<chat_sort_options.length ; i++) {
                if (i<chat_sort_options.length-1) chat_sort_title += ", " ;
                else chat_sort_title += " or " ;
                chat_sort_title += chat_sort_options[i] ;
            }
            return chat_sort_title ;
        }

        // chat message order by.
        function chat_order_by (message) {
            var pgm = service + '.chat_order_by: ';
            var sort1, sort2, short_date, unix_timestamp, debug_msg, padding ;
            // 2. sort condition - always Last message unix timestamp
            sort2 = message.message.sent_at || message.message.created_at ;
            short_date  = date(sort2*1000, 'short') ;
            if (short_date == 'Invalid Date') {
                sort2 = 0 ;
                short_date  = date(sort2*1000, 'short')
            }
            // 1. sort condition - Last message, ZeroNet disk usage or Browser disk usage
            sort1 = 0 ;
            unix_timestamp = false ;
            // console.log(pgm + 'chat_sort = ' + self.chat_sort);
            if (z_cache.user_setup.chat_sort== 'Last message') {
                sort1 = sort2 ;
                unix_timestamp = true ;
            }
            if (z_cache.user_setup.chat_sort== 'ZeroNet disk usage') {
                if (message.message.zeronet_msg_size) sort1 = message.message.zeronet_msg_size ;
            }
            if (z_cache.user_setup.chat_sort== 'Browser disk usage') {
                if (message.message.ls_msg_size) sort1 = message.message.ls_msg_size ;
            }
            debug_msg = pgm + z_cache.user_setup.chat_sort + ' = ' + JSON.stringify(sort1) ;
            debug_msg += ' (' + typeof sort1 + ')' ;
            if (unix_timestamp) debug_msg += ', unix timestamp = ' + short_date ;
            debug('chat_order_by', debug_msg) ;
            if (unix_timestamp) return sort1 ; // simple unix timestamp sort
            // sort by 1. size and 2. unix timestamp
            padding = '              ' ;
            return (padding + sort1).slice(-13) + (padding + sort2).slice(-13) ;
        } // chat_order_by





        // export MoneyNetworkEmojiService
        return {
            get_standard_reactions: get_standard_reactions,
            get_user_reactions: get_user_reactions,
            get_emoji_folders: get_emoji_folders,
            get_emoji_folder: get_emoji_folder,
            init_emojis_short_list: init_emojis_short_list,
            replace_emojis: replace_emojis,
            get_reaction_list: get_reaction_list,
            unicode_to_symbol: unicode_to_symbol,
            symbol_to_unicode: symbol_to_unicode,
            is_user_info_empty: is_user_info_empty,
            load_user_info: load_user_info,
            save_user_info: save_user_info,
            load_user_setup: load_user_setup,
            save_user_setup: save_user_setup,
            get_contact_sort_options: get_contact_sort_options,
            get_contact_sort_title: get_contact_sort_title,
            contact_order_by: contact_order_by,
            get_chat_sort_options: get_chat_sort_options,
            get_chat_sort_title: get_chat_sort_title,
            chat_order_by: chat_order_by
        };

        // end MoneyNetworkEmojiService
    }]) ;
