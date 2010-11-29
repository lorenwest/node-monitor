node-monitor
============

Runtime monitoring for node.js applications

Introduction
------------

node-monitor records and gives you access to vital statistics about your 
running node.js application.

As a developer, node-monitor gives you an easy way of exposing both
business events and error conditions in code. 

This lets you apply a consistent pattern for handling try/catch exceptions 
as well as error conditions and callbacks in asynchronous methods.

During configuration and deployment, node-monitor lets you configure 
standard output logging, or customized logging and alerts.  Logging and
alerts can be defined application-wide, module-wide, or for a specific 
event or error condition.

At runtime node-monitor logs individual events, and maintains statistics
about each event and error condition.  Easily discover active monitors, and
trigger custom notifications and exposures of monitored activity.


Installation & Testing
----------------------

Use *npm* to install and test node-monitor:

    $ npm install monitor
    $ npm test monitor


Event Monitoring
----------------

Start by defining the monitor at the top of your module. Subsequent examples 
use this *monitor* variable.

    var monitor = require('monitor')('Customers');

Whenever you wish to record an event, call *monitor.event()*:

    monitor.event('Customer purchase', invoice.amount);

If you pass a Date object to the monitor, it assumes it's a start of an
interval, and records the number of milliseconds from that time.  Example:

    var beforeDbSave = new Date();
    db.save(customer, function() {

      // Monitor the DB save time
      monitor.event('Customer save time, ms.', beforeDbSave);

    });

In the above example, customer database save times are monitored.  Logging
can be turned on or off at configuration time or at runtime.  First, last,
maximum, minimum, average, count, and total execution times are maintained for
the *Customer save time, ms.* monitor.

Error Monitoring
----------------

Node-monitor lets you keep track of the health of your running node.js
application by giving you a consistent pattern for trapping program errors
and exceptions.

Errors are conditions preventing your function from producing the intended 
results.  Here's an example using the try/catch pattern:

    try {
      ... do something
    } catch (e) {
      monitor.error('Customer insertion failure', e);
      ...
    }

In the above example, if an exception is thrown between the try and catch
block, the *Customer insertion failure* monitor will log the error, and keep
track of failure statistics.  

Using the asynchronous callback pattern, you can monitor errors that occur
in asynchronous functions, easily trapping and forwarding these errors to the
callback function.  

Long form example:

    function saveCustomer(customer, callback) {
      ...
      db.save(customer.id, function(err, dbObject) {
      
        // Forward database errors to our callback
        if (err) {
          monitor.error('Customer db.save error', err);
          if (callback) {
            callback(err);
          }
          return;
        }
        ...
      });
    }

Same, only using the short form:

    function saveCustomer(customer, callback) {
      ...
      db.save(customer.id, function(err, dbObject) {
      
        // Forward database errors to our callback
        err && return monitor.error('Customer db.save error', err, callback);
        ...
      });
    }

In these examples, the *Customer db.save error* monitor will log and track the
error, and if a callback is specified, it is called with the error object as
the first (and only) argument.

Logging & Alerts
----------------

Monitor loggers are separated into two categories - eventLoggers and 
errorLoggers.  These loggers can be configured application-wide, module-wide,
or for individual event and error types.

The default event logger is *require('sys').log*, and the default error logger 
is *require('sys').debug*.  Changing these defaults and writing your own loggers
are done at configuration time (see _Configuration_ below)

External alerts are written with loggers, and can be as simple or as complex
as you desire. For example, you could write a logger which sends an email
when the error occurs.  

Email logger example:

    // Email logger
    var fs = require('fs');
    var exec = require('child_process').exec;
    var mail_cmd = "mail -s 'Program Error' john.doe@example.com";
    var errorLogger = function(message, value, err, monitor) {

      // Write the error message to a temp file
      var tmpfile = "/tmp/" + Math.random() + ".out";
      fs.writeFile(tmpfile, message, function (err) {
        if (err) throw err;
        
        // Mail the message
        exec(mail_cmd + " < " + tmpfile, function(err) {
          if (err) throw err;
        
          // Remove the temporary file
          fs.unlink(tmpfile, function(err){
            if (err) throw err;
          });
        });
      });
    }
    
See the _Configuration_ section below for attaching loggers to various monitors
within your application.

Configuration
-------------

node-monitor uses the config package for configuration.  This allows you to
specify configurations in a file or on the command line.  See the node-config
package for more information about specifying configuration options for your
different application deployments.

The following configuration parameters are recognized:

    * enabled - (boolean) Should the monitor be enabled? (default: true)
    * eventLogger - Logger[s] to use for events (default: sys.log)
                    Can be a single logger, or an array of loggers.
    * errorLogger - Logger[s] to use for errors (default: sys.debug)
                    Can be a single logger, or an array of loggers.
    * maxLogSize - Limit the log output to this size (default: 10k)

These configuration parameters can be specified globally, or as defaults
for all monitors in a particular module, or on a monitor by monitor basis
within a module.

_Global_ - specify them as parameters for the 'monitor' module.  Example:

    // production.js - Configurations for the production deployment
    module.exports = {
      monitor: {
        errorLogger: require('monitor/emailLogger'),
        maxLogSize: 4196
      },
      ...
    }
    
The above configuration defines global defaults for the errorLogger and 
maxLogSize parameters.

_Module Defaults_ - specify them as the 'default' monitor for your module.
Example:

    // production.js - Configurations for the production deployment
    module.exports = {
      'Customer': {
        'monitors': {
          'default': {
            errorLogger: require('monitor/emailLogger'),
            maxLogSize: 4196
          }
        }
      }
    }

    // Customer.js - Customer module
    var config = require('config')('Customer'); 
    var monitor = require('monitor')('Customer', config.monitors);
    
The above configuration defines module-level monitor defaults for *Customer*

_Per Monitor_ - specify per-monitor configurations like per-module (above),
only use the monitor name instead of 'default'.  Example:

    // production.js - Configurations for the production deployment
    module.exports = {
      'Customer': {
        'monitors': {
          'default': {
            errorLogger: null
          },
          'Customer insertion failure': {
            errorLogger: require('monitor/emailLogger')
          },
          'Customer save time, ms.': {
            enabled: false
          }
        }
      }
    }

    // Customer.js - Customer module
    var config = require('config')('Customer'); 
    var monitor = require('monitor')('Customer', config.monitors);

The above configuration defaults error logging off for monitors within the
*Customer* module.  The the *Customer insertion failure* monitor overrides this
default, and the *Customer save time, ms.* monitor is disabled.

API
---

When you run require('monitor')('my-module', config), an instance of a 
ModuleMonitor class is returned.  Module monitors contain individual monitors
for your module, and methods for easily adding to the monitors.  

node-monitor

require('monitor')(moduleName, configuration) - This returns a Module monitor
object for the specified moduleName, creating it if necessary.

  moduleName - The name of your module
  configuration - An object containing these elements:
    enabled - (boolean) Should the monitor be enabled? (default: true)
    eventLogger - Logger[s] to use for events (default: util.log)
                  Can be a single logger, or an array of loggers.
    errorLogger - Logger[s] to use for errors (default: util.debug)
                  Can be a single logger, or an array of loggers.
    maxLogSize - Limit individual log output to this size (default: 10k)

require('monitor').getAllMonitors() - This returns an object containing
named ModuleMonitor objects for each module.

ModuleMonitor

Instances of this class contain a dictionary of Monitor objects for each
named monitor in your module.  Convenience methods exist for easily adding to 
individual named monitors.

new ModuleMonitor(moduleName, configs) - Constructor

  Inputs:
    moduleName - Name of your module
    configs - A dictionary of monitor configurations for this module
      key: monitorName, or 'default' for the module level defaults
      value: A configuration object for the monitor, possibly including:
        enabled - (boolean) Should the monitor be enabled? (default: true)
        eventLogger - Logger[s] to use for events (default: util.log)
                      Can be a single logger, or an array of loggers.
        errorLogger - Logger[s] to use for errors (default: util.debug)
                      Can be a single logger, or an array of loggers.
        maxLogSize - Limit individual log output to this size (default: 10k)
  Output:
    A new ModuleMonitor class instance

ModuleMonitor.get(monitorName) - Get a named Monitor object.  If the Monitor
object exists it will be returned, otherwise it will be created.

  Inputs:
    monitorName - Name of the monitor
  Output:
    An instance of the Monitor class for the specified monitorName

ModuleMonitor.getMonitors() - Get the list of Monitor objects for the module.

  Inputs: (none)
  Output:
    An object containing all monitor objects for the module, by name.

ModuleMonitor.event(name, value, data) - Monitor an event.  This adds an amount 
to the specified monitor, and logs the event.

  Inputs:
    name - The event (monitor) name.
    value - A numeric value to add to the monitor.  Default = 1.  If this is a
            Date object, the number of milliseconds between the Date object and
            Date.now() is added to the monitor.
    data - An optional object to pass on to the event logger

  Output:
    The named monitor object (for chaining)

ModuleMonitor.error(name, value) - Monitor an error that shouldn't be occurring.
This monitors and logs the specified error.  It can be used for exception 
processing as well as asynchronous error processing.  

  Input
    name - The error monitor name
    error - An object representing the error
    callback - An optional method to call (passing the error) after logging.
    
  Output:
    monitor - This monitor (for chaining)

Monitor

new Monitor(name, moduleName, config, moduleConfig) - Constructor.

  Inputs:
    name: This monitor name
    moduleName: Name of the containing module
    config: Specific configurations for this monitor:
      enabled - (boolean) Should the monitor be enabled? (default: true)
      eventLogger - Logger[s] to use for events (default: console.log)
                    Can be a single logger, or an array of loggers.
      errorLogger - Logger[s] to use for errors (default: console.debug)
                    Can be a single logger, or an array of loggers.
      maxLogSize - Limit the log output to this size (default: 10k)
    moduleConfig: Default monitor configurations for the module
      enabled - (boolean) Should the monitor be enabled? (default: true)
      eventLogger - Logger[s] to use for events (default: console.log)
                    Can be a single logger, or an array of loggers.
      errorLogger - Logger[s] to use for errors (default: console.debug)
                    Can be a single logger, or an array of loggers.
      maxLogSize - Limit the log output to this size (default: 10k)
  Output:
    A new Monitor object

Monitor.getHits() - Return the number of hits this monitor has recorded.  Hits
are the total number of logEvent() and logError() calls.

Monitor.getTotal() - Return the total values this monitor has accumulated.
Values are specified on logEvent() calls.  logError() calls accumulate a value 
of one (1) for each call.

Monitor.getAvg() - Return the overall average for the monitor.  The average is
the total amount as reported by getTotal() divided by the number of hits as
reported by getHits().

Monitor.getMin() - Return the smallest value added via the logEvent() or 
logError() methods.

Monitor.getMax() - Return the larges value added via the logEvent() or 
logError() methods.

Monitor.getFirst() - Return the first value added via the logEvent() or 
logError() methods.

Monitor.getLoggers() - Return an object containing loggers added using 
addLogger().  The keys are the logger IDs, and values are the logger functions.

Monitor.getLast() - Return the last value added via the logEvent() or 
logError() methods.

Monitor.getConfig() - Return the actual configuration used for this monitor.
This is a mixin of the program defaults, module defaults, and monitor configs
passed in to the constructor.

Monitor.getName() - Return the name of this monitor.

Monitor.getModuleName() - Return the module name this monitor was created under.

Monitor.isEnabled() - Returns true if the monitor is enabled, false if disabled.

Monitor.enable(enabled) - This enables or disables the monitor.  Disabling 
prevents the monitor from accumulating values and logging messages.

  Input:
    enabled - (boolean) Enable or disable the monitor

Monitor.reset() - Reset the monitor accumulators to their original state.

Monitor.addLogger(loggerFunction) - Attach a logger function at runtime.
  
  Loggers added using addLogger() will be called for all error and event logging
  called on this monitor.
  
  Input:
    loggerFunction(message, value, data, monitor) - A function to run when
      an event or error is logged.  The function accepts:
        message - A formatted message for logging
        value - The numeric value of the event
        data - The data object associated with the event
        monitor - A reference to this monitor object for accessing monitor data

  Output:
    loggerId - An ID associated with this logger so it can be retrieved using
      getLogger(), and removed using removeLogger().
      
Monitor.removeLogger(loggerId) - Remove a logger that was added using 
  addLogger().  This removes a logger by the ID assigned using addLogger().

  Input:
    loggerId - The ID returned by the addLogger function when adding the logger.

Monitor.logEvent(value, data) - Log and accumulate an event.

  Input:
    value - An optional numeric value to add to the monitor.  Default = 1.  
            If this is a Date object, the number of milliseconds between the 
            Date object and Date.now() is added to the monitor.
    data - An optional object to pass on to the event logger
  Output:
    monitor - This monitor (for chaining)

Monitor.logError() - Monitor an error that shouldn't be occurring.

  Input
    error - An object representing the error
    callback - An optional method to call (passing the err) after logging.
  Output:
    monitor - This monitor (for chaining)

License
-------
 
Released under the Apache License 2.0
 
See `LICENSE` file.
 
Copyright (c) 2010 Loren West
