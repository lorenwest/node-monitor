// Sidebar.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor'),
      UI = Monitor.UI,
      Tree = UI.Tree,
      Tour = UI.Tour,
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
  *     @param [model.currentTour] {Tour} - Current Tour object (id='' means no tour)
  *     @param [model.autoNextSec=0] {Number} - Number of seconds to stay on a page
  *         before navigating to the next page.  0=no autoNext.
  *     @param [model.currentPage] {Object} - Page currently on
  *         @param [model.currentPage.id] {String} - Path to the page
  *         @param [model.currentPage.label] {String} - Page title
  *         @param [model.currentPage.description] {String} - Page description
  *     @param model.tree {Tree} - Sidebar items (as a tree)
  */
  var Sidebar = UI.Sidebar = Backbone.Model.extend({

    defaults: {
      width:225,
      currentTour: {},
      autoNextSec: 0,
      currentPage:{
        id: null,
        label: null,
        description: null
      },
      tree:{
        branches:[
          {id:'fav', leaves:[], branches:[]},
          {id:'recent', leaves:[], branches:[]},
          {id:'pages', leaves:[], branches:[], isOpen: true},
          {id:'tours', leaves:[], branches:[], isOpen: true}
        ]
      }
    },

    initialize: function(params, options) {
      var t = this,
          tree = t.get('tree'),
          branches = tree.branches;

      // Attach sub-model containment
      UI.containedModel(t, 'tree', Tree);
      UI.containedModel(t, 'currentTour', Tour);
      UI.containedModel(t.get('tree'), 'branches', Tree.List);
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
