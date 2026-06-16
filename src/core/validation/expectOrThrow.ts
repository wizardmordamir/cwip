import { isString } from '../is';

export const expectOrThrow =
  <T>(evaluater: (_value: T) => boolean, message?: string | ((_value: T) => string)) =>
  (value: T): T => {
    if (!evaluater(value)) {
      const errorMessage = typeof message === 'function' ? message(value) : message;
      throw new Error(
        `${errorMessage || 'expect failed'}, value: ${isString(value) ? value : JSON.stringify(value, null, 2)}`,
      );
    }
    return value;
  };
