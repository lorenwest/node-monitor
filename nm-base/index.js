// Base Node-Monitor UI app.
(function(root){

  // Create a server, and expose the view directory for static files
  var Connect = require('connect');
  var Static = Connect['static'](__dirname + '/view');

  // Export a middleware component
  var app = module.exports = function(request, response, next) {

    // Process dynamic app endpoints here
    if (request.url === '/status') {
      response.writeHead(200, {'Content-Type': 'text/plan'});
      return response.end('ok');
    }

    // Forward to the static endpoint, then to the next step
    // if the static file isn't there.  The next step is a monitor page.
    return Static(request, response, next);
  }

}(this));
