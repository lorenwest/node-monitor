// IconChooser.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor-min'),
      UI = Monitor.UI,
      Backbone = Monitor.Backbone,
      _ = Monitor._;

  // Constants
  var ICON_NAMES = "glass music search envelope heart star star-empty user film th-large th th-list ok remove zoom-in zoom-out off signal cog trash home file time road download-alt download upload inbox play-circle repeat refresh list-alt lock flag headphones volume-off volume-down volume-up qrcode barcode tag tags book bookmark print camera font bold italic text-height text-width align-left align-center align-right align-justify list indent-left indent-right facetime-video picture pencil map-marker adjust tint edit share check move step-backward fast-backward backward play pause stop forward fast-forward step-forward eject chevron-left chevron-right plus-sign minus-sign remove-sign ok-sign question-sign info-sign screenshot remove-circle ok-circle ban-circle arrow-left arrow-right arrow-up arrow-down share-alt resize-full resize-small plus minus asterisk exclamation-sign gift leaf fire eye-open eye-close warning-sign plane calendar random comment magnet chevron-up chevron-down retweet shopping-cart folder-close folder-open resize-vertical resize-horizontal bar-chart twitter-sign facebook-sign camera-retro key cogs comments thumbs-up thumbs-down star-half heart-empty signout linkedin-sign pushpin external-link signin trophy github-sign upload-alt lemon phone check-empty bookmark-empty phone-sign twitter facebook github unlock credit-card rss hdd bullhorn bell certificate hand-right hand-left hand-up hand-down circle-arrow-left circle-arrow-right circle-arrow-up circle-arrow-down globe wrench tasks filter briefcase fullscreen group link cloud beaker cut copy paper-clip save sign-blank reorder list-ul list-ol strikethrough underline table magic truck pinterest pinterest-sign google-plus-sign google-plus money caret-down caret-up caret-left caret-right columns sort sort-down sort-up envelope-alt linkedin undo legal dashboard comment-alt comments-alt bolt sitemap umbrella paste user-md";

  /**
  * A utility class for displaying an icon picker for FontAwesome icons.
  *
  * @class IconChooser
  * @constructor
  * @param options {Object} View initialization options (See others in Backbone.View)
  * @param options.el = Select element to bind the chooser to
  */
  var IconChooser = UI.IconChooser = Backbone.View.extend({

    initialize: function(options) {
      var t = this;

      // Append all selector items
      ICON_NAMES.split(' ').forEach(function(name) {
        t.$el.append('<option value="icon-' + name + '">icon-' + name + '</option>');
      });

    }

  });

}(this));
