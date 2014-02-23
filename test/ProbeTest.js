// ProbeTest.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // This should be run before other tests to set up configurations
  process.env.NODE_ENV='test';
  var config = require('config');

  // Dependencies
  var Monitor = require('../lib/index'),
      Probe = Monitor.Probe, PollingProbe = Monitor.PollingProbe,
      Backbone = Monitor.Backbone, _ = Monitor._;

  /**
  * Unit tests for the <a href="Probe.html">Probe</a> class.
  * @class ProbeTest
  */

  /**
  * Tests for Probe functionality
  *
  * @method ProbeTest
  */
  // Test that important namespaces are available
  var probeTests = module.exports['ProbeTest'] = {

    /**
    * Tests that Probe classes are in place
    * @method ProbeTest-Classes
    */
    Classes: function(test) {
      test.ok(Probe.prototype instanceof Backbone.Model, 'The Probe data model is in place');
      test.ok(Probe.List.prototype instanceof Backbone.Collection, 'The Probe.List collection is in place');
      test.ok(PollingProbe.prototype instanceof Probe, 'The PollingProbe base constructor is in place');
      test.done();
    },

    /**
    * Tests Probe instantiation
    * @method ProbeTest-Instantiate
    */
    Instantiate: function(test) {
      var process = probeTests.processMonitor = new Monitor({probeClass:'Process', initParams:{a:'b', pollInterval:100}});
      process.connect(function(err) {
        test.ifError(err);
        test.notEqual(process.get('probeId'), null, "Probe ID isn't null");
        test.done();
      });
    },

    /**
    * Test the same ID on subsequent probe instantiation with similar init params
    * @method ProbeTest-SameProbe
    */
    SameProbe: function(test) {
      var process = new Monitor({probeClass:'Process', initParams:{pollInterval:100, a:'b'}});
      process.connect(function(err) {
        test.ifError(err);
        test.notEqual(process.get('probeId'), null, "Probe ID isn't null");
        test.equal(probeTests.processMonitor.get('probeId'), process.get('probeId'), "Probes are the same with similar init params.");
        process.disconnect();
        test.done();
      });
    },

    /**
    * Test that different init params result in a different probe
    * @method ProbeTest-DifferentProbe
    */
    DifferentProbe: function(test) {
      var process = new Monitor({probeClass:'Process', initParams:{pollInterval:1000, a:'b'}});
      process.connect(function(err) {
        test.ifError(err);
        test.notEqual(process.get('probeId'), null, "Probe ID isn't null");
        test.notEqual(probeTests.processMonitor.get('probeId'), process.get('probeId'), "Probes are different with different init params.");
        process.disconnect();
        test.done();
      });
    },

    /**
    * Tests remote control functionality
    * @method ProbeTest-RemoteControl
    */
    RemoteControl: function(test) {
      var monitor = probeTests.processMonitor;
      monitor.control('ping', function(error, result) {
        test.ifError(error);
        test.equals(result, 'pong', 'Ping returned pong');
        test.done();
      });
    },

    /**
    * Test remote control failure (no control method)
    * @method ProbeTest-RemoteControlFail
    */
    RemoteControlFail: function(test) {
      var monitor = probeTests.processMonitor;
      monitor.control('pingPong', function(error, result) {
        test.ok(error != null, 'Correctly errored on un-available control method');
        test.done();
      });
    },

    /**
    * Test the change event
    * @method ProbeTest-ChangeEvent
    */
    ChangeEvent: function(test) {
      var monitor = probeTests.processMonitor;
      var onChange = function(){
        monitor.off('change', onChange);
        var changes = monitor.changedAttributes();
        test.ok(_.size(changes) > 0, 'Attribute changes came through');
        test.done();
      };
      monitor.on('change', onChange);
    },

    /**
    * Tests that Probe clean up works
    * @method ProbeTest-Cleanup
    */
    Cleanup: function(test) {
      var monitor = probeTests.processMonitor;
      monitor.disconnect(function(error) {
        test.ifError(error);
        test.done();
      });
    }

  };

}(this));
