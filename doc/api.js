YUI.add("yuidoc-meta", function(Y) {
   Y.YUIDoc = { meta: {
    "classes": [
        "Connection",
        "FileProbe",
        "FileSyncProbe",
        "InspectProbe",
        "Log",
        "LogProbe",
        "Monitor",
        "PollingProbe",
        "Probe",
        "ProcessProbe",
        "ReplProbe",
        "Router",
        "Server",
        "Stat",
        "StatProbe",
        "StreamProbe",
        "Sync",
        "SyncProbe"
    ],
    "modules": [
        "Monitor",
        "Probes"
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
            "description": "Baseline Probe Classes\n\nThe probes in this module offer baseline functionality, and provide examples for building custom probes."
        }
    ]
} };
});