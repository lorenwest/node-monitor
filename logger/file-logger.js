/*******************************************************************************
* file-logger.js - A node-monitor logger for logging to an O/S file
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var _ = deps._;
var fs = require('fs');

/******************************************************************************* 
* FileLogger
********************************************************************************
* This returns a logger function which sends log information to a file.
* 
* For example, if you're following the node-config and node-monitor patterns, 
* and the following is at the top of your Customer module:
* 
*   var config = require('config')('Customer'); 
*   var monitor = require('monitor')('Customer', config.monitors);
*   
* And your deployment configuration defines this logger as the eventLogger
* 
*   // production.js - Configurations for the production deployment
*   module.exports = {
*     'Customer': {
*       'monitors': {
*         'default': {
*           eventLogger: 
*             require('monitor/file-logger')('/tmp/customer.log');
*         }
*       }
*     }
*   }
*
* Then the following will log the 'new customer' event to /tmp/customer.log:
*
*   monitor.event('new customer', {id: customerId});
*
* Input:
*   filename - The logfile name to append to (default: './monitor.log').
*   callback(err, written) - An optional function to call once the 
*     log is written.  It's passed any errors, and the number of bytes written.
*
* Output:
*   A logger function to attach to an eventLogger or errorLogger
*/
var FileLogger = module.exports = function(filename, callback) {

  // Initialize
  filename = filename || "./monitor.log";

  // Make sure the file is open before we start writing (using sync)
  var fd = fs.openSync(filename, 'a', 0644);    

  // Cleanup on exit
  process.addListener("exit", function() { fs.close(fd); });

  // Build the logger function
  var loggerFunction = function(message, value, data, monitor) {

    // Send the message and call the callback
    fs.write(fd, message + "\n", null, "utf-8", callback);
  };

  // Return the logger function
  return loggerFunction;
};
