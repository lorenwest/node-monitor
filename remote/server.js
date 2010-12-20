/*******************************************************************************
* server.js - Server for handling incoming monitor requests
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var config = deps.monitorConfig.remote;
var connect = require('connect');
var monitor = require('monitor')('monitor-remote', config.monitor);
deps.serverMonitor = monitor;

// Create a middleware stack
var server = connect.createServer();

server.use("/ping", require('./ping'));

// Boot the server
server.listen(config.port);
monitor.event('Monitor-remote started on port: ' + config.port);
