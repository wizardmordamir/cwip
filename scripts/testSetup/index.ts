import { enableSystemMocks } from '../../src/ops/testing';

// Test setup: turn the system mocks ON before any test file runs. Without this
// call the overrides don't happen and node:fs / console behave normally.
enableSystemMocks();
