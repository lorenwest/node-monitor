// Tree.js (c) 2012 Loren West and other contributors
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
  * A data tree
  *
  * A tree is a hierarchical representation of objects.  Each node in the
  * tree contains a list of objects representing leaves, and a list of other
  * tree objects representing branches.
  *
  * This model is designed for interactive use in a view.  It contains elements
  * representing visual state such as open/closed and loading.
  *
  * @class Tree
  * @extends Backbone.Model
  * @constructor
  * @param model - Initial data model.  Can be a JS object or another Model.
  *     @param model.id {String} - The internal identifier.  Required.
  *     @param [model.label=''] {String} - The display label (if different from the ID)
  *     @param model.branches {Tree.List} - Ordered list of branches.
  *     @param model.leaves {Backbone.Collection} - Ordered list of objects at this level.
  *     @param [model.isOpen=false] {boolean} - Is this visually opened?
  *     @param [model.isLoading=false] {boolean} - Is this currently being loaded?
  *     @param [model.isPlaceholder=false] {boolean} - Is this a placeholder (not yet loaded)?
  */
  var Tree = UI.Tree = Backbone.Model.extend({

    defaults: {
      id:'',
      label: '',
      branches: [],
      leaves: [],
      isOpen: false,
      isLoading: false,
      isPlaceholder: false
    },

    initialize: function(params, options) {
      var t = this;

      // Attach sub-model containment
      UI.containedModel(t, 'branches', Tree.List);
      UI.containedModel(t, 'leaves', Backbone.Collection);
    }
  });

  /**
  * Constructor for a list of Tree objects
  *
  *     var myList = new Tree.List(initialElements);
  *
  * @static
  * @method List
  * @param [items] {Array} Initial list items.  These can be raw JS objects or Tree data model objects.
  * @return {Backbone.Collection} Collection of Tree data model objects
  */
  Tree.List = Backbone.Collection.extend({model: Tree});

}(this));
