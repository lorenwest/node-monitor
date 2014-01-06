// Sync.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('./Monitor'),
      logger = Monitor.getLogger('Sync'),
      Backbone = Monitor.Backbone,
      _ = Monitor._;

  // Constants
  var METHOD_CREATE = 'create',
      METHOD_READ = 'read',
      METHOD_UPDATE = 'update',
      METHOD_DELETE = 'delete';

  /**
  * Probe based data synchronization with server-side storage.
  *
  * This method returns a function conforming to the Backbone
  * <a href="http://documentcloud.github.com/backbone/#Sync">Sync</a>
  * API, offering
  * <a href="http://documentcloud.github.com/backbone/#Model-fetch">```fetch```</a>,
  * <a href="http://documentcloud.github.com/backbone/#Model-save">```save```</a>, and
  * <a href="http://documentcloud.github.com/backbone/#Model-destroy">```destroy```</a>
  * functionality to any Backbone data model.
  *
  * The returned function can be assigned to the ```sync``` element when defining the
  * data model:
  *
  *     var BlogEntry = Backbone.Model.extend({
  *       ...
  *       sync: Monitor.Sync('BlogEntry'),
  *       ...
  *     });
  *
  * The sync function can also be assigned to any Backbone model after construction:
  *
  *     var myBook = new Book({id:"44329"});
  *     myBook.sync = Monitor.Sync('Book');
  *     myBook.fetch();
  *
  * In addition to providing the standard ```fetch```, ```save```, and ```destroy```
  * functionality, Sync offers *live data synchronization*, updating the data model
  * as changes are detected on the server.
  *
  *     // Turn on live data synchronization
  *     myBook.fetch({liveSync:true});
  *
  * This fetches the ```myBook``` instance with the contents of the Book class
  * id ```44329```, persists local changes to ```myBook```, and keeps ```myBook```
  * up to date with changes detected on the server.
  *
  * Live data synchronization consumes resources on both the client and server.
  * To release those resources, make sure to call the ```clear()``` method on
  * the data model. Otherwise, resources are released when the server connection
  * is terminated.
  *
  *     // Clear the object, turning off live synchronization
  *     myBook.clear();
  *
  * See the <a href="http://documentcloud.github.com/backbone/#Sync">Backbone documentation</a>
  * for more information about the Backbone.sync functionality.
  *
  * @static
  * @method Sync
  * @param className {String} Name of the class to synchronize with
  * @param [options] {Object} Additional sync options
  *     @param options.hostName {String} Host name to use for the Sync probe.
  *       If not specified, the closest server hosting Sync probe will be
  *       determined (this server, or the default gateway)
  *     @param options.appName {String} Server appName (see Monitor.appName)
  *     @param options.appInstance {String} Application instance (see Monitor.appInstance)
  * @return {sync} A sync method to assign to a Backbone class or instance.
  */
  Monitor.Sync = function(className, options) {
    if (!className) {
      throw new Error('Sync class name must be provided');
    }

    // Get a Sync object and bind it to the sync function
    var syncObj = new Sync(className, options);
    return function(method, model, options) {
      logger.info('sync', {className: className, method:method, model:model.toJSON(), options:options});
      return syncObj._sync(method, model, options);
    };
  };

  /**
  * Live data model synchronization.
  *
  * This class can be attached to Backbone models to synchronize backend data using the
  * <a href="http://documentcloud.github.com/backbone/#Model-fetch">```fetch```</a>,
  * <a href="http://documentcloud.github.com/backbone/#Model-save">```save```</a>, and
  * <a href="http://documentcloud.github.com/backbone/#Model-destroy">```destroy```</a>
  * Backbone API methods.
  *
  * It also provides two-way change based synchronization, updating data on the server as
  * changes are made to the model, and updating the client model as changes are detected
  * on the server.
  *
  * Communication is <a href="Probe.html">Probe</a> based, leveraging the built-in
  * connection, routing, and socket-io functionality.  The <a href="FileSyncProbe.html">FileSyncProbe</a>
  * is provided for file-based model persistence, and others can be written to
  * implement alternate persistence mechanisms.
  *
  * @private
  * @class Sync
  */
  var Sync = function(className, options) {
    var t = this;
    logger.info('syncInit', className, options);
    t.className = className;
    t.options = options || {};
  };

  /**
  * Provide the sync API to a backbone data model
  *
  * See the <a href="http://documentcloud.github.com/backbone/#Sync">Backbone documentation</a>
  * for more information on this method.
  *
  * @private
  * @method _sync
  * @param method {String} A CRUD enumeration of "create", "read", "update", or "delete"
  * @param model {Backbone.Model or Backbone.Collection} The model or collection to act upon
  * @param [options] {Object} Success and error callbacks, and additional options to
  *   pass on to the sync implementation.
  *     @param [options.liveSync] - Turn on the live update functionality
  *     @param [options.silenceErrors] - Silence the logging of errors (they're expected)
  *     @param [options.success] - The method to call on method success
  *     @param [options.error] - The method to call on method error
  */
  Sync.prototype._sync = function(method, model, options) {
    var t = this;
    options = options || {};

    // Cannot liveSync with a collection (too many issues)
    if (options.liveSync && model instanceof Backbone.Collection) {
      return options.error(null, 'Cannot liveSync with a collection');
    }

    // Generate an ID if necessary
    if (!model.has('id')) {
      if (method === METHOD_CREATE) {
        model.set({id: Monitor.generateUniqueId()}, {silent: true});
        logger.info('_sync.generateUniqueId', t.className, model.toJSON(), options);
      } else {
        return options.error(null, 'ID element must be set.');
      }
    }

    // Special case: LiveSync on CREATE.  LiveSync requires a persisted object,
    // so if requesting liveSync on a create, we have to use the class monitor
    // for the create, then get an instance monitor for the liveSync.
    if (method === METHOD_CREATE && options.liveSync) {
      // Call this method again without liveSync (this uses the class monitor)
      t._sync(method, model, {error: options.error, success: function(params){
        // Now connect w/liveSync using a fetch
        t._sync(METHOD_READ, model, options);
      }});
      return;
    }

    // Create a function to run once complete
    var onComplete = function(error, params) {
      if (error) {
        if (!options.silenceErrors) {
          logger.error('_sync.onComplete', t.className, error);
        }
        options.error(null, error);
      } else {
        logger.info('_sync.onComplete', t.className, model.get('id'));
        options.success(params);
      }
    };

    // Is the proper syncMonitor already connected?
    if (model.syncMonitor || (t.syncMonitor && !options.liveSync)) {

      // Send the control message to the connected monitor
      var syncMonitor = model.syncMonitor || t.syncMonitor;
      var opts = t._getOpts(method, model);
      syncMonitor.control(method, opts, onComplete);

    } else {

      // Connect an instance level syncMonitor to the model if liveSync
      // is specified, otherwise create a class level syncMonitor
      if (options.liveSync) {
        t._connectInstanceMonitor(method, model, options, onComplete);
      } else {
        t._connectClassMonitor(method, model, options, onComplete);
      }
    }

  };

  /**
  * Connect and send the control message to a Sync probe for this class.
  *
  * This creates a monitor to a Sync probe with the specified className.
  * The monitor is used to send CRUD control messages for any ID within
  * the class.
  *
  * Once connected, it sends the specified control message to the probe.
  *
  * This monitor is used for non-liveSync interactions.
  *
  * @private
  * @method _connectClassMonitor
  * @param method {String} The requested CRUD method
  * @param model {Backbone.Model} The data model to perform the operation on
  * @param [options] {Object} Options
  *     @param [options.silenceErrors] - Silence the logging of errors (they're expected)
  * @param callback {function(error, params)} - Called when connected
  *     @param callback.error {Mixed} - Set if it couldn't connect
  *     @param callback.params {Object} - Updated data model parameters
  */
  Sync.prototype._connectClassMonitor = function(method, model, options, callback) {
    var t = this;

    // Connect a syncMonitor for the class
    logger.info('connectClassMonitor', t.className, method, model.toJSON());
    var monitorParams = t._getMonitorParams(null);
    var syncMonitor = new Monitor(monitorParams);
    syncMonitor.connect(function(error){
      if (error) {
        if (!options.silenceErrors) {
          logger.error('connectClassMonitor', error);
        }
        return callback(error);
      }

      // Attach the syncMonitor and forward the initial control message
      t.syncMonitor = syncMonitor;
      var opts = t._getOpts(method, model);
      syncMonitor.control(method, opts, callback);
    });
  };

  /**
  * Connect and send the control message to a liveSync monitor for the model
  *
  * This creates a monitor to a Sync probe for the model instance, and
  * attaches event listeners onto the monitor and the data model.
  *
  * Once connected, it sends the specified control message to the probe.
  *
  * Changes on the server are automatically propagated to the local
  * data model, and local changes to the data model are automatically
  * propagated to the server.
  *
  * @private
  * @method _connectInstanceMonitor
  * @param method {String} The requested CRUD method
  * @param model {Backbone.Model} The data model to perform the operation on
  * @param callback {function(error, params)} - Called when connected
  *     @param callback.error {Mixed} - Set if it couldn't connect
  *     @param callback.params {Object} - Updated data model parameters
  */
  Sync.prototype._connectInstanceMonitor = function(method, model, options, callback) {
    var t = this, syncMonitor, modelId = model.get('id');

    // Called when done connecting
    var whenDone = function(error) {

      // Don't connect the instance monitor if errors
      if (error) {
        return callback(error);
      }

      // Called to disconnect the listeners
      var disconnectListeners = function() {
        logger.info('disconnectLiveSync', t.className, model.toJSON());
        model.off('change', modelListener);
        model.syncMonitor.off('change', monitorListener);
        model.syncMonitor.disconnect();
        model.syncMonitor = null;
      };

      // Client-side listener - for persisting changes to the server
      var modelListener = function(changedModel, options) {
        options = options || {};

        // Don't persist unless the model is different
        if (_.isEqual(JSON.parse(JSON.stringify(model)), JSON.parse(JSON.stringify(model.syncMonitor.get('model'))))) {
          logger.info('modelListener.noChanges', t.className, model.toJSON());
          return;
        }

        // Disconnect listeners if the ID changes
        if (model.get('id') !== modelId) {
          logger.info('modelListener.alteredId', t.className, model.toJSON());
          return disconnectListeners();
        }

        // Persist changes to the server (unless the changes originated from there)
        if (!options.isSyncChanging) {
          logger.info('modelListener.saving', t.className, model.toJSON());
          model.save();
        }
      };

      // Server-side listener - for updating server changes into the model
      var monitorListener = function(changedModel, options) {

        // Don't update unless the model is different
        var newModel = model.syncMonitor.get('model');
        if (_.isEqual(JSON.parse(JSON.stringify(model)), JSON.parse(JSON.stringify(newModel)))) {
          logger.info('monitorListener.noChanges', t.className, newModel);
          return;
        }

        // Disconnect if the model was deleted or the ID isn't the same
        var isDeleted = (_.size(newModel) === 0);
        if (isDeleted || newModel.id !== modelId)  {
          logger.info('modelListener.deleted', t.className, newModel);
          disconnectListeners();
        }

        // Forward changes to the model (including server-side delete)
        var newOpts = {isSyncChanging:true};
        if (isDeleted) {
          logger.info('modelListener.deleting', t.className, newModel);
          model.clear(newOpts);
        } else {
          // Make sure the model is set to exactly the new contents (vs. override)
          logger.info('modelListener.setting', t.className, newModel);
          model.clear({silent:true});
          model.set(newModel, newOpts);
        }
      };

      // Connect the listeners
      model.on('change', modelListener);
      model.syncMonitor.on('change', monitorListener);

      // Send back the initial data model
      logger.info('connectInstanceMonitor.done', t.className, model.toJSON());
      callback(null, model.syncMonitor.get('model'));
    };

    // Create a liveSync monitor for the model
    var monitorParams = t._getMonitorParams(modelId);
    syncMonitor = new Monitor(monitorParams);
    syncMonitor.connect(function(error){
      if (error) {
        if (!options.silenceErrors) {
          logger.error('connectInstanceMonitor.monitorConnect', error);
        }
        return whenDone(error);
      }

      // Attach the connected syncMonitor to the model
      model.syncMonitor = syncMonitor;

      // If the initial method is read, then the monitor already
      // contains the results.  Otherwise, another round-trip is
      // necessary for the initial control request.
      if (method === METHOD_READ) {
        return whenDone();
      }

      // Forward the initial control
      var opts = t._getOpts(method, model);
      logger.info('connectInstanceMonitor.forwarding', method, t.className, model.toJSON());
      syncMonitor.control(method, opts, whenDone);
    });
  };

  /**
  * Prepare the control options
  *
  * This prepares the control options to include the ID element
  * on a fetch or delete, and the entire model on a create or
  * update.
  *
  * @private
  * @method _getOpts
  * @param method {Enum} One of the CRUD methods
  * @param model {Backbone.Model} The model to prepare the opts from
  * @return {Object} The options object to pass to the probe
  */
  Sync.prototype._getOpts = function(method, model) {
    var opts = {};
    switch (method) {
      case METHOD_READ:
      case METHOD_DELETE:
        opts.id = model.get('id');
        break;
      case METHOD_CREATE:
      case METHOD_UPDATE:
        opts.model = model.toJSON();
        break;
    }
    return opts;
  };

  /**
  * Prepare the init parameters for a monitor to a Sync probe
  *
  * The monitor init params for the class monitor and the liveSync
  * model monitor only differ in the modelId, so this method was
  * broken out to reduce code duplication.
  *
  * @private
  * @method _getMonitorParams
  * @param [modelId] {String} Id to the data model.  If set, then params
  *   will be built for liveSync to a data model with that id.
  *   params for the class.
  * @return {Object} The monitor parameters
  */
  Sync.prototype._getMonitorParams = function(modelId) {

    // Build server connection parameters from this instance of Sync
    var t = this;
    var params = _.pick(t.options, 'hostName', 'appName', 'appInstance');

    // Add probe and class parameters
    params.probeClass = 'Sync';
    params.initParams = {
      className: t.className
    };

    // Add the model id if this is a liveSync probe
    if (modelId) {
      params.initParams.modelId = modelId;
    }

    return params;
  };


}(this));
