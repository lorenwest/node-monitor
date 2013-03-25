// MonitorUI.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor-min'),
      OS = Monitor.commonJS ? require('os') : null,
      Backbone = Monitor.Backbone, _ = Monitor._;

  // Constants
  var KEY_ESC = 27;

  // Expose the Monitor class to global (for console access)
  if (Monitor.commonJS) {
    global.Monitor = Monitor;
  }

  /**
  * Node.js Monitor User Interface
  *
  * This class represents the Node.js Monitor UI application.  It is an application
  * singleton, and namespace for all classes in this module to attach their
  * prototype onto.
  *
  * Instances of this class represent the node_monitor web site.
  *
  * @class UI
  * @extends Backbone.Model
  * @constructor
  * @param model - Initial data model.  Can be a JS object or another Model.
  *     @param [model.id] {String} The object id (externally set if desired)
  *     @param [model.version] {String} Application version
  *     @param [model.syncHost] {String} Hostname for persisting model data
  *     @param [model.templates] {Template.List} List of templates available in the UI
  */
  var UI = Monitor.UI = Backbone.Model.extend({

    defaults: {id:  null, version: null, templates: null},
    initialize: function(params, options) {
      var t = this, templates = t.get('templates');

      // Load the template library
      if (!templates) {
        templates = new UI.Template.List();
        t.set({templates:templates});
      }
      $('#nm-template').children().each(function(){
        var id = $(this).attr('id').substr(12),
            text = $.trim(UI.Template.indent($(this).html(), -8));
        templates.add({id:id, text:text});
      });

    }

  });

  /**
  * Static Configurations
  *
  * These can be set onto the UI class after it's loaded, or via the
  * node.js config package if running server-side.
  *
  * @static
  * @property Config
  * @type &lt;Object&gt;</code>
  * <ul>
  * </ul>
  */
  var defaultConfig = {
    syncServer: Monitor.commonJS ? OS.hostname() : null
  };

  // Expose default configurations to the config package
  UI.Config = _.extend({}, defaultConfig);

  // Expose some dependencies
  var $ = UI.$ = Monitor.commonJS ? require('jquery') : root.$;
  var Mustache = UI.Mustache = Monitor.commonJS ? require('../ext/mustache-0.7.0-dev.js') : root.Mustache;

  // Create the app namespace
  var app = UI.app = {};

  // Connect server-side XHR for jquery
  $.support.cors = true;
  if (Monitor.commonJS) {
    var XHR = require('xmlhttprequest').XMLHttpRequest;
    $.ajaxSetup({xhr: function(){return new XHR();}});
  }

  // A generic mask to use for modals.  Can be stacked for modal within modal
  // (example: dropdown within a dialog).
  UI.ModalMask = Backbone.View.extend({
    initialize: function(options){
      var t = this;

      // Render on new
      t.$el.addClass('nm-mask').appendTo('body');

      // Attaching keydown to the document vs. the view
      t.keydown = t.onKeyDown.bind(t);
      $(document).on('keydown', t.keydown);

    },
    events: {
      'click'   : 'close'
    },
    onKeyDown: function(e) {
      var t = this;
      if (e.keyCode === KEY_ESC) {
        return t.close(e);
      }
    },
    close: function(e) {
      var t = this;
      t.trigger('close');
      t.$el.remove();
      $(document).off('keydown', t.keydown);
      e.stopPropagation();
      e.preventDefault();
      return false;
    }
  });

  // Common dialog box move logic
  UI.modalDragStart = function(e) {
    var dialog = $(e.currentTarget).parent(),
        zoomRatio = window.innerWidth / window.outerWidth,
        newPosition = {
          top: parseInt(dialog.css('top'), 10) * zoomRatio,
          left: parseInt(dialog.css('left'), 10) * zoomRatio
        },
        offset = {
          top: e.pageY - newPosition.top,
          left: e.pageX - newPosition.left
        };

    function drag(e) {
      newPosition.top = Math.max(e.pageY - offset.top, 0);
      newPosition.left = Math.max(e.pageX - offset.left, 0);
      dialog.css(newPosition);
    }
    function drop(e) {
      dialog.addClass('fade');
      $(document).unbind("mousemove", drag).unbind("mouseup", drop);
    }
    $(document).bind("mousemove", drag).bind("mouseup", drop);
    dialog.removeClass('fade');
    drag(e);
    e.preventDefault();
  };

  /**
  * Merge changes from another array or collection
  *
  * This adds a ```set()``` method to Backbone.Collection, which merges the
  * specified array or collection into the existing collection.
  *
  * It is useful for streaming updates into existing collections without
  * disrupting any event listeners attached to existing models.
  *
  * If an item already exists, it merges changes into it.  If an item
  * doesn't exist it adds it, and it removes any item in the collection that
  * isn't in the array or collection passed in to the method.
  *
  * Example:
  *
  *     var stream = JSON.stringify(myCollection);
  *     var myArray = JSON.parse(stream);
  *     myArray[0].lastUpdated = new Date();
  *     myCollection.set(myArray);
  *
  * @method Backbone.Collection.set
  * @param items {Array or Backbone.Collection} The items to set into the collection
  * @param options {Object} Set options to pass to individual model create/set
  */
  Backbone.Collection.prototype.set = function(items, options) {

    var t = this,
        prevModels = t.models,
        newIds = items.pluck ? items.pluck('id') : _.pluck(items, 'id'),
        i, len, id, cid, prevModel, newItem, removeIds = [], newIdHash = {};

    // Merge or add items to this collection
    for (i = 0, len = newIds.length; i < len; i++) {
      id = newIds[i];
      newItem = items[i];
      newIdHash[id] = true;
      prevModel = t.get(id);
      if (prevModel) {
        prevModel.set(newItem instanceof Backbone.Model ? newItem.attributes : newItem, options);
      } else {
        t.add(newItem, options);
      }
    }

    // Remove any item not in new items
    t.each(function(model) {
      id = model.get('id');
      if (!newIdHash[id]) {
        removeIds.push(id);
      }
    });
    t.remove(removeIds);
  };

  /**
  * Set up a contained model or contained collection relationship
  *
  * This is called during initialize of a parent backbone model that contains
  * another backbone model or collection.  It:
  *
  *     * Creates the correct model if setting from a non-model object
  *     * Merges changes on set vs. overwriting the existing contained object
  *     * Merges collection items vs. replacing (if it's a collection)
  *     * Alters toJSON to return the contained object toJSON vs. the object reference
  *
  * Example:
  *
  *     UI.containedModel(this, 'author', Author);
  *
  * @method containedModel
  * @param model {Backbone.Model} The parent model object
  * @param attrName {String} Name of the attribute that contains the model or collection
  * @param ctor {Function} The constructor function of the contained model or collection
  */
  UI.containedModel = function(model, attrName, ctor) {

    // Build the function for setting model data
    function setAttr(setModel, newValue, setOptions) {
      var oldValue = model._containedModels[attrName];

      // Pass through if removing
      if (newValue === undefined || newValue === null) {
        model._containedModels[attrName] = newValue;
        return;
      }

      // Is the new value the correct type?
      if (newValue instanceof ctor) {

        // Directly set if no old value
        if (!oldValue instanceof ctor) {
          model._containedModels[attrName] = newValue;
          return;
        }

        // They're both models.  Disregard if they're the same.
        var oldJSON = oldValue.toJSON({deep:true});
        var newJSON = newValue.toJSON({deep:true});
        if (_.isEqual(oldJSON, newJSON)) {
          return;
        }

        // Merge the raw JSON if they're both models
        newValue = newJSON;
      }

      // Keep the previous model and merge new data into it
      // For collections this relies on the Collection.set() method
      if (oldValue instanceof ctor) {
        model.attributes[attrName] = oldValue;
        model._currentAttributes[attrName] = oldValue;
        model.changed[attrName] = oldValue;
        oldValue.set(newValue, setOptions);
        return;
      }

      // Create a new model or collection, passing the value
      newValue =
        model._containedModels[attrName] =
        model.attributes[attrName] =
        model._currentAttributes[attrName] =
        new ctor(newValue, setOptions);

      // Watch for changes to the underlying model or collection
      // (collection add/remove), forwarding changes to this model
      newValue.on('change add remove reset', UI.onSubModelChange, {
        parent:model,
        attrName: attrName
      });
    }

    // Remember the contained models before they're overridden by set
    if (!model._containedModels) {
      model._containedModels = {};
    }

    // Watch for changes to the underlying model or collection
    // (collection add/remove), forwarding changes to this model
    var subModel = model.get(attrName);
    if (subModel instanceof Backbone.Model || subModel instanceof Backbone.Collection) {
      subModel.on('change add remove reset', UI.onSubModelChange, {
        parent:model,
        attrName: attrName
      });
    }

    // Set the initial model data
    setAttr(model, model.get(attrName));

    // Watch for subsequent changes
    model.on('change:' + attrName, setAttr, model);
  };

  /**
  * Change listener attached to contained models - for bubbling change
  * events to the containing model.
  *
  * @method onSubModelChange
  * @param model {Model} Backbone model changed
  * @param [collection] {Backbone collection} if a collection add/remove
  * @param options {Object} Event options
  * @param this {Object} 'this' is a custom object containing:
  *     @param this.parent {Backbone.Model} Parent container for this object
  *     @param this.attrName {String} Parents attribute name for this model
  */
  UI.onSubModelChange = function(model) {
    var t = this,
        parent = t.parent,
        attrName = t.attrName,
        // Options is arg[2] for add/remove and arg[1] for change
        chgOptions = arguments[2] || arguments[1] || {};

    // If the parent isn't currently changing, the source of the change
    // came from the contained model.  Trigger changes to the parent model.
    if (!chgOptions.silent && !parent._changing) {

      // Use setTimeout to bundle up all changes into a single change event
      // for each attribute and the parent class.
      parent._pendingChanges = parent._pendingChanges || {};
      parent._pendingChanges[attrName] = true;
      if (!parent._subModelTimer) {

        // Create one timer for all changes to the parent
        parent._subModelTimer = setTimeout(function(){
          var changes = {};
          for (var chgAttrName in parent._pendingChanges) {

            // Get the changed attribute for the set
            changes[chgAttrName] = parent.attributes[chgAttrName];

            // Make sure a change is detected
            parent.attributes[chgAttrName] = '';
            parent._currentAttributes[chgAttrName] = '';
            parent._previousAttributes[chgAttrName] = '';
          };

          // Set all sub-model changes into the parent
          parent.set(changes);

          // Remove our internal members
          delete parent._pendingChanges;
          delete parent._subModelTimer;
        },0);
      }
    } else {

      // Inform the parent that this attribute has pending changes.
      // This is necessary for the parent to fire it's own change event.
      parent._pending[attrName] = true;
    }
  };

  /**
  * Additional options for the Backbone.js toJSON method
  *
  * If the options hash contains {deep:true}, then call the toJSON() method of
  * any contained objects that have a toJSON method.
  *
  * If the options hash contains {trim:true}, then only output values that
  * differ from the default value.  This produces a less chatty JSON string,
  * useful for for streaming models across the wire.
  *
  * @method toJSON
  * @return {Object} A raw JS copy of the data model
  */
  Backbone.Model.prototype.toJSON = function(options) {
    var t = this,
        options = options || {},
        result = {},
        defaults = _.isFunction(t.defaults) ? t.defaults() : t.defaults,
        attrs = t.attributes,
        attr, value;

    for (attr in attrs) {
      value = attrs[attr];
      if (options.deep && value && _.isFunction(value.toJSON)) {
        value = value.toJSON(options);
      }
      if (options.trim && defaults) {
        if (!_.isEqual(value, defaults[attr])) {
          result[attr] = value;
        }
      } else {
        result[attr] = value;
      }
    }
    return result;
  };

  /**
  * Attach a common tooltip to the specified selector
  *
  * This attaches a bootstrap.js tooltip onto the elements specified with
  * the jQuery selector.  It adds classes to the tooltip elements, allowing them
  * to be individually styled.
  *
  * @method tooltip
  * @param selector {jQuery Selector} Selector of items to add tooltips onto
  * @param options {Object} Tool tip options
  */
  UI.tooltip = function(selector, options) {
    selector.tooltip(_.extend({
      placement: 'bottom',
      template: '<div class="tooltip nm-pv-tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
      delay: {show: 500, hide:10}
    }, options));
  }

  /**
  * jQuery add-on for inserting CSS into the DOM
  *
  * This method can accept a CSS style sheet in a string, an array of strings,
  * or an object with keys representing selectors and values representing styles.
  *
  * String example:
  *
  *     $.styleSheet("body: {background:white;}");
  *
  * Array example:
  *
  *     $.styleSheet([
  *       "body: {background:white;}",
  *       "#canvas: background: #e0e0e0; max-width: 400px;"
  *     ]);
  *
  * Object example:
  *
  *     $.styleSheet({
  *       "body"    : "background: white;",
  *       "#canvas" : "background: #e0e0e0; max-width: 400px;"
  *     });
  *
  * Deep object example:
  *
  *     $.styleSheet({
  *       "body": {
  *         "background": "white",
  *       },
  *       "#canvas":
  *         "background": "#e0e0e0",
  *         "max-width": "400px";"
  *     });
  *
  * @static
  * method $.styleSheet
  * @param styles {String, Array, or Object} Styles to apply to the page
  * @param id {String} ID of the style element.  This places an ID attribute onto the style tag, and replaces any prior style element with the specified ID.
  */
  $.styleSheet = function(styles, id) {

    // Build the style string based on the input type
    var styleStr = '', idAttr = '';
    if (typeof styles === 'string') {
      styleStr = styles;
    }
    else if (Array.isArray(styles)) {
      styleStr = styles.join('\n');
    }
    else if (typeof styles === 'object') {
      for (var selector in styles) {
        var value = styles[selector], valueStr = '';
        if (typeof value === 'string') {
          valueStr = value;
        }
        else if (typeof value === 'object') {
          for (var cssAttr in value) {
            valueStr += cssAttr + ':' + value[cssAttr] + "; ";
          }
        }
        styleStr += selector + "{" + valueStr + "} ";
      }
    }

    // Remove any prior style with the specified ID
    if (id) {
      $('#' + id).remove();
      idAttr = 'id="' + id + '" ';
    }

    // Insert into DOM
    if (styleStr) {
      $('<style ' + idAttr + 'type="text/css">' + styleStr + '</style>').appendTo('head');
    }
  };

  /**
  * jQuery utility for centering a div on the screen
  *
  * @static
  * @method $.centerBox
  */
  $.fn.centerBox = function () {
    var t = this;
    t.css("top", Math.max(0, (($(window).height() - this.outerHeight()) / 2) + $(window).scrollTop()) + "px");
    t.css("left", Math.max(0, (($(window).width() - this.outerWidth()) / 2) + $(window).scrollLeft()) + "px");
    return t;
  }

  /**
  * jQuery utility for converting a style string into an object
  *
  * This converts a string like this:
  *
  *     var style = "top:15px; left:200px; background-color:#202020";
  *
  * Into an object like this:
  *
  *     {
  *       "top": "15px",
  *       "left": "200px",
  *       "background-color": "#202020"
  *     }
  *
  * @static
  * method $.parseStyleString
  * @param styleString {String} CSS Style string
  * @return {Object} The parsed styles, as an object
  */
  $.parseStyleString = function(styleString) {
    var parsed = {}, parts = styleString.split(';');
    for (var i = 0, l = parts.length; i < l; i++) {
      var nameVal = parts[i].split(':');
      if (nameVal.length == 2) {
        parsed[nameVal[0].trim()] = nameVal[1].trim();
      }
    }
    return parsed;
  };

  /**
  * jQuery utility for converting a CSS object into a style string
  *
  * This converts an object like this:
  *
  *     var css = {
  *       "top": "15px",
  *       "left": "200px",
  *       "background-color": "#202020"
  *     }
  *
  * Into a string like this:
  *
  *     "top:15px; left:200px; background-color:#202020;"
  *
  * @static
  * method $.makeStyleString
  * @param css {Object} The CSS object
  * @return {String} The style string
  */
  $.makeStyleString = function(css) {
    var styles = '', separator = '';
    for (var elemName in css) {
      styles += separator + elemName + ":" + css[elemName] + ';';
      separator = ' ';
    }
    return styles;
  };

  /**
  * jQuery utility for making a string Title Case
  *
  * @static
  * method $.titleCase
  * @param titleString {String} A title string
  * @param preserveCase {String} Don't lowercase the string first
  * @return {String} The titleString Title Cased
  */
  $.titleCase = function(titleString, preserveCase) {
    var newTitle = preserveCase ? titleString : titleString.toLowerCase();
    newTitle = newTitle.split(' ');
    for (var i = 0, l = newTitle.length; i < l; i++) {
      newTitle[i] = newTitle[i].substr(0,1).toUpperCase() + newTitle[i].substr(1);
    }
    return newTitle.join(' ');
  };

  // Add Function.bind to browsers that don't support it yet (mobile safari & ie).
  // Thanks to https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind
  if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
      if (typeof this !== "function") {
        // closest thing possible to the ECMAScript 5 internal IsCallable function
        throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
      }
      var aArgs = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof fNOP
            ? this
            : oThis,
            aArgs.concat(Array.prototype.slice.call(arguments)));
        };
      fNOP.prototype = this.prototype;
      fBound.prototype = new fNOP();
      return fBound;
    };
  }

}(this));
