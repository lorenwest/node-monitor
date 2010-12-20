/******************************************************************************* 
* stderr-logger.js - A simple logger function for sending logs to stderr
********************************************************************************
* Input:
*   message - The message to send to stdout
*   value - The monitor value (not used)
*   data - The log data object (not used)
*   monitor - The monitor object (not used)
*   
* Output:
*   none (except the log message sent to stderr)
*/
var deps = require('../deps');
module.exports = function(message, value, data, monitor) {

  // Output the formatted message
  deps.out.debug(message);

};
