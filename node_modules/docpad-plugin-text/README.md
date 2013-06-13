# Text Plugin for DocPad
This plugin allows you to render variables within `templateData` using text elements

E.g. if you have this in your `docpad.cson`

``` coffeescript
{
	templateData:
		firstname: 'Benjamin'
		lastname: 'Lupton'
		fullname: '<t>firstname</t> <t>lastname</t>'
}
```

Doing the following inside a document:

``` html
My creator's firstname is: <t>firstname</t>
My creator's lastname is: <t>lastname</t>
My creator's fullname is: <t>fullname</t>
```

Will output:

``` html
My creator's firstname is: Benjamin
My creator's lastname is: Lupton
My creator's fullname is: Benjamin Lupton
```

Which is incredibly useful for abstracting out common generic pieces of text from your templates and placing them inside your configuration files. A common use case for this is easy configurability of skeletons, as well as easier translation of your website.


## Install
To use this plugin with DocPad, simply run `npm install docpad-plugin-text` inside your website's directory. You'd probably also want to add `"docpad-plugin-text": "latest"` to your `package.json` dependencies.


## History
You can discover the history inside the `History.md` file


## License
Licensed under the incredibly [permissive](http://en.wikipedia.org/wiki/Permissive_free_software_licence) [MIT License](http://creativecommons.org/licenses/MIT/)
<br/>Copyright &copy; 2012 [Bevry Pty Ltd](http://bevry.me)