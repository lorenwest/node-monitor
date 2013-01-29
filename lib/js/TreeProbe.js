// TreeProbe.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('monitor'),
      _ = Monitor._,
      Backbone = Monitor.Backbone,
      UI = Monitor.UI,
      Tree = UI.Tree,
      Probe = Monitor.Probe;

  /**
  * Abstract base class for a probe representing a node in a Tree
  *
  * The TreeView component, when used in conjunction with a TreeProbe
  * can present a visual representation of the hierarchy in the browser.
  *
  * The *branches* and *leaves* elements of this probe represent the
  * tree branches and leaves.  They must contain at least the *id*, but can
  * also contain the optional *label* and *description* elements as well
  * as any other metadata about the branch or leaf.
  *
  * Derived classes need only set the branches and leaves elements,
  * and update as they detect changes.
  *
  * See the PagesProbe for an example implementation.
  *
  * @abstract
  * @class TreeProbe
  * @extends Probe
  * @constructor
  * @param [initParams] - Probe initialization parameters
  *     @param [initParams.path=''] {String} Path to this node in the tree
  */
  var TreeProbe = Monitor.TreeProbe = Probe.extend({

    // Set defaults
    defaults: {
      path:'',
      leaves: [],
      branches: []
    },

    /**
    * Constructor initialization.
    *
    * @method initialize
    */
    initialize: function(attributes, options){
      var t = this;

      // Call parent constructor
      Probe.prototype.initialize.apply(t, arguments);

      // Turn leaves/branches into collections and forward changes to this model
      UI.containedModel(t, 'leaves', Backbone.Collection);
      UI.containedModel(t, 'branches', Backbone.Collection);
    }

  });

}(this));
