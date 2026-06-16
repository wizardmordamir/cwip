import { describe, expect, it } from 'bun:test';
import type { MongoClient } from 'mongodb';
import { backoffDelay, connectMongo } from '.';

// A minimal fake MongoClient whose connect() can be scripted to fail N times.
const fakeClient = (failTimes = 0) => {
  let attempts = 0;
  const client = {
    connect: async () => {
      attempts++;
      if (attempts <= failTimes) {
        throw new Error('connection refused');
      }
      return client;
    },
    close: async () => {},
    get attempts() {
      return attempts;
    },
  };
  return client;
};

describe('backoffDelay', () => {
  it('grows exponentially and clamps to max (no jitter)', () => {
    const full = { rand: () => 1 };
    expect(backoffDelay(1, { minMs: 100, maxMs: 10000, ...full })).toBe(100);
    expect(backoffDelay(2, { minMs: 100, maxMs: 10000, ...full })).toBe(200);
    expect(backoffDelay(3, { minMs: 100, maxMs: 10000, ...full })).toBe(400);
    expect(backoffDelay(10, { minMs: 100, maxMs: 500, ...full })).toBe(500);
  });

  it('applies full jitter down to 50% of the exponential value', () => {
    expect(backoffDelay(1, { minMs: 100, rand: () => 0 })).toBe(50);
  });
});

describe('connectMongo', () => {
  it('returns the connected client on first success', async () => {
    const client = fakeClient(0);
    const result = await connectMongo('mongodb://x', { createClient: () => client as unknown as MongoClient });
    expect(result).toBe(client as unknown as MongoClient);
    expect(client.attempts).toBe(1);
  });

  it('retries with backoff then succeeds', async () => {
    const client = fakeClient(2);
    const retried: number[] = [];
    await connectMongo('uri', {
      createClient: () => client as unknown as MongoClient,
      sleep: async () => {},
      onRetry: (n) => retried.push(n),
    });
    expect(client.attempts).toBe(3);
    expect(retried).toEqual([1, 2]);
  });

  it('throws the last error after exhausting retries', async () => {
    const client = fakeClient(99);
    await expect(
      connectMongo('uri', { retries: 2, createClient: () => client as unknown as MongoClient, sleep: async () => {} }),
    ).rejects.toThrow('connection refused');
    expect(client.attempts).toBe(2);
  });
});
