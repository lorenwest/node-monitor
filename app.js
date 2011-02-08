/*******************************************************************************
* app.js - Bootstrap for testing
********************************************************************************
*/

// Start the monitor service
try {
  var os = require('os');
}
catch (e){
}
require('monitor/service').start("Node-monitor web application");

