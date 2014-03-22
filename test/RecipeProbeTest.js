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
  * Tests for a hand coded recipe
  * @method HandCoded
  */
  module.exports['HandCoded'] = {

    /**
    * Test Recipe initialization
    * @method HandCoded-Initialize
    */
    Initialize: function(test) {
      test.done();
    },

    /**
    * Test recipe testing
    * @method HandCoded-Test
    */
    Test: function(test) {
      test.done();
    },

    /**
    * Test recipe starting
    * @method HandCoded-Start
    */
    Start: function(test) {
      test.done();
    },


    /**
    * Tests that the monitors in the recipe get instantiated
    * @method HandCoded-Monitors
    */
    Monitors: function(test) {
      test.done();
    },

    /**
    * Tests that the triggers fire
    * @method HandCoded-Triggers
    */
    Triggers: function(test) {
      test.done();
    },

    /**
    * Tests that the script is run
    * @method HandCoded-ScriptRun
    */
    ScriptRun: function(test) {
      test.done();
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
    * Tests that the monitor attributes set in the script are set
    * @method HandCoded-SetAttributes
    */
    SetAttributes: function(test) {
      test.done();
    },

    /**
    * Tests that the monitor control function is called
    * @method HandCoded-Control
    */
    Control: function(test) {
      test.done();
    },

    /**
    * Tests that the recipe stops
    * @method HandCoded-Stop
    */
    Stop: function(test) {
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

