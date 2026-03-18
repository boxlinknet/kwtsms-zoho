var express = require('express');
var path = require('path');

module.exports = function(app) {
    app.use('/app', express.static(path.join(__dirname, '..', 'app')));
};
