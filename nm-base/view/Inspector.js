// Inspector.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor'),
      UI = Monitor.UI,
      Backbone = Monitor.Backbone,
      _ = Monitor._;

  /**
  * View the probe JSON
  *
  * @class Inspector
  * @extends Backbone.View
  * @constructor
  * @param options {Object} View initialization options (See others in Backbone.View)
  */
  var Inspector = UI.app.base.Inspector = Backbone.View.extend({

    // Define the view
    name: 'Object Inspector',
    icon: 'image/ProbeViewer.png',
    description: 'Inspects variables and expressions',
    defaultOptions: {
      title: 'Object Inspector',
      background: true
    },

    initialize: function(options) {
      var t = this;
      // Initialize a blank monitor
      t.monitor = options.monitor;
      t.component = options.component;
      if (!t.monitor.get('probeClass')) {
        t.monitor.set({
          probeClass: 'Inspect',
          initParams: {
            key: Monitor.commonJS ? 'global' : 'window',
            depth: Monitor.commonJS ? 2 : 1
          }
        });
      }
      options.component.setDefaultSize({
        width: 350,
        height: 400
      });
    },

    events: {
    },

    render: function() {
      var t = this;

      // Clear out any prior JSON
      if (t.jsonView) {
        t.jsonView.remove();
        t.jsonView = null;
      }
      t.outerView = t.$el.html('<div class="nm-base-inspector"></div>')
        .find('.nm-base-inspector');
      t.jsonView = new UI.JsonView({
        heading: "INSPECTING: " + t.monitor.get('key'),
        model: t.monitor.get('value'),
        closedOnInit: true
      });
      t.jsonView.render();
      t.outerView.append(t.jsonView.$el);

      // Re-render on change
      t.resetData = function(){
        t.jsonView.setData(t.monitor.get('value'));
      };
      t.monitor.on('change:value', t.resetData, t);
    },

    destroy: function() {
      var t = this;
      t.monitor.off('change:value', t.resetData, t);
    }

  });

  // Custom settings form
  Inspector.SettingsView = Backbone.View.extend({

    render: function() {
      var t = this;
      t.monitor = t.options.monitor;
      t.$el.html('' +
        '<div class="nm-base-inspector-input">' +
          '<label>Server</label>' +
          '<div class="server nm-base-probe-sel"></div>' +
          '<label>Expression</label>' +
          '<input data-monitor-param="key" class="nm-base-inspector-expression monospace-font" title="Enter a variable name or expression" type="text"/>' +
        '</div>' +
        '<div class="nm-base-inspector-depthblock">' +
          '<label>JSON Depth</label>' +
          '<input data-monitor-param="depth" class="nm-base-inspector-depth" type="text"/>' +
        '</div>');

      // Append a server picker
      t.serverPicker = new UI.MonitorPicker.ServerView({
        el: t.$el.find('.server'),
        model: t.monitor
      });
      t.serverPicker.render();
    },

  });

}(this));
