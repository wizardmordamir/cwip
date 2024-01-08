export const msInSecond = 1000;
export const msInMinute = 60000;
export const msInHour = 3600000;
export const msInDay = 86400000;

export const formatDate = (date, format) => {
  // TODO
  // was - 'TIME:\t' + moment(date).format(format);
  return date.toISOString();
};

export const now = (format = 'YYYY-MM-DD hh:mm:ss a') => formatDate(new Date(), format);

// return a date the passed in number of ms prior to now
export const getDateMinusMs = (ms) => new Date(new Date().getTime() - ms);

// return true if passed date is earlier than now minus ms
export const isDateOlderMs = (dateObj, ms) => dateObj < getDateMinusMs(ms);

export const getTime = (dateObject) => formatDate(dateObject, 'MM-DD-YY h:mm:ss a');

export const getDaysBetween = (firstDate, secondDate) =>
  Math.floor(Math.abs((firstDate.getTime() - secondDate.getTime()) / msInDay));

export const getMsBetween = (firstDate, secondDate) =>
  Math.floor(Math.abs(firstDate.getTime() - secondDate.getTime()));

export const getTimeSince = (pastDateObject) => {
  const now = new Date();
  const msBetween = getMsBetween(now, pastDateObject);
  if (msBetween <= msInMinute) {
    return Math.floor(msBetween / msInSecond) + ' secs';
  }
  if (msBetween <= msInHour) {
    return Math.floor(msBetween / msInMinute) + ' mins';
  }
  if (msBetween <= msInDay) {
    return Math.floor(msBetween / msInHour) + ' hrs';
  }
  return Math.floor(msBetween / msInDay) + ' days';
};
