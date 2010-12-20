/*******************************************************************************
* app.js - Bootstrap for the node-monitor web application
********************************************************************************
*/

// Dependencies
var deps = require('./deps');
var config = deps.monitorConfig.webapp;
var monitor = require('monitor')('monitor-webapp', config.monitor);
var connect = require('connect');

// Start up remote monitoring for this process
require('monitor/remote');

// Create a middleware stack
var server = connect.createServer();
server.use("/", require('monitor/webapp'));
server.use("/a", require('./webapp/app.js'));

// Boot the server
server.listen(config.port);
monitor.event('Monitor-webapp started on port: ' + config.port);
