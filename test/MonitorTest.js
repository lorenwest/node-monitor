// MonitorTest.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // This should be run before other tests to set up configurations
  process.env.NODE_ENV='test';
  var config = require('config');

  /**
  * Unit tests for the <a href="Monitor.html">Monitor</a> class.
  * @class MonitorTest
  */

  // Dependencies
  var Monitor = require('../lib/index'),
      Backbone = Monitor.Backbone,
      _ = Monitor._,
      testMonitorAttrs = {
        // Monitor attributes
        id: '24-2',
        name: 'Test monitor',
        probeName: 'NoName',
        probeClass: 'NoClass',
        initParams: {a:1},
        hostName: 'some-host.com',
        appName: 'test',
        appInstance: 2,
        probeId: Monitor.generateUniqueId(),
        writableAttributes: []
      },
      testProbeAttrs = {
        // Probe specific attributes
        probeAttr1: 'attr1 value',
        probeAttr2: 2,
        probeAttr3: {hello: 'world'}
      },
      testAllAttrs = _.extend({}, testMonitorAttrs, testProbeAttrs),
      testMonitor = new Monitor(testAllAttrs);

  /**
  * Tests for verifying modules are loaded and exposed properly
  *
  * @method ModuleLoad
  */
  module.exports.ModuleLoad = {

    setUp: function(callback) {callback();},
    tearDown: function(callback) {callback();},

    /**
    * Tests that externals dependencies are exposed
    * @method ModuleLoad-Externals
    */
    Externals: function(test) {
      test.notEqual(Monitor.Config, 'undefined', 'Config package is exported');
      test.notEqual(Monitor.Cron, 'undefined', 'Cron package is exported');
      test.notEqual(Monitor._, 'undefined', 'Underscore package is exported');
      test.notEqual(Monitor.Backbone, 'undefined', 'Backbone package is exported');
      test.done();
    },

    /**
    * Tests that Monitor is exposed and of the correct type
    * @method ModuleLoad-Monitor
    */
    Monitor: function(test) {
      test.ok(Monitor.prototype instanceof Backbone.Model, 'The Monitor data model is in place');
      test.ok(Monitor.List.prototype instanceof Backbone.Collection, 'The Monitor collection is in place');
      test.done();
    },

    /**
    * Tests that all Sub Modules are exposed and of the correct type
    * @method ModuleLoad-Submodules
    */
    Submodules: function(test) {
      test.ok(Monitor.Probe.prototype instanceof Backbone.Model, 'The Probe submodule is in place');
      test.ok(Monitor.Connection.prototype instanceof Backbone.Model, 'The Connection submodule is in place');
      test.ok(Monitor.Server.prototype instanceof Backbone.Model, 'The Server submodule is in place');
      test.ok(Monitor.Router.prototype instanceof Backbone.Model, 'The Router submodule is in place');
      test.done();
    }

  };

  /**
  * Tests for internal (protected) methods
  * @method Protected
  */
  module.exports['Protected'] = {

    /**
    * Test UUID generation
    * @method Protected-UUID
    */
    UUID: function(test) {
      // Generate a bunch and make sure they're unique
      var numToTest = 100, uuids = {};
      for (var i = 0; i < numToTest; i++) {
        var uuid = Monitor.generateUniqueId();
        test.ok(uuid, "A uuid was generated");
        test.ok(uuid.length === 36, "It has the correct V.4 length");
        test.ok(!uuids[uuid], "It is unique within the test UUIDs");
        uuids[uuid] = '';
      }
      test.done();
    },

    /**
    * Tests that the Router is available
    * @method Protected-Router
    */
    Router: function(test) {
      test.ok(Monitor.getRouter() instanceof Monitor.Router, "The default router is available");
      test.done();
    }

  };

  /**
  * Tests for writable attributes
  * @method Writable
  */
  module.exports['Writable'] = {

    /**
    * Tests that a probe with known writable attributes can be written
    * @method CanWrite
    */
    CanWrite: function(test) {
      // Create a global test variable to set via the inspector probe
      global.testVar = 'initialValue';
      var inspector = new Monitor({probeName: 'gertrude', probeClass:'Inspect', initParams:{key:'testVar'}});
      inspector.connect(function(error) {
        test.equal(error, null, 'No errors on Inspect probe connect');
        test.equal(inspector.get('value'), 'initialValue', 'Inspector connected to the test variable');
        inspector.set('value', 'newValue');
        setTimeout(function(){
          test.equal(global.testVar, 'newValue', 'You can set the probe value using monitor.set()');
          inspector.disconnect(function(){
            test.done();
          });
        },0);
      });
    },

    /**
    * Tests that calling set_control directly gets the error results
    *
    * @method SetControl
    */
    SetControl: function(test) {
      // Create a global test variable to set via the inspector probe
      global.testVar = 'initialValue';
      var inspector = new Monitor({probeName: 'alfred', probeClass:'Inspect', initParams:{key:'testVar'}});
      inspector.connect(function(error) {
        test.equal(error, null, 'No errors on Inspect probe connect');
        test.equal(inspector.get('value'), 'initialValue', 'Inspector connected to the test variable');
        inspector.control('set', {value: 'newValue'}, function(error) {
          test.equal(global.testVar, 'newValue', 'You can set the probe value using monitor.set()');
          inspector.disconnect(function(){
            test.done();
          });
        });
      });
    }

  };

  /**
  * ## Tests for starting up the monitor server
  * @method Server
  */
  module.exports['Server'] = {

    /**
    * Tests that the server starts when requested
    *
    * @method Server-Start
    */
    Start: function(test) {
      Monitor.start(function(error) {
        test.equal(error, null, 'No errors on server start');
        var processMonitor = new Monitor({probeClass:'Process', hostName:'localhost'});
        processMonitor.connect(function(error) {
          test.equal(error, null, 'No errors on connect');
          var probeId = processMonitor.get('probeId');
          test.ok(probeId, "The probeId is set");
          test.ok(probeId && probeId.length === 36, "The probeId is a uuid");
          test.done();
        });
      });
    },

    /**
    * Tests that the server stops when requested
    *
    * @method Server-Stop
    */
    Stop: function(test) {
      Monitor.stop(function(error) {
        test.equal(error, null, 'No errors on server stop');
        test.done();
      });
    },

    /**
    * Tests that the server can restart after being stopped
    *
    * @method Server-Restart
    */
    Restart: function(test) {
      Monitor.start(function(error) {
        test.equal(error, null, 'No errors on server restart');
        Monitor.stop(function(error) {
          test.equal(error, null, 'No errors on server re-stop');
          test.done();
        });
      });
    }

  };

  /**
  * ## Tests for auto-start and named monitors
  * @method AutoStart
  */
  module.exports['AutoStart'] = {

    /**
    * Tests that an auto-start monitor is started on load
    *
    * @method AutoStart-Starts
    */
    Starts: function(test) {
      var runningProbesByKey = Monitor.getRouter().runningProbesByKey;
      var autoStartedProbe = null;
      for (var key in runningProbesByKey) {
        var probeInstance = runningProbesByKey[key];
        // 1234 is the signature polling interval for the test probe
        if (probeInstance.get('pollInterval') === 1234) {
          autoStartedProbe = probeInstance;
        }
      }
      test.ok(autoStartedProbe, 'The auto started test probe is running');
      test.done();
    },

    /**
    * Tests that a local probe can be connected to by name.
    *
    * @method AutoStart-ConnectLocalByName
    */
    ConnectLocalByName: function(test) {
      var testMonitor = new Monitor({probeName:'ProcessTest'});
      testMonitor.connect(function(error) {
        test.equal(error, null, 'No errors on processTest connect');
        test.equal(error, null, 'No errors on monitor connect');
        test.equal(testMonitor.get('pollInterval'), 1234, 'The named monitor got the correct probe instance');
        test.done();
      });
    },

    /**
    * Tests that a remote probe can be connected to by name.
    *
    * @method AutoStart-ConnectRemoteByName
    */
    ConnectRemoteByName: function(test) {
      Monitor.start(function(error) {
        test.equal(error, null, 'No errors on server restart');
        var testMonitor = new Monitor({probeName:'ProcessTest', hostName:'localhost'});
        testMonitor.connect(function(error) {
          test.equal(error, null, 'No errors on monitor connect');
          test.equal(testMonitor.get('pollInterval'), 1234, 'The named monitor got the correct probe instance');
          Monitor.stop(function(error) {
            test.equal(error, null, 'No errors on server re-stop');
            test.done();
          });
        });
      });
    }

  };

  /**
  * ## Tests for the toJSON methods
  * @method JSON
  */
  module.exports['JSON'] = {

    /**
    * Tests that toJSON produces both monitor an probe attributes
    *
    * @method JSON-toJSON
    */
    toJSON: function(test) {
      var json = testMonitor.toJSON();
      test.deepEqual(json, testAllAttrs, 'toJSON produces the correct values');
      test.done();
    },

    /**
    * Test that toMonitorJSON produces only monitor attributes
    *
    * @method JSON-toMonitorJSON
    */
    toMonitorJSON: function(test) {
      var json = testMonitor.toMonitorJSON();
      test.deepEqual(json, testMonitorAttrs, 'toMonitorJSON produces the correct values');
      test.done();
    },

    /**
    * Test that toProbeJSON produces only monitor attributes
    *
    * @method JSON-toProbeJSON
    */
    toProbeJSON: function(test) {
      var json = testMonitor.toProbeJSON();

      // The probeId is moved into ID
      var testAttrs = _.clone(testProbeAttrs);
      testAttrs.id = testMonitor.get('probeId');
      test.deepEqual(json, testAttrs, 'toProbeJSON produces the correct values');
      test.done();
    }

  };

  /**
  * ## Tests for connecting and disconnecting with probes
  * @method Connection
  */
  module.exports['Connection'] = {

    /**
    * Test connecting with internal probes
    * @method Connection-Internal
    */
    Internal: function(test) {
      test.expect(6);  // Make sure both callbacks and events are fired
      var processMonitor = new Monitor({probeClass:'Process'});
      processMonitor.connect(function(error) {
        test.equal(error, null, 'No errors on connect');
        var probeId = processMonitor.get('probeId');
        test.ok(probeId, "The probeId is set");
        test.ok(probeId && probeId.length === 36, "The probeId is a uuid");
      });
      processMonitor.on('connect', function() {

        // Don't disconnect right away.  This allows the connect
        // event to be run before emitting change events.
        process.nextTick(function(){
          processMonitor.disconnect(function(error){
            test.equal(error, null, 'No errors on disconnect');
          });
        });
      });
      processMonitor.on('disconnect', function(reason) {
        test.equal(reason, 'manual_disconnect', 'The reason for disconnect is "manually disconnected"');
        test.ok(!processMonitor.get('probeId'), 'The probe is no longer attached to the monitor');
        test.done();
      });
    }

  };

  /**
  * Test the stringify method
  * @method Stringify
  */
  module.exports['Stringify'] = {
    Test: function(test) {
      var tests = [
        "7", 7, true, false,
        {depth:1, test:7},
        {depth:1, test:7, depth2:{depth:2, test:"7"}},
        {depth:1, test:7, depth2:{depth:2, test:"7", depth3:{depth:3, test:"hello"}}},
        {depth:1, test:7, depth2:{depth:2, test:"7", depth3:{depth:3, test:"hello", depth4:{depth:4, test:"there"}}}}
      ];
      var expected = [
        '"7"', '7', 'true', 'false',
        '{\n  \"depth\": 1,\n  \"test\": 7\n}',
        '{\n  \"depth\": 1,\n  \"test\": 7,\n  \"depth2\": {\n    \"depth\": 2,\n    \"test\": \"7\"\n  }\n}',
        '{\n  \"depth\": 1,\n  \"test\": 7,\n  \"depth2\": {\n    \"depth\": 2,\n    \"test\": \"7\",\n    \"depth3\": {\n      \"depth\": 3,\n      \"test\": \"hello\"\n    }\n  }\n}',
        '{\n  \"depth\": 1,\n  \"test\": 7,\n  \"depth2\": {\n    \"depth\": 2,\n    \"test\": \"7\",\n    \"depth3\": {\n      \"depth\": 3,\n      \"test\": \"hello\",\n      \"depth4\": \"[Object]\"\n    }\n  }\n}'
      ];
      for (var i = 0; i < tests.length; i++) {
        var str = Monitor.stringify(tests[i], 3);
        test.equal(str, expected[i]);
      }
      test.done();
    }
  };

}(this));

/*
jsunit test functions:

expect(amount) - Specify how many assertions are expected to run within a test. Very useful for ensuring that all your callbacks and assertions are run.
done() - Finish the current test function, and move on to the next. ALL tests should call this!

ok(value, [message]) - Tests if value is a true value.
equal(actual, expected, [message]) - Tests shallow, coercive equality with the equal comparison operator ( == ).
notEqual(actual, expected, [message]) - Tests shallow, coercive non-equality with the not equal comparison operator ( != ).
deepEqual(actual, expected, [message]) - Tests for deep equality.
notDeepEqual(actual, expected, [message]) - Tests for any deep inequality.
strictEqual(actual, expected, [message]) - Tests strict equality, as determined by the strict equality operator ( === )
notStrictEqual(actual, expected, [message]) - Tests strict non-equality, as determined by the strict not equal operator ( !== )
throws(block, [error], [message]) - Expects block to throw an error.
doesNotThrow(block, [error], [message]) - Expects block not to throw an error.
ifError(value) - Tests if value is not a false value, throws if it is a true value. Useful when testing the first argument, error in callbacks.

*/
