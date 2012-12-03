// SettingsView.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor'),
      UI = Monitor.UI,
      Backbone = Monitor.Backbone;

  /**
  * Abstract view shared by the PageSettings and ComponentSettings views
  *
  * @class SettingsView
  * @extends Backbone.View
  * @constructor
  */
  var SettingsView = UI.SettingsView = Backbone.View.extend({

    // Detect changes on keydown - after the value has been set
    onKeydown: function(e) {
      var t = this;
      setTimeout(function(){
        t.modelBinder._onElChanged(e);
      },0);
    },

    // This toggles open/closed a section
    toggleSection: function(e) {
      var t = this,
          h1 = $(e.currentTarget),
          icon = h1.find('i'),
          div = h1.find('+div'),
          isClosed = h1.hasClass('closed');

      // Animate the height.  Can't do CSS animations, because CSS
      // requires specific start/end points, and can't animate from
      // height:auto to height:0px.
      if (isClosed) {
        var divHeight = div.css({height:'auto'}).height();
        div.css({height:0});
        div.animate({height:divHeight}, 200, function(){
          div.css({height:'auto'});
        });
        icon.attr({class:"icon-caret-down"});
      } else {
        div.animate({height:0}, 200);
        icon.attr({class:"icon-caret-right"});
      }
      h1.toggleClass('closed');
    },

    toggleViewSource: function(isClosing) {
      var t = this,
          wasViewingSource = t.$el.hasClass('view-source'),
          wasEditingSource = t.$el.hasClass('edit-source');

      // Set closing only if the value is true
      isClosing = (isClosing === true);

      // Close the edit/source window if open
      if (wasEditingSource) {
        t.toggleEditSource(isClosing);
      }

      // Refresh sub-views we're heading into (unless the form is closing)
      if (!isClosing) {
        if (wasViewingSource) {
          t.refreshSubViews();
        } else {
          t.fillSourceData();
        }
      }

      // Switch front/back & set button label
      t.$el.toggleClass('view-source');
      t.sourceButton.text(wasViewingSource ? 'View Source' : 'View Form');
    },

    toggleEditSource: function(isClosing) {
      var t = this,
          wasEditingSource = t.$el.hasClass('edit-source');

      // Set closing only if the value is true
      isClosing = (isClosing === true);

      // Validate before switching from edit (unless the form is closing)
      if (!isClosing && wasEditingSource) {
        if (!t.validateSource()) {
          if (!t.pageView.exiting) {
            alert ('JSON parse error');
          }
          return;
        }
      }

      // Refresh the views from the model
      t.fillSourceData();

      // Toggle CSS
      t.$el.toggleClass('edit-source');
    },

    cancelEditSource: function() {
      var t = this;
      t.fillSourceData();
      t.$el.toggleClass('edit-source');
    },

    // Fill the view-source and edit-source editors
    fillSourceData: function() {
      var t = this,
          json = t.model.toJSON({trim:false});
      t.sourceView.model = json;
      t.sourceView.setData();
      t.editor.val(JSON.stringify(json, null, 2));
    },

    cancelChanges: function() {
      var t = this,
          wasViewingSource = t.$el.hasClass('view-source');

      // Reset the data model to the value on open
      t.model.set(t.originalModel);
      t.fillSourceData();
      t.closeDialog();
    },

    saveChanges: function() {
      var t = this,
          wasEditingSource = t.$el.hasClass('edit-source');

      if (wasEditingSource) {
        if (!t.validateSource()) {
          // Show a parse alert unless exiting the page
          // due to no JSON.
          if (!t.pageView.exiting) {
            alert ('JSON parse error');
          }
          return;
        }
      }

      // Save and unlock the page
      t.pageView.savePage();
      t.pageView.lockPage();
      t.closeDialog();
    },

    closeDialog: function() {
      var t = this,
          wasViewingSource = t.$el.hasClass('view-source');

      // Switch to the form page if viewing source
      if (wasViewingSource) {
        setTimeout(function(){
          t.toggleViewSource(true);
        },2000);
      }
      t.$('.modal').modal('hide');
    }

  });

}(this));
