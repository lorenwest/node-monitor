// Server.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = require('monitor-min'),
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
      siteDbPath: './site_db',
      server:null,
      templates:new Template.List()
    }, Config.Monitor),

    // Initialize the server
    initialize: function(params, options) {
      var t = this,
          port = t.get('port'),
          server = t.get('server'),
          templates = t.get('templates'),
          siteDbPath = t.get('siteDbPath'),
          parentPath = siteDbPath.indexOf('.') === 0 ? process.cwd() : '';

      // Distribute the site path to probes that need it
      t.set('siteDbPath', Path.join(parentPath, siteDbPath));

      // Initialize probes
      SyncProbe.Config.defaultProbe = 'FileSync';
      SyncProbe.FileSync.setRootPath(siteDbPath);

      // Expose the current instance so probes running
      // in this process can communicate with the server
      UI.Server.currentServer = t;

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
            newPage.set({id:lowerUrl, title:title, is404page:true});
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
        var isMonitorApp = PACKAGE_JSON.dependencies && _.find(_.keys(PACKAGE_JSON.dependencies), function(keyword){ return keyword === 'monitor'; }),
            indexTemplate = isMonitorApp ? 'index-app' : 'index',
            pages = [indexTemplate, '404'],
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

      // Test an app directory to see if it's a monitor app
      var testAppDir = function(dir) {

        // Load the package.json if it exists (and remove relative refs)
        dir = Path.resolve(dir);
        try {
          var pkg = JSON.parse(FS.readFileSync(dir + '/package.json', 'utf-8'));
        } catch (e) {
          // Report an error if the package.json has a parse problem.  This is
          // good during app development to show why we didn't discover the app.
          if (e.code !== "ENOENT") {
             console.error("Problem parsing " + dir + "/package.json");
          }
          return false;
        }

        // Is this a node-monitor app?
        var isMonitorApp = pkg.dependencies && _.find(_.keys(pkg.dependencies), function(keyword){ return keyword === 'monitor'; });
        if (!isMonitorApp) {
          return false;
        }

        // This is a node-monitor app.
        return t.loadApp(dir, pkg);
      }

      // Process all apps under a node_modules directory
      var loadNodeModulesDir = function(dir) {

        // Return if the node_modules directory doesn't exist.
        try {
          FS.statSync(dir);
        } catch (e) {return;}

        // Check each direcory for a node-monitor app
        FS.readdirSync(dir).forEach(function(moduleName) {

          // See if this is a monitor app, and load if it is
          // then load sub-modules
          var moduleDir = dir + '/' + moduleName;
          if (testAppDir(moduleDir) || moduleName === 'monitor') {

            // If it is a monitor-app, process any sub node_modules
            loadNodeModulesDir(moduleDir + '/node_modules')
          }
        });
      };

      // Test this app as a monitor app
      t.thisAppName = testAppDir('.');

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
    * @param packageJson {Object} The contents of the package.json file
    */
    loadApp: function(moduleDir, packageJson) {
      var t = this,
          templates = t.get('templates');

      // Remove the -monitor portion of the app
      var appName = packageJson.name.replace(/-monitor$/,'');

      // Don't overwrite a more "locally" defined app
      if (t.apps[appName]) {
        return false;
      }

      // The app module must be found
      try {
        var resolved = require.resolve(moduleDir);
      } catch (e) {
        console.error("Problem loading plug-in: " + moduleDir, e);
        return false;
      }

      // Clear module cache for reloads
      delete require.cache[resolved];

      // Load the module
      try {
        var server = require(resolved);
      } catch (e) {
        console.error('Problem loading the "' + appName + '" module: ', e.stack);
        return false;
      }

      var views = {}, // key: view name, value: {icon:'iconfile'}
          css = [],
          images = {}, // key: basename, value: filename
          appPath = '/app/' + appName + '/';

      // Gather views to expose on the page
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
            templates.add({id:appName + '-' + base, path:moduleDir + '/view/' + filename});
          }
          if (ext.match('\\.jpg|\\.jpeg|\\.ico|\\.bmp|\\.tif|\\.tiff|\\.gif')) {
            images[base] = appPath + filename;
          }
        });
      } catch (e) {
        // No views to expose.  Maybe only exposing DB files.
      }

      // Match views to their icon image (if available)
      for (var viewName in views) {
        views[viewName] = {icon: images[viewName]};
      }

      // Record app information
      t.apps[appName] = {
        label: packageJson.label,
        description: packageJson.description,
        moduleDir: moduleDir,
        server: server,
        staticServer: Connect['static'](moduleDir + '/view'),
        views: views,
        css: css
      }

      return appName;

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

  /**
  * Route application objects to their application site_db.
  *
  * This hooks FileSync.getFullPath to return the path to the object under the app DB
  */
  process.nextTick(function(){
    var proto = Monitor.SyncProbe.FileSync.prototype;
    proto.origGetFullPath = proto.getFullPath;
    proto.getFullPath = function(modelId) {
      var t = this,
          fullPath = null;

      // Forward to the original version if not an app object
      if (modelId.indexOf('/app/') !== 0) {
        return t.origGetFullPath(modelId);
      }

      // Process an /app id
      var parts = modelId.split('/'),
          appName = parts[2],
          appDef = UI.Server.currentServer.apps[appName];

      // No app with that name.  Use original path.
      if (!appDef) {
        fullPath = t.origGetFullPath(modelId);
      }

      // Is this a known app?
      var dirPath = Path.join(appDef.moduleDir, 'site_db', t.get('className'));
      parts.splice(1,2); // remove the /app/{name}
      fullPath = Path.join(dirPath, parts.join('/') + '.json');

      // Don't allow relative paths
      if (fullPath.indexOf(dirPath) !== 0) {
        throw new Error('Model ID cannot represent a relative path');
      }

      return fullPath;
    }
  });

}(this));
