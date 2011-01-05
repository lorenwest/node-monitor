/*******************************************************************************
* index.js - Service the main webapp
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var _ = deps._;
var config = deps.monitorConfig.remote;
var connect = deps.connect;
var monitor = deps.serverMonitor;

/*****************************************************************************
* index()
******************************************************************************
* Service the main html page
*/
module.exports = function index(request, response) {

  // Initialize
  var startTime = new Date();

  // Error if the URL is unknown.
  if (request.url != "/" && request.url != "/index.html") {
    // Sending 400 vs. 404 for Chrome (which says the link is broken)
    response.writeHead(400);
    response.end("Error:  Page not found - " + request.url);
    return;
  }

  // Spitting the document out programatically to inject variables.
  // A template would ordinarily be used, but the body is so small.
  response.writeHead(200, { 'Content-Type': 'text/html' });
  var page = [
    '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"',
    '  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">',
    '',
    '<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en-us">',
    '  <head>',
    '    <meta http-equiv="content-type" content="text/html; charset=utf-8" />',
    '    <title>Node App Monitor</title>',
    '    <link rel="stylesheet" href="/public/monitor.css" type="text/css"/>',
    '    <script src="/public/jquery-1.4.4.min.js" type="text/javascript"></script>',
    '    <script src="/public/monitor.js" type="text/javascript"></script>',
    '    <script type="text/javascript" charset="utf-8">',
    '      $(document).ready(function() {',
    '        alert("loaded");',
    '        // new Monitor.UI($("body"), {});',
    '      });',
    '    </script>',
    '  </head>',
    '  <body></body>',
    '</html>'
  ].join("\n");
  response.end(page);
  
  // Record the call
  monitor.event("Index.html time, ms", startTime);
};
