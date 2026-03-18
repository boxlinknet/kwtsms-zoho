(function() {
    'use strict';

    var config = {};

    // -------------------------------------------------------------------------
    // Initialization
    // -------------------------------------------------------------------------

    ZOHO.embeddedApp.on('PageLoad', function() {
        ZOHO.CRM.CONFIG.getCurrentUser().then(function(user) {
            KwtI18n.init(user, function() {
                KwtI18n.translatePage();
                loadConfig();
            });
        });
    });

    ZOHO.embeddedApp.init();

    // -------------------------------------------------------------------------
    // Event listeners
    // -------------------------------------------------------------------------

    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('save-btn').addEventListener('click', handleSave);

    // -------------------------------------------------------------------------
    // Load configuration from Deluge
    // -------------------------------------------------------------------------

    function loadConfig() {
        callFunction('kwtsms_get_config', {}).then(function(data) {
            config = data;
            updateUI();
        }).catch(function(err) {
            showResult('login-result', 'error', KwtI18n.t('error_unknown'));
        });
    }

    // -------------------------------------------------------------------------
    // Update UI from config
    // -------------------------------------------------------------------------

    function updateUI() {
        // -- Balance (color-coded) --
        var balanceEl = document.getElementById('status-balance');
        var balance = parseFloat(config.balance) || 0;
        balanceEl.textContent = balance;
        balanceEl.className = 'value';
        if (balance > 10) {
            balanceEl.classList.add('balance-ok');
        } else if (balance >= 1) {
            balanceEl.classList.add('balance-low');
        } else {
            balanceEl.classList.add('balance-zero');
        }

        // -- Active Sender ID --
        var senderEl = document.getElementById('status-sender');
        senderEl.textContent = config.sender_id || '--';

        // -- Gateway status dot --
        var gatewayDot = document.getElementById('status-gateway-dot');
        gatewayDot.className = 'kwt-status-dot';
        if (config.enabled) {
            gatewayDot.classList.add('green');
        } else {
            gatewayDot.classList.add('gray');
        }

        // -- Test Mode badge --
        var testBadge = document.getElementById('status-test-badge');
        if (config.test_mode) {
            testBadge.classList.remove('hidden');
        } else {
            testBadge.classList.add('hidden');
        }

        // -- Test Mode banner --
        var testBanner = document.getElementById('test-mode-banner');
        if (config.test_mode) {
            testBanner.classList.remove('hidden');
        } else {
            testBanner.classList.add('hidden');
        }

        // -- Last Sync --
        var lastSyncEl = document.getElementById('status-last-sync');
        lastSyncEl.textContent = config.last_sync || KwtI18n.t('status_never');

        // -- Show/hide config section --
        var configSection = document.getElementById('config-section');
        if (config.configured) {
            configSection.classList.remove('hidden');
        } else {
            configSection.classList.add('hidden');
        }

        // -- Populate country dropdown --
        var countrySelect = document.getElementById('config-country');
        var currentCountry = countrySelect.value;
        while (countrySelect.options.length > 1) {
            countrySelect.remove(1);
        }
        if (config.coverage && Array.isArray(config.coverage)) {
            config.coverage.forEach(function(country) {
                var option = document.createElement('option');
                option.value = country;
                option.textContent = '+' + country;
                countrySelect.appendChild(option);
            });
        }
        if (config.default_country) {
            countrySelect.value = config.default_country;
        } else if (currentCountry) {
            countrySelect.value = currentCountry;
        }

        // -- Populate sender dropdown --
        var senderSelect = document.getElementById('config-sender');
        var currentSender = senderSelect.value;
        while (senderSelect.options.length > 1) {
            senderSelect.remove(1);
        }
        if (config.senderids && Array.isArray(config.senderids)) {
            config.senderids.forEach(function(sid) {
                var option = document.createElement('option');
                option.value = sid;
                option.textContent = sid;
                senderSelect.appendChild(option);
            });
        }
        if (config.sender_id) {
            senderSelect.value = config.sender_id;
        } else if (currentSender) {
            senderSelect.value = currentSender;
        }

        // -- Toggle states --
        document.getElementById('toggle-test').checked = !!config.test_mode;
        document.getElementById('toggle-enabled').checked = !!config.enabled;
        document.getElementById('toggle-debug').checked = !!config.debug;
    }

    // -------------------------------------------------------------------------
    // Login handler
    // -------------------------------------------------------------------------

    function handleLogin() {
        var usernameInput = document.getElementById('login-username');
        var passwordInput = document.getElementById('login-password');
        var loginBtn = document.getElementById('login-btn');

        var username = usernameInput.value.trim();
        var password = passwordInput.value.trim();

        if (!username || !password) {
            showResult('login-result', 'error', KwtI18n.t('setup_required'));
            return;
        }

        loginBtn.disabled = true;
        loginBtn.textContent = KwtI18n.t('setup_logging_in');
        hideResult('login-result');

        callFunction('kwtsms_login', { username: username, password: password })
            .then(function(data) {
                if (data.status === 'OK') {
                    showResult('login-result', 'success', KwtI18n.t('setup_success'));
                    loadConfig();
                } else {
                    showResult('login-result', 'error', data.error || KwtI18n.t('setup_error'));
                }
            })
            .catch(function(err) {
                showResult('login-result', 'error', KwtI18n.t('setup_error'));
            })
            .finally(function() {
                passwordInput.value = '';
                loginBtn.disabled = false;
                loginBtn.textContent = KwtI18n.t('setup_login');
            });
    }

    // -------------------------------------------------------------------------
    // Save configuration handler
    // -------------------------------------------------------------------------

    function handleSave() {
        var saveBtn = document.getElementById('save-btn');

        var settings = {
            default_country: document.getElementById('config-country').value,
            sender_id: document.getElementById('config-sender').value,
            test_mode: document.getElementById('toggle-test').checked,
            enabled: document.getElementById('toggle-enabled').checked,
            debug: document.getElementById('toggle-debug').checked
        };

        saveBtn.disabled = true;
        saveBtn.textContent = KwtI18n.t('config_saving');
        hideResult('save-result');

        callFunction('kwtsms_save_config', settings)
            .then(function(data) {
                if (data.status === 'OK') {
                    showResult('save-result', 'success', KwtI18n.t('config_saved'));
                } else {
                    showResult('save-result', 'error', data.error || KwtI18n.t('config_save_error'));
                }
                loadConfig();
            })
            .catch(function(err) {
                showResult('save-result', 'error', KwtI18n.t('config_save_error'));
            })
            .finally(function() {
                saveBtn.disabled = false;
                saveBtn.textContent = KwtI18n.t('config_save');
            });
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    function showResult(elementId, type, message) {
        var el = document.getElementById(elementId);
        el.textContent = message;
        el.className = 'kwt-result visible ' + type;
    }

    function hideResult(elementId) {
        var el = document.getElementById(elementId);
        el.className = 'kwt-result hidden';
        el.textContent = '';
    }

    function callFunction(name, args) {
        return new Promise(function(resolve, reject) {
            try {
                ZOHO.CRM.FUNCTIONS.execute(name, {
                    arguments: JSON.stringify(args)
                }).then(function(response) {
                    try {
                        if (response && response.details && response.details.output) {
                            var output = response.details.output;
                            if (typeof output === 'string') {
                                output = JSON.parse(output);
                            }
                            resolve(output);
                        } else {
                            reject(new Error('No output returned from function.'));
                        }
                    } catch (parseErr) {
                        reject(new Error('Invalid response format.'));
                    }
                }).catch(function(sdkErr) {
                    var msg = KwtI18n.t('error_unknown');
                    if (sdkErr && sdkErr.message) {
                        msg = sdkErr.message;
                    }
                    reject(new Error(msg));
                });
            } catch (err) {
                reject(new Error(KwtI18n.t('error_unknown')));
            }
        });
    }

})();
