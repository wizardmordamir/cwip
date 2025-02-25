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

export type SmartLogParamsType = {
  type?: string;
  group?: string;
  vals?: any[];
  skipShouldLogMessageCheck?: Boolean;
  depth?: Number;
  timer?: number;
};

// use when you want to avoid logging the same message repeatedly
// identical messages cannot occur within a time limit in ms
// identical messages are further limited by shouldLogMessage checks
// errors can be added at the end of vals to automatically get their appropriate messages
// ex. log('error', 'connectionError', [prefix, err]);
export const smartLog = ({
  type = 'error',
  group = '',
  vals = [],
  skipShouldLogMessageCheck = false,
  depth,
  timer = smartLogSettings.timer,
}: SmartLogParamsType) => {
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
          updatedLogVals = [...vals.slice(0, -1), getMessageFromError(vals[-1], '')];
        }
        if (group) {
          logSettings.depth(depth, type, group, ...(updatedLogVals || vals));
        } else {
          logSettings.depth(depth, type, ...(updatedLogVals || vals));
        }
      }
    }
  } catch (err) {
    console.log('smartLog err:', err);
  }
};

// set up a logger to use smartLog with optional defaults for these params
// group, vals, skipShouldLogMessageCheck, depth, timer
// It can be called like this:
// smartLogger(defaults).error('error:', error))
export const smartLogger = ({
  group,
  vals,
  skipShouldLogMessageCheck,
  depth,
  timer,
}: SmartLogParamsType) => {
  // these are the same for each log type
  const defaultSmartLogParams = { group, skipShouldLogMessageCheck, depth, timer };

  return {
    error: (...args) =>
      smartLog({ ...defaultSmartLogParams, type: 'error', vals: [...vals, ...args] }),
    trace: (...args) =>
      smartLog({ ...defaultSmartLogParams, type: 'trace', vals: [...vals, ...args] }),
    debug: (...args) =>
      smartLog({ ...defaultSmartLogParams, type: 'debug', vals: [...vals, ...args] }),
    info: (...args) =>
      smartLog({ ...defaultSmartLogParams, type: 'info', vals: [...vals, ...args] }),
    warn: (...args) =>
      smartLog({ ...defaultSmartLogParams, type: 'warn', vals: [...vals, ...args] }),
  };
};
