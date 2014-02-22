// Configurations for running tests
module.exports = {
  Monitor: {

    autoStart: [
      {probeName: 'ProcessTest', probeClass: 'Process', initParams:{pollInterval: 2345}}
    ],

    // Squelch log output so error tests aren't chatty
    consoleLogListener: {
      pattern: ""
    }
  }
}
