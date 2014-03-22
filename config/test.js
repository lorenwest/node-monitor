// Configurations for running tests
var NL = '\n';
module.exports = {
  Monitor: {
    autoStart: {
      testProbe: {
        probeName: 'ProcessTest', probeClass: 'Process', initParams:{pollInterval: 1234}
      },
      testModel: {
        probeName: 'DataModelTest', probeClass: 'DataModel', initParams:{testParam1:'testValue1'}
      },
      testRecipe: {
        probeName: 'RecipeTest', probeClass: 'Recipe', initParams:{
          autoStart:true,
          monitors: {
            process: {probeName: 'ProcessTest'},
            dataModel: {probeClass: 'DataModel', initParams:{attr1:'Value1', attr2:22}}
          },
          triggers: {
            process: ['uptime', 'cpuLoad'],
            dataModel: 'attr2'
          },
          script:
            "// This is set in Router when triggered" + NL +
            "hello = 'there';" + NL +
            "// console.error('IM HERE');" + NL +
            "// inspect2.triggered = true;" + NL +
            "// Just making sure all monitors are available" + NL +
            "// inspect2.uptime = process.uptime;" + NL
        }
      }
    },

    // Squelch log output so error tests aren't chatty
    consoleLogListener: {
      x_pattern: "{error,fatal}.*",
      pattern: ""
    }
  }
}
