// Configuration overrides when NODE_ENV=external
// Read the comments below before using this configuration.
module.exports = {

  // Overrides for the monitor-min package
  MonitorMin: {

    // This setting allows incoming monitor connections from remote systems.
    // It should be used only after assuring the network security policies
    // prevent untrusted connections on the monitor service port range (usually 42000+).
    allowExternalConnections: true
  },

  // Overrides for the node-monitor application
  Monitor: {

    // This setting allows incoming browser connections from remote systems.
    // It should be used only after assuring the network security policies
    // prevent untrusted connections on the application service port (usually 4200).
    allowExternalConnections: true
  }

}
