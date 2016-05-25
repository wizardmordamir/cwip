var _ = require('underscore');
var moment = require('moment');

// log the filename, line number, function name, and auto stringify objects
function logger(config) {
    var cwipConfig = config && config.cwip || {};
    return function () {
        var localConfig = _.clone(cwipConfig);
        
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
        // check if the first arg is a configuration object 
        if (typeof args[0] === 'object' && !_.isUndefined(args[0].cwip)) {
          _.extend(localConfig, args[0].cwip);
          args.shift();
        }
        if (!localConfig.hidefunction) {
          args.unshift( fn() );
        }
        if (!localConfig.hideline) {
          args.unshift( line() );
        }
        if (!localConfig.hidefile) {
          args.unshift( file() );
        }
        if (!localConfig.hidetime) {
          args.unshift( now() );
        } 
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
        if (localConfig.nightwatch) {
          this.pause(1);
          return this;
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

function insensitiveContainsString(string, substr) {
  return string.toUpperCase().indexOf(substr.toUpperCase()) > -1;
}

function sensitiveContainsString(string, substr) {
  return string.indexOf(substr) > -1;
}

function addCondition (newCondition, condition, separator) {
  c = condition ? ' ' + condition + ' ' : ' ';
  s = separator ? ' ' + separator + ' ' : ' ';
  nc = newCondition ? ' ' + newCondition + ' ' : ' ';
  if (c.length) {
    c += s;
  }else if (containsString(s,'OR')) {
    c += '(';
  }
  c += nc;
  return c;
}
var removeArrayValuesKey = function (arr, vals, key) {
  //console.log('1416 removeFromArray key: ' + key + ', values: ' + JSON.stringify(values) + ', arr: ' + JSON.stringify(arr));
  if (key) {
      for(var i = 0; i < arr.length; i++) {
          var obj = arr[i];
          if(vals.indexOf(obj[key]) !== -1) { // arr = [{a: 1}, {b: 2},{c: 3}], obj['b'] index at 1, key = 'b' 
              arr.splice(i, 1);
          }
      }
  }else{
    for(var i=0;i<vals.length;i++){
        var idx = arr.indexOf(vals[i]);
      if(idx !== -1) { // arr = [1,2,3], index at 1, val = '2' 
          arr.splice(idx, 1);
      }
    }

  }
};
var existsArrayValuesKey = function (arr, vals, key) {
    var exists = [];
    if (key) {
      for(var i = 0; i < arr.length; i++) {
        for(var j=0;j<vals.length;j++){
            if (!exists[j]) {
                exists[j] = false;
            }
            var obj = arr[i];
            if (obj[key] == vals[j]){
                exists[j] = true;
            }
        }
      }
    }else{
      for(var i = 0; i < arr.length; i++) {
        for(var j=0;j<vals.length;j++){
            if (!exists[j]) {
                exists[j] = false;
            }
            if (arr[i] == vals[j]){
                exists[j] = true;
            }
        }
      }
    }
    return exists;
};

function getLowestProperty (objArray, prop, conditionObj) {
var lowest = Number.POSITIVE_INFINITY;
var tmp;
for (var i=objArray.length-1; i>=0; i--) {
    tmp = objArray[i][prop];
    if (tmp < lowest) {
        if (conditionObj && objArray[i][conditionObj.prop] > conditionObj.min){
                    lowest = tmp;
            obj = objArray[i];
        }else if (!conditionObj){
            lowest = tmp;
            obj = objArray[i];
        }
    }
}
// console.log('2490 lowest: ' + lowest);
return obj;
}

function Date_toYMD(dateObj) {
  var year, month, day;
  year = String(dateObj.getFullYear());
  month = String(dateObj.getMonth() + 1);
  if (month.length == 1) {
      month = "0" + month;
  }
  day = String(dateObj.getDate());
  if (day.length == 1) {
      day = "0" + day;
  }
  return year + "-" + month + "-" + day;
}

function roundToTwo(num) {    
    return +(Math.round(num + "e+2")  + "e-2");
}

var existy = function existy(x) { return x != null;};

var truthy = function truthy(x) { return x !== false && existy(x);};

var doWhen = function doWhen(cond, action) {
    if (truthy(cond)) return action();
    return undefined;
};

var cwip = {
    log: logger,
    existy: existy,
    truthy: truthy,
    fixCircular: fixCircular,
    now: now,
    removeArrayValuesKey: removeArrayValuesKey,
    existsArrayValuesKey: existsArrayValuesKey,
    getLowestProperty: getLowestProperty,
    doWhen:doWhen,
};

module.exports = cwip;
















