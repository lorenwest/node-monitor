// DataModelProbeTest.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // This should be run before other tests to set up configurations
  process.env.NODE_ENV='test';
  var config = require('config');

  // Dependencies
  var Monitor = require('../lib/index'),
      DataModelProbe = Monitor.DataModelProbe,
      dataModelMonitor = null,
      dataModelMonitor1 = null,
      dataModelMonitor2 = null,
      Backbone = Monitor.Backbone, _ = Monitor._;

  /**
  * Unit tests for the <a href="DataModelProbe.html">DataModel</a> probe.
  * @class DataModelProbeTest
  */

  /**
  * Test group for baseline DataModel probe functionality
  *
  * @method DataModelProbe
  */
  module.exports['DataModelProbe'] = {

    /**
    * Tests that classes are in correct
    * @method DataModelProbe-Classes
    */
    Classes: function(test) {
      test.ok(DataModelProbe.prototype instanceof Backbone.Model, 'The data model is in place');
      test.ok(DataModelProbe.prototype instanceof Monitor.Probe, 'It is a probe');
      test.done();
    },

    /**
    * Test that you can connect to the test data model
    * @method DataModelProbe-Connect
    */
    Connect: function(test) {
      // Get a monitor to the underlying data model the recipe manipulates
      setTimeout(function(){
        dataModelMonitor = new Monitor({probeName:'DataModelTest'});
        dataModelMonitor.connect(function(error) {
          test.ok(!error, 'No error on data model connect');
          test.equal(dataModelMonitor.get('testParam1'), 'testValue1', 'Connected to the correct data model');
          test.done();
        });
      }, 0);
    },

    /**
    * Tests that a single monitor can update the value
    * @method DataModelProbe-SingleMonitor
    */
    SingleMonitor: function(test) {

      // Expect only a single change (vs. a change in the monitor, and a subsequent
      // change from the probe).
      var onChange = function() {
        test.equal(dataModelMonitor.get('testParam1'), 'testValue2', 'The change event was triggered correctly');
      };

      // Done with the test in 10 ms (should have only gotten one onChange event triggered)
      setTimeout(function(){
        dataModelMonitor.off('change:testParam1', onChange);
        test.expect(1);
        test.done();
      }, 10);

      // Now attach the listener and change an attribute
      dataModelMonitor.on('change:testParam1', onChange);
      dataModelMonitor.set('testParam1', 'testValue2');
    },

    /**
    * Tests that multiple monitors can all be triggered from a single change
    * @method DataModelProbe-SingleMonitor
    */
    MultiMonitor: function(test) {

      // Expect two changes - one from each monitor
      var onChange1 = function() {
        test.equal(dataModelMonitor.get('testParam1'), 'testValue3', 'The change event was triggered correctly');
        dataModelMonitor1.off('change:testParam1', onChange1);
      };
      var onChange2 = function() {
        test.equal(dataModelMonitor.get('testParam1'), 'testValue3', 'The change event was triggered correctly');
        dataModelMonitor2.off('change:testParam1', onChange2);
      };

      dataModelMonitor1 = new Monitor({probeName:'DataModelTest'});
      dataModelMonitor2 = new Monitor({probeName:'DataModelTest'});

      dataModelMonitor1.connect(function(error) {
        test.ok(!error, 'No error on data model 1 connect');
        test.equal(dataModelMonitor.get('testParam1'), 'testValue2', 'Connected to the correct data model');
        dataModelMonitor1.on('change:testParam1', onChange1);

        dataModelMonitor2.connect(function(error) {
          test.ok(!error, 'No error on data model 2 connect');
          test.equal(dataModelMonitor.get('testParam1'), 'testValue2', 'Connected to the correct data model');
          dataModelMonitor2.on('change:testParam1', onChange2);

          // Now change the value from the original monitor.  This change should
          // be propagated to the two other monitors just connected.
          dataModelMonitor.set('testParam1', 'testValue3');

          // Done with the test in 10 ms (should have gotten two onChange events triggered
          // from different monitors, plus the 4 connect tests)
          setTimeout(function(){
            test.expect(6);
            test.done();
          }, 10);

        });
      });

    }

  };

}(this));
