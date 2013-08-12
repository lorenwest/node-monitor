// Template.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor-min'),
      UI = Monitor.UI,
      Mustache = UI.Mustache,
      Backbone = Monitor.Backbone,
      _ = Monitor._,
      FileProbe = Monitor.FileProbe,
      $ = UI.$,
      FS = Monitor.commonJS ? require('fs') : null;

  /**
  * Template management
  *
  * This class provides template lifecycle and execution management.
  *
  * Templates are text strings in Mustache format.  A JavaScript object or
  * Backbone.Model object may be applied to the template using the ```apply()```
  * method.  This returns a text string with parameters replaced by the data
  * model values.
  *
  *     var templateText = 'Hello {{what}}';
  *     var myTemplate = new UI.Template({text: templateText});
  *     var myModel = {what: 'World'};
  *     console.log(myTemplate.apply(myModel));
  *
  * Mustache man page: <a href="http://mustache.github.com/mustache.5.html">http://mustache.github.com/mustache.5.html</a>
  *
  * If the template is constructed with raw text, or if the text element is set
  * after construction, the template function will reflect the text element.
  *
  * If the template is constructed on the server using a filename, that file
  * is watched for changes and automatically reloaded if the file changes.
  *
  * To provide consistent calling behavior, the first file load is synchronous
  * and subsequent file loads (due to changes) are asynchronous.  This assures
  * consistent calling semantics regardless of the template source.
  *
  * Since synchronous file loading is only appropriate during process startup,
  * if instances are needed after process start, the asyncLoad parameter can
  * be passed to the constructor, and the 'change:text' event can be monitored
  * as notification that the template is ready.
  *
  * @class Template
  * @extends Backbone.Model
  * @constructor
  * @param model - Initial data model.  Can be a JS object or another Model
  *   @param [model.id] {String} A unique identifier for this template
  *   @param [model.text] {String} The raw template text
  *   @param [model.path] {String} The full path to a template file (server side only)
  *   @param [model.asyncLoad=false] {Boolean} Should the initial file load be asynchronous?
  *   @param [model.watchFile=true] {Boolean} Should the file specified by path be watched for changes?
  *   @param [model.compiled] {Function} The compiled template function
  */
  var Template = UI.Template = Backbone.Model.extend({

    defaults:  {
      id: null, path:null, asyncLoad:false, text:null, watchFile: true, compiled:null
    },

    // Initialize the template
    initialize: function(params, options) {
      var t = this;

      // If raw text was sent to the template, compile and return
      if (t.get('text')) {
        t.compile();
        return;
      }

      // Watch for changes in the text element
      t.on('change:text', t.compile, t);

      // Process a file template
      var path = t.get('path');
      if (path) {
        // Load the file
        if (t.asyncLoad) {
          FS.readFile(path, function(err, text) {
            if (err) {
              return console.error('Error reading file: ' + path, err);
            }
            t.set({text: text.toString()});
          });
        } else {
          t.set({text: FS.readFileSync(path).toString()});
        }

        // Watch the file for changes
        if (t.get('watchFile')) {
          t._watchFile();
        }
      }
    },

    /**
    * Watch the file for changes
    *
    * This sets up a watcher for the file specified in the ```path``` element.
    * It is called by the constructor if the ```watchFile``` data element is true.
    *
    * @private
    * @method _watchFile
    */
    _watchFile: function() {
      var t = this, path = t.get('path');
      t.watcher = FileProbe.watchLoad(path, {persistent: true}, function(error, content) {
        if (!error) {
          t.set('text', content);
        }
      });
    },

    /**
    * Stop watching for file changes
    *
    * @method unWatchFile
    */
    unWatchFile: function() {
      var t = this;
      if (t.watcher) {
        t.watcher.close();
        t.watcher = null;
      }
    },

    /**
    * Apply the parameters to the template
    *
    * This accepts an object and returns the template with the parameters
    * applied.
    *
    * @method apply
    * @param params {Object or Backbone.Model} Parameters to apply to the template
    * @return {String} The template text with parameters applied
    */
    apply: function(params) {
      var t = this, text = t.get('text'), compiled = t.get('compiled');

      // Convert parameters to JS object if they're a backbone model
      if (params instanceof Backbone.Model) {
        params = params.toJSON();
      }

      // Compile the template if necessary
      if (!compiled) {
        compiled = t.compile();
      }

      // Apply the template
      return compiled(params);
    },

    /**
    * Compile the text element into the compiled element
    *
    * @protected
    * @method compile
    * @return {Function} Compiled function ready to call
    */
    compile: function() {
      var t = this, text = t.get('text');
      var compiled = Mustache.compile(text);
      t.set({compiled: compiled});
      return compiled;
    }

  });

  /**
  * Build a new Template object from the contents of DOM
  *
  * This builds a new Template object, and sets the text element
  * to the contents of the specified DOM HTML
  *
  * @static
  * @method fromDOM
  * @param selector {String} DOM selector
  * @return {Template} The new template object
  */
  Template.fromDOM = function(selector) {
    return new Template({text: $(selector).html()});
  };

  /**
  * Indent (or un-indent) text by a specified number of characters
  *
  * If the numChars parameter is negative, un-indent.
  *
  * @static
  * @method indent
  * @param text {String} Text string
  * @param numChars {Integer} Number of characters to indent or un-indent
  * @return {String} The indented text
  */
  Template.indent = function(text, numChars) {
    for (var i = 0, indent = ''; i < Math.abs(numChars); i++) {indent += ' ';}
    if (numChars <= 0) {
      // Un-indent
      var re = new RegExp('^' + indent, 'mg');
      return text.replace(re, '');
    } else {
      // Indent
      var blankLastLine = new RegExp('\n' + indent + '$');
      return text.replace(/^/mg, indent).replace(blankLastLine, '\n');
    }
  };

  /**
  * Constructor for a list of Template objects
  *
  *     var myList = new Template.List(initialElements);
  *
  * @static
  * @method List
  * @param [items] {Array} Initial list items.  These can be raw JS objects or Template data model objects.
  * @return {Backbone.Collection} Collection of Template data model objects
  */
  Template.List = Backbone.Collection.extend({model: Template});

}(this));
