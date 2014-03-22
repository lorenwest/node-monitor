// DataModelProbe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor

(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('../Monitor');

  /**
  * Probe representation of a simple data model
  *
  * This probe allows remote creation, manipulation, and change moitoring for
  * arbitrary data. It is useful for monitor applications needing to maintain
  * a small amount of state on the system being monitored.
  *
  * @class DataModelProbe
  * @extends Probe
  * @constructor
  * @param [initParams] - Initialization parameters.  An object containing the
  *   initial state of the data model.  All properties become data model
  *   elements, readable and writable by all monitors connected to the probe.
  */
  var DataModelProbe = Monitor.DataModelProbe = Monitor.Probe.extend({

    // These are required for Probes
    probeClass: 'DataModel',
    writableAttributes: '*'

  });

}(this));
