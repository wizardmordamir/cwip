import { hoursPastDate } from './times';
import { isString } from './js-types';

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
    loggingSettings[key] = settings[key];
  }
};

export const cleanStringForLogging = (str: string, env: Obj): string => {
  loggingSettings.secretProps.forEach((secretProp) => {
    if (env[secretProp]) {
      str.replaceAll(env[secretProp], loggingSettings.redactionText);
    }
  });
  return str;
};

export const cleanDataForLogging = (opts, env: Obj) => {
  if (!opts) {
    return opts;
  }
  if (isString(opts)) {
    return cleanStringForLogging(opts, env);
  }
  const optsClone = JSON.parse(JSON.stringify(opts));
  if (optsClone.auth) {
    optsClone.auth = loggingSettings.redactionText;
  }
  if (optsClone.headers?.authorization) {
    optsClone.headers.authorization = loggingSettings.redactionText;
  }
  if (optsClone.response?.config) {
    delete optsClone.response.config;
  }
  const cleanStringJSON = cleanDataForLogging(JSON.stringify(optsClone), env);
  return JSON.parse(cleanStringJSON);
};

export const shouldLogMessage = (message, group = 'default') => {
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
