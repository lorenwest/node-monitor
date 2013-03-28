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
    allowExternalConnections: false,

    // Path to the site database.  Paths that start with '.' are relative
    // to process.cwd(), which is usually the application root directory.
    siteDbPath: './site_db'
  }

}
