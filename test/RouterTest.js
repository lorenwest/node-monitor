// RouterTest.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // This should be run before other tests to set up configurations
  process.env.NODE_ENV='test';
  var config = require('config');

  // Dependencies
  var Monitor = require('../lib/index'),
      Router = Monitor.Router, Backbone = Monitor.Backbone,
      server, serverPort, internal, external, gateway,
      probeConnection, gatewayConnection, eventConnection,
      _ = Monitor._;

  /**
  * Unit tests for the <a href="Router.html">Router</a> class.
  * @class RouterTest
  */

  /**
  * Tests for baseline Router functionality
  *
  * @method Router
  */
  module.exports['Router'] = {

    /**
    * Create a <a href="Server.html">Server</a> to test routing with
    * @method Router-SetUp
    */
    SetUp: function(test) {
      process.env.NODE_APP_INSTANCE = 'test';
      server = new Monitor.Server();
      server.start(test.done);
    },

    /**
    * Tests that Router classes are in place
    * @method Router-Classes
    */
    Classes: function(test) {
      test.ok(Router.prototype instanceof Backbone.Model, 'The Router data model is in place');
      test.done();
    },

    /**
    * Test that the router finds an internal probe
    * @method Router-ConnectInternal
    */
    ConnectInternal: function(test) {
      internal = new Monitor({probeClass:'Process', initParams:{a:'b'}});
      internal.connect(function(error) {
        test.ok(!error, 'The error was ' + JSON.stringify(error));
        var probeId = internal.get('probeId');
        test.ok(probeId, "The router found the internal probe");
        test.done();
      });
    },

    /**
    * Test that the same probe is connected when requested with the same initParams
    * @method Router-InternalSameProbe
    */
    InternalSameProbe: function(test) {
      var other = new Monitor({probeClass:'Process', initParams:{a:'b'}});
      other.connect(function(error) {
        test.ok(!error, 'The error was ' + JSON.stringify(error));
        var internalId = internal.get('probeId');
        var otherId = other.get('probeId');
        test.equal(internalId, otherId, "Two monitors created with the same initParams are connected to the same probe id: " + internalId);
        other.disconnect(test.done);
      });
    },

    /**
    * Test that different probes are connected when requested with the different initParams
    * @method Router-InternalDifferentProbe
    */
    InternalDifferentProbe: function(test) {
      var other = new Monitor({probeClass:'Process', initParams:{a:'c'}});
      other.connect(function(error) {
        test.ok(!error, 'The error was ' + JSON.stringify(error));
        var internalId = internal.get('probeId');
        var otherId = other.get('probeId');
        test.notEqual(internalId, otherId, "Two monitors created with the same initParams are connected to different probes");
        other.disconnect(test.done);
      });
    },

    /**
    * Test that the router finds an external probe
    * @method Router-ConnectExternal
    */
    ConnectExternal: function(test) {
      external = new Monitor({probeClass:'Process', hostName:'localhost', initParams:{a:'b'}});
      external.connect(function(error) {
        test.ok(!error, 'The error was ' + JSON.stringify(error));
        var probeId = external.get('probeId');
        test.ok(probeId, "The router found the remote probe based on class and host");
        test.done();
      });
    },

    /**
    * Test the getConnection method returns the connection
    * @method Router-GetConnection
    */
    GetConnection: function(test) {
      var connection = external.getConnection();
      test.ok(connection instanceof Monitor.Connection, "The remote connection is found");
      test.ok(connection.get('remoteHostName'), "The connection as a remote host name");
      test.done();
    },

    /**
    * Test that the same external probe is connected when requested with the same initParams
    * @method Router-ExternalSameProbe
    */
    ExternalSameProbe: function(test) {
      var other = new Monitor({probeClass:'Process', hostName:'localhost', initParams:{a:'b'}});
      other.connect(function(error) {
        test.ok(!error, 'The error was ' + JSON.stringify(error));
        var externalId = external.get('probeId');
        var otherId = other.get('probeId');
        test.equal(externalId, otherId, "Two monitors created with the same initParams are connected to the same probe id: " + externalId);
        other.disconnect(test.done);
      });
    },

    /**
    * Test that different external probes are connected when requested with the different initParams
    * @method Router-ExternalDifferentProbe
    */
    ExternalDifferentProbe: function(test) {
      var other = new Monitor({probeClass:'Process', hostName:'localhost', initParams:{a:'c'}});
      other.connect(function(error) {
        test.ok(!error, 'The error was ' + JSON.stringify(error));
        var externalId = external.get('probeId');
        var otherId = other.get('probeId');
        test.notEqual(externalId, otherId, "Two monitors created with the same initParams are connected to different probes");
        other.disconnect(test.done);
      });
    },

    /**
    * Test that the router can connect with a probe in an app by instance ID
    * @method Router-ByAppInstance
    */
    ByAppInstance: function(test) {
      // Don't connect locally
      delete process.env.NODE_APP_INSTANCE;

      external = new Monitor({probeClass:'Process', appInstance: 'test', initParams:{a:'b'}});
      external.connect(function(error) {
        test.ok(!error, 'The error was ' + JSON.stringify(error));
        test.equal('test', external.probe.connection.get('remoteAppInstance'), 'Verified the probe connected to the right instance');
        var probeId = external.get('probeId');
        test.ok(probeId, "The router found the remote probe based on instance id");
        test.done();
      });
    },

    /**
    * Test that the local probe forwards change events
    * @method Router-InternalChanges
    */
    InternalChanges: function(test) {
      var onChange = function() {
        test.ok(true, 'The change event was fired');
        var changes = internal.changedAttributes();
        test.ok(changes, 'Discovered changed attributes: ', _.keys(changes));
        internal.off('change', onChange);
        test.done();
      };
      internal.on('change', onChange);
    },

    /**
    * Test that the remote probe forwards change events
    * @method Router-ExternalChanges
    */
    ExternalChanges: function(test) {
      var onChange = function() {
        test.ok(true, 'The change event was fired');
        var changes = external.changedAttributes();
        test.ok(changes, 'Discovered changed attributes: ', _.keys(changes));
        external.off('change', onChange);
        test.done();
      };
      external.on('change', onChange);
    },

    /**
    * Test that the router can route control an external probe
    * @method Router-ControlExternal
    */
    ControlExternal: function(test) {
      external.control('ping', function(error, response) {
        test.ok(!error, 'The error was ' + JSON.stringify(error));
        test.ok(response, 'The response was ' + JSON.stringify(response));
        test.equal(response, 'pong', "Sent a message to, and received the expected response.");
        test.done();
      });
    },

    /**
    * Test that a disconnect to an internal probe works
    * @method Router-DisconnectInternal
    */
    DisconnectInternal: function(test) {
      internal.disconnect(function(error) {
        test.ok(!error, 'The error was ' + JSON.stringify(error));
        internal = null;
        test.done();
      });
    },

    /**
    * Test that a disconnect to an external probe works
    * @method Router-DisconnectExternal
    */
    DisconnectExternal: function(test) {
      external.disconnect(function(error) {
        test.ok(!error, 'The error was ' + JSON.stringify(error));
        test.done();
      });
    },

    /**
    * Test that the external connection:add event is fired on add.
    * @method Router-ConnectionAddEvent
    */
    ConnectionAddEvent: function(test) {
      var router = Monitor.getRouter();
      var onConnect = function(connection) {
        eventConnection = connection;
        test.ok(connection !== null, 'The connection was established');
        var hostName = connection.get('hostName');
        test.ok(hostName === '127.0.0.1', 'The connection was with the expected host');
        router.off('connection:add', onConnect);
        test.done();
      };
      router.on('connection:add', onConnect);
      external = new Monitor({probeClass:'Process', hostName:'127.0.0.1', initParams:{a:'b'}});
      external.connect();
    },

    /**
    * Test that the external connection:remove event is fired on connection remove.
    * @method Router-ConnectionRemoveEvent
    */
    ConnectionRemoveEvent: function(test) {
      var router = Monitor.getRouter();
      var onDisconnect = function(connection) {
        test.ok(connection !== null, 'The connection was removed');
        var hostName = connection.get('hostName');
        test.ok(hostName === '127.0.0.1', 'The disconnect was with the expected host');
        router.off('connection:remove', onDisconnect);
        test.done();
      };
      router.on('connection:remove', onDisconnect);
      router.removeConnection(eventConnection);
    },

    /**
    * Tear down the test Server and disconnect the test probes
    * @method Router-TearDown
    */
    TearDown: function(test) {
      server.stop(test.done);
    }

  };

}(this));
