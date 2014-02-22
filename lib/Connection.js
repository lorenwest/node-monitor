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
