(function() {
    'use strict';

    var config = {};

    // Country code to name mapping
    var COUNTRY_NAMES = {
        '93':'Afghanistan','355':'Albania','213':'Algeria','376':'Andorra',
        '244':'Angola','54':'Argentina','374':'Armenia','61':'Australia',
        '43':'Austria','994':'Azerbaijan','973':'Bahrain','880':'Bangladesh',
        '375':'Belarus','32':'Belgium','501':'Belize','229':'Benin',
        '975':'Bhutan','591':'Bolivia','387':'Bosnia','267':'Botswana',
        '55':'Brazil','673':'Brunei','359':'Bulgaria','226':'Burkina Faso',
        '257':'Burundi','855':'Cambodia','237':'Cameroon','1':'Canada/US',
        '236':'Central African Rep.','235':'Chad','56':'Chile','86':'China',
        '57':'Colombia','269':'Comoros','243':'Congo (DRC)','242':'Congo',
        '506':'Costa Rica','385':'Croatia','53':'Cuba','357':'Cyprus',
        '420':'Czech Republic','45':'Denmark','253':'Djibouti',
        '593':'Ecuador','20':'Egypt','503':'El Salvador','240':'Eq. Guinea',
        '291':'Eritrea','372':'Estonia','251':'Ethiopia','679':'Fiji',
        '358':'Finland','33':'France','241':'Gabon','220':'Gambia',
        '995':'Georgia','49':'Germany','233':'Ghana','30':'Greece',
        '502':'Guatemala','224':'Guinea','592':'Guyana','509':'Haiti',
        '504':'Honduras','852':'Hong Kong','36':'Hungary','354':'Iceland',
        '91':'India','62':'Indonesia','98':'Iran','964':'Iraq',
        '353':'Ireland','972':'Israel','39':'Italy','225':'Ivory Coast',
        '81':'Japan','962':'Jordan','7':'Kazakhstan/Russia','254':'Kenya',
        '965':'Kuwait','996':'Kyrgyzstan','856':'Laos','371':'Latvia',
        '961':'Lebanon','266':'Lesotho','231':'Liberia','218':'Libya',
        '423':'Liechtenstein','370':'Lithuania','352':'Luxembourg',
        '853':'Macau','389':'N. Macedonia','261':'Madagascar','265':'Malawi',
        '60':'Malaysia','960':'Maldives','223':'Mali','356':'Malta',
        '222':'Mauritania','230':'Mauritius','52':'Mexico','373':'Moldova',
        '377':'Monaco','976':'Mongolia','382':'Montenegro','212':'Morocco',
        '258':'Mozambique','95':'Myanmar','264':'Namibia','977':'Nepal',
        '31':'Netherlands','64':'New Zealand','505':'Nicaragua','227':'Niger',
        '234':'Nigeria','47':'Norway','968':'Oman','92':'Pakistan',
        '970':'Palestine','507':'Panama','595':'Paraguay','51':'Peru',
        '63':'Philippines','48':'Poland','351':'Portugal','974':'Qatar',
        '40':'Romania','250':'Rwanda','966':'Saudi Arabia','221':'Senegal',
        '381':'Serbia','248':'Seychelles','232':'Sierra Leone','65':'Singapore',
        '421':'Slovakia','386':'Slovenia','252':'Somalia','27':'South Africa',
        '82':'South Korea','211':'South Sudan','34':'Spain','94':'Sri Lanka',
        '249':'Sudan','268':'Eswatini','46':'Sweden','41':'Switzerland',
        '963':'Syria','886':'Taiwan','992':'Tajikistan','255':'Tanzania',
        '66':'Thailand','228':'Togo','216':'Tunisia','90':'Turkey',
        '993':'Turkmenistan','256':'Uganda','380':'Ukraine',
        '971':'UAE','44':'United Kingdom','598':'Uruguay',
        '998':'Uzbekistan','58':'Venezuela','84':'Vietnam','967':'Yemen',
        '260':'Zambia','263':'Zimbabwe'
    };

    function getCountryName(code) {
        return COUNTRY_NAMES[code] || '';
    }

    // -------------------------------------------------------------------------
    // Initialization
    // -------------------------------------------------------------------------

    if (typeof ZOHO !== 'undefined' && ZOHO.embeddedApp) {
        ZOHO.embeddedApp.on('PageLoad', function() {
            ZOHO.CRM.CONFIG.getCurrentUser().then(function(user) {
                KwtI18n.init(user, function() {
                    KwtI18n.translatePage();
                    loadConfig();
                });
            });
        });
        ZOHO.embeddedApp.init();
    } else {
        KwtI18n.init(null, function() {
            KwtI18n.translatePage();
            loadConfig();
        });
    }

    // -------------------------------------------------------------------------
    // Event listeners
    // -------------------------------------------------------------------------

    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('save-btn').addEventListener('click', handleSave);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('reload-btn').addEventListener('click', handleReload);

    // -------------------------------------------------------------------------
    // Load configuration
    // -------------------------------------------------------------------------

    function loadConfig() {
        callFunction('kwtsms_get_config', {}).then(function(data) {
            config = data;
            updateUI();
        }).catch(function() {
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
        document.getElementById('status-sender').textContent = config.sender_id || '--';

        // -- Gateway status dot --
        var gatewayDot = document.getElementById('status-gateway-dot');
        gatewayDot.className = 'kwt-status-dot';
        gatewayDot.classList.add(config.enabled ? 'green' : 'gray');

        // -- Test Mode banner (no badge in status bar, banner is enough) --
        document.getElementById('test-mode-banner').classList.toggle('hidden', !config.test_mode);

        // -- Last Sync (friendly format) --
        var lastSyncText = KwtI18n.t('status_never');
        if (config.last_sync) {
            try {
                var d = new Date(config.last_sync);
                lastSyncText = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            } catch (e) {
                lastSyncText = config.last_sync;
            }
        }
        document.getElementById('status-last-sync').textContent = lastSyncText;

        // -- Login form vs logged-in bar --
        var loginForm = document.getElementById('login-form');
        var loggedInBar = document.getElementById('logged-in-bar');
        if (config.configured) {
            loginForm.style.display = 'none';
            loggedInBar.style.display = 'block';
            loggedInBar.classList.remove('hidden');
        } else {
            loginForm.style.display = 'block';
            loggedInBar.style.display = 'none';
        }

        // -- Show/hide config section --
        var configSection = document.getElementById('config-section');
        configSection.classList.toggle('hidden', !config.configured);

        // -- Populate country dropdown with names --
        var countrySelect = document.getElementById('config-country');
        var currentCountry = countrySelect.value;
        while (countrySelect.options.length > 1) {
            countrySelect.remove(1);
        }
        if (config.coverage && Array.isArray(config.coverage)) {
            // Sort by country name for usability
            var sorted = config.coverage.slice().sort(function(a, b) {
                var nameA = getCountryName(a) || a;
                var nameB = getCountryName(b) || b;
                return nameA.localeCompare(nameB);
            });
            sorted.forEach(function(code) {
                var option = document.createElement('option');
                option.value = code;
                var name = getCountryName(code);
                option.textContent = name ? name + ' (+' + code + ')' : '+' + code;
                countrySelect.appendChild(option);
            });
        }
        countrySelect.value = config.default_country || '965';
        if (!countrySelect.value) countrySelect.value = currentCountry;

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
        senderSelect.value = config.sender_id || 'KWT-SMS';
        if (!senderSelect.value) senderSelect.value = currentSender;

        // -- Toggle states --
        document.getElementById('toggle-enabled').checked = !!config.enabled;
        document.getElementById('toggle-test').checked = !!config.test_mode;
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
            .catch(function() {
                showResult('login-result', 'error', KwtI18n.t('setup_error'));
            })
            .finally(function() {
                passwordInput.value = '';
                loginBtn.disabled = false;
                loginBtn.textContent = KwtI18n.t('setup_login');
            });
    }

    // -------------------------------------------------------------------------
    // Logout handler
    // -------------------------------------------------------------------------

    function handleLogout() {
        if (isLocalDev) {
            localStorage.removeItem('kwtsms_config');
            localStorage.removeItem('kwtsms_creds');
        } else {
            // In Zoho: clear credentials and configured flag
            callFunction('kwtsms_save_config', {
                enabled: false
            });
            // Would need a dedicated logout Deluge function to clear Hidden variables
        }
        config = {
            enabled: false, test_mode: true, debug: false,
            configured: false, sender_id: '', default_country: '965',
            balance: 0, senderids: [], coverage: [], last_sync: ''
        };
        document.getElementById('login-username').value = '';
        hideResult('login-result');
        updateUI();
    }

    // -------------------------------------------------------------------------
    // Reload handler (refresh balance, sender IDs, coverage)
    // -------------------------------------------------------------------------

    function handleReload() {
        var reloadBtn = document.getElementById('reload-btn');
        reloadBtn.disabled = true;
        reloadBtn.textContent = '...';

        if (isLocalDev) {
            var creds = JSON.parse(localStorage.getItem('kwtsms_creds') || '{}');
            if (!creds.username) {
                reloadBtn.disabled = false;
                reloadBtn.textContent = KwtI18n.t('setup_reload');
                return;
            }
            var cfg = getLocalConfig();
            apiProxy('balance', creds).then(function(balanceRes) {
                if (balanceRes.result === 'OK') {
                    cfg.balance = balanceRes.available || 0;
                }
                return apiProxy('senderid', creds);
            }).then(function(senderRes) {
                if (senderRes.result === 'OK' && senderRes.senderid) {
                    cfg.senderids = senderRes.senderid;
                }
                return apiProxy('coverage', creds);
            }).then(function(coverageRes) {
                if (coverageRes.result === 'OK' && coverageRes.prefixes) {
                    cfg.coverage = coverageRes.prefixes;
                }
                cfg.last_sync = new Date().toISOString();
                localStorage.setItem('kwtsms_config', JSON.stringify(cfg));
                config = cfg;
                updateUI();
                showResult('login-result', 'success', KwtI18n.t('setup_reloaded'));
            }).catch(function() {
                showResult('login-result', 'error', KwtI18n.t('error_unknown'));
            }).finally(function() {
                reloadBtn.disabled = false;
                reloadBtn.textContent = KwtI18n.t('setup_reload');
            });
        } else {
            callFunction('kwtsms_sync', {}).then(function() {
                return callFunction('kwtsms_get_config', {});
            }).then(function(data) {
                config = data;
                updateUI();
                showResult('login-result', 'success', KwtI18n.t('setup_reloaded'));
            }).catch(function() {
                showResult('login-result', 'error', KwtI18n.t('error_unknown'));
            }).finally(function() {
                reloadBtn.disabled = false;
                reloadBtn.textContent = KwtI18n.t('setup_reload');
            });
        }
    }

    // -------------------------------------------------------------------------
    // Save configuration handler
    // -------------------------------------------------------------------------

    function handleSave() {
        var saveBtn = document.getElementById('save-btn');

        var settings = {
            enabled: document.getElementById('toggle-enabled').checked,
            test_mode: document.getElementById('toggle-test').checked,
            sender_id: document.getElementById('config-sender').value,
            default_country: document.getElementById('config-country').value,
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
            .catch(function() {
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

    // -------------------------------------------------------------------------
    // Zoho SDK / Local dev proxy switch
    // -------------------------------------------------------------------------

    var isLocalDev = (typeof ZOHO === 'undefined' || !ZOHO.embeddedApp);

    function callFunction(name, args) {
        if (isLocalDev) {
            return callFunctionLocal(name, args);
        }
        return new Promise(function(resolve, reject) {
            ZOHO.CRM.FUNCTIONS.execute(name, {
                arguments: JSON.stringify(args)
            }).then(function(response) {
                try {
                    var output = response.details.output;
                    if (typeof output === 'string') output = JSON.parse(output);
                    resolve(output);
                } catch (e) {
                    reject(new Error('Invalid response format.'));
                }
            }).catch(function(err) {
                reject(new Error(err.message || KwtI18n.t('error_unknown')));
            });
        });
    }

    function callFunctionLocal(name, args) {
        if (name === 'kwtsms_get_config') return Promise.resolve(getLocalConfig());
        if (name === 'kwtsms_save_config') return Promise.resolve(saveLocalConfig(args));
        if (name === 'kwtsms_login') return loginLocal(args.username, args.password);
        if (name === 'kwtsms_sync') return handleReloadLocal();
        return Promise.reject(new Error('Function ' + name + ' not available in local dev mode'));
    }

    function getLocalConfig() {
        var stored = localStorage.getItem('kwtsms_config');
        if (stored) {
            try { return JSON.parse(stored); } catch (e) {}
        }
        return {
            enabled: false, test_mode: true, debug: false,
            configured: false, sender_id: 'KWT-SMS', default_country: '965',
            balance: 0, senderids: [], coverage: [], last_sync: ''
        };
    }

    function saveLocalConfig(settings) {
        var cfg = getLocalConfig();
        if (settings.enabled !== undefined) cfg.enabled = settings.enabled;
        if (settings.test_mode !== undefined) cfg.test_mode = settings.test_mode;
        if (settings.debug !== undefined) cfg.debug = settings.debug;
        if (settings.sender_id) cfg.sender_id = settings.sender_id;
        if (settings.default_country) cfg.default_country = settings.default_country;
        localStorage.setItem('kwtsms_config', JSON.stringify(cfg));
        return { status: 'OK' };
    }

    function apiProxy(endpoint, payload) {
        return fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: endpoint, payload: payload })
        }).then(function(res) { return res.json(); });
    }

    function handleReloadLocal() {
        // Reload is handled directly in handleReload()
        return Promise.resolve({ status: 'OK' });
    }

    function loginLocal(username, password) {
        var creds = { username: username, password: password };
        return apiProxy('balance', creds).then(function(balanceRes) {
            if (balanceRes.result !== 'OK') {
                return { status: 'ERROR', error: KwtI18n.t('setup_error') };
            }
            var cfg = getLocalConfig();
            cfg.configured = true;
            cfg.balance = balanceRes.available || 0;

            return apiProxy('senderid', creds).then(function(senderRes) {
                cfg.senderids = (senderRes.result === 'OK' && senderRes.senderid) ? senderRes.senderid : [];
                return apiProxy('coverage', creds);
            }).then(function(coverageRes) {
                cfg.coverage = (coverageRes.result === 'OK' && coverageRes.prefixes) ? coverageRes.prefixes : [];
                cfg.last_sync = new Date().toISOString();
                cfg.enabled = true;
                cfg.test_mode = true;
                // Default sender ID to KWT-SMS if available, otherwise first in list
                if (cfg.senderids.indexOf('KWT-SMS') >= 0) {
                    cfg.sender_id = 'KWT-SMS';
                } else if (cfg.senderids.length > 0) {
                    cfg.sender_id = cfg.senderids[0];
                }
                cfg.default_country = '965';
                localStorage.setItem('kwtsms_creds', JSON.stringify(creds));
                localStorage.setItem('kwtsms_config', JSON.stringify(cfg));
                return { status: 'OK', balance: cfg.balance };
            });
        });
    }

})();
