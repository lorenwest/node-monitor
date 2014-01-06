// LogProbe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
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
  * @extends StreamProbe
  * @constructor
  * @param [initParams] {Object} Probe initialization parameters
  *     @param [initParams.pattern=*] {String} Log name pattern to monitor (see <a href="Log.html">Log</a>)
  *     @param [initParams.interval=1000] {Numeric} Queue interval (see <a href="StreamProbe.html">StreamProbe</a>)
  * @param model {Object} Monitor data model elements
  *     @param model.bundle {Log array} Array of Log elements.
  *         @param model.bundle.timestamp {String} Timestamp of the log statement
  *         @param model.bundle.logType {String} Log type (error, info, etc)
  *         @param model.bundle.module {String} Module that emitted the log
  *         @param model.bundle.name {String} Log entry name
  *         @param model.bundle.args {any[]} Arguments to the log statement
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
        // Add timestamp as the first element
        var logElems = _.toArray(arguments);
        logElems.splice(0,0,JSON.stringify(new Date()).substr(1,24));
        t.queueItem.call(t, logElems);
      };
      Log.on(t.get('pattern'), t.watcher);
    },

    release: function() {
      var t = this;
      Log.off(t.get('pattern'), t.watcher);
    }

  });

}(this));
