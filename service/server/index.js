/*******************************************************************************
* index.js - Service the main webapp
********************************************************************************
*/

// Dependencies
var deps = require('../../deps');
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

  // Prerequisites
  if (request.url != "/") {
    response.writeHead(404);
    response.end();
    if (request.url != "/favicon.ico") {
      monitor.error("Page not found", {url:request.url});
    }
    return;
  }

  // Initialize
  var startTime = new Date();

  // CSS files to load
  var cssFiles = [
    '/public/ext/yui-reset-fonts-grids.css',
    '/public/monitor.css'
  ];

  // Script files to load
  var scriptFiles = [
    '/public/ext/socket.io.js',
    '/public/json-rpc.js',
    '/public/ext/yui/yui/yui-min.js',
    '/public/ui/Header.js',
    '/public/ui/ProcessBrowser.js',
    '/public/ui/Desktop.js',
    '/public/ui/MonitorPage.js'
  ];

  // Build the CSS and JS elements
  var css = "", scripts="";
  for (var cssFile in cssFiles) {
    css += '    <link rel="stylesheet" type="text/css" href="' + cssFiles[cssFile] + '">\n';
  }
  for (var scriptFile in scriptFiles) {
    scripts += '    <script type="text/javascript" src="' + scriptFiles[scriptFile] + '"></script>\n';
  }

  // Spitting the document out programatically to inject variables.
  // A template would ordinarily be used, but the body is so small.
  response.writeHead(200, { 'Content-Type': 'text/html' });
  var page = [
    '<!DOCTYPE html>',
    '<html lang="en" dir="ltr" id="node-monitor" class="no-js">',
    '  <head>',
	'    <meta charset="utf-8">',
    '    <title>Node Monitor</title>',
	'    <meta name="description" content="Monitor for node.js processes"/>',
	'    <meta name="author" content="Loren West">',
    css,
    scripts,
    '    <script type="text/javascript" charset="utf-8">',
    '      YUI().use("node", "monitorpage", function(Y) {',
    '        document.WEB_SOCKET_SWF_LOCATION = "/public/ext/WebSocketMain.swf";',
    '        var socket = new io.Socket();',
    '        socket.connect();',
    '        var rpc = new jsonrpc(socket);',
    '        var params = {',
    '          rpc:rpc',
    '        }',
    '        new Y.Monitor.MonitorPage(params).render(Y.one("#ui-body"));',
    '      });',
    '    </script>',
    '  </head>',
    '  <body id="ui-body"></body>',
    '</html>'
  ].join("\n");
  response.end(page);
  
  // Record the call
  monitor.event("Index.htm time, ms", startTime);
  
};
