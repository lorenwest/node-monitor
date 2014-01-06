// FileProbe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('../Monitor'),
      _ = Monitor._,
      Probe = Monitor.Probe,
      FS = require('fs'),
      Path = require('path');

  // This must be set using setRootPath() before the probe will operate
  var ROOT_PATH = null;
  
  // TODO: Implement streaming - possibly with the 10.x streaming interface?
  // http://blog.strongloop.com/practical-examples-of-the-new-node-js-streams-api/?goback=%2Egde_3208061_member_245121234

  /**
  * Baseline Probe Classes
  *
  * The probes in this module offer baseline functionality, and provide examples for building custom probes.
  *
  * @module Probes
  */

  /**
  * Probe for monitoring a file on the O/S.
  *
  * This probe monitors a file for changes.  It can either contain the full file
  * contents, or the most recent file changes.
  *
  * For security purposes, this probe is disabled by default.  The application
  * server must set the root directory path using ```setRootPath()``` before
  * the probe will operate.
  *
  * To enable FileProbe on the server:
  *
  *     // Enable the File probe under the user home directory
  *     var Monitor = require('monitor');
  *     Monitor.FileProbe.setRootPath('/home/public');
  *
  * This class also contains server-side utility methods for file and
  * directory manipulation.
  *
  * Using the FileProbe (client or server):
  *
  *     // Watch the template for changes
  *     var indexTemplate = new Monitor({
  *       probeClass: 'File',
  *       initParams: {
  *         path: 'templates/index.html'
  *       }
  *     });
  *     indexTemplate.connect(function(error) {
  *       console.log("Connected");
  *     });
  *
  * Once connected, the ```text``` field of ```indexTemplate``` will be set to
  * the file contents, and the ```change``` listener will fire whenever the
  * server detects a change in the template file.
  *
  * @class FileProbe
  * @extends Probe
  * @constructor
  * @param initParams {Object} Remote initialization parameters
  *     @param initParams.path {String} Path to the file beneath the server-specified root path.
  *     @param [initParams.tail=false] {Boolean} false:text contains current file content, true: text contains last changes.
  * @param model {Object} Monitor data model elements
  *     @param model.text {String} Full file contents, or last file changes.
  *     @param model.error {String} File read errors.
  */
  var FileProbe = Monitor.FileProbe = Probe.extend({

    probeClass: 'File',
    defaults: {path:'', tail:false, text:''},

    initialize: function(attributes, options){
      var t = this;
      Probe.prototype.initialize.apply(t, arguments);

      // Disable the probe if the root path hasn't been set
      if (!ROOT_PATH) {
        throw new Error('File probe has not been enabled on this server.');
      }

      // Don't allow a path above the root path
      t.fullPath = Path.join(ROOT_PATH, t.get('path'));
      if (t.fullPath.indexOf(ROOT_PATH) !== 0) {
        throw new Error('Invalid file path');
      }

      // Assume callback responsibility.
      options.asyncInit = true;
      var callback = options.callback;

      // Set up for reading or tailing
      if (t.get('tail')) {

        //TODO: Implement tail
        return callback({code:'UNDER_CONSTRUCTION', msg:'Tail functionality not implemented.'});

      } else {

        // Build the function to call on initial load and subsequent change
        t.onLoad = function(error, newContent) {
          var firstLoad = (callback !== null);
          t.set({error: error, text: newContent}, {silent:firstLoad});

          // Call the init callback on first load
          if (firstLoad) {
            callback(error);
            callback = null;
          }
        };

        // Load and watch the file
        var watcherOpts = {
          preload: true,
          persistent: true
        };
        t.watcher = FileProbe.watchLoad(t.fullPath, watcherOpts, t.onLoad);
      }
    },

    release: function() {
      var t = this;
      if (t.watcher) {
        t.watcher.close();
      }
      Probe.prototype.release.apply(t, arguments);
    }

  });

  /**
  * Build a backwards compatible file change watcher
  *
  * The Node.js
  * <a href="http://nodejs.org/api/all.html#all_fs_watch_filename_options_listener">```fs.watch```</a>
  * functionality was introduced in version 0.6.x.  This method builds a watcher
  * object that uses the new funcitonality, and degrades to the polling style
  * ``fs.watchFile`` functionality if running with node.js that doesn't have
  * ```fs.watch```.
  *
  * The provided callback is only fired if the file has changed.
  *
  * When done watching, make sure to call the ```close()``` method of the
  * returned object to release resources consumed by file watching.
  *
  * @static
  * @method watch
  * @param path {String} Path to the file
  * @param [options] {Object} File watch options
  *     @param [options.persistent=false] {Boolean} File encoding type.
  *     @param [options.pollStyle=false] {Boolean} Use the older polling-style watchFile.
  *     @param [options.interval=10] {Integer} Polling interval (if pollStyle=true)
  * @param callback {Function (event)} Function called on file change.
  *     @param callabck.event {String} One of 'change' or 'rename' (delete = 'rename')
  * @return {Object} An object that contains a ```close()``` method to call when
  *     done watching.
  */
  FileProbe.watch = function(path, options, callback) {

    // Process arguments
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    var defaultOpts = {persistent:false, pollStyle:false, interval:10};
    var opts = _.extend({}, defaultOpts, options);

    // Use fs.watch or fs.watchFile
    var watcher = null;
    if (FS.watch && !opts.pollStyle) {
      // Latest watch method
      try {
        watcher = FS.watch(path, opts, function(event, filename) {
          callback(event);
        });
      } catch (e) {
        // Return a mock watcher.  The callback will be called on error.
        watcher = {
          close: function(){}
        };
      }
    }
    else {
      FS.watchFile(path, opts, function(curr, prev) {
        // Detect file deletion
        if (curr.nlink === 0) {
          return callback('rename');
        }
        if (curr.mtime.getTime() === prev.mtime.getTime()) {
          return;
        }
        return callback('change');
      });
    }

    // Return the object for closing
    return {
      close: function() {
        if (watcher) {
          watcher.close();
        } else {
          FS.unwatchFile(path);
        }
      }
    };
  };

  /**
  * Watch a file for changes and reload the content on change
  *
  * This method accepts a callback function that is invoked whenever the file
  * contents have changed.  If preload is requested, the callback is also called
  * on the initial file contents.
  *
  *     // Monitor the homePage.html template
  *     var FileProbe = Monitor.FileProbe;
  *     var path = __dirname + "/templates/homePage.html";
  *     var options = {preload:true};
  *     var homePageWatcher = FileProbe.watchLoad(path, options, function(error, content) {
  *       console.log("Home page template: " + content)
  *     });
  *
  * This uses the Node.js
  * <a href="http://nodejs.org/api/all.html#all_fs_watch_filename_options_listener">```fs.watch```</a>
  * functionality if available, or the older polling mechanism if running on
  * a pre-0.6.x version of Node.js.
  *
  * When done watching, call the ```close()``` method of the returned watcher
  * object.  This releases all resources associated with file watching.
  *
  *     // Stop watching the homePage template
  *     homePageWatcher.close();
  *
  * @static
  * @method watchLoad
  * @param path {String} Path to the file
  * @param [options] {Object} File watch options
  *     @param options.encoding='utf8' {String} File encoding type.
  *     @param options.preload=false {boolean} Preload the contents, calling the callback when preloaded.
  *     @param options.persistent=false {boolean} Persistent file watching?
  * @param callback {Function (error, content)} Function called on file change (or error), and on preload if requested.
  * @return {Object} An object that contains a ```close()``` method to call when
  *     done watching.
  */
  FileProbe.watchLoad = function(path, options, callback) {

    // Process arguments
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    var defaultOpts = {encoding:'utf8', preload:false, persistent:false};
    var opts = _.extend({}, defaultOpts, options);

    // Build the function to call when the file changes
    var onFileChange = function() {
      FS.readFile(path, options.encoding, function(err, text) {
        if (err) {
          // Forward the error
          return callback(err);
        }
        // Success
        callback(null, text.toString());
      });
    };

    // Read initial file contents if requested
    if (options.preload) {
      onFileChange();
    }

    // Connect the file watcher
    return FileProbe.watch(path, options, onFileChange);
  };

  /**
  * Tail a file
  *
  * @static
  * @method tail
  * @param path {String} Path to the file
  * @param [options] {Object} File watch options
  *     @param options.encoding=UTF8 {String} File encoding type.
  * @param callback {Function (content)} Function called on change
  * @return {Object} An object that contains a ```close()``` method to call when
  *     done tailing.
  */
  FileProbe.tail = function() {
    var t = this, path = t.fullPath;

  };

  /**
  * Create a directory recursively
  *
  * This makes a directory and all nodes above it that need creating.
  *
  * @static
  * @method mkdir_r
  * @param dirname {String} Full directory path to be made
  * @param [mode=0777] {Object} Directory creation mode (see fs.mkdir)
  * @param [callback] {Function(error)} Called when complete, with possible error.
  */
  FileProbe.mkdir_r = function(dirname, mode, callback) {

    // Optional arguments
    if (typeof mode === 'function') {
      callback = mode;
      mode = null;
    }
    callback = callback || function(){};
    mode = mode || '777';

    // First attempt
    FS.mkdir(dirname, mode, function(err1) {

      // Success
      if (!err1 || err1.code === 'EEXIST') {
        return callback(null);
      }

      // Failure.  Try making parent.
      var parent = Path.dirname(dirname);
      FileProbe.mkdir_r(parent, mode, function(err2) {

        // Successful parent create.  Try child one more time.
        if (!err2) {
          return FS.mkdir(dirname, mode, callback);
        }

        // Couldn't make parent.
        callback(err2);
      });
    });
  };

  /**
  * Remove a file or directory recursively
  *
  * This is equivalent to shell rm -rf {filepath or dirpath}.
  *
  * @static
  * @method rm_rf
  * @param path {String} Path to a directory or file to remove
  * @param callback {function(error)} Function to call when done, with possible error.
  */
  FileProbe.rm_rf = function(path, callback) {

    // Get the file/dir status
    callback = callback || function(){};
    var stats = FS.lstat(path, function(err, stats){
      if (err) {
        return callback(err);
      }

      // If it's a directory, remove all files then the directory
      if (stats.isDirectory()) {

        // Read all files in the directory
        FS.readdir(path, function(err1, files) {
          if (err1) {
            return callback(err1);
          }

          // Done if no files
          if (files.length === 0) {
            return callback();
          }

          // Remove all files asynchronously
          var numLeft = files.length;
          var lastError = null;
          files.forEach(function (filename) {
            FileProbe.rm_rf(Path.join(path, filename), function(err2){
              lastError = err2 || lastError;
              if (--numLeft === 0) {
                if (lastError) {
                  return callback(lastError);
                }
                // Remove the original directory
                FS.rmdir(path, callback);
              }
            });
          });
        });
      }

      // Directly remove if it's any non-directory type
      else {
        return FS.unlink(path, callback);
      }

    });
  };

  /**
  * Set the server root path for the file probe
  *
  * For security purposes, this must be set server-side before the File probe
  * will operate.  It will not accept any changes once set.
  *
  * @static
  * @method setRootPath
  * @param rootPath {String} A path to the root directory for the FilePath probe
  */
  FileProbe.setRootPath = function(rootPath) {
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
  * For security purposes, this is not exposed in the FileProbe data model.
  *
  * @static
  * @method getRootPath
  * @return {String} The path to the root directory for the FilePath probe
  */
  FileProbe.getRootPath = function() {
    return ROOT_PATH;
  };

}(this));
