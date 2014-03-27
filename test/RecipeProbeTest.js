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
      derivedRecipeMonitor = null,
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
      var changeFn = function() {

        // This is triggered twice - once on attr1 change, once on attr2 change.
        // Only perform the test on new attr2 value
        var attr2 = dataModelMonitor.get('attr2');
        if (attr2 === newValue) {
          dataModelMonitor.off('change', changeFn);
          test.equals(attr2, newValue, 'The script was run');
          test.done();
        }
      };

      // Set attr1 to the new value.  This should trigger the recipe.
      dataModelMonitor.on('change', changeFn);
      dataModelMonitor.set('attr1', newValue);
    }

  };

  /**
  * Tests that recipe autoStart works as advertised
  * @method Derived
  */
  module.exports['Derived'] = {

    /**
    * Construct a derived recipe
    * @method Derived-Construct
    */
    Construct: function(test) {

      // Build the class
      var DerivedRecipe = RecipeProbe.extend({
        probeClass: 'DerivedRecipe',
        initialize: function(){
          var t = this;
          t.set({
            autoStart: false,
            monitors: {
              dataModel: {probeName: 'DataModelTest'}
            }
          });
          RecipeProbe.prototype.initialize.apply(t, arguments);
        },
        run: function(context){
          var t = this;
          // Set derivedAttr2 to the value of derivedAttr1
          context.dataModel.set('derivedAttr2', context.dataModel.get('derivedAttr1'));
        }
      });

      // Get a monitor to the class
      derivedRecipeMonitor = new Monitor({probeClass:'DerivedRecipe'});
      derivedRecipeMonitor.connect(function(error){
        test.ok(!error, 'No error on derived recipe connect');
        test.equal(dataModelMonitor.get('derivedAttr1'), 'derivedAttrValue1', 'Data model is set for testing');
        test.equal(dataModelMonitor.get('derivedAttr2'), null, 'Derived test not run yet');
        test.done();
      });
    },

    /**
    * Tests that a non-autoStart recipe does not start automatically
    * @method Derived-IsNotRunning
    */
    IsNotRunning: function(test) {
      setTimeout(function(){
        test.equal(derivedRecipeMonitor.get('started'), false, 'Test has not started');
        test.equal(dataModelMonitor.get('derivedAttr2'), null, 'Still has not run');
        test.done();
      }, 10);
    },

    /**
    * Tests that the recipe can start
    * @method AutoRun-CanStart
    */
    CanStart: function(test) {
      derivedRecipeMonitor.control('start', function(error) {
        test.ok(!error, 'No error on start');
        test.ok(derivedRecipeMonitor.get('started'), 'Recipe is started on start');
        test.equal(dataModelMonitor.get('derivedAttr2'), null, 'First run still not performed');
        test.done();
      });
    }


  };


}(this));

