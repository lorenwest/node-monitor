// grunt.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For all details and documentation:
// http://lorenwest.github.com/node-monitor

var exec = require('child_process').exec;

// This is used in the build automation tasks, and on the server
// when running in dev mode to serve individual files for debugging.
var MODULE_DEF = {
  lib: [
    "lib/Monitor.js",
    "lib/Stat.js",
    "lib/Log.js",
    "lib/Probe.js",
    "lib/Connection.js",
    "lib/Server.js",
    "lib/Router.js",
    "lib/Sync.js",
    "lib/probes/DataModelProbe.js",
    "lib/probes/RecipeProbe.js",
    "lib/probes/PollingProbe.js",
    "lib/probes/StreamProbe.js",
    "lib/probes/InspectProbe.js",
    "lib/probes/StatProbe.js",
    "lib/probes/LogProbe.js"
  ],
  ext: [
    "node_modules/underscore/underscore.js",
    "node_modules/backbone/backbone.js",
    "node_modules/backbone-callbacks/backbone-callbacks.js",
    "node_modules/socket.io-client/dist/socket.io.js"
  ],
  probes: [
    "lib/probes/FileProbe.js",
    "lib/probes/ReplProbe.js",
    "lib/probes/ProcessProbe.js",
    "lib/probes/SyncProbe.js",
    "lib/probes/FileSyncProbe.js"
  ]
};

// Build automation tasks
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: '<json:package.json>',
    monitor: MODULE_DEF,
    meta: {
      banner: '/* <%= pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %> */'
    },
    lint: {
      files: ['grunt.js', '<config:monitor.lib>', '<config:monitor.probes>', 'test/*.js']
    },
    test: {
      files: ['test/*.js']
    },
    watch: {
      files: ['grunt.js', 'yuidoc.json', '<config:monitor.lib>', '<config:monitor.probes>', 'config/doc/**', 'test/*.js'],
      tasks: 'doc lint test'
    },
    concat: {
      lib: {
        src: ['<banner>', '<config:monitor.lib>'],
        dest: './dist/monitor.js'
      },
      all: {
        src: ['<banner>', '<config:monitor.ext>', '<config:monitor.lib>'],
        dest: './dist/monitor-all.js'
      }
    },
    min: {
      lib: {
        src: ['<banner>', './dist/monitor.js'],
        dest: './dist/monitor.min.js'

      },
      all: {
        src: ['<banner>', './dist/monitor-all.js'],
        dest: './dist/monitor-all.min.js'
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
    var t = this, done = t.async(), child, version = grunt.config.get('pkg').version;
    var cmd = 'yuidoc --project-version ' + version;
    console.log(cmd);
    child = exec(cmd, function (error, stdout, stderr) {
      console.log(stderr);
      console.log(stdout);
      cmd = 'cp -R doc/* ../node-monitor-pages/doc; rm -rf doc';
      console.log(cmd);
      child = exec(cmd, function (error, stdout, stderr) {
        console.log(stderr);
        console.log(stdout);
        done();
      });
    });
  });

  grunt.registerTask('rm_dist', 'Remove distribution files', function() {
    var t = this, done = t.async(), child;
    child = exec('rm -f dist/*', function (error, stdout, stderr) {
      console.log(stderr);
      console.log(stdout);
      done();
    });
  });

  // Default task.
  grunt.registerTask('default', 'doc lint test dist');
  grunt.registerTask('dist', 'rm_dist concat:lib concat:all min:lib min:all');

};

// Expose externally
module.exports.MODULE_DEF = MODULE_DEF;
