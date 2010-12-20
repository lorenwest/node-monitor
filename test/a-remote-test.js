/*******************************************************************************
* remote-test.js - Test for the remote REST server
********************************************************************************
*/

// This has to be set before the first require
process.argv.push('-monitor.remote.enabled', true);

// Dependencies
var deps = require('../deps');
var _ = deps._;
var remote = require('../lib/remote');
var request = require('request');
var urlStart = 'http://localhost:4200/';

// require('monitor/remote');
// npm run monitor

/*******************************************************************************
* RemoteTest
********************************************************************************
*/
exports.RemoteTest = vows.describe('Tests for the REST interface')

  .addBatch({
    'Library initialization': {
      'The remote class is available': function() {
        assert.isObject(remote);
      }
    }
  })
  
  .addBatch({
    'Ping test': {
      topic: {
        request(urlStart + "ping", this.callback);
      },
      'The ping comes back without an error': function(err, pingObj) {
        assert.isNull(err);
      },
      'And within 1 second of the request': function(err, pingObj) {
        assert.isNotNull(pingObj);
        assert.isTrue(pingObj.responseMs < 1000);
      }
    }
  })

;
