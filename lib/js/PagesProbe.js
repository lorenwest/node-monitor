// PagesProbe.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('monitor'),
      _ = Monitor._,
      UI = Monitor.UI,
      Path = require('path'),
      TreeProbe = Monitor.TreeProbe;

  var ROOT_PATH = Path.resolve(__dirname + '../../site_db/Pages');

  /**
  * This probe represents a portion of the site as a Tree.  The path and depth
  * initParam elements define the starting path and depth of the tree.
  *
  * @abstract
  * @class PagesProbe
  * @extends TreeProbe
  * @constructor
  * @param [initParams] - Probe initialization parameters
  *     @param [initParams.path=''] {String} Path to this tree node (top node if '')
  *     @param [initParams.depth=0] {Integer} Depth to maintain in the tree element
  */
  var PagesProbe = Monitor.PagesProbe = TreeProbe.extend({

    probeClass: 'PagesProbe',

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

      // Get a fake tree to return
      var t = this,
          sb = new UI.Sidebar(),
          tree = sb.get('tree');

      process.nextTick(function(){
        callback(null, tree);
      })

      /*
      setTimeout(function(){
        t.get('tree').get('leaves').add({id:'444'});
console.log("Adding a leaf to the tree");
      }, 3000);
      */

    }

  });

}(this));
