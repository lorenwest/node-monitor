/***********************************************************************
* Viewer.js - Base class for all UI viewer objects
************************************************************************
*/ 

// Style sheets used in this file
$(function(){$.styleSheet([
                           
  // The VP is the inner viewport, for placing other viewers
  '.vwrVP {position:relative; overflow:hidden;}',
  
  // Screen mask for drag/drop/modal operations
  '.vwrMask',  '{position:absolute; top:0px; left:0px; z-index:60000; height:100%; width:100%;}',

  // This is used to clear the bottom of floats
  '.clr {clear:both; margin:0px; line-height:0px;}',
  
""]);});

/***********************************************************************
* Viewer - Abstract base class for all viewer classes.
************************************************************************
* This base class provides services and utilities for classes that 
* visualize themselves.  It provides resizing and scrolling support
* as well as a common pattern for implementing classes that visualize
* themselves.
*/
Viewer = Class.extend({

  /*******************************************************************
  * Constructor
  ********************************************************************
  * oParent: JQuery object of the parent DOM
  * oParms: (specific parameters for the specific kind of viewer)
  */
  init: function(oParent, oParms) {

    var t=this;
    t.oParent = oParent;      // The parent jQuery to append to (usually the oVP of the container)
    t.oParms = t.p = oParms;  // Object initialization parameters (w/shorthand t.p)

    // jQuery objects to use in sub-classes:
    t.oFrame = null;  // The main jQuery object for this instance (required)
    t.oVP = null;     // Viewport (this will be manually sized by this class)
    t.oVDeco = null;  // selection of vertical decorations (outside of the VP)
    t.oHDeco = null;  // selection of horizontal decorations (outside of the VP)
    
    // Current frame height/width.  These are maintained in resize()
    t.iFrmHt = -1;
    t.iFrmWd = -1;
    
    // Did the last call to resize() perform resizing?  This is set in
    // resize() based on the need to resize (Ht/Wd changed).
    t.bResized = false;
    
  },

  /*******************************************************************
  * Getters / Setters
  ********************************************************************
  */
  getFrame: function() { return this.oFrame; },
  getVP: function() { return this.oVP; },
  
  /*******************************************************************
  * close
  ********************************************************************
  * This closes the viewer, releasing all DOM.  Do not use this object
  * after calling close().
  */
  close: function() { this.oFrame.remove(); },
  
  /*******************************************************************
  * resize
  ********************************************************************
  * Resize the viewer
  */
  resize: function(bForce) {

    // Initialize
    var t=this, p=t.p;
    var iFrmHt = t.oFrame.height();
    var iFrmWd = t.oFrame.width();
    
    // Does resizing need to happen?  This sets t.bResized so ancestor
    // classes can see if they need to resize after calling _super();
    t.bResized = (bForce || iFrmHt != t.iFrmHt || iFrmWd != t.iFrmWd)
    if (!t.bResized) {return t;}
    
    // Remember the new ht/wd
    t.iFrmHt = iFrmHt;
    t.iFrmWd = iFrmWd;

    // Resize the viewport
    if (t.oVP != null) {

      // Get the vertical/horizontal decoration sizes
      var iVDeco = (t.iVDeco == null ? 0 : t.iVDeco);
      if (t.oVDeco != null) { t.oVDeco.each(function(){if($(this).is(":visible")) {iVDeco += $(this).outerHeight(true);}}); }
      var iHDeco = (t.iHDeco == null ? 0 : t.iHDeco);
      if (t.oHDeco != null) { t.oHDeco.each(function(){if($(this).is(":visible")) {iHDeco += $(this).outerWidth(true);}}); }
      
      // Set the height/width
      var oCSS = {height:parseInt(0 + iFrmHt - iVDeco), width:parseInt(0 + iFrmWd - iHDeco)};
    
      // IE bombs on first run
      if (oCSS.height < 0 || oCSS.width < 0) {return t;}
      
      // Set the CSS
      t.oVP.css(oCSS);
    }
    
    // Return this
    return t;
    
  } // resize()
  
}); // Class: Viewer
