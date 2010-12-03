/*******************************************************************************
* monitor-test.js - Test for the monitor class
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var _ = deps._;
var monitorClass = require('../lib/monitor');
var monitor = new monitorClass('testMonitor', 'testModule', 
  {eventLogger:null, errorLogger:null});
var vows = deps.vows;
var assert = deps.assert;
var testStr = null;
var logger1 = require('../logger/os-cmd-logger')('echo {{message}}');
var logger2 = require('../logger/os-cmd-logger')('echo {{value}}');
var logger1_id = null;
var logger2_id = null;

/*******************************************************************************
* MonitorTest
********************************************************************************
*/
exports.MonitorTest = vows.describe('Tests for the monitor class').addBatch({
  'Library initialization': {
    'The monitor class is available': function() {
      assert.isObject(monitor);
    },
    'All accessor functions are exposed': function() {
      assert.isFunction(monitor.getHits);
      assert.isFunction(monitor.getTotal);
      assert.isFunction(monitor.getAvg);
      assert.isFunction(monitor.getMin);
      assert.isFunction(monitor.getMax);
      assert.isFunction(monitor.isEnabled);
      assert.isFunction(monitor.getName);
      assert.isFunction(monitor.getModuleName);
      assert.isFunction(monitor.getConfig);
      assert.isFunction(monitor.getLogger);
    },
    'All mutator functions are exposed': function() {
      assert.isFunction(monitor.addLogger);
      assert.isFunction(monitor.removeLogger);
      assert.isFunction(monitor.logEvent);
      assert.isFunction(monitor.logError);
      assert.isFunction(monitor.reset);
      assert.isFunction(monitor.enable);
    }
  }})
  .addBatch({
  'Module tests': {
    'Configuration hierarchy works': function() {
      var monConfig = {logFn:null};
      var modConfig = {logFn:function(){}, enabled:false};
      var mon = new monitorClass('testMon', 'testMod', monConfig, modConfig);
      assert.equal(mon.getConfig().enabled, false);
      assert.isNull(mon.getConfig().logFn);
    },
    'The logEvent() function correctly adds the event': function() {
      monitor.logEvent(20);
      assert.equal(monitor.getHits(), 1);
      assert.equal(monitor.getTotal(), 20);
    },
    'The logEvent() function defaults to 1': function() {
      monitor.logEvent();
      assert.equal(monitor.getHits(), 2);
      assert.equal(monitor.getTotal(), 21);
    },
    'The getMin() function works': function() {
      monitor.logEvent(0);
      assert.equal(monitor.getMin(), 0);
    },
    'The getMax() function works': function() {
      monitor.logEvent(30);
      assert.equal(monitor.getMax(), 30);
    },
    'The getAvg() function works': function() {
      assert.equal(monitor.getAvg(), 12.75);
    },
    'The getFirst() function works': function() {
      assert.equal(monitor.getFirst().value, 20);
    },
    'The getLast() function works': function() {
      assert.equal(monitor.getLast().value, 30);
    },
    'The enable() function works': function() {
      monitor.enable(false);
      monitor.logEvent(100);
      assert.equal(monitor.getAvg(), 12.75);
      assert.equal(monitor.getHits(), 4);
      assert.equal(monitor.getTotal(), 51);
      monitor.enable(true);
    },
    'The reset() function works': function() {
      monitor.reset();
      assert.equal(monitor.getAvg(), 0);
      assert.equal(monitor.getHits(), 0);
      assert.equal(monitor.getTotal(), 0);
      assert.equal(monitor.getMin(), 0);
      assert.equal(monitor.getMax(), 0);
    },
    'The logError() function correctly adds the error': function() {
      monitor.logError({err:'bad thing'});
      assert.equal(monitor.getHits(), 1);
      assert.equal(monitor.getTotal(), 1);
    },
    'Logging time spans works correctly': function() {
      var start = new Date(Date.now() - 100);
      monitor.logEvent(start);
      assert.equal(monitor.getHits(), 2);
      assert.isTrue(monitor.getTotal() > 100 && monitor.getTotal() < 200);
    },
    'The logging functionality works': function() {
      monitor.getConfig().eventLogger = function(message, value, data) {
        // This logs a string into a module variable
        testStr = data.moreInfo;
      };
      var logData = {moreInfo:"Log information"};
      monitor.logEvent(10, logData);
      assert.equal(testStr, logData.moreInfo);
    },
    'And you can specify an array of loggers': function() {
      testStr = null;
      monitor.getConfig().eventLogger = [
        function(message, value, data) {
          // Does nothing - just for testing multiple loggers
        },
        function(message, value, data) {
          // This logs a string into a module variable
          testStr = data.moreInfo;
        }];
      var logData = {moreInfo:"Log information"};
      monitor.logEvent(10, logData);
      assert.equal(testStr, logData.moreInfo);
    },
    'The loggers can be disabled': function() {
      testStr = null;
      monitor.getConfig().eventLogger = null;
      monitor.logEvent(10);
      assert.isNull(testStr);
    }
   }
  })
  .addBatch({
    'Adding additional loggers at runtime': {
      'The addLogger() function adds additional loggers': function() {
        logger1_id = monitor.addLogger(logger1);
        logger2_id = monitor.addLogger(logger2);
        assert.isNotNull(logger1_id);
        assert.isNotNull(logger2_id);
        assert.notEqual(logger1_id, logger2_id);
      },
      'The getLogger() function gets the correct logger': function() {
        assert.strictEqual(logger1, monitor.getLogger(logger1_id));
        assert.strictEqual(logger2, monitor.getLogger(logger2_id));
      },
      'The removeLogger() correctly removes loggers': function() {
        monitor.removeLogger(logger1_id);
        monitor.removeLogger(logger2_id);
        assert.isUndefined(monitor.getLogger(logger1_id));
        assert.isUndefined(monitor.getLogger(logger2_id));
      },
      topic: function() {
        var customLogger =
          require('../logger/os-cmd-logger')('echo "{{message}}"', this.callback);
        monitor.addLogger(customLogger);
    	monitor.logEvent(20,{customerId:"CustomerID"});
      },
      'A custom logger callback is called': function(err, stdout, stderr) {
        assert.isNotNull(stdout);
      },
      'And the custom logger performs as expected': function(err, stdout, stderr) {
        assert.isTrue(stdout.indexOf("CustomerID") > 0);
      }
    }
});
