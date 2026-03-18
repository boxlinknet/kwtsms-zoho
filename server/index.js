var fs = require('fs');
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var errorHandler = require('errorhandler');
var morgan = require('morgan');
var serveIndex = require('serve-index');
var https = require('https');
var chalk = require('chalk');

process.env.PWD = process.env.PWD || process.cwd();

var expressApp = express();
var port = 5000;

expressApp.set('port', port);
expressApp.use(morgan('dev'));
expressApp.use(bodyParser.json());
expressApp.use(bodyParser.urlencoded({ extended: false }));
expressApp.use(errorHandler());

expressApp.use('/', function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

expressApp.get('/plugin-manifest.json', function(req, res) {
    res.sendFile(path.join(process.env.PWD, 'plugin-manifest.json'));
});

// ── Local dev API proxy (forwards to kwtSMS API, avoids CORS) ──
expressApp.post('/api/proxy', function(req, res) {
    var endpoint = req.body.endpoint; // e.g. "balance", "send", "senderid", "coverage", "validate"
    var payload = req.body.payload;   // JSON object to POST to kwtSMS

    if (!endpoint || !payload) {
        return res.json({ result: 'ERROR', error: 'Missing endpoint or payload' });
    }

    var url = 'https://www.kwtsms.com/API/' + endpoint + '/';
    var postData = JSON.stringify(payload);

    var urlModule = require('url');
    var parsed = urlModule.parse(url);
    var options = {
        hostname: parsed.hostname,
        path: parsed.path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    var apiReq = https.request(options, function(apiRes) {
        var body = '';
        apiRes.on('data', function(chunk) { body += chunk; });
        apiRes.on('end', function() {
            try {
                res.json(JSON.parse(body));
            } catch (e) {
                res.json({ result: 'ERROR', error: 'Invalid API response' });
            }
        });
    });

    apiReq.on('error', function(err) {
        res.json({ result: 'ERROR', error: 'API request failed: ' + err.message });
    });

    apiReq.write(postData);
    apiReq.end();
});

expressApp.use('/app', express.static('app'));
expressApp.use('/app', serveIndex('app'));

expressApp.get('/', function(req, res) {
    res.redirect('/app');
});

var options = {
    key: fs.readFileSync('./key.pem'),
    cert: fs.readFileSync('./cert.pem')
};

https.createServer(options, expressApp).listen(port, function() {
    console.log(chalk.green('Zet running at https://127.0.0.1:' + port));
    console.log(chalk.bold.cyan('Note: Please enable the host (https://127.0.0.1:' + port + ') in a new tab and authorize the connection by clicking Advanced->Proceed to 127.0.0.1 (unsafe).'));
}).on('error', function(err) {
    if (err.code === 'EADDRINUSE') {
        console.log(chalk.bold.red(port + ' port is already in use'));
    }
});
