// SyncProbe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('../Monitor'),
      _ = Monitor._, Probe = Monitor.Probe;

  /**
  * Probe for exposing backbone data models from server-side persistence
  *
  * This probe is used by the client-side <a href="Sync.html">Sync</a> class
  * to connect a local backbone model with server-side storage.
  *
  * It delegates to a specialized SyncProbe defined by the server for the
  * specific data class.  For example, the server may determine that one class
  * type uses FileSyncProbe, and another class uses a different persistence
  * mechanism.
  *
  * For security purposes, the server must <a href="SyncProbe.html#property_Config">configure</a> specific SyncProbes for
  * classes, or a default sync probe before this will operate.
  *
  * @class SyncProbe
  * @extends Probe
  * @constructor
  * @param className {String} Name of the class to synchronize with
  * @param [modelId] {String} Id of the data model for live synchronization
  *   If not set, a non-live probe is set up for control access only.
  * @param [model] {Object} If this is a liveSync probe, this contains
  *   the attributes of the current model object.
  */
  var SyncProbe = Monitor.SyncProbe = Probe.extend({

    probeClass: 'Sync',
    defaults: {
      className: null,
      modelId: null,
      model: null
    },

    initialize: function(attributes, options){
      var t = this;
      Probe.prototype.initialize.apply(t, arguments);

      // Determine the probe name based on the class, and coerce this
      // object into one of those by copying all prototype methods.
      var className = t.get('className'),
          config = SyncProbe.Config,
          probeClassName = config.classMap[className] || config.defaultProbe,
          probeClass = SyncProbe[probeClassName];
      _.each(_.functions(probeClass.prototype), function(methodName) {
        t[methodName] = probeClass.prototype[methodName];
      });
      t.probeClass = probeClass.prototype.probeClass;

      // Forward class initialization to the coerced initialize method
      return t.initialize.apply(t, arguments);
    },

    release: function() {
      var t = this;
      Probe.prototype.release.apply(t, arguments);
    },

    /**
    * Create and save a new instance of the class into storage
    *
    * This probe control requests a new instance of a data model to be
    * persisted onto storage.  It is invoked when a data model that has
    * the Sync probe attached calls ```save()``` on a new object.
    *
    * @method create_control
    * @param model {Object} Full data model to save.  This must contain
    *     the id element.
    * @param callback {Function(error, result)} Callback when complete
    *     @param callback.error {Mixed} Set if an error occurs during creation.
    *     @param callback.result {Object} An object containing any differing
    *         parameters from the model sent in.  Normally a blank object.
    */
    create_control: function(args, callback) {
      callback({msg: 'not implemented'});
    },

    /**
    * Read an instance from storage
    *
    * This probe control reads the instance with the specified id
    * from storage, and returns it in the callback.
    *
    * @method read_control
    * @param id {String} ID of the object to read
    * @param callback {Function(error, result)} Callback when complete
    *     @param callback.error {Mixed} Set if an error occurs during read.
    *       if error.code === 'NOTFOUND' then the requested object wasn't found.
    *       if error.code === 'PARSE' then the document was poorly formatted JSON.
    *     @param callback.result {Object} The full object.
    */
    read_control: function(args, callback) {
      callback({msg: 'not implemented'});
    },

    /**
    * Update a data model in storage
    *
    * This acts like a REST PUT, meaning it can create a new object, or
    * update an existing object.
    *
    * Backbone has only a save() method.  If the client sets the ID
    * of the object before save(), Backbone thinks the object exists and
    * will call update vs. create.
    *
    * @method update_control
    * @param model {Object} Full data model to save.  This must contain
    *     the id element.
    * @param callback {Function(error, result)} Callback when complete
    *     @param callback.error {Mixed} Set if an error occurs during save.
    *     @param callback.result {Object} An object containing any differing
    *         parameters from the model sent in.  Normally a blank object.
    */
    update_control: function(args, callback) {
      callback({msg: 'not implemented'});
    },

    /**
    * Delete an instance from storage
    *
    * This probe control deletes the instance with the specified id
    * from storage.
    *
    * @method delete_control
    * @param id {String} ID of the object to read
    * @param callback {Function(error)} Callback when complete
    *     @param callback.error {Mixed} Set if an error occurs during read.
    */
    delete_control: function(args, callback) {
      callback({msg: 'not implemented'});
    }

  });

  /**
  * Static Configurations
  *
  * These can be set onto the Monitor.SyncProbe class after it's loaded.
  *
  * The SyncProbe will *not* work until the defaultProbe is defined.
  *
  * Example:
  *
  *     var syncConfig = Monitor.SyncProbe.Config;
  *     syncConfig.defaultProbe = 'FileSyncProbe';
  *     syncConfig.classMap = {
  *       Book: 'MongoDbSync',
  *       Author: 'MongoDbSync'
  *     }
  *
  * @static
  * @property Config
  * @type &lt;Object&gt;
  * <ul>
  *   <li><code>defaultProbe (String)</code> Name of the sync probe to use if the class isn't listed in the classMap</li>
  *   <li><code>classMap (Object)</code> Map of className to sync probe name to use instead of the default for that class</li>
  * </ul>
  */
  var defaultConfig = {
    defaultProbe: '',
    classMap: {}
  };

  // Expose default configurations to the config package
  SyncProbe.Config = _.extend({}, defaultConfig);

}(this));
