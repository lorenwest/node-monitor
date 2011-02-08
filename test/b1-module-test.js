/*******************************************************************************
* module-test.js - Test the module API
********************************************************************************
*/

// Dependencies
var deps = require('../deps');
var _ = deps._;
var vows = deps.vows;
var assert = deps.assert;
var module = require('../service/module');
var monitor = require('../lib/node-monitor')('mod-test');
monitor.event('Something Happened');

/*******************************************************************************
* moduleTest
********************************************************************************
*/
exports.moduleTest = vows.describe('Tests for the module API')

  .addBatch({
    'Library initialization': {
      'The service and API are available': function() {
        assert.isObject(module);
        assert.isFunction(module.listApi);
      }
    }
  })
  
  .addBatch({
    'List test': {
      topic: function(){
        module.listApi(this.callback);
      },
      'The module list comes back without an error': function(err, listObj) {
        assert.isNull(err);
      },
      'And it contains modules': function(err, listObj) {
        assert.isNotNull(listObj);
        assert.isNotNull(listObj.modules);
      },
      'And the modules contain configs and monitors': function(err, listObj) {
        for (var listModule in listObj) {
          var moduleConfig = listObj[listModule].config;
          var moduleMonitors = listObj[listModule].monitors;
          assert.isTrue(moduleConfig != null || moduleMonitors != null);
        }
      }
    }
  })

;
