// Require
var watchr = require('./out/lib/watchr');

// Watch a directory or file
console.log('Watch our paths');
watchr.watch({
	paths: [__dirname],
	listeners: {
		log: function(logLevel){
			console.log('a log message occured:', arguments);
		},
		error: function(err){
			console.log('an error occured:', err);
		},
		watching: function(err,watcherInstance,isWatching){
			console.log('a new watcher instance finished setting up', arguments);
		},
		change: function(changeType,filePath,fileCurrentStat,filePreviousStat){
			console.log('a change event occured:',arguments);
		}
	},
	next: function(err,watchers){
		// Watching all setup
		console.log('Now watching our paths', arguments);

		// Close watchers after 10 seconds
		setTimeout(function(){
			var i;
			console.log('Stop watching our paths');
			for ( i=0;  i<watchers.length; i++ ) {
				watchers[i].close();
			}
		},10*1000);
	}
});