/*******************************************************************************
* node-monitor.js - Package exposure for the node-monitor package
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var sys = require('sys');
var config = deps.config;
var Monitor = require('./monitor');
var ModuleMonitor = require('./module-monitor');
var sprintf = deps.sprintf;

// Configuration for node-monitor
var nmConfig = require('config')('node-monitor',{
  exitReport: true
});

// All moduleMonitor objects (by module name)
var moduleMonitors = {};

/******************************************************************************* 
* node-monitor() - Main entry point for node-monitor
********************************************************************************
* This function returns an object that monitors a module.  Example:
* 
*   // Set up monitors for this module
*   var monitor = require('monitor')('ModuleName', config.monitor);
*   
* Then when you want to monitor an event, call monitor.event()
* 
*   // Record the time it took to call the API
*   var startTime = new Date();
*   ...
*   monitor.event('ApiTime, ms', startTime);
*   
* This adds and logs an event to the monitor called "ApiTime, ms" for your
* module.
* 
* Input:
*   modName - Name of your module
*   configs - A dictionary of monitor configurations for this module
*     key: monitorName, or 'default' for the module level defaults
*     value: A configuration object for the monitor, possibly including:
*       enabled - (boolean) Should the monitor be enabled? (default: true)
*       eventLogger - Logger[s] to use for events (default: util.log)
*       errorLogger - Logger[s] to use for errors (default: util.debug)
*       maxLogSize - Limit individual log output to this size (default: 10k)
* 
* Output:
*   An object to use to add event and error monitoring for this module.
*   This object also includes methods for discovering named monitors for each
*   event and error that has occurred.
*/
var nodeMonitor = module.exports = function(modName, config) {

  // Get the moduleMonitor object for the module
  var modMonitor = moduleMonitors[modName];
  if (!modMonitor) {
    modMonitor = moduleMonitors[modName] = new ModuleMonitor(modName, config);
  }
  
  // Return the module monitor
  return modMonitor;

};

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
nodeMonitor.getAllMonitors = function() {return moduleMonitors;};

/*****************************************************************************
* uncaughtException
******************************************************************************
* Catch-all for monitoring uncaught exceptions
*/
var monitor = nodeMonitor('node-monitor');
process.on('uncaughtException', function (err) {
  monitor.error('Un-caught exception', err);
});

/*****************************************************************************
* exitReport
******************************************************************************
* Hook the exit event, and produce a full report on exit.
*/
process.on('exit', function() {

  // Return if no exit report is requested
  if (!nmConfig.exitReport) return;
  
  // Get a list of events & errors
  var events = [];
  var errors = [];
  for (var moduleName in moduleMonitors) {
	var modMonitors = moduleMonitors[moduleName].getMonitors();
	for (var monitorName in modMonitors) {
	  var monitor = modMonitors[monitorName];
	  if (!monitor.getLast()) continue;
	  monitor.getLast().isError ? errors.push(monitor) : events.push(monitor);
	}
  }

  // Report events
  sys.puts("\nModule        Event                                        Hits    Total      Avg");
  sys.puts("---------------------------------------------------------------------------------");
  var lastMod = "";
  _.each(events, function(monitor){
	var modName = "";
	if (lastMod != monitor.getModuleName()) {
	  modName = lastMod = monitor.getModuleName();
	}
    sys.puts(sprintf("%-13.13s %-40.40s %8d %8f %8f",
      modName, monitor.getName(), monitor.getHits(), monitor.getTotal(), 
      monitor.getAvg()
    ));
  });

  // Report errors
  if (errors.length > 0) {
    sys.puts("\nModule        Error                                                          Hits");
    sys.puts("---------------------------------------------------------------------------------");
    var lastMod = "";
    _.each(errors, function(monitor){
	  var modName = "";
	  if (lastMod != monitor.getModuleName()) {
	    modName = lastMod = monitor.getModuleName();
	  }
      sys.puts(sprintf("%-13.13s %-58.58s %8d",
        modName, monitor.getName(), monitor.getHits()
      ));
    });
  }

  // Footer
  sys.puts("---------------------------------------------------------------------------------");
  sys.puts("                                                                  node.js monitor");
   
	
});
