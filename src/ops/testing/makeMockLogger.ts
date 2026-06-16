import { mock } from 'bun:test';

export const makeMockLogger = () => ({
  trace: mock(),
  debug: mock(),
  info: mock(),
  warn: mock(),
  error: mock(),
});
