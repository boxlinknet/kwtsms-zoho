/**
 * kwtSMS i18n - Translation loader
 *
 * Detects user locale from Zoho CRM SDK or falls back to browser language.
 * Loads en.json or ar.json and provides t(key) for string lookups.
 * Applies RTL direction when Arabic is detected.
 */

var KwtI18n = (function() {
    'use strict';

    var strings = {};
    var currentLang = 'en';
    var isRtl = false;
    var initialized = false;

    /**
     * Detect language from Zoho CRM user locale.
     * Falls back to browser language, then defaults to 'en'.
     */
    function detectLanguage(zohoUser) {
        if (zohoUser && zohoUser.language) {
            var lang = zohoUser.language.toLowerCase();
            if (lang.indexOf('ar') === 0) return 'ar';
        }
        // Fallback: browser language
        var browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
        if (browserLang.indexOf('ar') === 0) return 'ar';
        return 'en';
    }

    /**
     * Load translation JSON file via XMLHttpRequest.
     * @param {string} lang - 'en' or 'ar'
     * @param {function} callback - called with (error, strings)
     */
    function loadStrings(lang, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'i18n/' + lang + '.json', true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        callback(null, data);
                    } catch (e) {
                        callback(e, null);
                    }
                } else {
                    callback(new Error('Failed to load i18n/' + lang + '.json'), null);
                }
            }
        };
        xhr.send();
    }

    /**
     * Apply RTL direction and load RTL stylesheet.
     */
    function applyRtl() {
        document.documentElement.setAttribute('dir', 'rtl');
        document.body.classList.add('rtl');
        // Load RTL CSS if not already loaded
        if (!document.getElementById('kwt-rtl-css')) {
            var link = document.createElement('link');
            link.id = 'kwt-rtl-css';
            link.rel = 'stylesheet';
            link.href = 'css/rtl.css';
            document.head.appendChild(link);
        }
    }

    /**
     * Initialize i18n.
     * @param {object} zohoUser - Zoho CRM user object (optional, for language detection)
     * @param {function} callback - called when ready
     */
    function init(zohoUser, callback) {
        currentLang = detectLanguage(zohoUser);
        isRtl = (currentLang === 'ar');

        loadStrings(currentLang, function(err, data) {
            if (err) {
                // Fallback to English if Arabic fails
                if (currentLang !== 'en') {
                    currentLang = 'en';
                    isRtl = false;
                    loadStrings('en', function(err2, data2) {
                        strings = data2 || {};
                        initialized = true;
                        if (callback) callback();
                    });
                    return;
                }
                strings = {};
            } else {
                strings = data;
            }

            if (isRtl) {
                applyRtl();
            }

            initialized = true;
            if (callback) callback();
        });
    }

    /**
     * Get translated string by key.
     * Supports placeholder replacement: t('send_success_detail', {msg_id: '123', balance: 50})
     *
     * @param {string} key - Translation key from JSON file
     * @param {object} params - Optional placeholder values
     * @returns {string} Translated string or key if not found
     */
    function t(key, params) {
        var str = strings[key];
        if (str === undefined) return key;

        if (params) {
            Object.keys(params).forEach(function(param) {
                str = str.replace(new RegExp('\\{' + param + '\\}', 'g'), params[param]);
            });
        }

        return str;
    }

    /**
     * Translate all elements with data-i18n attribute.
     * Usage: <span data-i18n="status_balance"></span>
     * Also supports: data-i18n-placeholder, data-i18n-title
     */
    function translatePage() {
        var elements = document.querySelectorAll('[data-i18n]');
        for (var i = 0; i < elements.length; i++) {
            var key = elements[i].getAttribute('data-i18n');
            elements[i].textContent = t(key);
        }
        var placeholders = document.querySelectorAll('[data-i18n-placeholder]');
        for (var j = 0; j < placeholders.length; j++) {
            var pKey = placeholders[j].getAttribute('data-i18n-placeholder');
            placeholders[j].setAttribute('placeholder', t(pKey));
        }
        var titles = document.querySelectorAll('[data-i18n-title]');
        for (var k = 0; k < titles.length; k++) {
            var tKey = titles[k].getAttribute('data-i18n-title');
            titles[k].setAttribute('title', t(tKey));
        }
    }

    return {
        init: init,
        t: t,
        translatePage: translatePage,
        getLang: function() { return currentLang; },
        isRtl: function() { return isRtl; },
        isInitialized: function() { return initialized; }
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = KwtI18n;
}
