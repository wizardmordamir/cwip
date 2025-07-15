import { stringify } from '../..';
import { isString } from '../../../js-types';
import { showStackForError } from '../showStackForError';
import { removeModulesFromStack } from '../removeModulesFromStack';

export const dbConnectionErrors = ['ECONNCLOSED', 'Connection is closed'];

export const getMessageFromError = (error) => {
  try {
    if (!error) {
      return '';
    }
    if (isString(error)) {
      error = new Error(error);
    }
    const showStack = showStackForError(error);
    let msg = 'error:';
    const baseErrorMessage = error.message || error;
    msg += ` ${baseErrorMessage}`;
    let stringifiedError;
    stringifiedError = stringify(error);
    if (
      stringifiedError &&
      stringifiedError !== '{}' &&
      stringifiedError !== stringify(baseErrorMessage)
    ) {
      msg += `, stringified: ${stringifiedError}`;
    }
    if (showStack) {
      msg += `, stack:\n${removeModulesFromStack(error).stack}`;
    }
    return msg.trim();
  } catch (err) {
    return error;
  }
};
