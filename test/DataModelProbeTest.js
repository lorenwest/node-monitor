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
    }

  };

}(this));
