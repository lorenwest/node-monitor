// Server.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading
  var Monitor = require('monitor'),
      UI = Monitor.UI,
      Backbone = Monitor.Backbone,
      _ = Monitor._,
      $ = UI.$,
      SyncProbe = Monitor.SyncProbe,
      Mustache = UI.Mustache,
      Component = UI.Component,
      Page = UI.Page,
      pageCache = new Page.List(),
      Site = UI.Site,
      Connect = require('connect'),
      Config = require('config'),
      GruntConfig = require('../../grunt'),
      FS = require('fs'),
      OS = require('os'),
      Path = require('path'),
      Template = UI.Template;

  // Constants
  var PAGE_PARAMS = {},
      CSS_TEMPLATE   = Mustache.compile('\n    <link rel="stylesheet" type="text/css" href="{{{cssFile}}}">'),
      JS_TEMPLATE    = Mustache.compile('\n    <script type="text/javascript" src="{{{scriptFile}}}"></script>'),
      TMPL_TEMPLATE  = Mustache.compile('\n      <div id="nm-template-{{id}}">\n{{{text}}}      </div>'),
      PACKAGE_JSON   = JSON.parse(FS.readFileSync(__dirname + '/../../package.json'));

  // Initialize the default sync probe
  SyncProbe.Config.defaultProbe = 'FileSync';
  SyncProbe.FileSync.setRootPath(__dirname + '/../../site_db');

  /**
  * Server side support for the monitor UI.
  *
  * @module Server
  */

  /**
  * Monitor User Interface Server
  *
  * Instances of this class build a UI server listening on a port.  The server
  * is created and set up during object initialization.
  *
  * @class Server
  * @extends Backbone.Model
  * @constructor
  * @param model - Initial data model.  Can be a JS object or another Model
  *   @param [model.port=4200] {Number} The server listens on this port
  *   @param [model.allowExtrnalConnections=false] {boolean} Allow connections
  *     from host processes outside this machine?
  *   @param [model.server] {ConnectServer} A custom connect or express server
  *   @param [model.templates] {Template.List} List of templates available to the server
  */
  var Server = UI.Server = Backbone.Model.extend({

    defaults: _.extend({
      port:4200,
      allowExternalConnections: false,
      server:null,
      templates:new Template.List()
    }, Config.MonitorUI),

    // Initialize the server
    initialize: function(params, options) {
      var t = this,
          port = t.get('port'),
          server = t.get('server'),
          templates = t.get('templates');

      // Internal (non-model) attributes
      t.apps = {};  // Hash appName -> app data
      t.site = null;   // Site model associated with the server

      // Create a connect server if no custom server was specified
      if (!server) {
        server = new Connect();
        t.set({server: server});
      }

      // Attach server components
      server.use(t.siteRoute.bind(t));
      server.use(Connect['static'](__dirname + '/../..'));

      // Initialize the template library
      GruntConfig.MODULE_DEF.templates.forEach(function(template){
        var path = Path.normalize(__dirname + '/../../' + template);
        var id = Path.basename(path, '.html');
        templates.add({id:id, path:path});
      });

      // Build the page parameters from the config file
      var styles = "", scripts="";
      GruntConfig.MODULE_DEF.client_css.forEach(function(cssFile) {
        styles += CSS_TEMPLATE({cssFile: cssFile.replace('lib/','/static/')});
      });
      GruntConfig.MODULE_DEF.client_ext.forEach(function(scriptFile) {
        scripts += JS_TEMPLATE({scriptFile: scriptFile.replace('lib/','/static/')});
      });
      GruntConfig.MODULE_DEF.client_js.forEach(function(scriptFile) {
        scripts += JS_TEMPLATE({scriptFile: scriptFile.replace('lib/','/static/')});
      });
      _.extend(PAGE_PARAMS, {
        styles: styles, scripts: scripts, version: PACKAGE_JSON.version
      });

    },

    /**
    * Internal route for all non-static site endpoints
    *
    * @method siteRoute
    * @param request {Connect.Request} The http request object
    * @param response {Connect.Response} The http response object
    * @param next {Function()} Function to pass control if this doesn't handle the url.
    */
    siteRoute: function(request, response, next) {
      var t = this;

      // URL rewrites
      var url = Path.normalize(request.url);
      if (url === '' || url === '/') {
        url = request.url = '/index';
      }
      if (url === '/favicon.ico') {
        var faviconUrl = t.site.get('favicon');
        url = request.url = faviconUrl || request.url;
      }

      // Redirect without the trailing slash
      if (url.substr(-1) === '/') {
        response.writeHead(302, {Location: url.substr(0, url.length - 1)});
        return response.end();
      }

      // Remove the leading slash for page manipulation
      url = url.substr(1);

      // Rewrite the url and forward if it points to static content
      var urlParts = url.split('/');
      if (urlParts[0] === 'static') {
        if (urlParts[1] === 'node_modules') {
          request.url = request.url.substr(7);
        } else {
          request.url = '/lib/' + request.url.substr(7);
        }
        return next();
      }

      // If it's an URL to an app, route to the app
      if (urlParts[0] === 'app') {
        var appName = urlParts[1],
            app = t.apps[appName];

        // Route to a monitor page if the app doesn't handle the request
        var appNext = function() {
          t._monitorPageRoute(request, response, next);
        }

        // Continue if the app isn't defined
        if (!app) {
          return appNext();
        }

        // Make the app request relative to the app
        var appUrl = '/' + url.split('/').slice(2).join('/'),
            appRequest = _.extend({}, request, {url: appUrl});

        // Forward the request to the app server
        var server = typeof app.server === 'function' ? app.server : app.staticServer;
        return server(appRequest, response, appNext);
      }

      // Forward to a monitor page
      t._monitorPageRoute(request, response, next);
    },

    /**
    * Route to a monitor page.
    *
    * @param request {Connect.Request} The http request object
    * @param response {Connect.Response} The http response object
    * @param next {Function()} Function to pass control if this doesn't handle the url.
    */
    _monitorPageRoute: function(request, response, next) {
      var t = this,
          url = request.url,
          searchStart = url.indexOf('?'),
          templates = t.get('templates');

      // Remove any URL params
      if (searchStart > 0) {
        url = url.substr(0, searchStart);
      }

      // Get the page model
      t._getPage(url, function(error, pageModel) {

        if (error) {
          return response.end('page error: ' + JSON.stringify(error));
        }

        // Build the object to put into the page template
        var page = _.extend({templates:''}, PAGE_PARAMS, t.site.toJSON(), pageModel.toJSON());
        page.pageParams = Template.indent(JSON.stringify(pageModel.toJSON({deep:true,trim:true}), null, 2), 8);

        // Add all watched templates except the main page
        templates.each(function(template) {
          if (template.id !== 'MonitorUI') {
            page.templates += TMPL_TEMPLATE({
              id:template.id,
              text:Template.indent(template.get('text'),8)
            });
          }
        });

        // Output the page
        response.writeHead(200, {'Content-Type': 'text/html'});
        var pageTemplate = templates.get('MonitorUI');
        return response.end(pageTemplate.apply(page));
      });
    },

    /**
    * Get the specified page from cache
    *
    * This retrieves the page from cache, or puts it there.
    *
    * @method _getPage
    * @param url {url} URL to the page
    * @param callback {function(error, pageModel)} Called when complete
    */
    _getPage: function(url, callback) {
      var t = this,
          page = null,
          lowerUrl = url.toLowerCase();

      // Return if it's in cache
      page = pageCache.get(lowerUrl);
      if (page) {
        return callback(null, page);
      }

      // Read from storage
      page = new Page({id: lowerUrl});
      page.fetch({liveSync: true}, function(error) {

        // Process a 404.  This returns a transient page copied from
        // the default 404 page, with the id replaced by the specified url.
        if (error && error.code === 'NOTFOUND' && url !== '404') {
          t._getPage('404', function(error, page404) {
            if (error) {
              console.error("Error loading the 404 page", error);
              return callback('404 page load error');
            }

            // Copy the 404 page into a new page
            var newPage = new Page(JSON.parse(JSON.stringify(page404)));
            var title = $.titleCase(url.split('/').pop(), true);
            newPage.set({id:lowerUrl, title:title});
            callback(null, newPage);
          });
          return;
        }

        // Process other errors
        if (error) {
          return callback(error);
        }

        // Assure the page model ID is correct on disk
        if (lowerUrl !== page.get('id').toLowerCase()) {
          page.set('id', url);
        }

        // Put the page into cache and return it
        pageCache.add(page);
        return callback(null, page);
      });
    },

    /**
    * Start the UI server
    *
    * This method starts listening for incoming UI requests.
    *
    * @method start
    * @param [callback] {Function(error)} - Called when the server has started
    */
    /**
    * The server has started
    *
    * This event is fired when the server has begun listening for incoming
    * web requests.
    *
    * @event start
    */
    /**
    * A client error has been detected
    *
    * This event is fired if an error has been detected in the underlying
    * transport.  It may indicate message loss.
    *
    * @event error
    */
    start: function(callback) {
      callback = callback || function(){};
      var t = this,
          server = t.get('server'),
          port = t.get('port'),
          allowExternalConnections = t.get('allowExternalConnections');

      // Allow connections from INADDR_ANY or LOCALHOST only
      var host = allowExternalConnections ? '0.0.0.0' : '127.0.0.1';

      // Start listening
      server.listen(port, host, function(){

        // Allow the UI server to be a Monitor gateway server
        t.monitorServer = new Monitor.Server({server:server, gateway: true});
        t.monitorServer.start(function(){

          // Called after the site object is loaded
          var onSiteLoad = function(error) {
            if (error) {
              return callback(error);
            }

            // Discover and initialize application modules
            t.loadApps();

            // Bind server events
            t._bindEvents(callback);
          };

          // Load and keep the web site object updated
          t.site = new Site();
          t.site.fetch({liveSync: true}, function(error) {

            // Initialize the site if it's not found
            if (error && error.code === 'NOTFOUND') {
              return t._initializeSite(onSiteLoad);
            } else if (error) {
              return onSiteLoad(error);
            }

            // Bind server events once connected
            onSiteLoad();
          });
        });
      });
    },

    /**
    * Bind incoming socket events to the server
    *
    * @protected
    * @method _bindEvents
    * @param callback {Function(error)} - Called when all events are bound
    */
    _bindEvents: function(callback) {

      // Detect server errors
      var t = this, server = t.get('server');
      server.on('clientError', function(err){
        console.error('Client error detected on server', err);
        t.trigger('error', err);
      });
      server.on('close', function(err){
        server.hasEmittedClose = true;
        t.stop();
      });

      // Notify that we've started
      t.isListening = true;
      if (callback) {
        callback(null);
      }
      t.trigger('start');
    },

    /**
    * Initialize the node_monitor web site
    *
    * This is called when the Site object isn't found.  It creates the Site
    * object, and all baseline site pages.
    *
    *
    * @protected
    * @method _initializeSite
    * @param callback {Function(error)} - Called when initialized (or error)
    */
    _initializeSite: function(callback) {

      // Create and persist a default Site object
      var t = this;
      t.site = new Site();
      t.site.id = null;  // This causes a create vs. update on save
      t.site.save({}, {liveSync: true}, function(error) {
        if (error) {
          return callback(error);
        }

        // Create the common site pages from templates
        var pages = ['index', '404', 'app'],
            numLeft = pages.length,
            errors = [];

        // Called when each page is done
        function whenDone(error) {
          if (error) {
            errors.push(error);
          }
          if (--numLeft === 0) {
            callback(errors.length ? errors : null);
          }
        }

        // Load each internal page
        pages.forEach(function(page) {
          var tmpl = new Template({path: __dirname + '/../template/' + page + '.json'});
          try {
            var parsed = JSON.parse(tmpl.get('text'));
          } catch (e) {
            console.error('JSON error reading page template: ' + page + '.json');
            process.exit(1);
          }
          var model = new Page(parsed);
          model.save(whenDone);
        });
      });
    },

    /**
    * Discover and load all node_monitor application modules
    *
    * This is designed to run during server initialization, and is synchronous.
    *
    * @method loadApps
    */
    loadApps: function() {
      var t = this;

      // See if this node_modules directory exists, and process if it does
      var loadNodeModulesDir = function(dir) {

        // Return if the specified node_modules directory doesn't exist.
        try {
          FS.statSync(dir);
        } catch (e) {return;}

        // Get all directories under node_modules
        var dirs = FS.readdirSync(dir);
        dirs.forEach(function(moduleName) {

          // Load the package.json if it exists
          var moduleDir = dir + '/' + moduleName;
          try {
            var pkg = JSON.parse(FS.readFileSync(moduleDir + '/package.json', 'utf-8'));
          } catch (e) {return;}

          // Is this a node_monitor app?
          var isMonitorUIApp = pkg.keywords && _.find(pkg.keywords, function(keyword){ return keyword === 'node_monitor'; });
          if (!isMonitorUIApp) {
            return;
          }

          // Load any dependent node-modules
          loadNodeModulesDir(moduleDir + '/node_modules')

          // Load the app
          t.loadApp(moduleDir);
        });
      };

      // Process all possible node_module directories in the require path.
      process.mainModule.paths.forEach(loadNodeModulesDir);

    },

    /**
    * Load the specified app
    *
    * This is designed to run during server initialization, and is synchronous.
    *
    * @method loadApp
    * @param moduleDir {String} The module directory that contains package.json
    */
    loadApp: function(moduleDir) {
      var t = this,
          templates = t.get('templates');

      // Get the app name from the package.json file
      try {
        var packageJson = JSON.parse(FS.readFileSync(moduleDir + '/package.json', 'utf-8'));
        var appName = packageJson.name;

        // Remove the 'nm-' or 'nm_' module prefix
        var shortName = appName.replace(/^nm[-_]/,'');
      } catch (e) {
        console.error("Problem loading package.json from plug-in: " + moduleDir, e);
        return;
      }

      // The app module must be found
      try {
        var resolved = require.resolve(moduleDir);
      } catch (e) {
        console.error("Problem loading plug-in: " + moduleDir, e);
        return;
      }

      // Clear module cache for reloads
      delete require.cache[resolved];

      // Load the module
      try {
        var server = require(moduleDir);
      } catch (e) {
        console.error('Problem loading the "' + appName + '" module: ', e.stack);
        return;
      }

      var views = {}; // key: view name, value: {icon:'iconfile'}
      var css = [];
      var images = {}; // key: basename, value: filename
      var appPath = '/app/' + shortName + '/';

      // Gather assets to expose on the page
      try {
        FS.readdirSync(moduleDir + '/view').forEach(function(filename) {
          var ext = Path.extname(filename).toLowerCase();
          var base = Path.basename(filename, ext);
          if (ext === '.js') {
            views[base] = '';
            PAGE_PARAMS.scripts += JS_TEMPLATE({scriptFile: appPath + filename});
          }
          if (ext === '.css') {
            css.push(filename);
            PAGE_PARAMS.styles += CSS_TEMPLATE({cssFile: appPath + filename});
          }
          if (ext === '.html') {
            templates.add({id:shortName + '-' + base, path:moduleDir + '/view/' + filename});
          }
          if (ext.match('\\.jpg|\\.jpeg|\\.ico|\\.bmp|\\.tif|\\.tiff|\\.gif')) {
            images[base] = appPath + filename;
          }
        });
      } catch (e) {
        // No assets to expose
        return;
      }

      // Match views to their icon image (if available)
      for (var viewName in views) {
        views[viewName] = {icon: images[viewName]};
      }

      // Make the Page/app directory to store app databases
      var appDbDir = Path.normalize(__dirname + '/../../site_db/Page/app/');
      var moduleDbPath = moduleDir + '/page';

      // Make the app DB directory
      try {
        FS.mkdirSync(appDbDir);
      } catch (e) {
        if (e.code !== 'EEXIST') {
          console.error('Cannot create site_db/Page/app directory', e);
        }
      }

      // Make a symbolic link to the app page db
      try {
        // Will throw ENOENT if not there
        FS.statSync(moduleDbPath);
        // Will throw EEXIST if already linked
        FS.symlinkSync(moduleDbPath, appDbDir + shortName, 'dir');
      } catch (e) {
        if (e.code !== 'ENOENT' && e.code !== 'EEXIST') {
          console.error('Cannot link page DB for app: ' + shortName, e);
        }
      }

      // Record app information
      t.apps[shortName] = {
        moduleDir: moduleDir,
        server: server,
        staticServer: Connect['static'](moduleDir + '/view'),
        views: views,
        css: css
      }

    },

    /**
    * Stop processing inbound web and monitor traffic
    *
    * This method stops accepting new inbound monitor connections, and closes
    * all existing monitor connections associated with the server.
    *
    * @method stop
    * @param callback {Function(error)} - Called when the server has stopped
    */
    /**
    * The server has stopped
    *
    * This event is fired after the server has stopped accepting inbound
    * connections, and has closed all existing connections and released
    * associated resources.
    *
    * @event stop
    */
    stop: function(callback) {
      var t = this, server = t.get('server');
      callback = callback || function(){};

      // Unwatch all template files
      t.get('templates').forEach(function(template) {
        template.unWatchFile();
      });

      // Don't stop more than once.
      if (!t.isListening) {
        return callback();
      }

      // Shut down the server
      t.isListening = false;
      t.monitorServer.stop(function(error) {
        if (!error) {
          // Disregard close exception
          try {
            server.close();
          } catch (e) {}
          t.trigger('stop');
        }
        return callback(error);
      });
    }
  });

  /**
  * Constructor for a list of Server objects
  *
  *     var myList = new Server.List(initialElements);
  *
  * @static
  * @method List
  * @param [items] {Array} Initial list items.  These can be raw JS objects or Server data model objects.
  * @return {Backbone.Collection} Collection of Server data model objects
  */
  Server.List = Backbone.Collection.extend({model: Server});

}(this));
