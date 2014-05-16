// RecipeProbe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor

/* This class is evil.  You probably shouldn't use it. Or drink. Or drink while using it. */
/*jslint evil: true */

(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('../Monitor'),
      _ = Monitor._,
      Cron = Monitor.Cron,
      logger = Monitor.getLogger('RecipeProbe'),
      vm = Monitor.commonJS ? require('vm') : null,
      Probe = Monitor.Probe;

  /**
  * Monitor automation probe
  *
  * The Recipe probe monitors other probes and runs instructions when the
  * probes change, and controls other probes based on these instructions.
  *
  * It contains a list of monitors to instantiate, and a script to run when the
  * monitor ```change``` event is fired.
  *
  * When the script fires, the monitors are available to the script by name.
  * The script can ```get()``` monitor values, ```set()``` writable monitor
  * values, and control the monitor using the ```control()`` method.
  *
  * The ```this``` variable is consistent between script runs, so state can be
  * maintained by setting attributes in ```this```.
  *
  * @class RecipeProbe
  * @extends Probe
  * @constructor
  * @param monitors {Object} - Named list of monitors to instantiate
  *   Key: monitor variable name, Value: Monitor model parameters
  * @param script {String} - JavaScript script to run.
  *   The script has access to ```console```, ```logger```, and all defined
  *   monitors by name.
  * @param [recipeName] {String} - Recipe name for logging
  * @param [autoStart=false] {boolean} - Call the start control on instantiation?
  * @param [triggeredBy] {Object} - Trigger the recipe by the items in the object.
  *        Items can include: 'interval', 'cron', and/or monitorName(s)
  *        If 'interval' is the key, the value is the interval in milliseconds
  *        If 'cron' is the key, the value is a string representing the cron pattern
  *        If any monitor name is the key, the value is the monitor event to trigger on.
  *        Example:
  *        triggeredBy: {
  *          interval: 5000,      // This triggers the recipe every 5 seconds
  *          cron: '* * * * * *', // [second] [minute] [hour] [day of month] [month] [day of week]
  *          myMonitor: 'change:someAttribute change:someOtherAttribute'
  *        }
  *        If triggeredBy isn't specified, any monitor change will trigger the recipe.
  * @param [started] {boolean} - Is the recipe started and currently active?
  */
  var RecipeProbe = Monitor.RecipeProbe = Probe.extend({

    probeClass: 'Recipe',
    writableAttributes: [],
    defaults: {
      recipeName: '',
      monitors: {},
      script: '',
      autoStart: false,
      started: false,
      triggeredBy: null
    },

    initialize: function(attributes, options){
      var t = this;

      // Periodic triggers
      t.interval = null;
      t.cronJob = null;

      // Precondition test
      if (_.size(t.get('monitors')) === 0) {
        logger.error('initialize', 'No monitors defined in the recipe');
        return;
      }

      // This is a list of monitors (vs. monitor definitions)
      t.monitors = {};

      // Auto start, calling the callback when started
      if (t.get('autoStart')) {
        options.asyncInit = true;
        t.start_control({}, options.callback);
      }
    },

    release: function() {
      var t = this,
          args = arguments;
      t.stop_control({}, function(){
        Probe.prototype.release.apply(t, args);
      });
    },

    /**
    * Start the recipe
    *
    * This connects to each monitor and sets up the recipe triggers
    *
    * @method start_control
    */
    start_control: function(params, callback) {
      var t = this,
          connectError = false,
          monitors = t.get('monitors');

      if (t.get('started')) {
        var err = {code:'RUNNING', msg:'Cannot start - the recipe is already running.'};
        logger.warn(err);
        return callback(err);
      }

      // Called when a monitor has connected
      var onConnect = function(error) {
        if (connectError) {return;}
        if (error) {
          var err = {code:'CONNECT_ERROR', err: error};
          connectError = true;
          logger.error('start', err);
          return callback(err);
        }
        for (var name1 in t.monitors) {
          if (!t.monitors[name1].isConnected()) {
            return;
          }
        }
        t.set({started:true});
        t.connectListeners(true);
        callback();
      };

      // Connect all monitors
      for (var name2 in monitors) {
        t.monitors[name2] = new Monitor(monitors[name2]);
        t.monitors[name2].connect(onConnect);
      }

    },

    /**
    * Stop the recipe
    *
    * This disconnects each monitor
    *
    * @method stop_control
    */
    stop_control: function(params, callback) {
      var t = this,
          disconnectError = false;

      if (!t.get('started')) {
        var err = {code:'NOT_RUNNING', msg:'The recipe is already stopped.'};
        logger.warn('precondition', err);
        return callback(err);
      }

      // Called when a monitor has disconnected
      var onDisconnect = function(error) {
        if (disconnectError) {return;}
        if (error) {
          var err = {code:'DISONNECT_ERROR', err: error};
          disconnectError = true;
          logger.error('onDisconnect', err);
          return callback(err);
        }
        for (var name1 in t.monitors) {
          if (t.monitors[name1].isConnected()) {
            return;
          }
        }
        t.set({started:false});
        t.compiledScript = null;
        callback();
      };

      // Disconnect all monitors
      t.connectListeners(false);
      t.context = null;
      for (var name2 in t.monitors) {
        t.monitors[name2].disconnect(onDisconnect);
      }
    },

    /**
    * Connect the change listeners
    *
    * @private
    * @method connectListeners
    */
    connectListeners: function(connect) {
      var t = this,
          triggeredBy = t.get('triggeredBy'),
          onTrigger = t.onTrigger.bind(t);

      // Default to listen on changes to all monitors
      if (!triggeredBy) {
        for (var monitorName in t.monitors) {
          t.monitors[monitorName][connect ? 'on' : 'off']('change', t.onTrigger, t);
        }
        return;
      }

      // Process the elements in triggeredBy
      for (var name in triggeredBy) {
        var value = triggeredBy[name];

        // Construct a new cron job
        if (name === 'cron') {
          if (connect) {
            t.cronJob = new Cron.CronJob(value, onTrigger);
          }
          else {
            if (t.cronJob.initiated) {
              clearInterval(t.CronJob.timer);
            }
            else {
              setTimeout(function(){clearInterval(t.cronJob.timer);}, 1000);
            }
          }
        }

        // Set a polling interval
        else if (name === 'interval') {
          if (connect) {
            t.interval = setInterval(onTrigger, value);
          }
          else {
            clearInterval(t.interval);
            t.interval = null;
          }
        }

        // Must be a monitor name
        else {
          t.monitors[name][connect ? 'on' : 'off'](value, onTrigger);
        }
      }
    },

    /**
    * Called when a trigger is fired
    *
    * @private
    * @method onTrigger
    */
    onTrigger: function() {
      var t = this;
      t.run_control({}, function(error){
        if (error) {
          logger.error('onTrigger', error);
        }
      });
    },

    /**
    * Run the recipe script
    *
    * This manually runs a started recipe.  The callback is called immediately
    * after executing the script.
    *
    * @method run_control
    */
    run_control: function(params, callback) {
      var t = this,
          error = null;
      if (!t.get('started')) {
        error = {code:'NOT_RUNNING', msg:'Cannot run - recipe not started.'};
        logger.warn(error);
        return callback(error);
      }

      // Name the probe
      t.name = t.get('probeName') || t.get('id');

      // Build a context to pass onto the script.  The context contains
      // a console, a logger, and each monitor by name.
      if (!t.context) {
        t.context = vm ? vm.createContext({}) : {};
        t.context.console = console;
        t.context.logger = Monitor.getLogger('Recipe.run.' + t.name);
        for (var monitorName in t.monitors) {
          t.context[monitorName] = t.monitors[monitorName];
        }
      }

      // Run the script
      try {
        t.run(t.context);
      } catch(e) {
        error = "Error running script: " + e.toString();
        logger.error('run_control', error);
      }
      callback(error);
    },

    /**
    * Execute the recipe.  This is a private method that can be overridden
    * in derived recipe classes that contain the recipe.
    *
    * @private
    * @method run
    */
    run: function(context) {
      var t = this,
          script = t.get('script');

      // Run in a VM or exec (if running in a browser)
      if (vm) {
        // Compile the script on first run.  This throws an exception if
        // the script has a problem compiling.
        if (!t.compiledScript) {
          t.compiledScript = vm.createScript(script);
        }

        // Execute the compiled script
        t.compiledScript.runInContext(context, t.name);
      }
      else {
        // Bring all context variables local, then execute the script
        eval(t.bringLocal(context));
        eval(script);
      }
    },

    /**
    * Generate a script that brings context members into local scope
    *
    * @private
    * @method bringLocal
    */
    bringLocal: function(context) {
      var varName,
          localVars = [];
      for (varName in context) {
        localVars.push('var ' + varName + ' = context.' + varName + ';');
      }
      return localVars.join('\n');
    }

  });


}(this));
