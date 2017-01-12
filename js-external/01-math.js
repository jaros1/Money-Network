// replace Math.random with window.crypto.getRandomValues
// As Math.random but using Web Crypto API.
// https://developer.mozilla.org/en-US/docs/Web/API/RandomSource/getRandomValues

Math = (function () {

    var random = Math.random ;
    (function () {
        if (!window.crypto) return ;
        if (!window.crypto.getRandomValues) return ;
        random = function () {
            var array, str, reverse_str, i ;
            array = new Uint32Array(2);
            window.crypto.getRandomValues(array);
            str = '' + array[0] + array[1] ;
            for (i = str.length - 1, reverse_str = '0.'; i >= 0; reverse_str += str[i--]) { } ;
            return parseFloat(reverse_str) ;
        }
    })() ;

    return {
        abs: Math.abs,
        ceil: Math.ceil,
        floor: Math.floor,
        log: Math.log,
        LOG2E: Math.LOG2E,
        max: Math.max,
        min: Math.min,
        pow: Math.pow,
        random: random,
        round: Math.round,
        sqrt: Math.sqrt
    } ;
})() ;
