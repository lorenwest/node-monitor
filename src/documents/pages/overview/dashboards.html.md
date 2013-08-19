---
layout: page
title: Dashboards
---

# Monitor Site
  Each page in the Node Monitor site is a different dashboard.

  Killer representative dashboard.

  Tooling (logs & events)
    * Monitor-min
    * Node-Monitor
    * Core-Monitor

  New Components:
    * ScrollingText - A viewer for log/file/any output lines
    * LogViewer - Specialized ScrollingText for logs
    * EventViewer - Specialized ScrollingText for events
    * TrendingList - An ordered list of String, number, trending arrow
    * TickerTape - A 1-line rotating ticker tape w/array of strings

  Interesting Node.JS stuff:

    Module Grid:
    App/App Module        Event Velocity
    (color) Name          (gauge)      (spark line)             (up/down)
    ...

    Server Grid:
    Server                CPU
    (color) Name          (gauge)      (spark line)             (up/down)

    Ordered List blocks:
    Most Active Module            Greatest Errors           Highest CPU
    (server/module/name)          (server/module/name)      (server)

    Static Message:
                 (!)  1 minutes(days/weeks/months) continuous uptime

    Latest warnings/errors
    +---------------------------------------------------------------------------+
    | ...                                                                       |
    |                                                                           |
    |                                                                           |
    |                                                                           |
    +---------------------------------------------------------------------------+

    Ticker:
    Double-line ticker.  Some manually entered, some automated (tweets?)


# Dashboards
  Parts of a dashboard
  ## Header
  ## Sidebar
  ## Control Panel

  ## Built-in Components
  ## Add-on Apps
