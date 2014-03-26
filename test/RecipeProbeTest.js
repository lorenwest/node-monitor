// RecipeProbeTest.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // This should be run before other tests to set up configurations
  process.env.NODE_ENV='test';
  var config = require('config');
  var testRecipe = null;

  /**
  * Unit tests for the <a href="Recipe.html">Recipe</a> class.
  * @class RecipeProbeTest
  */

  // Dependencies
  var Monitor = require('../lib/index'),
      RecipeProbe = Monitor.RecipeProbe,
      Backbone = Monitor.Backbone,
      recipeMonitor = null,
      dataModelMonitor = null,
      _ = Monitor._,
      NL = '\n';

  /**
  * Tests for verifying modules are loaded and exposed properly
  *
  * @method ModuleLoad
  */
  module.exports.ModuleLoad = {

    setUp: function(callback) {callback();},
    tearDown: function(callback) {callback();},

    /**
    * Tests that Recipe is exposed and of the correct type
    * @method ModuleLoad-Recipe
    */
    Recipe: function(test) {
      test.ok(RecipeProbe.prototype instanceof Backbone.Model, 'The data model is in place');
      test.ok(RecipeProbe.prototype instanceof Monitor.Probe, 'It is a probe');
      test.done();
    }

  };

  /**
  * Tests for a hand coded recipe stored in config/test.js
  * @method HandCoded
  */
  module.exports['HandCoded'] = {

    /**
    * Test Recipe initialization
    * @method HandCoded-Initialize
    */
    Initialize: function(test) {
      // Give the RecipeTest probe a chance to load
      setTimeout(function(){
        recipeMonitor = new Monitor({probeName:'RecipeTest'});
        recipeMonitor.connect(function(error) {
          test.ok(!error, 'No error on recipe connect');
          test.ok(recipeMonitor.get('started'), 'Recipe is started on init');

          // Get a monitor to the underlying data model the recipe manipulates
          dataModelMonitor = new Monitor({probeName:'DataModelTest'});
          dataModelMonitor.connect(function(error1) {
            test.ok(!error1, 'No error on data model connect');
            test.equal(dataModelMonitor.get('attr1'), 'attrValue1', 'Connected to the correct data model');
            test.done();
          });
        });
      }, 0);
    },

    /**
    * Test recipe stopping
    * @method HandCoded-Stop
    */
    Stop: function(test) {
      recipeMonitor.control('stop', function(error) {
        test.ok(!error, 'No error on stop');
        test.ok(!recipeMonitor.get('started'), 'Recipe is stopped on stop');
        test.done();
      });
    },

    /**
    * Test recipe starting
    * @method HandCoded-Start
    */
    Start: function(test) {
      recipeMonitor.control('start', function(error) {
        test.ok(!error, 'No error on start');
        test.ok(recipeMonitor.get('started'), 'Recipe is started on start');
        test.done();
      });
    },

    /**
    * Tests that the script is run on change
    * @method HandCoded-ScriptRun
    */
    ScriptRun: function(test) {

      // The test recipe is fired on change, and the script simply copies
      // the value of attr1 into attr2.
      var newValue = 'scriptRunTest';

      // Look for attr2 changing from the test
      dataModelMonitor.on('change', function() {

        // This is triggered twice - once on attr1 change, once on attr2 change.
        // Only perform the test on new attr2 value
        var attr2 = dataModelMonitor.get('attr2');
        if (attr2 === newValue) {
          test.equals(attr2, newValue, 'The script was run');
          test.done();
        }
      });

      // Set attr1 to the new value.  This should trigger the recipe.
      dataModelMonitor.set('attr1', newValue);
    },

    /**
    * Tests that the script is run in a sandbox
    * @method HandCoded-Sandbox
    */
    Sandbox: function(test) {
      test.done();
    },

    /**
    * Tests that the script state (this) is persisted between runs
    * @method HandCoded-PersistentContext
    */
    PersistentContext: function(test) {
      test.done();
    },

    /**
    * Tests that the monitor control function can be called
    * @method HandCoded-Control
    */
    Control: function(test) {
      test.done();
    }

  };

  /**
  * Tests that recipe autoStart works as advertised
  * @method AutoRun
  */
  module.exports['AutoRun'] = {

    /**
    * Tests that an autoStart recipe starts automatically
    * @method AutoRun-IsRunning
    */
    IsRunning: function(test) {
      test.done();
    },

    /**
    * Tests that a non-autoStart recipe does not start automatically
    * @method AutoRun-IsRunning
    */
    IsNotRunning: function(test) {
      test.done();
    }


  };


}(this));

