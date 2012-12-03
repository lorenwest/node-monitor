// Page.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor'),
      UI = Monitor.UI,
      Component = UI.Component,
      Backbone = Monitor.Backbone, _ = Monitor._;

  /**
  * A page on the node_monitor site
  *
  * All pages on the node_monitor site are dynamically defined, and represented
  * by an instance of this class.
  *
  * @class Page
  * @extends Backbone.Model
  * @constructor
  * @param model - Initial data model.  Can be a JS object or another Model.
  *     @param model.id {String} The page url within the site
  *     @param [model.title] {String} The page title
  *     @param [model.description] {String} Description of the page
  *     @param [model.notes] {String} Page notes
  *     @param model.onInit {String} - JavaScript to run when the Page model and PageView have been initialized and rendered.
  *       The JS has access to two local variables: pageModel and pageView.
  *     @param [model.css] {Object} - Key/value map of CSS selector to CSS overrides to apply to the entire page
  *     @param [model.components] {Component.List} - List of components on the page
  */
  var Page = UI.Page = Backbone.Model.extend({

    defaults: {
      id:'',
      title:'',
      description:'',
      notes:'',
      onInit:'',
      css:{},
      components:[]
    },
    sync: new Monitor.Sync('Page'),

    initialize: function(params, options) {
      var t = this;
      UI.containedModel(t, 'components', Component.List);
    },

    /**
    * Add a new component to the Page model by component class
    *
    * This uses the default component attributes
    *
    * @method addComponent
    * @param viewClass - Class name for the main view in the component
    * @return component - The newly instantiated component
    */
    addComponent: function(viewClass) {
      var t = this,
          newIdNum = 1,
          components = t.get('components'),
          classParts = viewClass.split('.'),
          appName = classParts[0],
          appView = classParts[1];

      // Instantiate and add the component
      var component = new Component({
        id: Monitor.generateUniqueCollectionId(components, 'c'),
        viewClass: viewClass,
        viewOptions: UI.app[appName][appView].prototype.defaultOptions,
        css: {
          '.nm-cv': 'top:10px;'
        }
      });
      components.add(component);
      return component;
    },

    // Overridden to override some options
    toJSON: function(options) {
      var t = this,
          opts = _.extend({trim:true, deep:true}, options),
          raw = Backbone.Model.prototype.toJSON.call(t, opts);
      return raw;
    }

  });

  /**
  * Constructor for a list of Page objects
  *
  *     var myList = new Page.List(initialElements);
  *
  * @static
  * @method List
  * @param [items] {Array} Initial list items.  These can be raw JS objects or Page data model objects.
  * @return {Backbone.Collection} Collection of Page data model objects
  */
  Page.List = Backbone.Collection.extend({model: Page});

}(this));
