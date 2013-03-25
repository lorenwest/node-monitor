// Default configurations
module.exports = {

  // Overrides from the monitor-min package
  MonitorMin: {
    appName: 'NodeMonitor',
  },

  // Monitor application configurations
  Monitor: {

    // The port to listen on for application traffic
    port:4200,

    // Only allow connections from this machine by default.  This reduces
    // accidental security breaches by requiring you to consider your network
    // security policies before allowing external connections.
    // See the external.js file in this directory for more information.
    allowExternalConnections: false
  }

}
