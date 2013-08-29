/*global window document $ localStorage alert*/

// ComponentSettingsView.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor-min'),
      UI = Monitor.UI,
      Template = UI.Template,
      Backbone = Monitor.Backbone,
      _ = Monitor._,
      customSettings = null,
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
      t.viewOptionBinder = new Backbone.ModelBinder();
      t.monitorParamBinder = new Backbone.ModelBinder();
      t.pageView = options.pageView;
      t.componentView = options.componentView;
      t.model = t.componentView.model;
      if (!template) {
        template = Template.fromDOM('#nm-template-ComponentSettings');
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
      "keydown"                  : "onKeydownLocal"
    },

    // This is called once after construction to render the
    // components onto the screen.  The components change their
    // value when the data model changes.
    render: function() {
      var t = this;
      t.$el.append(template.apply({}));

      t.editor = t.$('.nm-cs-source-edit');
      t.sourceButton = t.$('.nm-cs-view-source');

      // Get bindings to 'name=' attributes before custom views are rendered
      t.componentBindings = Backbone.ModelBinder.createDefaultBindings(t.$el, 'name');
    },

    // Set the specified data model into the component, specifying
    // any custom component settings view
    setModel: function(model, componentView, customView) {
      var t = this,
          componentPane = t.$('.nm-cs-component');

      // Remember the model state on entry
      t.model = model;
      t.monitor = model.get('monitor');
      t.originalModel = t.model.toJSON({trim:false});

      // Remove any inner views
      if (t.sourceView) {
        t.sourceView.remove();
      }
      if (t.customView) {
        t.customView.remove();
      }

      // Clean up prior monitorParams
      if (t.monitorParams) {
        t.monitorParams.off('change');
      }

      // Create the custom settings view
      if (customView) {
        t.customView = new customView({
          model: t.model.get('viewOptions'),
          monitor: t.model.get('monitor'),
          pageView: UI.pageView,
          component: t.model,
          componentView: componentView
        });
        t.$('.nm-cs-view-settings').append(t.customView.el);
        t.customView.render();
      }

      // Normal data binding - name to model
      t.modelBinder.bind(t.model, t.$el, t.componentBindings);

      // Bind data-view-option elements to component.viewOptions
      t.viewOptionBinder.bind(
        t.model.get('viewOptions'),
        componentPane,
        Backbone.ModelBinder.createDefaultBindings(componentPane, 'data-view-option')
      );

      // Bind data-monitor-param elements to monitor.initParams.
      // This is a bit more difficult because initParams isnt a Backbone model.
      // Copy into a Backbone model, and bind to that.
      t.monitorParams = new Backbone.Model(t.monitor.get('initParams'));
      t.monitorParamBinder.bind(
        t.monitorParams,
        componentPane,
        Backbone.ModelBinder.createDefaultBindings(componentPane, 'data-monitor-param')
      );
      t.monitorParams.on('change', function() {
        t.monitor.set('initParams', t.monitorParams.toJSON());
      });

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

    // Detect changes on keydown - after the value has been set
    onKeydownLocal: function(e) {
      var t = this;

      // Make view options changes immediately on keydown
      // Note: Don't be so aggressive with monitor initParams, because that
      // could result in backend round-trips for each keystroke.
      setTimeout(function(){
        t.viewOptionBinder._onElChanged(e);
      },0);

      // Call the parent keydown
      t.onKeydown(e);
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
      var cv = t.pageView.getComponentView(component.get('id'));
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

}(this));
