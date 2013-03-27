// FileSync.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('../Monitor'),
      Probe = Monitor.Probe,
      _ = Monitor._,
      SyncProbe = Monitor.SyncProbe,
      FS = require('fs'),
      Path = require('path'),
      FileProbe = Monitor.FileProbe;

  // This must be set using setRootPath() before the probe will operate
  var ROOT_PATH = null;

  /**
  * Probe for synchronizing a data model with a file on the O/S
  *
  * Probe parameters are listed under <a href="SyncProbe.html">SyncProbe</a>.
  *
  * @class FileSync
  * @extends Probe
  * @constructor
  */
  var FileSync = SyncProbe.FileSync = Probe.extend({

    probeClass: 'FileSync',

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

      // Build the function to watch the file
      var fullPath = t.getFullPath(t.get('modelId'));
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
            initCallback({code: error.code, msg: 'LiveSync requires the file to exist and be readable'});
          }
          return;
        }

        // Parse the JSON content into a JS object.
        try {
          content = JSON.parse(content);
        } catch (e) {

          // Fail the probe on first load error
          if (isInitializing) {
            t.release();
            initCallback({code: 'BAD_FORMAT', msg: 'Non-JSON formatted file'});
          }

          // Nothing productive to do if the file can't be parsed. Just log it.
          return console.error('File format error - invalid JSON: ' + fullPath + ' Content: ' + content);
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
    },

    // Documentation for these methods in SyncProbe
    create_control: function(args, callback) {
      // Make sure the ID exists
      var t = this, model = args.model;
      if (!model || !model.id) {
        return callback({msg:'SyncProbe create - Data model with ID not present'});
      }

      // Make sure the file doesn't already exist
      var fullPath = t.getFullPath(model.id);
      FS.stat(fullPath, function(error, stats) {
        if (!error) {
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
      var fullPath = t.getFullPath(id);
      FS.readFile(fullPath, 'utf8', function(error, data) {
        if (error && error.code === 'ENOENT') {
          return callback({code: 'NOTFOUND', msg:'Document with this ID not found'});
        }

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
    },

    update_control: function(args, callback) {

      // Make sure the ID exists
      var t = this, model = args.model;
      if (!model || !model.id) {
        return callback({msg:'SyncProbe create - Data model with ID not present'});
      }

      // Make sure the directory exists
      var fullPath = t.getFullPath(model.id),
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

    },

    delete_control: function(args, callback) {
      // Make sure the ID exists
      var t = this, id = args.id;
      if (!id) {
        return callback({msg:'SyncProbe delete - ID not present'});
      }

      // Set the contents of the model for liveSync
      var fullPath = t.getFullPath(id);
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
    },

    release: function() {
      var t = this;
      if (t.fileWatcher) {
        t.fileWatcher.close();
        t.fileWatcher = null;
      }
    },

    // Get the full path to the file.  This can be
    // overridden for custom paths based on ID.
    getFullPath: function(modelId) {
      var t = this,
          dirPath = t.dirPath;

      // Path.join also normalizes the path
      var fullPath = Path.join(t.dirPath, modelId + '.json');

      // Don't allow relative paths
      if (fullPath.indexOf(dirPath) !== 0) {
        throw new Error('Model ID cannot represent a relative path');
      }

      // Return the path
      return fullPath;
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
  FileSync.setRootPath = function(rootPath) {
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
  * For security purposes, this is not exposed in the FileSync data model.
  *
  * @static
  * @method getRootPath
  * @return {String} The path to the root directory for the FilePath probe
  */
  FileSync.getRootPath = function() {
    return ROOT_PATH;
  };

}(this));
