/*******************************************************************************
* ping-test.js - Test the ping API
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var _ = deps._;
var vows = deps.vows;
var assert = deps.assert;
var ping = require('../service/ping');

/*******************************************************************************
* PingTest
********************************************************************************
*/
exports.PingTest = vows.describe('Tests for the ping API')

  .addBatch({
    'Library initialization': {
      'The service and API are available': function() {
        assert.isFunction(ping);
        assert.isFunction(ping.api);
      }
    }
  })
  
  .addBatch({
    'Ping test': {
      topic: function(){
        ping.api(this.callback);
      },
      'The ping comes back without an error': function(err, pingObj) {
        assert.isNull(err);
      },
      'And responds with a <pong>': function(err, pingObj) {
        assert.isNotNull(pingObj);
        assert.equal(pingObj.ping, 'pong');
      }
    }
  })

;
