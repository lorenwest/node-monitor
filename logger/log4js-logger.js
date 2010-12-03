/*******************************************************************************
* log4js-logger.js - A node-monitor logger using log4js
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var _ = deps._;

/******************************************************************************* 
* Log4jsLogger
********************************************************************************
* This returns a logger function for sending log output to a log4js logger.
* The log4js logger is specified and setup in your configuration file.
* 
* If the log is an event, this logs using the INFO level.  If it's an error
* it logs using the ERROR level.
* 
* For example, if you're following the node-config and node-monitor patterns, 
* and the following is at the top of your Customer module:
* 
*   var config = require('config')('Customer'); 
*   var monitor = require('monitor')('Customer', config.monitors);
*   
* And your deployment configuration defines log4js loggers, then you can
* attach those loggers to various monitors.  Example:
* 
*   // production.js - Configurations for the production deployment
*   var log4js = require('log4js');
*   log4js.addAppender(log4js.consoleAppender());
*   log4js.addAppender(log4js.fileAppender('logs/customer.log'), 'events');
*   log4js.addAppender(log4js.fileAppender('logs/customer.err'), 'errors');
*   var eventLogger = log4js.getLogger('events');
*   var errorLogger = log4js.getLogger('errors');
*   
*   // Attach the log4js loggers as defaults for the Customer monitor
*   module.exports = {
*     'Customer': {
*       'monitors': {
*         'default': {
*           eventLogger: require('monitor/log4js-logger')(eventLogger)
*           errorLogger: require('monitor/log4js-logger')(errorLogger),
*         }
*       }
*     }
*   }
*   
* Then the following call will output an ERROR log to the log4j logger.
*   
*   monitor.error('Customer save error', {error:err, customer:customer});
* 
* Input:
*   logger: (required) The log4js logger to use.
*
* Output:
*   A logger function to attach to an eventLogger or errorLogger
*/
var Log4jsLogger = module.exports = function(logger) {

  // Build the logger function
  var loggerFunction = function(message, value, data, monitor) {

    // Log the error or event info
	if (monitor.getLast().isError) {
	  logger.error(message);
	} else {
	  logger.info(message);
	}
  };

  // Return the logger function
  return loggerFunction;
};
