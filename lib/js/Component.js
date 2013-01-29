// Component.js (c) 2012 Loren West and other contributors
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
  * An element on the page canvas
  *
  * Components represent the visual elements on a page.  They contain the data
  * necessary to instantiate a Java view, and a single monitor to provide data
  * to the view.
  *
  * A component contains and persists information required to instantiate, position,
  * and connect a Backbone View with a Monitor (as the data model for the view).
  *
  * @class Component
  * @extends Backbone.Model
  * @constructor
  * @param model - Initial data model.  Can be a JS object or another Model.
  *     @param model.id {String} - Name of the component within the form
  *     @param model.viewClass {String} - Class name of the view (must be exposed on the Monitor.UI class)
  *     @param model.viewOptions {Backbone.Model} - Options passed on to the view constructor
  *         @param model.viewOptions.title {String} - Component title to display
  *         @param model.viewOptions.background {boolean} - Display the component background?
  *     @param model.monitor {Monitor} - The monitor attached to the component (always there)
  *     @param model.css {Object} - Map of CSS selector to CSS styles to apply to the component
  *     @param model.notes {String} - Notes associated with the view
  *     @param model.onInit {String} - JavaScript to run when the view and monitor model have been initialized and rendered.
  *       The JS has access to the local variables:
  *         view - The rendered view object
  *         monitor - The Monitor object
  *         pageView - The PageView object representing the web page
  *       ```this``` is the ComponentView object.
  */
  var Component = UI.Component = Backbone.Model.extend({

    defaults: {
      id:'',
      viewClass:'',
      viewOptions:{},
      monitor: {},
      css:{},
      notes:'',
      onInit: ''
    },

    initialize: function(params, options) {
      var t = this;

      // Attach sub-model containment
      UI.containedModel(t, 'viewOptions', Backbone.Model);
      UI.containedModel(t, 'monitor', Monitor);
    },

    /**
    * Set the default component size
    *
    * This will add CSS to set the component size if it hasn't already been set.
    *
    * @method setDefaultSize
    * @param size {Object}
    *     @param size.height {Integer} Default height
    *     @param size.width {Integer} Default width
    */
    setDefaultSize: function(size) {
      var t = this,
          css = _.clone(t.get('css')),
          parsedCss = $.parseStyleString(css['.nm-cv-viewport'] || '');
      if (!parsedCss.height && !parsedCss.width) {
        parsedCss.height = size.height + 'px';
        parsedCss.width = size.width + 'px';
        css['.nm-cv-viewport'] = $.makeStyleString(parsedCss);
        t.set({css: css});
      }
    },

    // Overridden to produce only the persistent portion of the page
    toJSON: function(options) {
      var t = this,
          opts = _.extend({trim:true, deep:true, monitorOnly:true}, options),
          raw = Backbone.Model.prototype.toJSON.call(t, opts);

      // Keep only the monitor portion (strip the probe portion)?
      if (opts.monitorOnly) {
        raw.monitor = t.get('monitor').toMonitorJSON(opts);
      }
      return raw;
    }


  });

  /**
  * Constructor for a list of Component objects
  *
  *     var myList = new Component.List(initialElements);
  *
  * @static
  * @method List
  * @param [items] {Array} Initial list items.  These can be raw JS objects or Component data model objects.
  * @return {Backbone.Collection} Collection of Component data model objects
  */
  Component.List = Backbone.Collection.extend({model: Component});

}(this));
