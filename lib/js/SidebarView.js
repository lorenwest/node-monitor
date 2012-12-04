// Sidebar.js (c) 2012 Loren West and other contributors
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
      sidebarTemplate = null;

  /**
  * The navigator sidebar view
  *
  * @class Sidebar
  * @extends Backbone.View
  * @constructor
  */
  var Sidebar = UI.Sidebar = Backbone.View.extend({

    // Constructor
    initialize: function(options) {
      var t = this;

      // Build the template from the individual templates
      if (!sidebarTemplate) {
        sidebarTemplate = new Template({
          text:
            $('#nm-template-Sidebar').html()
        });
      }
    },

    // Event declarations
    events: {
    },

    render: function() {

      var t = this,
          model = t.model;

      // Render the HTML from the template
      t.$el.html(sidebarTemplate.apply(model.toJSON()));

    }

  });

}(this));
