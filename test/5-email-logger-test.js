/*******************************************************************************
* email-logger-test.js - Test for the email logger
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var _ = deps._;
var config = {'default':{eventLogger:null, errorLogger:null}};
var Monitor = require('../lib/monitor');
var nodeMonitor = require('../lib/node-monitor');
var moduleMonitor = nodeMonitor('monitor-test',config);
var loggerModule = require('../logger/email-logger');
var vows = deps.vows;
var assert = deps.assert;
var fs = require('fs');

/*******************************************************************************
* EmailLoggerTest
********************************************************************************
*/
exports.EmailLoggerTest = vows.describe('Tests for the Email logger')
  .addBatch({
  'Library initialization': {
    'The logger module is available': function() {
      assert.isFunction(loggerModule);
    },
    'A new logger can be configured': function() {
      var newLogger = loggerModule({to:'abc@example.com'});
      assert.isFunction(newLogger);
    },
    'Individual loggers can be configured': function() {
      var logger1 = loggerModule({to:'abc@example.com'});
      var logger2 = loggerModule({to:'xyz@example.com'});
      assert.isFunction(logger1);
      assert.isFunction(logger2);
      assert.isTrue(logger1 != logger2);
    }
  }})
  .addBatch({
  'Logger tests': {
    topic: function() {
        // Send a message to stdout, and to a file.
        var logger1 = loggerModule({to:'abc@example.com', mailcmd:'echo'},
    	  this.callback);
        logger1('Hello World', 10, {value:20}, new Monitor('TestMonitor','TestModule'));
      },
      'The callback was fired': function() {
        assert.isTrue(true);
      },
      'And the stdout is available to the callback': function(err, stdout, stderr) {
        assert.isString(stdout);
      },
      'And the correct OS command was run': function(err, stdout, stderr) {
        assert.equal(stdout, "-s TestMonitor abc@example.com\n");
      }
    }
  });
