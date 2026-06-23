import { stringify } from '../..';
import { hoursPastDate } from '../date';
import { isString } from '../is';

type Obj = Record<string, any>;

export type LoggingSettings = {
  disableSameMessagesLimit: boolean;
  redactionText: string;
  secretProps: string[];
  messagesPerHour: number;
  priorMessages: Obj;
};

export const loggingSettings: LoggingSettings = {
  disableSameMessagesLimit: false,
  redactionText: 'HIDDEN',
  secretProps: [],
  messagesPerHour: 2,
  priorMessages: {},
};

export const updateLoggingSettings = (settings: Partial<LoggingSettings>) => {
  for (const key in settings) {
    (loggingSettings as Obj)[key] = (settings as Obj)[key];
  }
};

export const cleanStringForLogging = (str: string, env: Obj): string => {
  return loggingSettings.secretProps.reduce((acc, secretProp) => {
    const secretValue = env[secretProp];
    return secretValue ? acc.replaceAll(secretValue, loggingSettings.redactionText) : acc;
  }, str);
};

export const cleanDataForLogging = (opts: any, env: Obj): any => {
  if (!opts) {
    return opts;
  }
  if (isString(opts)) {
    return cleanStringForLogging(opts, env);
  }
  const optsClone = JSON.parse(stringify(opts));
  if (optsClone.auth) {
    optsClone.auth = loggingSettings.redactionText;
  }
  // Redact the Authorization header regardless of key casing — HTTP clients use
  // both `Authorization` (axios/node request config) and `authorization` (fetch
  // Headers), so a case-sensitive check would leak the credential into logs.
  if (optsClone.headers && typeof optsClone.headers === 'object') {
    for (const key of Object.keys(optsClone.headers)) {
      if (key.toLowerCase() === 'authorization') {
        optsClone.headers[key] = loggingSettings.redactionText;
      }
    }
  }
  if (optsClone.response?.config) {
    delete optsClone.response.config;
  }
  const cleanStringJSON = cleanDataForLogging(stringify(optsClone), env);
  return JSON.parse(cleanStringJSON);
};

export const shouldLogMessage = (message: any, group = 'default') => {
  if (!message) {
    return true;
  }
  if (loggingSettings.disableSameMessagesLimit) {
    return true;
  }
  // set up new groups
  if (!loggingSettings.priorMessages[group]) {
    loggingSettings.priorMessages[group] = [];
  }
  if (!loggingSettings.priorMessages[group][message]) {
    loggingSettings.priorMessages[group][message] = { date: new Date(), count: 1 };
    return true;
  }
  // check if enough time has elapsed since counter began
  if (hoursPastDate(loggingSettings.priorMessages[group][message].date) > 1) {
    loggingSettings.priorMessages[group][message].date = new Date();
    loggingSettings.priorMessages[group][message].count = 1;
    return true;
  }
  // check if more messages are allowed
  if (loggingSettings.priorMessages[group][message].count < loggingSettings.messagesPerHour) {
    loggingSettings.priorMessages[group][message].count++;
    return true;
  }
  // count is too high
  loggingSettings.priorMessages[group][message].count++;
  return false;
};
