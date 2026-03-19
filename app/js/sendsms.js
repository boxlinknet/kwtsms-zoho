(function() {
    'use strict';

    var config = {};
    var currentEntity = null;
    var sending = false;

    var els = {};

    function cacheElements() {
        els.recipient = document.getElementById('sms-recipient');
        els.normalizedPreview = document.getElementById('normalized-preview');
        els.sender = document.getElementById('sms-sender');
        els.message = document.getElementById('sms-message');
        els.charCounter = document.getElementById('char-counter');
        els.sendBtn = document.getElementById('send-btn');
        els.sendBtnLabel = els.sendBtn.querySelector('span');
        els.sendResult = document.getElementById('send-result');
        els.testModeBanner = document.getElementById('test-mode-banner');
        els.disabledBanner = document.getElementById('disabled-banner');
    }

    function init() {
        cacheElements();
        bindEvents();

        if (typeof ZOHO !== 'undefined' && ZOHO.embeddedApp) {
            ZOHO.embeddedApp.on('PageLoad', function(data) {
                currentEntity = data;
            });

            ZOHO.embeddedApp.init().then(function() {
                return ZOHO.CRM.CONFIG.getCurrentUser();
            }).then(function(response) {
                var user = response && response.users ? response.users[0] : {};
                KwtI18n.init(user, function() {
                    KwtI18n.translatePage();
                    loadConfig();
                    prefillPhone();
                });
            });
        } else {
            // Local dev mode
            KwtI18n.init(null, function() {
                KwtI18n.translatePage();
                loadConfig();
                updateCharCounter();
            });
        }
    }

    function bindEvents() {
        els.recipient.addEventListener('input', normalizePreview);
        els.message.addEventListener('input', updateCharCounter);
        els.sendBtn.addEventListener('click', handleSend);
    }

    var isLocalDev = (typeof ZOHO === 'undefined' || !ZOHO.embeddedApp);

    function loadConfig() {
        if (isLocalDev) {
            var stored = localStorage.getItem('kwtsms_config');
            if (stored) {
                try { config = JSON.parse(stored); } catch (e) { config = {}; }
            }
            populateSenders();
            updateBanners();
            updateSendButtonState();
            return;
        }
        ZOHO.CRM.FUNCTIONS.execute('kwtsms_get_config', {})
            .then(function(response) {
                var output = response && response.details ? response.details.output : null;
                if (typeof output === 'string') {
                    try { output = JSON.parse(output); } catch (e) { output = null; }
                }
                if (!output) {
                    showResult('error', KwtI18n.t('error_unknown'));
                    return;
                }
                config = output;
                populateSenders();
                updateBanners();
                updateSendButtonState();
            })
            .catch(function() {
                showResult('error', KwtI18n.t('error_unknown'));
            });
    }

    function populateSenders() {
        els.sender.textContent = '';

        var senderIds = config.senderids;
        if (!senderIds || !senderIds.length) {
            var emptyOpt = document.createElement('option');
            emptyOpt.value = '';
            emptyOpt.textContent = KwtI18n.t('config_no_senders');
            els.sender.appendChild(emptyOpt);
            return;
        }

        for (var i = 0; i < senderIds.length; i++) {
            var senderOpt = document.createElement('option');
            senderOpt.value = senderIds[i];
            senderOpt.textContent = senderIds[i];
            if (config.sender_id && senderIds[i] === config.sender_id) {
                senderOpt.selected = true;
            }
            els.sender.appendChild(senderOpt);
        }
    }

    function updateBanners() {
        if (config.test_mode) {
            els.testModeBanner.classList.remove('hidden');
        } else {
            els.testModeBanner.classList.add('hidden');
        }

        if (!config.enabled) {
            els.disabledBanner.classList.remove('hidden');
        } else {
            els.disabledBanner.classList.add('hidden');
        }
    }

    function updateSendButtonState() {
        if (!config.enabled || !config.configured) {
            els.sendBtn.disabled = true;
            return;
        }

        var text = els.message.value.trim();
        var recipient = els.recipient.value.trim();

        if (!recipient || !text || sending) {
            els.sendBtn.disabled = true;
            return;
        }

        // Validate phone number
        var normalized = normalizePhone(recipient);
        if (!normalized || validatePhone(normalized) !== null) {
            els.sendBtn.disabled = true;
            return;
        }

        var stats = SmsCounter.count(text);
        if (stats.exceeded) {
            els.sendBtn.disabled = true;
            return;
        }

        els.sendBtn.disabled = false;
    }

    function prefillPhone() {
        if (!currentEntity || !currentEntity.Entity || !currentEntity.EntityId) {
            return;
        }

        var entity = currentEntity.Entity;
        var id = currentEntity.EntityId;

        if (entity === 'Contacts' || entity === 'Leads') {
            ZOHO.CRM.API.getRecord({ Entity: entity, RecordID: id })
                .then(function(response) {
                    var record = response && response.data ? response.data[0] : null;
                    if (record) {
                        setPhone(record.Mobile || record.Phone || '');
                    }
                });
        } else if (entity === 'Deals') {
            ZOHO.CRM.API.getRecord({ Entity: 'Deals', RecordID: id })
                .then(function(response) {
                    var record = response && response.data ? response.data[0] : null;
                    if (!record) return;

                    var contactRef = record.Contact_Name;
                    if (contactRef && contactRef.id) {
                        return ZOHO.CRM.API.getRecord({ Entity: 'Contacts', RecordID: contactRef.id });
                    }
                })
                .then(function(response) {
                    if (!response) return;
                    var contact = response && response.data ? response.data[0] : null;
                    if (contact) {
                        setPhone(contact.Mobile || contact.Phone || '');
                    }
                });
        }
    }

    function setPhone(phone) {
        if (phone) {
            els.recipient.value = phone;
            normalizePreview();
            updateSendButtonState();
        }
    }

    // Arabic-Indic and Persian digit map
    var ARABIC_DIGIT_MAP = {
        '\u0660':'0','\u0661':'1','\u0662':'2','\u0663':'3','\u0664':'4',
        '\u0665':'5','\u0666':'6','\u0667':'7','\u0668':'8','\u0669':'9',
        '\u06F0':'0','\u06F1':'1','\u06F2':'2','\u06F3':'3','\u06F4':'4',
        '\u06F5':'5','\u06F6':'6','\u06F7':'7','\u06F8':'8','\u06F9':'9'
    };

    /**
     * Normalize a phone number to international digits-only format.
     * Mirrors the logic in kwtsms_normalize.dg.
     * Returns the normalized string, or empty string if invalid.
     */
    function normalizePhone(raw) {
        if (!raw) return '';

        // Convert Arabic/Persian digits to Latin
        var converted = '';
        for (var i = 0; i < raw.length; i++) {
            converted += ARABIC_DIGIT_MAP[raw[i]] || raw[i];
        }

        // Strip non-digits
        var digits = converted.replace(/\D/g, '');

        // Strip leading 00
        if (digits.indexOf('00') === 0) {
            digits = digits.substring(2);
        }

        // Strip single leading 0 (local format like 0575948372)
        if (digits.length > 0 && digits.charAt(0) === '0') {
            digits = digits.substring(1);
        }

        if (!digits) return '';

        // Check if starts with a known coverage prefix (longest first)
        var hasPrefix = false;
        if (config.coverage && Array.isArray(config.coverage)) {
            // Sort by length descending so "965" matches before "96"
            var sorted = config.coverage.slice().sort(function(a, b) {
                return b.length - a.length;
            });
            for (var j = 0; j < sorted.length; j++) {
                if (digits.indexOf(sorted[j]) === 0) {
                    hasPrefix = true;
                    break;
                }
            }
        }

        // Prepend default country only if no recognized prefix AND local part is reasonable
        // GCC local numbers: Kuwait 8 digits, Saudi 9, UAE 9, Bahrain 8, Qatar 8. Max 9.
        if (!hasPrefix && config.default_country && digits.length <= 9) {
            digits = config.default_country + digits;
        }

        return digits;
    }

    /**
     * Validate a normalized phone number.
     * Returns null if valid, or an error message string if invalid.
     */
    function validatePhone(normalized) {
        if (!normalized) {
            return KwtI18n.t('send_no_recipient');
        }

        // Must be digits only (should already be after normalizePhone)
        if (/\D/.test(normalized)) {
            return KwtI18n.t('error_no_valid_numbers');
        }

        // Length check: international numbers are typically 10-15 digits
        if (normalized.length < 10 || normalized.length > 15) {
            return KwtI18n.t('error_invalid_number', 'Invalid phone number length');
        }

        // Must start with a known coverage prefix
        var matchedPrefix = false;
        if (config.coverage && Array.isArray(config.coverage)) {
            for (var j = 0; j < config.coverage.length; j++) {
                if (normalized.indexOf(config.coverage[j]) === 0) {
                    matchedPrefix = true;
                    break;
                }
            }
        }
        if (!matchedPrefix) {
            return KwtI18n.t('error_no_route', 'Country not supported. Check your kwtSMS coverage.');
        }

        return null; // valid
    }

    /**
     * Update the normalization preview below the recipient field.
     */
    function normalizePreview() {
        var normalized = normalizePhone(els.recipient.value);

        if (normalized) {
            var error = validatePhone(normalized);
            if (error) {
                els.normalizedPreview.textContent = error;
                els.normalizedPreview.style.color = '#FF3B30';
            } else {
                els.normalizedPreview.textContent =
                    KwtI18n.t('send_normalized', {number: normalized});
                els.normalizedPreview.style.color = '#888';
            }
        } else {
            els.normalizedPreview.textContent = '';
        }

        updateSendButtonState();
    }

    function updateCharCounter() {
        var text = els.message.value;
        var stats = SmsCounter.count(text);

        var encodingLabel = stats.encoding === 'Unicode'
            ? KwtI18n.t('send_char_arabic')
            : KwtI18n.t('send_char_english');

        var pageLabel = stats.pages === 1
            ? KwtI18n.t('send_char_page')
            : KwtI18n.t('send_char_pages');

        // Show current chars and pages
        els.charCounter.textContent =
            stats.length + ' ' + encodingLabel +
            ' (' + stats.pages + ' ' + pageLabel + ')';

        if (stats.exceeded) {
            els.charCounter.classList.add('exceeded');
        } else {
            els.charCounter.classList.remove('exceeded');
        }

        updateSendButtonState();
    }

    function setSendButtonSending(isSending) {
        while (els.sendBtn.firstChild) {
            els.sendBtn.removeChild(els.sendBtn.firstChild);
        }

        if (isSending) {
            var spinner = document.createElement('span');
            spinner.className = 'kwt-spinner';
            els.sendBtn.appendChild(spinner);

            var text = document.createElement('span');
            text.textContent = KwtI18n.t('send_sending');
            els.sendBtn.appendChild(text);
        } else {
            var label = document.createElement('span');
            label.textContent = KwtI18n.t('send_button');
            label.setAttribute('data-i18n', 'send_button');
            els.sendBtn.appendChild(label);
            els.sendBtnLabel = label;
        }
    }

    function handleSend() {
        var rawRecipient = els.recipient.value.trim();
        var message = els.message.value.trim();
        var senderId = els.sender.value;

        if (!rawRecipient) {
            showResult('error', KwtI18n.t('send_no_recipient'));
            return;
        }
        if (!message) {
            showResult('error', KwtI18n.t('send_no_message'));
            return;
        }

        // Normalize and validate phone number locally before any API call
        var recipient = normalizePhone(rawRecipient);
        var phoneError = validatePhone(recipient);
        if (phoneError) {
            showResult('error', phoneError);
            return;
        }

        var stats = SmsCounter.count(message);
        if (stats.exceeded) {
            showResult('error', KwtI18n.t('send_exceeded'));
            return;
        }

        sending = true;
        els.sendBtn.disabled = true;
        setSendButtonSending(true);
        hideResult();

        var sendPromise;
        if (isLocalDev) {
            var creds = JSON.parse(localStorage.getItem('kwtsms_creds') || '{}');
            sendPromise = fetch('/api/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: 'send',
                    payload: {
                        username: creds.username,
                        password: creds.password,
                        sender: senderId,
                        mobile: recipient,
                        message: message,
                        test: config.test_mode ? '1' : '0'
                    }
                })
            }).then(function(r) { return r.json(); }).then(function(output) {
                return { local: true, data: output };
            });
        } else {
            sendPromise = ZOHO.CRM.FUNCTIONS.execute('kwtsms_send', {
                arguments: JSON.stringify({
                    mobile: recipient,
                    message: message,
                    sender_id: senderId
                })
            }).then(function(response) {
                var output = response && response.details ? response.details.output : null;
                if (typeof output === 'string') {
                    try { output = JSON.parse(output); } catch (e) { output = null; }
                }
                return { local: false, data: output };
            });
        }

        sendPromise.then(function(result) {
            var output = result.data;
            var isOk = result.local ? (output && output.result === 'OK') : (output && output.status === 'OK');

            if (isOk) {
                var msgId = output['msg-id'] || output.msg_id || '';
                var balance = output['balance-after'] || output.balance || '';
                var detail = KwtI18n.t('send_success_detail', {
                    msg_id: msgId,
                    balance: balance
                });
                showResult('success', KwtI18n.t('send_success') + ' ' + detail);
                // Update cached balance
                if (isLocalDev && balance) {
                    config.balance = balance;
                    localStorage.setItem('kwtsms_config', JSON.stringify(config));
                }
            } else {
                var errorMsg = (output && (output.error || output.description))
                    ? (output.error || output.description)
                    : KwtI18n.t('send_error');
                showResult('error', errorMsg);
            }
        })
        .catch(function() {
            showResult('error', KwtI18n.t('send_error'));
        })
        .finally(function() {
            sending = false;
            setSendButtonSending(false);
            updateSendButtonState();
        });
    }

    function showResult(type, message) {
        els.sendResult.className = 'kwt-result visible ' + type;
        els.sendResult.textContent = message;
    }

    function hideResult() {
        els.sendResult.className = 'kwt-result hidden';
        els.sendResult.textContent = '';
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
