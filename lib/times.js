export const formatDate = (date, format) => {
  // TODO
  // was - 'TIME:\t' + moment(date).format(format);
};

export const now = (format = 'YYYY-MM-DD hh:mm:ss a') => 'TIME:\t' + formatDate(format);

// return a date the passed in number of ms prior to now
exports.getDateMinusMs = function (ms) {
  return new Date(new Date().getTime() - ms);
};

// return true if passed date is earlier than now minus passed ms
exports.isDateOlderMs = function (dateObj, ms) {
  return dateObj < exports.getDateMinusMs(ms);
};

/**
 * format current time or date object, ex. "09-07-15, 5:45:16.321 pm"
 * if null is passed in, it returns the current date time
 */
exports.getTime = function (dateObject) {
  return formatDate(dateObject, 'MM-DD-YY h:mm:ss a'); // h:mm:ss.SSS
};

var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
exports.getDaysBetween = function (firstDate, secondDate) {
  // add one to result to include partial day
  return Math.floor(Math.abs((firstDate.getTime() - secondDate.getTime()) / oneDay));
};

exports.getMsBetween = function (firstDate, secondDate) {
  try {
    var result = Math.floor(Math.abs(firstDate.getTime() - secondDate.getTime()));
    return result;
  } catch (err) {
    console.log('firstDate: ' + firstDate + ', secondDate: ' + secondDate);
    console.error(err.stack);
  }
};

/*
 * returns time since a passed in date object
 */
exports.getTimeSince = function (pastDateObject) {
  if (!pastDateObject) {
    return;
  }
  var timeAgo, seconds, minutes;
  var msInSecond = 1000;
  var msInMinute = 60000;
  var msInHour = 3600000;
  var msInDay = 86400000;
  var now = new Date();
  var msBetween = exports.getMsBetween(now, pastDateObject);
  if (msBetween <= msInMinute) {
    timeAgo = Math.floor(msBetween / msInSecond) + ' secs';
  } else if (msBetween <= msInHour) {
    timeAgo = Math.floor(msBetween / msInMinute) + ' mins';
  } else if (msBetween <= msInDay) {
    timeAgo = Math.floor(msBetween / msInHour) + ' hrs';
  } else {
    timeAgo = Math.floor(msBetween / msInDay) + ' days';
  }
  return timeAgo;
};
