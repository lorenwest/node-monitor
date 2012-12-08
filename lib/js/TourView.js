// TourView.js (c) 2012 Loren West and other contributors
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
      tourTemplate = null;

  /**
  * The page tour view
  *
  * @class TourView
  * @extends Backbone.View
  * @constructor
  */
  var TourView = UI.TourView = Backbone.View.extend({

    // Constructor
    initialize: function(options) {
      var t = this;

      // Build the template from the individual templates
      if (!tourTemplate) {
        tourTemplate = new Template({
          text:
            $('#nm-template-TourView').html()
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
      t.$el.html(tourTemplate.apply(model.toJSON()));

      // Place all tooltips on the right
      t.$('*[title]').attr('data-placement','right');

      // Place the pages


    }

  });

}(this));
