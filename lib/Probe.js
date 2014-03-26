// Probe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('./Monitor'),
      log = Monitor.getLogger('Probe'),
      stat = Monitor.getStatLogger('Probe'),
      Cron = Monitor.Cron, _ = Monitor._, Backbone = Monitor.Backbone;

  /**
  * A software device used to expose real time data to monitors
  *
  * This is the base class from which all probe implementations extend.
  *
  * In order to send probe data to monitors, probe implementations simply set
  * their model data using ```set()```.  Those changes are detected and propagated
  * to all monitors of this probe, firing their change events.
  *
  * In order to allow remote probe control, probes need only provide a method
  * called ```{name}_control()```.  See the ```ping_control()``` method as an example,
  * and the ```Probe.onControl()``` method for more information.
  *
  * @class Probe
  * @extends Backbone.Model
  * @constructor
  * @param model - Initial data model.  Can be a JS object or another Model.
  *     @param model.id {String} The probe id.
  *       Assigned by the <a href="Router.html">Router</a> on probe instantiation.
  */
  var Probe = Monitor.Probe = Backbone.Model.extend({

    defaults: {
      id:  null
    },

    /**
    * Initialize the probe
    *
    * This is called on the probe during construction.  It contains
    * the probe initialization attributes and an option to make probe
    * construction asynchronous.
    *
    * Probe implementations can defer the initial response to the monitor until
    * the initial state is loaded.  This allows the callback on
    * <a href="Monitor.html#method_connect">```Monitor.connect()```</a>
    * to have the complete initial state of the probe when called.
    *
    * If the initial probe state cannot be determined in ```initialize```, it should
    * set the ```options.asyncInit``` option to ```true```, and call the
    * ```options.callback(error)``` once the initial state is determined.
    *
    *     // Asynchronous initialization
    *     options.asyncInit = true;
    *     var callback = options.callback
    *
    * If ```asyncInit``` is set to true, the ```callback``` must be called once
    * the initial state of the probe is known (or in an error condition).
    *
    *     // Set the initial state, and call the callback
    *     this.set(...);
    *     callback(null);
    *
    * See the <a href="../files/lib_probes_FileProbe.js.html#l47">```initialize```</a>
    * method of the <a href="FileProbe.html">FileProbe</a> probe for an example.  It defers
    * returning the probe to the monitor until the initial file contents are loaded.
    *
    * @method initialize
    * @param attributes {Object} Initial probe attributes sent in from the Monitor
    * @param options {Object} Initialization options
    *     @param options.asyncInit {boolean} Set this to TRUE if the initial probe
    *         state can't be known immediately.
    *     @param options.callback {function(error)} The callback to call
    *         if asyncInit is set to true.  If an error is passed, the probe
    *         will not be used.
    */
    initialize: function(attributes, options) {
      var t = this;
      log.info('init', t.toJSON(), options);
    },

    /**
    * Release any resources consumed by this probe.
    *
    * This can be implemented by derived classes that need to be informed when
    * they are to be shut down.
    *
    * Probes that listen to events should use this method to remove their
    * event listeners.
    *
    * @method release
    */
    release: function(){
      var t = this;
      log.info('release', t.toJSON());
    },

    /**
    * Dispatch a control message to the appropriate control function.
    *
    * This is called when the
    * <a href="Monitor.html#method_control">```control()```</a>
    * method of a monitor is called.
    * The name determines the method name called on the probe.
    *
    * The probe must implement a method with the name ```{name}_control()```,
    * and that method must accept two parameters - an input params and a callback.
    * The callback must be called, passing an optional error and response object.
    *
    * For example, if the probe supports a control with the name ```go```, then
    * all it needs to do is implement the ```go_control()``` method with the
    * proper signature.  See ```ping_control()``` for an example.
    *
    * @method onControl
    * @param name {String} Name of the control message.
    * @param [params] {Any} Input parameters specific to the control message.
    * @param [callback] {Function(error, response)} Called to send the message (or error) response.
    * <ul>
    *   <li>error (Any) An object describing an error (null if no errors)</li>
    *   <li>response (Any) Response parameters specific to the control message.
    * </ul>
    */
    onControl: function(name, params, callback) {
      var t = this,
          controlFn = t[name + '_control'],
          startTime = Date.now(),
          errMsg,
          logId = 'onControl.' + t.probeClass + '.' + name;

      params = params || {};
      callback = callback || function(){};
      log.info(logId, t.get('id'), params);

      if (!controlFn) {
        errMsg = 'No control function: ' + name;
        log.error(logId, errMsg);
        return callback({msg: errMsg});
      }

      var whenDone = function(error) {
        if (error) {
          log.error(logId + '.whenDone', error);
          return callback(error);
        }
        var duration = Date.now() - startTime;
        log.info(logId, params);
        stat.time(t.logId, duration);
        callback.apply(null, arguments);
      };

      // Run the control on next tick.  This provides a consistent callback
      // chain for local and remote probes.
      setTimeout(function(){
        try {
          controlFn.call(t, params, whenDone);
        } catch (e) {
          errMsg = 'Error calling control: ' + t.probeClass + ':' + name;
          whenDone({msg:errMsg, err: e.toString()});
        }
      }, 0);
    },

    /**
    * Remotely set a probe attribute.
    *
    * This allows setting probe attributes that are listed in writableAttributes.
    * It can be overwritten in derived Probe classes for greater control.
    *
    * @method set_control
    * @param attrs {Object} Name/Value attributes to set.  All must be writable.
    * @param callback {Function(error)} Called when the attributes are set or error
    */
    set_control: function(attrs, callback) {
      var t = this,
          writableAttributes = t.get('writableAttributes') || [];

      // Validate the attributes are writable
      if (writableAttributes !== '*') {
        for (var attrName in attrs) {
          if (writableAttributes.indexOf(attrName) < 0) {
            return callback({code:'NOT_WRITABLE', msg: 'Attribute not writable: ' + attrName});
          }
        }
      }

      // Set the data
      var error = null;
      if (!t.set(attrs)) {
        error = {code:'VALIDATION_ERROR', msg:'Data set failed validation'};
        log.warn('set_control', error);
      }
      return callback(error);
    },

    /**
    * Respond to a ping control sent from a monitor
    *
    * @method ping_control
    * @param params {Object} Input parameters (not used)
    * @param callback {Function(error, response)} Called to send the message (or error) response.
    * <ul>
    *   <li>error (Any) An object describing an error</li>
    *   <li>response (String) The string 'pong' is returned as the response</li>
    * </ul>
    */
    ping_control: function(params, callback) {
      return callback(null, 'pong');
    }

  });

  // Register probe classes when loaded
  Probe.classes = {}; // key = name, data = class definition
  Probe.extend = function(params) {
    var t = this, probeClass = Backbone.Model.extend.apply(t, arguments);
    if (params.probeClass) {Probe.classes[params.probeClass] = probeClass;}
    return probeClass;
  };

  /**
  * Constructor for a list of Probe objects
  *
  *     var myList = new Probe.List(initialElements);
  *
  * @static
  * @method List
  * @param [items] {Array} Initial list items.  These can be raw JS objects or Probe data model objects.
  * @return {Backbone.Collection} Collection of Probe data model objects
  */
  Probe.List = Backbone.Collection.extend({model: Probe});

}(this));
