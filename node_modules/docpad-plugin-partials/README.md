# Partials Plugin for [DocPad](http://docpad.org)

[![Build Status](https://secure.travis-ci.org/bevry/docpad-plugin-partials.png?branch=master)](http://travis-ci.org/bevry/docpad-plugin-partials "Check this project's build status on TravisCI")
[![NPM version](https://badge.fury.io/js/docpad-plugin-partials.png)](https://npmjs.org/package/docpad-plugin-partials "View this project on NPM")
[![Gittip donate button](http://badgr.co/gittip/docpad.png)](https://www.gittip.com/docpad/ "Donate weekly to this project using Gittip")
[![Flattr donate button](https://raw.github.com/balupton/flattr-buttons/master/badge-89x18.gif)](http://flattr.com/thing/344188/balupton-on-Flattr "Donate monthly to this project using Flattr")
[![PayPayl donate button](https://www.paypalobjects.com/en_AU/i/btn/btn_donate_SM.gif)](https://www.paypal.com/au/cgi-bin/webscr?cmd=_flow&SESSION=IHj3DG3oy_N9A9ZDIUnPksOi59v0i-EWDTunfmDrmU38Tuohg_xQTx0xcjq&dispatch=5885d80a13c0db1f8e263663d3faee8d14f86393d55a810282b64afed84968ec "Donate once-off to this project using Paypal")

This plugin provides [DocPad](https://docpad.org) with Partials. Partials are documents which can be inserted into other documents, and are also passed by the docpad rendering engine.


## Install

```
docpad install partials
```


## Usage

### Setup

To use, first create the `src/partials` directory, and place any partials you want to use in there.

Then in our templates we will be exposed with the `@partial(filename,data)` function. The `data` argument is optional, and can be used to send custom data to the partial's template data. If you would like to send over the current document's template data, then do the following `@partial(filename,@,data)`.

If your partial only needs to be rendered once per (re)generation then you can specify `cacheable: true` in the partial's meta data, doing so greatly improves performance.

### Example

For instance we could create the file `src/partials/hello.html.md.eco` which contains `**Hello <%=@name or 'World'%>**`.

We could then render it by using `<%-@partial('hello.html.md.eco')%>` to get back `<strong>Hello World</strong>` or with `<%-@partial('hello.html.md.eco',{name:'Apprentice'})%>` to get back `<strong>Hello Apprentice</strong>`.



## History
[You can discover the history inside the `History.md` file](https://github.com/bevry/docpad-plugin-partials/blob/master/History.md#files)


## Contributing
[You can discover the contributing instructions inside the `Contributing.md` file](https://github.com/bevry/docpad-plugin-partials/blob/master/Contributing.md#files)


## License
Licensed under the incredibly [permissive](http://en.wikipedia.org/wiki/Permissive_free_software_licence) [MIT License](http://creativecommons.org/licenses/MIT/)
<br/>Copyright &copy; 2012+ [Bevry Pty Ltd](http://bevry.me) <us@bevry.me>