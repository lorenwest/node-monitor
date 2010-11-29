/*******************************************************************************
* os-cmd-logger-test.js - Test for the OS Command logger
********************************************************************************
*/

// Dependencies
var config = {'default':{eventLogger:null, errorLogger:null}};
var nodeMonitor = require('../lib/node-monitor');
var moduleMonitor = nodeMonitor('monitor-test',config);
var loggerModule = require('../logger/os-cmd-logger');
var deps = require('../deps');
var vows = deps.vows;
var assert = deps.assert;
var fs = require('fs');
var tmpfile = "/tmp/os-cmd-test.txt";

/*******************************************************************************
* OSCmdLoggerTest
********************************************************************************
*/
exports.OSCmdLoggerTest = vows.describe('Tests for the OS Command logger')
  .addBatch({
  'Library initialization': {
    'The logger module is available': function() {
      assert.isFunction(loggerModule);
    },
    'A new logger can be configured': function() {
      var newLogger = loggerModule('echo hello');
      assert.isFunction(newLogger);
    },
    'Individual loggers can be configured': function() {
      var logger1 = loggerModule('echo "Hello"');
      var logger2 = loggerModule('echo "World"');
      assert.isFunction(logger1);
      assert.isFunction(logger2);
      assert.isTrue(logger1 != logger2);
    }
  }})
  .addBatch({
  'Logger tests': {
    topic: function() {
        // Send a message to stdout, and to a file.
        var logger1 = loggerModule('echo "{{monitor(2)}}" "{{message}}" | tee ' 
    	  + tmpfile, this.callback);
        logger1('Hello World', 10, {value:10}, function(a){return a / 2;});
      },
      'The callback was fired': function() {
        assert.isTrue(true);
      },
      'And the correct OS command was run': function() {
        var file = fs.readFileSync(tmpfile);
        assert.equal(file, "1 Hello World\n");
        fs.unlinkSync(tmpfile);
      },
      'And the stdout is available to the callback': function(err, stdout, stderr) {
        assert.equal(stdout, "1 Hello World\n");
      }
    }
  });
