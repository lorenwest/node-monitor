/*******************************************************************************
* node-monitor-test.js - Test for the node-monitor module
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var _ = deps._;
var config = {'default':{eventLogger:null, errorLogger:null}};
var nodeMonitor = require('../lib/node-monitor');
var moduleMonitor = nodeMonitor('monitor-test',config);
var vows = deps.vows;
var assert = deps.assert;

/*******************************************************************************
* NodeMonitorTest
********************************************************************************
*/
exports.NodeMonitorTest = vows.describe('Tests for the node-monitor module')
  .addBatch({
  'Library initialization': {
    'The node-monitor module is available': function() {
      assert.isFunction(nodeMonitor);
    },
    'API functions are available': function() {
      assert.isFunction(nodeMonitor.getAllMonitors);
    }
  }})
  .addBatch({
  'Module tests': {
    'The same named module-monitor is returned': function() {
      var moduleMonitor2 = nodeMonitor('monitor-test', config);
      assert.isTrue(moduleMonitor === moduleMonitor2);
    },
    'Differently named module-monitor classes are different': function() {
      var moduleMonitor2 = nodeMonitor('monitor-test1', config);
      assert.isTrue(moduleMonitor != moduleMonitor2);
    },
    'getAllMonitors() returns all monitors': function() {
      var allMonitors = nodeMonitor.getAllMonitors();
      assert.isObject(allMonitors);
      assert.isObject(allMonitors['monitor-test']);
      assert.isObject(allMonitors['monitor-test1']);
    }
   }
});
