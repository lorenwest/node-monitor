/*global window document $ localStorage alert*/

// SidebarView.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor-min'),
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
      t.page = UI.pageView.options.model;

      // Build the template from the individual templates
      if (!sidebarTemplate) {
        sidebarTemplate = Template.fromDOM('#nm-template-SidebarView');
      }

      // Parse the sidebar from localstorage, and use the
      // default if anything goes wrong.
      try {
        t.sidebar = new Sidebar(JSON.parse(localStorage.sidebar));
      } catch (e) {}
      if (!t.sidebar) {
        t.sidebar = new Sidebar();
      }

      // Retain some references to the sidebar
      t.tree = t.sidebar.get('tree');
      t.branches = t.tree.get('branches');
      t.pages = t.branches.get('pages');
      t.tours = t.branches.get('tours').get('leaves');

      // If anything changes in the tree, save to localstorage
      t.sidebar.on('change', t.saveSidebar, t);
    },

    // Event declarations
    events: {
      'mousedown .nm-sb-handle'    : 'resizeStart',
      'click h4'                   : 'toggleSection',
      'click .leaf'                : 'selectItem',
      'click .nm-sb-new-page'      : 'openNewPage',
      'click .nm-sb-tour-settings' : 'openTourSettings'
    },

    render: function() {
      var t = this,
          branches = t.sidebar.get('tree').get('branches');

      // Build the sidebar
      t.$el.html(sidebarTemplate.apply(t.sidebar.toJSON()));

      // Set the initial width
      var width = t.sidebar.get('width');
      t.handleWidth = $('.nm-sb-handle').width();
      $('.nm-sb').css({width: width});

      // Set the tour view position
      t.tour = $('.nm-pv-tour');
      t.tour.css({left: width + t.handleWidth});

      // Setup the the handle
      t.handle = t.$('.nm-sb-handle');

      // Set some tree view options
      var treeOpts = {
        pages: {monitorParams: {probeClass: 'PagesProbe'}},
        tours: {monitorParams: {probeClass: 'ToursProbe'}}
      };

      // Build the sub-sections
      t.sectionViews = {};
      ['pages', 'tours'].forEach(function(section){

        // Default the section if it's not there
        var tv = new TreeView(_.extend({
          model:branches.get(section),
          preFetch: true
        }, treeOpts[section]));
        var secDiv = t.$('.nm-sb-' + section);
        tv.render().appendTo(secDiv);
        var isOpen = tv.model.get('isOpen');
        if (!isOpen) {
          secDiv.css({height:0});
          secDiv.prev('h4').addClass('closed');
        }
        t.sectionViews[section] = tv;
      });

      // Instantiate the tour settings dialog.
      t.tourSettingsView = new UI.TourSettingsView();
      t.tourSettingsView.render();
      UI.pageView.$el.append(t.tourSettingsView.$el);

    },

    // Process an item selection
    selectItem: function(e) {
      var t = this,
          item = $(e.currentTarget),
          id = item.attr('data-id'),
          path = item.attr('data-path');

      // Process a tour selection
      if ($(e.currentTarget).parents('.nm-sb-tours').length) {
        UI.pageView.runTour(path);
        return;
      }

      // Process a page selection
      UI.pageView.navigateTo(path);
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

    // Open the new page dialog
    openNewPage: function(e) {
      var t = this;
      UI.pageView.hideToolTips();

      // Tell the settings it's about to be shown
      UI.pageView.$('#nm-pv-new').centerBox().css({top:100}).modal('show');
      setTimeout(function(){
        $('.nm-np-address').focus();
      }, 500);

      // Don't propagate the click to the heading
      e.stopPropagation();
    },

    // Open the tour settings dialog
    openTourSettings: function(e) {
      var t = this;
      UI.pageView.hideToolTips();

      // Tell the settings it's about to be shown
      t.tourSettingsView.show();

      // Don't propagate the click to the heading
      e.stopPropagation();
    },

    // Resize the sidebar
    resizeStart: function(e) {
      var t = this,
          sidebar = $('.nm-sb'),
          newWidth = startWidth = sidebar.width(),
          startX = e.pageX;
      function drag(e) {
        newWidth = startWidth + (e.pageX - startX);
        sidebar.css({width:newWidth});
        t.tour.css({left: newWidth + t.handleWidth});
        UI.pageView.centerPage();
      }
      function drop(e) {
        t.handle.removeClass('drag');
        $(document).unbind("mousemove", drag).unbind("mouseup", drop);
        // Simulate click?
        if (newWidth === startWidth) {
          newWidth = startWidth === 0 ? Sidebar.prototype.defaults.width : 0;
        }
        // Auto-close?
        else if (newWidth < 30) {
          newWidth = 0;
        }
        // Set the width, center the page, and persist
        t.sidebar.set('width', newWidth);
        sidebar.css({width: newWidth});
        t.tour.css({left: newWidth + t.handleWidth});
        UI.pageView.centerPage();
      }
      $(document).bind("mousemove", drag).bind("mouseup", drop);
      t.handle.addClass('drag');
      drag(e);
      e.preventDefault();
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
            };
            if (subTree.label) {
              branches[i].label = subTree.label;
            }
          }
        }
        return tree;
      };

      // Trim sub-tree elements in pages, and save
      for (var i = 0; i < sbJSON.tree.branches.length; i++) {
        sbJSON.tree.branches[i] = trimSubBranch(sbJSON.tree.branches[i]);
      }
      localStorage.sidebar = JSON.stringify(sbJSON);
    }

  });

}(this));
