// ServerTest.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // This should be run before other tests to set up configurations
  process.env.NODE_ENV='test';
  var config = require('config');

  // Dependencies
  var Monitor = require('../lib/index'),
      Server = Monitor.Server, Backbone = Monitor.Backbone;

  /**
  * Unit tests for the <a href="Server.html">Server</a> class.
  * @class ServerTest
  */

  /**
  * Test group for baseline Server functionality
  *
  * @method Server
  */
  module.exports['Server'] = {

    setUp: function(callback) {callback();},
    tearDown: function(callback) {callback();},

    /**
    * Tests that Server classes are in place
    * @method Server-Classes
    */
    Classes: function(test) {
      test.ok(Server.prototype instanceof Backbone.Model, 'The Server data model is in place');
      test.ok(Server.List.prototype instanceof Backbone.Collection, 'The Server.List collection is in place');
      test.done();
    },

    /**
    * Start and Stop a server
    * @method Server-StartStop
    */
    StartStop: function(test) {
      var server = new Monitor.Server();
      server.on('start', function() {
        test.ok(server.get('port') > 0, 'The server started accepting connections on a port');
        server.stop(function(){
          test.ok(true, 'The server has stopped');
          test.done();
        });
      });
      server.start();
    },

    /**
    * Verify multiple servers start on different ports
    * @method Server-MultipleStartStop
    */
    MultipleStartStop: function(test) {
      var server1 = new Monitor.Server(), port1, port2;
      server1.on('start', function() {
        port1 = server1.get('port');
        test.ok(port1 >= Monitor.Config.Monitor.serviceBasePort, 'The server started in the correct port range');
        var server2 = new Monitor.Server();
        server2.on('start', function() {
          port2 = server2.get('port');
          test.notEqual(port1, port2, 'Two servers started on two different ports');
          server1.stop(function(){
            server2.stop(function(){
              test.ok(true, 'Both servers have stopped');
              test.done();
            });
          });
        });
        server2.start();
      });
      server1.start();
    }

  };

}(this));
