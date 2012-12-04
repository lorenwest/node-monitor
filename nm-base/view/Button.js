// Button.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor'),
      UI = Monitor.UI,
      base = UI.app.base = UI.app.base || {},
      Backbone = Monitor.Backbone,
      _ = Monitor._;

  /**
  * A generic button for running javascript code
  *
  * When the button is pressed, it runs the code specified in the onPress element.
  *
  * @class Button
  * @extends Backbone.View
  * @constructor
  * @param options {Object} View initialization options (See others in Backbone.View)
  * @param options.label='buttonLabel' {String} The button label
  * @param options.icon='iconClass' {String} The icon class name
  * @param options.onPress='' {String} Javascript to run when the button is pressed
  */
  var Button = base.Button = Backbone.View.extend({

    // Define the view
    name: 'Button',
    icon: 'image/Button.png',
    description: 'Displays a button, and fires an event when pressed',
    website: 'http://node_monitor.github.com/button.html',
    defaultOptions: {
      label: 'Button',
      icon: 'icon-star',
      onPress: ''
    },

    initialize: function(options) {
      var t = this;
      t.viewOptions = t.options.viewOptions;
      t.viewOptions.on('change', t.setLabel, t);
    },

    events: {
      'click button': 'onClick'
    },

    render: function() {
      var t = this;
      t.$el
        .html('<button class="btn"><i></i> <span></span></button>')
        .button();
      t.setLabel();
    },

    onClick: function() {
      var t = this,
          pageView = t.options.pageView,
          component = t.options.component,
          monitor = component.monitor,
          getMonitor = function(id) {return pageView.getMonitor(id);},
          onPress = t.viewOptions.get('onPress');
      if (onPress) {
        eval(onPress);
      }
    },

    setLabel: function() {
      var t = this;
      t.$('button i').attr('class', t.viewOptions.get('icon'));
      t.$('button span').text(t.viewOptions.get('label'));
    }

  });


  // Custom settings form for the Button view
  Button.SettingsView = Backbone.View.extend({

    initialize: function(options) {
      var t = this;
      t.modelBinder = new Backbone.ModelBinder();
      $.styleSheet(Button.css, 'nm-base-bs-css');
    },

    events: {
      'keydown': 'hotChanges'
    },

    render: function() {
      var t = this;
      t.$el.html(Button.template);
      new UI.IconChooser({el:t.$('select')});
      t.modelBinder.bind(t.model, t.$el);
      t.model.on('change:icon', t.changeIcon, t);
      t.changeIcon();
    },

    // Make changes immediately
    hotChanges: function(e) {
      var t = this;
      setTimeout(function(){
        t.modelBinder._onElChanged(e);
      }, 0);
    },

    changeIcon: function() {
      var t = this;
      t.$('i').attr('class', t.model.get('icon'));
    },

    // Overridden to unbind form elements
    remove: function() {
      var t = this;
      t.undelegateEvents();
      t.model.off('change:icon', t.changeIcon, t);
      t.modelBinder.unbind();
      return Backbone.View.prototype.remove.apply(t, arguments);
    }

  });

  Button.css = {
    '.nm-base-bs i'        : 'font-size: 18px; margin-left: 20px;'
  };

  Button.template =
    '<div class="nm-base-bs">' +
      '<label>Button Label</label>' +
      '<input name="label" type="text"/>' +
      '<label>Icon</label>' +
      '<select name="icon" data-placeholder="Choose an Icon...">' +
        '<option value="">(no icon)</option>' +
      '</select>' +
      '<i class="icon-music"></i>' +
      '<label>On Button Press</label>' +
      '<textarea name="onPress" class="monospace-font"></textarea>' +
    '</div>'
  ;

}(this));
