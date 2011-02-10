/**
 * MonitorPage
 *
 *
 */
YUI.add("monitorpage", function(Y) {

  // Constructor
  function MonitorPage(params) {
	this.p = params;
    MonitorPage.superclass.constructor.apply(this, arguments);
  }

  // Statics
  MonitorPage.NAME = "monitorPage";
  MonitorPage.ATTRS = {
    pageState : {
    	value: "A"
    }
  };
  MonitorPage.HTML_PARSER = {};
  MonitorPage.HTML = [
    '<div class="header-container"></div>',
    '<div class="yui3-g page-layout">',
    '  <div class="yui3-u browser-container"></div>',
    '  <div class="yui3-u desktop-container"></div>',
    '  <div class="yui3-u help-container"></div>',
    '</div>',
  ''].join('\n');

  /* MonitorPage extends the base Widget class */
  Y.extend(MonitorPage, Y.Widget, {

    initializer: function() {},
    destructor : function() {},
    
    renderUI : function() {
      // Replace content with this instance
      var t=this, p=t.p, cb=t.get("contentBox");
      cb.set('innerHTML', MonitorPage.HTML);
      t.headerContainer = cb.one(".header-container");
      t.browserContainer = cb.one(".browser-container");
      t.desktopContainer = cb.one(".desktop-container");
      t.helpContainer = cb.one(".help-container").hide();
      var params = {rpc:p.rpc};
      Y.use("header", function(Y) {
        t.header = new Y.Monitor.Header(params).render(t.headerContainer);
      });
      Y.use("processbrowser", function(Y) {
        t.browser = new Y.Monitor.ProcessBrowser(params).render(t.browserContainer);
      });
      Y.use("desktop", function(Y) {
        t.desktop = new Y.Monitor.Desktop(params).render(t.desktopContainer);
      });
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

    // Beyond this point is the MonitorPage specific application and rendering logic

    /* Attribute state supporting methods (see attribute config above) */
    /* Listeners, UI update methods */
  });

  /* Add this class to my application namespace */
  Y.namespace("Monitor").MonitorPage = MonitorPage;

}, "3.2.0", {requires:["widget", "processbrowser"]});
