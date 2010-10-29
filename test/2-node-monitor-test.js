/*******************************************************************************
* node-monitor-test.js - Test for the node-monitor module
********************************************************************************
*/

// Dependencies
var monitorClass = require('../lib/node-monitor');
var monitor = monitorClass('monitor-test');
var deps = require('../deps');
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
      assert.isFunction(monitorClass);
      assert.isObject(monitor);
    },
    'API functions are available': function() {
      assert.isFunction(monitor.get);
      assert.isFunction(monitor.add);
      assert.isFunction(monitor.log);
      assert.isFunction(monitor.debug);
      assert.isFunction(monitor.getMonitors);
      assert.isFunction(monitor.getAllMonitors);
    }
  }})
  .addBatch({
  'Module tests': {
    'The same named module-monitor is returned': function() {
      var monitor2 = require('../lib/node-monitor')('monitor-test');
      assert.isTrue(monitor === monitor2);
    },
    'Differently named module-monitor classes are different': function() {
      var monitor2 = require('../lib/node-monitor')('monitor-test1');
      assert.isTrue(monitor != monitor2);
    },
    'The module-monitor can get a monitor instance': function() {
      var m1 = monitor.get('monitor_name');
      assert.isObject(m1);
    },
    'The retrieved monitor is an instance of the monitor class': function() {
      var m1 = monitor.get('module_name');
      assert.isFunction(m1.add);
      assert.isFunction(m1.reset);
      assert.isFunction(m1.enable);
    },
    'The same named monitor is retrieved': function() {
      var m1 = monitor.get('monitor1');
      var m2 = monitor.get('monitor1');
      assert.isTrue(m1 == m2);
      m1.add(27);
      assert.equal(m2.getTotal(), 27);
    },
    'Differently named monitors are different': function() {
      var m1 = monitor.get('monitor1');
      var m2 = monitor.get('monitor2');
      assert.isTrue(m1 != m2);
      m1.add(27);
      assert.equal(m2.getTotal(), 0);
    },
    'The add() method is run on the right monitor': function() {
      monitor.add('TestMonitor1', 40);
      monitor.add('DiskFree, mb', 394827908);
      assert.equal(monitor.get('TestMonitor1').getTotal(), 40);
      assert.equal(monitor.get('DiskFree, mb').getTotal(), 394827908);
    },
    'The log() method is correctly forwarded': function() {
      monitor.log('TestLog');
      assert.equal(monitor.get('TestLog').getHits(), 1);
      assert.equal(monitor.get('TestLog').getTotal(), 1);
    },
    'getMonitors() returns the list of monitors': function() {
      var monitors = monitor.getMonitors();
      assert.isObject(monitors);
      assert.isObject(monitors['TestMonitor1']);
      assert.isObject(monitors['DiskFree, mb']);
      assert.isObject(monitors['TestLog']);
    },
    'getAllMonitors() returns all monitors': function() {
      var allMonitors = monitor.getAllMonitors();
      assert.isObject(allMonitors);
      assert.isObject(allMonitors['monitor-test']);
      assert.isObject(allMonitors['monitor-test1']);
    },
    ': The debug() method calls the callback': {
      topic: function() {
        // Make the log object null so there's no error in this.callback
        monitor.debug('TestDebug', null, this.callback);
      },
      'The debug callback was fired': function() {
        assert.isTrue(true);
      },
      'And the debug event was recorded': function() {
        assert.equal(monitor.get('TestDebug').getHits(), 1);
      }
     }
   }
});
