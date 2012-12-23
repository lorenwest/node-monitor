// TreeProbe.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('monitor'),
      _ = Monitor._,
      UI = Monitor.UI,
      Tree = UI.Tree,
      Probe = Monitor.Probe;

  /**
  * This is an abstract probe that other Tree type probes can extend.
  * It's purpose is to provide a consistent interface for building and interacting
  * with probes representing tree-type hierarchies.
  *
  * The TreeView component, when used in conjunction with a TreeProbe,
  * can present a visual representation of the hierarchy in the browser.
  *
  * The *tree* element in this probe represents the tree from the *path* and
  * through the *depth* specified in the initParams probe settings.
  *
  * Trees can be traversed by calling the 'ls' command from the monitor, or
  * if a live connection to the sub-tree is desired, another TreeProbe can be
  * created with the path to the sub-tree.
  *
  * Derived classes need only implement the ls_command method.  As changes are
  * observed, they need only modify the *tree* element to keep the probe and
  * client monitors fresh.
  *
  * See the PagesProbe for an example implementation.
  *
  * @abstract
  * @class TreeProbe
  * @extends Probe
  * @constructor
  * @param [initParams] - Probe initialization parameters
  *     @param [initParams.path=''] {String} Path to this tree node (top node if '')
  *     @param [initParams.depth=0] {Integer} Depth to maintain in the tree element
  */
  var TreeProbe = Monitor.TreeProbe = Probe.extend({

    /**
    * Constructor initialization.  Derived classes need not implement this method.
    * The ls_control method will be called during initialization, with the
    * this.isInitializing variable set to 'true'.  This can be used to attach
    * any monitors to the underlying components that the tree represents.
    *
    * @method initialize
    */
    initialize: function(attributes, options){
      var t = this;

      // Call parent constructor
      Probe.prototype.initialize.apply(t, arguments);

      // Assume callback responsibility.
      options.asyncInit = true;
      var callback = options.callback;

      // Notify the ls_control that we're initializing
      t.isInitializing = true;

      // Get the initial tree using ls
      t.ls_control(attributes, function(error, tree) {

        // No longer initializing
        t.isInitializing = false;

        // Handle ls errors
        if (error) {
          return callback(error);
        }

        // Set the tree into the probe, and connect it so change events
        // deep in the tree trigger probe change events.
        t.set({tree: tree});
        UI.containedModel(t, 'tree', Tree);

        // Init is done
        return callback(null);
      });
    },

    /**
    * Retrieve the Tree object at the specified path, to the specified depth.
    *
    * @method ls_control
    * @param options {Object} Named parameters (as an object so derived classes can add parameters)
    *     @param [options.path=''] {String} Path to this tree node (top node if '')
    *     @param [options.depth=0] {Integer} Depth to traverse
    * @param callback {Function(error, tree)}
    *     @param callback.error {Mixed} Set if an error occured
    *     @param callback.tree {Tree} Retrieved tree
    */
    ls_control: function(options, callback) {

      // Error if not overridden
      return callback({msg:'The ls_command method must be implemented'});
    }

  });

}(this));
