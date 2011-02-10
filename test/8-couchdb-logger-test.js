/*******************************************************************************
* couchdb-logger-test.js - Test for the couchdb logger
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var _ = deps._;
var config = {'default':{eventLogger:null, errorLogger:null}};
var Monitor = require('../lib/monitor');
var nodeMonitor = require('../lib/node-monitor');
var moduleMonitor = nodeMonitor('monitor-test',config);
var loggerModule = require('../logger/couchdb-logger');
var vows = deps.vows;
var assert = deps.assert;
var fs = require('fs');

// To test this with a real database:
// 1 - Get couchdb running on localhost:5984
// 2 - Create a 'testdb' database
// 3 - Change isMock (below) to false
var isMock = true;

/*******************************************************************************
* CouchdbLoggerTest
********************************************************************************
*/
exports.CouchdbLoggerTest = vows.describe('Tests for the Couchdb logger')
  .addBatch({
  'Library initialization': {
    'The logger module is available': function() {
      assert.isFunction(loggerModule);
    },
    'A new logger can be configured': function() {
      var newLogger = loggerModule({dbName:'testdb', mock:isMock});
      assert.isFunction(newLogger);
    },
    'Individual loggers can be configured': function() {
      var logger1 = loggerModule({dbName:'testdb', mock:isMock});
      var logger2 = loggerModule({dbName:'testdb2', mock:isMock});
      assert.isFunction(logger1);
      assert.isFunction(logger2);
      assert.isTrue(logger1 != logger2);
    }
  }})
  .addBatch({
  'Logger tests': {
    topic: function() {
        // Send a message to the database
        var logger1 = loggerModule({dbName:'testdb', mock:isMock}, this.callback);
        var monitor = new Monitor('TestMonitor','TestModule',{errorLogger:logger1});
        monitor.logError({errorText:"Test error"});
      },
      'The callback was fired after the DB insert': function() {
        assert.isTrue(true);
      },
      'The DB object is available to the callback': function(err, dbObj) {
        assert.isObject(dbObj);
      },
      'The ID and revision is returned after the DB insert': function(err, dbObj) {
        assert.isString(dbObj._id);
        assert.isString(dbObj._rev);
      },
      'The DB object is well formed': function(err, dbObj) {
        assert.equal(dbObj._id.indexOf("TestModule-TestMonitor-12"), 0);
        assert.equal(dbObj.moduleName, "TestModule");
        assert.equal(dbObj.monitorName, "TestMonitor");
        assert.isString(dbObj.date);
        assert.isNumber(dbObj.timestamp);
        assert.isTrue(dbObj.isError);
        assert.equal(dbObj.error.errorText, "Test error");
      }
    }
  });
