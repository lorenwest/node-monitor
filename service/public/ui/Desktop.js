/**
 * Desktop
 ********************************************************************************
 *
 */
YUI.add("desktop", function(Y) {

  // Constructor
  function Desktop(params) {
    Desktop.superclass.constructor.apply(this, arguments);
  }

  // Statics
  Desktop.NAME = "desktop";
  Desktop.ATTRS = {
    pageState : {
    	value: "A"
    }
  };
  Desktop.HTML_PARSER = {};
  Desktop.HTML = [
    '<div class="', Desktop.NAME, '">',
      'DESKTOP SECTION',
    '</div>',
  ''].join('\n');

  /* Desktop extends the base Widget class */
  Y.extend(Desktop, Y.Widget, {

    initializer: function() {},
    destructor : function() {},
    
    renderUI : function() {
      var t=this, cb=t.get("contentBox");
      cb.set("innerHTML", Desktop.HTML);
      
      /*
      var tree2 = new Y.TreeViewDD({
        boundingBox: t.get('contentBox'),
    	io: {
    	  url: 'assets/content.html'
    	},
    	children: [
    	  { label: 'Folder 1', children: [ { label: 'file' }, { label: 'file' }, { label: 'file' } ] },
    	  { label: 'Folder 2', expanded: true, children: [ { label: 'file' }, { label: 'file' } ] },
    	  { label: 'Folder 3', children: [ { label: 'file' } ] },
    	  { label: 'Folder 4', expanded: true, children: [ { label: 'Folder 4-1', expanded: true, children: [ { label: 'file' } ] } ] },
    	  { label: 'Folder 5', type: 'io', expanded: false }
    	],
    	type: 'file',
    	width: 200
      }).render();
      */
    },
    
    bindUI : function() {
       // this.after("attrAChange", this._afterAttrAChange);
    },
    syncUI : function() {
      /*
       * syncUI is intended to be used by the Widget subclass to
       * update the UI to reflect the initial state of the widget,
       * after renderUI. From there, the event listeners we bound above
       * will take over.
       */

      // this._uiSetAttrA(this.get("attrA"));
    }

    // Beyond this point is the Desktop specific application and rendering logic

    /* Attribute state supporting methods (see attribute config above) */
    /* Listeners, UI update methods */
  });

  /* Add this class to my application namespace */
  Y.namespace("Monitor").Desktop = Desktop;

}, "3.2.0", {requires:["widget"]});
