// Configuration overrides when NODE_ENV=external

// This configuration allows incoming connections from remote systems.
// It should be used only after assuring the network firewall prevents
// untrusted connections on the service port range (usually 42000+).
module.exports = {
  Monitor: {
    allowExternalConnections: true
  }
}
