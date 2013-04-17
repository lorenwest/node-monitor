// LogProbe.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/monitor-min
(function(root) {

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('../Monitor'),
      _ = Monitor._,
      StreamProbe = Monitor.StreamProbe,
      Log = Monitor.Log;

  // Constants
  var DEFAULT_PATTERN = '*';

  /**
  * Remote application log monitoring
  *
  * This probe forwards application logs to the monitor.
  *
  * @class LogProbe
  * @extends Probe
  * @constructor
  * @param [initParams] {Object} Probe initialization parameters
  *     @param [initParams.pattern=*] {String} Log name pattern to monitor (see <a href="Log.html">Log</a>)
  *     @param [initParams.interval=1000] {Numeric} Queue interval (see <a href="StreamProbe.html">StreamProbe</a>)
  * @param model {Object} Monitor data model elements
  *     @param model.bundle {Log array} Array of Log elements.
  *         @param model.bundle.module {String} Log module
  *         @param model.bundle.name {String} Log name
  *         @param model.bundle.value {Numeric} Log value
  *         @param model.bundle.type {String} 'c'ounter, 'g'ague, or 'ms'timer
  *     @param model.sequence {Integer} A numeric incrementer causing a change event
  */
  var LogProbe = Monitor.LogProbe = StreamProbe.extend({

    probeClass: 'Log',

    defaults: _.extend({}, StreamProbe.prototype.defaults, {
      pattern: DEFAULT_PATTERN
    }),

    initialize: function(){
      var t = this;

      // Call parent constructor
      StreamProbe.prototype.initialize.apply(t, arguments);

      // The watcher just forwards all args to queueItem as an array
      t.watcher = function() {
        t.queueItem.call(t, _.toArray(arguments));
      };
      Log.on(t.get('pattern'), t.watcher);
    },

    release: function() {
      var t = this;
      Log.off(t.get('pattern'), t.watcher);
    }

  });

}(this));