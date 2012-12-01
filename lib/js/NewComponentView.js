// NewComponentView.js (c) 2012 Loren West and other contributors
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
      template = null,
      iconTemplate = null;

  // Constants
  var DEFAULT_ICON = '';

  /**
  * Add a component to the page
  *
  * @class NewComponentView
  * @extends Backbone.View
  * @constructor
  */
  var NewComponentView = UI.NewComponentView = Backbone.View.extend({

    // Constructor
    initialize: function(options) {
      var t = this;
      t.pageView = options.pageView;
      t.model = t.pageView.model;
      if (!template) {
        template = new Template({
          text: $('#nm-template-NewComponentView').html()
        });
      }
    },

    render: function() {
      var t = this;
      // Attach the template to the parent element
      t.$el.append(template.apply(t.model.toJSON()));

      // Add components
      var canvas = t.$('.nm-nc-canvas');
      for (var appName in UI.app) {
        var app = UI.app[appName];
        for (var viewName in app) {
          var elem = app[viewName];
          if (elem.prototype instanceof Backbone.View && elem.prototype.name) {
            elem.prototype.appName = appName;
            var icon = new ComponentIcon({model: elem.prototype, pageView: t.pageView, viewClass: appName + '.' + viewName});
            icon.render();
            canvas.append(icon.$el);
          }
        }
      }

      // Attach tooltips
      UI.tooltip(t.$('.nm-nc-icon'));
    },

    selectItem: function() {
      var t = this;
      alert(t.model.name + " selected");
    }

  });

  /**
  * Visual representation of a component class
  *
  * @class ComponentIcon
  * @extends Backbone.View
  * @constructor
  */
  var ComponentIcon = Backbone.View.extend({

    // Constructor
    initialize: function(options) {
      var t = this;
      t.model.title = t.model.description;
      t.pageView = options.pageView;
      /*
      if (t.model.website) {
        t.model.title += ' <a href="' + t.model.website + '">(website)</a>';
      }
      */
      if (t.model.icon) {
        t.model.iconPath = '/app/' + t.model.appName + '/' + t.model.icon;
      } else {
        t.model.iconPath = DEFAULT_ICON;
      }
      if (!iconTemplate) {
        iconTemplate = new Template({
          text: $('#nm-template-ComponentIcon').html()
        });
      }
    },

    render: function() {
      var t = this;
      $(iconTemplate.apply(t.model)).appendTo(t.$el);
    },

    events: {
      'click .nm-nc-icon' : 'selectItem'
    },

    selectItem: function() {
      var t = this;

      // Add the component to the model, then to the page view
      var component = t.pageView.model.addComponent(t.options.viewClass);
      component.get('viewOptions').set({background:true, title:t.model.name});

      // Position the component on top left
      var cv = t.pageView.getComponentView(component.get('id'))
      cv.raiseToTop(true);
      cv.moveToLeft();
      t.pageView.leftJustify();
      t.pageView.centerPage();

      // Close the dialog box
      $('#nm-pv-new-component').modal('hide');
    }

  });

}(this));
