// WebView.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor'),
      UI = Monitor.UI,
      Backbone = Monitor.Backbone,
      _ = Monitor._;

  /**
  * Web page viewport
  *
  * @class WebView
  * @extends Backbone.View
  * @constructor
  * @param options {Object} View initialization options (See others in Backbone.View)
  */
  var WebView= UI.app.base.WebView= Backbone.View.extend({

    // Define the view
    name: 'Web Snippet',
    icon: 'image/WebClip.png',
    description: 'Displays a snippet of a remote web page',
    defaultOptions: {
      title: 'Web Snippet',
      background: true,
      siteUrl: '',
      scrollBars: false,
      offsetTop: 0,
      offsetLeft: 0
    },

    initialize: function(options) {
      var t = this;
      t.component = options.component;
      t.viewOptions = options.viewOptions;
      if (t.component) {
        t.component.setDefaultSize({
          width: 300,
          height: 300
        });
      }

      // Change immediately on option changes
      t.viewOptions.on('change', function(){t.style(false);});
    },

    render: function() {
      var t = this;

      // Place the iframe & style it
      t.view =
        t.$el.html(
        '<div class="nm-base-wv">' +
          '<iframe class="nm-base-wv-iframe" src="about:blank"></iframe>' +
        '</div>')
        .find('.nm-base-wv');
      t.iFrame = t.view.find('.nm-base-wv-iframe');
      t.style(true);
      t.iFrame.on('load', function(){t.style();});
    },

    style: function(initial) {
      var t = this,
          css,
          opts = t.viewOptions.toJSON();

      // Style the iframe
      t.view.toggleClass('scroll-bars', opts.scrollBars);

      // On initial load, use margins for scrolling.
      // This prevents an initial flash while the iframe loads
      if (initial) {
        css = {
          marginTop: Math.min(opts.offsetTop, 0),
          marginLeft: Math.min(opts.offsetLeft, 0)
        };
        t.view.scrollTop(0);
        t.view.scrollLeft(0);
      } else {
        css = {
          marginTop: 0,
          marginLeft: 0
        };
        t.view.scrollTop(opts.offsetTop * -1);
        t.view.scrollLeft(opts.offsetLeft * -1);
      }
      t.iFrame.css(css);

      // Don't reload the page on re-style unless the url changed
      if (opts.siteUrl !== t.currentSiteUrl) {
        t.iFrame.attr('src', opts.siteUrl);
        t.currentSiteUrl = opts.siteUrl;
      }

    }

  });

  // Custom settings form
  WebView.SettingsView = Backbone.View.extend({

    initialize: function(options) {
      var t = this;
      t.options = options;
      t.viewOptions = t.options.component.get('viewOptions');
    },

    events: {
      // Don't be so aggressive on keydown
      'keydown .nm-base-wv-url': function(e){e.stopPropagation()},
      'mousedown .nm-base-wv-example-mask': 'startDrag'
    },

    render: function() {
      var t = this;
      t.monitor = t.options.monitor;
      t.$el.html('' +
        '<div class="nm-base-wv-input">' +
          '<label>Page URL</label>' +
          '<input data-view-option="siteUrl" class="nm-base-wv-url" type="text" placeholder="http://..." />' +
          '<span>Scrollbars: </span><input data-view-option="scrollBars" type="checkbox"/>' +
        '</div>' +
        '<label>Drag to position</label>' +
        '<div class="nm-base-wv-example-group">' +
          '<div class="nm-base-wv-example"></div>' +
          '<div class="nm-base-wv-example-mask"></div>' +
        '</div>'
      );

      // Append another web view as an example
      var example = new WebView({
        model: t.options.model,
        component: t.options.component,
        viewOptions: t.viewOptions,
        el: t.$('.nm-base-wv-example')
      });
      example.render();

    },

    // Position the window
    startDrag: function(e) {
      var t = this,
          start = {
            top: e.pageY,
            left: e.pageX,
            offsetTop: t.viewOptions.get('offsetTop'),
            offsetLeft: t.viewOptions.get('offsetLeft')
          };

      function drag(e) {
        t.viewOptions.set({
          offsetTop: e.pageY - start.top + start.offsetTop,
          offsetLeft: e.pageX - start.left + start.offsetLeft
        });
      }
      function drop(e) {
        $(document).unbind("mousemove", drag).unbind("mouseup", drop);
      }
      $(document).bind("mousemove", drag).bind("mouseup", drop);
      e.preventDefault();
    }

  });

}(this));
