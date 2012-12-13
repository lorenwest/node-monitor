// SidebarView.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor'),
      UI = Monitor.UI,
      Tree = UI.Tree,
      TreeView = UI.TreeView,
      Template = UI.Template,
      Backbone = Monitor.Backbone,
      _ = Monitor._,
      sidebarTemplate = null;

  /**
  * The navigator sidebar view
  *
  * @class SidebarView
  * @extends Backbone.View
  * @constructor
  */
  var SidebarView = UI.SidebarView = Backbone.View.extend({

    // Constructor
    initialize: function(options) {
      var t = this;

      // Build the template from the individual templates
      if (!sidebarTemplate) {
        sidebarTemplate = new Template({
          text:
            $('#nm-template-SidebarView').html()
        });
      }
    },

    // Event declarations
    events: {
    },

    render: function() {
      var t = this;

      // Hardcode a tree
      var tree = new Tree({
        id: '/',
        branches: [
          {id: 'Branch 1', isOpen: false, isPlaceholder: true},
          {id: 'Branch 2', isOpen: true, isPlaceholder: true},
          {id: 'Branch 3', isOpen: false, isPlaceholder: true},
        ],
        leaves:[
          {id: 'Page 1'},
          {id: 'Page 2'},
          {id: 'Page 3'},
          {id: 'Page 4'},
        ],
        isOpen: true,
        isLoading: false,
        isPlaceholder: false
      });

      // Render the HTML from the template
      t.$el.html(sidebarTemplate.apply(t.model.toJSON()));
      var tv = new TreeView({
        model: tree
      });
      tv.render().appendTo(t.$('.nm-sb-pages'));

    }

  });

}(this));
