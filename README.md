Headless Monitor
================

Headless (non-UI) version of [Node Monitor](https://github.com/lorenwest/node-monitor)

[![Build Status](https://secure.travis-ci.org/lorenwest/monitor-min.png?branch=master)](https://travis-ci.org/lorenwest/monitor-min)


Introduction
------------

This package provides a foundation for monitoring and controlling remote
node.js applications.

It introduces the concept of a [Probe](http://lorenwest.github.com/monitor/doc/classes/Probe.html) -
a small software component capable of exposing and controlling state within a
running node.js server.

Probes are written as
[Backbone](http://documentcloud.github.com/backbone) models, and
remain dormant in your process until instantiated from remote monitors.

From the monitoring process, a [Monitor](http://lorenwest.github.com/monitor/doc/classes/Monitor.html) class
is provided to connect with a remote probe.

This package is used for writing and embedding probes into your app server,
and for writing custom clients for inspecting and controlling these probes.
A companion package  -
[Node Monitor](http://lorenwest.github.com/node-monitor) - provides a user interface
for building real time monitor dashboards.

Quick Start
-----------

**Install using npm**

    $ npm install monitor

**Start the monitor service (standalone)**

Normally you'll include this package into your own application server, but you can
run as a standalone application as well.

    $ npm start monitor

**Observe a probe from a remote process**

In this example we're using a REPL console to connect with the
built-in [Process](http://http://lorenwest.github.com/monitor/doc/classes/Process.html) probe.

Open a REPL console from another terminal

    $ node

Create a monitor for the Process probe

    > var Monitor = require('monitor');
    > var processMonitor = new Monitor({server:'localhost', probeClass: 'Process'});

Connect with the probe, and view the properties

    > processMonitor.connect();
    > processMonitor.toJSON();

The monitor is a Backbone model, so you can watch for changes

    > var showFreeMem = function(){console.log(processMonitor.get('freemem'))};
    > processMonitor.on('change', showFreeMem);

See Also
--------

* [API-Docs](http://lorenwest.github.com/monitor/doc/index.html) Monitor internal documentation
* [Node Monitor](http://lorenwest.github.com/node-monitor) Companion webapp for building real time monitor dashboards

License
-------

May be freely distributed under the MIT license

See [LICENSE](https://github.com/lorenwest/monitor/blob/master/LICENSE) file.

Copyright (c) 2010-2013 Loren West
