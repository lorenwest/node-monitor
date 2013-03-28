// ToursProbe.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('monitor-min'),
      _ = Monitor._,
      UI = Monitor.UI,
      Path = require('path'),
      FS = require('fs'),
      TreeProbe = Monitor.TreeProbe,
      FileProbe = Monitor.FileProbe;

  var ROOT_PATH = Path.resolve(process.cwd() + '/site_db/Tour');

  /**
  * This probe represents the list of tours available on the site
  *
  * @abstract
  * @class ToursProbe
  * @extends TreeProbe
  * @constructor
  * @param [initParams] - Probe initialization parameters
  *     @param [initParams.path=''] {String} Path to this node
  */
  var ToursProbe = Monitor.ToursProbe = TreeProbe.extend({

    probeClass: 'ToursProbe',

    /**
    * Constructor initialization.
    *
    * @method initialize
    */
    initialize: function(attributes, options){
      var t = this;
      t.fileWatchers = {};

      // Call parent constructor
      TreeProbe.prototype.initialize.apply(t, arguments);

      // Assume callback responsibility.
      options.asyncInit = true;
      var callback = options.callback;

      // Build the full path to the directory, possibly routed to an app DB
      var path = t.get('path'),
          parts = path.replace(/^\//,'').split('/');
      var appName = parts[0] === 'app' ? parts[1] : null;
      if (appName && UI.Server.currentServer.apps[appName]) {

        // Build the dirPath from the module DB
        var appDef = UI.Server.currentServer.apps[appName];
        parts.splice(0,2);
        t.dirPath = Path.join(appDef.moduleDir + '/site_db/Tour', parts.join('/'));
      }
      else {

        // Normal path - under the site_db/Page directory
        t.dirPath = Path.join(ROOT_PATH, path);
      }

      // Make sure the directory exists
      FileProbe.mkdir_r(t.dirPath, function(error) {
        if (error) {
          return callback(error);
        }

        // Watch the directory for changes
        t.dirWatcher = FS.watch(t.dirPath, {persistent:false}, function(type){
          t.sync();
        });

        // Synchronize this object with the directory.
        t.sync(callback);
      });

    },

    /**
    * Release probe resources
    */
    release: function() {
      if (t.dirWatcher) {
        t.dirWatcher.close();
        t.dirWatcher = null;
      }
      for (var pageId in t.fileWatchers) {
        t.fileWatchers[pageId].close();
      }
      t.fileWatchers = {};
    },

    /**
    * Synchronize the directory with this object
    *
    * @method sync
    * @param callback {Function} Callback to call when complete
    *     @param callback.error {Mixed} Set if anything goes wrong
    */
    sync: function(callback) {
      var t = this,
          dirs = [],
          pages = [];
      callback = callback || function(){};

      // Synchronize the virtual /app directory
      if (t.get('path') === '/app') {
        for (var appName in UI.Server.currentServer.apps) {
          var app = UI.Server.currentServer.apps[appName];
          dirs.push({
            id: appName,
            label: app.label || app.description || appName
          });
        }
        t.set({
          leaves: pages,
          branches: dirs
        });
        return callback();
      }

      // Get the directory at this level
      FS.readdir(t.dirPath, function(error, fileNames) {

        // Process errors
        if (error) {
          console.error('ToursProbe readdir error', error);
          return callback(error);
        }

        // Perform a stat on all files for meta-info
        t.statFiles(fileNames, function(error, fileStats) {

          // Process errors
          if (error) {
            console.error('ToursProbe statFiles error', error);
            return callback(error);
          }

          // Process each file, recording directories and pages
          for (var i = 0, l = fileStats.length; i < l; i++) {
            var name = fileNames[i],
                stat = fileStats[i],
                id = Path.basename(name, '.json'),
                page = {id:id};

            if (stat.isDirectory()) {
              dirs.push(page);
            }
            else if (stat.isFile() && Path.extname(name).toLowerCase() === '.json') {
              pages.push(page);
            }
            else {
              console.error('Not a file or directory: ' + name);
            }
          }

          // Read each page for the display label and description
          t.readPages(pages, function(error) {

            // Process errors
            if (error) {
              console.error('ToursProbe readPages error', error);
              return callback(error);
            }

            // Add the virtual /app directory to the root
            if (t.dirPath === ROOT_PATH) {
              dirs.push({id:'app', label:'App Tours', description:'Application tours'});
            }

            // Now merge changes in tree branches and leaves
            t.set({
              leaves: pages,
              branches: dirs
            });

            // We're done (sheesh, finally...)
            return callback(null);
          });

        });
      });

    },

    /**
    * Stat all the files, returning an array of file stats matching the
    * array of input files.
    *
    * @method statFiles
    * @param fileNames {Array} An array of filenames to stat (from this directory)
    * @param callback {Function(error, stats)}
    *     @param callback.error {Mixed} Set if an error occured
    *     @param callback.stats {Array of Stat} An array of fs.stats objects
    */
    statFiles: function(fileNames, callback) {
      var t = this,
          stats = [],
          didError = false,
          numLeft = fileNames.length;

      // No files to process
      if (fileNames.length === 0) {
        return callback(null, stats);
      }

      // Call stat on each file
      fileNames.forEach(function(fileName, index) {
        var fullPath = Path.join(t.dirPath, fileName);
        FS.stat(fullPath, function(error, stat) {

          // Process a stat error
          if (error) {
            didError = true;
            return callback(error);
          }

          // Do nothing if a prior error callback happened
          if (didError) {
            return;
          }

          // Set this stat item
          stats[index] = stat;

          // Callback if all stats are complete
          if (--numLeft === 0) {
            callback(null, stats);
          }
        });
      });

    },

    /**
    * Add title (label) and description to the specified page objects.
    *
    * @method readPages
    * @param pages {Array of Object} An array of objects with the id element set
    * @param callback {Function(error)}
    */
    readPages: function(pages, callback) {
      var t = this,
          didError = false,
          numLeft = pages.length;

      // Callback early if no pages to read
      if (pages.length === 0) {
        return callback();
      }

      // Read and parse each file for the title/description
      pages.forEach(function(page, index) {

        // Read the file
        var fullPath = Path.join(t.dirPath, page.id + '.json');
        FS.readFile(fullPath, 'utf8', function(error, file) {

          // Process a stat error
          if (error) {
            didError = true;
            return callback(error);
          }

          // Parse the JSON
          try {
            var parsed = JSON.parse(file);
          }
          catch (e) {
            didError = true;
            console.error('JSON error parsing page: ' + fullPath, e);
            return callback(e);
          }

          // Do nothing if a prior error callback happened
          if (didError) {
            return;
          }

          // Set the page title and description
          if (parsed.title) {
            page.label = parsed.title;
          }
          if (parsed.description) {
            page.description = parsed.description;
          }

          // Add a file watcher if not already watching
          if (!t.fileWatchers[page.id]) {
            t.fileWatchers[page.id] = new FS.watch(fullPath, {persistent:false}, function(type){
              t.sync()
            });
          }

          // Callback if all page reads are complete
          if (--numLeft === 0) {
            callback(null);
          }
        });
      });
    }

  });

}(this));
