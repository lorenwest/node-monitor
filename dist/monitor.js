/* monitor - v0.6.10 - 2014-05-16 */

// Monitor.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var commonJS = (typeof exports !== 'undefined'),
      Backbone = commonJS ? require('backbone') : root.Backbone,
      _ = commonJS ? require('underscore')._ : root._,
      log = null, stat = null,
      autoStartedMonitors = [],
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
  *     @param [model.id] {String} An optional ID to assign to the monitor
  *     @param [model.name] {String} An optional name to assign to the monitor
  *     @param [model.probeClass] {String} Class name of the probe this is (or will be) monitoring.
  *     @param [model.probeName] {String} External name given to the probe.  If specified, the probe
  *       started by this monitor can be identified by other monitors with this name.
  *     @param [model.initParams] {Object} Initialization parameters passed to the probe during instantiation.
  *     @param [model.hostName] {String} Hostname the probe is (or will) run on.
  *       If not set, the Router will connect with the first host capable of running this probe.
  *     @param [model.appName] {String} Application name the probe is (or will) run within.
  *       If not set, the Router will disregard the appName of the process it is connecting with.
  *     @param [model.appInstance] {String} Application instance ID the probe is (or will) run within.
  *       If not set, the Router will disregard the appInstance of the process it is connecting with.
  *       Application instances can (should) set the $NODE_APP_INSTANCE environment
  *       variable prior to running to uniquely identify their unique instance within a
  *       server or network.  If this variable is not set prior to running the
  *       app, node-monitor will assign a unique ID among other running apps on the host.
  *     @param model.probeId {String} ID of the probe this is monitoring (once connected). READONLY
  *     @param model.writableAttributes {'*' or Array of String} Most probe attributes are readonly.
  *       If a probe allows set() to be called on an attribute, that attribute name is specified
  *       in this array (once connected).  A value of '*' signifies all attributes as writable.  READONLY
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
      id: '',
      name: '',
      probeName: '',
      probeClass: '',
      initParams: {},
      hostName: '',
      appName: '',
      appInstance: '',
      probeId: '',
      writableAttributes: []
    },
    initialize: function(params, options) {
      log.info('init', params);
    },

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
      var t = this, startTime = Date.now();
      Monitor.getRouter().connectMonitor(t, function(error) {

        // Monitor changes to writable attributes
        if (!error && t.get('writableAttributes').length > 0) {
          t.on('change', t.onChange, t);
        }

        // Give the caller first crack at knowing we're connected,
        // followed by anyone registered for the connect event.
        if (callback) {callback(error);}

        // Initial data setting into the model was done silently
        // in order for the connect event to fire before the first
        // change event.  Fire the connect / change in the proper order.
        if (!error) {

          // An unfortunate side effect is any change listeners registered during
          // connect will get triggered with the same values as during connect.
          // To get around this, add change listeners from connect on nextTick.
          t.trigger('connect', t);
          t.trigger('change', t);

          log.info('connected', {initParams: t.get('initParams'), probeId: t.get('probeId')});
          stat.time('connect', Date.now() - startTime);
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
      var t = this,
          reason = 'manual_disconnect',
          startTime = Date.now(),
          probeId = t.get('probeId');

      // Stop forwarding changes to the probe
      t.off('change', t.onChange, t);

      // Disconnect from the router
      Monitor.getRouter().disconnectMonitor(t, reason, function(error, reason) {
        if (callback) {callback(error);}
        if (error) {
          log.error('disconnect', {error: error});
        }
        else {
          t.trigger('disconnect', reason);
          log.info('disconnected', {reason: reason, probeId: probeId});
          stat.time('disconnect', Date.now() - startTime);
        }
      });
    },

    /**
    * Forward changes on to the probe, when connected.
    *
    * This is called whenever a change trigger is fired.  It forwards any
    * changes of writable attributes onto the probe using control('set').
    */
    onChange: function() {
      var t = this,
          writableAttributes = t.get('writableAttributes'),
          writableChanges = {};

      // Add any writable changes
      var probeAttrs = t.toProbeJSON();
      delete probeAttrs.id;
      for (var attrName in probeAttrs) {
        var isWritable = writableAttributes === '*' || writableAttributes.indexOf(attrName) >= 0;
        if (isWritable && !(_.isEqual(t.attributes[attrName], t._probeValues[attrName]))) {
          writableChanges[attrName] = t.attributes[attrName];
        }
      }

      // Pass any writable changes on to control.set()
      if (Monitor._.size(writableChanges)) {
        t.control('set', writableChanges, function(error) {
          if (error) {
            log.error('probeSet', 'Problem setting writable value', writableChanges, t.toMonitorJSON());
          }
        });
      }
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
      var t = this,
          probe = t.probe,
          logId = 'control.' + t.get('probeClass') + '.' + name,
          startTime = Date.now();

      // Switch callback if sent in 2nd arg
      if (typeof params === 'function') {
        callback = params;
        params = null;
      }

      log.info(logId, params);

      var whenDone = function(error, args) {
        if (error) {
          log.error(logId, error);
        }
        else {
          log.info('return.' + logId, args);
          stat.time(logId, Date.now() - startTime);
        }

        if (callback) {
          callback.apply(t, arguments);
        }
      };

      if (!probe) {
        return whenDone('Probe not connected');
      }

      // Send the message internally or to the probe connection
      if (probe.connection) {
        probe.connection.emit('probe:control', {probeId: t.get('probeId'), name: name, params:params}, whenDone);
      } else {
        probe.onControl(name, params, whenDone);
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
    stat.increment('generateUniqueId');
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
  * Start a monitor server in this process
  *
  * This is a shortand for the following:
  *
  *     var Monitor = require('monitor');
  *     var server = new Monitor.Server();
  *     server.start();
  *
  * It can be chained like this:
  *
  *     var Monitor = require('monitor').start(),
  *         log = Monitor.getLogger('my-app');
  *
  * For more fine-tuned starting, see the <a href="Server.html">Server</a> api.
  *
  * @static
  * @method start
  * @param options {Object} - Server.start() options.  OPTIONAL
  *     @param options.port {Integer} - Port to attempt listening on if server isn't specified.  Default: 42000
  * @param callback {Function(error)} - Called when the server is accepting connections.
  * @return monitor {Monitor} - Returns the static Monitor class (for chaining)
  */
  Monitor.start = function(options, callback) {
    log.info('start', options);
    callback = callback || function(){};

    // Get a default monitor
    if (!Monitor.defaultServer) {
      Monitor.defaultServer = new Monitor.Server();
      Monitor.defaultServer.start(options, callback);
    } else {
      callback();
    }
    return Monitor;
  };

  /**
  * Stop a started monitor server in this process
  *
  * @static
  * @method stop
  * @param callback {Function(error)} - Called when the server is accepting connections.
  */
  Monitor.stop = function(callback) {
    log.info('stop');
    callback = callback || function(){};
    if (Monitor.defaultServer) {
      Monitor.defaultServer.stop(callback);
      delete Monitor.defaultServer;
    } else {
      callback();
    }
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
  *     @param [appInstance] {String} The application instance ID running on the host
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
      if (!value.hasOwnProperty || value.hasOwnProperty(prop)) {
        var elem = value[prop];
        if (typeof elem === 'object' || typeof elem === 'function') {
          copy[prop] = Monitor.deepCopy(elem, depth - 1);
        }
        else {
          copy[prop] = elem;
        }
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
  * Expose the stat logger class
  *
  * @protected
  * @method setStatLoggerClass
  * @param statLoggerClass {Function} Stat logger class to expose
  */
  Monitor.setStatLoggerClass = function(StatLoggerClass) {

    // Build the getStatLogger function
    Monitor.getStatLogger = function(module) {
      return new StatLoggerClass(module);
    };

    // Get the logger for the Monitor module
    stat = Monitor.getStatLogger('Monitor');
  };

  /**
  * Expose the logger class
  *
  * @protected
  * @method setLoggerClass
  * @param loggerClass {Function} Logger class to expose
  */
  Monitor.setLoggerClass = function(LoggerClass) {

    // Build the getLogger function
    Monitor.getLogger = function(module) {
      return new LoggerClass(module);
    };

    // Get the logger for the Monitor module
    log = Monitor.getLogger('Monitor');
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
  // See config/default.js for more information on these configurations.
  var defaultConfig = {
    appName: 'unknown',
    serviceBasePort: 42000,
    portsToScan: 20,
    allowExternalConnections: false,
    consoleLogListener: {
      pattern: "{trace,warn,error,fatal}.*"
    },
    autoStart: []
  };
  if (commonJS) {
    Monitor.Config = require('config');
    Monitor.Config.setModuleDefaults('Monitor', defaultConfig);
  } else {
    Monitor.Config = {Monitor: defaultConfig};
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

  // Auto-start monitors after loading
  var autoStart = Monitor.Config.Monitor.autoStart;
  if (Monitor._.size(autoStart)) {
    setTimeout(function(){
      Monitor._.each(autoStart, function(model) {
        var autoStarted = new Monitor(model);
        autoStarted.connect(function(error) {
          if (error) {
            log.error('autoStart', 'Error auto-starting monitor', model, error);
          }
          autoStartedMonitors.push(autoStarted);
        });
      });
    },0);
  }

}(this));

/*jslint browser: true */
// Stat.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('./Monitor'),
      // Raw events on the server (for speed), backbone events on the browser (for functionality)
      EventEmitter = Monitor.commonJS ? require('events').EventEmitter.prototype : Monitor.Backbone.Events,
      _ = Monitor._,
      emittingNow = false;


  /**
  * A lightweight component for gathering and emitting application statistics
  *
  * This is both a collector and emitter for application stats.
  *
  * It's designed with low development and runtime cost in mind, encouraging
  * usage with minimum concern for overhead.
  *
  * Stat Collector
  * --------------
  *
  * As a collector, it's a place to send application stats as they're discovered.
  *
  * Example for incrementing a stat in your application:
  *
  *     var stat = require('monitor').getStatLogger('myModule');
  *     ...
  *     stat.increment('requests.inbound');
  *
  * The above is a request to increment the ```myModule.requests.inbound``` stat.
  * It peforms work only if someone is listening for that event.
  *
  * Stat Emitter
  * -------------
  * As an emitter, Stat is a place to gather stats as they're collected.
  *
  * When listening for stats, wildcards can be used to register for many stats
  * within a group. For example, the following call:
  *
  *     var Stat = require('monitor').Stat;
  *     Stat.on('myModule.*.timer', myFunction);
  *
  * Will call ```myFunction``` when all ```myModule.*.timer``` stats are emitted.
  *
  * Listeners are invoked with 4 arguments:
  *
  * - module - The statLogger module name
  * - name - The name of the stat that just fired
  * - value - The numeric value passed
  * - type - An enumeration of the types of stats:<br/>
  *   'c'  - Counter.  Add (or subtract) the value to (or from) the prior value<br/>
  *   'g'  - Gague.  Value is to be recorded as provided<br/>
  *   'ms' - Timer.  Millisecond amount of time something took.
  *
  * <h2 id="wildcards">Wildcards</h2>
  *
  * The following wildcards are allowed for registering events.  They're
  * modeled after the graphite wildcard syntax (from the
  * <a href="https://graphite.readthedocs.org/en/latest/render_api.html#paths-and-wildcards">graphite docs</a>):
  *
  * #### Delimiter
  * The period (.) character is literal, and matches name segment separators.
  *
  * #### Asterisk
  * The asterisk (*) matches zero or more characters. It is non-greedy, so you
  * can have more than one within a single path element.
  *
  * Example: servers.ix\*ehssvc\*v.cpu.total.\* will return all total CPU metrics
  * for all servers matching the given name pattern.
  *
  * An asterisk at the far right of the pattern matches everything to the right,
  * including all path segments.  For example, ```servers.*``` matches all
  * names beginning with ```servers.```.
  *
  * #### Character list or range
  * Characters in square brackets ([...]) specify a single character position in
  * the path string, and match if the character in that position matches one of
  * the characters in the list or range.
  *
  * A character range is indicated by 2 characters separated by a dash (-), and
  * means that any character between those 2 characters (inclusive) will match.
  * More than one range can be included within the square brackets, e.g. foo[a-z0-9]bar
  * will match foopbar, foo7bar etc..
  *
  * If the characters cannot be read as a range, they are treated as a
  * list - any character in the list will match, e.g. foo[bc]ar will match
  * foobar and foocar. If you want to include a dash (-) in your list, put
  * it at the beginning or end, so it's not interpreted as a range.
  *
  * #### Value list
  * Comma-separated values within curly braces ({foo,bar,...}) are treated as
  * value lists, and match if any of the values matches the current point in
  * the path. For example, servers.ix01ehssvc04v.cpu.total.{user,system,iowait}
  * will match the user, system and I/O wait total CPU metrics for the specified
  * server.
  *
  * #### Javascript Regex
  * For finer grained expression matching, a javascript style regex can be
  * specified using the ```/.../``` syntax.  This style spans the entire identifier.
  * You can ignore case using the ```/.../i``` syntax.  If the first character of the
  * string is a slash, it considers the string a javascript regular expression.
  *
  * Choosing Good Names
  * -------------------
  * It's a good idea to pick a good naming scheme with each dot-delimited segment
  * having a consistent, well-defined purpose.  Volatile segments should be as deep
  * into the hierarchy (furthest right) as possible.  Keeping the names less
  * volatile makes it easier to turn recording on for all statistics.
  *
  * @class Stat
  * @constructor
  */
  var Stat = Monitor.Stat = function(module) {
    var t = this;
    t.module = module;
  };
  var proto = Stat.prototype;

  // This is a map of registered event names to compiled regexs, for
  // quickly testing if a statistic needs to be emitted.
  Stat.eventRegex = {};

  /**
  * Increment a counter by a specified value
  *
  * Assuming someone is listening to this stat, this is an instruction for that
  * listener to add the specified value (usually 1) to their prior value for this stat.
  *
  * This is known as server-side setting, as the server (listener) is responsible
  * for maintaining the prior and new value for the stat.
  *
  * @method increment
  * @param name {String} Dot.separated name of the counter to increment
  * @param [value=1] {Number} Amount to increment the counter by.
  */
  proto.increment = function(name, value){
    value = _.isNumber(value) ? value : 1;
    Stat._emit(this.module, name, value, 'c');
  };

  /**
  * Decrement a counter by a specified value
  *
  * Assuming someone is listening to this stat, this is an instruction for that
  * listener to subtract the specified value (usually 1) to their prior value for this stat.
  *
  * This is known as server-side setting, as the server (listener) is responsible
  * for maintaining the prior and new value for the stat.
  *
  * @method decrement
  * @param name {String} Dot.separated name of the counter to decrement
  * @param [value=1] {Number} Amount to decrement the counter by.
  */
  proto.decrement = function(name, value){
    value = _.isNumber(value) ? value : 1;
    Stat._emit(this.module, name, value * -1, 'c');
  };

  /**
  * Set the stat to the specified value
  *
  * This is an instruction to any (all) listener(s) to set the stat to a
  * specific value.
  *
  * This is known as client-side setting, because the client determines the value
  * of the stat.
  *
  * @method gauge
  * @param name {String} Dot.separated name of the stat
  * @param value {Number} Number to set the gauge to
  */
  proto.gauge = function(name, value){
    Stat._emit(this.module, name, value, 'g');
  };

  /**
  * Record the specified duration (in milliseconds) for the stat
  *
  * This is like Stat.gauge() in that it is a client-side setting of a
  * specified value.  The difference is the scale of the value is specified
  * as milliseconds.
  *
  * This may be one of the most widely used stat methods.  It can (should?) be
  * used upon callback from asynchronous methods.
  *
  * Pattern:
  *
  *     var stat = require('monitor').getStatLogger('myModule');
  *     ...
  *     var stamp = Date.now();
  *     SomeAsyncFunction(arg1, function(error) {
  *       stat.time('SomeAsyncFunction.time', Date.Now() - stamp);
  *       ...continue with error handling & callback handling
  *     });
  *
  * @method time
  * @param name {String} Dot.separated name of the stat
  * @param duration {Integer} Number of milliseconds this stat took to complete
  */
  proto.time = function(name, duration){
    Stat._emit(this.module, name, duration, 'ms');
  };

  /**
  * Send the stat to all registered listeners
  *
  * @private
  * @static
  * @method emit
  * @param module {String} Module name
  * @param name {String} Stat name
  * @param value {Numeric} Stat value
  * @param type {String} Enumeration.  One of the following:
  *   'c'  - Counter.  + values increment, - values decrement
  *   'g'  - Gague.  Statistic is recorded as provided
  *   'ms' - Timer.  Millisecond amount of time something took
  */
  Stat._emit = function(module, name, value, type) {
    var eventName,
        fullName;

    // Prevent stat recursion. This has the effect of disabling all stats
    // for stat handlers (and their downstream effect), but is necessary to
    // prevent infinite recursion.  If it's desired to stat the output of
    // stat handlers, then delay that processing until nextTick.
    if (emittingNow) {
      return;
    }
    emittingNow = true;

    // Test the name against all registered events
    for (eventName in Stat._events) {

      // Build the full name only if someone is listening
      if (!fullName) {
        fullName = module + '.' + name;
      }

      // Get the regex associated with the name
      var regex = Stat.eventRegex[eventName];
      if (!regex) {
        regex = Stat.eventRegex[eventName] = Stat._buildRegex(eventName);
      }

      // Test the name with the regex, and emit if it matches
      if (regex.test(fullName)) {
        Stat.emit(eventName, module, name, value, type);
      }
    }

    // Turn off recursion prevention
    emittingNow = false;
  };

  /**
  * Build a regex from a user entered string following the pattern described
  * in the class definition.  Loosely:
  *
  *    If it looks like a JS regexp, process it as a regexp
  *    Change all '.' to '\.'
  *    Change all '*' to '[^\.]*' (unless it's at the end, then convert to '.*')
  *    Change all {one,two} to (one|two)
  *    Leave all [...] alone - they work as-is
  *
  *  If an error occurs, throw an exception
  *
  * @private
  * @static
  * @method _buildRegex
  * @param str {String} String to build the regular expression from
  * @return {RegExp}The regular expression object
  *
  */
  Stat._buildRegex = function(str) {
    var regexStr = '',
        modifier = '',
        lastIdx = str.length - 1,
        inSquiggly = false;

    // Javascript regular expressions
    if (/^\/[^\/]*\/i*$/.test(str)) {
      if (/i$/.test(str)) {
        modifier = 'i';
        str = str.replace(/i$/,'');
      }
      regexStr = '^' + str.replace(/^\//,'').replace(/\/$/,'') + '$';
    }

    // Process character by character
    else {
      for (var i = 0, l = str.length; i < l; i++) {
        var c = str.substr(i,1);
        switch (c) {
          case '.':
            c = '\\.';
            break;
          case '*':
            c = (i === lastIdx ? '.*' : '[^\\.]*');
            break;
          case '{':
            c = '(';
            inSquiggly = true;
            break;
          case '}':
            c = ')';
            inSquiggly = false;
            break;
          case ',':
            if (inSquiggly) {
              c = '|';
            }
            break;
        }
        regexStr += c;
      }

      // Force it to match the full string
      regexStr = '^' + regexStr + '$';
    }

    // Now build the regex.  This throws an exception if poorly formed.
    return new RegExp(regexStr, modifier);
  };

  // Mixin event processing for the Stat class
  _.extend(Stat, EventEmitter);

  // Expose this class from the Monitor module
  Monitor.setStatLoggerClass(Stat);

}(this));

/*jslint browser: true */
// Log.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('./Monitor'),
      // Raw events on the server (for speed), backbone events on the browser (for functionality)
      EventEmitter = Monitor.commonJS ? require('events').EventEmitter.prototype : Monitor.Backbone.Events,
      Stat = Monitor.Stat,
      stat = new Stat('Log'),
      _ = Monitor._,
      emittingNow = false;

  /**
  * A lightweight component for gathering and emitting application logs
  *
  * It's designed with low development and runtime cost in mind, encouraging
  * usage with minimum concern for overhead.  Runtime monitoring can be as chatty
  * as desired, outputting every log statement of every type, or finely tuned
  * with regular expressions to monitor specific log statements.
  *
  * Log Collector
  * -------------
  *
  * As a collector, it's a place to send application logs.
  *
  * Example for outputting a log in your application:
  *
  *     var log = require('monitor').getLogger('myModule');
  *     ...
  *     log.info('Credit limit accepted', limit, requestedAmount);
  *
  * The above is a request to output an ```info``` log for ```myModule``` named
  * ```Credit limit accepted```.  The log entry includes all additional parameters,
  * in this case the customer credit limit and the reqeusted amount.
  *
  * The full name for this log entry is: ```"info.myModule.Credit limit accepted"```
  * The name is important, as monitors can be configured to output logs based
  * on this name.
  *
  * Best practices are to include dynamic parameters in extra arguments
  * vs. concatenating strings.  This reduces logging overhead, especially
  * for log statements that aren't currently being watched.
  *
  * Log Emitter
  * -----------
  * As an emitter, the Log module is a place to capture logging output.
  *
  * When listening for log entries, wildcards can be used to register for
  * particular log types and entries.
  *
  *     var Log = require('monitor').Log;
  *     ...
  *     Log.on('info.myModule.*', myFunction);
  *
  * Will call ```myFunction``` when all ```info.myModule.*``` logs are emitted.
  *
  * Listeners are invoked with the following arguments:
  *
  * - type - The log type (trace, debug, info, warn, error, or fatal)
  * - module - The logger module name
  * - name - The log entry name
  * - args... - Additional arguments passed into the log entry are passed on
  *             as additional args to the event listener.
  *
  * Wildcards
  * ---------
  * A flexible and user-oriented wildcard pattern is used for monitoring
  * logs.  The pattern is described in the <a href="Stat.html#wildcards">Wildcard secttion of the Stats class</a>.
  *
  * Choosing Good Names
  * -------------------
  * It's a good idea to pick a good naming scheme with each dot-delimited segment
  * having a consistent, well-defined purpose.  Volatile segments should be as deep
  * into the hierarchy (furthest right) as possible.  Keeping the names less
  * volatile makes it easier to turn statistics recording on for all logs.
  *
  * @class Log
  * @constructor
  */
  var Log = Monitor.Log = function(module) {
    var t = this;
    t.module = module;
  };
  var proto = Log.prototype;

  // This is a map of registered event names to compiled regexs, for
  // quickly testing if a log needs to be emitted.
  Log.eventRegex = {};

  /**
  * Output a ```trace``` log entry
  *
  * @method trace
  * @param name {String} Log entry name
  * @param [...] {Any} Subsequent arguments to add to the log
  */

  /**
  * Output a ```debug``` log entry
  *
  * @method debug
  * @param name {String} Log entry name
  * @param [...] {Any} Subsequent arguments to add to the log
  */

  /**
  * Output a ```info``` log entry
  *
  * @method info
  * @param name {String} Log entry name
  * @param [...] {Any} Subsequent arguments to add to the log
  */

  /**
  * Output a ```warn``` log entry
  *
  * @method warn
  * @param name {String} Log entry name
  * @param [...] {Any} Subsequent arguments to add to the log
  */

  /**
  * Output a ```error``` log entry
  *
  * @method error
  * @param name {String} Log entry name
  * @param [...] {Any} Subsequent arguments to add to the log
  */

  /**
  * Output a ```fatal``` log entry
  *
  * @method fatal
  * @param name {String} Log entry name
  * @param [...] {Any} Subsequent arguments to add to the log
  */

  // Add a method for each log type
  ['trace','debug','info','warn','error','fatal'].forEach(function(method) {
    proto[method] = function(name) {
      Log._emit(method, this.module, name, arguments);
    };
  });

  /**
  * Send the log to all registered listeners
  *
  * @private
  * @static
  * @method emit
  * @param type {string} The log type (trace, debug, info, etc)
  * @param module {String} The log module name
  * @param name {String} The log entry name
  * @param args {any[]} Arguments to the log entry
  */
  Log._emit = function(type, module, name, args) {
    var eventName,
        fullName = type + '.' + module + '.' + name;

    // Prevent log recursion. This has the effect of disabling all logging
    // for log handlers (and their downstream effect), but is necessary to
    // prevent infinite recursion.  If it's desired to log the output of
    // log handlers, then delay that processing until nextTick.
    if (emittingNow) {
      return;
    }
    emittingNow = true;

    // Output a counter stat for this log
    stat.increment(fullName);

    // Test the name against all registered events
    for (eventName in Log._events) {

      // Get the regex associated with the name (using the Stat package)
      var regex = Log.eventRegex[eventName];
      if (!regex) {
        regex = Log.eventRegex[eventName] = Stat._buildRegex(eventName);
      }

      // Test the long name with the regex, and emit if it matches
      if (regex.test(fullName)) {

        // Build the arguments as event name, log type, module, name, [other args...]
        var allArgs = _.toArray(args),
            emitFn = Log.emit || Log.trigger; // NodeJS/server=emit, Backbone/browser=trigger
        allArgs.splice(0, 1, eventName, type, module, name);
        emitFn.apply(Log, allArgs);
      }
    }

    // Turn off recursion prevention
    emittingNow = false;
  };

  // Mixin event processing for the Log class
  _.extend(Log, EventEmitter);

  // Expose this class from the Monitor module
  Monitor.setLoggerClass(Log);

  /**
  * Output log statements to the console
  *
  * This method can be used as a listener to send logs to the console.
  *
  * It uses console.error() for error and fatal log types, and console.log()
  * for all other log types.
  *
  * Example:
  *
  *     var Log = Monitor.Log;
  *     Log.on('*.MyModule.*', Log.console);
  *
  * @static
  * @method consoleLogger
  * @param type {string} The log type (trace, debug, info, etc)
  * @param module {String} The log module name
  * @param name {String} The log entry name
  * @param args {any...} All original, starting with the short name
  */
  Log.console = function(type, module, name) {

    // Build the string to log, in log4js format
    var nowStr = (new Date()).toJSON(),
        args = _.toArray(arguments),
        logStr = '[' + nowStr + '] [' + type.toUpperCase() + '] ' + module;

    // Remove the type, module, name leaving the args to the log
    args.splice(0,3);

    // If no args, then they didn't provide a name
    if (args.length === 0) {
      args = [name];
    }
    else {
      // Add the log entry name
      logStr += '.' + name;
    }

    // If the output is simple, just print it.  Otherwise JSON.stringify it.
    logStr += ' - ';
    if (args.length === 1 && typeof args[0] === 'string') {
      logStr += args[0];
    }
    else {
      try {
        logStr += JSON.stringify(args);
      } catch(e) {
        logStr += Monitor.stringify(args);
      }
    }

    // Send to the console - Log or error
    if (type === 'error' || type === 'fatal') {
      console.error(logStr);
    }
    else {
      console.log(logStr);
    }

  };

  // Attach the console log listener
  var pattern = Monitor.Config.Monitor.consoleLogListener.pattern;
  if (pattern) {
    Log.on(pattern, Log.console);
  }

}(this));

// Probe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('./Monitor'),
      log = Monitor.getLogger('Probe'),
      stat = Monitor.getStatLogger('Probe'),
      Cron = Monitor.Cron, _ = Monitor._, Backbone = Monitor.Backbone;

  /**
  * A software device used to expose real time data to monitors
  *
  * This is the base class from which all probe implementations extend.
  *
  * In order to send probe data to monitors, probe implementations simply set
  * their model data using ```set()```.  Those changes are detected and propagated
  * to all monitors of this probe, firing their change events.
  *
  * In order to allow remote probe control, probes need only provide a method
  * called ```{name}_control()```.  See the ```ping_control()``` method as an example,
  * and the ```Probe.onControl()``` method for more information.
  *
  * @class Probe
  * @extends Backbone.Model
  * @constructor
  * @param model - Initial data model.  Can be a JS object or another Model.
  *     @param model.id {String} The probe id.
  *       Assigned by the <a href="Router.html">Router</a> on probe instantiation.
  */
  var Probe = Monitor.Probe = Backbone.Model.extend({

    defaults: {
      id:  null
    },

    /**
    * Initialize the probe
    *
    * This is called on the probe during construction.  It contains
    * the probe initialization attributes and an option to make probe
    * construction asynchronous.
    *
    * Probe implementations can defer the initial response to the monitor until
    * the initial state is loaded.  This allows the callback on
    * <a href="Monitor.html#method_connect">```Monitor.connect()```</a>
    * to have the complete initial state of the probe when called.
    *
    * If the initial probe state cannot be determined in ```initialize```, it should
    * set the ```options.asyncInit``` option to ```true```, and call the
    * ```options.callback(error)``` once the initial state is determined.
    *
    *     // Asynchronous initialization
    *     options.asyncInit = true;
    *     var callback = options.callback
    *
    * If ```asyncInit``` is set to true, the ```callback``` must be called once
    * the initial state of the probe is known (or in an error condition).
    *
    *     // Set the initial state, and call the callback
    *     this.set(...);
    *     callback(null);
    *
    * See the <a href="../files/lib_probes_FileProbe.js.html#l47">```initialize```</a>
    * method of the <a href="FileProbe.html">FileProbe</a> probe for an example.  It defers
    * returning the probe to the monitor until the initial file contents are loaded.
    *
    * @method initialize
    * @param attributes {Object} Initial probe attributes sent in from the Monitor
    * @param options {Object} Initialization options
    *     @param options.asyncInit {boolean} Set this to TRUE if the initial probe
    *         state can't be known immediately.
    *     @param options.callback {function(error)} The callback to call
    *         if asyncInit is set to true.  If an error is passed, the probe
    *         will not be used.
    */
    initialize: function(attributes, options) {
      var t = this;
      log.info('init', t.toJSON(), options);
    },

    /**
    * Release any resources consumed by this probe.
    *
    * This can be implemented by derived classes that need to be informed when
    * they are to be shut down.
    *
    * Probes that listen to events should use this method to remove their
    * event listeners.
    *
    * @method release
    */
    release: function(){
      var t = this;
      log.info('release', t.toJSON());
    },

    /**
    * Dispatch a control message to the appropriate control function.
    *
    * This is called when the
    * <a href="Monitor.html#method_control">```control()```</a>
    * method of a monitor is called.
    * The name determines the method name called on the probe.
    *
    * The probe must implement a method with the name ```{name}_control()```,
    * and that method must accept two parameters - an input params and a callback.
    * The callback must be called, passing an optional error and response object.
    *
    * For example, if the probe supports a control with the name ```go```, then
    * all it needs to do is implement the ```go_control()``` method with the
    * proper signature.  See ```ping_control()``` for an example.
    *
    * @method onControl
    * @param name {String} Name of the control message.
    * @param [params] {Any} Input parameters specific to the control message.
    * @param [callback] {Function(error, response)} Called to send the message (or error) response.
    * <ul>
    *   <li>error (Any) An object describing an error (null if no errors)</li>
    *   <li>response (Any) Response parameters specific to the control message.
    * </ul>
    */
    onControl: function(name, params, callback) {
      var t = this,
          controlFn = t[name + '_control'],
          startTime = Date.now(),
          errMsg,
          logId = 'onControl.' + t.probeClass + '.' + name;

      params = params || {};
      callback = callback || function(){};
      log.info(logId, t.get('id'), params);

      if (!controlFn) {
        errMsg = 'No control function: ' + name;
        log.error(logId, errMsg);
        return callback({msg: errMsg});
      }

      var whenDone = function(error) {
        if (error) {
          log.error(logId + '.whenDone', error);
          return callback(error);
        }
        var duration = Date.now() - startTime;
        log.info(logId, params);
        stat.time(t.logId, duration);
        callback.apply(null, arguments);
      };

      // Run the control on next tick.  This provides a consistent callback
      // chain for local and remote probes.
      setTimeout(function(){
        try {
          controlFn.call(t, params, whenDone);
        } catch (e) {
          errMsg = 'Error calling control: ' + t.probeClass + ':' + name;
          whenDone({msg:errMsg, err: e.toString()});
        }
      }, 0);
    },

    /**
    * Remotely set a probe attribute.
    *
    * This allows setting probe attributes that are listed in writableAttributes.
    * It can be overwritten in derived Probe classes for greater control.
    *
    * @method set_control
    * @param attrs {Object} Name/Value attributes to set.  All must be writable.
    * @param callback {Function(error)} Called when the attributes are set or error
    */
    set_control: function(attrs, callback) {
      var t = this,
          writableAttributes = t.get('writableAttributes') || [];

      // Validate the attributes are writable
      if (writableAttributes !== '*') {
        for (var attrName in attrs) {
          if (writableAttributes.indexOf(attrName) < 0) {
            return callback({code:'NOT_WRITABLE', msg: 'Attribute not writable: ' + attrName});
          }
        }
      }

      // Set the data
      var error = null;
      if (!t.set(attrs)) {
        error = {code:'VALIDATION_ERROR', msg:'Data set failed validation'};
        log.warn('set_control', error);
      }
      return callback(error);
    },

    /**
    * Respond to a ping control sent from a monitor
    *
    * @method ping_control
    * @param params {Object} Input parameters (not used)
    * @param callback {Function(error, response)} Called to send the message (or error) response.
    * <ul>
    *   <li>error (Any) An object describing an error</li>
    *   <li>response (String) The string 'pong' is returned as the response</li>
    * </ul>
    */
    ping_control: function(params, callback) {
      return callback(null, 'pong');
    }

  });

  // Register probe classes when loaded
  Probe.classes = {}; // key = name, data = class definition
  Probe.extend = function(params) {
    var t = this, probeClass = Backbone.Model.extend.apply(t, arguments);
    if (params.probeClass) {Probe.classes[params.probeClass] = probeClass;}
    return probeClass;
  };

  /**
  * Constructor for a list of Probe objects
  *
  *     var myList = new Probe.List(initialElements);
  *
  * @static
  * @method List
  * @param [items] {Array} Initial list items.  These can be raw JS objects or Probe data model objects.
  * @return {Backbone.Collection} Collection of Probe data model objects
  */
  Probe.List = Backbone.Collection.extend({model: Probe});

}(this));

// Connection.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('./Monitor'),
      Cron = Monitor.Cron, _ = Monitor._, Backbone = Monitor.Backbone,
      log = Monitor.getLogger('Connection'),
      stat = Monitor.getStatLogger('Connection'),
      Config = Monitor.Config, SocketIO = root.io || require('socket.io-client'),
      Probe = Monitor.Probe,
      nextConnectionNum = 1;

  /**
  * Core monitor classes
  *
  * Classes in this module represent baseline monitor functionality.  They can
  * be loaded and run in a node.js container as well as within a browser.
  *
  * @module Monitor
  */

  /**
  * Connection with a remote process
  *
  * Instances of this class represent a connection with a remote monitor
  * process.  The remote process is a peer of this process - it may produce
  * and/or consume probe information.
  *
  * This is an internal class created when a connection to a server is
  * requested from a monitor, or when an external connection is made from
  * a <a href="Server.html">Server</a> instance.
  *
  * @class Connection
  * @extends Backbone.Model
  * @constructor
  * @param model - Initial data model.  Can be a JS object or another Model.
  *   @param [model.hostName] {String} The host name to connect with. Used if url isn't present.
  *   @param [model.hostPort] {Number} The host port to connect using. Used if url isn't present.
  *   @param [model.url] {String} The URL used to connect. Built if hostName is supplied.
  *   @param [model.socket] {io.socket} Use this pre-connected socket instead of creating a new one.
  *   @param [model.gateway=false] {Boolean} Allow this connection to use me as a gateway?  See <code><a href="Router.html#method_setGateway">Router.setGateway()</a></code>
  *   @param [model.firewall=false] {Boolean} Firewall inbound probe requests on this connection?
  *   @param [model.remoteHostName] {String READONLY} Host name given by the remote server.
  *   @param [model.remoteAppName] {String READONLY} App name given by the remote server.
  *   @param [model.remoteAppInstance] {Integer READONLY} The remote application instance ID running on the host.
  *   @param [model.remotePID] {String READONLY} Remote process ID.
  *   @param [model.remoteProbeClasses] {Array of String READONLY} Array of probe classes available to the remote server.
  *   @param [model.remoteGateway] {Boolean READONLY} Can the remote process act as a gateway?
  *   @param [model.remoteFirewall] {Boolean READONLY} Is the remote side firewalled from inbound probe requests?
  */

  /**
  * Connected to remote monitor process
  *
  * This event is emitted after the two sides of the connection have exchanged
  * information about themselves.
  *
  * @event connect
  */
  var Connection = Monitor.Connection = Backbone.Model.extend({

    defaults:  {
      hostName: '',
      hostPort: null,
      url: null,
      socket: null,
      gateway: false,
      firewall: false,
      remoteHostName: null,
      remoteAppName: null,
      remoteAppInstance: 0,
      remotePID: 0,
      remoteProbeClasses: [],
      remoteGateway: false,
      remoteFirewall: false
    },

    initialize: function(params) {
      var t = this;
      t.connecting = true;          // Currently connecting?
      t.connected = false;          // Currently connected?
      t.socketEvents = null;        // Key = event name, data = handler function
      t.remoteProbeIdsByKey = {};   // Key = probeKey, data = probeId
      t.remoteProbesById = {};      // Key = probeId, data = {Probe proxy}
      t.incomingMonitorsById = {};  // Key = probeId, data = {Monitor proxy}

      // Create a connection ID for logging
      t.logId = (nextConnectionNum++) + '.';

      // Either connect to an URL or with an existing socket
      if (params.socket) {
        t.bindConnectionEvents();
        log.info(t.logId + 'connect', {socketId:params.socket.id});
      }
      else if (params.url || (params.hostName && params.hostPort)) {
        t.connect();
        log.info(t.logId + 'connect', {url:t.get('url')});
      }
      else {
        log.error('init', 'Connection must supply a socket, url, or host name/port');
      }
    },

    // Initiate a connection with a remote server
    connect: function() {
      var t = this, hostName = t.get('hostName'), hostPort = t.get('hostPort'),
      url = t.get('url');

      // Build the URL if not specified
      if (!url) {
        url = t.attributes.url = 'http://' + hostName + ':' + hostPort;
        t.set('url', url);
      }

      // Connect with this url
      var opts = {
        // 'transports': ['websocket', 'xhr-polling', 'jsonp-polling'],
        'force new connection': true,      // Don't re-use existing connections
        'reconnect': false                 // Don't let socket.io reconnect.
                                           // Reconnects are performed by the Router.
      };
      var socket = SocketIO.connect(url, opts);
      t.set({socket:socket}).bindConnectionEvents();
    },

    /**
    * Ping a remote connection
    *
    * @method ping
    * @param callback {Function(error)} Callback when response is returned
    */
    ping: function(callback) {
      var t = this;
      callback = callback || function(){};
      var onPong = function() {
        t.off('pong', onPong);
        callback();
      };
      t.on('pong', onPong);
      t.emit('connection:ping');
    },

    /**
    * Disconnect from the remote process
    *
    * This can be called from the underlying transport if it detects a disconnect,
    * or it can be manually called to force a disconnect.
    *
    * @method disconnect
    * @param reason {String} Reason for the disconnect
    */
    /**
    * <strong>Disconnected from a remote monitor process</strong>
    *
    * This event is emitted after the remote connection is disconnected and
    * resources released.
    *
    * @event disconnect
    * @param reason {String} Reason for the disconnect
    */
    disconnect: function(reason) {
      var t = this, socket = t.get('socket');
      t.connecting = false;
      t.connected = false;

      // Only disconnect once.
      // This method can be called many times during a disconnect (manually,
      // by socketIO disconnect, and/or by the underlying socket disconnect).
      if (t.socketEvents) {
        t.removeAllEvents();
        socket.disconnect();
        t.trigger('disconnect', reason);
        log.info(t.logId + 'disconnect', reason);
      }
    },

    /**
    * Is this connection with the specified host?
    *
    * @method isThisHost
    * @protected
    * @param hostName {String} The host name to check
    * @return withHost {Boolean} True if the connection is with this host
    */
    isThisHost: function(hostName) {
      var t = this, testHost = hostName.toLowerCase(),
          myHostName = t.get('hostName'), remoteHostName = t.get('remoteHostName');
      myHostName = myHostName && myHostName.toLowerCase();
      remoteHostName = remoteHostName && remoteHostName.toLowerCase();
      return (testHost === myHostName || testHost ===  remoteHostName);
    },

    /**
    * Emit the specified message to the socket.
    *
    * The other side of the connection can handle and respond to the message
    * using the 'on' method.
    *
    * @method emit
    * @protected
    * @param name {String} The message name to send
    * @param args... {Mixed} Variable number of arguments to send with the message
    * @param callback {Function} Called when remote sends a reply
    */
    emit: function() {
      var t = this, socket = t.get('socket');
      log.info(t.logId + 'emit', Monitor.deepCopy(arguments, 5));
      socket.emit.apply(socket, arguments);
    },

    /**
    * Bind the specified handler to the remote socket message.
    *
    * Only a single handler (per message name) can be bound using this method.
    *
    * @method addEvent
    * @protected
    * @param eventName {String} The event name to handle
    * @param handler {Function (args..., callback)} Called when the message is received.
    * <ul>
    *   <li>args... {Mixed} Arguments sent in by the remote client</li>
    *   <li>callback {Function} Final arg if the client specified a callback</li>
    * </ul>
    */
    addEvent: function(eventName, handler) {
      var t = this, socket = t.get('socket');
      t.socketEvents = t.socketEvents || {};
      if (t.socketEvents[eventName]) {
        throw new Error('Event already connected: ' + eventName);
      }
      socket.on(eventName, handler);
      t.socketEvents[eventName] = handler;
      return t;
    },

    // Remove the specified event from the socket
    removeEvent: function(eventName) {
      var t = this, socket = t.get('socket');
      if (t.socketEvents && t.socketEvents[eventName]) {
        socket.removeListener(eventName, t.socketEvents[eventName]);
        delete t.socketEvents[eventName];
      }
      return t;
    },

    // Remove all events bound to the socket
    removeAllEvents: function() {
      var t = this, socket = t.get('socket');
      for (var event in t.socketEvents) {
        socket.removeListener(event, t.socketEvents[event]);
      }
      t.socketEvents = null;
      return t;
    },

    /**
    * An error has occurred on the connection
    *
    * This event is triggered when an error occurs on the connection.  Errors
    * may occur when network is unstable, and can be an indication of impending
    * disconnection.
    *
    * @event error
    * @param err {Object} Reason for the error (from underlying transport)
    */
    bindConnectionEvents: function() {
      var t = this, socket = t.get('socket');
      if (t.socketEvents) {throw new Error('Already connected');}
      t.socketEvents = {};  // key = event name, data = handler

      // Failure events
      t.addEvent('connect_failed', function(){
        t.trigger('error', 'connect failed');
        t.disconnect('connect failed');
      });
      t.addEvent('disconnect', function(){t.disconnect('remote_disconnect');});
      t.addEvent('error', function(reason){
        t.trigger('error', reason);
        t.disconnect('connect error');
      });

      // Inbound probe events
      t.addEvent('probe:connect', t.probeConnect.bind(t));
      t.addEvent('probe:disconnect', t.probeDisconnect.bind(t));
      t.addEvent('probe:control', t.probeControl.bind(t));

      // Connection events
      t.addEvent('connection:ping', function(){socket.emit('connection:pong');});
      t.addEvent('connection:pong', function(){t.trigger('pong');});

      // Connected once remote info is known
      t.addEvent('connection:info', function (info) {
        t.set({
          remoteHostName: info.hostName,
          remoteAppName: info.appName,
          remoteAppInstance: info.appInstance,
          remotePID: info.pid,
          remoteProbeClasses: info.probeClasses,
          remoteGateway: info.gateway,
          remoteFirewall: info.firewall
        });
        t.connecting = false;
        t.connected = true;
        t.trigger('connect');
      });

      // Determine the process id
      var pid = typeof process === 'undefined' ? 1 : process.pid;

      // Determine the app instance
      var appInstance = '' + (typeof process === 'undefined' ? pid : process.env.NODE_APP_INSTANCE || pid);

      // Exchange connection information
      socket.emit('connection:info', {
        hostName:Monitor.getRouter().getHostName(),
        appName:Config.Monitor.appName,
        appInstance: appInstance,
        pid: pid,
        probeClasses: _.keys(Probe.classes),
        gateway:t.get('gateway'),
        firewall:t.get('firewall')
      });
    },

    /**
    * Process an inbound request to connect with a probe
    *
    * This will fail if this connection was created as a firewall.
    *
    * @method probeConnect
    * @protected
    * @param monitorJSON {Object} Probe connection parameters, including:
    *     @param monitorJSON.probeClass {String} The probe class
    *     @param monitorJSON.initParams {Object} Probe initialization parameters
    *     @param monitorJSON.hostName {String} Connect with this host (if called as a gateway)
    *     @param monitorJSON.appName {String} Connect with this app (if called as a gateway)
    * @param callback {Function(error, probeJSON)} Callback function
    */
    probeConnect: function(monitorJSON, callback) {
      callback = callback || function(){};
      var t = this,
          errorText = '',
          router = Monitor.getRouter(),
          gateway = t.get('gateway'),
          startTime = Date.now(),
          firewall = t.get('firewall'),
          logCtxt = _.extend({}, monitorJSON);

      // Don't allow inbound requests if this connection is firewalled
      if (firewall) {
        errorText = 'firewalled';
        log.error('probeConnect', errorText, logCtxt);
        return callback(errorText);
      }

      // Determine the connection to use (or internal)
      router.determineConnection(monitorJSON, gateway, function(err, connection) {
        if (err) {return callback(err);}
        if (connection && !gateway) {return callback('Not a gateway');}

        // Function to run upon connection (internal or external)
        var onConnect = function(error, probe) {

          if (error) {
            log.error(t.logId + 'probeConnect', error, logCtxt);
            return callback(error);
          }

          // Get probe info
          var probeId = probe.get('id');
          logCtxt.id = probeId;

          // Check for a duplicate proxy for this probeId.  This happens when
          // two connect requests are made before the first one completes.
          var monitorProxy = t.incomingMonitorsById[probeId];
          if (monitorProxy != null) {
            probe.refCount--;
            logCtxt.dupDetected = true;
            logCtxt.refCount = probe.refCount;
            log.info(t.logId + 'probeConnected', logCtxt);
            return callback(null, monitorProxy.probe.toJSON());
          }

          // Connect the montior proxy
          monitorProxy = new Monitor(monitorJSON);
          monitorProxy.set('probeId', probeId);
          t.incomingMonitorsById[probeId] = monitorProxy;
          monitorProxy.probe = probe;
          monitorProxy.probeChange = function(){
            try {
              t.emit('probe:change:' + probeId, probe.changedAttributes());
            }
            catch (e) {
              log.error('probeChange', e, probe, logCtxt);
            }
          };
          probe.connectTime = Date.now();
          var duration = probe.connectTime - startTime;
          logCtxt.duration = duration;
          logCtxt.refCount = probe.refCount;
          log.info(t.logId + 'probeConnected', logCtxt);
          stat.time(t.logId + 'probeConnected', duration);
          callback(null, probe.toJSON());
          probe.on('change', monitorProxy.probeChange);

          // Disconnect the probe on connection disconnect
          t.on('disconnect', function() {
            t.probeDisconnect({probeId:probeId});
          });
        };

        // Connect internally or externally
        if (connection) {
          router.connectExternal(monitorJSON, connection, onConnect);
        } else {
          router.connectInternal(monitorJSON, onConnect);
        }
      });
    },

    /**
    * Process an inbound request to disconnect with a probe
    *
    * @method probeDisconnect
    * @protected
    * @param params {Object} Disconnect parameters, including:
    *   probeId {String} The unique probe id
    * @param callback {Function(error)} Callback function
    */
    probeDisconnect: function(params, callback) {
      callback = callback || function(){};
      var t = this,
          errorText = '',
          router = Monitor.getRouter(),
          probeId = params.probeId,
          monitorProxy = t.incomingMonitorsById[probeId],
          firewall = t.get('firewall'),
          logCtxt = null,
          probe = null;

      // Already disconnected
      if (!monitorProxy || !monitorProxy.probe) {
        return callback(null);
      }

      // Get a good logging context
      probe = monitorProxy.probe;
      logCtxt = {
        probeClass: monitorProxy.get('probeClass'),
        initParams: monitorProxy.get('initParams'),
        probeId: probeId
      };

      // Called upon disconnect (internal or external)
      var onDisconnect = function(error) {
        if (error) {
          log.error(t.logId + 'probeDisconnect', error);
          return callback(error);
        }
        var duration = logCtxt.duration = Date.now() - probe.connectTime;
        probe.off('change', monitorProxy.probeChange);
        monitorProxy.probe = monitorProxy.probeChange = null;
        delete t.incomingMonitorsById[probeId];
        log.info(t.logId + 'probeDisconnected', logCtxt);
        stat.time(t.logId + 'probeDisconnected', duration);
        return callback(null);
      };

      // Disconnect from an internal or external probe
      if (probe && probe.connection) {
        router.disconnectExternal(probe.connection, probeId, onDisconnect);
      } else {
        router.disconnectInternal(probeId, onDisconnect);
      }
    },

    /**
    * Process an inbound control request to a probe
    *
    * @method probeControl
    * @protected
    * @param params {Object} Control parameters, including:
    *   probeId {String} The unique probe id
    *   name {String} The control message name
    *   params {Object} Any control message parameters
    * @param callback {Function(error, returnParams)} Callback function
    */
    probeControl: function(params, callback) {
      callback = callback || function(){};
      var t = this,
          errorText = '',
          logId = t.logId + 'probeControl',
          startTime = Date.now(),
          router = Monitor.getRouter(),
          firewall = t.get('firewall');

      // Don't allow inbound requests if this connection is firewalled
      if (firewall) {
        errorText = 'firewalled';
        log.error(logId, errorText);
        return callback(errorText);
      }

      // Called upon return
      var onReturn = function(error) {
        if (error) {
          log.error(logId, error);
          return callback(error);
        }
        else {
          var duration = Date.now() - startTime;
          log.info(logId + '.return', {duration:duration, returnArgs: arguments});
          stat.time(logId, duration);
          return callback.apply(null, arguments);
        }
      };

      // Is this an internal probe?
      var probe = router.runningProbesById[params.probeId];
      if (!probe) {

        // Is this a remote (proxied) probe?
        var monitorProxy = t.incomingMonitorsById[params.probeId];
        if (!monitorProxy) {
          errorText = 'Probe id not found: ' + params.probeId;
          log.error(errorText);
          return callback(errorText);
        }

        // Proxying requires this form vs. callback as last arg.
        return monitorProxy.control(params.name, params.params, function(err, returnParams) {
          onReturn(err, returnParams);
        });
      }
      logId = logId + '.' + probe.probeClass + '.' + params.name;
      log.info(logId + '.request', {params:params.params, probeId:params.probeId});
      return probe.onControl(params.name, params.params, onReturn);
    }

  });

  /**
  * Constructor for a list of Connection objects
  *
  *     var myList = new Connection.List(initialElements);
  *
  * @static
  * @method List
  * @param [items] {Array} Initial list items.  These can be raw JS objects or Connection data model objects.
  * @return {Backbone.Collection} Collection of Connection data model objects
  */
  Connection.List = Backbone.Collection.extend({model: Connection});

}(this));

// Server.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('./Monitor'),
      Config = Monitor.Config, _ = Monitor._, Backbone = Monitor.Backbone,
      log = Monitor.getLogger('Server'),
      stat = Monitor.getStatLogger('Server'),
      Connection = Monitor.Connection,
      Http = Monitor.commonJS ? require('http') : null,
      SocketIO = root.io || require('socket.io');

  /**
  * A server for accepting inbound connections from remote monitors
  *
  * Servers are created when a process wants to expose probe data to remote
  * monitors.  Example:
  *
  *     // Accept remote monitors
  *     var server = new Monitor.Server();
  *     server.start();
  *
  * An instance of this class represents a listening server accepting inbound
  * connections.  As inbound connections are detected, a new
  * <a href="Connection.html">Connection</a> object is created to manage
  * traffic on that connection.
  *
  * Security:  Make sure the port range specified in Monitor.Config (starting
  * at 42000) is not exposed outside your internal network.  If you desire a
  * different security model, create your secure server and pass it to the
  * constructor.
  *
  * @class Server
  * @extends Backbone.Model
  * @constructor
  * @param model - Initial data model.  Can be a JS object or another Model.
  *     @param model.gateway {Boolean} - Allow incoming monitors to use me as a gateway (default false)
  *     @param model.server {HttpServer} - The listening node.js server.  Constructed by this class, or specified if a custom server is desired.
  *     @param model.port {Integer} - The connected port.  This is set upon start() if the server isn't specified on construction.
  */
  var Server = Monitor.Server = Backbone.Model.extend({

    initialize: function(params) {
      var t = this;
      t.isListening = false;
      t.connections = new Connection.List();
    },

    /**
    * Start accepting monitor connections
    *
    * This method starts listening for incoming monitor connections on the
    * server.
    *
    * If the server was specified during object creation, this binds the
    * socket.io service to the server.
    *
    * If the server was not specified during object creation, this will create
    * a server on the first available monitor port.
    *
    * @method start
    * @param options {Object} - Start options. OPTIONAL
    *     @param options.port {Integer} - Port to attempt listening on if server isn't specified.  Default: 42000
    *     @param options.attempt {Integer} - Attempt number for internal recursion detection.  Default: 1
    * @param callback {Function(error)} - Called when the server is accepting connections.
    */
    /**
    * The server has started
    *
    * This event is fired when the server has determined the port to accept
    * connections on, and has successfully configured the server to start
    * accepting new monitor connections.
    *
    * @event start
    */
    /**
    * A client error has been detected
    *
    * This event is fired if an error has been detected in the underlying
    * transport.  It may indicate message loss, and may result in a
    * subsequent stop event if the connection cannot be restored.
    *
    * @event error
    */
    start: function(options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = null;
      }
      options = options || {};
      callback = callback || function(){};
      var t = this, server = t.get('server'), error,
          startTime = Date.now(),
          port = options.port || Config.Monitor.serviceBasePort,
          attempt = options.attempt || 1,
          allowExternalConnections = Config.Monitor.allowExternalConnections;

      // Recursion detection.  Only scan for so many ports
      if (attempt > Config.Monitor.portsToScan) {
        error = {err:'connect:failure', msg: 'no ports available'};
        log.error('start', error);
        return callback(error);
      }

      // Bind to an existing server, or create a new server
      if (server) {
        t.bindEvents(callback);
      } else {
        server = Http.createServer();

        // Try next port if a server is listening on this port
        server.on('error', function(err) {
          if (err.code === 'EADDRINUSE') {
            // Error if the requested port is in use
            if (t.get('port')) {
              log.error('portInUse',{host:host, port:port});
              return callback({err:'portInUse'});
            }
            // Try the next port
            log.info('portInUse',{host:host, port:port});
            return t.start({port:port + 1, attempt:attempt + 1}, callback);
          }
          // Unknown error
          callback(err);
        });

        // Allow connections from INADDR_ANY or LOCALHOST only
        var host = allowExternalConnections ? '0.0.0.0' : '127.0.0.1';

        // Start listening, callback on success
        server.listen(port, host, function(){

          // Set a default NODE_APP_INSTANCE based on the available server port
          if (!process.env.NODE_APP_INSTANCE)  {
            process.env.NODE_APP_INSTANCE = '' + (port - Config.Monitor.serviceBasePort + 1);
          }

          // Record the server & port, and bind incoming events
          t.set({server: server, port: port});
          t.bindEvents(callback);
          log.info('listening', {
            appName: Config.Monitor.appName,
            NODE_APP_INSTANCE: process.env.NODE_APP_INSTANCE,
            listeningOn: host,
            port: port
          });
        });
      }
    },

    /**
    * Bind incoming socket events to the server
    *
    * This method binds to the socket events and attaches the socket.io
    * server.  It is called when the connection starts listening.
    *
    * @protected
    * @method bindEvents
    * @param callback {Function(error)} - Called when all events are bound
    */
    bindEvents: function(callback) {

      // Detect server errors
      var t = this, server = t.get('server');
      server.on('clientError', function(err){
        log.error('bindEvents', 'clientError detected on server', err);
        t.trigger('error', err);
      });
      server.on('close', function(err){
        server.hasEmittedClose = true;
        log.info('bindEvents.serverClose', 'Server has closed', err);
        t.stop();
      });

      // Start up the socket.io server.
      var socketIoParams = {
        log: false
      };
      t.socketServer = SocketIO.listen(server, socketIoParams);
      t.socketServer.sockets.on('connection', function (socket) {
        var connection = Monitor.getRouter().addConnection({
          socket: socket, gateway: t.get('gateway')
        });
        t.connections.add(connection);
        var onDisconnect = function(reason) {
          t.connections.remove(connection);
          Monitor.getRouter().removeConnection(connection);
          connection.off('disconnect', onDisconnect);
          log.info('client.disconnect', 'Disconnected client socket');
        };
        connection.on('disconnect', onDisconnect);
        log.info('client.connect', 'Connected client socket');
      });

      // Notify that we've started
      t.isListening = true;
      if (callback) {callback(null);}
      t.trigger('start');
    },

    /**
    * Stop processing inbound monitor traffic
    *
    * This method stops accepting new inbound monitor connections, and closes
    * all existing monitor connections associated with the server.
    *
    * @method stop
    * @param callback {Function(error)} - Called when the server has stopped
    */
    /**
    * The server has stopped
    *
    * This event is fired after the server has stopped accepting inbound
    * connections, and has closed all existing connections and released
    * associated resources.
    *
    * @event stop
    */
    stop: function(callback) {
      var t = this, server = t.get('server'), router = Monitor.getRouter();
      callback = callback || function(){};

      // Call the callback, but don't stop more than once.
      if (!t.isListening) {
        return callback();
      }

      // Release resources
      t.connections.each(router.removeConnection, router);
      t.connections.reset();

      // Shut down the server
      t.isListening = false;
      server.close();

      // Send notices
      t.trigger('stop');
      return callback();
    }
  });

  /**
  * Constructor for a list of Server objects
  *
  *     var myList = new Server.List(initialElements);
  *
  * @static
  * @method List
  * @param [items] {Array} Initial list items.  These can be raw JS objects or Server data model objects.
  * @return {Backbone.Collection} Collection of Server data model objects
  */
  Server.List = Backbone.Collection.extend({model: Server});

}(this));

// Router.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('./Monitor'),
      log = Monitor.getLogger('Router'),
      stat = Monitor.getStatLogger('Router'),
      Cron = Monitor.Cron, _ = Monitor._, Backbone = Monitor.Backbone,
      Config = Monitor.Config, Probe = Monitor.Probe,
      Connection = Monitor.Connection, Server = Monitor.Server,
      SocketIO = root.io || require('socket.io'),

      // Set if server-side
      hostName = Monitor.commonJS ? require('os').hostname() : null;

  // Constants
  var PROBE_TIMEOUT_MS = 10000;

  /**
  * Probe location and message routing
  *
  * The router is a class used internally to locate probes and connect
  * events so messages are correctly routed between probes and their monitors.
  *
  * It is a *singleton* class, designed to run one instance within
  * a monitor process, and accessed via the (protected) `getRouter()`
  * method of the <a href="Monitor.html">Monitor</a> object.
  *
  * It manages all outbound requests to probes, either internally or externally
  * via the <a href="Connection.html">Connection</a> to the remote process.
  *
  * @class Router
  * @extends Backbone.Model
  * @constructor
  */
  /**
  * A new connection has been established
  *
  * @event
  * connection:add
  * @param connection {Connection} The added connection
  */
  /**
  * A connection has been terminated
  *
  * @event
  * connection:remove
  * @param connection {Connection} The removed connection
  */
  var Router = Monitor.Router = Backbone.Model.extend({

    initialize: function() {
      var t = this;
      t.defaultGateway = null;
      t.firewall = false;
      t.connections = new Connection.List();
      t.runningProbesByKey = {}; // key=probeKey, data=probeImpl
      t.runningProbesById = {};  // key=probeId, data=probeImpl
      t.addHostCallbacks = {};  // key=hostName, data=[callbacks]
      log.info('init', 'Router initialized');
    },

    /**
    * Firewall new connections from inbound probe requests
    *
    * When two monitor processes connect, they become peers.  By default each
    * process can request probe connections with the other.
    *
    * If you want to connect with a remote probe, but don't want those servers
    * to connect with probes in this process, call this method to firewall
    * those inbound probe requests.
    *
    * Setting this will change the firewall value for all *new* connections.
    * Any existing connections will still accept incoming probe requests.
    *
    * @static
    * @method setFirewall
    * @param firewall {Boolean} - Firewall new connections?
    */
    setFirewall: function(firewall) {
      var t = Monitor.getRouter(); // This is a static method
      t.firewall = firewall;
      log.info('setFirewall', firewall);
    },

    /**
    * Set the default gateway server
    *
    * The gateway server is used if a monitor cannot connect directly with the
    * server hosting the probe.
    *
    * When a monitor is requested to connect with a probe on a specific server,
    * a direct connection is attempted.  If that direct connection fails, usually
    * due to a firewall or browser restriction, the monitor will attempt the
    * connection to the probe through the gateway server.
    *
    * The server specified in this method must have been started as a gateway
    * like this:
    *
    *     // Start a monitor server and act as a gateway
    *     var server = new Monitor.Server({gateway:true});
    *
    * @method setGateway
    * @param options {Object} - Connection parameters
    *   @param options.hostName {String} - Name of the gateway host
    *   @param options.hostPort {Integer} - Port number to connect with
    *   @param options.url {String} - The URL used to connect (created, or used if supplied)
    *   @param options.socket {io.socket} - Pre-connected socket.io socket to the gateway server.
    * @return connection {Connection} - The connection with the gateway server
    */
    setGateway: function(options) {
      var t = this;
      options.gateway = false;     // New connection can't be an inbound gateway
      options.firewall = true;     // Gateways are for outbound requests only
      return t.defaultGateway = t.addConnection(options);
    },

    /**
    * Return a stable host name.
    *
    * @method getHostName
    * @protected
    * @return hostName {String} - The platform's host name, or an otherwise stable ID
    */
    getHostName: function() {
      var localStorage = root.localStorage;
      if (!hostName) {
        if (localStorage) {hostName = localStorage.hostName;}
        hostName = hostName || Monitor.generateUniqueId();
        if (localStorage) {localStorage.hostName = hostName;}
      }
      return hostName;
    },

    /**
    * Set the current host name.
    *
    * This sets the host name that this router publishes to new connections.
    * It's only useful if the os hostname isn't the name you want to publish.
    *
    * @protected
    * @method setHostName
    * @param hostName {String} - The host name to publish to new connections
    */
    setHostName: function(name) {
      hostName = name;
      log.info('setHostName', name);
    },

    /**
    * Add a connection to a remote Monitor process
    *
    * @method addConnection
    * @protected
    * @param options {Object} - Connection parameters
    *   @param options.hostName {String} - Name of the host to connect with
    *   @param options.hostPort {Integer} - Port number to connect with
    *   @param options.url {String} - The URL used to connect (created, or used if supplied)
    *   @param options.socket {io.socket} - Pre-connected socket.io socket to a Monitor server.
    *   @param options.gateway {Boolean} - Allow this connection to use me as a gateway (default false)
    *   @param options.firewall {Boolean} Firewall inbound probe requests on this connection?
    * @return connection {Connection} - The added connection
    */
    addConnection: function(options) {
      var t = this,
          startTime = Date.now();

      // Default the firewall value
      if (_.isUndefined(options.firewall)) {
        options = _.extend({},options, {firewall: t.firewall});
      }

      // Generate a unique ID for the connection
      options.id = Monitor.generateUniqueCollectionId(t.connections);

      var connStr = 'Conn_' + options.id;
      if (options.hostName) {
        connStr += ' - ' + options.hostName + ':' + options.hostPort;
      }
      log.info('addConnection', connStr);

      // Instantiate and add the connection for use, once connected
      var connection = new Connection(options);

      // Add a connect and disconnect function
      var onConnect = function(){
        t.trigger('connection:add', connection);
        log.info('connected', connStr, (Date.now() - startTime) + 'ms');
      };
      var onDisconnect = function(){
        t.removeConnection(connection);
        connection.off('connect', onConnect);
        connection.off('disconnect', onConnect);
        log.info('disconnected', connStr, (Date.now() - startTime) + 'ms');
      };
      connection.on('connect', onConnect);
      connection.on('disconnect', onDisconnect);

      // Add to the connections
      t.connections.add(connection);
      return connection;
    },

    /**
    * Remove a connection from the router.
    *
    * This is called to remove the connection and associated routes from the router.
    *
    * @method removeConnection
    * @protected
    * @param connection {Connection} - The connection to remove
    */
    removeConnection: function(connection) {
      var t = this;
      log.info('removeConnection', 'Conn_' + connection.id);
      connection.disconnect('connection_removed');
      t.connections.remove(connection);
      t.trigger('connection:remove', connection);
    },

    /**
    * Connect a Monitor object to a remote Probe
    *
    * This accepts an instance of a Monitor and figures out how to connect it
    * to a running Probe.
    *
    * Upon callback the probe data is set into the monitor (unless an error
    * occurred)
    *
    * @method connectMonitor
    * @protected
    * @param monitor {Monitor} - The monitor requesting to connect with the probe
    * @param callback {Function(error)} - (optional) Called when connected
    */
    connectMonitor: function(monitor, callback) {

      callback = callback || function(){};
      var t = this,
          monitorJSON = monitor.toMonitorJSON(),
          probeJSON = null,
          probeName = monitorJSON.probeName,
          probeClass = monitorJSON.probeClass,
          startTime = Date.now(),
          monitorStr = probeClass + '.' + monitor.toServerString().replace(/:/g, '.');

      // Class name must be set
      if (!probeClass && !probeName) {
        var errStr = 'probeName or probeClass must be set';
        log.error('connectMonitor', errStr);
        return callback(errStr);
      }

      // Determine the connection (or internal), and listen for change events
      t.determineConnection(monitorJSON, true, function(err, connection) {
        if (err) {return callback(err);}

        // Function to run on connection (internal or external)
        var onConnect = function(error, probe) {
          if (error) {return callback(error);}
          probeJSON = probe.toJSON();
          probeJSON.probeId = probeJSON.id; delete probeJSON.id;
          monitor.probe = probe;

          // Keep the last known probe state for effective updating
          monitor._probeValues = _.clone(probeJSON);

          // Perform the initial set silently.  This assures the initial
          // probe contents are available on the connect event,
          // but doesn't fire a change event before connect.
          monitor.set(probeJSON, {silent:true});

          // Watch the probe for changes.
          monitor.probeChange = function(){
            var changed = probe.changedAttributes();
            if (changed) {
              monitor._probeValues = _.clone(probe.toJSON());
              monitor.set(probe.changedAttributes());
              log.info('probeChange', {probeId: probeJSON.probeId, changed: probe.changedAttributes()});
            }
          };
          probe.on('change', monitor.probeChange);

          // Call the callback.  This calls the original caller, issues
          // the connect event, then fires the initial change event.
          callback(null);
        };

        // Connect internally or externally
        if (connection) {
          t.connectExternal(monitorJSON, connection, onConnect);
        } else {
          t.connectInternal(monitorJSON, onConnect);
        }
      });
    },

    /**
    * Disconnect a monitor
    *
    * This accepts an instance of a connected monitor, and disconnects it from
    * the remote probe.
    *
    * The probe implementation will be released if this is the only monitor
    * object watching it.
    *
    * @method disconnectMonitor
    * @protected
    * @param monitor {Monitor} - The connected monitor
    * @param reason {String} - Reason for the disconnect
    * @param callback {Function(error)} - (optional) Called when connected
    */
    disconnectMonitor: function(monitor, reason, callback) {
      callback = callback || function(){};
      var t = this, probe = monitor.probe, probeId = monitor.get('probeId');

      // The monitor must be connected
      if (!probe) {return callback('Monitor must be connected');}

      // Called upon disconnect (internal or external)
      var onDisconnect = function(error) {
        if (error) {
          return callback(error);
        }
        probe.off('change', monitor.probeChange);
        monitor.set({probeId:null});
        monitor.probe = monitor.probeChange = null;
        return callback(null, reason);
      };

      // Disconnect from an internal or external probe
      if (probe.connection) {
        t.disconnectExternal(probe.connection, probeId, onDisconnect);
      } else {
        t.disconnectInternal(probeId, onDisconnect);
      }
    },

    /**
    * Build a probe key from the probe data
    *
    * @method buildProbeKey
    * @protected
    * @param probeJSON {Object} - An object containing:
    *     @param probeJSON.probeName {String} - The client-defined probe name
    *     -or-
    *     @param probeJSON.probeClass {String} - The probe class name (required)
    *     @param probeJSON.initParams {Object} - Probe initialization parameters (if any)
    * @return probeKey {String} - A string identifying the probe
    */
    buildProbeKey: function(probeJSON) {
      var probeKey = probeJSON.probeClass,
          initParams = probeJSON.initParams;

      // Allow probes to be externally identified by name
      if (probeJSON.probeName) {
        return probeJSON.probeName;
      }

      if (initParams) {
        _.keys(initParams).sort().forEach(function(key){
          probeKey += ':' + key + '=' + initParams[key];
        });
      }
      return probeKey;
    },

    /**
    * Determine the connection to use for a probe
    *
    * This uses the connection parameters of the specified monitor to determine
    * (or create) the connection to use for the probe.
    *
    * If the probe can be instantiated internally, a null is returned as the
    * connection.
    *
    * This attempts to use an existing connection if available.  If not, a
    * connection attempt will be made with the host. If the host cannot be
    * reached directly, it returns a connection with the gateway.
    *
    * @method determineConnection
    * @protected
    * @param monitorJSON {Object} - The connection attributes of the monitor
    * @param makeNewConnections {Boolean} - Establish a new connection if one doesn't exist?
    * @param callback {Function(error, connection)} - Called when the connection is known
    * <ul>
    *   <li>error - Set if any errors</li>
    *   <li>connection - The connection object, or null to run in this process</li>
    * <ul>
    */
    determineConnection: function(monitorJSON, makeNewConnections, callback) {
      var t = this,
          connection = null,
          probeName = monitorJSON.probeName,
          probeClass = monitorJSON.probeClass,
          errStr = '',
          hostName = monitorJSON.hostName,
          appName = monitorJSON.appName,
          appInstance = monitorJSON.appInstance,
          thisHostName = t.getHostName().toLowerCase(),
          thisAppName = Config.Monitor.appName  || 'unknown',
          thisAppInstance = typeof process !== 'undefined' ? process.env.NODE_APP_INSTANCE : '1';

      // Return a found connection immediately if it's connected.
      // If connecting, wait for connection to complete.
      // If not connected (and not connecting) re-try the connection.
      var connectedCheck = function(isGateway) {

        // Remove the host/app/instance params if connecting directly.
        if (!isGateway) {
          delete monitorJSON.hostName;
          delete monitorJSON.appName;
          delete monitorJSON.appInstance;
        }

        // Define the connect/error listeners
        var onConnect = function() {
          removeListeners();
          callback(null, connection);
        };
        var onError = function(err) {
          removeListeners();
          log.error('connect.error', err);
          callback({msg: 'connection error', err:err});
        };
        var removeListeners = function() {
          connection.off('connect', onConnect);
          connection.off('error', onError);
        };

        // Wait if the connection is still awaiting connect
        if (connection && connection.connecting) {
          connection.on('connect', onConnect);
          connection.on('error', onError);
          return;
        }

        // Re-try if disconnected
        if (connection && !connection.connected) {
          connection.on('connect', onConnect);
          connection.on('error', onError);
          return connection.connect();
        }

        // Verified connection
        return callback(null, connection);
      };

      // Connect with this process (internally)?
      hostName = hostName ? hostName.toLowerCase() : null;
      var thisHost = (!hostName || hostName === thisHostName);
      var thisApp = (!appName || appName === thisAppName);
      var thisInstance = (!appInstance || appInstance === thisAppInstance);
      if (thisHost && thisApp && thisInstance) {

        // Connect internally if the probe is available
        if (t.runningProbesByKey[probeName] || Probe.classes[probeClass] != null) {
          return callback(null, null);
        }

        // Give named auto-start probes time to start up
        var autoStarts = Monitor.Config.Monitor.autoStart;
        if (probeName && !probeClass && autoStarts.length) {
          var autoStart = Monitor._.find(autoStarts, function(probeDef) {
            return probeDef.probeName === probeName;
          });
          if (autoStart) {
            setTimeout(function() {
              t.determineConnection(monitorJSON, makeNewConnections, callback);
            },10);
            return;
          }
        }

        // No probe with that name in this process.
        // Fallback to the default gateway.
        if (!t.defaultGateway) {
          errStr = 'Probe class "' + probeClass + '" not available in this process';
          log.error('connect.internal', errStr);
          return callback({err:errStr});
        }
        connection = t.defaultGateway;
        return connectedCheck(true);
      }

      // Return if connection is known
      connection = t.findConnection(hostName, appName, appInstance);
      if (connection) {
        return connectedCheck();
      }

      // Prefer the gateway if it exists
      if (t.defaultGateway) {
        connection = t.defaultGateway;
        return connectedCheck(true);
      }

      // See if we can establish new connections with the host
      if (hostName && makeNewConnections) {
        t.addHostConnections(hostName, function(err) {
          if (err) {
            log.error('connect.toHost', err);
            return callback(err);
          }

          // Try finding now that new connections have been made
          connection = t.findConnection(hostName, appName, appInstance);
          if (!connection) {
            errStr = 'No route to host: ' + Monitor.toServerString(monitorJSON);
            log.error('connect.toHost', errStr);
            return callback({err:errStr});
          }

          return connectedCheck();
        });

        // Wait for addHostConnections to complete
        return;
      }

      // We tried...
      if (!hostName) {
        // App name was specified, it wasn't this process, and no hostname
        errStr = 'No host specified for app: ' + appName;
        log.error('connect', errStr);
        return callback({msg:errStr},null);
      } else {
        // Not allowed to try remote hosts
        errStr = 'Not a gateway to remote monitors';
        log.error('connect', errStr);
        return callback({msg:errStr});
      }
    },

    /**
    * Find an existing connection to use
    *
    * This method looks into the existing known connections to find one
    * that matches the specified parameters.
    *
    * Firewalled connections are not returned.
    *
    * @method findConnection
    * @protected
    * @param hostName {String} - Host name to find a connection for (null = any host)
    * @param appName {String} - App name to find a connection with (null = any app)
    * @param appInstance {Any} - Application instance running on this host (null = any instance)
    * @return connection {Connection} - A Connection object if found, otherwise null
    */
    findConnection: function(hostName, appName, appInstance) {
      var t = this, thisInstance = 0;
      return t.connections.find(function(conn) {

        // Host or app matches if not specified or if specified and equal
        var matchesHost = !hostName || conn.isThisHost(hostName);
        var matchesApp = !appName || appName === conn.get('remoteAppName');
        var matchesInstance = !appInstance || appInstance === conn.get('remoteAppInstance');
        var remoteFirewall = conn.get('remoteFirewall');

        // This is a match if host + app + instance matches, and it's not firewalled
        return (!remoteFirewall && matchesHost && matchesApp && matchesInstance);
      });
    },

    /**
    * Find all connections matching the selection criteria
    *
    * This method looks into the existing known connections to find all
    * that match the specified parameters.
    *
    * Firewalled connections are not returned.
    *
    * @method findConnections
    * @protected
    * @param hostName {String} - Host name to search for (null = any host)
    * @param appName {String} - App name to search for (null = any app)
    * @return connections {Array of Connection} - An array of Connection objects matching the criteria
    */
    findConnections: function(hostName, appName) {
      var t = this;
      return t.connections.filter(function(conn) {

        // Host or app matches if not specified or if specified and equal
        var matchesHost = !hostName || conn.isThisHost(hostName);
        var matchesApp = !appName || appName === conn.get('remoteAppName');
        var remoteFirewall = conn.get('remoteFirewall');

        // This is a match if host + app matches, and it's not firewalled
        return (!remoteFirewall && matchesHost && matchesApp);
      });
    },

    /**
    * Add connections for the specified host
    *
    * This performs a scan of monitor ports on the server, and adds connections
    * for newly discovered servers.
    *
    * It can take a while to complete, and if called for the same host before
    * completion, it will save the callback and call all callbacks when the
    * original task is complete.
    *
    * @method addHostConnections
    * @protected
    * @param hostName {String} - The host to add connections with
    * @param callback {Function(error)} - Called when complete
    */
    addHostConnections: function(hostName, callback) {
      var t = this,
          errStr = '',
          connectedPorts = [],
          portStart = Config.Monitor.serviceBasePort,
          portEnd = Config.Monitor.serviceBasePort + Config.Monitor.portsToScan - 1;

      // Create an array to hold callbacks for this host
      if (!t.addHostCallbacks[hostName]) {
        t.addHostCallbacks[hostName] = [];
      }

      // Remember this callback and return if we're already adding connections for this host
      if (t.addHostCallbacks[hostName].push(callback) > 1) {
        return;
      }

      // Called when done
      var doneAdding = function(error) {
        t.addHostCallbacks[hostName].forEach(function(cb) {
          cb(error);
        });
        delete t.addHostCallbacks[hostName];
      };

      // Build the list of ports already connected
      t.connections.each(function(connection){
        var host = connection.get('hostName').toLowerCase();
        var port = connection.get('hostPort');
        if (host === hostName && port >= portStart && port <= portEnd) {
          connectedPorts.push(port);
        }
      });

      // Scan non-connected ports
      var portsToScan = Config.Monitor.portsToScan - connectedPorts.length;
      if (portsToScan === 0) {
        errStr = 'All monitor ports in use.  Increase the Config.Monitor.portsToScan configuration';
        log.error('addHostConnections', errStr);
        return doneAdding(errStr);
      }
      var doneScanning = function() {
        var conn = this; // called in the context of the connection
        conn.off('connect disconnect error', doneScanning);
        if (--portsToScan === 0) {
          return doneAdding();
        }
      };
      for (var i = portStart; i <= portEnd; i++) {
        if (connectedPorts.indexOf(i) < 0) {
          var connection = t.addConnection({hostName:hostName, hostPort:i});
          connection.on('connect disconnect error', doneScanning, connection);
        }
      }
    },

    /**
    * Connect to an internal probe implementation
    *
    * This connects with a probe running in this process.  It will instantiate
    * the probe if it isn't currently running.
    *
    * @method connectInternal
    * @protected
    * @param monitorJSON {Object} - The monitor toJSON data.  Containing:
    *     @param monitorJSON.probeClass {String} - The probe class name to connect with (required)
    *     @param monitorJSON.initParams {Object} - Probe initialization parameters.
    * @param callback {Function(error, probeImpl)} - Called when connected
    */
    connectInternal: function(monitorJSON, callback) {

      // Build a key for this probe from the probeClass and initParams
      var t = this,
          probeKey = t.buildProbeKey(monitorJSON),
          probeName = monitorJSON.probeName,
          probeClass = monitorJSON.probeClass,
          initParams = monitorJSON.initParams,
          probeImpl = null;

      var whenDone = function(error) {

        // Wait one tick before firing the callback.  This simulates a remote
        // connection, making the client callback order consistent, regardless
        // of a local or remote connection.
        setTimeout(function() {

          // Dont connect the probe on error
          if (error) {
            if (probeImpl) {
              delete t.runningProbesByKey[probeKey];
              delete t.runningProbesById[probeImpl.id];
              try {
                // This may fail depending on how many resources were created
                // by the probe before failure.  Ignore errors.
                probeImpl.release();
              } catch (e){}
            }
            return callback(error);
          }

          // Probes are released based on reference count
          probeImpl.refCount++;
          log.info('connectInternal', {probeKey: probeKey, probeId: probeImpl.id});
          callback(null, probeImpl);
        }, 0);
      };

      // Get the probe instance
      probeImpl = t.runningProbesByKey[probeKey];
      if (!probeImpl) {

        // Instantiate the probe
        var ProbeClass = Probe.classes[probeClass];
        if (!ProbeClass) {
          return whenDone({msg:'Probe not available: ' + probeClass});
        }
        var initOptions = {asyncInit: false, callback: whenDone};
        try {
          // Deep copy the init params, because Backbone mutates them.  This
          // is bad if the init params came in from defaults of another object,
          // because those defaults will get mutated.
          var paramCopy = Monitor.deepCopy(initParams);

          // Extend the probe name into the probe if known
          if (probeName) {
            paramCopy.probeName = probeName;
          }

          // Instantiate a new probe
          probeImpl = new ProbeClass(paramCopy, initOptions);
          probeImpl.set({
            id: Monitor.generateUniqueId(),
            writableAttributes: ProbeClass.prototype.writableAttributes || []
          });
          probeImpl.refCount = 0;
          probeImpl.probeKey = probeKey;
          t.runningProbesByKey[probeKey] = probeImpl;
          t.runningProbesById[probeImpl.id] = probeImpl;
        } catch (e) {
          var error = {msg: 'Error instantiating probe ' + probeClass, error: e.message};
          return whenDone(error);
        }

        // Return early if the probe constructor transferred responsibility
        // for calling the callback.
        if (initOptions.asyncInit) {
          return;
        }
      }

      // The probe impl is found, and instantiated if necessary
      whenDone();
    },

    /**
    * Disconnect with an internal probe implementation.
    *
    * @method disconnectInternal
    * @protected
    * @param probeId {String} - The probe implementation ID to disconnect
    * @param callback {Function(error, probeImpl)} - Called when disconnected
    */
    disconnectInternal: function(probeId, callback) {
      var t = this, probeImpl = t.runningProbesById[probeId];
      if (!probeImpl) {return callback('Probe not running');}
      if (--probeImpl.refCount === 0) {

        // Release probe resources & internal references if still no references after a while
        setTimeout(function() {
          if (probeImpl.refCount === 0) {
            try {
              probeImpl.release();
            } catch (e){}
            delete t.runningProbesByKey[probeImpl.probeKey];
            delete t.runningProbesById[probeId];
          }
        }, PROBE_TIMEOUT_MS);
      }
      callback(null, probeImpl);
    },

    /**
    * Connect to an external probe implementation.
    *
    * This connects with a probe running in another process.  It will
    * coordinate the remote instantiation of the probe if it's not running.
    *
    * @method connectExternal
    * @protected
    * @param monitorJSON {Object} - An object containing:
    *     @param monitorJSON.probeClass {String} - The probe class name (required)
    *     @param monitorJSON.initParams {Object} - Probe initialization parameters (if any)
    * @param connection {Connection} - The connection to use
    * @param callback {Function(error, probeProxy)} - Called when connected
    */
    connectExternal: function(monitorJSON, connection, callback) {

      // Build a key for this probe from the probeClass and initParams
      var t = this,
          errStr = '',
          probeKey = t.buildProbeKey(monitorJSON);

      // Get the probe proxy
      var probeId = connection.remoteProbeIdsByKey[probeKey];
      var probeProxy = connection.remoteProbesById[probeId];

      if (!probeProxy) {

        // Connect with the remote probe
        connection.emit('probe:connect', monitorJSON, function(error, probeJSON){
          if (error) {
            errStr = "probe:connect returned an error for probeClass '" + monitorJSON.probeClass +
              "' on " + Monitor.toServerString(monitorJSON);
            return callback({err: error, msg: errStr});
          }
          probeId = probeJSON.id;

          // See if the proxy was created while waiting for return
          probeProxy = connection.remoteProbesById[probeId];
          if (probeProxy) {
            probeProxy.refCount++;
            log.info('connectExternal.connected.existingProxy', {probeId: probeId, refCount: probeProxy.refCount, whileWaiting: true});
            return callback(null, probeProxy);
          }

          // Create the probe proxy
          probeProxy = new Probe(probeJSON);
          probeProxy.refCount = 1;
          probeProxy.connection = connection;
          connection.remoteProbeIdsByKey[probeKey] = probeId;
          connection.remoteProbesById[probeId] = probeProxy;
          connection.addEvent('probe:change:' + probeId, function(attrs){probeProxy.set(attrs);});
          log.info('connectExternal.connected.newProxy', {probeId: probeId});
          return callback(null, probeProxy);
        });
        return;
      }

      // Probes are released based on reference count
      probeProxy.refCount++;
      log.info('connectExternal.connected.existingProxy', {probeId: probeId, refCount: probeProxy.refCount});
      return callback(null, probeProxy);
    },

    /**
    * Disconnect with an external probe implementation.
    *
    * @method disconnectExternal
    * @protected
    * @param connection {Connection} - The connection to use
    * @param probeId {String} - Probe ID
    * @param callback {Function(error)} - Called when disconnected
    */
    disconnectExternal: function(connection, probeId, callback) {
      var t = this, proxy = connection.remoteProbesById[probeId];
      if (!proxy) {return callback('Probe not running');}
      if (--proxy.refCount === 0) {
        // Release probe resources
        proxy.release();
        proxy.connection = null;
        delete connection.remoteProbesById[probeId];
        delete connection.remoteProbeIdsByKey[proxy.probeKey];
        connection.removeEvent('probe:change:' + probeId);
        return connection.emit('probe:disconnect', {probeId:probeId}, function(error){
          return callback(error);
        });
      }
      callback(null);
    }

  });

}(this));

// Sync.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('./Monitor'),
      logger = Monitor.getLogger('Sync'),
      Backbone = Monitor.Backbone,
      _ = Monitor._;

  // Constants
  var METHOD_CREATE = 'create',
      METHOD_READ = 'read',
      METHOD_UPDATE = 'update',
      METHOD_DELETE = 'delete';

  /**
  * Probe based data synchronization with server-side storage.
  *
  * This method returns a function conforming to the Backbone
  * <a href="http://documentcloud.github.com/backbone/#Sync">Sync</a>
  * API, offering
  * <a href="http://documentcloud.github.com/backbone/#Model-fetch">```fetch```</a>,
  * <a href="http://documentcloud.github.com/backbone/#Model-save">```save```</a>, and
  * <a href="http://documentcloud.github.com/backbone/#Model-destroy">```destroy```</a>
  * functionality to any Backbone data model.
  *
  * The returned function can be assigned to the ```sync``` element when defining the
  * data model:
  *
  *     var BlogEntry = Backbone.Model.extend({
  *       ...
  *       sync: Monitor.Sync('BlogEntry'),
  *       ...
  *     });
  *
  * The sync function can also be assigned to any Backbone model after construction:
  *
  *     var myBook = new Book({id:"44329"});
  *     myBook.sync = Monitor.Sync('Book');
  *     myBook.fetch();
  *
  * In addition to providing the standard ```fetch```, ```save```, and ```destroy```
  * functionality, Sync offers *live data synchronization*, updating the data model
  * as changes are detected on the server.
  *
  *     // Turn on live data synchronization
  *     myBook.fetch({liveSync:true});
  *
  * This fetches the ```myBook``` instance with the contents of the Book class
  * id ```44329```, persists local changes to ```myBook```, and keeps ```myBook```
  * up to date with changes detected on the server.
  *
  * Live data synchronization consumes resources on both the client and server.
  * To release those resources, make sure to call the ```clear()``` method on
  * the data model. Otherwise, resources are released when the server connection
  * is terminated.
  *
  *     // Clear the object, turning off live synchronization
  *     myBook.clear();
  *
  * See the <a href="http://documentcloud.github.com/backbone/#Sync">Backbone documentation</a>
  * for more information about the Backbone.sync functionality.
  *
  * @static
  * @method Sync
  * @param className {String} Name of the class to synchronize with
  * @param [options] {Object} Additional sync options
  *     @param options.hostName {String} Host name to use for the Sync probe.
  *       If not specified, the closest server hosting Sync probe will be
  *       determined (this server, or the default gateway)
  *     @param options.appName {String} Server appName (see Monitor.appName)
  *     @param options.appInstance {String} Application instance (see Monitor.appInstance)
  * @return {sync} A sync method to assign to a Backbone class or instance.
  */
  Monitor.Sync = function(className, options) {
    if (!className) {
      throw new Error('Sync class name must be provided');
    }

    // Get a Sync object and bind it to the sync function
    var syncObj = new Sync(className, options);
    return function(method, model, options) {
      logger.info('sync', {className: className, method:method, model:model.toJSON(), options:options});
      return syncObj._sync(method, model, options);
    };
  };

  /**
  * Live data model synchronization.
  *
  * This class can be attached to Backbone models to synchronize backend data using the
  * <a href="http://documentcloud.github.com/backbone/#Model-fetch">```fetch```</a>,
  * <a href="http://documentcloud.github.com/backbone/#Model-save">```save```</a>, and
  * <a href="http://documentcloud.github.com/backbone/#Model-destroy">```destroy```</a>
  * Backbone API methods.
  *
  * It also provides two-way change based synchronization, updating data on the server as
  * changes are made to the model, and updating the client model as changes are detected
  * on the server.
  *
  * Communication is <a href="Probe.html">Probe</a> based, leveraging the built-in
  * connection, routing, and socket-io functionality.  The <a href="FileSyncProbe.html">FileSyncProbe</a>
  * is provided for file-based model persistence, and others can be written to
  * implement alternate persistence mechanisms.
  *
  * @private
  * @class Sync
  */
  var Sync = function(className, options) {
    var t = this;
    logger.info('syncInit', className, options);
    t.className = className;
    t.options = options || {};
  };

  /**
  * Provide the sync API to a backbone data model
  *
  * See the <a href="http://documentcloud.github.com/backbone/#Sync">Backbone documentation</a>
  * for more information on this method.
  *
  * @private
  * @method _sync
  * @param method {String} A CRUD enumeration of "create", "read", "update", or "delete"
  * @param model {Backbone.Model or Backbone.Collection} The model or collection to act upon
  * @param [options] {Object} Success and error callbacks, and additional options to
  *   pass on to the sync implementation.
  *     @param [options.liveSync] - Turn on the live update functionality
  *     @param [options.silenceErrors] - Silence the logging of errors (they're expected)
  *     @param [options.success] - The method to call on method success
  *     @param [options.error] - The method to call on method error
  */
  Sync.prototype._sync = function(method, model, options) {
    var t = this;
    options = options || {};

    // Cannot liveSync with a collection (too many issues)
    if (options.liveSync && model instanceof Backbone.Collection) {
      return options.error(null, 'Cannot liveSync with a collection');
    }

    // Generate an ID if necessary
    if (!model.has('id')) {
      if (method === METHOD_CREATE) {
        model.set({id: Monitor.generateUniqueId()}, {silent: true});
        logger.info('_sync.generateUniqueId', t.className, model.toJSON(), options);
      } else {
        return options.error(null, 'ID element must be set.');
      }
    }

    // Special case: LiveSync on CREATE.  LiveSync requires a persisted object,
    // so if requesting liveSync on a create, we have to use the class monitor
    // for the create, then get an instance monitor for the liveSync.
    if (method === METHOD_CREATE && options.liveSync) {
      // Call this method again without liveSync (this uses the class monitor)
      t._sync(method, model, {error: options.error, success: function(params){
        // Now connect w/liveSync using a fetch
        t._sync(METHOD_READ, model, options);
      }});
      return;
    }

    // Create a function to run once complete
    var onComplete = function(error, params) {
      if (error) {
        if (!options.silenceErrors) {
          logger.error('_sync.onComplete', t.className, error);
        }
        options.error(null, error);
      } else {
        logger.info('_sync.onComplete', t.className, model.get('id'));
        options.success(params);
      }
    };

    // Is the proper syncMonitor already connected?
    if (model.syncMonitor || (t.syncMonitor && !options.liveSync)) {

      // Send the control message to the connected monitor
      var syncMonitor = model.syncMonitor || t.syncMonitor;
      var opts = t._getOpts(method, model);
      syncMonitor.control(method, opts, onComplete);

    } else {

      // Connect an instance level syncMonitor to the model if liveSync
      // is specified, otherwise create a class level syncMonitor
      if (options.liveSync) {
        t._connectInstanceMonitor(method, model, options, onComplete);
      } else {
        t._connectClassMonitor(method, model, options, onComplete);
      }
    }

  };

  /**
  * Connect and send the control message to a Sync probe for this class.
  *
  * This creates a monitor to a Sync probe with the specified className.
  * The monitor is used to send CRUD control messages for any ID within
  * the class.
  *
  * Once connected, it sends the specified control message to the probe.
  *
  * This monitor is used for non-liveSync interactions.
  *
  * @private
  * @method _connectClassMonitor
  * @param method {String} The requested CRUD method
  * @param model {Backbone.Model} The data model to perform the operation on
  * @param [options] {Object} Options
  *     @param [options.silenceErrors] - Silence the logging of errors (they're expected)
  * @param callback {function(error, params)} - Called when connected
  *     @param callback.error {Mixed} - Set if it couldn't connect
  *     @param callback.params {Object} - Updated data model parameters
  */
  Sync.prototype._connectClassMonitor = function(method, model, options, callback) {
    var t = this;

    // Connect a syncMonitor for the class
    logger.info('connectClassMonitor', t.className, method, model.toJSON());
    var monitorParams = t._getMonitorParams(null);
    var syncMonitor = new Monitor(monitorParams);
    syncMonitor.connect(function(error){
      if (error) {
        if (!options.silenceErrors) {
          logger.error('connectClassMonitor', error);
        }
        return callback(error);
      }

      // Attach the syncMonitor and forward the initial control message
      t.syncMonitor = syncMonitor;
      var opts = t._getOpts(method, model);
      syncMonitor.control(method, opts, callback);
    });
  };

  /**
  * Connect and send the control message to a liveSync monitor for the model
  *
  * This creates a monitor to a Sync probe for the model instance, and
  * attaches event listeners onto the monitor and the data model.
  *
  * Once connected, it sends the specified control message to the probe.
  *
  * Changes on the server are automatically propagated to the local
  * data model, and local changes to the data model are automatically
  * propagated to the server.
  *
  * @private
  * @method _connectInstanceMonitor
  * @param method {String} The requested CRUD method
  * @param model {Backbone.Model} The data model to perform the operation on
  * @param callback {function(error, params)} - Called when connected
  *     @param callback.error {Mixed} - Set if it couldn't connect
  *     @param callback.params {Object} - Updated data model parameters
  */
  Sync.prototype._connectInstanceMonitor = function(method, model, options, callback) {
    var t = this, syncMonitor, modelId = model.get('id');

    // Called when done connecting
    var whenDone = function(error) {

      // Don't connect the instance monitor if errors
      if (error) {
        return callback(error);
      }

      // Called to disconnect the listeners
      var disconnectListeners = function() {
        logger.info('disconnectLiveSync', t.className, model.toJSON());
        model.off('change', modelListener);
        model.syncMonitor.off('change', monitorListener);
        model.syncMonitor.disconnect();
        model.syncMonitor = null;
      };

      // Client-side listener - for persisting changes to the server
      var modelListener = function(changedModel, options) {
        options = options || {};

        // Don't persist unless the model is different
        if (_.isEqual(JSON.parse(JSON.stringify(model)), JSON.parse(JSON.stringify(model.syncMonitor.get('model'))))) {
          logger.info('modelListener.noChanges', t.className, model.toJSON());
          return;
        }

        // Disconnect listeners if the ID changes
        if (model.get('id') !== modelId) {
          logger.info('modelListener.alteredId', t.className, model.toJSON());
          return disconnectListeners();
        }

        // Persist changes to the server (unless the changes originated from there)
        if (!options.isSyncChanging) {
          logger.info('modelListener.saving', t.className, model.toJSON());
          model.save();
        }
      };

      // Server-side listener - for updating server changes into the model
      var monitorListener = function(changedModel, options) {

        // Don't update unless the model is different
        var newModel = model.syncMonitor.get('model');
        if (_.isEqual(JSON.parse(JSON.stringify(model)), JSON.parse(JSON.stringify(newModel)))) {
          logger.info('monitorListener.noChanges', t.className, newModel);
          return;
        }

        // Disconnect if the model was deleted or the ID isn't the same
        var isDeleted = (_.size(newModel) === 0);
        if (isDeleted || newModel.id !== modelId)  {
          logger.info('modelListener.deleted', t.className, newModel);
          disconnectListeners();
        }

        // Forward changes to the model (including server-side delete)
        var newOpts = {isSyncChanging:true};
        if (isDeleted) {
          logger.info('modelListener.deleting', t.className, newModel);
          model.clear(newOpts);
        } else {
          // Make sure the model is set to exactly the new contents (vs. override)
          logger.info('modelListener.setting', t.className, newModel);
          model.clear({silent:true});
          model.set(newModel, newOpts);
        }
      };

      // Connect the listeners
      model.on('change', modelListener);
      model.syncMonitor.on('change', monitorListener);

      // Send back the initial data model
      logger.info('connectInstanceMonitor.done', t.className, model.toJSON());
      callback(null, model.syncMonitor.get('model'));
    };

    // Create a liveSync monitor for the model
    var monitorParams = t._getMonitorParams(modelId);
    syncMonitor = new Monitor(monitorParams);
    syncMonitor.connect(function(error){
      if (error) {
        if (!options.silenceErrors) {
          logger.error('connectInstanceMonitor.monitorConnect', error);
        }
        return whenDone(error);
      }

      // Attach the connected syncMonitor to the model
      model.syncMonitor = syncMonitor;

      // If the initial method is read, then the monitor already
      // contains the results.  Otherwise, another round-trip is
      // necessary for the initial control request.
      if (method === METHOD_READ) {
        return whenDone();
      }

      // Forward the initial control
      var opts = t._getOpts(method, model);
      logger.info('connectInstanceMonitor.forwarding', method, t.className, model.toJSON());
      syncMonitor.control(method, opts, whenDone);
    });
  };

  /**
  * Prepare the control options
  *
  * This prepares the control options to include the ID element
  * on a fetch or delete, and the entire model on a create or
  * update.
  *
  * @private
  * @method _getOpts
  * @param method {Enum} One of the CRUD methods
  * @param model {Backbone.Model} The model to prepare the opts from
  * @return {Object} The options object to pass to the probe
  */
  Sync.prototype._getOpts = function(method, model) {
    var opts = {};
    switch (method) {
      case METHOD_READ:
      case METHOD_DELETE:
        opts.id = model.get('id');
        break;
      case METHOD_CREATE:
      case METHOD_UPDATE:
        opts.model = model.toJSON();
        break;
    }
    return opts;
  };

  /**
  * Prepare the init parameters for a monitor to a Sync probe
  *
  * The monitor init params for the class monitor and the liveSync
  * model monitor only differ in the modelId, so this method was
  * broken out to reduce code duplication.
  *
  * @private
  * @method _getMonitorParams
  * @param [modelId] {String} Id to the data model.  If set, then params
  *   will be built for liveSync to a data model with that id.
  *   params for the class.
  * @return {Object} The monitor parameters
  */
  Sync.prototype._getMonitorParams = function(modelId) {

    // Build server connection parameters from this instance of Sync
    var t = this;
    var params = _.pick(t.options, 'hostName', 'appName', 'appInstance');

    // Add probe and class parameters
    params.probeClass = 'Sync';
    params.initParams = {
      className: t.className
    };

    // Add the model id if this is a liveSync probe
    if (modelId) {
      params.initParams.modelId = modelId;
    }

    return params;
  };


}(this));

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

// RecipeProbe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor

/* This class is evil.  You probably shouldn't use it. Or drink. Or drink while using it. */
/*jslint evil: true */

(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('../Monitor'),
      _ = Monitor._,
      Cron = Monitor.Cron,
      logger = Monitor.getLogger('RecipeProbe'),
      vm = Monitor.commonJS ? require('vm') : null,
      Probe = Monitor.Probe;

  /**
  * Monitor automation probe
  *
  * The Recipe probe monitors other probes and runs instructions when the
  * probes change, and controls other probes based on these instructions.
  *
  * It contains a list of monitors to instantiate, and a script to run when the
  * monitor ```change``` event is fired.
  *
  * When the script fires, the monitors are available to the script by name.
  * The script can ```get()``` monitor values, ```set()``` writable monitor
  * values, and control the monitor using the ```control()`` method.
  *
  * The ```this``` variable is consistent between script runs, so state can be
  * maintained by setting attributes in ```this```.
  *
  * @class RecipeProbe
  * @extends Probe
  * @constructor
  * @param monitors {Object} - Named list of monitors to instantiate
  *   Key: monitor variable name, Value: Monitor model parameters
  * @param script {String} - JavaScript script to run.
  *   The script has access to ```console```, ```logger```, and all defined
  *   monitors by name.
  * @param [recipeName] {String} - Recipe name for logging
  * @param [autoStart=false] {boolean} - Call the start control on instantiation?
  * @param [triggeredBy] {Object} - Trigger the recipe by the items in the object.
  *        Items can include: 'interval', 'cron', and/or monitorName(s)
  *        If 'interval' is the key, the value is the interval in milliseconds
  *        If 'cron' is the key, the value is a string representing the cron pattern
  *        If any monitor name is the key, the value is the monitor event to trigger on.
  *        Example:
  *        triggeredBy: {
  *          interval: 5000,      // This triggers the recipe every 5 seconds
  *          cron: '* * * * * *', // [second] [minute] [hour] [day of month] [month] [day of week]
  *          myMonitor: 'change:someAttribute change:someOtherAttribute'
  *        }
  *        If triggeredBy isn't specified, any monitor change will trigger the recipe.
  * @param [started] {boolean} - Is the recipe started and currently active?
  */
  var RecipeProbe = Monitor.RecipeProbe = Probe.extend({

    probeClass: 'Recipe',
    writableAttributes: [],
    defaults: {
      recipeName: '',
      monitors: {},
      script: '',
      autoStart: false,
      started: false,
      triggeredBy: null
    },

    initialize: function(attributes, options){
      var t = this;

      // Periodic triggers
      t.interval = null;
      t.cronJob = null;

      // Precondition test
      if (_.size(t.get('monitors')) === 0) {
        logger.error('initialize', 'No monitors defined in the recipe');
        return;
      }

      // This is a list of monitors (vs. monitor definitions)
      t.monitors = {};

      // Auto start, calling the callback when started
      if (t.get('autoStart')) {
        options.asyncInit = true;
        t.start_control({}, options.callback);
      }
    },

    release: function() {
      var t = this,
          args = arguments;
      t.stop_control({}, function(){
        Probe.prototype.release.apply(t, args);
      });
    },

    /**
    * Start the recipe
    *
    * This connects to each monitor and sets up the recipe triggers
    *
    * @method start_control
    */
    start_control: function(params, callback) {
      var t = this,
          connectError = false,
          monitors = t.get('monitors');

      if (t.get('started')) {
        var err = {code:'RUNNING', msg:'Cannot start - the recipe is already running.'};
        logger.warn(err);
        return callback(err);
      }

      // Called when a monitor has connected
      var onConnect = function(error) {
        if (connectError) {return;}
        if (error) {
          var err = {code:'CONNECT_ERROR', err: error};
          connectError = true;
          logger.error('start', err);
          return callback(err);
        }
        for (var name1 in t.monitors) {
          if (!t.monitors[name1].isConnected()) {
            return;
          }
        }
        t.set({started:true});
        t.connectListeners(true);
        callback();
      };

      // Connect all monitors
      for (var name2 in monitors) {
        t.monitors[name2] = new Monitor(monitors[name2]);
        t.monitors[name2].connect(onConnect);
      }

    },

    /**
    * Stop the recipe
    *
    * This disconnects each monitor
    *
    * @method stop_control
    */
    stop_control: function(params, callback) {
      var t = this,
          disconnectError = false;

      if (!t.get('started')) {
        var err = {code:'NOT_RUNNING', msg:'The recipe is already stopped.'};
        logger.warn('precondition', err);
        return callback(err);
      }

      // Called when a monitor has disconnected
      var onDisconnect = function(error) {
        if (disconnectError) {return;}
        if (error) {
          var err = {code:'DISONNECT_ERROR', err: error};
          disconnectError = true;
          logger.error('onDisconnect', err);
          return callback(err);
        }
        for (var name1 in t.monitors) {
          if (t.monitors[name1].isConnected()) {
            return;
          }
        }
        t.set({started:false});
        t.compiledScript = null;
        callback();
      };

      // Disconnect all monitors
      t.connectListeners(false);
      t.context = null;
      for (var name2 in t.monitors) {
        t.monitors[name2].disconnect(onDisconnect);
      }
    },

    /**
    * Connect the change listeners
    *
    * @private
    * @method connectListeners
    */
    connectListeners: function(connect) {
      var t = this,
          triggeredBy = t.get('triggeredBy'),
          onTrigger = t.onTrigger.bind(t);

      // Default to listen on changes to all monitors
      if (!triggeredBy) {
        for (var monitorName in t.monitors) {
          t.monitors[monitorName][connect ? 'on' : 'off']('change', t.onTrigger, t);
        }
        return;
      }

      // Process the elements in triggeredBy
      for (var name in triggeredBy) {
        var value = triggeredBy[name];

        // Construct a new cron job
        if (name === 'cron') {
          if (connect) {
            t.cronJob = new Cron.CronJob(value, onTrigger);
          }
          else {
            if (t.cronJob.initiated) {
              clearInterval(t.CronJob.timer);
            }
            else {
              setTimeout(function(){clearInterval(t.cronJob.timer);}, 1000);
            }
          }
        }

        // Set a polling interval
        else if (name === 'interval') {
          if (connect) {
            t.interval = setInterval(onTrigger, value);
          }
          else {
            clearInterval(t.interval);
            t.interval = null;
          }
        }

        // Must be a monitor name
        else {
          t.monitors[name][connect ? 'on' : 'off'](value, onTrigger);
        }
      }
    },

    /**
    * Called when a trigger is fired
    *
    * @private
    * @method onTrigger
    */
    onTrigger: function() {
      var t = this;
      t.run_control({}, function(error){
        if (error) {
          logger.error('onTrigger', error);
        }
      });
    },

    /**
    * Run the recipe script
    *
    * This manually runs a started recipe.  The callback is called immediately
    * after executing the script.
    *
    * @method run_control
    */
    run_control: function(params, callback) {
      var t = this,
          error = null;
      if (!t.get('started')) {
        error = {code:'NOT_RUNNING', msg:'Cannot run - recipe not started.'};
        logger.warn(error);
        return callback(error);
      }

      // Name the probe
      t.name = t.get('probeName') || t.get('id');

      // Build a context to pass onto the script.  The context contains
      // a console, a logger, and each monitor by name.
      if (!t.context) {
        t.context = vm ? vm.createContext({}) : {};
        t.context.console = console;
        t.context.logger = Monitor.getLogger('Recipe.run.' + t.name);
        for (var monitorName in t.monitors) {
          t.context[monitorName] = t.monitors[monitorName];
        }
      }

      // Run the script
      try {
        t.run(t.context);
      } catch(e) {
        error = "Error running script: " + e.toString();
        logger.error('run_control', error);
      }
      callback(error);
    },

    /**
    * Execute the recipe.  This is a private method that can be overridden
    * in derived recipe classes that contain the recipe.
    *
    * @private
    * @method run
    */
    run: function(context) {
      var t = this,
          script = t.get('script');

      // Run in a VM or exec (if running in a browser)
      if (vm) {
        // Compile the script on first run.  This throws an exception if
        // the script has a problem compiling.
        if (!t.compiledScript) {
          t.compiledScript = vm.createScript(script);
        }

        // Execute the compiled script
        t.compiledScript.runInContext(context, t.name);
      }
      else {
        // Bring all context variables local, then execute the script
        eval(t.bringLocal(context));
        eval(script);
      }
    },

    /**
    * Generate a script that brings context members into local scope
    *
    * @private
    * @method bringLocal
    */
    bringLocal: function(context) {
      var varName,
          localVars = [];
      for (varName in context) {
        localVars.push('var ' + varName + ' = context.' + varName + ';');
      }
      return localVars.join('\n');
    }

  });


}(this));

// PollingProbe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('../Monitor'),
      _ = Monitor._,
      Cron = Monitor.Cron,
      Probe = Monitor.Probe,
      Backbone = Monitor.Backbone;

  // Constants
  var DEFAULT_POLL_INTERVAL = 1000;
  var DEFAULT_CRON_PATTERN = "* * * * * *";

  /**
  * ## Base class for probes that require polling to detect and set model changes.
  *
  * The probe wakes up every polling interval and executes the poll() method
  * in the derived class.
  *
  * PollingProbes are instantiated with either a polling interval (in milliseconds)
  * or a cron pattern.  If the polling interval is set, that's what will be used.
  *
  * The cronPattern isn't available in browser-side probes.
  *
  * To disable polling, set the pollInterval to 0.
  *
  * More about cron formats, with examples
  * <ul>
  *   <li><a href="http://crontab.org/">http://crontab.org/</a></li>
  *   <li><a href="http://en.wikipedia.org/wiki/Cron">http://en.wikipedia.org/wiki/Cron</a></li></li>
  *   <li><a href="http://www.adminschoice.com/crontab-quick-reference">http://www.adminschoice.com/crontab-quick-reference</a></li></li>
  * </ul>
  *
  * @class PollingProbe
  * @extends Probe
  * @constructor
  * @param [initParams] {Object} Probe initialization parameters
  *     @param [initParams.pollInterval] {Integer} Polling interval in milliseconds. Default: null
  *     @param [initParams.cronPattern] {String} Crontab syle polling pattern. Default once per second: "* * * * * *"
  *
  *   The format is: <i>[second] [minute] [hour] [day of month] [month] [day of week]</i>.<br>
  */
  var PollingProbe = Monitor.PollingProbe = Probe.extend({
    defaults: _.extend({}, Probe.prototype.defaults, {
      pollInterval: null,
      cronPattern: DEFAULT_CRON_PATTERN
    }),
    initialize: function(){
      var t = this,
          pollInterval = t.get('pollInterval'),
          cronPattern = t.get('cronPattern'),
          poll = function(){t.poll();};
      Probe.prototype.initialize.apply(t, arguments);

      // Override cron for the default 1-second interval
      // (this allows the default to work when Cron isn't available)
      if (pollInterval == null && cronPattern === DEFAULT_CRON_PATTERN) {
        pollInterval = DEFAULT_POLL_INTERVAL;
      }

      // Poll once, then set up the interval
      t.poll();
      if (pollInterval !== 0) {
        if (pollInterval) {
          t.timer = setInterval(poll, pollInterval);
        } else {
          if (!Cron) {
            throw new Error("Cron is not available in this client");
          }
          t.cronJob = new Cron.CronJob(cronPattern, poll);
        }
      }
    },
    release: function(){
      var t = this, timer = (t.cronJob ? t.cronJob.timer : t.timer);
      if (t.cronJob && !t.cronJob.initiated) {
        // If cron isn't initiated we've been asked to shut down within the
        // first second, and the timer hasn't been set (but will be soon).
        setTimeout(function(){clearInterval(t.cronJob.timer);}, 1000);
      } else if (t.timer) {
        clearInterval(timer);
      }
      t.timer = t.cron = null;
      Probe.prototype.release.apply(t, arguments);
    }

  });

}(this));

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

// InspectProbe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor

/* This class is evil.  You probably shouldn't use it.  Or drink.  Or drink while using it. */
/*jslint evil: true */

(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('../Monitor'),
      _ = Monitor._,
      logger = Monitor.getLogger('InspectProbe'),
      Backbone = Monitor.Backbone,
      PollingProbe = Monitor.PollingProbe;

  // Constants
  var DEFAULT_DEPTH = 2;

  /**
  * Inspect and manipulate variables on the monitored server.
  *
  * This class monitors the variable specified by the key.
  *
  * The key is evaluated to determine the variable to monitor, so it may
  * be a complex key starting at global scope.  If the key isn't
  * specified, it monitors all variables in the global scope.
  *
  * If the key points to an object of type Backbone.Model, this probe
  * will update the value in real time, triggered on the *change* event.
  * Otherwise it will update the value as it notices changes, while polling
  * on the specified polling interval (default: 1 second).
  *
  * @class InspectProbe
  * @extends PollingProbe
  * @constructor
  * @param [initParams] - Initialization parameters
  *     @param [initParams.key=null] {String} A global variable name or expression
  *     @param [initParams.depth=2] {Integer} If the key points to an object, this
  *       is the depth to traverse the object for changes.  Default=2, or 1 if
  *       key='window'.
  *     @param [initParams.pollInterval] {Integer} (from <a href="PollingProbe.html">PollingProbe</a>) Polling interval in milliseconds. Default: null
  *     @param [initParams.cronPattern] {String} (from <a href="PollingProbe.html">PollingProbe</a>) Crontab syle polling pattern. Default once per second: "* * * * * *"
  * @param model - Monitor data model elements
  *     @param model.value - The value of the element being inspected
  *     @param model.isModel - Is the value a Backbone.Model?
  */
  var InspectProbe = Monitor.InspectProbe = PollingProbe.extend({

    // These are required for Probes
    probeClass: 'Inspect',
    writableAttributes: ['value'],

    initialize: function(initParams){
      var t = this;

      // Get the global object if the key isn't specified
      t.key = initParams.key;
      if (typeof initParams.key === 'undefined') {
        t.key = typeof window === 'undefined' ? 'global' : 'window';
      }

      // Get a good depth default.  Default unless key = window.
      if (typeof initParams.depth === 'undefined') {
        if (!initParams.key && t.key === 'window') {
          t.depth = 1;
        } else {
          t.depth = DEFAULT_DEPTH;
        }
      } else {
        t.depth = initParams.depth;
      }

      // Evaluate the expression to see if it's a Backbone.Model
      // This will throw an exception if the key is a bad expression
      t.value = t._evaluate(t.key);
      t.isModel = t.value instanceof Backbone.Model;

      // Set the initial values
      t.set({
        value: Monitor.deepCopy(t.value, t.depth),
        isModel: t.isModel
      });

      // Watch for backbone model changes, or initialize the polling probe
      if (t.isModel) {
        t.value.on('change', t.poll, t);
      } else {
        PollingProbe.prototype.initialize.apply(t, arguments);
      }
    },

    /**
    * Remotely set the inspected variable's value
    *
    * @method set_control
    * @param attrs {Object} Name/Value attributes to set.  All must be writable.
    * @param callback {Function(error)} Called when the attributes are set or error
    */
    set_control: function(attrs, callback) {
      var t = this;

      // Value is the only thing to set
      if (typeof attrs.value === 'undefined') {
        return callback({code:'NO_VALUE'});
      }

      // Set the model elements.  These cause change events to fire
      if (t.isModel) {
        t.value.set(attrs.value);
      }
      else {
        // Set the variable directly
        var jsonValue = JSON.stringify(attrs.value);
        t._evaluate(t.key + ' = ' + jsonValue);
        t.set('value', attrs.value);
      }
      return callback();
    },

    // Stop watching for change events or polling
    release: function() {
      var t = this;
      if (t.isModel) {
        t.value.off('change', t.poll, t);
      } else {
        PollingProbe.prototype.release.apply(t, arguments);
      }
    },

    /**
    * Evaluate an expression, returning the depth-limited results
    *
    * @method eval_control
    * @param expression {String} Expression to evaluate
    * @param [depth=2] {Integer} Depth of the object to return
    * @return value {Mixed} Returns the depth-limited value
    */
    eval_control: function(expression, depth){
      var t = this;

      // Determine a default depth
      depth = typeof depth === 'undefined' ? DEFAULT_DEPTH : depth;

      // Get the raw value
      var value = t._evaluate(expression);

      // Return the depth limited results
      return Monitor.deepCopy(value, depth);
    },

    /**
    * Evaluate an expression, returning the raw results
    *
    * @protected
    * @method _evaluate
    * @param expression {String} Expression to evaluate
    * @return value {Mixed} Returns the expression value
    */
    _evaluate: function(expression){
      var t = this,
          value = null;

      // Evaluate the expression
      try {
        value = eval(expression);
      } catch (e) {
        var err = 'Unable to evaluate expression: "' + expression + '"';
        logger.error('evaluate', err);
        throw new Error(err);
      }

      // Return the value
      return value;
    },

    /**
    * Poll for changes in the evaluation
    *
    * @method poll
    */
    poll: function() {
      var t = this,
          newValue = t.eval_control(t.key, t.depth);

      // Set the new value if it has changed from the current value
      if (!_.isEqual(newValue, t.get('value'))) {
        t.set({value: newValue});
      }
    }
  });

}(this));

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
