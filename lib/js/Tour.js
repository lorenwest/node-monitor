// Tour.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor-min'),
      UI = Monitor.UI,
      Component = UI.Component,
      Backbone = Monitor.Backbone, _ = Monitor._;

  /**
  * A site tour on the node_monitor site
  *
  * Tours are an ordered sequence of pages on the site.  They can be used
  * to explore features, or for hands-off paging through dashboards.
  *
  * @class Tour
  * @extends Backbone.Model
  * @constructor
  * @param model - Initial data model.  Can be a JS object or another Model.
  *     @param model.id {String} The unique tour key
  *     @param [model.title] {String} The display name for the tour
  *     @param [model.description] {String} Description of the tour
  *     @param model.pages [Array] - Array of pages in the tour
  *         @param model.pages.title - Page title
  *         @param model.pages.url - Page URL
  *     @param [model.autoNextSec=0] {Number} - Number of seconds to stay on a page
  *         before navigating to the next page.  0=no autoNext.
  */
  var Tour = UI.Tour = Backbone.Model.extend({

    defaults: {
      id:'',
      title:'',
      description:'',
      autoNextSec: 10,
      pages:[]
    },
    sync: new Monitor.Sync('Tour'),

    initialize: function(params, options) {
      var t = this;
    },

  });

  /**
  * Constructor for a list of Tour objects
  *
  *     var myList = new Tour.List(initialElements);
  *
  * @static
  * @method List
  * @param [items] {Array} Initial list items.  These can be raw JS objects or Tour data model objects.
  * @return {Backbone.Collection} Collection of Tour data model objects
  */
  Tour.List = Backbone.Collection.extend({model: Tour});

}(this));
