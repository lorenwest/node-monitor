// PageSettingsView.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor-min'),
      UI = Monitor.UI,
      Template = UI.Template,
      Backbone = Monitor.Backbone,
      Page = UI.Page,
      _ = Monitor._,
      settingsTemplate = null,
      copyTemplate = null;

  /**
  * Page settings dialog view
  *
  * @class PageSettingsView
  * @extends SettingsView
  * @constructor
  */
  var PageSettingsView = UI.PageSettingsView = UI.SettingsView.extend({

    // Constructor
    initialize: function(options) {
      var t = this;
      t.modelBinder = new Backbone.ModelBinder();
      t.pageView = options.pageView;
      t.model = t.pageView.model;
      if (!settingsTemplate) {
        settingsTemplate = Template.fromDOM('#nm-template-PageSettings');
      }
    },

    // Event declarations
    events: {
      "click .btn-primary"       : "savePageChanges",
      "click .btn-cancel"        : "cancelChanges",
      "click .nm-ps-view-source" : "toggleViewSource",
      "click .nm-ps-edit"        : "toggleEditSource",
      "click .nm-ps-save"        : "toggleEditSource",
      "click .nm-ps-copy"        : "copyPage",
      "click .nm-ps-delete"      : "deletePage",
      "click .nm-ps-cancel"      : "cancelEditSource",
      "click h4"                 : "toggleSection",
      "keydown"                  : "onKeydown"
    },

    render: function() {
      var t = this;
      t.$el.append(settingsTemplate.apply(t.model.toJSON()));
      t.modelBinder.bind(t.model, t.$el);
      t.editor = t.$('.nm-ps-source-edit');
      t.sourceButton = t.$('.nm-ps-view-source');

      // Instantiate the source view
      t.sourceView = new UI.JsonView({
        model: t.model.toJSON({trim:false})
      });
      t.sourceView.render();
      t.$('.nm-ps-source-view').append(t.sourceView.$el);
    },

    refreshSubViews: function(e) {
      var t = this;
      // this will refresh the CSS view when built
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
        if (t.deletePage()) {
         return false;
        } else {
          // Reset source data
          t.fillSourceData();
        }
      }
      return true;
    },

    // Local override for page save
    savePageChanges: function() {
      var t = this;
      t.saveChanges();

      // Open the new component dialog if no components exist
      if (t.model.get('components').length === 0) {
        t.pageView.newComponent();
      }
    },

    // Copy the page
    copyPage: function() {

      $('#nm-pv-settings').modal('hide');
      $('#nm-pv-copy').centerBox().css({top:100}).modal('show');
      // Set the cursor when the dialog fades in
      setTimeout(function(){
        $('#nm-pv-copy input').first().focus();
      }, 500);
    },

    // Delete the page?
    deletePage: function() {
      var t = this;
      if (window.confirm('Are you sure you want to permanently delete this page?')) {
        t.pageView.exiting = true;
        t.model.destroy(function(){
          window.location.reload();
        });
        return true;
      }
      return false;
    }

  });

  /**
  * Page copy dialog
  *
  * @class PageCopyView
  * @extends Backbone.View
  * @constructor
  */
  var PageCopyView = UI.PageCopyView = Backbone.View.extend({

    // Constructor
    initialize: function(options) {
      var t = this;
      if (!copyTemplate) {
        copyTemplate = Template.fromDOM('#nm-template-PageCopy');
      }
    },

    // Event declarations
    events: {
      "click .btn-primary"       : "copy"
    },

    render: function() {
      var t = this;
      t.$el.append(copyTemplate.apply(t.model.toJSON()));
    },

    copy: function() {
      var t = this,
          copy = t.model.toJSON();
          copyToId = t.$('.nm-pv-copy-to').val();

      // Verify the page doesn't exist
      var page = new Page({id:copyToId});
      page.fetch(function(error) {
        if (!error || error.code != 'NOTFOUND') {
          alert('This page already exists.  Try another address.');
          return;
        }

        // Write the page and go to it
        copy.id = copyToId;
        copy.title = copy.title + " (copy)";
        page.set(copy);
        page.save(function(){
          UI.pageView.navigateTo(copyToId);
        });

        // Put away the dialog while it's saving the page
        $('#nm-pv-copy').modal('hide');
      });
    }

  });

}(this));
