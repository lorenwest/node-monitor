/*******************************************************************************
* server.js - Server for handling incoming monitor requests
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var config = deps.monitorConfig.service;
var connect = require('connect');
var socketIO = require('socket.io');
var jsonrpc = require('./public/json-rpc');

// Create a monitor for all modules in the monitor-service
var monitor = require('monitor')('monitor-service', config.monitor);
deps.serverMonitor = monitor;
var server = null;

/*******************************************************************************
* start - Start the monitor service
********************************************************************************
* Input:
*   appName - Name of the running application
*   workgroup - (optional) The workgroup responsible for the application
*/
module.exports.start = function(appName, workgroup) {

  // TODO: Fetch ip address and dns name from the 3.0 'sys' module
  var ipAddress, dnsName;

  // Build a monitorApp object for this application
  var monitorApp = {appName: appName, serverPort: config.port};
  if (workgroup) monitorApp.workgroup = workgroup;
  if (ipAddress) monitorApp.ipAddress = ipAddress;
  if (dnsName) monitorApp.dnsName = dnsName;
  
  // Make the monitor application object available to others
  module.exports.monitorApp = monitorApp;

  // Create a middleware stack and routes for baseline REST services
  server = connect.createServer();
  server.use("/public", connect.staticProvider({ root: __dirname + "/public"}));
  server.use("/", require('./server/index'));

  // Create a socketIO socket, listening on the server
  var socket = socketIO.listen(server);

  // Start up the server
  server.listen(config.port);
  monitor.event('Monitor service started on port: ' + config.port);
  
  // Attach the socketIO JSON-RPC service
  var rpc = new jsonrpc(socket, monitor);

  // Bind all listeners

}; // start()

/*******************************************************************************
* stop - Stop the monitor service
********************************************************************************
*/
module.exports.stop = function() {

  // Stop the server from accepting connections on the port
  if(server) server.close();

};
