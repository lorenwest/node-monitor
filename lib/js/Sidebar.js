// Sidebar.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor'),
      UI = Monitor.UI,
      Tree = UI.Tree,
      Tour = UI.Tour,
      Backbone = Monitor.Backbone,
      _ = Monitor._;

  /**
  * Browser-centric data about the sidebar
  *
  * This data model is persisted in browser localStorage, and consists of the
  * information about the sidebar to retain between pages (open state, current
  * tour, etc.)
  *
  * @class Sidebar
  * @extends Backbone.Model
  * @constructor
  * @param model - Initial data model.  Can be a JS object or another Model.
  *     @param [model.width=350] {Integer} - Width in pixels (0=closed)
  *     @param [model.currentTour] {Tour} - Current Tour object (id='' means no tour)
  *     @param [model.autoNextSec=0] {Number} - Number of seconds to stay on a page
  *         before navigating to the next page.  0=no autoNext.
  *     @param model.tree {Tree} - Sidebar items (as a tree)
  */
  var Sidebar = UI.Sidebar = Backbone.Model.extend({

    defaults: {
      width:350,
      currentTour: {},
      autoNextSec: 0,
      tree:{
        branches: [
          {
            id: 'fav',
            leaves:[
              {id: '/app/fav/fav1', label: 'Favorite 1'},
              {id: '/app/fav/fav2', label: 'Favorite 2'},
              {id: '/app/fav/fav3', label: 'Favorite 3'}
            ],
            isOpen: true
          },
          {
            id: 'recent',
            leaves:[
              {id: '/app/fav/recent1', label: 'Recent Page 1'},
              {id: '/app/fav/recent2', label: 'Recent Page 2'},
              {id: '/app/fav/recente', label: 'Recent Page 3'}
            ],
            isOpen: false
          },
          {
            id: 'pages',
            branches: [
              {id: '/app/app1a', label: 'App 1a', isOpen: false, isPlaceholder: true},
              {id: '/app/app2a', label: 'App 2a', isOpen: true, isPlaceholder: false,
                branches:  [
                  {id: '/app/app1b', label: 'Sub App 1b', isOpen: false, isPlaceholder: true},
                  {id: '/app/app2b', label: 'Sub App 2b', isOpen: true, isPlaceholder: false,
                    branches:  [
                      {id: '/app/app1c', label: 'Sub-sub App 1c', isOpen: false, isPlaceholder: true},
                      {id: '/app/app3c', label: 'Sub-sub App 3c', isOpen: false, isPlaceholder: true}
                    ],
                    leaves:[
                      {id: '/app/page/page1', label: 'Sub Page 1'},
                      {id: '/app/page/page2', label: 'Sub Page 2'},
                      {id: '/app/page/page3', label: 'Sub Page 3'},
                      {id: '/app/page/page4', label: 'Sub Page 4'},
                    ]},
                    {id: '/app/app3b', label: 'Sub App 3b', isOpen: false, isPlaceholder: true}
                  ],
                  leaves:[
                    {id: '/app/page/page1', label: 'Sub Page 1'},
                    {id: '/app/page/page2', label: 'Sub Page 2'},
                    {id: '/app/page/page3', label: 'Sub Page 3'},
                    {id: '/app/page/page4', label: 'Sub Page 4'},
                  ]
              },
              {id: '/app/app3a', label: 'App 3a', isOpen: false, isPlaceholder: true},
            ],
            leaves:[
              {id: '/app/page/page1', label: 'Root Page 1'},
              {id: '/app/page/page2', label: 'Root Page 2'},
              {id: '/app/page/page3', label: 'Root Page 3'},
              {id: '/app/page/page4', label: 'Root Page 4'},
            ],
            isOpen: false,
          },
          {
            id: 'tours',
            leaves:[
              {id: 'tour:/tour1', label: 'Page Tour 1'},
              {id: 'tour:/tour2', label: 'Page Tour 2'},
              {id: 'tour:/tour3', label: 'Page Tour 3'}
            ],
            isOpen: true
          }
        ]
      }
    },

    initialize: function(params, options) {
      var t = this;

      // Attach sub-model containment
      UI.containedModel(t, 'tree', Tree);
      UI.containedModel(t, 'currentTour', Tour);
    },

  });

  /**
  * Constructor for a list of Sidebar objects
  *
  *     var myList = new Sidebar.List(initialElements);
  *
  * @static
  * @method List
  * @param [items] {Array} Initial list items.  These can be raw JS objects or Sidebar data model objects.
  * @return {Backbone.Collection} Collection of Sidebar data model objects
  */
  Sidebar.List = Backbone.Collection.extend({model: Sidebar});

}(this));
