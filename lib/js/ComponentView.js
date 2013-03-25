// ComponentView.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor-min'),
      Backbone = Monitor.Backbone, _ = Monitor._,
      UI = Monitor.UI,
      MonitorView = UI.MonitorView,
      Template = UI.Template,
      settingsView = null,
      customSettings = null,
      initOverrides = null,
      template = null;

  var DRAG_GRID_SNAP = 10;

  /**
  * ComponentView is the window container for the specific MonitorView.
  *
  * It contains common controls for opening view settings, moving and
  * sizing the viewport.
  *
  * @class ComponentView
  * @extends Backbone.View
  * @constructor
  */
  var ComponentView = UI.ComponentView = Backbone.View.extend({

    initialize: function(options) {

      // Build the template from the individual templates
      if (!template) {
        template = new Template({
          text: $('#nm-template-ComponentView').html()
        });
      }

      // Build monitor initParams override from URL parameters
      // TODO: Use a real url parser
      if (!initOverrides) {
        initOverrides = {};
        var search = window.location.search;
        if (search) {
          var parts = search.substr(1).split('&');
          for (var i=0; i < parts.length; i++) {
            var nameVal = parts[i].split('=');
            initOverrides[nameVal[0]] = nameVal[1];
          }
        }
      }
    },

    // Event declarations
    events: {
      "mousedown .nm-cv"            : "dragStart",
      "mousedown .nm-cv-resize"     : "resizeStart",
      "click .nm-cv-close"          : "close",
      "mousedown .nm-cv-status-box" : "toggleStatus",
      "mousedown .nm-cv-title span" : "openSettings",
      "mousedown .nm-cv-settings"   : "openSettings"
    },

    render: function() {
      var t = this,
          component = t.model,
          monitor = component.get('monitor'),
          position = component.get('position'),
          viewClassParts = component.get('viewClass').split('.'),
          appName = viewClassParts[0],
          viewClassName = viewClassParts[1];

      // Precondition checks
      if (!UI.app[appName]) {
        console.error("Monitor app '" + appName + "' not loaded.");
        return;
      }
      t.viewClass = UI.app[appName][viewClassName];
      if (!t.viewClass) {
        console.error("View class: " + viewClassParts.join('.') + " not loaded.");
        return;
      }

      // Instantiate the component settings view the first time
      if (!settingsView) {
        settingsView = new UI.ComponentSettingsView({
          model: t.model,
          pageView: UI.pageView,
          componentView:t
        });
        settingsView.render();
        UI.pageView.$el.append(settingsView.$el);
      }

      // Instantiate the generic component view
      t.$el.html(template.apply(component.toJSON()))
        .attr({id: component.id});
      var viewport = t.$('.nm-cv-viewport')
      viewport.addClass(viewClassParts.join('-'));

      // Apply styles for this component ID
      var applyStyles = function() {
        var styles = {},
            viewOptions = component.get('viewOptions'),
            title = viewOptions.get('title') || '',
            background = viewOptions.get('background'),
            css = component.get('css');
        for (var selector in css) {
          styles['#' + component.id + ' ' + selector] = css[selector];
        }
        $.styleSheet(styles, 'nm-cv-css-' + component.id);
        t.$('.nm-cv')
          .toggleClass('background', background === true)
          .toggleClass('title', title.length > 0);
        t.$('.nm-cv-title span').text(title);
      }
      applyStyles();
      component.on('change:css change:viewOptions', applyStyles);

      // Destroy this component, and render a new component if
      // the underlying monitor definition changes.
      var onMonitorChange = function() {

        // Don't continue if the probe portion was what changed.
        var thisMonitor = JSON.stringify(monitor.toMonitorJSON());
        if (thisMonitor === t.priorMonitor) {
          return;
        };

        // Remove the component listeners
        component.off('change:css change:viewOptions', applyStyles);
        component.off('change:monitor', onMonitorChange, t);

        // Disconnect, then build a fresh component
        t.connectMonitor(false, function(){
          UI.pageView.removeComponent(t.model);
          UI.pageView.addComponent(t.model);
        });
      };

      // Monitor changes to the monitor
      t.priorMonitor = JSON.stringify(monitor.toMonitorJSON());
      component.on('change:monitor', onMonitorChange, t);

      // Build the inner view initialization parameters
      var viewInit = {
        el: viewport,
        pageView: UI.pageView,
        component: t.model,
        componentView: t,
        monitor: t.model.get('monitor'),
        viewOptions: t.model.get('viewOptions')
      };

      // Initialize the inner view, but defer rendering until the monitor is
      // connected. This allows connect events to be attached in the view
      // initialize (if desired), and the monitor to be connected and filled
      // with model data prior to the render() which usually needs the data.
      t.view = new t.viewClass(viewInit);

      // Connect the monitor
      var statusBox = t.$('.nm-cv-status-box');
      statusBox.addClass('connecting');
      t.connectMonitor(true, function(error) {

        // Render even if errors happened
        t.view.render();

        // Connect tooltips to the rendered inner view
        UI.tooltip(t.$('.nm-cv-tt'));

        // Run the onInit function if specified
        if (t.model.get('onInit')) {
          t.runOnInit();
        }

      });

      // If no probe to connect with, remove status indicator
      if (!monitor.get('probeClass')) {
        statusBox.removeClass('connecting').addClass('unmonitored');
      }

      // Change the button state on connect/disconnect
      monitor.on('connect', t.onConnect, t);
      monitor.on('disconnect', t.onDisconnect, t);

    },

    /**
    * Close the component view
    *
    * This removes the component from the model, closing the view and leaving
    * the form in a dirty state.
    *
    * @method close
    */
    close: function() {
      var t = this;
      UI.pageView.model.get('components').remove(t.model);
    },

    /**
    * Connect or disconnect the monitor, calling the callback when done.
    *
    * @method connectMonitor
    * @param connect {boolean} Connect if true, disconnect if false
    * @param callback(error)
    */
    connectMonitor: function(connect, callback) {
      callback = callback || function(){};
      var t = this,
          needsConnecting = false,
          originalParams = null,
          monitor = t.model.get('monitor'),
          isConnected = monitor.isConnected();

      // Determine if we need to connect/disconnect
      if (
          (connect && !isConnected && monitor.get('probeClass')) ||
          (!connect && isConnected)) {
        needsConnecting = true;
      }

      // If no need to connect, callback on next tick.  This makes the
      // call stack consistent regardless of the presence of monitors.
      if (!needsConnecting) {
        setTimeout(function(){
          callback(null);
        },0);
        return;
      }

      // If connecting, override the init params with url params
      if (connect) {
        originalParams = monitor.get('initParams');
        monitor.set(
          {initParams: _.extend({}, originalParams, initOverrides)},
          {silent: true}
        );
      }

      // Connect or disconnect, calling the callback when done
      var connectFn = connect ? 'connect' : 'disconnect';
      monitor[connectFn](function(error) {

        // Replace original initParams (so the page isn't dirty)
        // Acutal init params will become attributes of the monitor object
        if (originalParams) {
          monitor.set(
            {initParams: originalParams},
            {silent: true}
          );
        }

        // If disconnecting, clear the probe data
        if (!connect) {
          var probeElems = monitor.toProbeJSON();
          delete probeElems.id;
          monitor.set(probeElems, {unset:true});
        }

        // Callback passing error if set
        return callback(error);
      });
    },

    // Toggle the connected status on/off
    toggleStatus: function(e) {
      var t = this,
          statusBox = t.$('.nm-cv-status-box'),
          connected = statusBox.hasClass('connected');

      statusBox.addClass('connecting');
      t.connectMonitor(!connected);
      e.stopPropagation();
    },

    onConnect: function() {
      var t = this,
          statusBox = t.$('.nm-cv-status-box');
      statusBox.removeClass('connecting').toggleClass('connected', true);
    },

    onDisconnect: function() {
      var t = this,
          statusBox = t.$('.nm-cv-status-box');
      statusBox.removeClass('connecting').toggleClass('connected', false);
    },

    // This hides tool tips and cancels awaiting timers
    hideToolTips: function() {
      var t = this;
      t.$('.nm-cv-tt').each(function() {
        var $el = $(this);
        clearTimeout($el.data('tooltip').timeout);
        $el.tooltip('hide');
      });
    },

    // Open the component settings dialog
    openSettings: function(e) {
      var t = this;

      // Set the component model into the settings view
      settingsView.setModel(t.model, t, t.viewClass['SettingsView']);

      // Center and show the settings
      $('#nm-cv-settings').centerBox().css({top:40}).modal('show');
      e.stopPropagation();

      // Place the cursor into the first field once the form fades in
      setTimeout(function(){
        settingsView.$('#nm-cv-settings input').first().focus();
      }, 500);
    },

    // This executes the onInit code contained in the component model
    runOnInit: function() {
      var t = this,
          pageView = UI.pageView,
          pageModel = pageView.model,
          view = t.view,
          getMonitor = function(id) {return pageView.getMonitor(id);},
          monitor = t.model.get('monitor');

      // Execute the onInit
      try {
        eval(t.model.get('onInit'));
      }
      catch (e) {
        console.error('ComponentView id:' + t.model.get('id') + ' onInit threw exception: ', e);
        alert("Component onInit exception.  See console log for more information.");
      }
    },

    // Raise this component to the top of the stack
    // If persist is true, persist any new zIndex into the CSS of the data model
    // Returns the component zIndex
    raiseToTop: function(persist) {
      var t = this,
          viewElem = t.$('.nm-cv'),
          thisZIndex = (viewElem.css('zIndex') === 'auto' ? 0 : +viewElem.css('zIndex')),
          components = UI.pageView.model.get('components'),
          maxZIndex = 0;

      // Get the maximum z-index (disregarding this)
      components.forEach(function(component) {
        var id = component.get('id'),
            elem = $('#' + id + ' .nm-cv'),
            zIndex = elem.css('zIndex') === 'auto' ? 0 : +elem.css('zIndex');

        if (id === t.model.get('id')) {return}
        if (zIndex > maxZIndex) {
          maxZIndex = zIndex;
        }
      });

      // Set this z-index to the max + 1 (unless already there)
      if (maxZIndex >= thisZIndex) {
        thisZIndex = maxZIndex + 1;
        if (persist) {
          // Change the model CSS.
          var css = _.clone(t.model.get('css')),
              parsedCss = $.parseStyleString(css['.nm-cv'] || '');

          parsedCss['z-index'] = thisZIndex;
          css['.nm-cv'] = $.makeStyleString(parsedCss);
          t.model.set({css: css});
        } else {
          t.$('.nm-cv').css({zIndex: thisZIndex});
        }
      }

      // Return this zIndex
      return thisZIndex;
    },

    // Move the component to the left of others by the width + 10
    moveToLeft: function() {
      var t = this,
          viewElem = t.$('.nm-cv'),
          width = viewElem.outerWidth() + 10;

      // Change the model CSS.
      var css = _.clone(t.model.get('css')),
          parsedCss = $.parseStyleString(css['.nm-cv'] || '');
      parsedCss['left'] = '-' + width + 'px';
      css['.nm-cv'] = $.makeStyleString(parsedCss);
      t.model.set({css: css});
    },

    // Component drag/drop positioning
    dragStart: function(e) {
      var t = this,
          thisZIndex = 0,
          inTitle = $(e.target).hasClass('nm-cv-title'),
          isEditMode = $('.nm-pv').hasClass('edit-mode'),
          persist = true;  // Persist changes to the model?

      // OK to drag if edit-mode or we're dragging from the title bar
      if (!isEditMode && !inTitle) {
        return;
      }

      // Bring component to the top unless [SHIFT] is pressed
      t.hideToolTips();
      if (!e.shiftKey) {
        // Bring window to top (and persist if window position changed)
        thisZIndex = t.raiseToTop(false);
      }

      // Record the current CSS to include the (changed) zIndex
      var viewElem = t.$('.nm-cv'),
          css = _.clone(t.model.get('css')),
          parsedCss = $.parseStyleString(css['.nm-cv'] || ''),
          zoomRatio = window.innerWidth / window.outerWidth,
          newPosition = {
            top: (parseInt(viewElem.css('top'), 10) || 0) * zoomRatio,
            left: (parseInt(viewElem.css('left'), 10) || 0) * zoomRatio
          },
          oldPosition = _.extend({},newPosition),
          offset = {
            top: e.pageY - newPosition.top,
            left: e.pageX - newPosition.left
          };

      function drag(e) {
        newPosition.top = Math.max(e.pageY - offset.top, 0);
        newPosition.left = e.pageX - offset.left;

        // Snap to grid unless [SHIFT] is pressed
        if (!e.shiftKey) {
          newPosition.top = newPosition.top - newPosition.top % DRAG_GRID_SNAP;
          newPosition.left = newPosition.left - newPosition.left % DRAG_GRID_SNAP;
        }
        viewElem.css(newPosition);
      }

      function drop(e) {
        $(document).unbind("mousemove", drag).unbind("mouseup", drop);

        // Persist the changes into the data model (if the window moved)
        if (persist && (oldPosition.top != newPosition.top || oldPosition.left != newPosition.left)) {
          // Fold position into component model CSS
          parsedCss.top = newPosition.top + 'px';
          parsedCss.left = newPosition.left + 'px';
          if (thisZIndex) {
            parsedCss['z-index'] = thisZIndex;
          }
          css['.nm-cv'] = $.makeStyleString(parsedCss);
          t.model.set({css: css});
          viewElem.css({top:'',left:''});
        }

        // Re-center the screen
        UI.pageView.centerPage();
      }

      $(document).bind("mousemove", drag).bind("mouseup", drop);
      e.preventDefault && e.preventDefault();
    },

    // Component resizing
    resizeStart: function(e) {
      var t = this,
          isEditMode = $('.nm-pv').hasClass('edit-mode'),
          thisZIndex = 0,
          persist = true,
          viewport = t.$('.nm-cv-viewport'),
          css = _.clone(t.model.get('css')),
          parsedCss = $.parseStyleString(css['.nm-cv-viewport'] || ''),
          origSize = {
            height: viewport.height(),
            width: viewport.width()
          },
          newSize = _.extend({},origSize),
          downPos = {
            top: e.pageY,
            left: e.pageX
          };

      // Bring component to the top unless [SHIFT] is pressed
      t.hideToolTips();
      if (!e.shiftKey) {
        // Bring window to top (and persist if window position changed)
        thisZIndex = t.raiseToTop(false);
      }

      function drag(e) {
        newSize.height = Math.max(origSize.height + e.pageY - downPos.top, 0);
        newSize.width = Math.max(origSize.width + e.pageX - downPos.left, 0);

        // Snap to grid unless [SHIFT] is pressed
        if (!e.shiftKey) {
          newSize.height = newSize.height - newSize.height % DRAG_GRID_SNAP;
          newSize.width = newSize.width - newSize.width % DRAG_GRID_SNAP;
        }
        t.view.trigger('resize');
        viewport.css(newSize);
      }

      function drop(e) {
        $(document).unbind("mousemove", drag).unbind("mouseup", drop);

        // Set new height/width into the model if it's changed
        if (persist && (newSize.height != origSize.height || newSize.width != origSize.width)) {
          parsedCss.height = newSize.height + 'px';
          parsedCss.width = newSize.width + 'px';
          if (thisZIndex) {
            parsedCss['z-index'] = thisZIndex;
          }
          css['.nm-cv-viewport'] = $.makeStyleString(parsedCss);
          t.model.set({css: css});
          viewport.css({height:'',width:''});
          t.view.trigger('resize');
        }
        // Re-center the screen
        UI.pageView.centerPage();
      }

      $(document).bind("mousemove", drag).bind("mouseup", drop);
      e.preventDefault();
      e.stopPropagation();
    }

  });

}(this));
