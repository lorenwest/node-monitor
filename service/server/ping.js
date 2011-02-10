/*******************************************************************************
* ping.js - Remote ping request
********************************************************************************
*/

// Dependencies
var deps = require('../../deps');
var _ = deps._;
var config = deps.monitorConfig.remote;
var monitor = deps.serverMonitor;

/*****************************************************************************
* ping()
******************************************************************************
* Service a ping request.
* 
* Input:
* Output:
*   ping: 'pong' - Something to test for
*/
module.exports = ping = function ping(request, response) {

  // Initialize
  var startTime = new Date();
  
  // Forward to the api
  ping.api(function(err, pong) {

    // Return the response
    response.writeHead(200, { 'Content-Type': 'application/json' });
    var ret = {ping:"pong"};
    response.end(_.outStr(ret), 'utf-8');
  
    // Record the call
    monitor.event("ping time, ms", startTime);
    return;
  });
};

/*****************************************************************************
* ping.api()
******************************************************************************
* The internal API for servicing the request.
* Input:
*   callback (err, pingObj)
*     err - Any error that happened during the ping
*     pingObj - The ping object containg the pong
*/
ping.api = function(callback) {

  // Forward the ping object
  var pingObj = {ping:"pong"};
  callback && callback(null, pingObj);
  return;

};
