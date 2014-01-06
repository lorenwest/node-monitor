// StreamProbe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('../Monitor'),
      Probe = Monitor.Probe,
      _ = Monitor._;

  // Constants
  var DEFAULT_BUNDLE_INTERVAL = 1000;

  /**
  * Base class for probes that stream data
  *
  * Offering real time data streaming can result in degraded performance due
  * to the I/O overhead of sending individual stream elements to remote monitors.
  *
  * This class eases that overhead by bundling stream elements, and sending those
  * bundles in scheduled intervals.  The monitor gets to decide the interval based
  * on the stream volume, and their needs.
  *
  * Derived classes output their stream data as elements of the ```bundle```
  * attribute.
  *
  * A ```sequence``` attribute is incremented sequentially to assure change
  * events are fired, and to allow clients to insure stream ordering and
  * completeness.
  *
  * @class StreamProbe
  * @extends Probe
  * @constructor
  * @param [initParams] {Object} Probe initialization parameters
  *     @param [initParams.interval=1000] {Numeric} Number of milliseconds
  *         to wait between bundles.
  */
  var StreamProbe = Monitor.StreamProbe = Probe.extend({


    defaults: _.extend({}, Probe.prototype.defaults, {
      bundle: [],
      interval: DEFAULT_BUNDLE_INTERVAL,
      sequence: 0
    }),

    initialize: function(){
      var t = this;

      // Initialize parent
      Probe.prototype.initialize.apply(t, arguments);

      // Moving the interval into an instance variable for performance
      t.interval = t.get('interval');

      // Set up for the first bundle
      t.queue = [];
      t.timer = null;
      t.lastSendTime = 0;
    },

    /**
    * Queue an item in the stream
    *
    * This method places the item into the stream and outputs it to the
    * monitor, or queues it up for the next bundle.
    *
    * @method queueItem
    * @param item {Any} Item to place into the queue
    */
    queueItem: function(item) {
      var t = this,
          now = Date.now(),
          msSinceLastSend = now - t.lastSendTime;

      // Queue the item
      t.queue.push(item);

      // Send the bundle?
      if (msSinceLastSend > t.interval) {
        // It's been a while since the last send.  Send it now.
        t._send();
      }
      else {
        // Start the timer if it's not already running
        if (!t.timer) {
          t.timer = setTimeout(function(){
            t._send();
          }, t.interval - msSinceLastSend);
        }
      }
    },

    /**
    * Send the bundle to the montitor
    *
    * @private
    * @method _send
    */
    _send: function() {
      var t = this,
          now = Date.now();

      // This kicks off the send
      t.lastSendTime = now;
      t.set({
        bundle: t.queue,
        sequence: t.get('sequence') + 1
      });

      // Reset
      t.queue = [];
      if (t.timer) {
        clearTimeout(t.timer);
        t.timer = null;
      }
    }

  });

}(this));
