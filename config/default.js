// Default configurations.
module.exports = {
  Monitor: {

    // This is the running applicaiton name.  It should be overridden
    // in applications that embed the monitor package.
    appName: 'Monitor',

    // The base port to use for monitor connections.  If this is changed,
    // it must be changed on all processes in the monitor network as it
    // is used by both client and server processes.  Clients use this as
    // the starting port to scan.  Servers attempt to listen on this port,
    // and will continue with higher ports if other processes are listening
    // on the port.
    serviceBasePort: 42000,

    // When attempting to connect to a remote server, scan this number of
    // ports on the remote machine (starting at the serviceBasePort) to
    // discover monitor processes.
    portsToScan: 20,

    // Only allow connections from this machine by default.  This reduces
    // accidental security breaches by requiring you to consider your network
    // security policies before allowing external connections.
    // See the external.js file in this directory for more information.
    allowExternalConnections: false,

    // Configure the built-in console log output
    consoleLogListener: {
      pattern: "{trace,warn,error,fatal}.*"
    }
  }
}
