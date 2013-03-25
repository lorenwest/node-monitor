YUI.add("yuidoc-meta", function(Y) {
   Y.YUIDoc = { meta: {
    "classes": [
        "ConfigProbe",
        "ConfigTest",
        "Connection",
        "ConnectionTest",
        "FileProbe",
        "FileProbeTest",
        "Inspect",
        "InspectTest",
        "Monitor",
        "MonitorTest",
        "PollingProbe",
        "Probe",
        "ProbeTest",
        "Process",
        "Repl",
        "Router",
        "RouterTest",
        "Server",
        "ServerTest",
        "Storage"
    ],
    "modules": [
        "Monitor",
        "Probes",
        "UnitTests"
    ],
    "allModules": [
        {
            "displayName": "Monitor",
            "name": "Monitor",
            "description": "Core monitor classes\n\nClasses in this module represent baseline monitor functionality.  They can\nbe loaded and run in a node.js container as well as within a browser."
        },
        {
            "displayName": "Probes",
            "name": "Probes",
            "description": "<h2>Baseline probes</h2>\n\n<p>\nThe probes in this module offer baseline functionality, and provide examples\nfor building custom probes.\n</p>"
        },
        {
            "displayName": "UnitTests",
            "name": "UnitTests",
            "description": "Monitor Unit Tests\n\nThis module contains unit test classes for each of the core classes, and\nsome unit tests for baseline probes."
        }
    ]
} };
});