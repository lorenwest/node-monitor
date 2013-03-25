// Monitor.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/monitor-min
(function(root){

  // Module loading
  var commonJS = (typeof exports !== 'undefined'),
      Backbone = commonJS ? require('backbone') : root.Backbone,
      _ = commonJS ? require('underscore')._ : root._,
      Cron = commonJS ? require('cron') : null;

  // Constants
  var DEFAULT_DEEP_COPY_DEPTH = 4;

  /**
  * Monitor a remote probe
  *
  * Monitor objects are the local interface to a remote <a href="Probe.html">Probe</a>.
  * The probe may be running in this process or on a remote server.
  *
  * In a disconnected state, the monitor object contains information about
  * the type, attributes, and location of the probe it will monitor.
  *
  * In a connected state, the monitor object contains the data attributes of
  * the probe it is monitoring, and emits change events as the probe changes
  * state.
  *
  * Many monitors may be attached to a single probe.  When the probe data model
  * changes, changes are broadcast to the connected monitors.
  *
  * Probes can be remotely controlled using the control() method.
  * The control() method acts an RPC in that it accepts input arguments and
  * returns results to the monitor initiating the request.
  *
  * Example:
  *
  *     // Connecting a monitor to a probe
  *     var processMonitor = new Monitor({
  *       probeClass: 'Process'
  *     });
  *     processMonitor.connect();
  *
  *     // Monitoring the probe
  *     processMonitor.on('change', function(){
  *       console.log('Changes:', processMonitor.getChangedAttributes());
  *     });
  *
  *     // Remote control
  *     processMonitor.control('ping', function(error, response) {
  *       console.log('Ping response: ', response);
  *     });
  *
  * Monitoring a probe on a remote server requires the ```hostName``` parameter
  * to be set.
  *
  *     // Connecting to a remote monitor
  *     var processMonitor = new Monitor({
  *       probeClass: 'Process',
  *       hostName: 'remote-server1'
  *     });
  *     processMonitor.connect();
  *
  * Additional parameters can be set to identify a specific server if many
  * servers are running on the specified ```hostName```.
  *
  * @class Monitor
  * @extends Backbone.Model
  * @constructor
  * @param model - Initial data model.  Can be a JS object or another Model.
  *     @param [model.id] {String} The monitor object id.  Set externally.
  *     @param model.probeClass {String} Class name of the probe this is (or will be) monitoring.
  *     @param [model.initParams] {Object} Initialization parameters passed to the probe during instantiation.
  *     @param [model.hostName] {String} Hostname the probe is (or will) run on.
  *       If not set, the Router will connect with the first host capable of running this probe.
  *     @param [model.appName] {String} Application name the probe is (or will) run within.
  *       If not set, the Router will disregard the appName of the process it is connecting with.
  *     @param [model.appInstance=0] {Integer} Index into the list of hostName/appName matches.
  *       If not set, the Router will connect to the first hostName/appName combination.
  *       This can be useful for connecting with a specific instance of a multi-process application.
  *     @param model.probeId {String} ID of the probe this is monitoring (once connected). READONLY
  *     @param model.PROBE_PARAMS... {(defined by the probe)} ... all other <strong>```model```</strong> parameters are READONLY parameters of the connected probe
  */
  /**
  * Receive real time notifications from the probe
  *
  * When the probe data model changes, all changed attributes are forwarded
  * to monitors, triggering this event.
  *
  * All probe attributes are available in the monitor, and the
  * getChangedAttributes() method returns the list of attributes changed
  * since the last change event.
  *
  *     myMonitor.on('change', function(){
  *       console.log('Changes:', myMonitor.getChangedAttributes());
  *     });
  *
  * @event change
  */
  var Monitor = Backbone.Model.extend({

    defaults: {
      id:  '',
      name: '',
      probeClass: '',
      initParams: {},
      hostName: '',
      appName: '',
      appInstance: 0
    },
    initialize: function(params, options) {},

    /**
    * Connect the monitor to the remote probe
    *
    * Upon connection, the monitor data model is a proxy of the current state
    * of the probe.
    *
    * @method connect
    * @param callback {Function(error)} Called when the probe is connected (or error)
    */
    /**
    * The monitor has successfully connected with the probe
    * @event connect
    */
    connect: function(callback) {
      var t = this;
      Monitor.getRouter().connectMonitor(t, function(error) {

        // Give the caller first crack at knowing we're connected,
        // followed by anyone registered for the connect event.
        if (callback) {callback(error);}

        // Initial data setting into the model was done silently
        // in order for the connect event to fire before the first
        // change event.  Fire the connect / change in the proper order.
        if (!error) {
          t.trigger('connect', t);
          t.trigger('change', t);
        }
      });
    },

    /**
    * Get the connection to the remote probe
    *
    * This method returns the Connection object that represents the remote
    * server used for communicating with the connected probe.
    *
    * If the probe is running internally or the monitor isn't currently
    * connected, this will return null.
    *
    * @method getConnection
    * @return connection {Connection} The connection object
    */
    getConnection: function() {
      var t = this;
      return (t.probe && t.probe.connection ? t.probe.connection : null);
    },

    /**
    * Is the monitor currently connected?
    *
    * @method isConnected
    * @return {boolean} True if the monitor is currently connected
    */
    isConnected: function() {
      var t = this;
      return (t.probe != null);
    },

    /**
    * Disconnect from the remote probe
    *
    * This should be called when the monitor is no longer needed.
    * It releases resources associated with monitoring the probe.
    *
    * If this was the last object monitoring the probe, the probe will be
    * stopped, releasing resources associated with running the probe.
    *
    * @method disconnect
    * @param callback {Function(error)} Called when disconnected (or error)
    */
    /**
    * The monitor has disconnected from the probe
    * @event disconnect
    * @param reason {String} Reason specified for the disconnect
    * <ul>Known Reasons:
    *   <li>manual_disconnect - A manual call to disconnect() was made.</li>
    *   <li>connect_failed - Underlying transport connection problem.</li>
    *   <li>remote_disconnect - Underlying transport disconnected.</li>
    * </ul>
    */
    disconnect: function(callback) {
      var t = this, reason = 'manual_disconnect';
      Monitor.getRouter().disconnectMonitor(t, reason, function(error, reason) {
        if (callback) {callback(error);}
        if (!error) {t.trigger('disconnect', reason);}
      });
    },

    /**
    * Send a control message to the probe.
    *
    * Monitors can use this method to send a message and receive a response
    * from a connected probe.
    *
    * The probe must implement the specified control method.  All probes are
    * derived from the base <a href="Probe.html">Probe</a> class, which offers
    * a ping control.
    *
    * To send a ping message to a probe and log the results:
    *
    *     var myMonitor.control('ping', console.log);
    *
    * @method control
    * @param name {String} Name of the control message.
    * @param [params] {Object} Named input parameters specific to the control message.
    * @param [callback] {Function(error, response)} Function to call upon return.
    * <ul>
    *   <li>error (Any) - An object describing an error (null if no errors)</li>
    *   <li>response (Any) - Response parameters specific to the control message.</li>
    * </ul>
    */
    control: function(name, params, callback) {
      if (typeof params === 'function') {
        callback = params;
        params = null;
      }
      callback = callback || function(){};
      var t = this, probe = t.probe;
      if (!probe) {return callback('Probe not connected');}
      if (probe && probe.connection) {
        probe.connection.emit('probe:control', {probeId: t.get('probeId'), name: name, params:params}, callback);
      } else {
        probe.onControl(name, params, callback);
      }
    },

    /**
    * Produce an object without monitor attributes
    *
    * A Monitor object contains a union of the connection attributes required for
    * a Monitor, and the additional attributes defined by the probe it's monitoring.
    *
    * This method produces an object containing only the probe portion of
    * those attributes.
    *
    * The id attribute of the returned JSON is set to the probeId from
    * the monitor.
    *
    * @method toProbeJSON
    * @param [options] {Object} Options to pass onto the model toJSON
    * @return {Object} The probe attributes
    */
    toProbeJSON: function(options) {
      var t = this,
          json = {id: t.get('probeId')};

      // Transfer all non-monitor attrs
      _.each(t.toJSON(options), function(value, key) {
        if (!(key in t.defaults)) {
          json[key] = value;
        }
      });
      return json;
    },

    /**
    * Produce an object with the monitor only attributes.
    *
    * A Monitor object contains a union of the connection attributes required for
    * a Monitor, and the additional attributes defined by the probe it's monitoring.
    *
    * This method produces an object containing only the monitor portion of
    * those attributes.
    *
    * @method toMonitorJSON
    * @param [options] {Object} Options to pass onto the model toJSON
    * @return {Object} The monitor attributes
    */
    toMonitorJSON: function(options) {
      var t = this,
          json = {};

      // Transfer all monitor attrs
      _.each(t.toJSON(options), function(value, key) {
        if (key in t.defaults) {
          json[key] = value;
        }
      });
      return json;
    },

    /**
    * Produce a server string representation of the hostName:appName:appInstance
    *
    * Depending on the presence of the appName and appInstance, this will produce
    * one of the following:
    *
    *     hostName
    *     hostName:appName
    *     hostName:appName:appInstance
    *
    * @method toServerString
    * @return {String} A string representation of the monitor server
    */
    toServerString: function() {
      return Monitor.toServerString(this.toMonitorJSON());
    }

  });

  /////////////////////////
  // Static helper methods
  /////////////////////////

  /**
  * Generate a unique UUID-v4 style string
  *
  * This is a cross-platform UUID implementation used to uniquely identify
  * model instances.  It is a random number based UUID, and as such can't be
  * guaranteed unique.
  *
  * @static
  * @protected
  * @method generateUniqueId
  * @return {String} A globally unique ID
  */
  Monitor.generateUniqueId = function() {
    // Generate a 4 digit random hex string
    function rhs4() {return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);}
    return (rhs4()+rhs4()+"-"+rhs4()+"-"+rhs4()+"-"+rhs4()+"-"+rhs4()+rhs4()+rhs4());
  };

  /**
  * Generate a unique ID for a collection
  *
  * This generates an ID to be used for new elements of the collection,
  * assuring they don't clash with other elements in the collection.
  *
  * @method Monitor.generateUniqueCollectionId
  * @param collection {Backbone.Collection} The collection to generate an ID for
  * @param [prefix] {String} An optional prefix for the id
  * @return id {String} A unique ID with the specified prefix
  */
  Monitor.generateUniqueCollectionId = function(collection, prefix) {
    var id = '';
    prefix = prefix || '';

    // First time - get the largest idSequence in the collection
    if (!collection.idSequence) {
      collection.idSequence = 0;
      collection.forEach(function(item){
        var id = item.get('id') || '',
            sequence = +id.substr(prefix.length);
        if (collection.idSequence <= sequence) {
          collection.idSequence = sequence + 1;
        }
      });
    }

    return prefix + collection.idSequence++;
  };

  /**
  * Get the default router (an application singleton)
  *
  * This instantiates a Router on first call.
  *
  * @static
  * @protected
  * @method getRouter
  * @return {Router} The default router.
  */
  Monitor.getRouter = function() {

    // Instantiate a router if no default
    if (!Monitor.defaultRouter) {
      Monitor.defaultRouter = new Monitor.Router();

      // If there's a global socket.io server available,
      // then we're running on the browser.  Set the default
      // gateway to the global io socket.
      if (root.io) {
        Monitor.defaultRouter.setGateway({
          socket:root.io.connect()
        });
      }
    }

    // Return the router
    return Monitor.defaultRouter;
  };

  /**
  * Produce a server string representation of the hostName:appName:appInstance
  *
  * Depending on the presence of the appName and appInstance, this will produce
  * one of the following:
  *
  *     hostName
  *     hostName:appName
  *     hostName:appName:appInstance
  *
  * @method toServerString
  * @param monitorJSON [Object] JSON object containing the following
  *     @param hostName {String} The host to monitor
  *     @param [appName] {String} The app name running on the host
  *     @param [appInstance] {Integer} The instance of this app on the host
  * @return {String} A string representation of the monitor server
  */
  Monitor.toServerString = function(monitorJSON) {
    var str = monitorJSON.hostName;
    if (monitorJSON.appName) {
      str += ':' + monitorJSON.appName;
      if (monitorJSON.appInstance) {
        str += ':' + monitorJSON.appInstance;
      }
    }
    return str;
  };

  /**
  * Produce a depth-limited copy of the specified object
  *
  * Functions are copied for visual inspection purposes - the fact that
  * they are a function, and any prototype members.  This is so a JSON.stringify
  * of the result will show the functions (normally JSON.stringify doesn't output
  * functions).
  *
  * This method is mostly for debugging - for producing a human-readable stream
  * representation of the object.  It is an exact copy, except for elements of
  * type function.
  *
  * @method deepCopy
  * @param value {Mixed} Object or value to copy
  * @param [depth=4] {Integer} Maximum depth to return.  If the depth exceeds
  *   this value, the string "[Object]" is returned as the value.
  * @return {Mixed} A depth-limited copy of the value
  */
  Monitor.deepCopy = function(value, depth) {

    // Defaults
    depth = typeof(depth) === 'undefined' ? DEFAULT_DEEP_COPY_DEPTH : depth;

    // Simple value - return the raw value
    if (typeof value !== 'object' && typeof value !== 'function') {
      return value;
    }

    // Build a string representation of the type
    var strType = '[Object]';
    if (typeof value === 'function') {
      strType = '[Function]';
    } else if (Array.isArray(value)) {
      strType = '[Array]';
    }

    // Limit reached
    if (depth <= 0) {
      return strType;
    }

    // Create a new object to copy into.
    // Proactively add constructor so it's at the top of a function
    var copy = Array.isArray(value) ? [] : {};

    // Copy all elements (by reference)
    for (var prop in value) {
      var elem = value[prop];
      if (typeof elem === 'object' || typeof elem === 'function') {
        copy[prop] = Monitor.deepCopy(elem, depth - 1);
      }
      else {
        copy[prop] = elem;
      }
    }

    // Special string formatting for functions
    if (typeof value === 'function') {
      if (_.isEmpty(copy)) {
        // No sub-elements.  Identify it as a function.
        copy = strType;
      } else {
        // Sub-elements exist.  Identify it as a function by placing
        // a constructor at the top of the object
        copy = _.extend({constructor: strType},copy);
      }
    }

    // Return the copy
    return copy;
  };

  /**
  * Produce a recursion-safe JSON string.
  *
  * This method recurses the specified object to a maximum specified depth
  * (default 4).
  *
  * It also indents sub-objects for debugging output.  The indent level can be
  * specified, or set to 0 for no indentation.
  *
  * This is mostly useful in debugging when the standard JSON.stringify
  * returns an error.
  *
  * @method stringify
  * @param value {Mixed} Object or value to turn into a JSON string
  * @param [depth=4] {Integer} Maximum depth to return.  If the depth exceeds
  *   this value, the string "[Object]" is returned as the value.
  * @param [indent=2] {Integer} Indent the specified number of spaces (0=no indent)
  * @return {String} A JSON stringified value
  */
  Monitor.stringify = function(value, depth, indent) {

    // Defaults
    indent = typeof(indent) === 'undefined' ? 2 : indent;

    // Return a stringified depth-limited deep copy
    return JSON.stringify(Monitor.deepCopy(value, depth), null, indent);
  };

  /**
  * Constructor for a list of Monitor objects
  *
  *     var myList = new Monitor.List(initialElements);
  *
  * @static
  * @method List
  * @param [items] {Array} Initial list items.  These can be raw JS objects or Monitor data model objects.
  * @return {Backbone.Collection} Collection of Monitor data model objects
  */
  Monitor.List = Backbone.Collection.extend({model: Monitor});

  // Monitor configurations.  If running in a commonJS environment, load the
  // configs from the config package.  Otherwise just use the defaults.
  var defaultConfig = {
    appName: 'unknown',
    serviceBasePort: 42000,
    portsToScan: 20,
    allowExternalConnections: false
  };
  if (commonJS) {
    Monitor.Config = require('config');
    Monitor.Config.setModuleDefaults('MonitorMin', defaultConfig);
  } else {
    Monitor.Config = {MonitorMin: defaultConfig};
  }

  // Expose external dependencies
  Monitor._ = _;
  Monitor.Backbone = Backbone;
  Monitor.Cron = Cron;
  Monitor.commonJS = commonJS;

  // Export for both commonJS and the browser
  if (commonJS) {
    module.exports = Monitor;
  } else {
    root.Monitor = Monitor;
  }

}(this));
