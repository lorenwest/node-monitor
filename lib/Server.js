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
