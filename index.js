var fs = require('fs');
var _ = require('underscore');
var moment = require('moment');

module.exports = {
    log: log,
    existy: existy,
    truthy: truthy,
    fixCircular: fixCircular
};

// log the filename, line number, function name, and auto stringify objects
function log() {
    var s = '\n';
    var args = _.toArray(arguments);
    args.unshift( now(), file(), line(), fn() );
    _.each(args, function (arg) { 
        var add; 
        var fixedArg = typeof arg === 'object' ? JSON.parse(fixCircular(arg)) : arg;
        add = typeof fixedArg === 'string' ? fixedArg : add = fixCircular(fixedArg);
        s += add + '\n';
    });
    console.log(s);
}

// Quick existance check
function existy(x) { 
    return typeof(x) != 'undefined' && x !== null;
}

// Quick truthyness check
function truthy(x) { 
    return x !== false && existy(x);
}

function now () {
    return 'TIME:\t' + moment().format('YYYY-MM-DD hh:mm:ss a');
}

// Allow JSON.stringify to work on objects with circular references
function fixCircular(o) { 
    var cache = [];
    return JSON.stringify(o, function(k, v) {
        if (typeof v === 'object' && v !== null) {
            if (cache.indexOf(v) !== -1) {
                return;
            }
            cache.push(v);
        }
        return v;
    }, 4); // args -> object to stringify, props to show, number of spaces for readability
}

// Get the current stack using V8 api (https://github.com/v8/v8/wiki/Stack%20Trace%20API)
function stack () {
    var orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function(_, stack) {
        return stack;
    };
    var err = new Error;
    Error.captureStackTrace(err, arguments.callee);
    var stack = err.stack;
    Error.prepareStackTrace = orig;
    return stack;
}

// Get the name of the current file
function file () {
    return 'FILE:\t' + stack()[1].getFileName();
}

// Get the current line number
function line () {
    return 'LINE:\t'+stack()[1].getLineNumber();
}

// get the current function name
function fn () {
    return 'FUNC:\t' + stack()[1].getFunctionName() + ' ()';
}















