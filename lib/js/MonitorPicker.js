// MonitorPicker.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor-min'),
      Probe = Monitor.Probe,
      UI = Monitor.UI,
      Template = UI.Template,
      Backbone = Monitor.Backbone,
      _ = Monitor._,
      mlvTemplate = null,
      lineTemplate = null,
      networkMap = null;

  // Constants
  var STR_NEW_SERVER = 'Add a server...';

  /**
  * Utility classes for obtaining monitor host/probe info.
  *
  * @class MonitorPicker
  * @constructor
  * @param options {Object} View options
  *     @param options.model {Monitor} The monitor data model to bind to
  *     @param [options.hideServer=false] {Boolean} Hide the server field?
  *     @param [options.hideProbe=false] {Boolean} Hide the probeClass field?
  *     @param [options.hideParams=false] {Boolean} Hide the initParams field?
  */
  var MonitorPicker = UI.MonitorPicker = Backbone.View.extend({

    initialize: function(options) {
      var t = this;

      // TODO: Re-enable initParams
      t.options.hideParams = true;
    },

    render: function() {
      var t = this;
      t.$el.html(
        '<div class="nm-mp clearfix">' +
          '<div class="nm-mp-input server">' +
            '<label>Server</label>' +
            '<div class="nm-mp-server"></div>' +
          '</div>' +
          '<div class="nm-mp-input probe">' +
            '<label>Probe</label>' +
            '<div class="nm-mp-probe"></div>' +
          '</div>' +
          '<div class="nm-mp-input params">' +
            '<label>Init Params</label>' +
            '<div class="nm-mp-params"></div>' +
          '</div>' +
        '</div>'
      );

      // Connect sub-views or hide the section
      if (t.options.hideServer) {
        t.$('.server').hide();
      } else {
        t.serverView = (new ServerView({
          el:t.$('.nm-mp-server'),
          model: t.model
        })).render();
      }
      if (t.options.hideProbe) {
        t.$('.probe').hide();
      } else {
        t.probeView = (new ProbeView({
          el:t.$('.nm-mp-probe'),
          model: t.model
        })).render();
      }
      if (t.options.hideParams) {
        t.$('.params').hide();
      } else {
        t.paramsView = (new ParamsView({
          el:t.$('.nm-mp-params'),
          model: t.model
        })).render();
      }
    },

    remove: function(){
      var t = this;
      if (t.serverView) {
        t.serverView.remove();
      }
      if (t.probeView) {
        t.probeView.remove();
      }
      if (t.paramsView) {
        t.paramsView.remove();
      }
      return Backbone.View.prototype.remove.apply(t);
    },

  });

  /**
  * Get a monitor to the NetworkMap probe.
  *
  * This may or may not be connected upon return from this function.
  *
  * @class MonitorPicker.getNetworkMap()
  * @return {Monitor} A Monitor to the NetworkMap probe
  */
  MonitorPicker.getNetworkMap = function() {
    if (!networkMap) {
      networkMap = new Monitor({
        probeClass:'NetworkMap'
      });

      // Process a site map change
      networkMap.on('connect change', function(){
        var map = networkMap.get('map'),
            newMap = {},
            host = window.location.hostname;

        // Add the 'no host' entry for local probes
        newMap[''] = {};
        newMap[''][''] = {
          instances: ['1'],
          probeClasses: _.keys(Probe.classes)
        };

        // Convert the 'localhost' entry into the correctly named host,
        // and make sure it's at the top of the object.
        if (host !== 'localhost') {
          newMap[host] = map.localhost;
          delete map.localhost;
        }

        // Silently set changes
        _.extend(newMap, map);
        networkMap.set({map: newMap}, {silent:true});
      });

      // Now connect
      networkMap.connect();
    }
    return networkMap;
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
      t.networkMap = MonitorPicker.getNetworkMap();

      // Re-render the view on model change
      t.model.on('change:hostName change:hostApp change:appInstance change:probeClass', t.render, t);
    },

    render: function() {
      var t = this;
      t.$el.html('<select></select>');

      // Fill the dropdown options once known
      if (t.networkMap.isConnected()) {
        t.fillDropdown();
      } else {
        t.networkMap.on('connect', t.fillDropdown, t);

        // Fill the initial dropdown text
        // (while we're waiting for the site map to connect)
        t.$('select').append('<option>' + t.model.toServerString() + '</option>');
      }
    },

    events: {
      'change select':  'onSelect'
    },

    onSelect: function(e) {
      var t = this,
          value = e.currentTarget.value,
          select = t.$('select');

      // Add a server?
      if (value === STR_NEW_SERVER) {
        alert("Add a server dialog...");
        select.val('');
      }

      // Find the server
      var server = t.findServer(value);

      // Set the monitor fields
      t.model.set({
        hostName: server.hostName,
        appName: server.appName,
        appInstance: server.appInstance
      });

    },

    fillDropdown: function() {
      var t = this,
          monitorTitle = t.model.toServerString(),
          monitorInMap = monitorTitle == '',
          map = t.networkMap.get('map'),
          select = t.$('select'),
          hostName, host, displayHost, appName, app, i, server;

      // Create the array of known servers
      t.servers = [];

      // Clear any prior elements
      select.html('');

      // We're done watching for connect events
      t.networkMap.off('connect', t.fillDropdown, t);

      // Build the list of all servers for the dropdown
      // See the NetworkMap probe for the site map layout
      for (hostName in map) {
        if (map.hasOwnProperty(hostName)) {
          host = map[hostName];
          for (appName in host) {
            if (host.hasOwnProperty(appName)) {
              app = host[appName];
              for (i = 0; i < app.instances.length; i++) {
                server = {
                  hostName: hostName,
                  appName: appName,
                  appInstance: app.instances[i]
                };
                server.title = Monitor.toServerString(server);
                if (monitorTitle == server.title) {
                  monitorInMap = true;
                }
                t.servers.push(server);
              }
            }
          }
        }
      }

      // If the monitor isn't in the map, add a map entry for it
      if (!monitorInMap) {
        t.servers.splice(1, null, t.model.toMonitorJSON());
        t.servers[1].title = monitorTitle;
      }

      // Fill the items
      t.servers.forEach(function(server) {
        var selected = server.title == monitorTitle;
        select.append(
          '<option' + (selected ? ' selected="selected"' : '') + '>'
          + server.title + '</option>');
      });

      // Add the 'new server' option
      // TODO
      // select.append('<option>' + STR_NEW_SERVER + '</option>');
    },

    findServer: function(title) {
      var t = this,
          found = null;
      t.servers.forEach(function(server){
        if (server.title === title) {
          found = server;
        }
      });

      // No server found.  Default to the no-server element
      return found || t.servers[0];
    },

    remove: function(){
      var t = this;
      t.model.off('change:hostName change:hostApp change:appInstance change:probeClass', t.render, t);
      return Backbone.View.prototype.remove.apply(t);
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
      t.networkMap = MonitorPicker.getNetworkMap();

      // Re-render the view on model change
      t.model.on('change:hostName change:hostApp change:appInstance change:probeClass', t.render, t);
    },

    render: function() {
      var t = this;
      t.$el.html('<select></select>');

      // Fill the dropdown options once known
      if (t.networkMap.isConnected()) {
        t.fillDropdown();
      } else {
        t.networkMap.on('connect', t.fillDropdown, t);
      }
    },

    events: {
      'change select':  'onSelect'
    },

    onSelect: function(e) {
      var t = this,
          value = e.currentTarget.value;

      // Set the monitor fields
      t.model.set('probeClass', value);
    },

    fillDropdown: function() {
      var t = this,
          select = t.$('select');
          map = t.networkMap.get('map'),
          hostName = t.model.get('hostName'),
          appName = t.model.get('appName'),
          probeClass = t.model.get('probeClass');

      // We're done watching for change events
      t.networkMap.off('connect', t.fillDropdown, t);

      // Clear any prior elements
      select.html('');

      // If the host/app isn't in the map, we're done
      if (!map[hostName] || !map[hostName][appName]) {
        return;
      }

      // Get the list of available probe classes
      t.probes = map[hostName][appName].probeClasses;

      // Add the blank entry
      select.append('<option></option>');

      // Fill the known probes
      t.probes.forEach(function(probe) {
        var selected = probe == probeClass;
        select.append(
          '<option' + (selected ? ' selected="selected"' : '') + '>'
          + probe + '</option>');
      });

    },

    remove: function(){
      var t = this;
      t.model.on('change:hostName change:hostApp change:appInstance change:probeClass', t.render, t);
      return Backbone.View.prototype.remove.apply(t);
    }

  });

  /**
  * View for the initParams component of a montior
  *
  * @class MonitorPicker.ParamsView
  * @extends Backbone.View
  * @constructor
  */
  var ParamsView = MonitorPicker.ParamsView = Backbone.View.extend({

    initialize: function(){
      var t = this;
    },

    remove: function(){
      var t = this;
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
