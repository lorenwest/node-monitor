// PageView.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor-min'),
      UI = Monitor.UI,
      ComponentView = UI.ComponentView,
      Template = UI.Template,
      templates = {},
      Backbone = Monitor.Backbone,
      _ = Monitor._,
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

      // Set the initial page to not dirty
      t.setDirty(false);

      // See if the model is dirty on change
      t.model.on('change', function() {
        var isDirty = t.isDirty(),
            wasDirty = t.$el.hasClass('dirty');

        // Change the dirty state
        if (isDirty != wasDirty) {
          t.setDirty(isDirty);
        }
      });

      // Build the template from the individual templates
      if (!pageTemplate) {
        pageTemplate = Template.fromDOM('#nm-template-PageView');
      }
    },

    // Event declarations
    events: {
      "mousedown .modal-header"     : UI.modalDragStart,
      "click .nm-pv-menu-icons"     : "hideToolTips",
      "click .nm-pv-logo"           : "toggleTopbar",
      "click .nm-pv-dirty"          : "savePage",

      // Menu items
      "click .nm-pvm-settings"      : "showSettings",
      "click .nm-pv-title"          : "showSettings",
      "click .nm-pvm-add-component" : "newComponent",
      "click .nm-pvm-edit"          : "toggleEdit",
      "click .nm-pvm-save"          : "savePage",
      "click .nm-pvm-about"         : "showAbout"
    },

    render: function() {

      var t = this,
          model = t.model,
          components = model.get('components'),
          is404page = model.get('is404page'),
          isClosed = localStorage.isPageHeaderClosed;

      // Clear the data model before any bindings
      if (is404page) {
        model.unset('is404page', {silent:true});
      }

      // Build the template options
      var tmplOpts = {
        source: 'src',
        logo: t.logo,
        version: t.version,
        isClosed: isClosed ? 'closed' : ''
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
      t.tourbar = t.$('.nm-pv-tour');

      // Instantiate the sidebar
      var sidebar = model.get('sidebar');
      t.sidebarView = new UI.SidebarView({el: t.sidebar, pageView:t});
      t.sidebarView.render();

      // Create a TourView if we're currently in a tour.
      var tourJSON = localStorage.currentTour;
      if (tourJSON) {
        try {
          var currentTour = new UI.Tour(JSON.parse(tourJSON));
          t.tourView = new UI.TourView({model: currentTour, el: t.tourbar, pageView:t});
          t.tourView.render();
        } catch (e) {
          // Current tour is compromised
          console.error("Problem creating current tour: ", e, e.stack);
          delete localStorage.currentTour;
        }
      }

      // Instantiate the page settings dialog.  It works on the same Page model.
      t.pageSettingsView = new UI.PageSettingsView({model: model, pageView:t});
      t.pageSettingsView.render();
      t.canvas.append(t.pageSettingsView.$el);

      // Instantiate the new page view
      t.newPageView = new UI.NewPageView({});
      t.newPageView.render();
      t.canvas.append(t.newPageView.$el);

      // Instantiate the copy page dialog.  It works on the same Page model.
      t.pageCopyView = new UI.PageCopyView({model: model, pageView:t});
      t.pageCopyView.render();
      t.canvas.append(t.pageCopyView.$el);

      // Instantiate the new component dialog.
      t.newComponentView = new UI.NewComponentView({model: model, pageView:t});
      t.newComponentView.render();
      t.canvas.append(t.newComponentView.$el);

      // Initialize modal dialogs
      t.$('#nm-pv-settings, #nm-pv-new-component').modal({show:false});
      t.$('.modal a').attr({target: '_blank'});

      // Initialize all static color pickers
      $('.colorPicker').miniColors({
        opacity: true
      });

      // Initialize the dropdown.  The delegated click event is removed
      // during dropdown, so attach it to the element itself.
      t.$('.nm-pv-menu-icons')
        .dropdown()
        .on('click', function(){t.hideToolTips();});

      // Connect all tooltips
      UI.tooltip(t.$('*[title]').addClass('nm-pv-tt'));

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

      // Is this a 404 page?
      if (is404page) {

        // Go straight to the new page settings if we created the page
        if (localStorage.createPage === "Y") {
          delete localStorage.createPage;
          setTimeout(function(){
            t.newPage();
          },100);
        }
      }

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
          sidebarWidth = t.sidebar.width(),
          canvasWidth = t.$el.width() - sidebarWidth,
          canvasCenter = canvasWidth / 2;

      // No components
      if (!box.width) {return;}

      // Obtain the center point, and offset the canvas by the difference
      // Keep the left margin at multiples of 10 to match components
      var componentCenter = box.left + (box.width / 2);
      var newLeft = sidebarWidth + Math.max(0, canvasCenter - componentCenter);
      newLeft = newLeft - newLeft % 10;
      t.canvas.css({marginLeft: newLeft});
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

    // Set the page as dirty or not
    setDirty: function(isDirty) {
      var t = this;

      // Change the view elements
      t.$el.toggleClass('dirty', isDirty);
      if (!isDirty) {
        t.originalPage = t.model.toJSON({trim:false});
      }
    },

    // This hides tool tips and cancels awaiting timers
    hideToolTips: function() {
      var t = this;
      t.$('.nm-pv-tt').each(function() {
        var $el = $(this),
            tooltip = $el.data('tooltip');
        if (tooltip) {
          clearTimeout($el.data('tooltip').timeout);
        }
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
        delete localStorage.isPageHeaderClosed;
      }
      else {
        localStorage.isPageHeaderClosed = 'yes';
      }
    },

    // Show the specified (loaded) dialog box
    showDialog: function(selector, params) {
      var t = this;
      $(selector).centerBox().css({top:40}).modal('show');

      // Set the cursor when the dialog fades in
      setTimeout(function(){
        $(selector + ' input').first().focus();
      }, 500);
    },

    // Open the new component dialog
    newComponent: function() {
      var t = this;
      t.showDialog('#nm-pv-new-component');
    },

    // This shows the page settings modal dialog
    showSettings: function() {
      // Remember the current page state
      var t = this;
      t.pageSettingsView.originalModel = t.model.toJSON({trim:false});

      // Load & show the dialog
      t.showDialog('#nm-pv-settings');
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

    // This enters or exits edit mode
    toggleEdit: function() {
      var t = this;
      t.$el.hasClass('edit-mode') ? t.unlockPage() : t.editPage();
    },

    editPage: function() {
      var t = this;
      t.$el.toggleClass('edit-mode', true);
      t.setLockText();
    },

    unlockPage: function() {
      var t = this;
      t.$el.toggleClass('edit-mode', false);
      t.setLockText();
    },

    // Run the tour specified by id
    runTour: function(id) {
      var t = this;

      // Is there a tour running already?
      if (t.tourView) {
        t.tourView.stop();
      }

      // Load the Tour and start it
      var tour = new UI.Tour({id:id});
      tour.fetch(function(err){
        if (err) {
          alert("Error: Cannot open tour id: " + id);
          console.error(e);
          return;
        }

        // Go to the first page
        var pages = tour.get('pages');
        if (!pages.length) {
          alert('No pages in tour: ' + tour.get('title'));
          return;
        }

        // Save the current tour, and navigate to it
        localStorage.currentTour = JSON.stringify(tour);
        t.navigateTo(pages[0].url);
      });
    },

    // Navigate to the specified page url
    // prompting the user if the current page is dirty
    navigateTo: function(url) {
      location.href = url;
    },

    // This sets the edit menu text and icon
    setLockText: function() {
      var t = this,
          isEditMode = t.$el.hasClass('edit-mode'),
          text = isEditMode ? 'Lock Components' : 'Edit Components',
          icon = isEditMode ? 'lock' : 'edit';
      t.$('.nm-pvm-lock').text(text);
      t.$('.nm-pvm-edit i').attr('class', 'icon-' + icon);
    },

    // This shows the about page
    showAbout: function() {
      var t = this;

      // Show if loaded
      if (aboutTemplate) {
       return t.showDialog('#nm-pv-about');
      }

      UI.loadTemplate('', 'About', function(error, template) {
        if (error) {return;}

        t.$el.append(template.apply(t));
        t.$('.modal a').attr({target: '_blank'});
        t.$('.colorPicker').miniColors({opacity: true});
        t.showDialog('#nm-pv-about');
      });
    },

    // Persist the page to the backend
    savePage: function() {
      var t = this;
      t.hideToolTips();
      t.leftJustify();
      t.centerPage();
      t.model.save(function(error){
        if (error) {
          console.error("Page save error:", error);
        }
      });
      t.unlockPage();
      t.setDirty(false);
    }

  });

  /**
  * New Page dialog
  *
  * @class NewPageView
  * @extends Backbone.View
  * @constructor
  */
  var newPageTemplate = null;
  var NewPageView = UI.NewPageView = Backbone.View.extend({

    // Constructor
    initialize: function(options) {
      var t = this;
      if (!newPageTemplate) {
        newPageTemplate = Template.fromDOM('#nm-template-NewPage');
      }
    },

    // Event declarations
    events: {
      "click .btn-cancel"        : "cancel",
      "click .btn-primary"       : "create"
    },

    render: function() {
      var t = this;
      t.$el.append(newPageTemplate.apply({}));
    },

    cancel: function() {
      var t = this;
      t.$('.nm-np-address').val('');
    },

    create: function() {
      var t = this,
          pageId = t.$('.nm-np-address').val();
      localStorage.createPage = "Y";
      UI.pageView.navigateTo(pageId);
    }

  });

}(this));
