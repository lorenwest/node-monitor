// Storage.js (c) 2010-2013 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/monitor-min
(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('../Monitor'),
      _ = Monitor._, Probe = Monitor.Probe;

  /**
  * Backbone model synchronization with server-side storage.
  *
  * This class contains client-side helpers for connecting backbone models
  * with server storage using the backbone
  * <a href="http://documentcloud.github.com/backbone/#Sync">```sync```</a>
  * mechanism.
  *
  *     var Storage = Monitor.Storage;
  *     var Book = Backbone.Model.extend({
  *       ...
  *       sync: Storage.synchronize('Book'),
  *       ...
  *     });
  *
  * This connects the backbone model
  * <a href="http://documentcloud.github.com/backbone/#Model-fetch">```fetch```</a>,
  * <a href="http://documentcloud.github.com/backbone/#Model-save">```save```</a>, and
  * <a href="http://documentcloud.github.com/backbone/#Model-destroy">```destroy```</a>
  * methods to backend storage via monitor based socket.io.
  *
  * The Storage class also offers *live data synchronization*, updating the data
  * model as changes are detected on the server.  See the
  * <a href="#method_synchronize">```synchronize```</a> method for more information.
  *
  * Server-side storage probes such as <a href="FileStorage.html">FileStorage</a>
  * extend their implementation from this base class.
  *
  * @class Storage
  * @extends Probe
  * @constructor
  */
  var Storage = Monitor.Storage = Probe.extend({

    defaults: {path:'', tail:false, text:''},

    initialize: function(){
      var t = this;
      Probe.prototype.initialize.apply(t, arguments);
    },

    release: function() {
      var t = this;
      Probe.prototype.release.apply(t, arguments);
    }

  });

  /**
  * Synchronize a Backbone data model with server storage
  *
  * Backbone sync functions allow data models to synchronize with the server using the
  * <a href="http://documentcloud.github.com/backbone/#Model-fetch">fetch</a>,
  * <a href="http://documentcloud.github.com/backbone/#Model-save">save</a>, and
  * <a href="http://documentcloud.github.com/backbone/#Model-destroy">destroy</a>
  * methods.
  *
  * This method returns a sync function that performs data synchronization over
  * socket.io to a <a href="Storage.html">Monitor Storage</a> probe.
  * This method can be set into Backbone models to replace the default REST
  * implementation.
  *
  *     var Storage = Monitor.Storage;
  *     var Book = Backbone.Model.extend({
  *       ...
  *       sync: Storage.synchronize('Book'),
  *       ...
  *     });
  *
  * The sync function can also be set onto a specific instance of a model.
  *
  *     var myBook = new Book({id:'44329'});
  *     myBook.sync = Storage.synchronize('Book');
  *
  * In addition to providing the standard fetch, save, and destroy functionality,
  * synchronization offers *live data synchronization*, updating the data model
  * as changes are detected on the server.
  *
  * To enable live synchronization with the server, call ```sync.on()```
  * on the instance.
  *
  *     // Turn on live synchronization
  *     myBook.sync.on();
  *
  * This refreshes the ```myBook``` instance with the contents of the Book class
  * id ```44329```, persists any local changes to ```myBook```, and keeps ```myBook```
  * up to date with changes detected on the server.
  *
  * If the id element is not set or if the id doesn't exist on the server, it
  * will create a new object on the server, generating an id if necessary.
  *
  * Live data monitoring consumes resources on both the client and server.  To
  * free those resources, make sure to call the ```sync.off()``` method.
  * Otherwise, resources are released when the connection is terminated.
  *
  *     // Turn off live synchronization
  *     myBook.sync.off();
  *
  * See the <a href="http://documentcloud.github.com/backbone/#Sync">Backbone documentation</a>
  * for more information about the Backbone.sync functionality.
  *
  * @static
  * @method synchronize
  * @param [className] {String} The data class name, passed to the storage probe for namespacing.
  *                    If not provided, it must be supplied from a className element (or function) on the model.
  * @param [probeClass] {String} Storage probe class name.  Defaults to the probe set in the <a href="Storage.html#property_Config">Config.defaultProbe</a> property.
  * @param [probeParams] {Object} Storage probe initialization parameters.  Defaults to the parameters set in the <a href="Storage.html#property_Config">Config.defaultProbeParams</a> property.
  * @return {Function} The sync function to set into a class or instance.
  */
  Storage.synchronize = function(className, probeClass, probeParams) {
    var sync = function(method, model, options) {
    };

    // Live synchronization
    sync.on = function(){};
    sync.off = function(){};
    return sync;
  };

  /**
  * Static Configurations
  *
  * These can be set onto the Monitor.Storage class after it's loaded.
  *
  * Example:
  *
  *     var Storage = Monitor.Storage;
  *     Storage.Config.defaultProbe = 'DbStorage';
  *     Storage.Config.defaultProbeParams = {host:'db.mydomain.com', port:5984};
  *
  * @static
  * @property Config
  * @type &lt;Object&gt;
  * <ul>
  *   <li><code>defaultProbe (String)</code> Name of the storage probe to use for the <a href="Storage.html#method_synchronize">```Storage.synchronize```</a> method</li>
  *   <li><code>defaultProbeParams (String)</code> Initialization parameters for the storage probe used for the <a href="Storage.html#method_synchronize">```Storage.synchronize```</a> method</li>
  * </ul>
  */
  var defaultConfig = {
    defaultProbe: 'FileStorage',
    defaultProbeParams: {}
  };

  // Expose default configurations to the config package
  Storage.Config = _.extend({}, defaultConfig);

}(this));
