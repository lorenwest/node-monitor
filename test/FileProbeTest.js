// FileProbeTest.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // This should be run before other tests to set up configurations
  process.env.NODE_ENV='test';
  var config = require('config');

  // Dependencies
  var Monitor = require('../lib/index'),
      Path = require('path'),
      FS = require('fs'),
      FileProbe = Monitor.FileProbe,
      Backbone = Monitor.Backbone, _ = Monitor._;

  // Constants
  var TEST_ROOT_PATH = __dirname + '/fileTestData',
      TEST_FILE_RELATIVE_PATH = 'testdir/testfile1.json',
      TEST_FILE_FULL_PATH = Path.join(TEST_ROOT_PATH, TEST_FILE_RELATIVE_PATH),
      TEST_FILE_DIR = Path.dirname(TEST_FILE_FULL_PATH),
      TEST_OBJECT = {
        testNumber:1,
        testString:"two",
        testObject:{some:"sub_object"},
        testArray:[1, "two", 3]
      },
      JSON_CONTENT = JSON.stringify(TEST_OBJECT, null, 2);

  // Old style watch takes *forever* to connect
  var OLD_WATCHER_CONNECT_MS = 1000,
      NEW_WATCHER_CONNECT_MS = 10,
      WATCH_CONNECT_TIME = FS.watch ? NEW_WATCHER_CONNECT_MS : OLD_WATCHER_CONNECT_MS;

  /**
  * Unit tests for the <a href="FileProbe.html">File</a> probe.
  * @class FileProbeTest
  */

  /**
  * Test group for baseline FileProbe functionality
  *
  * @method FileProbe
  */
  module.exports['FileProbe'] = {

    /**
    * Tests that classes are in correct
    * @method FileProbe-Classes
    */
    Classes: function(test) {
      test.ok(FileProbe.prototype instanceof Backbone.Model, 'The data model is in place');
      test.ok(FileProbe.prototype instanceof Monitor.Probe, 'It is a probe');
      test.done();
    },

    /**
    * Tests that public static methods are in place
    * @method FileProbe-Static
    */
    Static: function(test) {
      test.equal(typeof FileProbe.setRootPath, 'function');
      test.equal(typeof FileProbe.getRootPath, 'function');
      test.equal(typeof FileProbe.rm_rf, 'function');
      test.equal(typeof FileProbe.mkdir_r, 'function');
      test.equal(typeof FileProbe.watch, 'function');
      test.equal(typeof FileProbe.watchLoad, 'function');
      test.equal(typeof FileProbe.tail, 'function');
      test.done();
    }

  };

  /**
  * Test group for static file/directory utilities
  *
  * @method Utils
  */
  module.exports['Utils'] = {

    /**
    * Test the mkdir_r utility
    * @method Utils-Mkdir_R
    */
    Mkdir_R: function(test) {
      FileProbe.mkdir_r(TEST_FILE_DIR, function(error) {
        test.ok(!error, 'Mkdir-r error ' + JSON.stringify(error));
        var status = FS.statSync(TEST_FILE_DIR);
        test.ok(status.isDirectory(), "Recursive mkdir created all directories");
        test.done();
      });
    },

    /**
    * Test the rm_rf utility
    * @method Utils-Rm_Rf
    */
    Rm_Rf: function(test) {
      // Make a test directory structure
      FileProbe.mkdir_r(TEST_FILE_DIR, function(error) {
        var status = FS.statSync(TEST_FILE_DIR);
        test.ok(status.isDirectory(), "Recursive mkdir created all directories");

        // Make a bunch of files in the lowest directory
        for (var i = 0; i < 10; i++) {
          FS.writeFileSync(TEST_FILE_FULL_PATH + i, JSON_CONTENT);
        }

        // Remove everything from the test root
        FileProbe.rm_rf(TEST_ROOT_PATH, function(err1) {
          test.ok(!err1, "rm_rf error: " + err1);
          FS.readdir(TEST_FILE_DIR, function(err2, files) {
            test.ok(err2, "Readdir correctly reported an error on no directory");
            test.equal(err2.code, 'ENOENT', "Directory and all sub-files removed correctly");
            test.done();
          });
        });
      });
    },

    /**
    * Tests the file watch functionality
    * @method Utils-Watch
    */
    Watch: function(test) {
      // Create a file
      FileProbe.mkdir_r(TEST_FILE_DIR, function(err) {
        test.ok(!err, 'Made the test directory');
        writeTestFile();

        // Get a watcher on the file
        var watcher = FileProbe.watch(TEST_FILE_FULL_PATH, {persistent:true}, function(){
          test.ok(true, "File change detected");
          watcher.close();
          FileProbe.rm_rf(TEST_ROOT_PATH, function(){
            test.done();
          });
        });

        // Wait for the O/S to start watching, then change the file
        writeTestFile("new", WATCH_CONNECT_TIME);
      });
    },

    /**
    * Tests the polling style file watching mechanism
    * @method Utils-PollingWatcher
    */
    PollingWatcher: function(test) {
      // Create a file
      FileProbe.mkdir_r(TEST_FILE_DIR, function(err) {
        test.ok(!err, 'Made the test directory');
        writeTestFile();

        // Test the old-style watching
        var watcher = FileProbe.watch(TEST_FILE_FULL_PATH, {persistent:true, pollStyle:true}, function(){
          test.ok(true, "File change detected");
          watcher.close();
          FileProbe.rm_rf(TEST_ROOT_PATH, function(){
            test.done();
          });
        });

        // Wait long enough for the old-style watcher to connect
        writeTestFile('new', OLD_WATCHER_CONNECT_MS);
      });
    },

    /**
    * Tests the watchLoad functionality
    * @method Utils-WatchLoad
    */
    WatchLoad: function(test) {
      // Create a file
      FileProbe.mkdir_r(TEST_FILE_DIR, function(err) {
        test.ok(!err, 'Made the test directory');
        writeTestFile();

        // Test with initial preload
        var watchCount = 0;
        var watcher = FileProbe.watchLoad(TEST_FILE_FULL_PATH, {persistent:true, preload:true}, function(err1, content){
          test.ok(!err1, "watchLoad error: " + err1);
          watchCount++;
          if (watchCount === 1) {
            test.equal(content, JSON_CONTENT, "Initial file contents preloaded");

            // Test with subsequent file write
            writeTestFile("extra", WATCH_CONNECT_TIME);
          } else if (watchCount === 2) {
            test.equal(content, JSON_CONTENT + "extra", "Subsequent content loaded after update");
            watcher.close();
            FileProbe.rm_rf(TEST_ROOT_PATH, function(){
              test.done();
            });
          }
        });
      });
    }

  };

  /**
  * Test group for File based probe functionality
  *
  * @method Probe
  */
  module.exports['Probe'] = {

    // Create the test directory and file
    setUp: function(callback) {
      FileProbe.mkdir_r(TEST_FILE_DIR, function(err) {
        writeTestFile();
        callback();
      });
    },

    // Remove the test directory
    tearDown: function(callback) {
      FileProbe.rm_rf(TEST_ROOT_PATH, function(){
        callback();
      });
    },

    /**
    * Tests the ROOT_PATH functionality
    * @method Probe-RootPath
    */
    RootPath: function(test) {
      // Only perform tests if root path hasn't been set
      if (FileProbe.getRootPath() === null) {
        FileProbe.setRootPath(TEST_ROOT_PATH);
        test.equal(FileProbe.getRootPath(), TEST_ROOT_PATH);
        try {
          FileProbe.setRootPath('/');
          test.ok(false, "This line shouldn't be reached");
        }
        catch (e) {
          test.ok(true, "Root path correctly disallowed changes");
        }
      }
      test.done();
    },

    /**
    * This tests the File probe initializes properly
    * @method Probe-Init
    */
    Init: function(test) {

      // Build and connect the file monitor
      var fileMonitor = new Monitor({
        probeClass: "File",
        initParams: {path: TEST_FILE_RELATIVE_PATH}
      });
      fileMonitor.connect(function(){

        // Make sure the initial content is correct
        test.equal(fileMonitor.get("text"), JSON_CONTENT, "File content is correct");

        // Watch for file changes after first change event
        process.nextTick(function(){
          fileMonitor.on('change', function() {
            test.equal(fileMonitor.get("text"), JSON_CONTENT + 'altered', "Altered file content is correct");
            fileMonitor.off('change');
            fileMonitor.disconnect();
            test.done();
          });
        });

        // Alter the file
        writeTestFile('altered', WATCH_CONNECT_TIME);
      });
    }
  };

  /**
  * Write the test file to disk, with possible appendage
  *
  * @static
  * @method writeTestFile
  * @param append {String} String to append onto the standard test file
  * @param wait {Integer} Number of milliseconds to wait before writing
  */
  function writeTestFile(append, wait) {
    var content = append ? JSON_CONTENT + append : JSON_CONTENT;
    if (wait) {
      setTimeout(function(){
        FS.writeFileSync(TEST_FILE_FULL_PATH, content);
      }, wait);
    } else {
      FS.writeFileSync(TEST_FILE_FULL_PATH, content);
    }
  }

}(this));
