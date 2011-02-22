/*******************************************************************************
* file-logger-test.js - Test for the file logger
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var _ = deps._;
var config = {'default':{eventLogger:null, errorLogger:null}};
var Monitor = require('../lib/monitor');
var nodeMonitor = require('../lib/node-monitor');
var moduleMonitor = nodeMonitor('monitor-test',config);
var loggerModule = require('../logger/file-logger');
var vows = deps.vows;
var assert = deps.assert;
var fs = require('fs');

var tmpfile1 = '/tmp/file_' + Math.floor(Math.random() * 10000) + '.log';
var tmpfile2 = '/tmp/file_' + Math.floor(Math.random() * 10000) + '.log';

/*******************************************************************************
* FileLoggerTest
********************************************************************************
*/
exports.FileLoggerTest = vows.describe('Tests for the file logger')
  .addBatch({
  'Library initialization': {
    'The logger module is available': function() {
      assert.isFunction(loggerModule);
    },
    'A new logger can be configured': function() {
      var newLogger = loggerModule(tmpfile1);
      assert.isFunction(newLogger);
    },
    'Individual loggers can be configured': function() {
      var logger1 = loggerModule(tmpfile1);
      var logger2 = loggerModule(tmpfile2);
      assert.isFunction(logger1);
      assert.isFunction(logger2);
      assert.isTrue(logger1 != logger2);
    }
  }})
  .addBatch({
  'Logger tests': {
    topic: function() {
        // Send a message to stdout, and to a file.
        var logger1 = loggerModule(tmpfile1, this.callback);
        logger1('Hello World', 10, {value:20}, new Monitor('TestMonitor','TestModule'));
      },
      'The callback was fired': function() {
        assert.isTrue(true);
      },
      'And the correct number of bytes is written to the file': function(err, written) {
        assert.equal(written, 12);
      },
      'And the correct contents were written to the file': function(err, written) {
        var contents = fs.readFileSync(tmpfile1);
        assert.equal(contents, "Hello World\n");
      }
    }
  })
  .addBatch({
  'File logger cleanup': {
    'Temp files cleaned up': function() {
      fs.unlinkSync(tmpfile1);
      fs.unlinkSync(tmpfile2);
      assert.isTrue(true);
    }
  }});
