// Probe.js (c) 2012 Loren West and other contributors
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
  * @class Probe
  * @extends Backbone.View
  * @constructor
  * @param options {Object} View initialization options (See others in Backbone.View)
  */
  var Probe= UI.app.base.Probe= Backbone.View.extend({

    // Define the view
    name: 'Probe Viewer',
    icon: 'image/ProbeViewer.png',
    description: 'Displays the raw probe JSON',
    defaultOptions: {
      title: 'Probe Viewer',
      background: true
    },

    initialize: function(options) {
      var t = this;
      t.monitor = options.monitor;
      t.component = options.component;
      options.component.setDefaultSize({
        width: 300,
        height: 300
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
      t.outerView = t.$el.html('<div class="nm-base-probe"></div>')
        .find('.nm-base-probe');

      t.jsonView = new UI.JsonView({model: t.monitor});
      t.jsonView.render();
      t.outerView.append(t.jsonView.$el);

    }

  });

  // Custom settings form
  Probe.SettingsView = Backbone.View.extend({

    initialize: function(options) {
      var t = this;
    },

    events: {
    },

    render: function() {
      var t = this;
      t.monitor = t.options.monitor;
      t.$el.html('' +
        '<div class="title"></div>' +
        '<div class="nm-base-probe-input">' +
          '<label>Server</label>' +
          '<div class="server nm-base-probe-sel"></div>' +
        '</div>' +
        '<div class="nm-base-probe-input">' +
          '<label>Probe</label>' +
          '<div class="probe nm-base-probe-sel"></div>' +
        '</div>');

      // Append a title/background picker
      new UI.ComponentSettingsView.TitleBackgroundPicker({
        el: t.$el.find('.title'),
        component: t.options.component
      });

      // Append a server picker
      t.serverPicker = new UI.MonitorPicker.ServerView({
        el: t.$el.find('.server'),
        model: t.monitor
      });
      t.serverPicker.render();

      // Append a probe picker
      t.probePicker = new UI.MonitorPicker.ProbeView({
        el: t.$el.find('.probe'),
        model: t.monitor
      });
      t.probePicker.render();
    },

  });

}(this));
