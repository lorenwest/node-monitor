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
        '<div class="nm-base-inspector-input">' +
          '<label>Server</label>' +
          '<div class="server nm-base-probe-sel"></div>' +
          '<label>Expression</label>' +
          '<input class="nm-base-inspector-expression monospace-font" title="Enter a variable name or expression" type="text"/>' +
        '</div>' +
        '<div class="nm-base-inspector-depthblock">' +
          '<label>JSON Depth</label>' +
          '<input class="nm-base-inspector-depth" type="text"/>' +
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

      // Bind the expression to the model
      var expression = t.$el.find('.nm-base-inspector-expression');
      expression.val(t.monitor.get('initParams').key);
      expression.on('change', function() {
        var value = expression.val();
        var initParams = _.extend({}, t.monitor.get('initParams'), {key:value});
        if (!value) {
          delete initParams.key;
        }
        t.monitor.set('initParams', initParams);
      });

      // Bind the depth to the model
      var depth = t.$el.find('.nm-base-inspector-depth');
      depth.val(t.monitor.get('initParams').depth);
      depth.on('change', function() {
        var value = depth.val();
        var initParams = _.extend({}, t.monitor.get('initParams'), {depth:value});
        if (!value) {
          delete initParams.depth;
        }
        t.monitor.set('initParams', initParams);
      });

    },

  });

}(this));
