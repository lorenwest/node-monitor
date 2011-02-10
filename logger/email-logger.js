/*******************************************************************************
* email-logger.js - A node-monitor logger for sending emails
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var _ = deps._;
var exec = require('child_process').exec;
var fs = require('fs');
var config = deps.config('email-logger', {
  defaultOpts: {
    mailcmd: "mail",
    body: "{{message}}",
    subject: "{{monitor.getName()}}",
    tmpdir: "/tmp"
  }
});

/******************************************************************************* 
* EmailLogger
********************************************************************************
* This returns a logger function which runs an email O/S command, sending the
* log message to the standard input.
* 
* For example, if you're following the node-config and node-monitor patterns, 
* and the following is at the top of your Customer module:
* 
*   var config = require('config')('Customer'); 
*   var monitor = require('monitor')('Customer', config.monitors);
*   
* And your deployment configuration defines this logger as the errorLogger
* 
*   // production.js - Configurations for the production deployment
*   module.exports = {
*     'Customer': {
*       'monitors': {
*         'new customer': {
*           errorLogger: 
*             require('monitor/email-logger')(
*             {
*               to:"me@example.com, you@example.com"
*             })
*         }
*       }
*     }
*   }
*   
* Then the following monitor will send email to me@example.com, passing the
* monitor name 'Customer save error' as the subject, and passing a formatted
* message to standard in when the following is run:
*   
*   monitor.error('Customer save error', {error:err, customer:customer});
* 
* Input:
*   mailOpts - (required) An options object, with the following elements:
*     to: (required) A list of email names to send to
*     subject: (optional) The mail subject (default: "{{monitor.getName()}}")
*     body: (optional) The email body (default: "{{message}}")
*     mailcmd: (optional) The mailer O/S command (default: mail)
*     tmpdir: (optional) A temp dir (must be writeable) (default: /tmp)
*       NOTE: Each of these elements can have parameters specified as 
*             mustache-style syntax.  See the defaults for examples.
*               Parameters include:
*                 message: A pre-formatted string message to log
*                 value: The numeric value passed to this monitor
*                 data: The data object passed in to the event/error log
*                 monitor: The monitor object.  The template can specify methods
*                          to run on this object such as "{{monitor.getAvg()}}"
*             
*   callback(error, stdout, stderr) - An optional function to call once the 
*           mailer completes.  It's passed any errors, and the stdout/stderr
*           contents.
*
* Output:
*   A logger function to attach to an eventLogger or errorLogger
*/
var EmailLogger = module.exports = function(mailOpts, callback) {

  // Build a new email logger function
  var loggerFunction = function(message, value, data, monitor) {

	// Build the actual options object based on defaults
	var opts = _.extendDeep({}, config.defaultOpts, mailOpts);

	// Build the object to pass to the template
    var obj = {message:message, value:value, data:data, monitor:monitor};

    // Apply the template to the options, using mustache style delimiters
    var origSettings = _.templateSettings;
    _.templateSettings = {
      // start: "{{",
      // end: "}}",
      interpolate: /\{\{(.+?)\}\}/g
    };
    var to = _.template(opts.to, obj);
    var subject = _.template(opts.subject, obj);
    subject = subject.length ? " -s \"" + subject.replace(/"/g,"") + "\" " : "";
    var body = _.template(opts.body, obj);
    var mailcmd = _.template(opts.mailcmd, obj);
    var tmpdir = _.template(opts.tmpdir, obj);
    _.templateSettings = origSettings;

    // Send the body to a temp file
    var tmpfile = tmpdir + "/" + Math.random() + ".tmp";
    fs.writeFile(tmpfile, body, function (err) {
      if (err) throw err;

      // Build the mailer command
      var cmd = mailcmd + subject + to + " < " + tmpfile;

      // Now run the command
      exec(cmd, function(err, stdout, stderr) {
    	
        // Remove the temporary file
        fs.unlink(tmpfile, function(err){
          if (err) throw err;
        });

        // Forward the callback
        callback && callback(err, stdout, stderr);
      });
    });
  };
  
  // Return the logger function
  return loggerFunction;
  
};