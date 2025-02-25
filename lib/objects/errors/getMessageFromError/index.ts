import { cleanDataForLogging } from '../../../logging';
import { stringify } from '../..';
import { isString } from '../../../js-types';
import { showStackForError } from '../showStackForError';
import { removeModulesFromStack } from '../removeModulesFromStack';
import { isAxiosError } from '../isAxiosError';

export const dbConnectionErrors = ['ECONNCLOSED', 'Connection is closed'];

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
    return error;
  }
};
