/*******************************************************************************
* socket-io.js - Routing for all socket-io services
********************************************************************************
*/

// Dependencies
var deps = require('../../deps');
var config = deps.monitorConfig.service;
var monitor = deps.serverMonitor;
var socketIO = require('socket.io');
var socketListener = module.exports.socketListener = null;

/*******************************************************************************
* attach - Attach the socket IO services to the specified server
********************************************************************************
*/
module.exports.attach = function(server) {

  // Have the socket.io package listen on the server.
  socketListener = socketIO.listen(server);


  // Create a JSONRPC stack for each attached client
  socketListener.on('connection', function(client){

    // Monitor the connections
	var sessionId = client.sessionId;
	monitor.event("SocketIO Connect",{sessionId:sessionId});

    // Process an incoming SocketIO message
    client.on('message', function(msg){ 

      // Parse the incoming message, and make sure it's JSONRPC
      var startTime = new Date();
      try {
        // Extract the JSON RPC elements
        var jsonRpc = JSON.parse(msg);
        var id = jsonRpc.id;
        var method = jsonRpc.method;
        // We use named params in the first argument
        var params = jsonRpc.params ? jsonRpc.params[0] : null;
        // Return elements
        var result = jsonRpc.result;
        var error = jsonRpc.error;
      }
      catch (e) {
        var err = {msg:"Error parsing the return message", error:e, jsonRpc:jsonRpc}
        monitor.error("SocketIO incoming parse exception", err);
        module.exports.notify(client, "SocketIOError", err);
        return;
      }

      // Process a return message
      if (id && (error || result)) {
        try {

          // Send the return message to the callback
          var cb = client.rpcCallbacks[id];
          delete client.rpcCallbacks[id];
          cb.callback(error, result);
          monitor.event("JSON-RPC Return, ms", cb.startTime);
          return;
        } catch (e) {
          var err = {msg:"Error processing return message", error:e, jsonRpc:jsonRpc}
          monitor.error("SocketIO return parse exception", err);
          module.exports.notify(client, "SocketIOError", err);
          return;
        }
      }

      // Process the request
      if (id) {
        // This is a request desiring a response
        var ret = {id: id, result:null, error:null};
        try {
          module.exports.callIn(client, method, params, function(err, result){
        	ret.error = err;
        	ret.result = result;
            client.send(JSON.stringify(ret));
            monitor.event("JSON-RPC inbound call, ms", cb.startTime);
            return;
          });
        } catch (e) {
          ret.err = {msg:"Error processing the inbound request", error:e, jsonRpc:jsonRpc}
          monitor.error("SocketIO inbound call exception", ret.err);
          client.send(JSON.stringify(ret));
          return;
        }
      }
      
      else
      {
   	    // This is a notification - no response
        try {
          module.exports.notifyIn(client, method, params, function(err){
        	ret.error = err;
        	ret.result = null;
            monitor.event("JSON-RPC inbound notify, ms", cb.startTime);
            return;
          });
        } catch (e) {
          var err = {msg:"Error processing the inbound notification", error:e, jsonRpc:jsonRpc}
          monitor.error("SocketIO inbound notify exception", err);
          module.exports.notify(client, "SocketIOError", err);
          return;
        }
      }

    }); // on('message')

    // Disconnect from the client
    client.on('disconnect', function(){ 
	  monitor.event("SocketIO Disconnect",{sessionId:sessionId});
    });

  });

}; // attach()

/*******************************************************************************
* notify - Send a notification (no response) to a client or all clients
********************************************************************************
* Input:
*   client - The socketIO client to send the notification to
*            If null, this notification is broadcast to all clients
*   method - The notification method to send
*   params - The named parameters (as an object) to send to the method
*/
module.exports.notify = function(client, method, params) {

  // Bundle up the JSONRPC notification
  var jsonrpc = {
    id:null, method:method, 
    params: params ? params : [null]
  };
  var message = JSON.stringify(jsonrpc);

  // Send to the client or broadcast to all clients
  if (client) {
    client.send(message);
  } else {
	socketListener.broadcast(message);
  }

}; // notify()

/*******************************************************************************
* send - Send a message to the specified client, and process the return
********************************************************************************
* Input:
*   client - The socketIO client to send the message to.  Cannot be null.
*   method - The method to send
*   params - The named parameters (as an object) to send to the method
*   callback(err, returnObj) - Callback on return
*     err - The error object if anything bad happened
*     returnObj - An object containing all returned parameters
*/
module.exports.send = function(client, method, params, callback) {

  // Get the next RPC ID for the client
  client.nextRpcId = client.nextRpcId ? ++client.nextRpcId : 1;

  // Bundle up the JSONRPC method call
  var jsonrpc = {
    id:client.nextRpcId, method:method, 
    params: params ? [params] : [null]
  };
  var message = JSON.stringify(jsonrpc);

  // Remember this callback onto the client object
  client.rpcCallbacks[client.nextRpcId] = {
    startTime: new Date(),
    callback:callback
  };
  
  // Send the message to the client
  client.send(message);

}; // send()

/*******************************************************************************
* notifyIn - Process an incoming notification
********************************************************************************
*
* Inputs:
*   client - The socketIO client the message came from
*   method - The notification name
*   params - Any named parameters attached to the notification
*   callback(err) - Callback on complete
*     err - Any error that happened during notification process
*/
module.exports.notifyIn = function(client, method, params, callback) {


}; // notifyIn()


/*******************************************************************************
* callIn - Process an incoming socketio message call
********************************************************************************
*
* Inputs:
*   client - The socketIO client the message came from
*   method - The method name to process
*   params - The named arguments to the message
*   callback(err, response) - Callback on complete
*     err - The error to return (in case of failure)
*     response - The object to return
*/
module.exports.callIn = function(client, method, params, callback) {


}; // callIn()
