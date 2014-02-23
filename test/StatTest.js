// StatTest.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // This should be run before other tests to set up configurations
  process.env.NODE_ENV='test';
  var config = require('config');

  // Dependencies
  var Monitor = require('../lib/index'),
      Stat = Monitor.Stat, Backbone = Monitor.Backbone,
      stat = Monitor.getStatLogger('stat-test');

  /**
  * Unit tests for the <a href="Stat.html">Stat</a> class.
  * @class StatTest
  */

  /**
  * Test group for baseline Stat functionality
  *
  * @method Stat
  */
  module.exports['Stat'] = {

    setUp: function(callback) {callback();},
    tearDown: function(callback) {callback();},

    /**
    * Tests that Stat class is in place
    * @method Stat-Classes
    */
    Classes: function(test) {
      test.ok(Stat.prototype, 'The Stat model is in place');
      test.done();
    },

    /**
    * Internal tests for Graphite type regular expressions
    * @method Stat-GraphiteRegExp
    */
    GraphiteRegExp: function(test) {
      var builder = Stat._buildRegex;
      var re;

      // Test the normal cases
      re = builder('hello.world');
      test.ok(re.test('hello.world'), 'normal case works');
      test.ok(!re.test('hello.wurld'), 'must be exact');
      test.ok(!re.test('Hello.wurld'), 'case sensitive');
      test.ok(!re.test('hello'), 'must have all words');
      test.ok(!re.test('Hello.world.now'), 'limited to just the specified fields');

      // Test the * wildcard
      re = builder('hello.*.world');
      test.ok(re.test('hello.nice.world'), 'normal case works');
      test.ok(re.test('hello.cruel.world'), 'normal case works');
      test.ok(!re.test('hello.cruel'), 'must have all segments');
      test.ok(!re.test('hello'), 'must have all segments');
      test.ok(!re.test('hello.nice.world.now'), 'too many segments');
      re = builder('*.*.world');
      test.ok(re.test('hello.nice.world'), 'normal case works');
      test.ok(re.test('Gello.nice.world'), 'this works too');
      test.ok(!re.test('Gello.nice'), 'but not this');
      re = builder('*.*.*');
      test.ok(re.test('a.b.c'), 'normal case works');
      test.ok(re.test('1.2.3'), '123 works');
      test.ok(!re.test('nice.world'), 'must have all fields');

      // Test the [] character list or range
      re = builder('hello.[123].world');
      test.ok(re.test('hello.1.world'), '1 case works');
      test.ok(re.test('hello.3.world'), '3 case works');
      test.ok(!re.test('hello.4.world'), '4 doesnt work');
      re = builder('hello.[1-3].world');
      test.ok(re.test('hello.1.world'), '1- case works');
      test.ok(re.test('hello.3.world'), '3- case works');
      test.ok(!re.test('hello.4.world'), '4- doesnt work');

      // Test the {list,in,str} list functionality
      re = builder('hello.{world,dolly,kitty}');
      test.ok(re.test('hello.world'), 'world works');
      test.ok(re.test('hello.kitty'), 'kitty works');
      test.ok(re.test('hello.dolly'), 'dolly works');
      test.ok(!re.test('hello.there'), 'there doesnt work');

      // Test the /regex/ functionality
      re = builder('/hello.world/');
      test.ok(re.test('hello.world'), 'hello world works');
      test.ok(!re.test('hello.kitty'), 'hello kitty fails');
      re = builder('/hello.world/i');
      test.ok(re.test('Hello World'), 'case insensitivity training');

      test.done();

    },

    /**
    * Tests that registering for '*' emits all stats
    * @method Stat-AllStats
    */
    AllStats: function(test) {

      // Listen for all stats
      Stat.once('*', function(module, name, value, type) {
        test.equals(module, 'stat-test', 'found the stat-test module when listening to *');
        test.equals(name, 'Some.Stat', 'found Some.Stat when listening to *');
        test.equals(value, 34, 'some.stat value is correct');
        test.equals(type, 'c', 'some.stat type is correct');
        test.done();
      });
      stat.increment('Some.Stat', 34);
    },

    /**
    * Tests the gauge functionality
    * @method Stat-Gauge
    */
    Gauge: function(test) {
      Stat.once('stat-test.gauge.stat', function(module, name, value, type) {
        test.equals(name, 'gauge.stat', 'gauge.stat emitted correctly');
        test.equals(value, -6273993, 'gauge.stat value is correct');
        test.equals(type, 'g', 'gauge.stat type is correct');
        test.done();
      });
      stat.gauge('gauge.stat', -6273993);
    },

    /**
    * Tests the time stat
    * @method Stat-Time
    */
    Time: function(test) {
      Stat.once('stat-test.time.stat', function(module, name, value, type) {
        test.equals(name, 'time.stat', 'time.stat emitted correctly');
        test.equals(value, 193, 'time.stat value is correct');
        test.equals(type, 'ms', 'time.stat type is correct');
        test.done();
      });
      stat.time('time.stat', 193);
    },

    /**
    * Tests the increment stat
    * @method Stat-Increment
    */
    Increment: function(test) {
      Stat.once('stat-test.incr1', function(module, name, value, type) {
        test.equals(name, 'incr1', 'incr1 stat emitted');
        test.equals(value, 1, 'default increment of 1 found');
        test.equals(type, 'c', 'incr1 type is correct');
      });
      Stat.once('stat-test.incr2', function(module, name, value, type) {
        test.equals(name, 'incr2', 'incr2 stat emitted');
        test.equals(value, 44, 'incr2 value is correct');
        test.equals(type, 'c', 'incr2 type is correct');
        test.done();
      });
      stat.increment('incr1');
      stat.increment('incr2', 44);
    },

    /**
    * Tests the decrement stat
    * @method Stat-Decrement
    */
    Decrement: function(test) {
      Stat.once('stat-test.decr1', function(module, name, value, type) {
        test.equals(name, 'decr1', 'decr1 stat emitted');
        test.equals(value, -1, 'default decrement of 1 found');
        test.equals(type, 'c', 'decr1 type is correct');
      });
      Stat.once('stat-test.decr2', function(module, name, value, type) {
        test.equals(name, 'decr2', 'decr2 stat emitted');
        test.equals(value, -29344, 'decr2 value is correct');
        test.equals(type, 'c', 'decr2 type is correct');
        test.done();
      });
      stat.decrement('decr1');
      stat.decrement('decr2', 29344);
    },

    /**
    * Tests the stat probe
    * @method Stat-ProbeTest
    */
    ProbeTest: function(test) {
      var statMonitor = new Monitor({probeClass:'Stat', initParams:{interval:10, pattern:'stat-test.*'}});
      statMonitor.connect(function(error) {
        test.ok(!error, 'Stat monitor error: ' + JSON.stringify(error));
        statMonitor.on('change', function() {
          var bundle = statMonitor.get('bundle');

          // Omit the initial state of the monitor
          if (bundle.length === 0) {
            return;
          }

          test.ok(bundle, 'The stat bundle is available');
          test.equals(bundle.length, 1, 'There is a single stat in the bundle');
          var statArgs = bundle[0];
          test.equals(statArgs.length, 5, 'There are 5 stat arguments');
          test.ok(Date.now() - (new Date(statArgs[0]).getTime()) < 1000, 'The first arg is a timestamp');
          test.equals(statArgs[1], 'stat-test', 'The module is correct');
          test.equals(statArgs[2], 'probeTest', 'The stat name is correct');
          test.equals(statArgs[3], 1, 'The value is correct');
          test.equals(statArgs[4], 'c', 'There stat type is correct');
          statMonitor.off('change');
          test.done();
        });
        stat.increment('probeTest');
      });
    },

    /**
    * Tests the probe streams multiple items at once
    * @method Stat-ProbeStream
    */
    ProbeStream: function(test) {

      // This relies on the fact that the monitor was created in the prior
      // function, and it just emitted a single item.
      var statMonitor = new Monitor({probeClass:'Stat', initParams:{interval:10, pattern:'stat-test.*'}});
      statMonitor.connect(function(error) {
        test.ok(!error, 'Stat monitor error: ' + JSON.stringify(error));
        statMonitor.on('change', function() {
          var bundle = statMonitor.get('bundle');

          // Omit the current state of the probe (first change event)
          if (bundle.length < 4) {
            return;
          }

          test.ok(bundle, 'The stat bundle is available');
          test.equals(bundle.length, 4, 'There were the correct number of items in the stream');
          var statArgs = bundle[2];
          test.equals(statArgs.length, 5, 'There are 5 stat arguments');
          test.ok(Date.now() - (new Date(statArgs[0]).getTime()) < 1000, 'The first arg is a timestamp');
          test.equals(statArgs[1], 'stat-test', 'The module is correct');
          test.equals(statArgs[2], 'statGauge', 'The stat name is correct');
          test.equals(statArgs[3], 420, 'The value is correct');
          test.equals(statArgs[4], 'g', 'There stat type is correct');
          statMonitor.off('change');
          test.done();
        });
        stat.increment('probeTestr');
        stat.decrement('probeTest');
        stat.gauge('statGauge', 420);
        stat.time('statTimer', 2840);
      });
    }

  };

}(this));
