/*******************************************************************************
* deps.js - Dependencies for node-monitor
********************************************************************************
*/

var deps = module.exports = {
  '_': require('underscore'),
  'config': require('config'),
  'vows': require('vows'),
  'sprintf': require('sprintf').sprintf,
  'log4js': require('log4js'), // This is here for Date.toFormattedString()
  'sys': require('sys'),
  'assert': require('assert')
};

// Node 0.3.0 has util vs. sys
try {
  deps.out = require('util');
} catch (e) {
  deps.out = require('sys');
}

// Default module configuration
deps.monitorConfig = deps.config('monitor', {

  // These are defaults for all monitors, and can be overridden
  // either globally or when creating an individual monitor
  defaults: {
    enabled: true,
    eventLogger: require('./logger/stdout-logger'),
    errorLogger: require('./logger/stderr-logger'),
    maxLogSize: 10240
  }
});
