import { hoursPastDate } from './times';
import { isString } from './types';

type Obj = Record<string, any>;

type LoggingSettings = {
  disableSameMessagesLimit: boolean;
  redactionText: string;
  secretProps: string[];
  messagesPerHour: number;
  priorMessages: Obj;
};

export const loggingSettings: LoggingSettings = {
  disableSameMessagesLimit: false,
  redactionText: 'HIDDEN',
  secretProps: Object.keys(process.env).filter(
    (key) => key.includes('PASSWORD') || key.includes('SECRET'),
  ),
  messagesPerHour: 2,
  priorMessages: {},
};

export const cleanStringForLogging = (str: string): string => {
  loggingSettings.secretProps.forEach((secretProp) => {
    str.replaceAll(process.env[secretProp], loggingSettings.redactionText);
  });
  return str;
};

export const cleanDataForLogging = (opts) => {
  if (!opts) {
    return opts;
  }
  if (isString(opts)) {
    return cleanStringForLogging(opts);
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
  const cleanStringJSON = cleanDataForLogging(JSON.stringify(optsClone));
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
    loggingSettings.priorMessages[group][message] = {
      date: new Date(),
      count: 1,
    };
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
