/*******************************************************************************
* node-monitor.js - Package exposure for the node-monitor package
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var Monitor = require('./monitor');

// All moduleMonitor objects (by module name)
var moduleMonitors = {};

/******************************************************************************* 
* node-monitor() - Main entry point for node-monitor
********************************************************************************
* This function is the main export.  It returns an object containing all 
* monitors for the specified module.  Example:
* 
*   // Set up monitors for this module
*   var monitor = require('monitor')('ModuleName', config.monitor);
*   
* Then when you want to monitor something, call the add function:
* 
*   // Record the time it took to call the API
*   var now = new Date().getTime();
*   monitor.add('ApiTime, ms', now - startTime);
*   
* This adds a time to the monitor called "ApiTime, ms" within the "ModuleName"
* monitor group.
* 
* Input:
*   modName - Name of your module
*   configs - A dictionary of monitor configurations for this module
*     key: monitorName, or 'default' for the module level defaults
*     value: A configuration object for the monitor, possibly including:
*       enabled - (boolean) Should the monitor be enabled? (default: true)
*       logFn - The logger function to use (default: system console debug)
*       maxLogSize - Limit the log output to this size (default: 10k)
* 
* Output:
*   An object of type moduleMonitor, which contains an add() function to add
*   a value to a named monitor.  It also contains a get(monitorName) to return
*   a specific monitor, in case you want to call methods directly on a specific
*   monitor.
*/
var nodeMonitor = module.exports = function(modName, config) {

  // Get the moduleMonitor object for the module
  var modMonitor = moduleMonitors[modName];
  if (!modMonitor) {
    modMonitor = moduleMonitors[modName] = new moduleMonitor(modName, config);
  }
  
  // Return the module monitor
  return modMonitor;

};

/*******************************************************************************
* moduleMonitor() - 
********************************************************************************
* This class contains all monitors for a module, and convenience functions for
* working with them.
* 
* The node-monitor module constructor returns an instance of this class when
* calling require('monitor')('module_name').
* 
* Input:
*   moduleName - Name of the module
*   moduleConfig - Module level configuration
*/
var moduleMonitor = function(moduleName, moduleConfig) {
	
  // Remember the module name and configuration
  this.moduleName = moduleName;
  this.moduleConfig = moduleConfig;
  
  // The list of all monitors for the module
  this.monitors = {};
  
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
  var monitor = this.monitors[monitorName];
  if (!monitor) {
	
	// Get the module and monitor level configurations
	var defaultConfig = this.moduleConfig ? this.moduleConfig['default'] : null;
	var monitorConfig = this.moduleConfig ? this.moduleConfig[monitorName] : null;
    monitor = new Monitor(monitorName, this.moduleName, monitorConfig, 
      defaultConfig);
    this.monitors[monitorName] = monitor;
  }

  // Return the monitor
  return monitor;

};

/*****************************************************************************
* add()
******************************************************************************
* This adds a numeric value to the monitor, and optionally logs a message.
* 
* Input:
*   name - The monitor name (required)
*   value - A numeric value to add to the monitor (default: 1 if null)
*   logMessage - A string or object containing information to log (not required)
*   logData - An arbitrary object containing log data (not required)
*   
*/
proto.add = function(name, value, logMessage, logData) {
  return this.get(name).add(value, logMessage, logData);
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
*   name - The monitor name (required)
*   logData - An object containing additional log information
*   
* Output:
*   monitor - The monitor (this) for chaining
*/
proto.log = function(name, logData) {
  // Forward to the named monitor
  return this.get(name).log(logData);
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
*   name - The monitor name (required)
*   logData - An object containing log information
*   callback - A callback object to call, passing logData as the first (err) arg.
*   
* Output:
*   monitor - The monitor (this) for chaining
*/
proto.debug = function(name, logData, callback) {
  // Forward to the named monitor
  return this.get(name).debug(logData, callback);
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

/*****************************************************************************
* getAllMonitors()
******************************************************************************
* Get all monitors for all modules
*   
* Output:
*   mouduleMonitors - A dictionarey of module monitors.
*     Key=moduleName, value=ModuleMonitor object, where ModuleMonitor is
*       a dictionary of monitors for the module.  Key/Value = name/monitor
*/
proto.getAllMonitors = function() {return moduleMonitors;};
