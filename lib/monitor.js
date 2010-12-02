/*******************************************************************************
* monitor.js - The monitor class
********************************************************************************
*/

// Dependencies
var deps = require('../deps');

/*******************************************************************************
* Constructor
********************************************************************************
* Inputs:
*   name: This monitor name
*   moduleName: Name of the containing module
*   config: Specific configurations for this monitor:
*     enabled - (boolean) Should the monitor be enabled? (default: true)
*     eventLogger - Logger[s] to use for events (default: console.log)
*     errorLogger - Logger[s] to use for errors (default: console.debug)
*     maxLogSize - Limit the log output to this size (default: 10k)
*   moduleConfig: Default monitor configurations for the module
*     enabled - (boolean) Should the monitor be enabled? (default: true)
*     eventLogger - Logger[s] to use for events (default: console.log)
*     errorLogger - Logger[s] to use for errors (default: console.debug)
*     maxLogSize - Limit the log output to this size (default: 10k)
*/
var monitor = module.exports = function(name, moduleName, config,
  moduleConfig) {

  // Instance variables
  var t = this;
  t.config = _.extendDeep({}, deps.monitorConfig, moduleConfig, config);
  t.name = name;
  t.loggers = {};
  t.moduleName = moduleName;
  t.reset();
};

/*******************************************************************************
* Member variable access
********************************************************************************
*/
var proto = monitor.prototype;
proto.getHits = function() {return this.hits;};
proto.getTotal = function() {return this.total;};
proto.getAvg = function() {return this.avg;};
proto.getMin = function() {return this.min;};
proto.getMax = function() {return this.max;};
proto.getFirst = function() {return this.first;};
proto.getLast = function() {return this.last;};
proto.getConfig = function() {return this.config;};
proto.getName = function() {return this.name;};
proto.getLogger = function(loggerId) {return this.loggers[loggerId];};
proto.getModuleName = function() {return this.moduleName;};
proto.isEnabled = function() {return this.config.enabled;};

/*******************************************************************************
* enable()
********************************************************************************
* This enables or disables the monitor.  Disabling prevents the monitor from
* accumulating values and logging messages on log().
* 
* Input:
*   enabled - (boolean) Enable or disable the monitor
*/
proto.enable = function(enabled) {this.config.enabled = enabled;};

/*******************************************************************************
* addLogger()
********************************************************************************
* Add a logger to the monitor.  A logger is a function that accepts up to 4
* arguments - the formatted message, the event/error numeric value, the error
* or event object, and a reference to this monitor - for accessing monitor
* related data.
* 
* Loggers added using addLogger() will be called for all error and event logging
* called on this monitor.
* 
* Input:
*   loggerFunction(message, value, data, monitor) - A function that's run
*     when an event or error is logged.  The function accepts:
*       message - A formatted message for logging
*       value - The numeric value of the event
*       data - The data object associated with the event
*       monitor - A reference to this monitor object for accessing monitor data
*
* Output:
*   loggerId - An ID associated with this logger so it can be retrieved using
*     getLogger(), and removed using removeLogger().
*/
proto.addLogger = function(loggerFunction) {

  // Generate a unique ID for the logger
  var t = this;
  var id = Math.floor(Math.random() * 100000);
  
  // Add it to the loggers and return the ID
  t.loggers[id] = loggerFunction;
  return id;
};

/*******************************************************************************
* removeLogger()
********************************************************************************
* Remove a logger function that was added using addLogger().  This removes a
* logger by the ID assigned using addLogger().
* 
* Input:
*   loggerId - The ID returned by the addLogger function when adding the logger.
*
* Output: (none)
*/
proto.removeLogger = function(loggerId) {delete this.loggers[loggerId];};

/*******************************************************************************
* reset()
********************************************************************************
* Reset the monitor accumulators.
*/
proto.reset = function() {
  var t=this;
  t.hits=0; t.total=0; t.avg=0; t.min=0; t.max=0; t.first=null; t.last=null;
};

/*******************************************************************************
* logEvent()
********************************************************************************
* Input:
*   value - An optional numeric value to add to the monitor.  Default = 1.  
*           If this is a Date object, the number of milliseconds between the 
*           Date object and Date.now() is added to the monitor.
*   data - An optional object to pass on to the event logger
*   
* Output:
*   monitor - This monitor (for chaining)
*/
proto.logEvent = function(value, data) {
	
  // Initialize
  var t = this;

  // Return early if disabled
  if (!t.config.enabled) return t;

  // Set the value to 1 if it's not supplied
  if (value === null) value = 1;
  if (data == null && (!_.isNumber(value) && !value.getTime)) {
	// Non-numeric, non-date data was supplied as the first argument
    data = value;
    value = 1;
  }

  // Add the value
  value = t._add(value);
  t.last = {value:value, data:data, timestamp:Date.now(), isEvent:true};
  t.first = t.first || t.last;

  // Get a string representation of the object for logging
  var message = t._getLogMessage(value, data);

  // Call the external loggers
  t._callLoggers(message, value, data, t.config.eventLogger);

  // Return this for chaining
  return t;

}; // logEvent()

/*******************************************************************************
* logError()
********************************************************************************
* Monitor an error that shouldn't be occurring.
* 
* Input
*   error - An object representing the error
*   callback - An optional method to call (passing the err) upon logging.
*
* Output:
*   monitor - This monitor (for chaining)
*/
proto.logError = function(error, callback) {
	
  // Initialize
  var t = this;
  var value = 1;

  // Return early if disabled
  if (!t.config.enabled) return t;

  // Add 1 to the monitor
  value = t._add(value);
  t.last = {value:value, error:error, timestamp:Date.now(), isError:true};
  t.first = t.first || t.last;

  // Get a string representation of the object for logging
  var message = t._getLogMessage(value, error);

  // Call the external loggers
  t._callLoggers(message, value, error, t.config.errorLogger, callback);
  
  // Call the callback.  This is cheating a little, because it's called
  // before any async loggers are completed.  We have to do it this way, because
  // we have no way of knowing if a logger is async or not.
  callback && callback(error);

  // Return this for chaining
  return t;

}; // logError()

/*******************************************************************************
* _callLoggers()
********************************************************************************
* Internal method to call associated loggers, continuing even if one or many 
* throw an exception.
* 
* Input:
*   message, value, data - Input to the loggers
*   loggers - Error or event loggers
*/
proto._callLoggers = function(message, value, data, loggers) {
	
  // Initialize
  var t = this;

  // Create an array of all loggers
  var allLoggers = _.isArray(loggers) ? loggers : [loggers];
  for (var loggerId in t.loggers) {allLoggers.push(t.loggers[loggerId]);};
  var numLogers = allLoggers.length;

  // Call the loggers specified in the configuration
  if (loggers) {
	  
    // Turn into an array 
    var loggers = _.isArray(loggers) ? loggers : [loggers];

    // Call each logger, and don't fail for subsequent loggers
    _.each(loggers, function(logger){
      try {logger(message, value, data, t);} catch (e){}
    });
  }

  // Call all manually added loggers, and don't fail for subsequent loggers
  for (var loggerId in t.loggers) {
    try {t.loggers[loggerId](message, value, data, t);} catch (e){}
  }

}; // callLoggers()

/*******************************************************************************
* _add()
********************************************************************************
* Internal method to add a value to the monitor.
* Input:
*   value - An optional numeric value to add to the monitor.  Default = 1.  
*           If this is a Date object, the number of milliseconds between the 
*           Date object and Date.now() is added to the monitor.
*           
* Output:
*   value - The actual value added
*/
proto._add = function(value) {
	
  // Initialize
  var t = this;
  value = _.isUndefined(value) ? 1 : value;
  
  // Compute the duration if value is of type Date
  if (_.isObject(value) && value.getTime) {
    value = Date.now() - value.getTime();
  }

  // Set the accumulators
  t.hits++;
  t.total += value;
  t.avg = t.total / t.hits;
  if (t.hits == 1 || value < t.min) t.min = value;
  if (t.hits == 1 || value > t.max) t.max = value;
  
  // Return the value
  return value;

}; // _add()

/*******************************************************************************
* _getLogMessage()
********************************************************************************
* Internal method to build a standard log message.
* Input:
*   value - The value added to the monitor
*   data - The optional data object passed for logging
*
* Output:
*   logMessage - A string representation for logging
*/
proto._getLogMessage = function(value, data) {

  // Initialize
  var t = this;
  
  // Build and return the message
  var msg = new Date().toFormattedString() 
    + ' [' + t.moduleName + '] ' + t.name + ' ';
  if (value != 1) {msg +=  '(' + value + ') ';}
  if (data) msg += _.outStr('', data, t.config.maxLogSize);
  return msg;

}; // _getLogMessage()
