// Configuration overrides when NODE_ENV=external
// Read the comments below before using this configuration.
module.exports = {

  // Overrides for the base monitor package
  Monitor: {

    // This setting allows incoming monitor connections from remote systems.
    // It should be used only after assuring the network security policies
    // prevent untrusted connections on the monitor service port range (usually 42000+).
    allowExternalConnections: true
  },

  // Overrides for the node_monitor application
  MonitorUI: {

    // This setting allows incoming browser connections from remote systems.
    // It should be used only after assuring the network security policies
    // prevent untrusted connections on the application service port (usually 4200).
    allowExternalConnections: true
  }

}
