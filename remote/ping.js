/*******************************************************************************
* ping.js - Remote ping request
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var _ = deps._;
var config = deps.monitorConfig.remote;
var connect = deps.connect;
var monitor = deps.serverMonitor;

/*****************************************************************************
* ping()
******************************************************************************
* Service a ping request.
* 
* Input:
* Output:
*/
module.exports = function ping(request, response) {

  // Initialize
  var startTime = new Date();
  
  // Set the response
  response.writeHead(200, { 'Content-Type': 'application/json' });
  var ret = {ping:"pong"};
  response.end(_.outStr(ret));
  
  // Record the call
  monitor.event("ping time, ms", startTime);
};
