// TreeView.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor'),
      UI = Monitor.UI,
      Template = UI.Template,
      Backbone = Monitor.Backbone,
      Mustache = UI.Mustache,
      _ = Monitor._;

  /**
  * Tree viewer
  *
  * This is the view for a <a href="Tree.html">Tree</a> data model.
  *
  * The model state can be monitored and set while viewing.
  *
  * @class TreeView
  * @extends Backbone.View
  * @constructor
  * @param options {Object} Initialization options (in addition to Backbone.View)
  *     @param [options.parentPath=''] {String} Path to the parent node
  *     @param [options.pathSeparator='/'] {String} Path separator string
  *
  */
  var TreeView = UI.TreeView = Backbone.View.extend({

    // For Backbone.View
    tagName:  "ol",
    className:  "nm-tr",

    template: {
      branch: Mustache.compile('<li class="branch {{isOpen}}"><i class="{{{caret}}}"></i><span>{{{label}}}</span></li>'),
      leaf: Mustache.compile('<li class="leaf">{{{label}}}</li>'),
      inner: Mustache.compile('<li class="inner"></li>'),
    },

    events: {
      "click .branch":    "onOpenClose"
    },

    initialize: function(options) {
      var t = this;
      t.model.bind('change', t.render, t);

      // Default to a relative filesystem type path
      options.parentPath = options.parentPath || '';
      options.pathSeparator = options.pathSeparator || '/';
    },

    render: function() {
      var t = this,
          params = {};
      t.$el.html('');

      // Output the branches first
      t.model.get('branches').forEach(function(branch) {

        // Output the branch line
        var isOpen = branch.get('isOpen');
        params.isOpen = isOpen ? 'opened' : 'closed';
        params.caret = 'icon-caret-' + (isOpen ? 'down' : 'right');
        params.label = branch.get('label') || branch.get('id');
        $(t.template.branch(params))
          .appendTo(t.$el)
          .data('branch', branch);

        // Open the branch if requested
        if (isOpen) {
          var innerEl = $(t.template.inner({})).appendTo(t.$el);

          // If the branch is a placeholder, we don't have enough info
          // to create a sub-treeView.  Hopefully it will be loaded soon.
          if (branch.get('isPlaceholder')) {
            innerEl.text('Loading...');
          }

          // Not a placeholder.  Create a sub-treeView
          else {
            var parentPath = branch.get('id');
            if (t.options.parentPath) {
              parentPath = t.options.parentPath + t.options.pathSeparator + parentPath;
            }
            var treeView = new TreeView({
              model: branch,
              parentPath: parentPath,
              pathSeparator: t.options.pathSeparator
            });
            treeView.render().appendTo(innerEl);
          }
        }
      });

      // Output the leaves
      t.model.get('leaves').forEach(function(leafNode) {
        params.label = leafNode.get('label') || leafNode.get('id');
        $(t.template.leaf(params)).appendTo(t.$el);
      });

      // For chaining
      return t.$el;
    },

    // Called when the open/close icon is selected
    onOpenClose: function(e) {
      var t = this,
          branch = $(e.currentTarget).data('branch');
      branch.set('isOpen', !branch.get('isOpen'));
    },

    remove: function() {
      var t = this;
      t.model.unbind('change', t.render, t);
    }

  });

}(this));
