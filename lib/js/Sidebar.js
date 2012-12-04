// Sidebar.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor'),
      UI = Monitor.UI,
      Backbone = Monitor.Backbone,
      _ = Monitor._;

  /**
  * Browser-centric data about the sidebar
  *
  * This data model is persisted in browser localStorage, and consists of the
  * information about the sidebar to retain between pages (open state, current
  * tour, etc.)
  *
  * @class Sidebar
  * @extends Backbone.Model
  * @constructor
  * @param model - Initial data model.  Can be a JS object or another Model.
  *     @param [model.width=350] {Integer} - Width in pixels (0=closed)
  *     @param [model.currentTour=null] {String} - ID of the current page tour (if any)
  *     @param [model.autoNextSec=0] {Number} - Number of seconds to stay on a page
  *         before navigating to the next page.  0=no autoNext.
  */
  var Sidebar = UI.Sidebar = Backbone.Model.extend({

    defaults: {
      width:350,
      currentTour: null,
      autoNextSec: 0
    },

    initialize: function(params, options) {
      var t = this;
    },

  });

  /**
  * Constructor for a list of Sidebar objects
  *
  *     var myList = new Sidebar.List(initialElements);
  *
  * @static
  * @method List
  * @param [items] {Array} Initial list items.  These can be raw JS objects or Sidebar data model objects.
  * @return {Backbone.Collection} Collection of Sidebar data model objects
  */
  Sidebar.List = Backbone.Collection.extend({model: Sidebar});

}(this));
