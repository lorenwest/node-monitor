// SidebarView.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor'),
      UI = Monitor.UI,
      Sidebar = UI.Sidebar,
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
      t.page = options.model;

      // Build the template from the individual templates
      if (!sidebarTemplate) {
        sidebarTemplate = new Template({
          text:
            $('#nm-template-SidebarView').html()
        });
      }

      // Parse the sidebar from localstorage, and use the
      // default if anything goes wrong.
      try {
        t.sidebar = new Sidebar(JSON.parse(localStorage.sidebar));
      } catch (e) {}
      if (!t.sidebar) {
        t.sidebar = new Sidebar();
      }

      // If anything changes in the tree, save to localstorage
      t.sidebar.on('change', t.saveSidebar, t);
    },

    // Event declarations
    events: {
      'click h4'     : 'toggleSection',
      'click .leaf'  : 'selectItem'
    },

    render: function() {
      var t = this,
          branches = t.sidebar.get('tree').get('branches');

      // Build the sidebar
      t.$el.html(sidebarTemplate.apply(t.model.toJSON()));

      // Build the sub-sections
      t.sectionViews = {};
      ['fav','recent','pages','tours'].forEach(function(section){
        var tv = new TreeView({model:branches.get(section)});
        var secDiv = t.$('.nm-sb-' + section);
        tv.render().appendTo(secDiv);
        var isOpen = tv.model.get('isOpen');
        if (!isOpen) {
          secDiv.css({height:0});
          secDiv.prev('h4').addClass('closed');
        }
        t.sectionViews[section] = tv;
      });
    },

    // Process an item selection
    selectItem: function(e) {
      var t = this,
          item = $(e.currentTarget),
          id = item.attr('data-id');

      // Process a tour selection
      if (id.indexOf('tour:') === 0) {
        var tour = id.substr(5);
        alert('Tour selected: ' + tour);
        return;
      }

      // Process a page selection
      location.href = id;
    },

    // Open/close the section
    toggleSection: function(e) {
      var t = this,
          h1 = $(e.currentTarget),
          div = h1.find('+div'),
          section = div.attr('class').substr(6),
          wasClosed = div.height() === 0;

      // Animate the height.  Can't do CSS animations, because CSS
      // requires specific start/end points, and can't animate from
      // height:auto to height:0px.
      if (wasClosed) {
        var divHeight = div.css({height:'auto'}).height();
        h1.toggleClass('closed', false);
        div.css({height:0});
        div.animate({height:divHeight}, 200, function(){
          div.css({height:'auto'});
        });
      } else {
        div.animate({height:0}, 200, function(){
          h1.toggleClass('closed', true);
        });
      }

      // Change the data model
      t.sidebar.get('tree').get('branches').get(section).set('isOpen', wasClosed);
    },

    // Save the sidebar to localStorage
    saveSidebar: function() {
      var t = this,
          sbJSON = t.sidebar.toJSON({deep:true, trim:true});

      // Function to trim closed sub-branches from a tree
      var trimSubBranch = function(tree) {
        var branches = tree.branches;
        for (var i in branches) {
          var subTree = branches[i];
          if (subTree.isOpen && !subTree.isLoading) {
            branches[i] = trimSubBranch(subTree);
          } else {
            branches[i] = {
              id: subTree.id,
              isPlaceholder: true
            }
            if (subTree.label) {
              branches[i].label = subTree.label;
            }
          }
        }
        return tree;
      }

      // Trim sub-tree elements in pages, and save
      var pages = sbJSON.tree.branches[2];
      sbJSON.tree.branches[2] = trimSubBranch(pages)
      localStorage.sidebar = JSON.stringify(sbJSON);
    }

  });

}(this));
