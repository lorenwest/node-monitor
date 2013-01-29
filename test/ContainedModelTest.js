// ContainedModelTest.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Dependencies
  var Monitor = root.Monitor || require('../lib/index'),
      Backbone = Monitor.Backbone,
      UI = Monitor.UI;

  // Watch counters for each thing being watched
  var counters = {};

  // Raw object to stream into the classes
  var MODEL_RAW = {
        id:'parent',
        name:'Parent',
        subObject: {
          id:'subObject1',
          name:'Sub object level 1',
          subObject2: {
            id: 'subObject2',
            name: 'Sub object level 2'
          }
        },
        subArray: [
          {id: 'item1', name: 'array item 1', subObject2:{id:'sub1',name:'sub 1'}},
          {id: 'item2', name: 'array item 2', subObject2:{id:'sub2',name:'sub 2'}},
          {id: 'item3', name: 'array item 3', subObject2:{id:'sub3',name:'sub 3'}}
        ]
      };

  // Baseline Backbone class without containment
  var TestClassBaseline = Backbone.Model.extend({
    defaults: {
      id: '',
      name: '',
      subObject: {},
      subArray: []
    },
    initialize: function(){
    }
  });

  // Sub models
  var TestSubClass = Backbone.Model.extend({
    defaults: {
      id: '',
      name: '',
      subObject2: {}
    },
    initialize: function(){
      var t = this;
      // UI.containedModel(t, 'subObject2', TestSubClass);
    }
  });
  var TestSubClassList = Backbone.Collection.extend({model:TestSubClass});

  // Test class with contained models
  var TestClassContained = Backbone.Model.extend({
    defaults: {
      id: '',
      name: '',
      subObject: {},
      subArray: []
    },
    initialize: function(){
      var t = this;
      UI.containedModel(t, 'subObject', TestSubClass);
      UI.containedModel(t, 'subArray', TestSubClassList);
    }
  });

  /**
  * Unit tests for the contained model functionality
  * @class ContainedModelTest
  */

  /**
  * Test group for baseline (before containment) functionality
  * @method Baseline
  */
  module.exports['Baseline'] = {

    /**
    * Make sure Backbone hasn't added sub-object change functionality
    * @method Baseline-NoSubObjectChangeEvents
    */
    NoSubObjectChangeEvents: function(test) {
      var model = new TestClassBaseline(MODEL_RAW);
      var didChange = false;
      test.equals(model.id, 'parent', 'ID element set');
      test.equals(model.get('name'), 'Parent', 'Name element set');
      var sub = model.get('subObject');
      test.equals(sub.id, 'subObject1', 'Sub object is set');
      test.ok(!(sub instanceof Backbone.Model), 'Sub object is NOT a backbone model');
      test.equals(sub.subObject2.id, 'subObject2', 'Sub-sub object is NOT a backbone model');
      model.on('change', function(){didChange = true;});
      model.set({name:'another name'});
      test.ok(didChange === true, 'Top element change fires change event');
      didChange = false;
      sub.name = 'Yet another name';
      test.ok(didChange === false, 'Sub-element change does NOT fire change event');
      test.done();
    },

    /**
    * Make sure Backbone hasn't added sub-model change functionality
    * @method Baseline-NoSubModelChangeEvents
    */
    NoSubModelChangeEvents: function(test) {
      var model = new TestClassBaseline(MODEL_RAW);
      var didChange = false;
      model.set('subObject', new Backbone.Model(MODEL_RAW));
      var sub = model.get('subObject');
      test.equals(sub.get('id'), 'parent', 'Sub object is set');
      test.ok((sub instanceof Backbone.Model), 'Sub object was SET to a backbone model');
      model.on('change', function(){didChange = true;});
      sub.set({name:'another name'});
      setTimeout(function(){
        test.equal(didChange, false, 'Setting sub-model element does NOT fire a change event');
        didChange = false;
        test.done();
      },10);
    },

    /**
    * Same as NoSubModelChangeEvents, only attach the sub-model
    * @method Baseline-SubModelChangeEvents
    */
    SubModelChangeEvents: function(test) {
      var model = new TestClassBaseline(MODEL_RAW);
      var modelChanged = 0;
      var elemChanged = 0;
      var subChanged = 0;
      var changedAttrs = null;
      UI.containedModel(model, 'subObject', Backbone.Model);
      model.set('subObject', MODEL_RAW);
      var sub = model.get('subObject');
      test.equals(sub.get('id'), 'parent', 'Sub object is set');
      model.on('change', function(){
        modelChanged++;
        changedAttrs = model.changedAttributes();
      });
      model.on('change:subObject', function(){elemChanged++;});
      sub.on('change', function(){subChanged++;});
      sub.set({name:'another name'});
      setTimeout(function(){
        test.equal(subChanged, 1, 'The sub-object change event fired');
        test.equal(modelChanged, 1, 'The parent model change event fired');
        test.equal(elemChanged, 1, 'The parent model change:subObject event fired');
        test.equal(changedAttrs.subObject.get('name'), 'another name', 'Correctly identified the changed attribute');
        test.done();
      },10);
    },

    /**
    * Tests for sub arrays
    * @method Baseline-SubArrayChangeEvents
    */
    SubArrayChangeEvents: function(test) {
      var model = new TestClassBaseline(MODEL_RAW);
      var modelChanged = 0;
      var elemChanged = 0;
      var subChanged = 0;
      var changedAttrs = null;
      UI.containedModel(model, 'subArray', Backbone.Collection);
      model.set('subArray', MODEL_RAW.subArray);
      var sub = model.get('subArray');
      test.ok((sub instanceof Backbone.Collection), 'Sub array SET to a backbone collection');
      model.on('change', function(){
        modelChanged++;
        changedAttrs = model.changedAttributes();
      });
      model.on('change:subArray', function(){elemChanged++;});
      sub.on('change', function(){subChanged++;});
      sub.get('item1').set({name:'another name'});
      setTimeout(function(){
        test.equal(subChanged, 1, 'The sub-array change event fired');
        test.equal(modelChanged, 1, 'The parent model change event fired');
        test.equal(elemChanged, 1, 'The parent model change:subArray event fired');
        test.equal(changedAttrs.subArray.length, 3, 'Correctly identified the changed attribute');
        test.done();
      },10);
    }


  };

  // Reset the watcher counters
  var resetCounters = function() {
    counters = {
      testModelChange: 0,
      subObjectChange: 0,
      subArrayChange: 0,
      subArray1Change: 0,
      subArray2Change: 0,
      subArray3Change: 0
    }
  };

}(this));
