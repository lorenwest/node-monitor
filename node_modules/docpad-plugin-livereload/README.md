# Live Reload Plugin for DocPad
Automatically refreshes your [DocPad](https://docpad.org) built website whenever a regeneration is performed



## Install

1. Install the Plugin

  ```
  npm install --save --force docpad-plugin-livereload
  ```

1. Ensure your layout outputs the scripts block, using eco it will look something like this:

  ```
  <%- @getBlock('scripts').toHTML() %>
  ```


## Configure

### Enabled
By default this plugin is disabled for all environments except the development environment. To enable on more environments set the `enabled` option to `true` inside your environments configuration.

### Inject
By default we will inject the socket.io dependency if we don't automatically detect it's presence. However, sometimes this auto detection doesn't always work. If this is the case, you can disable the injection and just do the listening by setting the `inject` option to `false`.

## History
You can discover the history inside the `History.md` file


## License
Licensed under the incredibly [permissive](http://en.wikipedia.org/wiki/Permissive_free_software_licence) [MIT License](http://creativecommons.org/licenses/MIT/)
<br/>Copyright &copy; 2012 [Bevry Pty Ltd](http://bevry.me)