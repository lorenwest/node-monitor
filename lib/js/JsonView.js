// JsonView.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor'),
      UI = Monitor.UI,
      Template = UI.Template,
      Backbone = Monitor.Backbone,
      Mustache = UI.Mustache,
      _ = Monitor._;

  // Auto-close the sub-element if the toJSON is less than this size
  var AUTO_CLOSE_CHARS = 30;

  /**
  * Editor for a Backbone model or Collection
  *
  * @class JsonView
  * @extends Backbone.View
  * @constructor
  */
  var JsonView = UI.JsonView = Backbone.View.extend({

    // For Backbone.View
    tagName:  "div",
    className:  "nm-jv",

    template: {
      heading: Mustache.compile('<div class="heading">{{value}}</div>'),
      line: Mustache.compile('<div><span class="head"><i>&nbsp;</i>{{name}}:</span><span class="data">{{{value}}}</span></div>'),
      inner: Mustache.compile('<div class="inner"></div>'),
      endInner: Mustache.compile('<div class="end-inner">{{symbol}}</div>')
    },

    events: {
      "click .open-close":    "onOpenClose"
    },

    initialize: function(options) {
      var t = this;
      // The model is either an object, an array, a Backbone Model, or Collection
      t.isBackbone = t.model instanceof Backbone.Model || t.model instanceof Backbone.Collection;
      if (t.isBackbone) {
        t.model.bind('change', t.setData, t);
      }

      // Close all on initial render?
      t.closedOnInit = options.closedOnInit;
    },

    // Render new HTML
    render: function() {
      var t = this;
      t.$el.html('');

      // Output the heading if specified
      if (t.options.heading) {
        $(t.template.heading({value:t.options.heading})).appendTo(t.$el);
      }

      // If a non-object, just print it
      t.json = t.isBackbone ? t.model.toJSON() : t.model;
      if (typeof t.json !== 'object') {
        $(t.template.line({name:'value', value:t.json})).appendTo(t.$el);
        return;
      }
      t.keys = _.keys(t.json);

      // Info about each element, keyed by element name
      // div - The jQuery selector of the element outer div
      // span - The jQuery selector of the data value span
      // value - The element raw value
      // isBackbone - Is the element an instance of a Backbone model?
      // strValue - The currently displayed value
      // isArray - True of the element is an array (or collection)
      // innerDiv - The container for the inner view for objects
      // innerView - The inner view if the element is an object
      t.elems = {};

      // Layout the tree (without element data)
      for (var elemName in t.json) {
        var elem = t.elems[elemName] = {};
        elem.value = t.getElemValue(elemName);
        elem.isBackbone = elem.value instanceof Backbone.Model || elem.value instanceof Backbone.Collection;
        elem.div = $(t.template.line({name:elemName, value: '&nbsp;'})).appendTo(t.$el);
        elem.span = $('.data', elem.div);

        // Render a sub-element as another JsonView
        if (elem.value !== null && typeof elem.value === 'object') {
          elem.div.addClass('open-close').data({elemName:elemName});
          $('i', elem.div).html('')
          elem.innerDiv = $(t.template.inner()).appendTo(t.$el);
          elem.innerView = new JsonView({
            model: elem.value,
            closedOnInit: t.closedOnInit
          });
          elem.innerView.render().$el.appendTo(elem.innerDiv);
          elem.isArray = _.isArray(elem.value);
          $(t.template.endInner({symbol:elem.isArray ? "]" : "}"})).appendTo(elem.innerDiv);
        }
      }

      // Add element data to the tree
      return t.setData();

      // Reset for future renders
      t.closedOnInit = false;
    },

    // Set (or replace) model data in DOM
    setData: function(newModel) {
      var t = this;
      if (newModel) {
        t.model = newModel;
      }
      t.json = t.isBackbone ? t.model.toJSON() : t.model;

      // If a non-object, just print it
      if (typeof t.json !== 'object') {
        t.$el.html('');
        $(t.template.line({name:'value', value:t.json})).appendTo(t.$el);
        return;
      }

      // Re-render if the object elements differ
      var newKeys = _.keys(t.json);
      if (newKeys.length !== t.keys.length || newKeys.length !== _.intersection(t.keys, newKeys).length) {
        return t.render();
      }
      t.keys = newKeys;

      // Set each element
      for (var elemName in t.json) {
        var elem = t.elems[elemName];
        elem.value = t.getElemValue(elemName);
        t.setElemValue(elem);
      }
      return t;
    },

    // Get the value of the element with the specified name
    getElemValue: function(elemName) {
      var t = this;
      if (t.isBackbone) {
        return t.model instanceof Backbone.Collection
          ? t.model.at(elemName)
          : t.model.get(elemName);
      }
      return t.model[elemName];
    },

    // Set the DOM element value to the JSON.stringify format
    setElemValue: function(elem) {
      var t = this,
          strValue;

      // Catch recursive stringify
      try {strValue = JSON.stringify(elem.value);}
      catch (e) {strValue = "{object}";}

      // Set if the value changed
      if (strValue !== elem.strValue) {
        var priorStrValue = elem.strValue;
        elem.strValue = strValue;

        // Set the value of this element or the inner element
        elem.span.text(strValue);
        if (elem.innerView) {
          elem.innerView.model = elem.value;
          elem.innerView.setData();

          // Set the inner element open or closed
          var isClosed = false;
          if (priorStrValue) {
            isClosed = elem.innerView.isClosed;
          } else {
            isClosed = t.closedOnInit ? true : strValue.length < AUTO_CLOSE_CHARS;
          }
          t.toggleClosed(elem, isClosed);
        }
      }
    },

    onOpenClose: function(e) {
      var t = this, elemName = $(e.currentTarget).data('elemName');
      t.toggleClosed(t.elems[elemName]);
      e.stopPropagation();
    },

    toggleClosed: function(elem, closed) {
      var t = this,
          strValue = elem.strValue,
          wasClosed = elem.innerView.isClosed,
          isClosed = typeof closed === 'undefined' ? !wasClosed : closed;

      elem.innerView.isClosed = isClosed;
      $(elem.innerDiv, elem.div).toggleClass('closed', isClosed);
      if (!isClosed) {
        strValue = elem.isArray ? '[' : '{';
      }
      elem.span.text(strValue);
      $('i', elem.div)
        .attr('class', 'icon-caret-' + (isClosed ? 'right' : 'down'));
    },

    remove: function() {
      var t = this;
      if (t.isBackbone) {t.model.unbind('change', t.setData, t);}
      $(t.el).remove();
    }

  });

}(this));
