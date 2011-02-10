/*******************************************************************************
* module.js - API to the modules within the application
********************************************************************************
*/

// Dependencies
var deps = require('../../deps');
var _ = deps._;
var config = deps.monitorConfig.remote;
var monitor = deps.serverMonitor;
var connect = require('connect');

// Create the server and routes
var app = module.exports = connect.createServer();
app.use('/list', list);

/*****************************************************************************
* list()
******************************************************************************
* Lists all known modules, including configurations and monitors.
* 
* Input: None
* Output (JSON):
* {
*   modules: {
*     'app-server': {
*       'config': { },
*       'monitors': [list,of,monitor,names]
*     },
*     ...
*   },
*   status: {code:200, message:"OK"}
* }
*     
*/
function list(req, rsp) {

  // Initialize
  var startTime = new Date();
  
  // Forward to the api
  app.listApi(function(err, listObj) {

    // Return the response
    response.writeHead(listObj.status.code, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(listObj), 'utf-8');
  
    // Record the call
    monitor.event("List time, ms", startTime);
    return;
  });
};

/*****************************************************************************
* listApi()
******************************************************************************
* Internal API for servicing the list request.
* Input: (nothing)
*   callback (err, monitors)
*     err - Any error that happened during the ping
*     listObj - (see list above for definition)
*/
app.listApi = function(callback) {

  // Build the list of modules
  var listObj = {};
  var modules = listObj.modules;
  var status = listObj.status = {code:200, message:"OK"};
  
  // Start with configurations
  var configs = deps.config();
  for (var module in configs) {
    listObj[module] = listObj[module] || {};
    listObj[module].config = configs[module];
  }

  // Add monitors
  var monitors = require('../lib/node-monitor').getAllMonitors();
  for (var module in monitors) {
    var returnMod = listObj[module] = listObj[module] || {};
    returnMod.monitors = [];
    for (var monitor in monitors[module].getMonitors()) {
      returnMod.monitors.push(monitor);
    }
  }
  
  // Return a sorted list of monitors
  callback(null, listObj);

};
