// index.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  /*
  * Entry point for commonJS style loading
  *
  * This file coordinates the loading of modules in a consistent order
  * in a commonJS environment.
  */

  var commonJS = (typeof exports !== 'undefined');
  if (commonJS) {

    // Only load once
    if (global.Monitor) {
      module.exports = global.Monitor;
    }
    else {

      // Export the Monitor class to module and global scope to assure
      // a single load, and to match the browser-side global Monitor.
      var Monitor = global.Monitor = module.exports = require('./Monitor');

      // Attach backbone callbacks
      require('backbone-callbacks').attach(Monitor.Backbone);

      // Grunt.js contains the module definition files
      var MODULE_DEF = require('../grunt.js').MODULE_DEF;

      // Load local library files, then server-only probes
      var allFiles = MODULE_DEF.lib.concat(MODULE_DEF.probes);
      allFiles.forEach(function(file) {require('../' + file);});
    }
  }

}(this));
