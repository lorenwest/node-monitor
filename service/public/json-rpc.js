/*******************************************************************************
* json-rpc.js - JSON-RPC over Socket-IO
********************************************************************************
* This is a common client and server side module for processing incoming client
* JSON-RPC calls over socket-io, and for sending JSON-RPC calls to remote 
* servers.
*/


/*******************************************************************************
* jsonrpc - Constructor
********************************************************************************
* Input:
*   socket - The connected socketIO socket object (from the client or server).
*   monitor - Either null or a package monitor.
*/
var jsonrpc = function(socket, monitor) {
	
  // Initialize
  var t = this;
  t.socket = socket;
  t.monitor = monitor;
  t.nextRpcId = 1;
  t.rpcCallbacks = {};
  t.lastClient = null;
  t.isServerSide = socket.options.origins != null;

  // These are maps of message name to listener functions
  t.callListeners = {};
  t.notifyListeners = {};
  t.callsAwaitingConnect = [];
  t.notifiesAwaitingConnect = [];

  // Bind the listeners on connection start
  var connectStr = t.isServerSide ? 'connection' : 'connect';
  socket.on(connectStr, function(client){

    // The socket is the client on client-side
	if (!t.isServerSide) client = t.socket;

    // Remember the last connected client
	t.lastClient = client;

    // Monitor the connections
	var sessionId = t.isServerSide ? client.sessionId : '';
	if (t.monitor) {
	  t.monitor.event("JSON-RPC Connect",{sessionId:sessionId});
	}

    // Bind incoming messages
	client.on('message', function(msg) {
      t.incomingMsg(client, msg);
	});

    // Bind the disconnect
    client.on('disconnect', function(){ 
	  if (t.monitor) {
	    t.monitor.event("JSON-RPC Disconnect",{sessionId:sessionId});
	  }
    });

    // Send any calls and notifies awaiting connection
	while (t.notifiesAwaitingConnect.length) {
	  var notify = t.notifiesAwaitingConnect.pop();
      t.notify(notify.method, notify.params);
	}
	while (t.callsAwaitingConnect.length) {
	  var call = t.callsAwaitingConnect.pop();
      t.call(call.method, call.params, call.callback);
	}

  });

}; // jsonrpc()

/*******************************************************************************
* incomingMsg - Process incoming messages
********************************************************************************
* Input:
*   client - The socketIO client object
*   msg - The full body of the incoming message - as a string
*/
jsonrpc.prototype.incomingMsg = function(client, msg) {

  // Initialize
  var t = this;
  var trxId = Math.random().toString().substr(2);
  var startTime = new Date();

  // Parse the incoming message, and make sure it's JSONRPC
  try {
    // Extract the JSON RPC elements
    var jsonRpc = JSON.parse(msg);
    var msgId = jsonRpc.id;
    var method = jsonRpc.method;
    // We use named params in the first argument
    var params = jsonRpc.params ? jsonRpc.params[0] : null;
    // Return elements
    var result = jsonRpc.result;
    var error = jsonRpc.error;
  }
  catch (e) {
    var err = {msg:"Error parsing the return message", trxId:trxId,
      error:e, jsonRpc:jsonRpc};
    if (t.monitor) {
      t.monitor.error("JSON-RPC incoming parse exception", err);
    }
    t.notify("JSON-RPC-Error", err, client);
    return;
  }

  // Process a return message
  if (msgId && (error || result)) {
    try {

      // Send the return message to the callback
      var cb = t.rpcCallbacks[msgId];
      delete t.rpcCallbacks[msgId];
      cb.callback(error, result, trxId);
      if (t.monitor) {
        t.monitor.event("JSON-RPC Return, ms", cb.startTime,
          {trxId:trxId, jsonRpc:jsonRpc});
      }
      return;
    } catch (e) {
      var err = {msg:"Error processing return message", error:e, 
        trxId:trxId, jsonRpc:jsonRpc};
      if (t.monitor) {
        t.monitor.error("JSON-RPC return parse exception", err);
      }
      t.notify("JSON-RPC-Error", err, client);
      return;
    }
  }

  // Process the request
  var request = {trxId:trxId, jsonRpc:jsonRpc, client:client};
  if (msgId) {
    // This is a request desiring a response
    var ret = {id:msgId, method:method};
    try {
      t.callIn(method, params, request, function(err, result){
    	ret.error = err;
    	ret.result = result;
        client.send(JSON.stringify(ret));
        if (t.monitor) {
          t.monitor.event("JSON-RPC inbound call, ms", startTime,
            {trxId:trxId, jsonRpc:jsonRpc});
        }
        return;
      });
    } catch (e) {
      ret.err = {msg:"Error processing the inbound request", error:e, 
        trxId:trxId, jsonRpc:jsonRpc};
      if (t.monitor) {
        t.monitor.error("JSON-RPC inbound call exception", ret.err);
      }
      client.send(JSON.stringify(ret));
      return;
    }
  }
  
  else
  {
    // This is a notification - no response
    try {
      t.notifyIn(method, params, request, function(err){
    	if (t.monitor) {
          t.monitor.event("JSON-RPC inbound notify, ms", startTime,
            {trxId:trxId, jsonRpc:jsonRpc});
    	}
        return;
      });
    } catch (e) {
      var err = {msg:"Error processing the inbound notification", error:e, 
        trxId:trxId, jsonRpc:jsonRpc};
      if (t.monitor) {
        t.monitor.error("JSON-RPC inbound notify exception", err);
      }
      t.notify("JSON-RPC-Error", err, client);
      return;
    }
  }

}; // incomingMsg()

/*******************************************************************************
* notify - Send a notification (no response) to a client or all clients
********************************************************************************
* Input:
*   method - The notification method to send
*   params - The named parameters (as an object) to send to the method
*   client - The socketIO client to send the notification to
*            If null, this is sent to the last connected client
*/
jsonrpc.prototype.notify = function(method, params, client) {

  // Initialize
  var t = this;
  var sendTo = client || t.lastClient;

  // Queue up the notification if the client hasn't connected
  if (sendTo == null) {
    t.notifiesAwaitingConnect.push({method:method, params:params});
    return;
  }

  // Bundle up the JSONRPC notification
  var jsonrpc = {
    id:null, method:method, 
    params: params ? params : []
  };
  var message = JSON.stringify(jsonrpc);

  // Send to the client or broadcast to all clients
  sendTo.send(message);

  // Monitor
  if (t.monitor) {
    t.monitor.event("JSON-RPC outgoing notify", jsonrpc);
  }

}; // notify()

/*******************************************************************************
* call - Execute a message on the specified client, and process the return
********************************************************************************
* Input:
*   method - The method to send
*   params - The named parameters (as an object) to send to the method
*   client - The socketIO client to send the message to.
*            If not specified, it uses the last connected client.
*   callback(err, returnObj) - Callback on return
*     err - The error object if anything bad happened
*     returnObj - An object containing all returned parameters
*/
jsonrpc.prototype.call = function(method) {

  // Initialize
  var t = this, rpcId = "" + t.nextRpcId++;
  var vargs = Array.prototype.slice.call(arguments, 1);
  var callback = vargs.pop();
  var client = vargs.length > 1 ? vargs.pop() : t.lastClient;
  var params = vargs.length > 0 ? vargs.pop() : {};

  // Queue up calls if the client hasn't connected
  if (client == null) {
    t.callsAwaitingConnect.push({method:method, params:params, callback:callback});
    return;
  }

  // Bundle up the JSONRPC method call
  var jsonrpc = {
    id:rpcId, method:method, params: [params]
  };
  var message = JSON.stringify(jsonrpc);

  // Remember this callback 
  t.rpcCallbacks[rpcId] = {
    startTime: new Date(),
    callback:callback
  };

  // Send the message to the client
  client.send(message);

  // Monitor
  if (t.monitor) {
    t.monitor.event("JSON-RPC outgoing call", jsonrpc);
  }

}; // call()

/*******************************************************************************
* notifyIn - Process an incoming JSON-RPC notification
********************************************************************************
*
* Inputs:
*   method - The notification name
*   params - Any named parameters attached to the notification
*   request - The request object
*     trxId - The request transaction ID
*     jsonRpc - The request JSON RPC object
*     client - The socket-io client
*   callback(err) - Callback on complete
*     err - Any error that happened during notification kickoff
*/
jsonrpc.prototype.notifyIn = function(method, params, request, callback) {

  // Call each of the notify listeners for this method
  var t = this, err=null;
  var listeners = t.notifyListeners[method];
  if (listeners) {
    for (var i = 0; i < listeners.length; i++) {
      try {
        listeners[i](params, request);
      } catch (e) {
        err = e;
      }
    }
  }

  // We're done
  callback && callback(err);

}; // notifyIn()


/*******************************************************************************
* callIn - Process an incoming JSON-RPC method call
********************************************************************************
*
* Inputs:
*   method - The method name to process
*   params - The named arguments to the message
*   request - The request object
*     trxId - The request transaction ID
*     jsonRpc - The request JSON RPC object
*     client - The socket-io client
*   callback(err, response) - Callback on complete
*     err - The error to return (in case of failure)
*     response - The object to return
*/
jsonrpc.prototype.callIn = function(method, params, request, callback) {

  // Call the incoming method listener
  var t = this;
  var listener = t.callListeners[method];
  if (listener) {
    listener(params, request, callback);
  }
  else {
    callback({error:"NoListener", msg:"No listener registered for this method"});
  }

}; // callIn()

/*******************************************************************************
* on - Listen for an inbound RPC notification
********************************************************************************
* This adds a function to run on a named inbound RPC notification.
* 
* Inputs:
*   method - The notification method name to listen for
*   listener(params, request) - The function to call when this notification arrives
*     params - The named input parameters to the method
*     request - The JSON-RPC request object, containing
*       trxId - A unique transaction ID for the request (to use in logs)
*       jsonRpc - The JSON-RPC object for the request
*       client - The socket-io client the request came in on
*/
jsonrpc.prototype.on = function(method, listener) {

  // Create or add to the existing list
  var t = this;
  var list = t.notifyListeners[method] || [];
  list.push(listener);
  t.notifyListeners[method] = list;

};

/*******************************************************************************
* detach - Remove an inbound RPC notification listener
********************************************************************************
* This method removes a notify listener that was previously added.  The input
* parameters must be the exact same method name, and the listener object must
* be the same object.
* 
* Inputs:
*   method - The method name
*   listener(params, request) - The function to call when this notification arrives
*     params - The JSON-RPC input parameters to the method
*     request - The JSON-RPC request object, containing
*       trxId - A unique transaction ID for the request (to use in logs)
*       jsonRpc - The JSON-RPC object for the request
*       client - The socket-io client the request came in on
*/
jsonrpc.prototype.detach = function(method, listener) {

  // Remove from the list
  var t = this;
  var list = t.notifyListeners[method] || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i] === listener) {
      list.splice(i, 1);
      i--;
    }
  }

};

/*******************************************************************************
* onCall - Set the call listener for an inbound JSON-RPC call
********************************************************************************
* This method sets the call listener for the specified JSON-RPC method.
* There can only be one call listener for any given message, as the call
* must return data (this differentiates it from a notify).
* 
* Inputs:
*   method - The method name to listen for
*   listener(params, request, callback) - The function to call (or null to remove)
*     params - The JSON-RPC input parameters to the method
*     request - The JSON-RPC request object, containing
*       trxId - A unique transaction ID for the request (to use in logs)
*       jsonRpc - The JSON-RPC object for the request
*       client - The socket-io client the request came in on
*     callback(err, returnParams) - Required callback
*       err - An object to set if any errors occurred
*       returnParams - All return parameters set here
*/
jsonrpc.prototype.onCall = function(method, listener) {

  // Add or remove the listener
  var t = this;
  if (listener) {
    t.callListeners[method] = listener;
  }
  else {
    delete t.callListeners[method];
  }
};

// Export if running within a commonJS environment
try {module.exports = jsonrpc;} catch (e){}
