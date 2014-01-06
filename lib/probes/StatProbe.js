// StatProbe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root) {

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('../Monitor'),
      _ = Monitor._,
      StreamProbe = Monitor.StreamProbe,
      Stat = Monitor.Stat;

  // Constants
  var DEFAULT_PATTERN = '*';

  /**
  * Remote application statistics monitoring
  *
  * This probe forwards application statistics to the monitor.
  *
  * @class StatProbe
  * @extends StreamProbe
  * @constructor
  * @param [initParams] {Object} Probe initialization parameters
  *     @param [initParams.pattern=*] {String} Stat name pattern to monitor (see <a href="Stat.html">Stat</a>)
  *     @param [initParams.interval=1000] {Numeric} Queue interval (see <a href="StreamProbe.html">StreamProbe</a>)
  * @param model {Object} Monitor data model elements
  *     @param model.bundle {Stat array} Array of Stat elements.
  *         @param model.bundle.timestamp {String} Timestamp of the stat entry
  *         @param model.bundle.module {String} Stat module
  *         @param model.bundle.name {String} Stat name
  *         @param model.bundle.value {Numeric} Stat value
  *         @param model.bundle.type {String} 'c'ounter, 'g'ague, or 'ms'timer
  *     @param model.sequence {Integer} A numeric incrementer causing a change event
  */
  var StatProbe = Monitor.StatProbe = StreamProbe.extend({

    probeClass: 'Stat',

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
      Stat.on(t.get('pattern'), t.watcher);
    },

    release: function() {
      var t = this;
      Stat.off(t.get('pattern'), t.watcher);
    }

  });

}(this));
