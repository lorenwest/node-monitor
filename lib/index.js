// index.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  /*
  * Entry point for commonJS style loading
  *
  * This file coordinates the loading of modules in a consistent order
  * in a commonJS environment.
  */

  var commonJS = (typeof exports !== 'undefined');
  if (commonJS) {

    // Grunt.js contains the module definition files
    var MODULE_DEF = require('../grunt.js').MODULE_DEF;

    // Load external commonJS modules
    var Monitor = module.exports = require('monitor');

    // Attach backbone callbacks
    require('backbone-callbacks').attach(Monitor.Backbone);

    // Files in this module.  Client files first then server files.
    var allFiles = MODULE_DEF.client_js.concat(MODULE_DEF.server_js);
    allFiles.forEach(function(file) {
      require('../' + file);
    });
  }

}(this));
