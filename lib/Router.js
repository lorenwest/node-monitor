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
