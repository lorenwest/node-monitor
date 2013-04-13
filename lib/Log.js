/*jslint browser: true */
// Log.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/monitor-min
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('./Monitor'),
      EventEmitter = require('events').EventEmitter,
      Stat = Monitor.Stat,
      stat = new Stat('Log'),
      _ = Monitor._;

  /**
  * A lightweight component for sending and gathering logs
  *
  * This is both a collector and emitter for application logs.
  *
  * It's designed with low development and runtime cost in mind, encouraging
  * usage with minimum concern for overhead.  Runtime monitoring can be as chatty
  * as desired, outputting every log statement of every type, or finely tuned
  * with regular expressions to monitor specific log statements.
  *
  * It can be used as a log4js appender so your existing application logs can
  * be monitored:
  *
  *     var log4js = require('log4js');
  *     var appender = require('monitor-min').log4jsAppender;
  *     log4js.addAppender(appender);
  *
  * This requires the log4js package to be available to the application, as
  * monitor-min doesn't include log4js if your app doesn't use it.
  *
  * It can also be used directly with a log4js-style calling pattern:
  *
  *     var log = require('monitor-min').getLogger('myModule');
  *     ...
  *     log.warn('Customer credit limit exceeded');
  *
  * Log Collector
  * -------------
  *
  * As a collector, it's a place to send application logs.
  *
  * Example for outputting a log in your application:
  *
  *     var log = require('monitor-min').getLogger('myModule');
  *     ...
  *     log.info('Credit accepted', limit, requestedAmount);
  *
  * The above is a request to output an ```info``` log for ```myModule``` named
  * ```Credit limit accepted```.  The log entry includes all additional parameters,
  * in this case the customer credit limit and the reqeusted amount.
  *
  * The full name for this log entry is: ```"info.myModule.Credit limit accepted"```
  * The name is important, as monitors can be configured to output logs based
  * on this name.
  *
  * Best practices are to include dynamic parameters in extra arguments
  * vs. concatenating strings.  This reduces logging overhead, especially
  * for log statements that aren't currently being watched.
  *
  * Log Emitter
  * -----------
  * As an emitter, the Log module is a place to capture logging output.
  *
  * When listening for log entries, wildcards can be used to register for
  * particular log types and entries.
  *
  *     var Log = require('monitor-min').Log;
  *     ...
  *     Log.on('info.myModule.*', myFunction);
  *
  * Will call ```myFunction``` when all ```info.myModule.*``` logs are emitted.
  *
  * Listeners are invoked with the following arguments:
  *
  * - type - The log type (info, trace, warn, etc.)
  * - module - The logger module name
  * - name - The log entry name
  * - args... - Additional arguments passed into the log entry are passed on
  *             as additional args to the event listener.
  *
  * Wildcards
  * ---------
  * A flexible and user-oriented wildcard pattern is used for monitoring
  * logs.  The pattern is described in the <a href="Stat.html#wildcards">Wildcard secttion of the Stats class</a>.
  *
  * Choosing Good Names
  * -------------------
  * It's a good idea to pick a good naming scheme with each dot-delimited segment
  * having a consistent, well-defined purpose.  Volatile segments should be as deep
  * into the hierarchy (furthest right) as possible.  Keeping the names less
  * volatile makes it easier to turn statistics recording on for all logs.
  *
  * @class Log
  * @constructor
  */
  var Log = Monitor.Log = function(module) {
    var t = this;
    t.module = module;
  };
  var proto = Log.prototype;

  // This is a map of registered event names to compiled regexs, for
  // quickly testing if a log needs to be emitted.
  Log.eventRegex = {};

  /**
  * Output a ```trace``` log entry
  *
  * @method trace
  * @param name {String} Log entry name
  * @param [...] {Any} Subsequent arguments to add to the log
  */

  /**
  * Output a ```debug``` log entry
  *
  * @method debug
  * @param name {String} Log entry name
  * @param [...] {Any} Subsequent arguments to add to the log
  */

  /**
  * Output a ```info``` log entry
  *
  * @method info
  * @param name {String} Log entry name
  * @param [...] {Any} Subsequent arguments to add to the log
  */

  /**
  * Output a ```warn``` log entry
  *
  * @method warn
  * @param name {String} Log entry name
  * @param [...] {Any} Subsequent arguments to add to the log
  */

  /**
  * Output a ```error``` log entry
  *
  * @method error
  * @param name {String} Log entry name
  * @param [...] {Any} Subsequent arguments to add to the log
  */

  /**
  * Output a ```fatal``` log entry
  *
  * @method fatal
  * @param name {String} Log entry name
  * @param [...] {Any} Subsequent arguments to add to the log
  */

  // Add a method for each log type
  ['trace','debug','info','warn','error','fatal'].forEach(function(method) {
    proto[method] = function(name) {
      Log._emit(method, this.module, name, arguments);
    };
  });

  /**
  * Send the log to all registered listeners
  *
  * @private
  * @static
  * @method emit
  * @param type {string} The log type (trace, debug, info, etc)
  * @param module {String} The log module name
  * @param name {String} The log entry name
  * @param args {any[]} All original, starting with the short name
  */
  Log._emit = function(type, module, name, args) {
    var eventName,
        fullName = type + '.' + module + '.' + name;

    // Output a counter stat for this log
    stat.increment(fullName);

    // Test the name against all registered events
    for (eventName in Log._events) {

      // Get the regex associated with the name (using the Stat package)
      var regex = Log.eventRegex[eventName];
      if (!regex) {
        regex = Log.eventRegex[eventName] = Stat._buildRegex(eventName);
      }

      // Test the long name with the regex, and emit if it matches
      if (regex.test(fullName)) {

        // Build the arguments as event name, log type, module, name, [other args...]
        var allArgs = _.toArray(args);
        allArgs.splice(0, 1, eventName, type, module, name);
        Log.emit.apply(Log, allArgs);
      }
    }
  };

  // Mixin event processing for the Log class
  _.extend(Log, EventEmitter.prototype);

  // Place the getLogger method into the Monitor namespace
  Monitor.getLogger = function(module) {
    return new Log(module);
  };

}(this));
