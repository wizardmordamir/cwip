import { isAxiosError } from '../isAxiosError';
import { isNetworkError } from '../isNetworkError';

export const skipStackErrorCodes = ['EREQUEST', 'credentials_required'];

export const showStackForError = function showStackForError(error) {
  if (!error || !error.stack) {
    return false;
  }
  if (isAxiosError(error)) {
    return false;
  }
  // network error stacks are not helpful
  if (isNetworkError(error)) {
    return false;
  }
  if (error.code && skipStackErrorCodes.includes(error.code)) {
    return false;
  }
  return true;
};
