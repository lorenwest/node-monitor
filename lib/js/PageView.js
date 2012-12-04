// PageView.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor'),
      UI = Monitor.UI,
      ComponentView = UI.ComponentView,
      Template = UI.Template,
      Backbone = Monitor.Backbone,
      _ = Monitor._,
      didCloseHeader = false,
      pageTemplate = null,
      aboutTemplate = null;

  /**
  * The main page view
  *
  * @class PageView
  * @extends Backbone.View
  * @constructor
  */
  var PageView = UI.PageView = Backbone.View.extend({

    // Constructor
    initialize: function(options) {
      var t = this;
      t.logo = options.logo;
      t.version = options.version;
      t.modelBinder = new Backbone.ModelBinder();
      t.componentViews = {}; // Map of componentId to it's view

      // Keep the original page object to see if it's dirty
      t.originalPage = t.model.toJSON({trim:false});

      // See if the model is dirty on change
      t.model.on('change', function() {
        t.$el.toggleClass('dirty', t.isDirty());
        t.setLockText();
      });

      // Build the template from the individual templates
      if (!pageTemplate) {
        pageTemplate = new Template({
          text:
            $('#nm-template-PageView').html()
        });
        aboutTemplate = new Template({
          text:
            $('#nm-template-About').html()
        });
      }
    },

    // Event declarations
    events: {
      "mousedown .modal-header"     : UI.modalDragStart,
      "click .nm-pv-menu-icons"     : "hideToolTips",
      "click .nm-pv-logo"           : "toggleTopbar",
      "click .nm-pv-dirty"          : "lockPage",

      // Menu items
      "click .nm-pvm-settings"      : "showSettings",
      "click .nm-pv-title"          : "showSettings",
      "click .nm-pvm-add-component" : "newComponent",
      "click .nm-pvm-arrange"       : "toggleLock",
      "click .nm-pvm-about"         : "showAbout"
    },

    render: function() {

      var t = this,
          model = t.model,
          components = model.get('components');

      // Build the template options
      var tmplOpts = {
        source: 'src',
        logo: t.logo,
        version: t.version,
        isClosed: document.location.toString().indexOf("#hideHeader") > 0 ? 'closed' : ''
      }

      // Render the HTML from the template
      var params = _.extend(tmplOpts, model.toJSON());
      t.$el.html(pageTemplate.apply(params));

      // Bind the view elements
      var bindings = _.extend(
        Backbone.ModelBinder.createDefaultBindings(t.$el, 'name'), {
          description: {
            selector: '.nm-pv-title',  elAttribute: 'data-original-title'
          }
        }
      );
      t.modelBinder.bind(model, t.$el, bindings);

      // Set the lock/unlock menu text
      t.setLockText();

      // Reset the view element to the contained page view
      t.setElement(t.$('.nm-pv'));
      t.canvas = t.$('.nm-pv-canvas');
      t.sidebar = t.$('.nm-pv-sidebar');

      // Attach the about dialog
      t.$el.append(aboutTemplate.apply(params));

      // Instantiate the sidebar
      var sidebarView = new UI.Sidebar({model: model, el: t.sidebar, pageView:t});
      sidebarView.render();

      // Instantiate the page settings dialog.  It works on the same Page model.
      var pageSettingsView = new UI.PageSettingsView({model: model, pageView:t});
      pageSettingsView.render();
      t.canvas.append(pageSettingsView.$el);

      // Instantiate the copy page dialog.  It works on the same Page model.
      var pageCopyView = new UI.PageCopyView({model: model, pageView:t});
      pageCopyView.render();
      t.canvas.append(pageCopyView.$el);

      // Instantiate the new component dialog.
      var newComponentView = new UI.NewComponentView({model: model, pageView:t});
      newComponentView.render();
      t.canvas.append(newComponentView.$el);

      // Initialize modal dialogs
      t.$('#nm-pv-settings, #nm-pv-new-component, #nm-pv-about').modal({show:false});
      t.$('.modal a').attr({target: '_blank'});

      // Initialize all static color pickers
      $('.colorPicker').miniColors({
        opacity: true
      })

      // Initialize the dropdown.  The delegated click event is removed
      // during dropdown, so attach it to the element itself.
      t.$('.nm-pv-menu-icons')
        .dropdown()
        .on('click', function(){t.hideToolTips();});

      // Connect all tooltips
      UI.tooltip(t.$('.nm-pv-tt'));

      // Apply custom CSS, and bind to model changes.
      t.applyCss();
      model.on('change:css', t.applyCss, t);

      // Add components to the canvas, and watch for changes
      t.renderComponents();
      components.on('remove', t.renderComponents, t);
      components.on('add', t.renderComponents, t);

      // Run the onInit function if specified
      if (model.get('onInit')) {
        t.runOnInit();
      }

      // Center window, and connect to window.resize
      $(window).on('resize', function(){t.centerPage();});
      t.centerPage();

    },

    // This applies the style sheets specified in the model
    applyCss: function() {
      var t = this;
      $.styleSheet(t.model.get('css'), 'nm-pv-css');
    },

    // Determine the overall area the components consume on the canvas.
    // Returns {top: xx, left: xx, width: xx, height: xx}
    getComponentArea: function() {
      var t = this,
          minTop = minLeft = 99999,
          maxBottom = maxRight = -99999,
          box = {top:0, left:0, width:0, height:0};

      // Go through all components
      t.$('.nm-pv-component').each(function() {
        var component = $(this).find('.nm-cv'),
            left = (parseInt(component.css('left'), 10)),
            top = (parseInt(component.css('top'), 10)),
            width = component.outerWidth(),
            height = component.outerHeight(),
            right = left + width,
            bottom = top + height;

        // Set the max/mins
        minLeft = minLeft > left ? left : minLeft;
        minTop = minTop > top ? top : minTop;
        maxRight = maxRight < right ? right : maxRight;
        maxBottom = maxBottom < bottom ? bottom : maxBottom;

      });

      // Set the box dimensions if any components exist
      if (minLeft < maxRight) {
        box.top = minTop;
        box.left = minLeft;
        box.width = maxRight - minLeft;
        box.height = maxBottom - minTop;
      }

      // Return the area
      return box;
    },

    // Center the page by adding left margin to the canvas
    centerPage: function(e) {
      var t = this,
          box = t.getComponentArea(),
          canvasCenter = t.$el.width() / 2;

      // No components
      if (!box.width) {return;}

      // Obtain the center point, and offset the canvas by the difference
      var componentCenter = box.left + (box.width / 2);
      t.canvas.css({marginLeft: Math.max(0, canvasCenter - componentCenter)});
    },

    // Move all components so the furthest left is on the left of the canvas.
    // This makes the scrollbars make sense.
    leftJustify: function() {
      var t = this,
          box = t.getComponentArea();

      // Shift all components by the furthest left
      if (box.left) {
        t.$('.nm-pv-component').each(function() {
          var elem = $(this).find('.nm-cv'),
              left = (parseInt(elem.css('left'), 10)),
              model = t.componentViews[($(this).attr('id'))].model,
              css = _.clone(model.get('css')),
              parsedCss = $.parseStyleString(css['.nm-cv'] || '');

          // Set the left into the model & remove from the element style
          parsedCss.left = (left - box.left) + 'px';
          css['.nm-cv'] = $.makeStyleString(parsedCss);
          model.set({css: css});
          elem.css({left:''});
        });
      }
    },

    // Add a component to the canvas
    addComponent: function(model) {
      var t = this,
          componentView = new ComponentView({model: model});
      componentView.$el
        .addClass('nm-pv-component')
        .data('view', componentView);
      componentView.render();
      t.canvas.append(componentView.$el);
      t.componentViews[model.get('id')] = componentView;
    },

    // Get a component view on the screen
    getComponentView: function(componentId) {
      var t = this;
      return t.componentViews[componentId];
    },

    // Remove a component from the canvas
    removeComponent: function(model) {
      var t = this;
      t.canvas.find('#' + model.get('id')).remove();
    },

    // This adds and removes components from the page,
    // updating component data models if necessary.
    renderComponents: function() {
      var t = this,
          components = t.model.get('components'),
          canvas = t.$('.nm-pv-canvas');

      // Remove components not in the data model
      canvas.find('.nm-pv-component').each(function() {
        var component = $(this);
        if (!components.get(component.attr('id'))) {
          component.remove();
        }
      });

      // Add new components
      components.forEach(function(component) {
        var onScreen = t.$('#' + component.get('id'));
        if (!onScreen.length) {
          t.addComponent(component);
        }
      });

      // Center components onto the screen
      t.leftJustify();
      t.centerPage();
    },

    // This executes the onInit code contained in the page model
    runOnInit: function() {
      var t = this,
          pageView = t,
          getMonitor = function(id){return t.getMonitor(id);}
          pageModel = t.model;

      // Execute the onInit
      try {
        eval(t.model.get('onInit'));
      }
      catch (e) {
        console.error('PageView onInit threw exception: ', e);
        alert("Page onInit exception.  See console log for more information.");
      }
    },

    // Is the page model different from the persisted state?
    isDirty: function() {
      var t = this,
          raw = t.model.toJSON({trim:false});
      return !(_.isEqual(t.originalPage, raw));
    },

    // This hides tool tips and cancels awaiting timers
    hideToolTips: function() {
      var t = this;
      t.$('.nm-pv-tt').each(function() {
        var $el = $(this);
        clearTimeout($el.data('tooltip').timeout);
        $el.tooltip('hide');
      });
    },

    // This toggles the top navbar open/closed
    toggleTopbar: function() {
      var t = this,
          url = document.location.toString(),
          wasClosed = t.$el.hasClass('closed');
      t.hideToolTips();
      t.$el.toggleClass('closed');

      // Poor man's router.  If/when this gets more complex,
      // it should be changed to use Backbone.Router.
      if (wasClosed) {
        if (didCloseHeader) {
          // If we've manually closed the header, then going back will
          // prevent multiple up/downs from clogging history.
          window.history.back();
        } else {
          // If we haven't manually closed the header, just reset the hash.
          // This adds to browser history.
          window.location.hash = '';
        }
      } else {
        window.location.hash = '#hideHeader';
        didCloseHeader = true;
      }
    },

    // Open the new component dialog
    newComponent: function() {
      $('#nm-pv-new-component').centerBox().css({top:40}).modal('show');
    },

    // This shows the page settings modal dialog
    showSettings: function() {
      $('#nm-pv-settings').centerBox().css({top:40}).modal('show');
      // Set the cursor when the dialog fades in
      setTimeout(function(){
        $('#nm-pv-settings input').first().focus();
      }, 500);
    },

    // This clears all page components and opens the settings dialog
    newPage: function() {
      var t = this,
          components = t.model.get('components');
      components.remove(components.models);
      t.showSettings();
    },

    // Get the monitor for the specified component ID
    getMonitor: function(id) {
      var t = this,
          components = t.model.get('components');
      return components.get(id).get('monitor');
    },

    // This locks and unlocks form elements for sizing/moving
    // If the page is dirty when locking, it saves the page.
    toggleLock: function() {
      var t = this;
      return t.$el.hasClass('unlocked') ? t.lockPage() : t.unlockPage();
    },

    lockPage: function() {
      var t = this;
      t.$el.toggleClass('unlocked', false);
      if (t.isDirty()) {
        t.savePage();
      }
      t.setLockText();
      t.centerPage();
    },

    unlockPage: function() {
      var t = this;
      t.$el.toggleClass('unlocked', true);
      t.setLockText();
    },

    // This sets the lock/unlock/save menu text and icon
    // Locked   Dirty    Icon    Text
    //   x              unlock   Unlock Components
    //   x        x      save    Save Changes
    //                   lock    Lock Components
    //            x      save    Save Changes
    setLockText: function() {
      var t = this,
          isUnlocked = t.$el.hasClass('unlocked'),
          text = 'Edit Components',
          icon = 'edit';
      if (t.isDirty()) {
        text = 'Save Changes';
        icon = 'save';
      } else if (isUnlocked) {
        text = 'Lock Components';
        icon = 'lock';
      }
      t.$('.nm-pvm-lock').text(text);
      t.$('.nm-pvm-arrange i').attr('class', 'icon-' + icon);
    },

    // This shows the about page
    showAbout: function() {
      $('#nm-pv-about').centerBox().css({top:40}).modal('show');
    },

    // Persist the page to the backend
    savePage: function() {
      var t = this;
      t.hideToolTips();
      t.leftJustify();
      t.model.save(function(error){
        if (error) {
          console.error("Page save error:", error);
        }
      });
      t.originalPage = t.model.toJSON({trim:false});
      t.$el.removeClass('dirty');
      t.setLockText();
    }

  });

}(this));
