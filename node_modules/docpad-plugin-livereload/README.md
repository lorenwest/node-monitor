# Live Reload Plugin for [DocPad](https://docpad.org)

[![Build Status](https://secure.travis-ci.org/bevry/docpad-plugin-livereload.png?branch=master)](http://travis-ci.org/bevry/docpad-plugin-livereload "Check this project's build status on TravisCI")
[![NPM version](https://badge.fury.io/js/docpad-plugin-livereload.png)](https://npmjs.org/package/docpad-plugin-livereload "View this project on NPM")
[![Gittip donate button](http://badgr.co/gittip/docpad.png)](https://www.gittip.com/docpad/ "Donate weekly to this project using Gittip")
[![Flattr donate button](https://raw.github.com/balupton/flattr-buttons/master/badge-89x18.gif)](http://flattr.com/thing/344188/balupton-on-Flattr "Donate monthly to this project using Flattr")
[![PayPayl donate button](https://www.paypalobjects.com/en_AU/i/btn/btn_donate_SM.gif)](https://www.paypal.com/au/cgi-bin/webscr?cmd=_flow&SESSION=IHj3DG3oy_N9A9ZDIUnPksOi59v0i-EWDTunfmDrmU38Tuohg_xQTx0xcjq&dispatch=5885d80a13c0db1f8e263663d3faee8d14f86393d55a810282b64afed84968ec "Donate once-off to this project using Paypal")

Automatically refreshes your [DocPad](https://docpad.org) built website whenever a regeneration is performed



## Install

1. Install the Plugin

	``` bash
	docpad install livereload
	```

1. Ensure your layout outputs the scripts block

	1. In eco:
		
		```
		<%- @getBlock('scripts').toHTML() %>
		```
	  
	1. In jade:

		``` jade
		!= getBlock('scripts').toHTML()
		```


## Configure

### `enabled`
This option specifies whether or not this plugin should be enabled or disabled, by default it is `true` for the development environment and `false` for all other environments.

### `inject`
This option specifies whether or not we should try to inject our socket library into the page. It is `true` by default.

### `getSocket`
This option when falsey (the default) means we will create our own socket instance, however if you already have your own socket instance you can set this option as a function that will return your own socket instance.

### `channel`
This option specifies the which channel we should listen to, it defaults to `/docpad-livereload`

### `socketOptions`
This option allows you to customise the [primus configuration](https://github.com/3rd-Eden/primus) that we use if we have to create our own instance.

### `generateBeforeBlock`, `generateAfterBlock`, `listenBlock`, `injectBlock`, `scriptBlock`, `styleBlock`
These options allow you to customise the content of the scripts and styles that are injected into your page by this plugin. Check out the source code of this plugin to figure out their usage.


## Troubleshooting

- [Watching doesn't work, works only some of the time, or I get `EISDIR` errors](http://docpad.org/docs/troubleshoot#watching-doesn-t-work-works-only-some-of-the-time-or-i-get-eisdir-errors)


## History
[You can discover the history inside the `History.md` file](https://github.com/bevry/docpad-plugin-livereload/blob/master/History.md#files)


## Contributing
[You can discover the contributing instructions inside the `Contributing.md` file](https://github.com/bevry/docpad-plugin-livereload/blob/master/Contributing.md#files)


## License
Licensed under the incredibly [permissive](http://en.wikipedia.org/wiki/Permissive_free_software_licence) [MIT License](http://creativecommons.org/licenses/MIT/)
<br/>Copyright &copy; 2012+ [Bevry Pty Ltd](http://bevry.me) <us@bevry.me>
