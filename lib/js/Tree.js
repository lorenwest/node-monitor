// Tree.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor-min'),
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
  * representing visual state such as open/closed.
  *
  * @class Tree
  * @extends Backbone.Model
  * @constructor
  * @param model - Initial data model.  Can be a JS object or another Model.
  *     @param model.id {String} - The identifier for this node (relative to parent).  Required.
  *     @param [model.label=''] {String} - The display label (if different from the ID)
  *     @param [model.description=''] {String} - The node extended description
  *     @param model.branches {Tree.List} - Ordered list of branches.
  *     @param model.leaves {Backbone.Collection} - Ordered list of objects at this level.
  *     @param [model.isOpen=false] {boolean} - Is this currently visually opened?
  */
  var Tree = UI.Tree = Backbone.Model.extend({

    defaults: {
      id:'',
      label: '',
      description: '',
      // Don't default branches & leaves because sub-tree branches aren't set in monitors
      // and defaulting them would clear out existing values.
      // branches: [],
      // leaves: [],
      isOpen: false
    },

    initialize: function(params, options) {
      var t = this;

      // Connect sub-models if present
      if (t.has('leaves')) {
        UI.containedModel(t, 'leaves', Backbone.Collection);
      }
      if (t.has('branches')) {
        UI.containedModel(t, 'branches', Tree.List);
      }
    },

    /*
    * Get a tree node by path
    *
    * @method getByPath
    * @param path {String | Array} Path to the node (Path parts, or a string with '/' separators)
    * @return {Backbone.Model} The node at the specified path (or null if it doesn't exist)
    */
    getByPath: function(path) {
      var t = this;

      // Get the parts
      var parts = Array.isArray(path) ? path : path.split('/').filter(function(item){return item});

      // Return the item at this level
      if (parts.length === 1) {
        return t.get('leaves').get(parts[0]);
      }

      // Return the item from the tree below
      var sub = t.get('branches').get(parts[0]);
      if (sub) {
        return sub.getByPath(parts.slice(1));
      }

      // Branch not found
      return null;
    },

    /*
    * Attach a TreeNode monitor to this node in the tree
    *
    * This watches for changes in the monitor, calling the
    * onMonitorChange method when it detects a change in the monitor.
    *
    * @method attachMonitor
    * @param monitor {Monitor} A Monitor to watch for changes on.
    */
    attachMonitor: function(monitor) {
      var t = this;

      // Detach any prior monitor
      if (t.monitor) {
        t.detachMonitor();
      }

      // Watch for changes
      t.monitor = monitor;
      t.monitor.on('change', t.onMonitorChange, t);
    },

    /*
    * Is there a monitor attached to this node?
    *
    * @method hasMonitor
    * @return monitored {boolean} True if there is a monitor on this node
    */
    hasMonitor: function() {
      var t = this;
      return t.monitor ? true : false;
    },

    /*
    * Merge monitor changes into this node.
    *
    * This can be called to synchronize the monitor contents with
    * this tree node.
    *
    * @method onMonitorChange
    */
    onMonitorChange: function() {
      var t = this,
          monitor = t.monitor;

      // Default leaves & branches when the monitor comes back
      if (!t.has('leaves')) {
        t.set('leaves',[]);
        UI.containedModel(t, 'leaves', Backbone.Collection);
      }
      if (!t.has('branches')) {
        t.set('branches',[]);
        UI.containedModel(t, 'branches', Tree.List);
      }

      // Update leaves and branches using the Backbone
      // collection update command.  This performs add/delete
      // as necessary.
      if (monitor.has('leaves')) {
        t.get('leaves').update(monitor.get('leaves'));
      }
      if (monitor.has('branches')) {
        // Use the UI.Collection.set() vs. Collection.update() to keep
        // deep event listeners in place.
        t.get('branches').set(monitor.get('branches'));
      }

    },

    /*
    * Detach the TreeNode monitor from this node in the tree
    *
    * This detaches the currently attached monitor from this tree node.
    *
    * @method detachMonitor
    */
    detachMonitor: function() {
      var t = this;

      // Detach any prior monitor
      if (t.monitor) {
        t.monitor.off('change', t.onMonitorChange, t);
        delete t.monitor;
      }
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
