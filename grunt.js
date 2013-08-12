// grunt.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For all details and documentation:
// http://lorenwest.github.com/node-monitor

var exec = require('child_process').exec;

// This is used in the build automation tasks, and on the server
// when running in dev mode to serve individual files for debugging.
var MODULE_DEF = {
  server_js: [
    "lib/js/NetworkMap.js",
    "lib/js/Server.js",
    "lib/js/TreeProbe.js",
    "lib/js/PagesProbe.js",
    "lib/js/ToursProbe.js"
  ],
  client_js: [
    "lib/js/UI.js",
    "lib/js/Template.js",
    "lib/js/Site.js",
    "lib/js/Component.js",
    "lib/js/Page.js",
    "lib/js/Tree.js",
    "lib/js/Tour.js",
    "lib/js/IconChooser.js",
    "lib/js/DropDownMenu.js",
    "lib/js/JsonView.js",
    "lib/js/TreeView.js",
    "lib/js/MonitorPicker.js",
    "lib/js/SettingsView.js",
    "lib/js/NewComponentView.js",
    "lib/js/ComponentSettingsView.js",
    "lib/js/ComponentView.js",
    "lib/js/PageSettingsView.js",
    "lib/js/PageView.js",
    "lib/js/Sidebar.js",
    "lib/js/SidebarView.js",
    "lib/js/TourView.js",
    "lib/js/TourSettingsView.js"
  ],
  templates: [
    "lib/template/UI.html",
    "lib/template/PageView.html",
    "lib/template/PageSettings.html",
    "lib/template/PageCopy.html",
    "lib/template/SidebarView.html",
    "lib/template/TourView.html",
    "lib/template/TourSettings.html",
    "lib/template/ComponentView.html",
    "lib/template/ComponentSettings.html",
    "lib/template/NewComponentView.html",
    "lib/template/NewPage.html",
    "lib/template/NewTourPage.html",
    "lib/template/ComponentIcon.html"
  ],
  client_css: [
    "lib/css/default/bootstrap.min.css",
    "lib/css/default/font-awesome.css",
    "lib/css/default/UI.css",
    "lib/css/default/MonitorPicker.css",
    "lib/css/default/ComponentView.css",
    "lib/css/default/ComponentSettings.css",
    "lib/css/default/NewComponentView.css",
    "lib/css/default/DropDownMenu.css",
    "lib/css/default/PageView.css",
    "lib/css/default/PageSettings.css",
    "lib/css/default/SidebarView.css",
    "lib/css/default/TourView.css",
    "lib/css/default/TourSettings.css",
    "lib/css/default/JsonView.css",
    "lib/css/default/TreeView.css",
    "lib/ext/jquery.miniColors.css"
  ],
  client_ext: [
    "lib/ext/jquery-1.8.2.min.js",
    "lib/ext/monitor-min-all.js",
    "lib/ext/Backbone.ModelBinder.min.js",
    "lib/ext/bootstrap.min.js",
    "lib/ext/bootstrap-tooltip.js",
    "lib/ext/bootstrap-dropdown.js",
    "lib/ext/bootstrap-modal.js",
    "lib/ext/bootstrap-alert.js",
    "lib/ext/mustache-0.7.0-dev.js",
    "lib/ext/jquery.miniColors.min.js"
  ]
};

// Build automation tasks
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: '<json:package.json>',
    module: MODULE_DEF,
    lint: {
      files: ['grunt.js', '<config:module.server_js>', '<config:module.client_js>', 'test/**/*.js']
    },
    test: {
      files: ['test/**/*.js']
    },
    watch: {
      files: ['grunt.js', '<config:module.server_js>', '<config:module.client_js>', 'test/**/*.js'],
      tasks: 'default'
    },
    min: {
      ui: {
        src: ['<config:monitor.lib>', '<config.monitor.ui>'],
        dest: '/tmp/monitor-base-min.js'
      },
      css: {
        src: ['ui/client/css/all.css'],
        dest: 'ui/client/css/all.min.css'
      }
    },
    concat: {
      ui: {
        src: ['<config:monitor.ext>', '/tmp/monitor-base-min.js'],
        dest: 'ui/client/src/monitor-min.js'
      },
      css: {
        src: ['<config:monitor.css>'],
        dest: 'ui/client/css/all.css'
      }
    },
    jshint: {
      options: {
        strict: false,
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        node: true
      },
      globals: {
        exports: true
      }
    }
  });

  grunt.registerTask('doc', 'Generate documentation files', function() {
    var t = this, done = t.async(), child;
    child = exec('yuidoc -c ./yuidoc.json', function (error, stdout, stderr) {
      console.log(stderr);
      console.log(stdout);
      done();
    });
  });

  // Default task.
  grunt.registerTask('default', 'doc lint test');
  grunt.registerTask('dist', 'min:ui concat:ui concat:css');

};

// Expose externally
module.exports.MODULE_DEF = MODULE_DEF;
