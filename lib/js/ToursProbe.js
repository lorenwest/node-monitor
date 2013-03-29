// ToursProbe.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('monitor-min'),
      PagesProbe = Monitor.PagesProbe;

  // Define some constants
  var CONST = {
    objectClass: 'Tour',
    appLabel: 'App Tours',
    appDescription: 'Application Tours'
  };

  /**
  * This probe represents the list of tours available on the site
  *
  * @class ToursProbe
  * @extends TreeProbe
  * @constructor
  * @param [initParams] - Probe initialization parameters
  *     @param [initParams.path=''] {String} Path to this node
  */
  var ToursProbe = Monitor.ToursProbe = PagesProbe.extend({

    probeClass: 'ToursProbe',

    /**
    * Constructor initialization.
    *
    * @method initialize
    */
    initialize: function(attributes, options){
      var t = this;

      // Override instance level constants
      t.CONST = CONST;

      // This is the same as a PagesProbe except for the constants (above)
      PagesProbe.prototype.initialize.apply(t, arguments);
    }

  });

}(this));
