// ConnectionTest.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // This should be run before other tests to set up configurations
  process.env.NODE_ENV='test';
  var config = require('config');

  // Dependencies
  var Monitor = require('../lib/index'),
      Connection = Monitor.Connection, Backbone = Monitor.Backbone,
      server, serverPort;

  /**
  * Unit tests for the <a href="Connection.html">Connection</a> class.
  * @class ConnectionTest
  */

  /**
  * Test group for connection functionality
  * @method Connection
  */
  module.exports['Connection'] = {

    /**
    * Create a <a href="Server.html">Server</a> to test connections with
    * @method Connection-setUp
    */
    setUp: function(callback) {
      server = new Monitor.Server();
      server.start(callback);
    },

    /**
    * Tests that the Connection classes are available
    * @method Connection-Classes
    */
    Classes: function(test) {
      test.ok(Connection.prototype instanceof Backbone.Model, 'The Connection data model is in place');
      test.ok(Connection.List.prototype instanceof Backbone.Collection, 'The Connection.List collection is in place');
      test.done();
    },

    /**
    * Assure that a connect / disconnect to the server host/port works
    * @method Connection-ConnectDisconnect
    */
    ConnectDisconnect: function(test) {
      var port = server.get('port'), conn = new Monitor.Connection({hostName:'localhost', hostPort:port});
      conn.on('connect', function() {
        test.ok(conn.get('remoteHostName'), 'The remote host name is known');
        conn.on('disconnect', test.done);
        conn.disconnect();
      });
    },

    /**
    * Test pinging the remote connection
    * @method Connection-PingPong
    */
    PingPong: function(test) {
      var port = server.get('port'), conn = new Monitor.Connection({hostName:'localhost', hostPort:port});
      conn.on('connect', function() {
        test.ok(conn.get('remoteHostName'), 'The remote host name is known');
        conn.ping(function(){
          test.ok(true, 'Ping made its way to and from the remote server');
          conn.on('disconnect', test.done);
          conn.disconnect();
        });
      });
    },

    /**
    * Tear down the test Server
    * @method Connection-tearDown
    */
    tearDown: function(callback) {
      server.stop(callback);
    }

  };

}(this));
