// Html.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor'),
      UI = Monitor.UI,
      Backbone = Monitor.Backbone,
      Mustache = UI.Mustache,
      Template = UI.Template,
      base = UI.app.base = UI.app.base || {},
      _ = Monitor._,
      template = null;

  var FONT_SIZES = [
    'x-small', 'small', 'medium',
    'large', 'x-large', 'xx-large'];

  /**
  * A generic view for displaying HTML data.
  *
  * If a monitor is attached to this view, it applies the monitor data
  * to the HTML text as a template.
  *
  * @class Html
  * @extends Backbone.View
  * @constructor
  * @param options {Object} View initialization options (See others in Backbone.View)
  *     @param options.htmlValue {String} HTML string to place
  */
  var Html = base.Html = Backbone.View.extend({

    // Define the view
    name: 'HTML Template',
    icon: 'image/HTMLView.png',
    description: 'Send probe data through an HTML template',
    website: 'http://node_monitor.github.com/button.html',
    defaultOptions: {
      htmlValue: ''
    },

    // Constructor
    initialize: function(options) {
      var t = this;
      t.options = options;
      t.viewOptions = t.options.viewOptions;
      t.monitor = t.options.monitor;
      t.monitor.on('change', t.setValue, t);
      t.viewOptions.on('change', t.setValue, t);
      options.component.setDefaultSize({
        width: 300,
        height: 150
      });
    },

    render: function() {
      var t = this;
      t.setValue();
    },

    setValue: function() {
      var t = this,
          htmlValue = t.viewOptions.get('htmlValue'),
          monitor = t.monitor;

      // Run the monitor JSON through the template
      if (monitor) {
        // Send the non-templated value on template failure
        try {
          t.$el.html(Mustache.render(htmlValue, monitor.toJSON()));
        } catch(e) {
          t.$el.html(htmlValue);
        }
      } else {
        t.$el.html(htmlValue);
      }
    },

    // Overridden to unbind form elements
    remove: function() {
      var t = this;
      t.undelegateEvents();
      t.monitor.off('change', t.setValue, t);
      t.viewOptions.off('change', t.setValue, t);
      return Backbone.View.prototype.remove.apply(t, arguments);
    }

  });

  // Custom settings form for the Text view
  Html.SettingsView = Backbone.View.extend({

    initialize: function(options) {
      var t = this;

      // Build the template
      if (!template) {
        template = new Template({
          text: $('#nm-template-base-Html').html()
        });
      }

      // Clear this view when closing
      $('#nm-cv-settings').on('hide', function() {
        t.remove();
      });
    },

    events: {
      'click .font-picker'  : 'chooseFont'
    },

    render: function() {
      var t = this;
      t.monitor = t.monitor;

      // Render the HTML from the template
      t.$el.html(template.get('text'));
      t.textarea = t.$el.find('textarea');

      // Attach the color picker
      t.$('.color-picker').miniColors({
        opacity:true,
        change: function(hex, rgba) {
          t.editor.composer.commands.exec("setStyles", "color: " + hex);
        }
      });
      t.$('.miniColors-trigger').attr('title', 'Font Color');

      // Create tooltips for all items that have a title
      UI.tooltip(t.$('#nm-base-html-toolbar [title]'));

      // Append a title/background picker
      new UI.ComponentSettingsView.TitleBackgroundPicker({
        el: t.$el.find('.title'),
        component: t.options.component
      });

      // Update the component when the textarea is being edited
      t.textarea
        .val(t.model.get('htmlValue'))
        .on('keydown change', function(){
          setTimeout(function(){
            t.onChange();
          },0);
        });

      // Attach an HTML editor
      t.editor = new wysihtml5.Editor("nm-base-html-textarea", {
        name: "nm-base-html-composer",
        toolbar: "nm-base-html-toolbar",
        style: false,
        stylesheets: [
          '/static/css/default/bootstrap.min.css',
          '/static/css/default/font-awesome.css',
          '/static/css/default/MonitorUI.css',
          '/static/css/default/PageView.css',
          '/static/css/default/ComponentView.css',
          '/app/base/Base.css',
          '/app/base/wysihtml5.css'],
        parser: function(str) {return str;}  // Disable HTML sanitation
      });

      // Add the drop-down caret to dropdown toolbar items
      t.fontPicker = t.$el.find('.font-picker');
      UI.DropDownMenu.addCaret(t.fontPicker);

      // Intercept the setText method of the wysihtml5 TextArea
      // to update the component when the HTML editor is active.
      var oldSet = t.editor.textarea.setValue;
      t.editor.textarea.setValue = function() {
        oldSet.apply(t.editor.textarea, [arguments[0]]);
        t.onChange();
      }

      // Build a setStyle function to allow setting styles on a selected element
      wysihtml5.commands.setStyles = {
        exec: function(composer, command, styles) {
          // Make sure the element is wrapped in a span
          wysihtml5.commands.formatInline.exec(composer, command, "span");
          var selection = composer.selection.getSelectedNode();
          if (selection && selection.parentElement) {
            wysihtml5.dom.setStyles(styles).on(selection.parentElement);
          }
        }
      };

    },

    chooseFont: function() {
      var t = this,
          startPos = 26,
          model = [];

      // Add font sizes to the model
      FONT_SIZES.forEach(function(size){
        model.push(
          // Change startPos if this string changes!!
          '<span id="nm-base-html-fs-' + size +
          '" class="wysiwyg-font-size-' + size +
          '">' + size + '</span>');
      });

      // Add the dropdown menus to the toolbar
      var dropDown = new UI.DropDownMenu({
        contextEl: t.fontPicker,
        model: model
      });
      dropDown.on('select', function(item) {
        var size = item.substr(26).split('"')[0];
        t.editor.composer.commands.exec("fontSize", size);
      }).render();
    },

    onChange: function() {
      var t = this,
          htmlValue = t.textarea.val();
      t.model.set('htmlValue', htmlValue);
    },

    remove: function() {
      var t = this;
      t.$el.html('');
      return Backbone.View.prototype.remove.apply(t, arguments);
    }

  });


}(this));
