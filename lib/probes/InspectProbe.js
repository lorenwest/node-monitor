// InspectProbe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor

/* This class is evil.  You probably shouldn't use it.  Or drink.  Or drink while using it. */
/*jslint evil: true */

(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('../Monitor'),
      _ = Monitor._,
      logger = Monitor.getLogger('InspectProbe'),
      Backbone = Monitor.Backbone,
      PollingProbe = Monitor.PollingProbe;

  // Constants
  var DEFAULT_DEPTH = 2;

  /**
  * Inspect and manipulate variables on the monitored server.
  *
  * This class monitors the variable specified by the key.
  *
  * The key is evaluated to determine the variable to monitor, so it may
  * be a complex key starting at global scope.  If the key isn't
  * specified, it monitors all variables in the global scope.
  *
  * If the key points to an object of type Backbone.Model, this probe
  * will update the value in real time, triggered on the *change* event.
  * Otherwise it will update the value as it notices changes, while polling
  * on the specified polling interval (default: 1 second).
  *
  * @class InspectProbe
  * @extends PollingProbe
  * @constructor
  * @param [initParams] - Initialization parameters
  *     @param [initParams.key=null] {String} A global variable name or expression
  *     @param [initParams.depth=2] {Integer} If the key points to an object, this
  *       is the depth to traverse the object for changes.  Default=2, or 1 if
  *       key='window'.
  *     @param [initParams.pollInterval] {Integer} (from <a href="PollingProbe.html">PollingProbe</a>) Polling interval in milliseconds. Default: null
  *     @param [initParams.cronPattern] {String} (from <a href="PollingProbe.html">PollingProbe</a>) Crontab syle polling pattern. Default once per second: "* * * * * *"
  * @param model - Monitor data model elements
  *     @param model.value - The value of the element being inspected
  *     @param model.isModel - Is the value a Backbone.Model?
  */
  var InspectProbe = Monitor.InspectProbe = PollingProbe.extend({

    // These are required for Probes
    probeClass: 'Inspect',
    writableAttributes: ['value'],

    initialize: function(initParams){
      var t = this;

      // Get the global object if the key isn't specified
      t.key = initParams.key;
      if (typeof initParams.key === 'undefined') {
        t.key = typeof window === 'undefined' ? 'global' : 'window';
      }

      // Get a good depth default.  Default unless key = window.
      if (typeof initParams.depth === 'undefined') {
        if (!initParams.key && t.key === 'window') {
          t.depth = 1;
        } else {
          t.depth = DEFAULT_DEPTH;
        }
      } else {
        t.depth = initParams.depth;
      }

      // Evaluate the expression to see if it's a Backbone.Model
      // This will throw an exception if the key is a bad expression
      t.value = t._evaluate(t.key);
      t.isModel = t.value instanceof Backbone.Model;

      // Set the initial values
      t.set({
        value: Monitor.deepCopy(t.value, t.depth),
        isModel: t.isModel
      });

      // Watch for backbone model changes, or initialize the polling probe
      if (t.isModel) {
        t.value.on('change', t.poll, t);
      } else {
        PollingProbe.prototype.initialize.apply(t, arguments);
      }
    },

    /**
    * Remotely set the inspected variable's value
    *
    * @method set_control
    * @param attrs {Object} Name/Value attributes to set.  All must be writable.
    * @param callback {Function(error)} Called when the attributes are set or error
    */
    set_control: function(attrs, callback) {
      var t = this;

      // Value is the only thing to set
      if (typeof attrs.value === 'undefined') {
        return callback({code:'NO_VALUE'});
      }

      // Set the model elements.  These cause change events to fire
      if (t.isModel) {
        t.value.set(attrs.value);
      }
      else {
        // Set the variable directly
        var jsonValue = JSON.stringify(attrs.value);
        t._evaluate(t.key + ' = ' + jsonValue);
        t.set('value', attrs.value);
      }
      return callback();
    },

    // Stop watching for change events or polling
    release: function() {
      var t = this;
      if (t.isModel) {
        t.value.off('change', t.poll, t);
      } else {
        PollingProbe.prototype.release.apply(t, arguments);
      }
    },

    /**
    * Evaluate an expression, returning the depth-limited results
    *
    * @method eval_control
    * @param expression {String} Expression to evaluate
    * @param [depth=2] {Integer} Depth of the object to return
    * @return value {Mixed} Returns the depth-limited value
    */
    eval_control: function(expression, depth){
      var t = this;

      // Determine a default depth
      depth = typeof depth === 'undefined' ? DEFAULT_DEPTH : depth;

      // Get the raw value
      var value = t._evaluate(expression);

      // Return the depth limited results
      return Monitor.deepCopy(value, depth);
    },

    /**
    * Evaluate an expression, returning the raw results
    *
    * @protected
    * @method _evaluate
    * @param expression {String} Expression to evaluate
    * @return value {Mixed} Returns the expression value
    */
    _evaluate: function(expression){
      var t = this,
          value = null;

      // Evaluate the expression
      try {
        value = eval(expression);
      } catch (e) {
        var err = 'Unable to evaluate expression: "' + expression + '"';
        logger.error('evaluate', err);
        throw new Error(err);
      }

      // Return the value
      return value;
    },

    /**
    * Poll for changes in the evaluation
    *
    * @method poll
    */
    poll: function() {
      var t = this,
          newValue = t.eval_control(t.key, t.depth);

      // Set the new value if it has changed from the current value
      if (!_.isEqual(newValue, t.get('value'))) {
        t.set({value: newValue});
      }
    }
  });

}(this));
