var _ = require('underscore');
var moment = require('moment');

module.exports = {
    log: log,
    existy: existy,
    truthy: truthy,
    fixCircular: fixCircular,
    now: now
};

// log the filename, line number, function name, and auto stringify objects
function log() {
    return function () {
        // Get the current stack using V8 api (https://github.com/v8/v8/wiki/Stack%20Trace%20API)
        var orig = Error.prepareStackTrace;
        Error.prepareStackTrace = function(_, stack) {
            return stack;
        };
        var err = new Error;
        Error.captureStackTrace(err, arguments.callee);
        var stack = err.stack;
        Error.prepareStackTrace = orig;

        var s = '\n';
        var args = _.toArray(arguments);
        args.unshift( now(), file(), line(), fn() );
        
        _.each(args, function (arg) { 
            var add; 
            var fixedArg = typeof arg === 'object' ? JSON.parse(fixCircular(arg)) : arg;
            add = typeof fixedArg === 'string' ? fixedArg : fixCircular(fixedArg);
            s += add + '\n';
        });
        
        console.log(s);

        // Get the name of the current file
        function file () {
            return 'FILE:\t' + stack[0].getFileName();
        }

        // Get the current line number
        function line () {
            return 'LINE:\t'+stack[0].getLineNumber();
        }

        // get the current function name
        function fn () {
            return 'FUNC:\t' + stack[0].getFunctionName() + ' ()';
        }

    };
}

// Quick existance check
function existy(x) { 
    return typeof(x) != 'undefined' && x !== null;
}

// Quick truthyness check
function truthy(x) { 
    return x !== false && existy(x);
}

function now (format) {
    
    var time;
    var dFormat = 'YYYY-MM-DD hh:mm:ss a';
    format = format || dFormat;
    
    try {
        time = 'TIME:\t' + moment().format(format);
    }catch (err) {
        time = 'TIME:\t' + moment().format(dFormat);
    }finally{
        return time;
    }
    
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

















