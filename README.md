Node Monitor Site
=================

This contains the node-monitor-pages branch of the node-monitor repository.
It's best to place this into a new directory, as it has a completely
different directory structure from the node monitor source.

To Develop
------------------------------

    ./docpad.sh run

Then open a browser to http://localhost:9778

To Publish
----------

    ./docpad.sh deploy-ghpages

This generates the correct static site for github pages, and publishes
the output directory to the gh-pages branch.
