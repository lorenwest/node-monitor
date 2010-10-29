/*******************************************************************************
* deps.js - Dependencies for node-monitor
********************************************************************************
*/

// Tested with these dependencies
// Make sure to keep these versions in sync with the package.json file
var deps = module.exports = {
  "config": require('config'),
  "vows": require('vows'),
  "sys": require('sys'),
  "assert": require('assert')
};

// Default module configuration
module.exports.monitorConfig = deps.config('monitor', {

  // These are defaults for all monitors, and can be overridden
  // either globally or when creating an individual monitor
  enabled: true,
  logFn: function(message, logData) {
	var ts = new Date(logData.timestamp).toString();
	var modName = logData.monitor.getModuleName();
	var monName = logData.monitor.getName();
	var msg = ts + " - " + modName + '.' + monName + ': ' + message;
	deps.sys.debug(msg);
  },
  maxLogSize: 10240
});
