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
    const errorObject: any = {};
    for (const propertyName of Object.getOwnPropertyNames(error)) {
      errorObject[propertyName] = error[propertyName];
    }
    const showStack = showStackForError(errorObject);
    let msg = '';
    const baseErrorMessage = errorObject.message || errorObject;
    msg += ` ${baseErrorMessage}`;
    if (showStack) {
      msg += `, stack:\n${removeModulesFromStack(errorObject).stack}`;
    }
    return msg.trim();
  } catch (err) {
    return error;
  }
};
