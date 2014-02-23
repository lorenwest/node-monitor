// InspectTest.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // This should be run before other tests to set up configurations
  process.env.NODE_ENV='test';
  var config = require('config');

  // Dependencies
  var Monitor = require('../lib/index'),
      InspectProbe = Monitor.InspectProbe,
      Backbone = Monitor.Backbone, _ = Monitor._;

  /**
  * Unit tests for the <a href="Inspect.html">Inspect</a> probe.
  * @class InspectTest
  */

  /**
  * Test group for baseline Inspect probe functionality
  *
  * @method Inspect
  */
  module.exports['Inspect'] = {

    /**
    * Tests that classes are in correct
    * @method Inspect-Classes
    */
    Classes: function(test) {
      test.ok(InspectProbe.prototype instanceof Backbone.Model, 'The data model is in place');
      test.ok(InspectProbe.prototype instanceof Monitor.Probe, 'It is a probe');
      test.ok(InspectProbe.prototype instanceof Monitor.PollingProbe, 'It is a polling probe');
      test.done();
    },

    /**
    * Tests the no-param constructor
    * @method Inspect-NoParams
    */
    NoParams: function(test) {
      var monitor = new Monitor({
        probeClass:'Inspect'
      });
      monitor.connect(function(error) {
        test.ok(!error, "Able to construct a top level inspector");
        var globalValue = monitor.get('value');
        test.ok(typeof globalValue.Monitor !== 'undefined', 'Global object returned');
        monitor.disconnect(function(error){
          test.ok(!error, 'Properly disconnected');
          test.done();
        });
      });
    },

    /**
    * Tests the key parameter as a global variable
    * @method Inspect-KeyVariable
    */
    KeyVariable: function(test) {
      var monitor = new Monitor({
        probeClass:'Inspect',
        initParams: {
          key: 'Monitor'
        }
      });
      monitor.connect(function(error) {
        test.ok(!error, "Able to inspect a global variable");
        var value = monitor.get('value');
        test.ok(typeof value.Probe !== 'undefined', 'The monitor object was returned');
        monitor.disconnect(function(error){
          test.ok(!error, 'Properly disconnected');
          test.done();
        });
      });
    },

    /**
    * Tests the key parameter as an expression
    * @method Inspect-KeyExpression
    */
    KeyExpression: function(test) {
      var monitor = new Monitor({
        probeClass:'Inspect',
        initParams: {
          key: 'Monitor.getRouter()'
        }
      });
      monitor.connect(function(error) {
        test.ok(!error, "Able to inspect an expression");
        var value = monitor.get('value');
        test.ok(typeof value.firewall !== 'undefined', 'The expression returned the correct object');
        monitor.disconnect(function(error){
          test.ok(!error, 'Properly disconnected');
          test.done();
        });
      });
    }

  };

}(this));
