// ComponentSettingsView.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor'),
      UI = Monitor.UI,
      Template = UI.Template,
      Backbone = Monitor.Backbone,
      _ = Monitor._,
      template = null;

  /**
  * Component settings dialog view
  *
  * @class ComponentSettingsView
  * @extends SettingsView
  * @constructor
  */
  var ComponentSettingsView = UI.ComponentSettingsView = UI.SettingsView.extend({

    // Constructor
    initialize: function(options) {
      var t = this;
      t.modelBinder = new Backbone.ModelBinder();
      t.pageView = options.pageView;
      t.componentView = options.componentView;
      t.model = t.componentView.model;
      if (!template) {
        template = new Template({
          text: $('#nm-template-ComponentSettings').html()
        });
      }
    },

    // Event declarations
    events: {
      "click .btn-primary"       : "saveChanges",
      "click .btn-cancel"        : "cancelChanges",
      "click .nm-cs-view-source" : "toggleViewSource",
      "click .nm-cs-edit"        : "toggleEditSource",
      "click .nm-cs-save"        : "toggleEditSource",
      "click .nm-cs-copy"        : "copy",
      "click .nm-cs-cancel"      : "cancelEditSource",
      "click h4"                 : "toggleSection",
      "keydown"                  : "onKeydown"
    },

    // This is called once after construction to render the
    // components onto the screen.  The components change their
    // value when the data model changes.
    render: function() {
      var t = this;
      t.$el.append(template.apply({}));


      // Set up model/view bindings
      t.componentBindings = Backbone.ModelBinder.createDefaultBindings(t.$el, 'name');
      t.editor = t.$('.nm-cs-source-edit');
      t.sourceButton = t.$('.nm-cs-view-source');
    },

    // Set the specified data model into the component
    setModel: function(model) {
      var t = this;

      // Remove any inner views
      if (t.sourceView) {
        t.sourceView.remove();
      }

      // Change the data model & bind to form elements
      t.model = model;
      t.originalModel = t.model.toJSON({trim:false});
      t.modelBinder.bind(t.model, t.$el, t.componentBindings);

      // Instantiate the source view
      t.sourceView = new UI.JsonView({
        model: t.model.toJSON({trim:false})
      });
      t.sourceView.render();
      t.$('.nm-cs-source-view').append(t.sourceView.$el);
    },

    refreshSubViews: function(e) {
      var t = this;
    },

    // Copy the component
    copy: function() {
      var t = this;

      // Add the component to the model, then to the page view
      var copy = t.model.toJSON();
      delete copy.id;
      var component = t.pageView.model.addComponent(copy.viewClass);
      component.set(copy);

      // Position the component on top left
      var cv = t.pageView.getComponentView(component.get('id'))
      cv.raiseToTop(true);
      cv.moveToLeft();
      t.pageView.leftJustify();
      t.pageView.centerPage();

      // Close the dialog box
      t.closeDialog();
    },

    // Validate the raw source in the editor, setting the model if valid
    // and returning true/false based on valid JSON
    validateSource: function() {
      var t = this,
          val = t.editor.val();
      if (val) {
        try {
          // Throw away parse errors while typing
          t.model.set(JSON.parse(val));
        } catch (e) {
          return false;
        }
      } else {
        // Confirm deletion if user removes everything in the JSON window
        if (window.confirm('Are you sure you want to delete this component?')) {
          t.pageView.model.get('components').remove(t.model);
          $('#nm-cv-settings').modal('hide');
        } else {
          // Reset source data
          t.fillSourceData();
        }
      }
      return true;
    }

  });

  /**
  * Helper for entering a component title and selecting background
  *
  * This view renders on initialize
  *
  * @class ComponentSettingsView.TitleBackgroundPicker
  * @constructor
  * @param options {Object} View options
  *     @param options.el {Dom Element} Dom element to append the picker to
  *     @param options.component {Component} The component data model
  */
  ComponentSettingsView.TitleBackgroundPicker = Backbone.View.extend({

    initialize: function(options) {
      var t = this;
      t.modelBinder = new Backbone.ModelBinder();
      t.render();
    },

    events: {
      "change"                   : "onKeydown",
      "keydown"                  : "onKeydown"
    },

    render: function() {
      var t = this;
      if (t.picker) {
        t.remove();
      }
      t.picker = t.$el.append(
        '<div class="nm-csv-tbp">' +
          '<label>Title</label>' +
          '<input name="title" type="text"/>' +
          '<span>Show Background: </span><input name="background" type="checkbox"/>' +
        '</div>');
      t.modelBinder.bind(t.options.component.get('viewOptions'), t.$el);
    },

    // Detect changes on keydown - after the value has been set
    onKeydown: function(e) {
      var t = this;
      setTimeout(function(){
        t.modelBinder._onElChanged(e);
      },0);
    },

    remove: function() {
      var t = this;
      t.undelegateEvents();
      t.modelBinder.unbind();
      t.picker.remove();
      return Backbone.View.prototype.remove.apply(t, arguments);
    }

  });

}(this));
