# Clean URLs Plugin for [DocPad](https://docpad.org)

[![Build Status](https://secure.travis-ci.org/docpad/docpad-plugin-cleanurls.png?branch=master)](http://travis-ci.org/docpad/docpad-plugin-cleanurls "Check this project's build status on TravisCI")
[![NPM version](https://badge.fury.io/js/docpad-plugin-cleanurls.png)](https://npmjs.org/package/docpad-plugin-cleanurls "View this project on NPM")
[![Flattr donate button](https://raw.github.com/balupton/flattr-buttons/master/badge-89x18.gif)](http://flattr.com/thing/344188/balupton-on-Flattr "Donate monthly to this project using Flattr")
[![PayPayl donate button](https://www.paypalobjects.com/en_AU/i/btn/btn_donate_SM.gif)](https://www.paypal.com/au/cgi-bin/webscr?cmd=_flow&SESSION=IHj3DG3oy_N9A9ZDIUnPksOi59v0i-EWDTunfmDrmU38Tuohg_xQTx0xcjq&dispatch=5885d80a13c0db1f8e263663d3faee8d14f86393d55a810282b64afed84968ec "Donate once-off to this project using Paypal")

Adds support for clean URLs to [DocPad](https://docpad.org)


## Install

```
npm install --save docpad-plugin-cleanurls
```


## Usage/Configure

For non-static environments we will set the document's url to it's clean url. This means that our document is still outputted to the same place on the file system as the clean url stuff is handled by the web server instead. This is the default.

For static environments we will set the document's `outPath` to that of a directory with a `index.html` file (e.g. `pages/welcome.html` will be outputted to `pages/welcome/index.html`). You can tell docpad to use the static environment by adding `--env static` to the end of your DocPad command, so to perform a one off generation for a static environment you'll run `docpad generate --env static`, to perform your usual generate, serve and watch it'll be `docpad run --env static`.

If you'd like to disable the static mode when working in the static environment you can add the following to your [docpad configuration file](http://docpad.org/docs/config).

``` coffee
environments:
	static:
		plugins:
			cleanurls:
				enabled: false
```

### trailingSlashes

Enable to generate `document.url`s like `'/beep/'` instead of `/beep`.  Defaults to `false`.


## History
[You can discover the history inside the `History.md` file](https://github.com/bevry/docpad-plugin-cleanurls/blob/master/History.md#files)


## Contributing
[You can discover the contributing instructions inside the `Contributing.md` file](https://github.com/bevry/docpad-plugin-cleanurls/blob/master/Contributing.md#files)


## License
Licensed under the incredibly [permissive](http://en.wikipedia.org/wiki/Permissive_free_software_licence) [MIT License](http://creativecommons.org/licenses/MIT/)
<br/>Copyright &copy; 2012+ [Bevry Pty Ltd](http://bevry.me)
<br/>Copyright &copy; 2011 [Benjamin Lupton](http://balupton.com)