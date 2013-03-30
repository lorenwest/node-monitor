NodeJS Monitoring
=================

Remote monitoring and control of your node.js app

[![Build Status](https://secure.travis-ci.org/lorenwest/monitor-min.png?branch=master)](https://travis-ci.org/lorenwest/monitor-min)

Introduction
------------

This is the minimum component necessary for remote monitoring and control of your NodeJS app.

Think of it as a supercharged [JMX](http://www.google.com/search?q=jmx&btnI) for NodeJS:

* **Easy to embed** - Add to your app with 1 line of code
* **Auto discovery** - Finds all instances of your app on a server
* **Remote REPL** - Remote login into your running apps
* **Process information** - CPU load, memory usage, uptime, etc.
* **Backbone.js integration** - Remotely monitor Backbone.js models, with active updates
* **Configuration control** - Inspect and tune your [app configurations](http://lorenwest.github.com/node-config) while running
* **Powerful** - For multi-node enterprise deployments
* **Lightweight** - Enough to run in a [Raspberry Pi](http://www.raspberrypi.org/faqs)
* **And much, much more...** - With a [plugin directory](https://github.com/lorenwest/monitor/wiki) for specialized monitoring

Quick Start
-----------

**Install using npm**

    $ npm install monitor-min

**Run standalone**

Play with the built-in server before embedding into your app:

    $ npm start monitor-min

Remotely Connect
----------------

The best way to monitor and control the app is with the
[Monitor Dashboard](http://lorenwest.github.com/node-monitor), but for this
example we'll go <i>headless</i>, driving it from another node.js process.

With the above server running in another window...

**Create a test.js**

    // Get a monitor to the Process probe
    var Monitor = require('monitor-min');
    var processMonitor = new Monitor({server:'localhost', probeClass: 'Process'});
    processMonitor.connect(function(error) {

      // Show the contents of the monitor
      console.log(processMonitor);

      // Remote monitors are Backbone.js models,
      // so you can observe them as they change
      processMonitor.on('change', function() {
        console.log(processMonitor.get('freemem'));
      });
    });

**Try it out**

    node test.js

You should see all data from the process montitor, followed by an ongoing report
of available memory.


Embedding Into Your App
-----------------------

**Add to your app**

Place the following line of code into your application bootstrap:

    require('monitor-min').start();

**Add the dependency to your package.json**

    "monitor-min": "0.5.x"

Now when you start your server, you'll be able to remotely monitor and control.

More Information
----------------

* [Monitor-Min Documentation](http://lorenwest.github.com/monitor-min)
* [Monitor Dashboard](http://lorenwest.github.com/node-monitor)
* [Node Config](http://lorenwest.github.com/node-config)

License
-------

May be freely distributed under the MIT license

See [LICENSE](https://github.com/lorenwest/monitor-min/blob/master/LICENSE) file.

Copyright (c) 2010-2013 Loren West
