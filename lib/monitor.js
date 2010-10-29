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
*     logFn - The logger function to use (default: system console debug)
*     maxLogSize - Limit the log output to this size (default: 10k)
*   moduleConfig: Default monitor configurations for the module
*     enabled - (boolean) Should the monitor be enabled? (default: true)
*     logFn - The logger function to use (default: system console debug)
*     maxLogSize - Limit the log output to this size (default: 10k)
*/
var monitor = module.exports = function(name, moduleName, config,
  moduleConfig) {

  // Instance variables
  var t = this;
  t.config = _.extendDeep({}, deps.monitorConfig, moduleConfig, config);
  t.name = name;
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
proto.getConfig = function() {return this.config;};
proto.getName = function() {return this.name;};
proto.getModuleName = function() {return this.moduleName;};
proto.isEnabled = function() {return this.config.enabled;};

/*******************************************************************************
* enable()
********************************************************************************
* This enables or disables the monitor.  Disabling prevents the monitor from
* accumulating values and logging messages on add().
* 
* Input:
*   enabled - (boolean) Enable or disable the monitor
*/
proto.enable = function(enabled) {this.config.enabled = enabled;};

/*******************************************************************************
* reset()
********************************************************************************
* Reset the monitor accumulators.
*/
proto.reset = function() {
  var t=this;
  t.hits=0; t.total=0; t.avg=0; t.min=0; t.max=0;
};

/*******************************************************************************
* add()
********************************************************************************
* This adds a numeric value to the monitor, and optionally logs a message.
* 
* Input:
*   value - A numeric value to add to the monitor (default: 1 if null)
*   logMessage - A string or object containing information to log
*   logData - An arbitrary object full of data to log
*   
* Output:
*   monitor - The monitor (this) for chaining
*/
proto.add = function(value, logMessage, logData) {
	
  // Initialize
  var t = this;
  if (_.isUndefined(value)) value = 1;
  logData = logData || {};

  // Return early if disabled
  if (!t.config.enabled) return;

  // Set the accumulators
  t.hits++;
  t.total += value;
  t.avg = t.total / t.hits;
  if (t.hits == 1 || value < t.min) t.min = value;
  if (t.hits == 1 || value > t.max) t.max = value;
  
  // Return early if no logging required
  if (!t.config.logFn || !logMessage) return;

  // Get a string representation of the object for logging
  if (!_.isString(logMessage)) {
    logMessage = _.outStr("monitor", logMessage, t.config.maxLogSize);
  }

  // Add to the logData structure
  logData.monitor = t;
  logData.timestamp = new Date().getTime();

  // Log using the log function
  t.config.logFn(logMessage, logData);
  
  // Return this for chaining
  return this;

};

/*******************************************************************************
* log()
********************************************************************************
* This is a proxy for add(1, null, logData).  It's designed for logging the fact
* that a normal event happened.  An optional log object can be passed to allow
* a custom logger to report specific data.
* 
* Example:
*   var monitor = require('monitor')('myModule');
*   ...
*   monitor.log('CreditCheck', customer);
* 
* Input:
*   logData - An object containing additional log information
*   
* Output:
*   monitor - The monitor (this) for chaining
*/
proto.log = function(logData) {

  // Add to the monitor & log
  var t = this;
  t.add(1, null, logData);

  // Return for chaining
  return t;

};

/*******************************************************************************
* debug()
********************************************************************************
* This is like log(), only designed to be used in abnormal program situations
* such as try/catch handling and asynchronous error object handling.
* 
* Try/Catch example:
*   var monitor = require('monitor')('myModule');
*   ...
*   catch (e) {
*     monitor.log('postingError', e);
*     return;
*   }
* 
* Asynchronous error object handling:
* 
*   var monitor = require('monitor')('myModule');
*   ...
*   function getCustomer(customerId, callback) {
*     
*     // Get the customer from the DB
*     db.getDoc(customerId, function(err, customer) {
*     
*       // This logs and calls the callback with the err object
*       err && return monitor.debug('customerReadError', err, callback);
*       ...
*     });
*   }
* 
* Input:
*   logData - An object containing log information
*   callback - A callback object to call, passing logData as the first (err) arg.
*   
* Output:
*   monitor - The monitor (this) for chaining
*/
proto.debug = function(logData, callback) {
	
  // Add to the monitor & log
  var t = this;
  t.add(1, null, logData);

  // Call the callback if specified, passing logData as the error argument
  callback && callback(logData);
  
  // Return for chaining
  return t;

};
