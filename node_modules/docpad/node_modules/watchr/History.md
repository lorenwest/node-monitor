## History

- v2.3.3 January 8, 2013
	- Added `outputLog` option
	- Added `ignorePaths` option
		- Thanks to [Tane Piper](https://github.com/tanepiper) for [issue #24](https://github.com/bevry/watchr/issues/24)
	- Now properly ignores hidden files
		- Thanks to [Ting-yu (Joseph) Chiang](https://github.com/josephj) for [issue #25](https://github.com/bevry/watchr/issues/25) and [Julien M.](https://github.com/julienma) for [issue #28](https://github.com/bevry/watchr/issues/28)
	- Added `Watcher::isIgnoredPath` method
	- Added tests for ignored and hidden files

- v2.3.2 January 6, 2013
	- Fixed closing when a child path watcher doesn't exist
		- Closes [pull request #26](https://github.com/bevry/watchr/pull/26) thanks to [Jason Als](https://github.com/jasonals)
	- Added close tests

- v2.3.1 December 19, 2012
	- Fixed a bug with closing directories that have children
		- Thanks to [Casey Foster](https://github.com/caseywebdev) for [issue #23](https://github.com/bevry/watchr/issues/23)

- v2.3.0 December 17, 2012
	- This is a backwards compatiblity break, however updating is easy, read the notes below.
	- We've updated the events we emit to be:
		- `log` for debugging, receives the arguments `logLevel ,args...`
		- `watching` for when watching of the path has completed, receives the arguments `err, isWatching`
		- `change` for listening to change events, receives the arguments `changeType, fullPath, currentStat, previousStat`
		- `error` for gracefully listening to error events, receives the arguments `err`
		- read the README to learn how to bind to these new events
	- The `changeType` argument for change listeners has been changed for better clarity and consitency:
		- `change` is now `update`
		- `new` is now `create`
		- `unlink` is now `delete`
	- We've updated the return arguments for `require('watchr').watch` for better consitency:
		- if you send the `paths` option, you will receive the arguments `err, results` where `results` is an array of watcher instances
		- if you send the `path` option, you receive the arguments `err, watcherInstance`

- v2.2.1 December 16, 2012
	- Fixed sub directory scans ignoring our ignore patterns
	- Updated dependencies
		-  [bal-util](https://github.com/balupton/bal-util) from 1.15.x to ~1.15.2

- v2.2.0 December 15, 2012
	- We now ignore common ignore patterns by default
	-  `ignorePatterns` configuration option renamed to `ignoreCommonPatterns`
	-  Added new `ignoreCustomPatterns` configuration option
	- Updated dependencies
		-  [bal-util](https://github.com/balupton/bal-util) from 1.13.x to 1.15.x
	- Closes [issue #22](https://github.com/bevry/watchr/issues/22) and [issue #21](https://github.com/bevry/watchr/issues/21)
		- Thanks [Andrew Petersen](https://github.com/kirbysayshi), [Sascha Depold](https://github.com/sdepold), [Raynos](https://github.com/Raynos), and [Prajwalit](https://github.com/prajwalit) for your help!

- v2.1.6 November 6, 2012
	- Added missing `bin` configuration
		- Fixes [#16](https://github.com/bevry/watchr/issues/16) thanks to [pull request #17](https://github.com/bevry/watchr/pull/17) by [Robson Roberto Souza Peixoto](https://github.com/robsonpeixoto)

- v2.1.5 September 29, 2012
	- Fixed completion callback not firing when trying to watch a path that doesn't exist

- v2.1.4 September 27, 2012
	- Fixed new listeners not being added for directories that have already been watched
	- Fixed completion callbacks happening too soon
	- Thanks to [pull request #14](https://github.com/bevry/watchr/pull/14) by [Casey Foster](https://github.com/caseywebdev)

- v2.1.3 August 10, 2012
	- Re-added markdown files to npm distribution as they are required for the npm website

- v2.1.2 July 7, 2012
	- Fixed spelling of `persistent`
	- Explicitly set the defaults for the options `ignoreHiddenFiles` and `ignorePatterns`

- v2.1.1 July 7, 2012
	- Added support for `interval` and `persistant` options
	- Improved unlink detection
	- Optimised unlink handling

- v2.1.0 June 22, 2012
	- `watchr.watchr` changes
		- now only accepts one argument which is an object
		- added new `paths` property which is an array of multiple paths to watch
		- will only watch paths that actually exist (before it use to throw an error)
	- Fixed a few bugs
	- Added support for node v0.7/v0.8
	- Moved tests from Mocha to [Joe](https://github.com/bevry/joe)

- v2.0.3 April 19, 2012
	- Fixed a bug with closing watchers
	- Now requires pre-compiled code

- v2.0.0 April 19, 2012
	- Big rewrite
	- Got rid of the delay
	- Now always fires events
	- Watcher instsances inherit from Node's EventEmitter
	- Events for `change`, `unlink` and `new`

- v1.0.0 February 11, 2012
	- Better support for ignoring hidden files
	- Improved documentation, readme
	- Added `History.md` file
	- Added unit tests using [Mocha](http://visionmedia.github.com/mocha/)

- v0.1.0 Nov 13, 2012
	- Initial working version
