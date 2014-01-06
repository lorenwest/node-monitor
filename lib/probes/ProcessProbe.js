// ProcessProbe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading - this runs server-side only
  var util = require('util'), OS = require('os'),
      Monitor = root.Monitor || require('../Monitor'), _ = Monitor._,
      logger = Monitor.getLogger('ProcessProbe'),
      PollingProbe = Monitor.PollingProbe;

  /**
  * Probe for attaining process and O/S information
  *
  * @class ProcessProbe
  * @extends PollingProbe
  * @constructor
  * @param [initParams] {Object} Probe initialization parameters (from PollingProbe)
  *     @param [initParams.pollInterval] {Integer} Polling interval in milliseconds. Default: null
  *     @param [initParams.cronPattern] {String} Crontab syle polling pattern. Default once per second: "* * * * * *"
  * @param model {Object} Monitor data model elements
  *     @param model.platform {String} O/S Platform
  *     @param model.version {String} Node.js compiled-in version
  *     @param model.installPrefix {String} Node.js installation directory
  *     @param model.title {String} The current process title (as reported in ps)
  *     @param model.execPath {String} The path to the current node.js executable
  *     @param model.argv {Array(String)} Arguments passed on the command line to this process
  *     @param model.env {Object} Current environment (inherited)
  *     @param model.cwd {String} Current working directory
  *     @param model.uptime {Integer} Number of seconds the process has been up (if available)
  *     @param model.versions {String} Versions of V8 and dependent libraries (if available)
  *     @param model.arch {String} Processor architecture (if available)
  *     @param model.gid {Integer} Process group ID
  *     @param model.uid {Integer} Process user ID
  *     @param model.pid {Integer} Unique process ID
  *     @param model.umask {Integer} The process file mode creation mask
  *     @param model.memoryUsage {Object} An object describing memory usage of the node.js process
  *         @param model.memoryUsage.rss {Integer} As defined by process.memoryUsage
  *         @param model.memoryUsage.vsize {Integer} As defined by process.memoryUsage
  *         @param model.memoryUsage.heapTotal {Integer} As defined by process.memoryUsage
  *         @param model.memoryUsage.heapUsed {Integer} As defined by process.memoryUsage
  *     @param model.os {Object} An object containing O/S information
  *         @param model.os.hostname {String} Name of the host operating system
  *         @param model.os.type {String} Operating system type
  *         @param model.os.release {String} O/S Release version
  *         @param model.os.uptime {String} O/S Uptime in seconds
  *         @param model.os.loadavg {Array(Number)} An array containing the 1, 5, and 15 minute load averages
  *         @param model.os.freemem {Integer} Free O/S memory (in bytes)
  *         @param model.os.totalmem {Integer} Total O/S memory capacity (in bytes)
  *         @param model.os.cpus {Array(Object)} An array of objects containing information about each CPU/core installed
  */
  var ProcessProbe = Monitor.ProcessProbe = PollingProbe.extend({

    // These are required for Probes
    probeClass: 'Process',

    /* not required
    initialize: function(){
      var t = this;
      PollingProbe.prototype.initialize.apply(t, arguments);
      ...
    },
    release: function() {
      var t = this;
      PollingProbe.prototype.release.apply(t, arguments);
      ... // release any resources held
    })
    */

    /**
    * Poll the probe for changes
    *
    * This method is called by the parent <a href="PollingProbe.html">PollingProbe</a> on the interval specified by the client <a href="Monitor.html">Monitor</a>.
    *
    * It polls for process information, and updates the data model with any changes.
    *
    * @method poll
    */
    poll: function() {
      var t = this,
      attrs = _.extend({
        platform: process.platform,
        version: process.version,
        installPrefix: process.installPrefix,
        title: process.title,
        execPath: process.execPath,
        argv: process.argv,
        env: process.env,
        cwd: process.cwd(),
        gid: process.getgid ? process.getgid() : 0,
        uid: process.getuid ? process.getuid() : 0,
        pid: process.pid,
        umask: process.umask(),
        hostname: OS.hostname(),
        type: OS.type(),
        release: OS.release(),
        osUptime: OS.uptime(),
        loadavg: OS.loadavg(),
        freemem: OS.freemem(),
        totalmem: OS.totalmem(),
        cpus: OS.cpus()
      }, process.memoryUsage());
      if (process.uptime) {attrs.uptime = process.uptime();}
      if (process.versions) {attrs.versions = process.versions;}
      if (process.arch) {attrs.arch = process.arch;}
      t.set(attrs);
    }
  });

}(this));
