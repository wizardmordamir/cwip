import { describe, expect, it } from 'bun:test';
import { ApiError, isApiError } from '.';

const make = (overrides: Partial<ConstructorParameters<typeof ApiError>[0]> = {}) =>
  new ApiError({ client: 'svc', status: 500, statusText: 'Error', url: '/x', method: 'GET', body: null, ...overrides });

describe('ApiError', () => {
  it('builds a single-line message tagged with the client', () => {
    const err = new ApiError({
      client: 'github',
      status: 404,
      statusText: 'Not Found',
      url: 'https://api.github.com/x',
      method: 'GET',
      body: { message: 'Not Found' },
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiError');
    expect(err.message).toBe('[github] GET https://api.github.com/x → 404 Not Found — {"message":"Not Found"}');
    expect(err.status).toBe(404);
  });

  it('truncates a long body snippet and collapses whitespace', () => {
    const err = new ApiError({
      client: 'svc',
      status: 500,
      statusText: 'Error',
      url: '/x',
      method: 'POST',
      body: `a${' '.repeat(5)}${'b'.repeat(300)}`,
    });
    expect(err.message).toContain('…');
    expect(err.message).not.toContain('     ');
  });

  it('omits the snippet for empty bodies and exposes toDiagnostic', () => {
    const err = new ApiError({
      client: 'svc',
      status: 0,
      statusText: 'Network Error',
      url: '/x',
      method: 'GET',
      body: '',
    });
    expect(err.message.endsWith('Network Error')).toBe(true);
    expect(err.toDiagnostic()).toEqual({
      client: 'svc',
      method: 'GET',
      url: '/x',
      status: 0,
      statusText: 'Network Error',
      body: '',
    });
  });

  it('derives code from the canonical envelope or a top-level code', () => {
    expect(make({ body: { error: { code: 'NOT_FOUND', message: 'nope' } } }).code).toBe('NOT_FOUND');
    expect(make({ body: { code: 'RATE_LIMITED' } }).code).toBe('RATE_LIMITED');
    expect(make({ body: { message: 'plain' } }).code).toBeUndefined();
    // an explicit code arg wins over body parsing
    expect(make({ code: 'EXPLICIT', body: { error: { code: 'FROM_BODY' } } }).code).toBe('EXPLICIT');
  });

  it('extractMessage walks common API error shapes and falls back to the line message', () => {
    expect(make({ body: { error: { message: 'canonical' } } }).extractMessage()).toBe('canonical');
    expect(make({ body: { message: 'top-level' } }).extractMessage()).toBe('top-level');
    expect(make({ body: { error: 'stringy' } }).extractMessage()).toBe('stringy');
    expect(make({ body: { errors: [{ detail: 'first detail' }] } }).extractMessage()).toBe('first detail');
    expect(make({ body: 'raw text' }).extractMessage()).toBe('raw text');
    // empty body → falls back to the formatted line message
    expect(make({ body: null }).extractMessage()).toContain('[svc]');
  });

  it('classifies http vs network and 4xx vs 5xx, and isApiError guards', () => {
    const network = make({ status: 0, statusText: 'Network Error' });
    expect(network.isHttpError()).toBe(false);
    expect(network.isClientError()).toBe(false);
    expect(network.isServerError()).toBe(false);

    const client = make({ status: 404 });
    expect(client.isHttpError()).toBe(true);
    expect(client.isClientError()).toBe(true);
    expect(client.isServerError()).toBe(false);

    const server = make({ status: 503 });
    expect(server.isServerError()).toBe(true);
    expect(server.isClientError()).toBe(false);

    expect(isApiError(server)).toBe(true);
    expect(isApiError(new Error('x'))).toBe(false);
  });
});
