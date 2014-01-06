// FileSyncProbe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('../Monitor'),
      logger = Monitor.getLogger('FileSyncProbe'),
      Probe = Monitor.Probe,
      _ = Monitor._,
      SyncProbe = Monitor.SyncProbe,
      FS = require('fs'),
      Path = require('path'),
      FileProbe = Monitor.FileProbe;

  // This must be set using setRootPath() before the probe will operate
  var ROOT_PATH = null;

  /**
  * Probe for synchronizing a Backbone data model with a file on the O/S
  *
  * Probe parameters are listed under <a href="SyncProbe.html">SyncProbe</a>.
  *
  * @class FileSyncProbe
  * @extends Probe
  * @constructor
  */
  var FileSyncProbe = SyncProbe.FileSyncProbe = Probe.extend({

    probeClass: 'FileSyncProbe',

    initialize: function(attributes, options){
      var t = this;
      Probe.prototype.initialize.apply(t, arguments);

      // Disable the probe if the root path hasn't been set
      if (!ROOT_PATH) {
        throw new Error('FileSync has not been enabled on this server.');
      }

      // Class name must exist
      if (!t.has('className')) {
        throw new Error('FileSync - Class name not specified');
      }

      // Don't allow a path above the root path
      t.dirPath = Path.join(ROOT_PATH, t.get('className'));
      if (t.dirPath.indexOf(ROOT_PATH) !== 0) {
        throw new Error('Invalid file path');
      }

      // We're done if this isn't a liveSync probe
      if (!t.has('modelId')) {
        return;
      }

      // Assume callback responsibility
      options.asyncInit = true;
      var callback = options.callback;

      // Get the full path to the file
      t.getFullPath(t.get('modelId'), function(error, response){
        if (error) {
          return callback({msg: 'Failed to get the path', err:error});
        }

        // Get the file and stats
        var fullPath = response.path;
        var stats = response.stats;

        // Build the function to watch the file
        var onFileWatch = function(error, content) {

          var isInitializing = (callback !== null),
              initCallback = callback;
          callback = null;

          if (error && error.code === 'ENOENT') {
            // File doesn't exist. Set the model to null.
            t.set({model: {}}, {silent: isInitializing});
            // Convert the code from the sync probe spec
            error.code = 'NOTFOUND';
          }
          if (error) {
            if (isInitializing) {
              t.release();
              var err = {code: error.code, msg: 'LiveSync requires the file to exist and be readable'};
              initCallback(err);
            }
            return;
          }

          // Parse the JSON content into a JS object.
          try {
            content = JSON.parse(content);
            logger.info('fileParse', {id: t.get('modelId'), content: content});
          } catch (e) {

            // Fail the probe on first load error
            if (isInitializing) {
              t.release();
              initCallback({code: 'BAD_FORMAT', msg: 'Non-JSON formatted file'});
            }

            // Nothing productive to do if the file can't be parsed. Just log it.
            logger.error('fileParse', {error: e, id: t.get('modelId'), content: content});
            return;
          }

          // Set the content into the model if it's different
          // Have to compare raw objects because toJSON returns deep references to models
          var priorModel = t.get('model');
          if (!priorModel || !_.isEqual(content, JSON.parse(JSON.stringify(priorModel)))) {
            t.set({model: content}, {silent: isInitializing});
          }

          // Call the initialization callback on first load
          if (isInitializing) {
            initCallback();
          }
        };

        // Load and watch the file
        var watcherOpts = {
          preload: true,
          persistent: true
        };
        t.fileWatcher = FileProbe.watchLoad(fullPath, watcherOpts, onFileWatch);

      });
    },

    // Documentation for these methods in SyncProbe
    create_control: function(args, callback) {
      // Make sure the ID exists
      var t = this, model = args.model;
      if (!model || !model.id) {
        return callback({msg:'SyncProbe create - Data model with ID not present'});
      }

      // Make sure the file doesn't already exist
      t.getFullPath(model.id, function(error, response) {
        if (error) {
          return callback(error);
        }

        if (response.stats) {
          return callback({msg:'Document with this ID already exists'});
        }

        // Forward to the update control
        t.update_control(args, callback);
      });
    },

    read_control: function(args, callback) {
      // Make sure the ID exists
      var t = this, id = args.id;
      if (!id) {
        return callback({msg:'SyncProbe read - ID not present'});
      }

      // Read the file
      t.getFullPath(id, function(error, response){
        if (error) {
          return callback(error);
        }
        if (!response.stats) {
          return callback({code: 'NOTFOUND', msg:'Document with this ID not found'});
        }

        var fullPath = response.path;
        FS.readFile(fullPath, 'utf8', function(error, data) {
          if (error) {
            return callback({code: 'UNKNOWN', msg:'Error reading file', error: error.code});
          }

          // Parse the file
          var model;
          try {
            model = JSON.parse(data);
          } catch (e) {
            return callback({code: 'PARSE', msg: 'Error parsing file'});
          }
          callback(null, model);
        });
      });
    },

    update_control: function(args, callback) {

      // Make sure the ID exists
      var t = this, model = args.model;
      if (!model || !model.id) {
        return callback({msg:'SyncProbe create - Data model with ID not present'});
      }

      // Make sure the directory exists
      t.getFullPath(model.id, function(error, response) {
        if (error) {
          return callback(error);
        }

        var fullPath = response.path,
            parentDir = Path.dirname(fullPath);
        FileProbe.mkdir_r(parentDir, function(error) {
          if (error) {
            return callback(error);
          }

          // Set the contents of the model for liveSync
          if (t.has('modelId')) {
            t.set('model', model);
          }

          // Write the file
          FS.writeFile(fullPath, JSON.stringify(model, null, 2), 'utf8', function(error){
            callback(error, {});
          });
        });
      });

    },

    delete_control: function(args, callback) {
      // Make sure the ID exists
      var t = this, id = args.id;
      if (!id) {
        return callback({msg:'SyncProbe delete - ID not present'});
      }

      // Set the contents of the model for liveSync
      t.getFullPath(id, function(error, response) {
        if (error) {
          return callback({msg:'Error removing file', err:error});
        }
        var fullPath = response.path;
        if (t.has('modelId')) {
          t.set('model', null);
        }

        // Remove the file
        FS.unlink(fullPath, function(error, data) {
          if (error) {
            return callback({msg:'Error removing file'});
          }
          return callback(null, {});
        });
      });
    },

    release: function() {
      var t = this;
      if (t.fileWatcher) {
        t.fileWatcher.close();
        t.fileWatcher = null;
      }
    },

    /**
    * Get the full path to the file
    *
    * This builds the full pathname to the file, and performs an fs.sync()
    * on that pathname, providing the pathname and sync object in the callback.
    *
    * @method getFullPath
    * @param modelId {String} ID of the data model to sync
    * @param callback {Function(error, return)}
    *   @param callback.error {Object} Error object (null if no error)
    *   @param callback.return {Object} return object
    *     @param callback.return.path {String} Full pathname to the file
    *     @param callback.return.stat {fs.stats} Stats object (null if the file doesn't esixt)
    */
    getFullPath: function(modelId, callback) {
      var t = this,
          dirPath = t.dirPath;

      // Don't allow relative paths
      var fullPath = Path.join(t.dirPath, modelId);
      if (fullPath.indexOf(dirPath) !== 0) {
        return callback({msg: 'Model ID ' + modelId + ' cannot represent a relative path'});
      }

      // See if the path represents a directory
      FS.stat(fullPath, function(error, stats){

        // If this is an existing directory, return a path to dir/index.json
        if (!error && stats.isDirectory()) {
          return t.getFullPath(modelId + '/index', callback);
        }

        // Normal case - return the path & stat to the json file
        fullPath += '.json';
        FS.stat(fullPath, function(error, stats){

          // Not an error if error == ENOENT
          if (error && error.code === 'ENOENT') {
            error = null; stats = null;
          }

          // Process other FS errors
          if (error) {
            return callback({err: error, msg: "Error while observing file: " + fullPath});
          }

          // Forward the callback
          return callback(null, {path: fullPath, stats: stats});
        });
      });
    }

  });

  /**
  * Set the server root path for objects stored with this probe
  *
  * For security purposes, this must be set before the SyncFileProbe
  * will operate.  It will not accept any changes once set.
  *
  * @static
  * @method setRootPath
  * @param rootPath {String} A path to the root directory for model object storage
  */
  FileSyncProbe.setRootPath = function(rootPath) {
    var normalized = Path.normalize(rootPath);
    if (ROOT_PATH && ROOT_PATH !== normalized) {
      throw new Error('Cannot change the File probe root path once set.');
    }
    ROOT_PATH = normalized;
  };

  /**
  * Get the current root path.
  *
  * As a static method, this is only available on the server running the probe.
  * For security purposes, this is not exposed in the FileSyncProbe data model.
  *
  * @static
  * @method getRootPath
  * @return {String} The path to the root directory for the FilePath probe
  */
  FileSyncProbe.getRootPath = function() {
    return ROOT_PATH;
  };

}(this));
