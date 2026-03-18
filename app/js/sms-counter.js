/**
 * kwtSMS SMS Character Counter
 * Reference: https://www.kwtsms.com/faq/sms-message-length.html
 *
 * GSM-7 (English): 160 chars/page single, 153 chars/page multi, max 7 pages (1071)
 * Unicode (Arabic): 70 chars/page single, 67 chars/page multi, max 7 pages (472)
 *
 * One non-GSM-7 character switches the entire message to Unicode counting.
 */

var SmsCounter = (function() {
    'use strict';

    // GSM 03.38 Basic Character Set (single-byte)
    // Includes standard ASCII subset + GSM-specific chars
    var GSM7_BASIC = [
        '@', '\u00A3', '$', '\u00A5', '\u00E8', '\u00E9', '\u00F9', '\u00EC',
        '\u00F2', '\u00C7', '\n', '\u00D8', '\u00F8', '\r', '\u00C5', '\u00E5',
        '\u0394', '_', '\u03A6', '\u0393', '\u039B', '\u03A9', '\u03A0', '\u03A8',
        '\u03A3', '\u0398', '\u039E', '\u00C6', '\u00E6', '\u00DF', '\u00C9',
        ' ', '!', '"', '#', '\u00A4', '%', '&', '\'',
        '(', ')', '*', '+', ',', '-', '.', '/',
        '0', '1', '2', '3', '4', '5', '6', '7',
        '8', '9', ':', ';', '<', '=', '>', '?',
        '\u00A1', 'A', 'B', 'C', 'D', 'E', 'F', 'G',
        'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O',
        'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W',
        'X', 'Y', 'Z', '\u00C4', '\u00D6', '\u00D1', '\u00DC', '\u00A7',
        '\u00BF', 'a', 'b', 'c', 'd', 'e', 'f', 'g',
        'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o',
        'p', 'q', 'r', 's', 't', 'u', 'v', 'w',
        'x', 'y', 'z', '\u00E4', '\u00F6', '\u00F1', '\u00FC', '\u00E0'
    ];

    // GSM 03.38 Extension Table (two-byte: escape + char)
    // These count as 2 characters in GSM-7 encoding
    var GSM7_EXTENDED = [
        '{', '}', '[', ']', '~', '\\', '|', '^', '\u20AC' // euro sign
    ];

    var gsm7Set = null;
    var gsm7ExtSet = null;

    function _initSets() {
        if (gsm7Set) return;
        gsm7Set = {};
        gsm7ExtSet = {};
        for (var i = 0; i < GSM7_BASIC.length; i++) {
            gsm7Set[GSM7_BASIC[i]] = true;
        }
        for (var j = 0; j < GSM7_EXTENDED.length; j++) {
            gsm7ExtSet[GSM7_EXTENDED[j]] = true;
        }
    }

    /**
     * Check if a character is in the GSM-7 character set
     */
    function isGsm7Char(ch) {
        _initSets();
        return gsm7Set[ch] === true || gsm7ExtSet[ch] === true;
    }

    /**
     * Check if a character is in the GSM-7 extension table (counts as 2)
     */
    function isGsm7Extended(ch) {
        _initSets();
        return gsm7ExtSet[ch] === true;
    }

    /**
     * Detect if the entire message can be encoded in GSM-7.
     * Returns false if any character requires Unicode.
     */
    function isGsm7(text) {
        _initSets();
        for (var i = 0; i < text.length; i++) {
            if (!gsm7Set[text[i]] && !gsm7ExtSet[text[i]]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Count the number of GSM-7 "septets" (7-bit units) in the message.
     * Extended characters count as 2 septets.
     */
    function countGsm7Chars(text) {
        _initSets();
        var count = 0;
        for (var i = 0; i < text.length; i++) {
            if (gsm7ExtSet[text[i]]) {
                count += 2; // escape + char
            } else {
                count += 1;
            }
        }
        return count;
    }

    /**
     * Count SMS pages and characters.
     *
     * @param {string} text - Message text
     * @returns {object} {
     *   length: number,      // character count (GSM-7 septets or Unicode chars)
     *   encoding: string,    // "GSM-7" or "Unicode"
     *   pages: number,       // number of SMS pages/parts
     *   charsPerPage: number, // chars available per page (varies single vs multi)
     *   maxChars: number,    // absolute max characters (7 pages)
     *   maxPages: number,    // always 7
     *   remaining: number,   // chars remaining in current page
     *   exceeded: boolean    // true if over 7 pages
     * }
     */
    function count(text) {
        if (!text || text.length === 0) {
            return {
                length: 0,
                encoding: 'GSM-7',
                pages: 0,
                charsPerPage: 160,
                maxChars: 1071,
                maxPages: 7,
                remaining: 160,
                exceeded: false
            };
        }

        var useGsm7 = isGsm7(text);
        var length = useGsm7 ? countGsm7Chars(text) : text.length;

        var singleMax, multiMax;
        if (useGsm7) {
            singleMax = 160;
            multiMax = 153;
        } else {
            singleMax = 70;
            multiMax = 67;
        }

        var maxPages = 7;
        var maxChars = singleMax + (multiMax * (maxPages - 1));
        // GSM-7: 160 + 153*6 = 1078 (but kwtSMS says 1071, use 153*7=1071 for multi)
        // Unicode: 70 + 67*6 = 472 (kwtSMS says 472)
        // kwtSMS counts: if multi-page, all pages use multi-page size
        if (length > singleMax) {
            maxChars = multiMax * maxPages;
        } else {
            maxChars = singleMax;
        }

        var pages, charsPerPage, remaining;
        if (length === 0) {
            pages = 0;
            charsPerPage = singleMax;
            remaining = singleMax;
        } else if (length <= singleMax) {
            pages = 1;
            charsPerPage = singleMax;
            remaining = singleMax - length;
        } else {
            pages = Math.ceil(length / multiMax);
            charsPerPage = multiMax;
            remaining = (pages * multiMax) - length;
        }

        var absoluteMax = multiMax * maxPages; // 1071 or 472
        var exceeded = length > absoluteMax;

        return {
            length: length,
            encoding: useGsm7 ? 'GSM-7' : 'Unicode',
            pages: pages,
            charsPerPage: charsPerPage,
            maxChars: absoluteMax,
            maxPages: maxPages,
            remaining: exceeded ? 0 : remaining,
            exceeded: exceeded
        };
    }

    /**
     * Format the counter display string.
     * Example: "45/160 (1 page, English)" or "35/70 (1 page, Arabic)"
     */
    function formatDisplay(text) {
        var result = count(text);
        var pageLabel = result.pages === 1 ? 'page' : 'pages';
        var langLabel = result.encoding === 'GSM-7' ? 'English' : 'Arabic';
        var currentMax;

        if (result.pages <= 1) {
            currentMax = result.encoding === 'GSM-7' ? 160 : 70;
        } else {
            currentMax = result.maxChars;
        }

        return result.length + '/' + currentMax + ' (' + result.pages + ' ' + pageLabel + ', ' + langLabel + ')';
    }

    return {
        count: count,
        formatDisplay: formatDisplay,
        isGsm7: isGsm7,
        isGsm7Char: isGsm7Char,
        countGsm7Chars: countGsm7Chars
    };
})();

// Export for Node.js testing (if available)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmsCounter;
}
