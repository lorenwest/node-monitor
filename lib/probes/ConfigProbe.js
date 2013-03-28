// ConfigProbe.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/monitor-min
(function(root) {

  // Module loading - this runs server-side only
  var util = require('util'),
      Monitor = root.Monitor || require('../Monitor'), _ = Monitor._,
      Probe = Monitor.Probe,
      CONFIG = require('config'),
      events = require('events'),
      watcher = null;

  /**
  * <h2>Baseline probes</h2>
  *
  * <p>
  * The probes in this module offer baseline functionality, and provide examples
  * for building custom probes.
  * </p>
  *
  * @module Probes
  */

  /**
  * Remote exposure and control of configuration parameters.
  *
  * This probe can monitor the state of, and make changes to local configuration
  * parameters.  The probe can be configured to monitor a specific top-level
  * configuration parameter, or all process configuration parameters.
  *
  * @class ConfigProbe
  * @extends Probe
  * @constructor
  * @param model - Monitor data model elements
  *     @param model.elems [Mixed] All configuration elements are placed at the top level
  */
  var ConfigProbe = Monitor.ConfigProbe = Probe.extend({

    // These are required for Probes
    probeClass: 'Config',

    initialize: function(){
      var t = this;
      t.changeSequence = 0;
      Probe.prototype.initialize.apply(t, arguments);

      // Create a single watcher for all probe instances.  This is done
      // because node.config doesn't have an un-watch.  If it did, the
      // watcher would be created and destroyed along with the probe.
      if (!watcher) {
        watcher = new events.EventEmitter();
        CONFIG.watch(CONFIG, null, function(){
          watcher.emit('change');
        });
      }

      // Make sure a sequence is set when the object changes.
      // This assures the change event is fired if sub-objects
      // are the cause of the change.
      t.onChange = function(){
        var configCopy = JSON.parse(JSON.stringify(CONFIG));
        configCopy.changeSequence = t.changeSequence++;
        t.set(configCopy);
      };
      watcher.on('change', t.onChange);

      // Set the initial value
      t.onChange();
    },

    release: function() {
      var t = this;
      Probe.prototype.release.apply(t, arguments);
      watcher.removeListener(t.onChange);
    }

  });

}(this));
