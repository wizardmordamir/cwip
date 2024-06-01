import { cleanDataForLogging } from './logging';
import { stringify } from './objects';
import { isString, stringIncludesAny } from './types';

const showStackLogLevels = ['trace', 'debug'];
export const skipStackErrorCodes = ['EREQUEST', 'credentials_required'];
export const skipStackErrorMessages = ['does not exist in remedy for provisioning'];
// export const dbConnectionErrors = ['ECONNCLOSED', 'Connection is closed'];
const networkErrorStrings = ['ETIMEOUT', 'ENOTFOUND', 'ECONNRESET', 'ESOCKET'];
const PMIErrorStrings = [
  '<td>Your request could not be processed. Request could not be handled</td>',
];

export const isNetworkErr = (err) =>
  err && err.message && stringIncludesAny(networkErrorStrings, err.message);
export const isPMIErr = (err) =>
  err && err.message && stringIncludesAny(PMIErrorStrings, err.message);
export const isAxiosError = (err) => !!err.response;

const removeStackLinesIncluding = ['/node_modules/', 'internal/'];

export const removeModulesFromStack = (err) => {
  if (!err.stack) {
    return;
  }
  const newStack = err.stack.split('\n').reduce((acc, line) => {
    if (removeStackLinesIncluding.some((removeLine) => line.includes(removeLine))) {
      return acc;
    }
    if (!line.includes('/')) {
      return acc;
    }
    return [...acc, line];
  }, []);

  err.stack = newStack.join('\n');
  return err;
};

export const showStackForError = function showStackForError(error) {
  if (!error || !error.stack) {
    return false;
  }
  // network error stacks are not helpful
  if (isNetworkErr(error)) {
    return false;
  }
  if (error.code && skipStackErrorCodes.includes(error.code)) {
    return false;
  }
  if (error.message) {
    for (let i = 0; i < skipStackErrorMessages.length; i++) {
      if (error.message.includes(skipStackErrorMessages[i])) {
        return false;
      }
    }
  }
  // axios error stacks are not helpful
  if (isAxiosError(error)) {
    return false;
  }
  return true;
};

export const getMessageFromError = (error, prefix = '') => {
  try {
    if (!error) {
      return '';
    }
    if (isString(error)) {
      error = new Error(error);
    }
    const showStack = showStackForError(error);
    // remove password and other axios config before logging;
    delete error.config;
    let axiosResponse;
    if (isAxiosError(error)) {
      if (error.response.data && Array.isArray(error.response.data) && error.response.data[0]) {
        axiosResponse = error.response.data[0];
      } else {
        axiosResponse = error.response.data || error.response;
      }
    }
    let msg = prefix;
    const baseErrorMessage = error.message || error;
    if (!axiosResponse) {
      msg += ` error: ${baseErrorMessage}`;
    }
    let stringifiedError;
    if (!axiosResponse) {
      stringifiedError = stringify(error);
    }
    if (
      stringifiedError &&
      stringifiedError !== '{}' &&
      stringifiedError !== stringify(baseErrorMessage)
    ) {
      msg += `, stringified: ${stringifiedError}`;
    }

    let stringifiedAxiosResponse;
    if (axiosResponse) {
      let axiosURL;
      let axiosMethod;
      let axiosStatus;
      axiosStatus = error.response.status;
      if (error.response.config) {
        axiosURL = error.response.config.url;
        axiosMethod = error.response.config.method && error.response.config.method?.toUpperCase();
        delete error.response.config;
      }
      msg += ' ' + `url: ${axiosMethod || ''} ${axiosStatus || ''} ${axiosURL || ''}`.trim();
      stringifiedAxiosResponse = stringify(axiosResponse);
    }
    if (stringifiedAxiosResponse) {
      if (stringifiedAxiosResponse.includes('<html>')) {
        msg += ', axios response: <html removed>';
      } else {
        msg += `, axios response: ${stringifiedAxiosResponse}`;
      }
    }

    if (showStack) {
      msg += `, stack:\n${removeModulesFromStack(error).stack}`;
    }
    return cleanDataForLogging(msg.trim());
  } catch (err) {
    console.error(`${prefix} second err:`, err.message, err.stack);
    console.error(
      `${prefix} Failed making first message for initial error:`,
      error.message,
      removeModulesFromStack(error).stack,
    );
  }
};
