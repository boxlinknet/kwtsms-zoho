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
    }

    function bindEvents() {
        els.recipient.addEventListener('input', normalizePreview);
        els.message.addEventListener('input', updateCharCounter);
        els.sendBtn.addEventListener('click', handleSend);
    }

    function loadConfig() {
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
            var opt = document.createElement('option');
            opt.value = '';
            opt.textContent = KwtI18n.t('config_no_senders');
            els.sender.appendChild(opt);
            return;
        }

        for (var i = 0; i < senderIds.length; i++) {
            var opt = document.createElement('option');
            opt.value = senderIds[i];
            opt.textContent = senderIds[i];
            if (config.sender_id && senderIds[i] === config.sender_id) {
                opt.selected = true;
            }
            els.sender.appendChild(opt);
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

    /**
     * Client-side normalization preview.
     * Mirrors the logic in kwtsms_normalize.dg for user feedback.
     * Actual normalization happens server-side in kwtsms_send.
     */
    function normalizePreview() {
        var raw = els.recipient.value;

        // Convert Arabic-Indic and Persian digits to Latin
        var arabicMap = {
            '\u0660':'0','\u0661':'1','\u0662':'2','\u0663':'3','\u0664':'4',
            '\u0665':'5','\u0666':'6','\u0667':'7','\u0668':'8','\u0669':'9',
            '\u06F0':'0','\u06F1':'1','\u06F2':'2','\u06F3':'3','\u06F4':'4',
            '\u06F5':'5','\u06F6':'6','\u06F7':'7','\u06F8':'8','\u06F9':'9'
        };
        var converted = '';
        for (var i = 0; i < raw.length; i++) {
            converted += arabicMap[raw[i]] || raw[i];
        }

        // Strip non-digits
        var digits = converted.replace(/\D/g, '');

        // Strip leading 00
        if (digits.indexOf('00') === 0) {
            digits = digits.substring(2);
        }

        // Strip single leading 0
        if (digits.length > 0 && digits.charAt(0) === '0') {
            digits = digits.substring(1);
        }

        // Prepend default country if number looks local (< 8 digits or doesn't start with known prefix)
        if (digits && config.default_country) {
            var hasPrefix = false;
            if (config.coverage && Array.isArray(config.coverage)) {
                for (var j = 0; j < config.coverage.length; j++) {
                    if (digits.indexOf(config.coverage[j]) === 0) {
                        hasPrefix = true;
                        break;
                    }
                }
            }
            if (!hasPrefix && digits.length < 12) {
                digits = config.default_country + digits;
            }
        }

        if (digits) {
            els.normalizedPreview.textContent =
                KwtI18n.t('send_normalized', {number: digits});
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

        els.charCounter.textContent =
            stats.length + '/' + stats.maxChars +
            ' (' + stats.pages + ' ' + pageLabel + ', ' + encodingLabel + ')';

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
        var recipient = els.recipient.value.trim();
        var message = els.message.value.trim();
        var senderId = els.sender.value;

        if (!recipient) {
            showResult('error', KwtI18n.t('send_no_recipient'));
            return;
        }
        if (!message) {
            showResult('error', KwtI18n.t('send_no_message'));
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

        ZOHO.CRM.FUNCTIONS.execute('kwtsms_send', {
            arguments: JSON.stringify({
                mobile: recipient,
                message: message,
                sender_id: senderId
            })
        })
        .then(function(response) {
            var output = response && response.details ? response.details.output : null;
            if (typeof output === 'string') {
                try { output = JSON.parse(output); } catch (e) { output = null; }
            }

            if (output && output.status === 'OK') {
                var detail = KwtI18n.t('send_success_detail', {
                    msg_id: output.msg_id || '',
                    balance: output.balance !== undefined ? output.balance : ''
                });
                showResult('success', KwtI18n.t('send_success') + ' ' + detail);
            } else {
                var errorMsg = output && output.error
                    ? output.error
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
