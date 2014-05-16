0.6.10 / 2014-05-16
===================

  * Added cron/interval polling to RecipeProbe

0.6.9 / 2014-03-26
===================

  * Introduced writable probe attributes via monitor.set()
  * Introduced the Recipe probe for monitor automation
  * Introduced the DataModel probe for remote state management
  * Better Inspect probe evaluation error logging
  * Tests for the above

0.6.8 / 2014-02-22
===================

  * Better auto-start sequencing

0.6.7 / 2014-02-22
===================

  * Disable monitor connection until all auto-start monitors are connected

0.6.6 / 2014-02-21
===================

  * Named monitor instances
  * Auto-start monitors
  * Added tests for server start/stop
  * Made the example a little less confusing

0.6.5 / 2014-01-06
===================

  * Updated copyright year

0.6.4 / 2013-12-23
===================

  * Better README

0.6.3 / 2013-11-14
===================

  * Silence error logging that were common-case vs. errors

0.6.2 / 2013-11-12
===================

  * Better console log formatting
  * Exported global.Monitor for multi-module loading

0.6.1 / 2013-11-07
===================

  * Bumped up node-config version

0.6.0 / 2013-11-06
===================

  * Project name change from monitor-min

0.5.12 / 2013-10-23
===================

  * Updated config dependency to not freak out if the config directory is absent

0.5.11 / 2013-10-22
===================

  * Added TRACE to default console logging output
  * Better server listen error handling and debug output
  * Better error message on probe failure

0.5.10 / 2013-10-15
===================

  * Better console logging
  * Can chain require().start()
  * Travis test

0.5.9 / 2013-10-04
==================

  * Better probe instantiation error message

0.5.8 / 2013-09-15
==================

  * Use a gateway if available
  * More efficient localhost processing
  * Don't restart if already started
  * Fixed lint issues

0.5.7 / 2013-08-28
==================

  * Allow socket.io to connect any way it can
  * Fixed process.uptime
  * Detect and prevent stat & log recursion
  * Improved log usage

0.5.6 / 2013-07-22
==================

  * Changed log/stat probe timestamp from integer to ISO

0.5.6 / 2013-07-19
==================

  * Added a timestamp to logProbe/statProbe bundles

0.5.5 / 2013-07-18
==================

  * Added Log & Stat classes
  * Tests for Stat & Log
  * Added LogProbe & StatProbe
  * Added Log.console for console logging
  * Added log statements & stats gathering

0.5.4 / 2013-05-23
==================

  * Exported documentation to a public site
  * Updated links in README.txt

0.5.3 / 2013-05-16
==================

  * Fixed a dependency issue in the monitor.js bootstrap

0.5.2 / 2013-04-17
==================

  * Revved the major version to match node-monitor major version
  * Added Stats and Logs

0.1.1 / 2013-03-21
==================

  * Initial checkin after montior re-org
