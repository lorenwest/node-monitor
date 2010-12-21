/*******************************************************************************
* server.js - Server middleware for the webapp
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var config = deps.monitorConfig.webapp;
var monitor = require('monitor')('monitor-webapp', config.monitor);
var express = require('express');

// Create the middleware
var server = module.exports = express.createServer();
// server.use('/')
// monitor.event('Monitor webapp bootstrap');
