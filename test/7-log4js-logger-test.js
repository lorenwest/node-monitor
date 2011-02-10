/*******************************************************************************
* log4js-logger-test.js - Test for the log4js logger
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var _ = deps._;
var config = {'default':{eventLogger:null, errorLogger:null}};
var Monitor = require('../lib/monitor');
var nodeMonitor = require('../lib/node-monitor');
var moduleMonitor = nodeMonitor('monitor-test',config);
var loggerModule = require('../logger/log4js-logger');

var vows = deps.vows;
var assert = deps.assert;
var fs = require('fs');

// Define a couple log4js loggers
var log4js = deps.log4js();
var tmpfile1 = '/tmp/file.' + Math.floor(Math.random() * 10000) + '.log';
var tmpfile2 = '/tmp/file.' + Math.floor(Math.random() * 10000) + '.log';
log4js.addAppender(log4js.fileAppender(tmpfile1), 'logger1');
log4js.addAppender(log4js.fileAppender(tmpfile2), 'logger2');
var log4jsLogger1 = log4js.getLogger('logger1');
var log4jsLogger2 = log4js.getLogger('logger2');

/*******************************************************************************
* Log4jsLoggerTest
********************************************************************************
*/
exports.Log4jsLoggerTest = vows.describe('Tests for the log4js logger')
  .addBatch({
  'Library initialization': {
    'The logger module is available': function() {
      assert.isFunction(loggerModule);
    },
    'A new logger can be configured': function() {
      var newLogger = loggerModule(log4jsLogger1);
      assert.isFunction(newLogger);
    },
    'Individual loggers can be configured': function() {
      var logger1 = loggerModule(log4jsLogger1);
      var logger2 = loggerModule(log4jsLogger2);
      assert.isFunction(logger1);
      assert.isFunction(logger2);
      assert.isTrue(logger1 != logger2);
    }
  }})
  .addBatch({
  'Logger tests': {
    topic: function() {
        // No callbacks, so we'll log a message and wait a while
        var logger1 = loggerModule(log4jsLogger1);
        var monitor = new Monitor('TestMonitor','TestModule',{errorLogger:logger1});
        monitor.logError({errorText:"Test error"});
        setTimeout(this.callback,100);
      },
      'The callback was fired': function() {
        assert.isTrue(true);
      },
      'And the correct contents were written to the file': function() {
        var contents = fs.readFileSync(tmpfile1, "utf-8");
        assert.isTrue(contents.indexOf("Test error") > 0);
      },
      'Cleanup': function() {
        fs.unlinkSync(tmpfile1);
        fs.unlinkSync(tmpfile2);
        assert.isTrue(true);
      }
    }
  });
