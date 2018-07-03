var _ = require('underscore')
var moment = require('moment')

// log the filename, line number, function name, and auto stringify objects
function logger (config) {
  var cwipConfig = (config && config.cwip) || {}
  return function () {
    var localConfig = _.clone(cwipConfig)
    // Get the current stack using V8 api (https://github.com/v8/v8/wiki/Stack%20Trace%20API)
    var orig = Error.prepareStackTrace
    Error.prepareStackTrace = function (_, stack) {
      return stack
    }
    var err = new Error()
    Error.captureStackTrace(err, arguments.callee)
    var stack = err.stack
    Error.prepareStackTrace = orig

    var s = '\n'
    var args = _.toArray(arguments)
    // check if the first arg is a configuration object
    if (typeof args[0] === 'object' && !_.isUndefined(args[0].cwip)) {
      _.extend(localConfig, args[0].cwip)
      args.shift()
    }
    if (!localConfig.hidefunction) {
      args.unshift(fn())
    }
    if (!localConfig.hideline) {
      args.unshift(line())
    }
    if (!localConfig.hidefile) {
      args.unshift(file())
    }
    if (!localConfig.hidetime) {
      args.unshift(now())
    }
    _.each(args, function (arg) {
      var add
      var fixedArg = typeof arg === 'object' ? JSON.parse(fixCircular(arg)) : arg
      add = typeof fixedArg === 'string' ? fixedArg : fixCircular(fixedArg)
      s += add + '\n'
    })
    console.log(s)
    // Get the name of the current file
    function file () {
      return 'FILE:\t' + stack[0].getFileName()
    }
    // Get the current line number
    function line () {
      return 'LINE:\t' + stack[0].getLineNumber()
    }
    // get the current function name
    function fn () {
      return 'FUNC:\t' + stack[0].getFunctionName() + ' ()'
    }
    if (localConfig.nightwatch) {
      this.pause(1)
      return this
    }
  }
}

function existy (x) {
  return typeof x !== 'undefined' && x !== null
}

function now (format) {
  var time
  var dFormat = 'YYYY-MM-DD hh:mm:ss a'
  format = format || dFormat
  try {
    time = 'TIME:\t' + moment().format(format)
    return time
  } catch (err) {
    time = 'TIME:\t' + moment().format(dFormat)
    return time
  }
}

// Allow JSON.stringify to work on objects with circular references
function fixCircular (o) {
  var cache = []
  return JSON.stringify(o, function (k, v) {
    if (typeof v === 'object' && v !== null) {
      if (cache.indexOf(v) !== -1) return
      cache.push(v)
    }
    return v
  }, 4) // args -> object to stringify, props to show, number of spaces for readability
}

function insensitiveContainsString (string, substr) {
  return string.toUpperCase().indexOf(substr.toUpperCase()) > -1
}

function sensitiveContainsString (string, substr) {
  return string.indexOf(substr) > -1
}

function removeArrayValuesKey (arr, vals, key) {
  if (key) {
    for (let i = 0; i < arr.length; i++) {
      var obj = arr[i]
      if (vals.indexOf(obj[key]) !== -1) { // arr = [{a: 1}, {b: 2},{c: 3}], obj['b'] index at 1, key = 'b'
        arr.splice(i, 1)
      }
    }
  } else {
    for (let i = 0; i < vals.length; i++) {
      var idx = arr.indexOf(vals[i])
      if (idx !== -1) { // arr = [1,2,3], index at 1, val = '2'
        arr.splice(idx, 1)
      }
    }
  }
}
function existsArrayValuesKey (arr, vals, key) {
  var exists = []
  if (key) {
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < vals.length; j++) {
        if (!exists[j]) exists[j] = false
        var obj = arr[i]
        if (obj[key] === vals[j]) exists[j] = true
      }
    }
  } else {
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < vals.length; j++) {
        if (!exists[j]) exists[j] = false
        if (arr[i] === vals[j]) exists[j] = true
      }
    }
  }
  return exists
}

function getLowestProperty (objArray, prop, conditionObj) {
  let lowest = Number.POSITIVE_INFINITY
  let tmp
  let obj
  for (var i = objArray.length - 1; i >= 0; i--) {
    tmp = objArray[i][prop]
    if (tmp < lowest) {
      if (conditionObj && objArray[i][conditionObj.prop] > conditionObj.min) {
        lowest = tmp
        obj = objArray[i]
      } else if (!conditionObj) {
        lowest = tmp
        obj = objArray[i]
      }
    }
  }
  return obj
}

function truthy (x) { return x !== false && existy(x) }

function doWhen (cond, action) {
  if (truthy(cond)) return action()
  return undefined
}

var cwip = {
  doWhen: doWhen,
  existy: existy,
  fixCircular: fixCircular,
  existsArrayValuesKey: existsArrayValuesKey,
  getLowestProperty: getLowestProperty,
  insensitiveContainsString: insensitiveContainsString,
  log: logger,
  now: now,
  removeArrayValuesKey: removeArrayValuesKey,
  sensitiveContainsString: sensitiveContainsString,
  truthy: truthy
}

module.exports = cwip
