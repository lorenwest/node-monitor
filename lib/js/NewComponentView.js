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

    events: {
      'click .nm-nc-category div' : 'selectCategory'
    },

    render: function() {
      var t = this;

      // Attach the template to the parent element
      t.$el.append(template.apply(t.model.toJSON()));
      var canvas = t.$('.nm-nc-canvas');

      // Gather icons and categories
      t.icons = {};  // Key=viewClass, data = ComponentIcon
      t.categories = {}; // Key = category name, data = Sorted array of ComponentIcons
      t.categories.All = [];
      t.categoryElems = {};
      for (var appName in UI.app) {
        var app = UI.app[appName];
        for (var viewName in app) {
          var view = app[viewName];
          if (view.prototype instanceof Backbone.View && view.prototype.name) {
            view.prototype.appName = appName;

            // Render the icon (but don't connect it)
            viewClass = appName + '.' + viewName;
            var icon = new ComponentIcon({
              model: view.prototype,
              pageView: t.pageView,
              viewClass: viewClass});
            icon.render();

            // Add the icon to each category
            t.icons[viewClass] = icon;
            t.categories.All.push(icon);
            var categories = view.tags || [];
            categories.forEach(function(catName) {
              catName = $.titleCase(catName);
              t.categories[catName] = t.categories[catName] || [];
              t.categories[catName].push(icon);
            })
          }
        }
      }

      // Sort and display the categories
      var ol = t.$('.nm-nc-category').html('');
      _.keys(t.categories).sort().forEach(function(catName){
        t.categoryElems[catName] = $('<div>' + catName + '</div>').appendTo(ol);
      });

      // Show all icons
      t.showCategory('All');

    },

    showCategory: function(name) {
      var t = this,
          icons = t.categories[name];

      // Get a fresh canvas and show the icons
      var canvas = t.$('.nm-nc-canvas').html('');
      icons.forEach(function(icon) {
        canvas.append(icon.$el);
        icon.delegateEvents();
      });

      // Attach tooltips
      UI.tooltip(t.$('.nm-nc-icon'));

      // Highlight the category
      t.$('.nm-nc-category div').removeClass('selected');
      t.categoryElems[name].addClass('selected');
    },

    selectCategory: function(e) {
      var t = this;
      t.showCategory($(e.currentTarget).html());
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
      'click .nm-nc-icon'        : 'selectItem'
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
