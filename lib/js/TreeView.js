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
      leaf: Mustache.compile('<li class="leaf" data-id="{{id}}">{{{label}}}</li>'),
      inner: Mustache.compile('<li class="inner"></li>'),
    },

    events: {
      "click .branch":    "onOpenClose"
    },

    initialize: function(options) {
      var t = this;
      t.model.on('change', t.onModelChange, t);
      t.subViews = [];

      // Default to a relative filesystem type path
      options.parentPath = options.parentPath || '';
      options.pathSeparator = options.pathSeparator || '/';
    },

    render: function() {
      var t = this,
          params = {};

      // Clear any prior elements
      t.subViews.forEach(function(subView){
        subView.remove();
      });
      t.subViews = [];
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
              parentView:t,
              parentPath: parentPath,
              pathSeparator: t.options.pathSeparator
            });
            treeView.render().appendTo(innerEl);
            t.subViews.push(treeView);
          }
        }
      });

      // Output the leaves
      t.model.get('leaves').forEach(function(leafNode) {
        params.id = leafNode.get('id');
        params.label = leafNode.get('label') || params.id;
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
      e.stopPropagation();
    },

    // Called when the data model changes
    onModelChange: function(model, options) {
      var t = this;

      // Tell my parent view not to render
      if (t.options.parentView) {
        t.options.parentView.skipRender = true;
      }

      // Re-render (unless I've been told not to by a child that already re-rendered)
      if (t.skipRender) {
        t.skipRender = false;
      } else {
        if (t.options.parentView) {
console.log("Rendering parent view on model change: " + t.options.parentView.model.id);
          t.options.parentView.render();
        } else {
console.log("Rendering base view on model change: " + t.model.id);
          t.render();
        }
      }
    },

    remove: function() {
      var t = this;
      t.model.off('change', t.onModelChange, t);

      // Clear any prior elements
      delete t.options;
      t.subViews.forEach(function(subView){
        subView.remove();
      });
      t.subViews = [];
      t.$el.html('');
    }

  });

}(this));
