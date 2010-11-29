/*******************************************************************************
* deps.js - Dependencies for node-monitor
********************************************************************************
*/

// Tested with these dependencies
// Make sure to keep these versions in sync with the package.json file
var deps = module.exports = {
  "config": require('config'),
  "log4js": require('log4js'),
  "vows": require('vows'),
  "sprintf": require('sprintf').sprintf,
  "sys": require('sys'),
  "assert": require('assert')
};

// Node 0.3.0 has util vs. sys
try {
  var out = require('util');
} catch (e) {
  out = require('sys');
}

// Default module configuration
deps.monitorConfig = deps.config('monitor', {

  // These are defaults for all monitors, and can be overridden
  // either globally or when creating an individual monitor
  enabled: true,
  eventLogger: out.log,
  errorLogger: out.debug,
  maxLogSize: 10240
});
