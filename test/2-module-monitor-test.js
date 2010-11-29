/*******************************************************************************
* module-monitor-test.js - Test for the module-monitor class
********************************************************************************
*/

// Dependencies
var config = {'default':{eventLogger:null, errorLogger:null}};
var modMonitorClass = require('../lib/module-monitor');
var monitor = new modMonitorClass('monitor-test',config);
var deps = require('../deps');
var vows = deps.vows;
var assert = deps.assert;

/*******************************************************************************
* NodeMonitorTest
********************************************************************************
*/
exports.NodeMonitorTest = vows.describe('Tests for the module-monitor class')
  .addBatch({
  'Library initialization': {
    'The module-monitor class is available': function() {
      assert.isObject(monitor);
    },
    'API functions are available': function() {
      assert.isFunction(monitor.event);
      assert.isFunction(monitor.error);
      assert.isFunction(monitor.get);
      assert.isFunction(monitor.getMonitors);
    }
  }})
  .addBatch({
  'Module tests': {
    'The get() method returns a monitor instance': function() {
      var m1 = monitor.get('monitor_name');
      assert.isObject(m1);
    },
    'The retrieved monitor is an instance of the monitor class': function() {
      var m1 = monitor.get('module_name');
      assert.isFunction(m1.logEvent);
      assert.isFunction(m1.logError);
      assert.isFunction(m1.reset);
      assert.isFunction(m1.enable);
    },
    'The same named monitor is retrieved': function() {
      var m1 = monitor.get('monitor1');
      var m2 = monitor.get('monitor1');
      assert.isTrue(m1 == m2);
      m1.logEvent(27);
      assert.equal(m2.getTotal(), 27);
    },
    'Differently named monitors are different': function() {
      var m1 = monitor.get('monitor1');
      var m2 = monitor.get('monitor2');
      assert.isTrue(m1 != m2);
      m1.logEvent(27);
      assert.equal(m2.getTotal(), 0);
    },
    'The event() method is run on the right monitor': function() {
      monitor.event('TestMonitor1', 40);
      monitor.event('DiskFree, mb', 394827908);
      assert.equal(monitor.get('TestMonitor1').getTotal(), 40);
      assert.equal(monitor.get('DiskFree, mb').getTotal(), 394827908);
    },
    'The error() method is correctly recorded': function() {
      monitor.error('TestError',{err:"some error"});
      assert.equal(monitor.get('TestError').getHits(), 1);
      assert.equal(monitor.get('TestError').getTotal(), 1);
    },
    'getMonitors() returns the list of monitors': function() {
      var monitors = monitor.getMonitors();
      assert.isObject(monitors);
      assert.isObject(monitors['TestMonitor1']);
      assert.isObject(monitors['DiskFree, mb']);
      assert.isObject(monitors['TestError']);
    },
    ': The error() method calls the callback': {
      topic: function() {
        // Make the log object null so there's no error in this.callback
        monitor.error('TestDebug', null, this.callback);
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
