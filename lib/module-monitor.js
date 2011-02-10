/*******************************************************************************
* module-monitor.js - A class for maintaining monitors for modules
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var _ = deps._;
var Monitor = require('./monitor');

/******************************************************************************* 
* Constructor
********************************************************************************
* This class contains all monitors for a module, and convenience functions for
* working with them.
* 
* Input:
*   modName - Name of your module
*   configs - A dictionary of monitor configurations for this module
*     key: monitorName, or 'defaults' for the module level defaults
*     value: A configuration object for the monitor, possibly including:
*       enabled - (boolean) Should the monitor be enabled? (default: true)
*       eventLogger - Logger[s] to use for events (default: util.log)
*       errorLogger - Logger[s] to use for errors (default: util.debug)
*       maxLogSize - Limit individual log output to this size (default: 10k)
*/
var moduleMonitor = module.exports = function(moduleName, moduleConfig) {

  // Remember the module name and configuration
  var t = this;
  t.moduleName = moduleName;
  t.moduleConfig = moduleConfig;

  // Keep a list of all monitors for the module
  t.monitors = {};

};

/*****************************************************************************
* get()
******************************************************************************
* Get a named monitor.  If the monitor exists it will be returned,
* otherwise it will be created.
* 
* Input:
*   monitorName - Name of the monitor
*   
* Output:
*   monitor - The monitor object
*/
var proto = moduleMonitor.prototype;
proto.get = function(monitorName) {

  // Get and/or make the monitor object
  var t = this;
  var monitor = t.monitors[monitorName];
  if (!monitor) {
	
	// Get the module and monitor level configurations
	var defaultConfig = t.moduleConfig ? t.moduleConfig['defaults'] : null;
	var monitorConfig = t.moduleConfig ? t.moduleConfig[monitorName] : null;
    monitor = new Monitor(monitorName, t.moduleName, monitorConfig, 
      defaultConfig);
    t.monitors[monitorName] = monitor;
  }

  // Return the monitor
  return monitor;

};

/*****************************************************************************
* getMonitors()
******************************************************************************
* Get the list of monitors for the module.
*   
* Output:
*   monitors - A dictionarey of monitors.  Key=name, value=monitor object
*/
proto.getMonitors = function() {return this.monitors;};

/*******************************************************************************
* event()
********************************************************************************
* Monitor an event.  This adds an amount to a specified monitor, and logs the
* event.  Example:
* 
*   monitor.event('New order amount', orderAmount);
* 
* If the amount is a Date object, the number of milliseconds between the Date 
* and Date.now() is recorded. Example using a Date:
* 
*   var timeBeforeSave = new Date();
*   db.save(customer, function() {
*     monitor.event('Database save time, ms.', timeBeforeSave);
*     ...
*   });
* 
* Input
*   name - The event (monitor) name.
*   value - A numeric value to add to the monitor.  Default = 1.  If this is a
*           Date object, the number of milliseconds between the Date object and
*           Date.now() is added to the monitor.
*   data - An optional object to pass on to the event logger
*   
* Output:
*   monitor - This monitor (for chaining)
*/
proto.event = function(name, value, data) {

  // Pass the call onto the named monitor
  return this.get(name).logEvent(value, data);

}; // event()

/*******************************************************************************
* error()
********************************************************************************
* Monitor an error that shouldn't be occurring.  This monitors and logs the 
* specified error.  It can be used for exception processing as well as 
* asynchronous error processing.  
* 
* Example with exception processing:
* ...
* catch (e) {
*   monitor.error('Account creation error', e);
*   return;
* }
* 
* Example in an asynchronous method callback:
* function saveCustomer(customer, callback) {
*   ...
*   db.save(customer.id, function(err, dbObject) {
*   
*     // Forward database errors to our callback (long form)
*     if (err) {
*       monitor.error('Customer db.save error', err);
*       if (callback) {
*         callback(err);
*       }
*       return;
*     }
*
*     --or--     
*
*     // Forward database errors to our callback (short form)
*     err && return monitor.error('Customer db.save error', err, callback);
*     
*   });
* });
*   
* 
* Input
*   name - The error monitor name
*   error - An object representing the error
*   callback - An optional method to call (passing the error) after logging.
*   
* Output:
*   monitor - This monitor (for chaining)
*/
proto.error = function(name, error, callback) {

  // Pass the call onto the named monitor
  return this.get(name).logError(error, callback);

}; // error()
