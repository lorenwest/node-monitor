// DropDownMenu.js (c) 2012 Loren West and other contributors
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
  * A data driven dropdown menu
  *
  * This is a backbone view that presents a dropdown menu of the items
  * in a backbone collection or JS array.
  *
  * @class DropDownMenu
  * @extends Backbone.View
  * @constructor
  * @param contextEl {jQuery} The element to place the dropdown menu over
  * @param model {Array or Collection} The menu items data model
  * @param [makeString] {function(item)} Method returning text to display for an item
  */
  /** @event select
  * @param item {Mixed} The item selected
  * @param index {integer} The index within the model
  */
  var DropDownMenu = UI.DropDownMenu = Backbone.View.extend({

    // Event declarations
    events: {
      'click li': 'onClick'
    },

    render: function() {
      var t = this,
          lineNum = 0,
          os = t.options.contextEl.offset(),
          height = t.options.contextEl.height();

      // Attach the list to DOM
      t.mask = new UI.ModalMask();
      t.items = t.$el.html('<ul class="nm-ddm-menu dropdown-menu"></ul>')
        .appendTo(t.mask.$el)
        .addClass('nm-ddm dropdown')
        .css({top:os.top + height, left:os.left})
        .find('ul');

      // Use or build the toString function
      var makeString = t.options.makeString || function(item) {
        return (typeof item === 'string' ? item : JSON.stringify(item));
      };

      // Add items to the menu
      t.options.model.forEach(function(item) {
        $('<li><a>' + makeString(item) + '</a></li>')
          .data({elem:item, line:lineNum++})
          .appendTo(t.items);
      });
    },

    onClick: function(e) {
      var t = this,
          el = $(e.currentTarget);
      t.trigger('select', el.data('elem'), el.data('line'));
    }

  });

  // Helper to dynamically add the dropdown caret to an element
  DropDownMenu.addCaret = function(el) {
    el
      .append('<b class="caret"></b>')
      .addClass('dropdown');
  };

}(this));
