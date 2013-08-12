// TourSettingsView.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor-min'),
      UI = Monitor.UI,
      Template = UI.Template,
      Backbone = Monitor.Backbone,
      _ = Monitor._,
      template = null;

  /**
  * Component settings dialog view
  *
  * @class TourSettingsView
  * @extends SettingsView
  * @constructor
  */
  var TourSettingsView = UI.TourSettingsView = UI.SettingsView.extend({

    // Constructor
    initialize: function(options) {
      var t = this;
      if (!template) {
        template = Template.fromDOM('#nm-template-TourSettings');
      }

      // A cache of selected tours, by ID
      t.tours = {};
    },

    // Event declarations
    events: {
      'change input'        : 'onChange',
      'click .leaf'         : 'selectTour',
      'click .btn-cancel'   : 'cancel',
      'click .btn-primary'  : 'save',
      'click .nm-tsv-up'    : 'moveUp',
      'click .nm-tsv-down'  : 'moveDown',
      'click .nm-tsv-remove': 'removePage',
      'click .nm-tsv-add-tour'  : 'addTour',
      'click .nm-tsv-add-page'  : 'openAddPage'
    },

    // This is called once after construction to render the
    // components onto the screen.
    render: function() {
      var t = this;
      t.$el.append(template.apply({}));
      t.dialog = t.$('.modal');

      // Build the tour tree view
      t.tv = new UI.TreeView({
        preFetch: true,
        monitorParams: {probeClass: 'ToursProbe'}
      });
      t.tv.render().appendTo(t.$('.nm-tsv-tree'));

      // Select the first tour once the tree is loaded
      t.tv.whenConnected(function(tree) {
        t.firstTour();
      });

      // Instantiate the new tour page view
      t.newTourPage = new UI.NewTourPage({tourSettings:t});
      t.newTourPage.render();
      UI.pageView.$el.append(t.newTourPage.$el);
    },

    // Process a tour selection
    selectTour: function(e) {
      var t = this,
          item = $(e.currentTarget),
          path = item.attr('data-path');
      t.showTour(path);
    },

    showTour: function(tourPath) {
      var t = this;

      // Get from cache if available
      t.tour = t.tours[tourPath];

      // Add the tour if not in cache
      if (!t.tour) {
        t.tour = t.tours[tourPath] = new UI.Tour({id:tourPath});

        // Fetch the tour and load the form
        t.tour.fetch(function(err){
          if (err) {
            alert("Error: Cannot open tour: " + tourPath);
            console.error(err);
            return;
          }
          t.loadForm();
          t.$('.nm-tsv-title').focus();
        });
      }
      else {
        // Load the existing tour
        t.loadForm();
        t.$('.nm-tsv-title').focus();
      }

    },

    // Send data to the form
    loadForm: function() {
      var t = this;

      // Set the current tour pages
      t.pages = t.tour.get('pages');

      // Tour fields
      t.$('.nm-tsv-id').val(t.tour.get('id'));
      t.$('.nm-tsv-title').val(t.tour.get('title'));
      t.$('.nm-tsv-description').val(t.tour.get('description'));
      t.$('.nm-tsv-auto-next-sec').val(t.tour.get('autoNextSec'));
      var pageList = t.$('.nm-tsv-page-list').html('');

      // Tour pages
      var table = $('<table></table>').appendTo(pageList);

      for (var i = 0; i < t.pages.length; i++) {
        var page = t.pages[i];
        $('<tr><td>' + page['title'] + '</td><td class="nm-tsv-up" title="move up"><i class="icon-caret-up"></i></td><td class="nm-tsv-down" title="move down"><i class="icon-caret-down"></i></td><td class="nm-tsv-remove" title="remove page"><i class="icon-minus"></i></td></tr>').appendTo(table);
      }

      // Connect all tooltips
      UI.tooltip(t.$('*[title]').addClass('nm-pv-tt'));

    },

    // Called when the dialog is opened
    show: function() {
      var t = this;

      // Show the modal dialog
      t.dialog.centerBox().css({top:40}).modal('show');

      // Set the cursor when the dialog fades in
      setTimeout(function(){
        t.$('.nm-tsv-title').focus();
      }, 500);
    },

    // Show the first tour in the tree
    firstTour: function() {
      var t = this;
      for (var i in t.tv.orderedNodes) {
        var node = t.tv.orderedNodes[i];
        if (node.type === 'leaf') {
          var tour = node.node;
          t.showTour('/' + tour.get('id'));
          break;
        }
      }
    },

    // Called when a form input element changes
    onChange: function(e) {
      var t = this;

      // Scrape the form
      var params = {
        title: t.$('.nm-tsv-title').val(),
        description: t.$('.nm-tsv-description').val(),
        autoNextSec: t.$('.nm-tsv-auto-next-sec').val()
      };

      if (!parseInt(params.autoNextSec)) {
        // Assure blank, NaN, undefined, 0, etc translates to 0 (no auto-next)
        params.autoNextSec = 0;
      }
      t.tour.set(params);
      t.tour.isDirty = true;
      t.setDirty(true);
      t.loadForm();

      // Change the title/description in the tree view
      var tvNode = t.tv.model.getByPath(t.tour.get('id'));
      tvNode.set({
        label: params.title ? params.title : ' ',
        description: params.description
      });

      // If the tour is deleted, go to the first one
      if (!params.title) {
        t.firstTour();
      }
    },

    moveUp: function(e) {
      var t = this,
          index = $(e.currentTarget).parent().index();
      UI.pageView.hideToolTips();
      if (index > 0) {
        var newPages = t.pages.slice(0);
        newPages.splice(index - 1,0,t.pages[index]);
        newPages.splice(index + 1,1);
        t.tour.set('pages', newPages);
        t.tour.isDirty = true;
        t.setDirty(true);
        t.loadForm();
      }
    },

    moveDown: function(e) {
      var t = this,
          index = $(e.currentTarget).parent().index();
      UI.pageView.hideToolTips();
      if (index < t.pages.length - 1) {
        var newPages = t.pages.slice(0);
        newPages.splice(index + 2,0,t.pages[index]);
        newPages.splice(index,1);
        t.tour.set('pages', newPages);
        t.tour.isDirty = true;
        t.setDirty(true);
        t.loadForm();
      }
    },

    removePage: function(e) {
      var t = this,
          index = $(e.currentTarget).parent().index();
      UI.pageView.hideToolTips();
      var newPages = t.pages.slice(0);
      newPages.splice(index,1);
      t.tour.set('pages', newPages);
      t.tour.isDirty = true;
      t.setDirty(true);
      t.loadForm();
    },

    setDirty: function(isDirty) {
      var t = this;
      t.$('.nm-tsv-dirty').css({display: isDirty ? 'inline' : 'none'});
    },

    cancel: function() {
      var t = this;
      t.setDirty(false);
      t.dialog.modal('hide');
      t.tours = {};

      // Reconnect the tree monitor to refresh tree nodes
      t.tv.monitor.disconnect(function(err){
        if (!err) {
          t.tv.monitor.connect();
        }
      });
    },

    save: function() {
      var t = this;

      // Persist all dirty tours
      for (var id in t.tours) {
        var tour = t.tours[id];
        if (tour.isDirty) {
          // Delete or save the tour
          if (!tour.get('title')) {
            tour.destroy(function(error){
              if (error) {
                console.error("Error deleting tour: ", error);
              }
            })
          }
          else {
            tour.save(function(error){
              if (error) {
                console.error("Error saving tour: ", error);
              }
            });
          }
          tour.isDirty = false;
        }
      }

      t.setDirty(false);
      t.dialog.modal('hide');
    },

    addTour: function() {
      var t = this,
          tree = t.tv.model,
          id = 1,
          path = "" + id;

      // Hide tips
      UI.pageView.hideToolTips();

      // Determine an unused tour ID
      while (tree.getByPath(path)) {
        path = "" + (++id);
      }
      var slashPath = "/" + path;

      // Add the tree item
      var item = new Backbone.Model({
        id:path,
        label: 'New tour'
      });
      tree.get('leaves').add(item);
      t.tour = t.tours[slashPath] = new UI.Tour({
        id:path,
        title: 'New tour'
      })
      t.tour.id = null; // make 'new'
      t.showTour(slashPath);
    },

    // Open the addPage dialog
    openAddPage: function() {
      var t = this,
          modal = t.newTourPage.$('.modal');
      UI.pageView.hideToolTips();
      modal.centerBox().css({top:20, left:modal.css('left').replace(/px/,'') - 40}).modal('show');
      $('.modal-backdrop:last-child').css({zIndex:1140});
    },

    // Add a page to the current tour
    addPage: function(page) {
      var t = this,
          newPages = t.pages.slice(0);
      newPages.splice(0, 0, page);
      t.tour.set('pages', newPages);
      t.tour.isDirty = true;
      t.setDirty(true);
      t.loadForm();
    }

  });

  /**
  * New Tour Page dialog
  *
  * @class NewTourPage
  * @extends Backbone.View
  * @constructor
  */
  var newTourPageTemplate = null;
  var NewTourPage = UI.NewTourPage = Backbone.View.extend({

    // Constructor
    initialize: function(options) {
      var t = this;
      if (!newTourPageTemplate) {
        newTourPageTemplate = Template.fromDOM('#nm-template-NewTourPage');
      }
    },

    // Event declarations
    events: {
      "click .leaf"       : "addPage"
    },

    render: function() {
      var t = this;
      t.$el.append(newTourPageTemplate.apply({}));

      // Build the page tree view
      t.tv = new UI.TreeView({
        preFetch: true,
        monitorParams: {probeClass: 'PagesProbe'}
      });
      t.tv.render().appendTo(t.$('.nm-tv-page-browser'));
    },

    addPage: function(e) {
      var t = this,
          item = $(e.currentTarget),
          path = item.attr('data-path'),
          title = item.html();
      modal = t.$('.modal').modal('hide');
      t.options.tourSettings.addPage({url:path, title:title});
    }

  });

}(this));
