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
  * Instances of TreeView represent one level in a tree.  Instances of this
  * view are created and destroyed as the user navigates the tree, and as the
  * underlying model changes.
  *
  * If monitorParams are specified in the constructor, the TreeView will be
  * bound to an instance of a specific TreeProbe with those parameters.
  *
  * @class TreeView
  * @extends Backbone.View
  * @constructor
  * @param options {Object} Initialization options (in addition to Backbone.View)
  *     @param [options.path=''] {String} Path to this node
  *     @param [options.pathSeparator='/'] {String} Path separator for sub-nodes
  *     @param [options.parentView] {TreeView} Parent treeview (null=root)
  *     @param [options.monitorParams] {Object} Monitor initialization parameters
  *         if this TreeView is to be bound to a backend TreeProbe.
  *         Must include probeClass, and can include connect and init params as well
  *     @param [options.preFetch] {Boolean} If true, pre-fetch closed branches on open parents
  */
  var TreeView = UI.TreeView = Backbone.View.extend({

    // For Backbone.View
    tagName:  "ol",
    className:  "nm-tr",

    template: {
      branch: Mustache.compile('<li class="branch {{closed}}" title="{{description}}"><i class="{{{caret}}}"></i><span>{{{label}}}</span></li>'),
      leaf: Mustache.compile('<li class="leaf" data-id="{{id}}" data-path="{{path}}" title="{{description}}">{{{label}}}</li>'),
      inner: Mustache.compile('<li class="inner"></li>'),
    },

    events: {
      "click .branch":    "onOpenClose"
    },

    initialize: function(options) {
      var t = this;

      // A hash of sub-branch ID to branch TreeViews
      t.branchViews = {};

      // Default to a relative filesystem type path
      options.path = options.path || '';
      options.pathSeparator = options.pathSeparator || '/';

      // Re-render on underlying model change
      t.model.on('change', t.render, t);
    },

    // Render this level of the tree
    render: function() {
      var t = this,
          branchId = null,
          branches = t.model.get('branches'),
          leaves = t.model.get('leaves'),
          params = {};

      // Only render if something visual has changed.  The model
      // gets change events propagated up from sub-branches which
      // may not cause visual changes.
      var visualHash = t.getVisualHash();
      if (visualHash === t.visualHash) {
        return;
      }
      t.visualHash = visualHash;

      // Remove visual artifacts from this level down
      for (branchId in t.branchViews) {
        t.branchViews[branchId] && t.branchViews[branchId].remove();
      }
      t.branchViews = {};
      t.$el.html('');

      // Output the leaves
      leaves && leaves.forEach(function(leafNode) {
        params.id = leafNode.get('id');
        params.label = leafNode.get('label') || params.id;
        params.description = leafNode.get('description');
        params.path = t.options.path + t.options.pathSeparator + params.id;
        var leafElem = $(t.template.leaf(params)).appendTo(t.$el);

        // Add a tooltip for the description
        if (params.description) {
          UI.tooltip(leafElem, {placement:'right'});
        }
      });

      // Render the branches (directories)
      branches && branches.forEach(function(branch) {

        // Get the branch ID
        branchId = branch.get('id');

        // Output the branch line
        var isOpen = branch.get('isOpen');
        params.closed = isOpen ? '' : 'closed';
        params.caret = 'icon-caret-' + (isOpen ? 'down' : 'right');
        params.label = branch.get('label') || branchId;
        params.description = branch.get('description');
        var branchElem = $(t.template.branch(params))
          .appendTo(t.$el)
          .data('branch', branch);

        // Add a tooltip for the description
        if (params.description) {
          UI.tooltip(branchElem, {placement:'right'});
        }

        // Attach a sub-TreeView to the branch
        var innerEl = $(t.template.inner({})).appendTo(t.$el);
        var subPath = t.options.path + t.options.pathSeparator + branchId;
        var treeView = new TreeView({
          model: branch,
          parentView:t,
          monitorParams: t.options.monitorParams,
          path: subPath,
          pathSeparator: t.options.pathSeparator,
          preFetch: t.options.preFetch
        });
        treeView.render().appendTo(innerEl);

        // Remember inner branch view
        t.branchViews[branchId] = treeView;
      });

      // Connect a monitor to this node
      t.connectMonitor();

      // For chaining
      return t.$el;
    },

    // Return a hash code representing the visual state of the
    // underlying data model.  This is compared with subsequent
    // states to prevent too much re-rendering.
    getVisualHash: function() {
      var t = this,
          branches = t.model.get('branches'),
          leaves = t.model.get('leaves'),
          hash = "";

      // The hash is the text of the branches & leaves
      branches && branches.forEach(function(node) {
        var label = node.get('label') || node.id,
            description = node.get('description');
        hash += '|' + label;
        if (description) {
          hash += '|' + description;
        }
      });

      // The hash is the text of the branches & leaves
      leaves && leaves.forEach(function(node) {
        var label = node.get('label') || node.id,
            description = node.get('description');
        hash += '|' + label;
        if (description) {
          hash += '|' + description;
        }
      });

      // Return the hash
      return hash;
    },

    // Determine if we should connect a monitor to the node, and
    // connect if necessary.
    connectMonitor: function() {
      var t = this,
          branches = t.model.get('branches'),
          leaves = t.model.get('leaves');

      // Determine if we should connect a monitor to this node
      //
      // Connect a monitor if:
      // * There isn't one already connected, and
      // * There's a monitor definition available, and
      // * We're open, or
      // *   preFetch is selected, and
      // *     we have no parent or our parent is open
      //
      // ** Is there any way to make this logic simpler?
      var shouldConnect = !t.model.hasMonitor()
        && t.options.monitorParams
        && (t.model.get('isOpen')
          || (t.options.preFetch
            && (!t.options.parentView
              || t.options.parentView.model.get('isOpen'))));

      // Connect to the monitor if we've determined we should
      if (shouldConnect) {

        // If there isn't any model data to display, show Loading...
        if (!branches || !leaves) {
          t.loading = $('<li>Loading...</li>').appendTo(t.$el);
        }

        // Build and connect the Monitor
        var initParams = _.extend(
          {},
          t.options.monitorParams.initParams || {},
          {path:t.options.path}
        );
        var monitorParams = _.extend(
          {},
          t.options.monitorParams,
          {initParams: initParams}
        );
        t.monitor = new Monitor(monitorParams);
        t.model.attachMonitor(t.monitor);

        // Connect the monitor and process errors.  Successes will change
        // the underlying data model (or not), causing a re-render.
        t.monitor.connect(function(error) {

          // Remove the Loading... message
          if (t.loading) {
            t.loading.remove();
            t.loading = null;
          }

          // Handle errors
          if (error) {
            $('<li>(connection problem)</li>').appendTo(t.$el);
            console.error('TreeView monitor connection problem:', error, t.monitor);

            // Detach the problem monitor so it'll have another chance
            // if the user opens/closes the branch.
            t.model.detachMonitor();
          }

        });
      }
    },

    // Called when the open/close icon is selected.
    onOpenClose: function(e) {
      var t = this,
          branchElem = $(e.currentTarget),
          icon = branchElem.find('i'),
          subElem = branchElem.find('+li'),
          wasClosed = branchElem.hasClass('closed'),
          branchModel = $(e.currentTarget).data('branch'),
          branchId = branchModel.get('id');

      // Persist the open/closed state in the model
      branchModel.set('isOpen', wasClosed);

      // Animate the height.  Can't do CSS animations, because CSS
      // requires specific start/end points, and can't animate from
      // height:auto to height:0px.
      if (wasClosed) {
        var subElemHeight = subElem.css({height:'auto'}).height();
        subElem.css({height:0});
        branchElem.toggleClass('closed', false);
        subElem.animate({height:subElemHeight}, 200, function(){
          subElem.css({height:'auto'});

          // Pre-fetch sub-branches after animation
          if (t.options.preFetch) {
            for (var subBranchId in t.branchViews[branchId].branchViews) {
              t.branchViews[branchId].branchViews[subBranchId].connectMonitor();
            }
          }

        });
        icon.attr({class:"icon-caret-down"});

        // Tell this branch view to connect the monitor if necessary
        t.branchViews[branchId].connectMonitor();
      } else {
        subElem.animate({height:0}, 200, function() {
          branchElem.toggleClass('closed', true);
        });
        icon.attr({class:"icon-caret-right"});
      }
      e.stopPropagation();
    },

    remove: function() {
      var t = this;
      t.model.off('change', t.render, t);

      // Clear any prior elements
      for (branchId in t.branchViews) {
        t.branchViews[branchId].remove();
      }
      delete t.branchViews;
    }

  });

}(this));
