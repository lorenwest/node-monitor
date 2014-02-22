Monitor your Node.js application
================================

[![Build Status](https://secure.travis-ci.org/lorenwest/node-monitor.png?branch=master)](https://travis-ci.org/lorenwest/node-monitor)

Introduction
------------

Node-monitor is a library for remote monitoring and control of your Node.js app servers.

Like JMX in the Java world, node-monitor comes with a handful of general monitors, and allows you to create custom monitors for your application.

These monitors can be scripted using JavaScript, or placed onto a dashboard.

Project Guidelines
------------------

* *Simple* - Get started quickly
* *Powerful* - For multi-node enterprise deployment
* *Lightweight* - Inactive until used, small footprint during use 
* *Flexible* - Easy to write custom monitors for your app
* *Stable* - Well tested foundation for module developers


Getting Started
---------------

Run the following from your app server directory

    $ npm install monitor

Then place the following line in your application bootstrap, and restart your server

    require('monitor').start();

Monitoring your app with a REPL console
---------------------------------------

Ad-hoc monitoring can be done from a REPL console.  

Start up the REPL, and get the Monitor class.  Feel free to copy/paste these lines into your console:

    $ node
    > var Monitor = require('monitor');
    undefined

Now connect a monitor to a probe on your app server.  There are a handful of built-in probes, and you can build custom probes for your application or npm module.  

For this example, we'll monitor the *Process* probe:

    > var processMonitor = new Monitor({probeClass:'Process'});
    > processMonitor.connect();

The monitor is a [Backbone.js](http://backbonejs.org/) data model so it updates in real time, and you can get all fields with toJSON():

    > processMonitor.get('freemem');
    86368256
    > processMonitor.get('freemem');
    80044032
    > processMonitor.toJSON();
    ...

As the monitor changes, it emits change events:

    > processMonitor.on('change', function() {
    ... console.log(processMonitor.get('freemem'));
    ... });
 
Monitoring your app with a custom script
----------------------------------------

Using Node.js as a scripting language, you can write custom monitors that do anything Node.js can do.  Here's an example that prints to the console when free memory falls below a threshold.

Save this file to low-memory-warn.js, and run **node low-memory-warn**

    // Low memory warning monitor
    var Monitor = require('monitor');
    var LOW_MEMORY_THRESHOLD = 100000000;

    // Set the probe to push changes every 10 seconds
    var options = {
      hostName: 'localhost',
      probeClass: 'Process',
      initParams: {
        pollInterval: 10000
      }
    }
    var processMonitor = new Monitor(options);

    // Attach the change listener
    processMonitor.on('change', function() {
      var freemem = processMonitor.get('freemem');
      if (freemem < LOW_MEMORY_THRESHOLD) {
        console.log('Low memory warning: ' + freemem);
      }
    });

    // Now connect the monitor
    processMonitor.connect(function(error) {
      if (error) {
        console.error('Error connecting with the process probe: ', error);
        process.exit(1);
      }
    });

Monitoring your app in a browser
--------------------------------

The above script runs just as well within an html ```<script>``` tag as on the server.  For example, change the ```var Monitor = require('monitor');``` line to something like this:

    <script src="/path/to/monitor/dist/monitor-all.min.js"></script>

The browser distribution included in node-monitor exports a single variable ```Monitor``` to the global namespace, and it can be used just like the ```Monitor``` variable in ```var Monitor = require('monitor')```.

Your browser will probably have to be pointing to localhost or behind your firewall in order to connect with the app server on the configured monitor port.  See *Security Concerns* below.

Monitoring your app in a dashboard 
---------------------------
![Monitor-Dashboard](http://lorenwest.github.io/monitor-dashboard/img/cpu-gauge.png)

The [monitor-dashboard](https://github.com/lorenwest/monitor-dashboard) application lets you visualize your monitors in a dashboard.

    $ npm install monitor-dashboard
    $ npm start monitor-dashboard

Security Concerns
-----------------

Exposing the internals of your app server is a high security risk.  By default, the server listens on port 42000 and will connect with localhost clients only.

In order to monitor across machines, the default configuration must be changed to listen beyond localhost.  Before doing this, it is recommended to understand the risks and have external measures in place to prevent unauthorized access.

See notes in the ```config/external.js``` file for more information.

Links
-------

* [API Docs](http://lorenwest.github.io/node-monitor/doc/index.html) - Node monitor JavaScript documentation.
* [Monitor Dashboard](https://github.com/lorenwest/monitor-dashboard) - Dashboards for the node monitor project.
* [Dashboard Components](https://github.com/lorenwest/core-monitor) - Core components for the Dashboard project.

License
-------

May be freely distributed under the MIT license<br>
See the [LICENSE](https://github.com/lorenwest/node-monitor/blob/master/LICENSE) file.<br>
Copyright (c) 2010-2014 Loren West<br>

