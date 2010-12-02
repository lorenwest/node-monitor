/*******************************************************************************
* os-cmd-logger.js - A node-monitor logger for running O/S commands
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var exec = require('child_process').exec;

/******************************************************************************* 
* OSCmdLogger
********************************************************************************
* This returns a logger function which invokes an operating system command
* whenever run.  For example, if you're following the node-config and 
* node-monitor patterns, and the following is at the top of your Customer
* module:
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
*         'new customer': {
*           eventLogger: 
*             require('monitor/os-cmd-logger')('/bin/new_customer {{data.id}}')
*         }
*       }
*     }
*   }
*   
* Then the following monitor will call /bin/new_customer passing the customer
* id:
*   
*   monitor.event('new customer', {id: customerId});
* 
* Input:
*   osCmd - An operating system command to run, with optional parameters 
*           enclosed in mustache-style template parameters.  
*           Parameters include:
*             message: A pre-formatted string message to log
*             value: The numeric value passed to this monitor
*             data: The data object passed in to the event/error log
*             monitor: The monitor object.  The template can specify methods to
*                      run on this object such as "{{monitor.getAvg()}}"
*   callback(error, stdout, stderr) - An optional function to call once the 
*           osCmd completes.  It's passed any errors, and the stdout/stderr
*           contents.
*
* Output:
*   A logger function to attach to an eventLogger or errorLogger
*/
var OSCmdLogger = module.exports = function(osCmd, callback) {

  // Build a new OSCmd logger function
  var loggerFunction = function(message, value, data, monitor) {

	// Build the object to pass to the template
    var obj = {message:message, value:value, data:data, monitor:monitor};

    // Apply the template, using mustache style delimiters
    var origSettings = _.templateSettings;
    _.templateSettings = {
      // start: "{{",
      // end: "}}",
      interpolate: /\{\{(.+?)\}\}/g
    };
    var cmd = _.template(osCmd, obj);
    _.templateSettings = origSettings;

    // Now run the command
    exec(cmd, callback);

  };
  
  // Return the logger function
  return loggerFunction;
  
};
