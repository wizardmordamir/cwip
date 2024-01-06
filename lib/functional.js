import { truthy } from './checks';

export const ifIt = (cond, action, defaultTo) => (truthy(cond) ? action() : defaultTo);
