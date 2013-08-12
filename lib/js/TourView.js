// TourView.js (c) 2010-2013 Loren West and other contributors
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
      tourTemplate = null,
      pageTemplate = null;

  // Constants
  var ANIMATION_INTERVAL_MS = 50;

  /**
  * The page tour view
  *
  * @class TourView
  * @extends Backbone.View
  * @constructor
  */
  var TourView = UI.TourView = Backbone.View.extend({

    // Constructor
    initialize: function(options) {
      var t = this;

      // Build the template from the individual templates
      if (!tourTemplate) {
        tourTemplate = Template.fromDOM('#nm-template-TourView');
        lineTemplate = new Template({
          text: '<a class="nm-tv-page {{isCurrent}}" data-index="{{index}}" href="{{url}}" title="{{title}}"><div></div></a>'
        });
      }

      // Determine the current tour page index
      t.pages = t.model.get('pages'),
      t.pageIndex = localStorage.tourPageIndex;
      if (typeof t.pageIndex === 'undefined') {
        // Compute the page index based on this URL
        var url = location.href.toString().substr(location.origin.toString().length);
        t.pageIndex = 0; // Default to first page
        for (var i=0, l=t.pages.length; i < l; i++) {
          var page = t.pages[i];
          if (url === page.url) {
            t.pageIndex = i;
            break;
          }
        }
      }
      else {
        delete localStorage.tourPageIndex;
        t.pageIndex = parseInt(t.pageIndex);
      }

    },

    // Event declarations
    events: {
      'click .nm-tv-prev'    : 'prev',
      'click .nm-tv-next'    : 'next',
      'click .nm-tv-play'    : 'play',
      'click .nm-tv-pause'   : 'pause',
      'click .nm-tv-stop'    : 'stop',
      'click .nm-tv-page'    : 'select'
    },

    render: function() {

      var t = this,
          model = t.model,
          tourPaused = parseInt(localStorage.tourPaused);

      // Render the HTML from the template
      t.$el.html(tourTemplate.apply(model.toJSON()));

      // Place the pages
      var $pages = t.$('.nm-tv-pages'),
          i;
      for (i=0; i < t.pages.length; i++) {
        var attrs = {
          index: i,
          isCurrent: (i === t.pageIndex ? 'current' : ''),
          url: t.pages[i].url,
          title: t.pages[i].title
        }
        $(lineTemplate.apply(attrs)).appendTo($pages);
      }

      // Set the pages width manually for auto-centering
      DOT_WIDTH = 22;
      $pages.css({width: t.pages.length * DOT_WIDTH});

      // Place all tooltips on the right
      t.$('*[title]').attr('data-placement','right');

      // Start the tour
      t.progress = t.$('.nm-tv-progress');
      t.playDuration = t.model.get('autoNextSec') * 1000;
      t.playLeft = tourPaused ? tourPaused : t.playDuration; // Amount of play to go (in ms)
      t.playWidth = t.$('.nm-tv-progress-shadow').width();

      // Display the initial progress bar
      t.setProgress();

      // Start the player in the initial state
      tourPaused ? t.pause() : t.play();
    },

    setProgress: function() {
      var t = this;
      t.progress.css({width: Math.min(t.playWidth, t.playWidth - (t.playWidth * (t.playLeft / t.playDuration)))});
    },

    prev: function() {
      var t = this;
      t.pageIndex--;
      if (t.pageIndex < 0) {
        t.pageIndex = t.pages.length - 1;
      }
      localStorage.tourPageIndex = t.pageIndex;
      UI.pageView.navigateTo(t.pages[t.pageIndex].url);
    },

    next: function() {
      var t = this;
      t.pageIndex++;
      if (t.pageIndex >= t.pages.length) {
        t.pageIndex = 0;
      }
      localStorage.tourPageIndex = t.pageIndex;
      UI.pageView.navigateTo(t.pages[t.pageIndex].url);
    },

    play: function() {
      var t = this;

      // Return if already playing
      if (t.timer) {
        return;
      }

      // Erase a prior pause state
      delete localStorage.tourPaused;

      // Run at each animation interval
      var anim = function() {
        // Compute the amount of play left to go
        t.playLeft = t.playEnd - Date.now();

        // Done playing
        if (t.playLeft <= 0) {
          clearInterval(t.timer);
          t.next();
        }

        // Set the progress bar width
        t.setProgress();
      }

      // Kick off the player
      t.playEnd = Date.now() + t.playLeft;
      t.timer = setInterval(anim, ANIMATION_INTERVAL_MS);

      // Swap play/pause buttons
      t.options.pageView.hideToolTips();
      t.$('.nm-tv-play').css({display:'none'});
      t.$('.nm-tv-pause').css({display:'inline'});
    },

    pause: function() {
      var t = this;
      if (t.timer) {
        clearTimeout(t.timer);
        t.timer = null;
      }

      // Persist the pause state
      localStorage.tourPaused = "" + t.playLeft;

      // Swap play/pause buttons
      t.options.pageView.hideToolTips();
      t.$('.nm-tv-pause').css({display:'none'});
      t.$('.nm-tv-play').css({display:'inline'});
    },

    stop: function() {
      var t = this,
          pageView = t.options.pageView;
      delete localStorage.tourPageIndex;
      delete localStorage.tourPaused;
      delete localStorage.currentTour;
      pageView.hideToolTips();
      pageView.tourView.remove();
      pageView.tourView = null;
      if (t.timer) {
        clearTimeout(t.timer);
        t.timer = null;
      }
    },

    // Select a page
    select: function(e) {
      var t = this,
          target = $(e.currentTarget),
          index = target.attr('data-index');

      // Save the index.  If a tour has many instances of the
      // same page, it needs to know which instance.
      localStorage.tourPageIndex = index;

      // Navigate to the page
      UI.pageView.navigateTo(target.attr('href'));
    }

  });

}(this));
