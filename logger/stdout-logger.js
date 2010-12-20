/******************************************************************************* 
* stdout-logger.js - A simple logger function for sending logs to stdout
********************************************************************************
* Input:
*   message - The message to send to stdout
*   value - The monitor value (not used)
*   data - The log data object (not used)
*   monitor - The monitor object (not used)
*   
* Output:
*   none (except the log message sent to stdout)
*/
var deps = require('../deps');
deps._.out("stdout");
module.exports = function(message, value, data, monitor) {

  // Output just the message
  deps.out.puts(message);
  
};