/**
 * ProcessBrowser
 *
 *
 */
YUI.add("processbrowser", function(Y) {

  // Constructor
  function ProcessBrowser(params) {
    this.p = params;
    ProcessBrowser.superclass.constructor.apply(this, arguments);
  }

  // Statics
  ProcessBrowser.NAME = "processBrowser";
  ProcessBrowser.ATTRS = {
    processes : [
      {
        display:"Local Process",
        host:"localhost",
        port:4200
      }
    ]
  };
  ProcessBrowser.HTML_PARSER = {};
  ProcessBrowser.HTML = [
    '<div class="', ProcessBrowser.NAME, '">',
      'Loading...',
    '</div>',
  ''].join('\n');

  /* ProcessBrowser extends the base Widget class */
  Y.extend(ProcessBrowser, Y.Widget, {

    initializer: function() {},
    destructor : function() {},
    
    renderUI : function() {
      var t=this, cb=t.get("contentBox");
      cb.set("innerHTML", ProcessBrowser.HTML);
      
      // Fetch module information for each host
      p.rpc.xx();
      
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

    // Beyond this point is the ProcessBrowser specific application and rendering logic

    /* Attribute state supporting methods (see attribute config above) */
    /* Listeners, UI update methods */
  });

  /* Add this class to my application namespace */
  Y.namespace("Monitor").ProcessBrowser = ProcessBrowser;

}, "3.2.0", {requires:["widget"]});
