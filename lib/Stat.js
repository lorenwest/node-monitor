/*jslint browser: true */
// Stat.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('./Monitor'),
      // Raw events on the server (for speed), backbone events on the browser (for functionality)
      EventEmitter = Monitor.commonJS ? require('events').EventEmitter.prototype : Monitor.Backbone.Events,
      _ = Monitor._,
      emittingNow = false;


  /**
  * A lightweight component for gathering and emitting application statistics
  *
  * This is both a collector and emitter for application stats.
  *
  * It's designed with low development and runtime cost in mind, encouraging
  * usage with minimum concern for overhead.
  *
  * Stat Collector
  * --------------
  *
  * As a collector, it's a place to send application stats as they're discovered.
  *
  * Example for incrementing a stat in your application:
  *
  *     var stat = require('monitor').getStatLogger('myModule');
  *     ...
  *     stat.increment('requests.inbound');
  *
  * The above is a request to increment the ```myModule.requests.inbound``` stat.
  * It peforms work only if someone is listening for that event.
  *
  * Stat Emitter
  * -------------
  * As an emitter, Stat is a place to gather stats as they're collected.
  *
  * When listening for stats, wildcards can be used to register for many stats
  * within a group. For example, the following call:
  *
  *     var Stat = require('monitor').Stat;
  *     Stat.on('myModule.*.timer', myFunction);
  *
  * Will call ```myFunction``` when all ```myModule.*.timer``` stats are emitted.
  *
  * Listeners are invoked with 4 arguments:
  *
  * - module - The statLogger module name
  * - name - The name of the stat that just fired
  * - value - The numeric value passed
  * - type - An enumeration of the types of stats:<br/>
  *   'c'  - Counter.  Add (or subtract) the value to (or from) the prior value<br/>
  *   'g'  - Gague.  Value is to be recorded as provided<br/>
  *   'ms' - Timer.  Millisecond amount of time something took.
  *
  * <h2 id="wildcards">Wildcards</h2>
  *
  * The following wildcards are allowed for registering events.  They're
  * modeled after the graphite wildcard syntax (from the
  * <a href="https://graphite.readthedocs.org/en/latest/render_api.html#paths-and-wildcards">graphite docs</a>):
  *
  * #### Delimiter
  * The period (.) character is literal, and matches name segment separators.
  *
  * #### Asterisk
  * The asterisk (*) matches zero or more characters. It is non-greedy, so you
  * can have more than one within a single path element.
  *
  * Example: servers.ix\*ehssvc\*v.cpu.total.\* will return all total CPU metrics
  * for all servers matching the given name pattern.
  *
  * An asterisk at the far right of the pattern matches everything to the right,
  * including all path segments.  For example, ```servers.*``` matches all
  * names beginning with ```servers.```.
  *
  * #### Character list or range
  * Characters in square brackets ([...]) specify a single character position in
  * the path string, and match if the character in that position matches one of
  * the characters in the list or range.
  *
  * A character range is indicated by 2 characters separated by a dash (-), and
  * means that any character between those 2 characters (inclusive) will match.
  * More than one range can be included within the square brackets, e.g. foo[a-z0-9]bar
  * will match foopbar, foo7bar etc..
  *
  * If the characters cannot be read as a range, they are treated as a
  * list - any character in the list will match, e.g. foo[bc]ar will match
  * foobar and foocar. If you want to include a dash (-) in your list, put
  * it at the beginning or end, so it's not interpreted as a range.
  *
  * #### Value list
  * Comma-separated values within curly braces ({foo,bar,...}) are treated as
  * value lists, and match if any of the values matches the current point in
  * the path. For example, servers.ix01ehssvc04v.cpu.total.{user,system,iowait}
  * will match the user, system and I/O wait total CPU metrics for the specified
  * server.
  *
  * #### Javascript Regex
  * For finer grained expression matching, a javascript style regex can be
  * specified using the ```/.../``` syntax.  This style spans the entire identifier.
  * You can ignore case using the ```/.../i``` syntax.  If the first character of the
  * string is a slash, it considers the string a javascript regular expression.
  *
  * Choosing Good Names
  * -------------------
  * It's a good idea to pick a good naming scheme with each dot-delimited segment
  * having a consistent, well-defined purpose.  Volatile segments should be as deep
  * into the hierarchy (furthest right) as possible.  Keeping the names less
  * volatile makes it easier to turn recording on for all statistics.
  *
  * @class Stat
  * @constructor
  */
  var Stat = Monitor.Stat = function(module) {
    var t = this;
    t.module = module;
  };
  var proto = Stat.prototype;

  // This is a map of registered event names to compiled regexs, for
  // quickly testing if a statistic needs to be emitted.
  Stat.eventRegex = {};

  /**
  * Increment a counter by a specified value
  *
  * Assuming someone is listening to this stat, this is an instruction for that
  * listener to add the specified value (usually 1) to their prior value for this stat.
  *
  * This is known as server-side setting, as the server (listener) is responsible
  * for maintaining the prior and new value for the stat.
  *
  * @method increment
  * @param name {String} Dot.separated name of the counter to increment
  * @param [value=1] {Number} Amount to increment the counter by.
  */
  proto.increment = function(name, value){
    value = _.isNumber(value) ? value : 1;
    Stat._emit(this.module, name, value, 'c');
  };

  /**
  * Decrement a counter by a specified value
  *
  * Assuming someone is listening to this stat, this is an instruction for that
  * listener to subtract the specified value (usually 1) to their prior value for this stat.
  *
  * This is known as server-side setting, as the server (listener) is responsible
  * for maintaining the prior and new value for the stat.
  *
  * @method decrement
  * @param name {String} Dot.separated name of the counter to decrement
  * @param [value=1] {Number} Amount to decrement the counter by.
  */
  proto.decrement = function(name, value){
    value = _.isNumber(value) ? value : 1;
    Stat._emit(this.module, name, value * -1, 'c');
  };

  /**
  * Set the stat to the specified value
  *
  * This is an instruction to any (all) listener(s) to set the stat to a
  * specific value.
  *
  * This is known as client-side setting, because the client determines the value
  * of the stat.
  *
  * @method gauge
  * @param name {String} Dot.separated name of the stat
  * @param value {Number} Number to set the gauge to
  */
  proto.gauge = function(name, value){
    Stat._emit(this.module, name, value, 'g');
  };

  /**
  * Record the specified duration (in milliseconds) for the stat
  *
  * This is like Stat.gauge() in that it is a client-side setting of a
  * specified value.  The difference is the scale of the value is specified
  * as milliseconds.
  *
  * This may be one of the most widely used stat methods.  It can (should?) be
  * used upon callback from asynchronous methods.
  *
  * Pattern:
  *
  *     var stat = require('monitor').getStatLogger('myModule');
  *     ...
  *     var stamp = Date.now();
  *     SomeAsyncFunction(arg1, function(error) {
  *       stat.time('SomeAsyncFunction.time', Date.Now() - stamp);
  *       ...continue with error handling & callback handling
  *     });
  *
  * @method time
  * @param name {String} Dot.separated name of the stat
  * @param duration {Integer} Number of milliseconds this stat took to complete
  */
  proto.time = function(name, duration){
    Stat._emit(this.module, name, duration, 'ms');
  };

  /**
  * Send the stat to all registered listeners
  *
  * @private
  * @static
  * @method emit
  * @param module {String} Module name
  * @param name {String} Stat name
  * @param value {Numeric} Stat value
  * @param type {String} Enumeration.  One of the following:
  *   'c'  - Counter.  + values increment, - values decrement
  *   'g'  - Gague.  Statistic is recorded as provided
  *   'ms' - Timer.  Millisecond amount of time something took
  */
  Stat._emit = function(module, name, value, type) {
    var eventName,
        fullName;

    // Prevent stat recursion. This has the effect of disabling all stats
    // for stat handlers (and their downstream effect), but is necessary to
    // prevent infinite recursion.  If it's desired to stat the output of
    // stat handlers, then delay that processing until nextTick.
    if (emittingNow) {
      return;
    }
    emittingNow = true;

    // Test the name against all registered events
    for (eventName in Stat._events) {

      // Build the full name only if someone is listening
      if (!fullName) {
        fullName = module + '.' + name;
      }

      // Get the regex associated with the name
      var regex = Stat.eventRegex[eventName];
      if (!regex) {
        regex = Stat.eventRegex[eventName] = Stat._buildRegex(eventName);
      }

      // Test the name with the regex, and emit if it matches
      if (regex.test(fullName)) {
        Stat.emit(eventName, module, name, value, type);
      }
    }

    // Turn off recursion prevention
    emittingNow = false;
  };

  /**
  * Build a regex from a user entered string following the pattern described
  * in the class definition.  Loosely:
  *
  *    If it looks like a JS regexp, process it as a regexp
  *    Change all '.' to '\.'
  *    Change all '*' to '[^\.]*' (unless it's at the end, then convert to '.*')
  *    Change all {one,two} to (one|two)
  *    Leave all [...] alone - they work as-is
  *
  *  If an error occurs, throw an exception
  *
  * @private
  * @static
  * @method _buildRegex
  * @param str {String} String to build the regular expression from
  * @return {RegExp}The regular expression object
  *
  */
  Stat._buildRegex = function(str) {
    var regexStr = '',
        modifier = '',
        lastIdx = str.length - 1,
        inSquiggly = false;

    // Javascript regular expressions
    if (/^\/[^\/]*\/i*$/.test(str)) {
      if (/i$/.test(str)) {
        modifier = 'i';
        str = str.replace(/i$/,'');
      }
      regexStr = '^' + str.replace(/^\//,'').replace(/\/$/,'') + '$';
    }

    // Process character by character
    else {
      for (var i = 0, l = str.length; i < l; i++) {
        var c = str.substr(i,1);
        switch (c) {
          case '.':
            c = '\\.';
            break;
          case '*':
            c = (i === lastIdx ? '.*' : '[^\\.]*');
            break;
          case '{':
            c = '(';
            inSquiggly = true;
            break;
          case '}':
            c = ')';
            inSquiggly = false;
            break;
          case ',':
            if (inSquiggly) {
              c = '|';
            }
            break;
        }
        regexStr += c;
      }

      // Force it to match the full string
      regexStr = '^' + regexStr + '$';
    }

    // Now build the regex.  This throws an exception if poorly formed.
    return new RegExp(regexStr, modifier);
  };

  // Mixin event processing for the Stat class
  _.extend(Stat, EventEmitter);

  // Expose this class from the Monitor module
  Monitor.setStatLoggerClass(Stat);

}(this));
