/*******************************************************************************
* monitor-test.js - Test for the monitor class
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var monitorClass = require('../lib/monitor');
var monitor = new monitorClass('testModule', 'testMonitor');
var vows = deps.vows;
var assert = deps.assert;
var testStr = null;

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
    },
    'All mutator functions are exposed': function() {
      assert.isFunction(monitor.add);
      assert.isFunction(monitor.log);
      assert.isFunction(monitor.debug);
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
    'The add() function correctly adds': function() {
      monitor.add(20);
      assert.equal(monitor.getHits(), 1);
      assert.equal(monitor.getTotal(), 20);
    },
    'The add() function defaults to 1': function() {
      monitor.add();
      assert.equal(monitor.getHits(), 2);
      assert.equal(monitor.getTotal(), 21);
    },
    'The min() function works': function() {
      monitor.add(0);
      assert.equal(monitor.getMin(), 0);
    },
    'The max() function works': function() {
      monitor.add(30);
      assert.equal(monitor.getMax(), 30);
    },
    'The avg() function works': function() {
      assert.equal(monitor.getAvg(), 12.75);
    },
    'The enable() function works': function() {
      monitor.enable(false);
      monitor.add(100);
      assert.equal(monitor.getAvg(), 12.75);
      assert.equal(monitor.getHits(), 4);
      assert.equal(monitor.getTotal(), 51);
      monitor.enable(true);
    },
    'The log() function works': function() {
      monitor.log();
      assert.equal(monitor.getHits(), 5);
      assert.equal(monitor.getTotal(), 52);
    },
    'The debug() function works': function() {
      monitor.debug();
      assert.equal(monitor.getHits(), 6);
      assert.equal(monitor.getTotal(), 53);
    },
    'The reset() function works': function() {
      monitor.reset();
      assert.equal(monitor.getAvg(), 0);
      assert.equal(monitor.getHits(), 0);
      assert.equal(monitor.getTotal(), 0);
      assert.equal(monitor.getMin(), 0);
      assert.equal(monitor.getMax(), 0);
    },
    'The logging functionality works': function() {
      monitor.getConfig().logFn = function(message, logData) {
        // This logs a string into a module variable
        testStr = message + " " + logData.moreInfo;
      };
      var logMsg = "This is a test string";
      var logData = {moreInfo:"Log information"};
      monitor.add(10, logMsg, logData);
      assert.equal(testStr, logMsg + " " + logData.moreInfo);
    },
    'The logger can be disabled': function() {
      monitor.getConfig().logFn = null;
      testStr = "null";
      var logStr = "This is a test string";
      monitor.add(10,logStr);
      assert.equal(testStr, "null");
    }
   }
});
