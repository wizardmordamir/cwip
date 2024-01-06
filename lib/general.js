/**
 * Generic and commonly used functions
 */

const fs = require('fs');

function copyFile(source, target, cb) {
  var cbCalled = false;
  var rd = fs.createReadStream(source);
  rd.on('error', function (err) {
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on('error', function (err) {
    done(err);
  });
  wr.on('close', function (ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (err) {
      console.error('err: ' + JSON.stringify(err));
    }
    if (!cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }
}

// copy file, calls a callback
exports.copyFileCb = function (source, target, cb) {
  var cbCalled = false;
  var rd = fs.createReadStream(source);
  rd.on('error', function (err) {
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on('error', function (err) {
    done(err);
  });
  wr.on('close', function (ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (err) {
      console.error('[utility.js] copyFileCb error: ' + JSON.stringify(err));
    }
    if (cb && !cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }
};

// copy file, returns a promise
exports.copyFile = function (source, target) {
  return new Promise(function (resolve, reject) {
    var rd = fs.createReadStream(source);
    rd.on('error', rejectCleanup);
    var wr = fs.createWriteStream(target);
    wr.on('error', rejectCleanup);
    function rejectCleanup(err) {
      rd.destroy();
      wr.end();
      reject(new Error(err));
    }
    wr.on('finish', function () {
      resolve();
    });
    rd.pipe(wr);
  });
};

exports.truncateFile = async function (path, start) {
  start = start || 0;
  return new Promise(function (resolve) {
    fs.truncate(path, start, function (err) {
      resolve();
    });
  });
};

exports.readFile = async function (path) {
  try {
    return new Promise(function (resolve, reject) {
      fs.readFile(path, function (err, data) {
        if (err) {
          reject(new Error(err));
        } else {
          resolve(data);
        }
      });
    });
  } catch (err) {
    console.error(err.stack);
  }
};

exports.hexIfBuffer = function (buffer) {
  if (buffer instanceof Buffer) {
    return buffer.toString('hex');
  } else {
    return buffer;
  }
};

exports.randAlphNum = function (len) {
  let result = '';
  let options = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < len; i++) {
    result += options.charAt(Math.floor(Math.random() * options.length));
  }
  return result;
};

exports.sleep = async (ms) => new Promise((r) => setTimeout(r, ms));
