// Configurations for running tests
var NL = '\n';
module.exports = {
  Monitor: {
    autoStart: {
      testProbe: {
        probeName: 'ProcessTest', probeClass: 'Process', initParams:{pollInterval: 1234}
      },
      testModel: {
        probeName: 'DataModelTest', probeClass: 'DataModel', initParams:{
          testParam1:'testValue1',
          attr1:'attrValue1',
          derivedAttr1: 'derivedAttrValue1'
        }
      },
      testRecipe: {
        probeName: 'RecipeTest', probeClass: 'Recipe', initParams:{
          autoStart:true,
          monitors: {
            process: {probeName: 'ProcessTest'},
            dataModel: {probeName: 'DataModelTest'}
          },
          script:
            "// Forward attr1 to attr2, showing the script was run" + NL +
            " dataModel.set('attr2', dataModel.get('attr1'));"
        }
      }
    },

    // Squelch log output so error tests aren't chatty
    consoleLogListener: {
      pattern_save1: "{debug,warn,error,fatal}.*",
      pattern_save2: "*",
      pattern: ""
    }
  }
}
