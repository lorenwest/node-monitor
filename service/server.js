/*******************************************************************************
* server.js - Server for handling incoming monitor requests
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var config = deps.monitorConfig.service;
var connect = require('connect');
deps.connect = connect;

// Create a monitor for all modules in the monitor-service
var monitor = require('monitor')('monitor-service', config.monitor);
deps.serverMonitor = monitor;

// Create a middleware stack and setup routes
var server = connect.createServer();
server.use("/public", connect.staticProvider({ root: __dirname + "/public"}));
server.use("/ping", require('./ping'));
server.use("/", require('./index'));

// Boot the server
server.listen(config.port);
monitor.event('Monitor service started on port: ' + config.port);
