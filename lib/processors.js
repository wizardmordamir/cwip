const fs = require('fs');
const allProcessors = ['processor1', 'processor2'];

/**
 * a default function to fill in missing processor functions
 */
const defaultFunction = function (opts) {
	// get the callee function for debugging
	var x = {};
	Error.captureStackTrace(x);
	var s = x.stack;
	var split = s.split('\n');
	var callee = split[2].trim();
	return opts;
}

// store processor functions in format <processor>.<file>.<function>
var processors = {};

/**
 * require all processor functions
 *
 * functions are split up by file to avoid possible name collisions
 * results in being able to call a processor function by processor name, file, and function name
 * example use: var processors = require('./processors'); processors['processor1'].address.getAddress();
 * 		for the above example:
 *   		'processor1' is a directory in the processors directory,
 *   		'address' is a file in the processor1 directory
 *   		'getAddress' is a function exported in the address file
 */
allProcessors.forEach(function (name) {
	// default to empty object
	processors[name] = processors[name] || {};

	// get processor directory
	var directory = __dirname + '/processors/' + name;

	// get processor files from processor directory
	var files = fs.readdirSync(directory);

	// add functions to processor object namespaced by file
	if (files) {
		files.forEach(function(file) {
			var pieces = file.split('.');
			var fileName = pieces[0];
			var extension = pieces[1];
			if (extension === 'js') {
				processors[name][fileName] = require(directory + '/' + fileName);
			}
		});
	}
});

/**
 * some functions may appear in one processor and not another
 * this section sets a default version for such functions
 *
 * example: processor1 has function address.getAddress but processor2 does not,
 * this section sets up a function address.getAddress in processor2
 *
 * makes every function available in each processor.
 * this lets any processor function get called for any other processor without existance checking
 */
for (var processor in processors) {
	// the processor keys are based on the file names in /lib/processors/<processor>/
	for (var file in processors) {
		if (processors.hasOwnProperty(file)) {
			// check each of the functions the processor has
			for (var fn in processors[file]) {
				if (processors[file].hasOwnProperty(fn)) {
					// compare the functions to the functions of other processors
					for (var processor2 in processors) {
						// make a default object if the other processor does not have the same file
						processors[processor2][file] = processors[processor2][file] || {};
						// if the processors file is missing a function
						if (!processors[processor2][file][fn]) {
							// use the default function to fill in the missing function
							processors[processor2][file][fn] = defaultFunction;
						}
					}
				}
			}
		}
	}
}

module.exports = processors;
