import { logSettings } from '../log';
import { getMessageFromError, shouldLogMessage } from '..';

export const smartLogSettings = {
  timer: 300_000,
  groupInclusions: [], // add strings from logs to use to group
};

export const handleError = (err, prefix = '') => {
  const errMsg = getMessageFromError(err);
  if (shouldLogMessage(errMsg, prefix)) {
    logSettings.logger.error(prefix, errMsg);
  }
  return errMsg;
};

const groups = {};

const unblockLogging = (key) => {
  delete groups[key];
};

const startBlockLoggingTimer = (key, timer = smartLogSettings.timer) => {
  if (groups[key]) {
    return;
  }
  groups[key] = true;
  setTimeout(() => {
    unblockLogging(key);
  }, timer);
};

// use log when you want to avoid logging the same message repeatedly
// identical messages cannot occur within a time limit in ms
// identical messages are further limited by shouldLogMessage checks
// errors can be added at the end of vals to automatically get their appropriate messages
// ex. log('error', 'connectionError', [prefix, err]);
export const smartLog = ({
  type = 'error',
  group = '',
  vals = [],
  stackLimit = 5,
  skipShouldLogMessageCheck = false,
  depth = 3,
  timer = smartLogSettings.timer,
}) => {
  try {
    const joinedVals = vals.join(',');
    if (!group) {
      for (let i = 0; i < smartLogSettings.groupInclusions.length; i++) {
        if (joinedVals.includes(smartLogSettings.groupInclusions[i])) {
          group = smartLogSettings.groupInclusions[i];
          break;
        }
      }
    }
    if (!group || !groups[group]) {
      if (group) {
        startBlockLoggingTimer(group || joinedVals, timer);
      }
      if (skipShouldLogMessageCheck || shouldLogMessage(joinedVals)) {
        let updatedLogVals;
        if (type === 'error' && vals[vals.length - 1] instanceof Error) {
          updatedLogVals = [...vals.slice(0, -1), getMessageFromError(vals[-1], '', stackLimit)];
        }
        if (group) {
          logSettings.logger[type](group, ...(updatedLogVals || vals));
        } else {
          logSettings.logger[type](...(updatedLogVals || vals));
        }
      }
    }
  } catch (err) {
    logSettings.logger.error(
      {
        type,
        group,
        vals,
        stackLimit,
        skipShouldLogMessageCheck,
        depth,
      },
      getMessageFromError(err),
    );
  }
};
