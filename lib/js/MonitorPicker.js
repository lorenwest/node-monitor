// MonitorPicker.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor'),
      UI = Monitor.UI,
      Template = UI.Template,
      Backbone = Monitor.Backbone,
      _ = Monitor._,
      mlvTemplate = null,
      lineTemplate = null,
      siteMap = null;

  /**
  * Utility classes for obtaining monitor host/probe info.
  *
  * @class MonitorPicker
  */
  var MonitorPicker = UI.MonitorPicker = Backbone.View.extend({
  });

  /**
  * Get a monitor to the SiteMap probe.
  *
  * This may or may not be connected upon return from this function.
  *
  * @class MonitorPicker.getSiteMap()
  * @return {Monitor} A Monitor to the SiteMap probe
  */
  MonitorPicker.getSiteMap = function() {
    if (!siteMap) {
      siteMap = new Monitor({
        probeClass:'SiteMap'
      });

      // Convert the 'localhost' entry into the correctly named host,
      // and make sure it's at the top of the object.
      siteMap.on('change', function(){
        var map = siteMap.get('map'),
            newMap = {},
            host = window.location.hostname;
        if (host === 'localhost') {return;}
        newMap[host] = map.localhost;
        _.extend(newMap, map);
        delete newMap.localhost;
        siteMap.set({map: newMap}, {silent:true});
      });

      // Now connect
      siteMap.connect();
    }
    return siteMap;
  };

  /**
  * View for the server component of a montior
  *
  * @class MonitorPicker.ServerView
  * @extends Backbone.View
  * @constructor
  */
  var ServerView = MonitorPicker.ServerView = Backbone.View.extend({

    initialize: function(){
      var t = this;

      // Preload the site map for edit
      if (!siteMap) {
        MonitorPicker.getSiteMap();
      }

      // Re-render the view on model change
      t.model.on('change', t.render, t);

    },

    remove: function(){
      var t = this;
      t.model.off('change', t.render, t);
      return Backbone.View.prototype.remove.apply(t);
    },

    events: {
      'click'   :  'edit'
    },

    render: function() {
      var t = this;
      t.$el.text(t.model.toServerString());
      UI.DropDownMenu.addCaret(t.$el);
    },

    edit: function() {
      var t = this,
          siteMap = MonitorPicker.getSiteMap(),
          map = siteMap.get('map'),
          id = 0,
          servers = [],
          hostName, host, displayHost, appName, app, i, server;

      // Build the list of all servers for the dropdown
      // See the SiteMap probe for the site map layout
      for (hostName in map) {
        if (map.hasOwnProperty(hostName)) {
          host = map[hostName];
          for (appName in host) {
            if (host.hasOwnProperty(appName)) {
              app = host[appName];
              for (i = 0; i < app.instances; i++) {
                server = {
                  id: id++,
                  hostName: hostName,
                  appName: appName
                };
                if (app.instances > 1) {
                  server.appInstance = i;
                }
                servers.push(server);
              }
            }
          }
        }
      }

      // Get a string representation of the proposed server
      var makeString = function(server) {
        return Monitor.toServerString(server);
      };

      // Open the dropdown with the collection
      var dropDown = new UI.DropDownMenu({
        contextEl: t.$el,
        model: servers,
        makeString: makeString
      });
      dropDown.on('select', function(server) {
        t.model.set({
          hostName: server.hostName,
          appName: server.appName,
          appInstance: server.appInstance || 0
        });
      }).render();

    }

  });

  /**
  * View for the probe component of a montior
  *
  * @class MonitorPicker.ProbeView
  * @extends Backbone.View
  * @constructor
  */
  var ProbeView = MonitorPicker.ProbeView = Backbone.View.extend({

    initialize: function(){
      var t = this;
      t.model.on('change:probeClass', t.render, t);

      // Preload the site map for faster edit
      if (!siteMap) {
        MonitorPicker.getSiteMap();
      }
    },

    remove: function(){
      var t = this;
      t.model.off('change:probeClass', t.render, t);
      return Backbone.View.prototype.remove.apply(t);
    },

    events: {
      'click'   :  'edit'
    },

    render: function() {
      var t = this;
      t.$el.text(t.model.get('probeClass'));
      UI.DropDownMenu.addCaret(t.$el);
    },

    edit: function() {
      var t = this,
          siteMap = MonitorPicker.getSiteMap(),
          map = siteMap.get('map'),
          hostName = t.model.get('hostName'),
          appName = t.model.get('appName');

      // Build the list of probes for this server
      var probes = map[hostName][appName].probeClasses;

      // Open the dropdown with the collection
      var dropDown = new UI.DropDownMenu({
        contextEl: t.$el,
        model: probes
      });
      dropDown.on('select', function(probe) {
        t.model.set({probeClass: probe});
      }).render();

    }

  });

  /**
  * View for the initParams component of a montior
  *
  * @class MonitorPicker.InitParamsView
  * @extends Backbone.View
  * @constructor
  */
  var InitParamsView = MonitorPicker.InitParamsView = Backbone.View.extend({

    initialize: function(){
      var t = this;
      t.model.on('change', t.render, t);
    },

    remove: function(){
      var t = this;
      t.model.off('change', t.render, t);
      return Backbone.View.prototype.remove.apply(t);
    },

    events: {
      'click'   :  'edit'
    },

    render: function() {
      var t = this;
          val = JSON.stringify(t.model.get('initParams'));
      t.$el.text(val);
    },

    edit: function() {
      var t = this;
    }

  });

}(this));
