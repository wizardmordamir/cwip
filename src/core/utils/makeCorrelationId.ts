import { randomAlphaNumeric } from './randomAlphaNumeric';

// a short id to match logs to requests, example: 7243b5
export const makeCorrelationId = () => randomAlphaNumeric(6).toLowerCase();
