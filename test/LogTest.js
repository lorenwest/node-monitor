// LogTest.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // This should be run before other tests to set up configurations
  process.env.NODE_ENV='test';
  var config = require('config');

  // Dependencies
  var Monitor = require('../lib/index'),
      Log = Monitor.Log,
      log = Monitor.getLogger('log-test'),
      Backbone = Monitor.Backbone;

  /**
  * Unit tests for the <a href="Log.html">Log</a> class.
  * @class LogTest
  */

  /**
  * Test group for baseline Log functionality
  *
  * @method Log
  */
  module.exports['Log'] = {

    setUp: function(callback) {callback();},
    tearDown: function(callback) {callback();},

    /**
    * Tests that Log class is in place
    * @method Log-Classes
    */
    Classes: function(test) {
      test.ok(Log.prototype, 'The Log model is in place');
      test.done();
    },

    /**
    * Tests that registering for '*' emits all logs
    * @method Log-AllLogs
    */
    AllLogs: function(test) {

      // Listen for all logs
      Log.once('*', function(log, module, name) {
        test.equals(log, 'info', 'The log type is correct');
        test.equals(module, 'log-test', 'found the log-test module when listening to *');
        test.equals(name, 'All logs test', 'found the correct log name *');
        test.done();
      });
      log.info('All logs test', 34);
    },

    /**
    * Tests for the inclusion of multiple arguments in logs
    * @method Log-MultiArg
    */
    MultiArg: function(test) {

      // Listen for all logs
      Log.once('*', function(log, module, name, hello, number, obj) {
        test.equals(log, 'error', 'The log type is correct');
        test.equals(name, 'MultiArg', 'found the correct log name *');
        test.equals(hello, 'hello', 'hello arg is found');
        test.equals(number, 34, 'Numeric argument is found');
        test.ok(obj, 'Object argument is found');
        test.equals(obj.there, 'world', 'Object elements are intact');
        test.equals(obj.num, 9273, 'Object elements are intact');
        test.done();
      });
      log.error('MultiArg', 'hello', 34, {there:'world', num: 9273});
    },

    /**
    * Tests for the trace log
    * @method Log-trace
    */
    TraceLog: function(test) {

      // Listen for trace logs
      Log.once('trace.*', function(log, module, name) {
        test.equals(log, 'trace', 'The log type is correct');
        test.equals(module, 'log-test', 'found the correct module name');
        test.equals(name, 'traceLog', 'found the correct log name');
        test.done();
      });
      log.trace('traceLog');
    },

    /**
    * Tests for the debug log
    * @method Log-debug
    */
    DebugLog: function(test) {

      // Listen for debug logs
      Log.once('*.*.debugLog', function(log, module, name) {
        test.equals(log, 'debug', 'The log type is correct');
        test.equals(module, 'log-test', 'found the correct module name');
        test.equals(name, 'debugLog', 'found the correct log name');
        test.done();
      });
      log.debug('debugLog');
    },

    /**
    * Tests for the info log
    * @method Log-info
    */
    InfoLog: function(test) {

      // Listen for info logs
      Log.once('*.log-test.infoLog', function(log, module, name) {
        test.equals(log, 'info', 'The log type is correct');
        test.equals(module, 'log-test', 'found the correct module name');
        test.equals(name, 'infoLog', 'found the correct log name');
        test.done();
      });
      log.info('infoLog');
    },

    /**
    * Tests for the warn log
    * @method Log-warn
    */
    WarnLog: function(test) {

      // Listen for warn logs
      Log.once('*.log-test.*', function(log, module, name) {
        test.equals(log, 'warn', 'The log type is correct');
        test.equals(module, 'log-test', 'found the correct module name');
        test.equals(name, 'warnLog', 'found the correct log name');
        test.done();
      });
      log.warn('warnLog');
    },

    /**
    * Tests for the error log
    * @method Log-error
    */
    ErrorLog: function(test) {

      // Listen for error logs
      Log.once('error.log-test.errorLog', function(log, module, name) {
        test.equals(log, 'error', 'The log type is correct');
        test.equals(module, 'log-test', 'found the correct module name');
        test.equals(name, 'errorLog', 'found the correct log name');
        test.done();
      });
      log.error('errorLog');
    },

    /**
    * Tests for the fatal log
    * @method Log-fatal
    */
    FatalLog: function(test) {

      // Listen for fatal logs
      Log.once('{error,fatal}.*.fatal[Ll]og', function(log, module, name) {
        test.equals(log, 'fatal', 'The log type is correct');
        test.equals(module, 'log-test', 'found the correct module name');
        test.equals(name, 'fatalLog', 'found the correct log name');
        test.done();
      });
      log.fatal('fatalLog');
    },

    /**
    * Make sure a stat is output for every log
    * @method Log-Stat
    */
    Stat: function(test) {

      // Listen for the stat
      Monitor.Stat.once('*', function(module, name, value, type) {
        test.equals(module, 'Log', 'The stat module is correct');
        test.equals(name, 'info.log-test.Checking for stat emission', 'found the correct stat name');
        test.equals(value, 1, 'Correctly incremented the log stat by 1');
        test.equals(type, 'c', 'Correct stat type - counter');
        test.done();
      });
      log.info('Checking for stat emission');
    },

    /**
    * Tests the Log probe
    * @method Log-ProbeTest
    */
    ProbeTest: function(test) {
      var logMonitor = new Monitor({probeClass:'Log', initParams:{interval:10, pattern:'*.log-test.*'}});
      logMonitor.connect(function(error) {
        test.ok(!error, 'Log monitor error: ' + JSON.stringify(error));
        logMonitor.on('change', function() {
          var bundle = logMonitor.get('bundle');

          // Omit the initial state of the monitor
          if (bundle.length === 0) {
            return;
          }

          test.ok(bundle, 'The log bundle is available');
          test.equals(bundle.length, 1, 'There is a single log in the bundle');
          var logArgs = bundle[0];
          test.equals(logArgs.length, 5, 'There are 5 log arguments');
          test.ok(Date.now() - (new Date(logArgs[0]).getTime()) < 1000, 'The first arg is a timestamp');
          test.equals(logArgs[1], 'info', 'There log type is correct');
          test.equals(logArgs[2], 'log-test', 'Ther module is correct');
          test.equals(logArgs[3], 'probeTest', 'There log name is correct');
          test.equals(logArgs[4], 22, 'The value is correct');
          logMonitor.off('change');
          test.done();
        });
        log.info('probeTest', 22);
      });
    },

    /**
    * Tests the probe streams multiple items at once
    * @method Log-ProbeStream
    */
    ProbeStream: function(test) {

      // This relies on the fact that the monitor was created in the prior
      // function, and it just emitted a single item.
      var logMonitor = new Monitor({probeClass:'Log', initParams:{interval:10, pattern:'*.log-test.*'}});
      logMonitor.connect(function(error) {
        test.ok(!error, 'Log monitor error: ' + JSON.stringify(error));
        logMonitor.on('change', function() {
          var bundle = logMonitor.get('bundle');

          // Omit the current state of the probe (first change event)
          if (bundle.length < 4) {
            return;
          }

          test.ok(bundle, 'The log bundle is available');
          test.equals(bundle.length, 4, 'There were the correct number of items in the stream');
          var logArgs = bundle[2];
          test.equals(logArgs.length, 7, 'There are 7 log arguments');
          test.ok(Date.now() - (new Date(logArgs[0]).getTime()) < 1000, 'The first arg is a timestamp');
          test.equals(logArgs[1], 'error', 'The log name is correct');
          test.equals(logArgs[2], 'log-test', 'The module is correct');
          test.equals(logArgs[3], 'probeTest3', 'The log name is correct');
          test.equals(logArgs[4], 420, 'The value is correct');
          test.equals(logArgs[5], 'hello', 'The next arg is correct');
          test.equals(logArgs[6].a, 'world', 'Objects are correctly represented');
          logMonitor.off('change');
          test.done();
        });
        log.info('probeTest1');
        log.warn('probeTest2');
        log.error('probeTest3', 420, "hello", {a:"world"});
        log.fatal('probeTest4', 2840);
      });
    }

  };

}(this));
