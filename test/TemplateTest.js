// TemplateTest.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Dependencies
  var Monitor = root.Monitor || require('../lib/index'),
      Backbone = Monitor.Backbone, UI = Monitor.UI,
      Template = UI.Template,
      FS = Monitor.commonJS ? require('fs') : null;

  var TEST_TEMPLATE_1 = "Hello {{where}}",
      TEST_COMPLETE_1 = "Hello World",
      TEST_OBJECT_1 = {where:"World"},
      TEST_MODEL_1 = new Backbone.Model(TEST_OBJECT_1),
      TEST_TEMPLATE_2 = "<html>Hello {{where}}</html>",
      TEST_COMPLETE_2 = "<html>Hello World</html>";

  // Old style watch takes *forever* to connect
  var WATCH_CONNECT_TIME = FS.watch ? 10 : 1000;

  /**
  * Unit tests for the <a href="Template.html">Template</a> class.
  * @class TemplateTest
  */

  /**
  * Test group for connection functionality
  * @method Template
  */
  module.exports['Template'] = {

    /**
    * Tests that the public classes and methods are exposed
    * @method Template-Exposure
    */
    Exposure: function(test) {
      test.ok(Template.prototype instanceof Backbone.Model, 'The Template data model is in place');
      test.done();
    },

    /**
    * Tests that a text based template does what it should
    * @method Template-Text
    */
    Text: function(test) {
      var tmpl = new Template({text:TEST_TEMPLATE_1});
      test.equal(TEST_COMPLETE_1, tmpl.apply(TEST_OBJECT_1), "The apply method correctly applies the template");
      test.done();
    },

    /**
    * Tests that a Backbone Model object can be used as the template data model
    * @method Template-Backbone
    */
    Backbone: function(test) {
      var tmpl = new Template({text:TEST_TEMPLATE_1});
      test.equal(TEST_COMPLETE_1, tmpl.apply(TEST_MODEL_1), "The apply method works with a Backbone data model");
      test.done();
    },

    /**
    * Tests that a file based template can be used
    * @method Template-File
    */
    File: function(test) {
      // No filesystem to test with
      if (!FS) {
        test.done();
        return;
      }
      var path = __dirname + "/TemplateTest.html";
      FS.writeFileSync(path, TEST_TEMPLATE_2);
      var tmpl = new Template({path:path, watchFile:false});
      test.equal(TEST_COMPLETE_2, tmpl.apply(TEST_MODEL_1), "File based templates work like text based templates");
      test.done();
    },

    /**
    * Tests that file based templates update as they're changed on the O/S
    * @method Template-FileWatch
    */
    FileWatch: function(test) {
      // No filesystem to test with
      if (!FS) {
        test.done();
        return;
      }
      // Write, test, update, test, cleanup
      var path = __dirname + "/TemplateTest.html";
      var tmpl = new Template({path:path});
      test.equal(TEST_COMPLETE_2, tmpl.apply(TEST_OBJECT_1), "The initial file version is correct");
      tmpl.on('change:text', function() {
        test.equal(TEST_TEMPLATE_1, tmpl.get('text'), "The template text is correct");
        test.equal(TEST_COMPLETE_1, tmpl.apply(TEST_MODEL_1), "The template works after update");
        FS.unlinkSync(path);
        tmpl.unWatchFile();
        test.done();
      });

      // Now update the file
      setTimeout(function(){
        FS.writeFile(path, TEST_TEMPLATE_1);
      }, WATCH_CONNECT_TIME);
    }

  };

}(this));
