// TourSettingsView.js (c) 2013 Loren West and other contributors
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
        template = new Template({
          text: $('#nm-template-TourSettings').html()
        });
      }

      // A cache of selected tours, by ID
      t.tours = {};
    },

    // Event declarations
    events: {
      'click .leaf'         : 'selectTour',
      'click .btn-cancel'   : 'cancel',
      'click .btn-primary'  : 'save'
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
        for (var i in t.tv.orderedNodes) {
          var node = t.tv.orderedNodes[i];
          if (node.type === 'leaf') {
            var tour = node.node;
            t.showTour('/' + tour.get('id'));
            break;
          }
        }
      });
    },

    // Process a tour selection
    selectTour: function(e) {
      var t = this,
          item = $(e.currentTarget),
          path = item.attr('data-path');
      t.showTour(path);
    },

    showTour: function(tourPath) {
      var t = this,
          tour = null;

      // Get from cache if available
      tour = t.tours[tourPath];

      // Add the tour if not in cache
      if (!tour) {
        tour = t.tours[tourPath] = new UI.Tour({id:tourPath});
      }

      // Fetch the tour and load the form
      tour.fetch(function(err){
        if (err) {
          alert("Error: Cannot open tour: " + tourPath);
          console.error(e);
          return;
        }

        // Bind the fields to the form
// TODO: Use model binder
        t.$('.nm-tsv-id').val(tour.get('id'));
        t.$('.nm-tsv-title').val(tour.get('title'));
        t.$('.nm-tsv-description').val(tour.get('description'));
        t.$('.nm-tsv-auto-next-sec').val(tour.get('autoNextSec'));

        // Go to the first page
        var pages = tour.get('pages');
      });
    },

    // Called when the dialog is opened
    show: function() {
      var t = this;

      // Build the data model
      if (!t.model) {

      }

      // Show the modal dialog
      t.dialog.centerBox().css({top:40}).modal('show');

      // Set the cursor when the dialog fades in
      setTimeout(function(){
        t.$('.nm-tsv-title').focus();
      }, 500);
    },

    cancel: function() {
      var t = this;
      t.model = null;
      t.dialog.modal('hide');
    },

    save: function() {
      var t = this;
      t.dialog.modal('hide');
    }

  });

}(this));
