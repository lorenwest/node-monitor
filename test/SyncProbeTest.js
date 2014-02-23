// SyncProbeTest.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // This should be run before other tests to set up configurations
  process.env.NODE_ENV='test';
  var config = require('config');

  // Dependencies
  var Monitor = require('../lib/index'),
      Backbone = Monitor.Backbone,
      _ = Monitor._,
      Path = require('path'),
      FS = require('fs'),
      Sync = Monitor.Sync,
      FileProbe = Monitor.FileProbe,
      SyncProbe = Monitor.SyncProbe,
      FileSyncProbe = SyncProbe.FileSyncProbe;

  // Constants
  var TEST_FILE_DIR = FileSyncProbe.getRootPath() || __dirname + '/syncProbeTest',
      TEST_OBJECT = {
        testNumber:1,
        testString:"two",
        testObject:{some:"sub_object"},
        testArray:[1, "two", 3]
      },
      TEST_ID  = '228237-a',
      JSON_CONTENT = JSON.stringify(TEST_OBJECT, null, 2),
      TEST_MODEL = new Backbone.Model(TEST_OBJECT),
      LIVE_SYNC_CLASS = Backbone.Model.extend({
        sync: new Sync('LiveSyncTest')
      });

  // Old style watch takes *forever* to connect
  var WATCH_CONNECT_TIME = 1200;

  // Initialize the server-side sync probes
  var DEFAULT_PROBE_NAME = 'FileSyncProbe';
  SyncProbe.Config.defaultProbe = DEFAULT_PROBE_NAME;
  FileSyncProbe.setRootPath(TEST_FILE_DIR);

  /**
  * Unit tests for the <a href="SyncProbe.html">SyncProbe</a> probe.
  * @class SyncProbeTest
  */

  /**
  * Test group for baseline SyncProbe functionality
  *
  * @method SyncProbe
  */
  module.exports['SyncProbe'] = {

    /**
    * Tests that classes are in correct
    * @method SyncProbe-Classes
    */
    Classes: function(test) {
      test.ok(SyncProbe.prototype instanceof Backbone.Model, 'The data model is in place');
      test.ok(SyncProbe.prototype instanceof Monitor.Probe, 'It is a probe');
      test.done();
    },

    /**
    * The server decides what specific type of SyncProbe to instantiate
    * for classes of data models.  When a SyncProbe is requested, the
    * SyncProbe instance becomes an instance of a specific type.  This
    * tests that this coersion is made.
    *
    * @method SyncProbe-Coerce
    */
    Coerce: function(test) {
      var probe = new SyncProbe({className:'Book'},{});
      test.equal(probe.probeClass, DEFAULT_PROBE_NAME, 'The SyncProbe was successfully coerced into a ' + DEFAULT_PROBE_NAME + ' probe.');
      test.equal(probe.get('className'), 'Book', 'The probe instance is correctly set.');
      test.done();
    }

  };

  /**
  * Test group for base Sync (non LiveSync) probe usage
  *
  * @method BaseSync
  */
  module.exports['BaseSync'] = {

    /**
    * One time setup for BaseSync tests
    * @method BaseSync-SetUp
    */
    SetUp: function(test) {
      // Clear the directory
      FileProbe.rm_rf(TEST_FILE_DIR, function(error) {
        FileProbe.mkdir_r(TEST_FILE_DIR, function(error) {
          test.ok(!error, "Able to create the test directory");
          test.done();
        });
      });
    },

    /**
    * Tests that a new object without an ID gets an ID assigned
    * @method BaseSync-CreateWitoutId
    */
    CreateWithoutId: function(test) {
      test.ok(TEST_MODEL.isNew(), "The test model is a new object");
      TEST_MODEL.sync = new Sync('Test');
      TEST_MODEL.save({}, function(error, result){
        test.ok(!error, 'CreateId save error: ' + JSON.stringify(error));
        test.ok(TEST_MODEL.has('id'), "An ID was generated for the new object");
        test.done();
      });
    },

    /**
    * Tests that a new object with an ID gets saved
    * @method BaseSync-CreateWithId
    */
    CreateWithId: function(test) {
      TEST_MODEL = new Backbone.Model(TEST_OBJECT);
      test.ok(TEST_MODEL.isNew(), "The test model is a new object");
      TEST_MODEL.sync = new Sync('Test');
      TEST_MODEL.save({id: 'some/path'}, function(error, result){
        test.ok(!error, 'CreateWithId save error: ' + JSON.stringify(error));
        test.done();
      });
    },

    /**
    * Tests that a fetch by ID works
    * @method BaseSync-FetchById
    */
    FetchById: function(test) {
      var testId = "339284";
      TEST_MODEL = new Backbone.Model(TEST_OBJECT);
      test.ok(TEST_MODEL.isNew(), "The test model is a new object");
      TEST_MODEL.sync = new Sync('Test');
      TEST_MODEL.save({id: testId}, function(error, result){
        test.ok(!error, 'FetchById save error: ' + JSON.stringify(error));

        // Now fetch it
        var newModel = new Backbone.Model({id:testId});
        newModel.sync = new Sync('Test');
        newModel.fetch(function(error) {
          test.ok(!error, 'FetchById fetch error: ' + JSON.stringify(error));
          test.deepEqual(newModel.toJSON(), TEST_MODEL.toJSON(), 'Successful fetch');
          test.done();
        });
      });
    },

    /**
    * Tests the model.destroy functionality
    * @method BaseSync-DestroyById
    */
    DestroyById: function(test) {
      var testId = "339284";
      TEST_MODEL = new Backbone.Model(TEST_OBJECT);
      test.ok(TEST_MODEL.isNew(), "The test model is a new object");
      TEST_MODEL.sync = new Sync('Test');
      TEST_MODEL.save({id: testId}, function(error, result){
        test.ok(!error, 'DestroyById save error: ' + JSON.stringify(error));

        // Now fetch it
        var newModel = new Backbone.Model({id:testId});
        newModel.sync = new Sync('Test');
        newModel.fetch(function(error) {
          test.ok(!error, 'DestroyById fetch error: ' + JSON.stringify(error));
          test.deepEqual(newModel.toJSON(), TEST_MODEL.toJSON(), 'Successful fetch');

          // Now destroy it
          var anotherNewModel = new Backbone.Model({id:testId});
          anotherNewModel.sync = new Sync('Test');
          anotherNewModel.destroy(function(error) {
            test.ok(!error, 'DestroyById destroy error: ' + JSON.stringify(error));

            // Make sure it's gone
            var fullPath = Path.join(TEST_FILE_DIR, 'Test', testId + '.json');
            FS.stat(fullPath, function(error, stats) {
              test.ok(error && error.code === 'ENOENT', 'File is removed.');
              test.done();
            });
          });
        });
      });
    },

    /**
    * One time teardown up for BaseSync tests
    * @method BaseSync-TearDown
    */
    TearDown: function(test) {
      FileProbe.rm_rf(TEST_FILE_DIR, function(error) {
        test.done();
      });
    }

  };

  /**
  * Test group for Live model synchronization
  *
  * @method LiveSync
  */
  module.exports['LiveSync'] = {

    /**
    * One time setup for LiveSync tests
    * @method LiveSync-SetUp
    */
    SetUp: function(test) {
      // Clear the directory
      FileProbe.rm_rf(TEST_FILE_DIR, function(error) {
        FileProbe.mkdir_r(TEST_FILE_DIR, function(error) {
          test.ok(!error, "Able to create the test directory");
          TEST_MODEL = new LIVE_SYNC_CLASS(TEST_OBJECT);
          test.ok(TEST_MODEL.isNew(), "The test model is a new object");
          TEST_MODEL.save({id: TEST_ID}, function(error, result){
            test.ok(!error, 'LiveSync-Setup save error: ' + JSON.stringify(error));
            test.done();
          });
        });
      });
    },

    /**
    * Tests LiveSync connection
    * @method LiveSync-Connect
    */
    Connect: function(test) {
      var model = new LIVE_SYNC_CLASS({id: TEST_ID});
      model.fetch({liveSync:true}, function(error) {
        test.ok(!error, "No error on liveSync fetch");
        test.deepEqual(model.toJSON(), TEST_MODEL.toJSON(), 'Successful fetch');
        model.clear();
        test.done();
      });
    },

    /**
    * Tests LiveSync disconnect
    * @method LiveSync-Disconnect
    */
    Disconnect: function(test) {
      var model = new LIVE_SYNC_CLASS({id: TEST_ID});
      model.fetch({liveSync:true}, function(error) {
        test.ok(!error, "No error on liveSync fetch");
        test.ok(model.syncMonitor, "Live sync monitor is attached");
        model.clear();
        test.ok(!model.syncMonitor, "Live sync monitor is detached");
        test.done();
      });
    },

    /**
    * Tests that a client change in the data model persists to the server
    * @method LiveSync-ClientChange
    */
    ClientChange: function(test) {
      var model = new LIVE_SYNC_CLASS({id: TEST_ID});
      model.fetch({liveSync:true}, function(error) {
        test.ok(!error, "No error on liveSync fetch");
        test.deepEqual(model.toJSON(), TEST_MODEL.toJSON(), 'Successful fetch');
        model.set('testNumber', 2);

        // Wait a bit, then see if the file was updated onto the filesystem
        setTimeout(function(){
          var path = Path.join(TEST_FILE_DIR, 'LiveSyncTest', TEST_ID + '.json');
          var obj = JSON.parse(FS.readFileSync(path));
          test.ok(_.isEqual(obj, model.toJSON()), 'Live sync did auto-save');
          model.clear();
          test.done();
        }, WATCH_CONNECT_TIME);
      });
    },

    /**
    * Tests that a server change propagates the data to the client with a change event
    * @method LiveSync-ServerChange
    */
    ServerChange: function(test) {
      var model = new LIVE_SYNC_CLASS({id: TEST_ID});
      model.fetch({liveSync:true}, function(error) {
        test.ok(!error, "No error on liveSync fetch");
        test.ok(model.get('testNumber') === 2, 'File still in the state last left');

        // Watch for changes to the model
        var testStr = 'Hey diddle diddle';
        var onChange = function() {
          test.equal(model.get('testString'), testStr, 'Server change was sent to the client');
          model.off('change', onChange);
          model.clear();
          test.done();
        };
        model.on('change', onChange);

        // Manually alter the file
        var path = Path.join(TEST_FILE_DIR, 'LiveSyncTest', TEST_ID + '.json');
        var obj = model.toJSON();
        obj.testString = testStr;
        FS.writeFileSync(path, JSON.stringify(obj, null, 2));
      });
    },

    /**
    * Tests that a backend deletion is detected
    * @method LiveSync-ServerDelete
    */
    ServerDelete: function(test) {
      var model = new LIVE_SYNC_CLASS({id: TEST_ID});
      model.fetch({liveSync:true}, function(error) {
        test.ok(!error, "No error on liveSync fetch");
        test.ok(model.get('testNumber') === 2, 'File still in the state last left');

        // Watch for changes to the model
        var onChange = function() {
          test.ok(!model.get('id'), 'Model has been deleted');
          model.off('change', onChange);
          model.clear();
          test.done();
        };
        model.on('change', onChange);

        // Manually delete the file
        var path = Path.join(TEST_FILE_DIR, 'LiveSyncTest', TEST_ID + '.json');
        FS.unlinkSync(path);
      });
    },

    /**
    * One time teardown up for BaseSync tests
    * @method LiveSync-TearDown
    */
    TearDown: function(test) {
      FileProbe.rm_rf(TEST_FILE_DIR, function(error) {
        test.done();
      });
    }

  };

}(this));
