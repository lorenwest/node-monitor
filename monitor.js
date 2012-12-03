// monitor.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Load dependencies
  var Monitor = require('./lib/index'),
      Server = Monitor.Server,
      UI = Monitor.UI,
      UIServer = UI.Server,
      OS = require('os');

  /**
  * Entry point into the monitor UI server application
  *
  * This is the module loaded and run by Node.js on program start.
  * It bootstraps the node.js monitor server.
  *
  * @static
  * @class ui
  */

  // Display the logo
  console.log("");
  console.log("             _________                                  __________");
  console.log("___________________  /____      _______ ___________________(_)_  /______________");
  console.log("__  __ \\  __ \\  __  /_  _ \\     __  __ `__ \\  __ \\_  __ \\_  /_  __/  __ \\_  ___/");
  console.log("_  / / / /_/ / /_/ / /  __/     _  / / / / / /_/ /  / / /  / / /_ / /_/ /  /");
  console.log("/_/ /_/\\____/\\__,_/  \\___/      /_/ /_/ /_/\\____//_/ /_//_/  \\__/ \\____//_/");
  console.log("");

  // Boot the UI server.
  // This accepts http and websocket connections on the configured port.
  var uiServer = new UIServer();
  uiServer.start(function() {
    // If the host can connect from any IP address (INADDR_ANY), display the DNS hostname
    var connectTo = Monitor.Config.MonitorUI.allowExternalConnections ? OS.hostname() : 'localhost';
    console.log("Now showing at http://" + connectTo + ":" + uiServer.get('port') + "/");

    // Output security concerns
    if (!Monitor.Config.MonitorUI.allowExternalConnections) {
      console.log("");
      console.log("External connections disabled.");
      console.log("See " + process.cwd() + "/config/external.js for more information.");
    }
  });

  // Boot another Monitor server for accepting websocket connections
  // on the standard Monitor port range.
  var server = new Server();
  server.start();

  // Process uncaught exceptions.
  process.on('uncaughtException', function(err){

    // On laptop sleep/startup the DNS servers aren't immediately available,
    // resulting in a flood of these for socket.io until DNS services are back up.
    if (err.message === 'ECONNREFUSED, Could not contact DNS servers') {
      return;
    }

    // Don't allow the process to continue in an unknown state.
    console.error("Uncaught Exception: " + err.message);
    console.error(err.stack);
    uiServer.stop(function(){
      process.exit(1);
    });

    // Don't wait around if the server is hung.
    setTimeout(function(){process.exit(1);}, 2000);
  });

}(this));
