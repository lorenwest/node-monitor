// Site.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor'),
      UI = Monitor.UI,
      Backbone = Monitor.Backbone, _ = Monitor._;

  /**
  * This represents the Node.js Monitor web site
  *
  * @class Site
  * @extends Backbone.Model
  * @constructor
  * @param model - Initial data model.  Can be a JS object or another Model.
  *     @param [model.name] {String} The site name
  *     @param [model.logo] {String} URL to the site logo
  *     @param [model.favicon] {String} URL to the favicon
  *     @param [model.css] {String} CSS overrides to apply to all pages
  */
  var Site = UI.Site = Backbone.Model.extend({

    defaults: {
      id: 'default',
      name:'Node Monitor',
      logo:'/static/css/default/images/monitor.jpg',
      favicon: '/static/css/default/images/favicon.ico',
      css: ''
    },
    sync: new Monitor.Sync('Site')

  });

}(this));
