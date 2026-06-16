import { describe, expect, it } from 'bun:test';
import {
  buildAuthHeader,
  clampSnLimit,
  executeServiceNow,
  normalizeBaseUrl,
  normalizeSnResponse,
  resolveSnCall,
  type SnRequest,
} from './client';
import type { SnResolvedCredentials } from './credentials';

const basicCreds: SnResolvedCredentials = {
  hasCredentials: true,
  authKind: 'basic',
  username: 'admin',
  password: 'secret',
  expectedEnv: [],
};
const bearerCreds: SnResolvedCredentials = {
  hasCredentials: true,
  authKind: 'bearer',
  token: 'tok123',
  expectedEnv: [],
};

describe('clampSnLimit', () => {
  it('defaults non-numbers to 100 and clamps to [1, 1000]', () => {
    expect(clampSnLimit(undefined)).toBe(100);
    expect(clampSnLimit('nope')).toBe(100);
    expect(clampSnLimit(0)).toBe(1);
    expect(clampSnLimit(50)).toBe(50);
    expect(clampSnLimit(99999)).toBe(1000);
  });
});

describe('normalizeBaseUrl', () => {
  it('trims whitespace and trailing slashes', () => {
    expect(normalizeBaseUrl('  https://x.service-now.com/// ')).toBe('https://x.service-now.com');
  });
});

describe('buildAuthHeader', () => {
  it('builds a Bearer header for token auth', () => {
    expect(buildAuthHeader(bearerCreds)).toBe('Bearer tok123');
  });
  it('builds a base64 Basic header for password auth', () => {
    const expected = `Basic ${Buffer.from('admin:secret').toString('base64')}`;
    expect(buildAuthHeader(basicCreds)).toBe(expected);
  });
  it('returns empty string when no credentials', () => {
    expect(buildAuthHeader({ hasCredentials: false, authKind: 'none', expectedEnv: [] })).toBe('');
  });
});

const base = 'https://dev.service-now.com';

describe('resolveSnCall — table_read', () => {
  it('builds a Table API GET with sysparm params', () => {
    const req: SnRequest = {
      operation: 'table_read',
      table: 'incident',
      query: 'active=true',
      fields: ['number', 'state'],
      limit: 25,
      displayValue: 'all',
    };
    const { method, url, sendBody } = resolveSnCall(base, req, 100);
    expect(method).toBe('GET');
    expect(sendBody).toBe(false);
    const u = new URL(url);
    expect(u.pathname).toBe('/api/now/table/incident');
    expect(u.searchParams.get('sysparm_query')).toBe('active=true');
    expect(u.searchParams.get('sysparm_fields')).toBe('number,state');
    expect(u.searchParams.get('sysparm_limit')).toBe('25');
    expect(u.searchParams.get('sysparm_display_value')).toBe('all');
  });

  it('throws when the table is missing', () => {
    expect(() => resolveSnCall(base, { operation: 'table_read' }, 100)).toThrow(/table is required/);
  });
});

describe('resolveSnCall — table_write', () => {
  it('creates with POST to the table', () => {
    const { method, url, sendBody } = resolveSnCall(
      base,
      { operation: 'table_write', table: 'incident', writeMode: 'create', body: { x: 1 } },
      100,
    );
    expect(method).toBe('POST');
    expect(sendBody).toBe(true);
    expect(url).toBe(`${base}/api/now/table/incident`);
  });

  it('updates with PATCH to the record sys_id', () => {
    const { method, url } = resolveSnCall(
      base,
      { operation: 'table_write', table: 'incident', writeMode: 'update', sysId: 'abc123' },
      100,
    );
    expect(method).toBe('PATCH');
    expect(url).toBe(`${base}/api/now/table/incident/abc123`);
  });

  it('requires a sys_id for an update', () => {
    expect(() =>
      resolveSnCall(base, { operation: 'table_write', table: 'incident', writeMode: 'update' }, 100),
    ).toThrow(/sys_id is required/);
  });
});

describe('resolveSnCall — passthrough', () => {
  it('joins a relative path to the base and carries query params', () => {
    const { method, url } = resolveSnCall(
      base,
      {
        operation: 'passthrough',
        method: 'GET',
        path: 'api/now/stats/incident',
        queryParams: { sysparm_count: 'true' },
      },
      100,
    );
    expect(method).toBe('GET');
    const u = new URL(url);
    expect(u.pathname).toBe('/api/now/stats/incident');
    expect(u.searchParams.get('sysparm_count')).toBe('true');
  });

  it('accepts an absolute URL as-is', () => {
    const { url } = resolveSnCall(
      base,
      {
        operation: 'passthrough',
        method: 'GET',
        path: 'https://other.service-now.com/api/now/table/x',
      },
      100,
    );
    expect(url).toBe('https://other.service-now.com/api/now/table/x');
  });

  it('flags a body for non-GET/DELETE methods only', () => {
    expect(resolveSnCall(base, { operation: 'passthrough', method: 'POST', path: '/x' }, 100).sendBody).toBe(true);
    expect(resolveSnCall(base, { operation: 'passthrough', method: 'DELETE', path: '/x' }, 100).sendBody).toBe(false);
  });

  it('requires a path', () => {
    expect(() => resolveSnCall(base, { operation: 'passthrough', method: 'GET' }, 100)).toThrow(/path is required/);
  });
});

describe('normalizeSnResponse', () => {
  it('wraps a list result into rows', () => {
    const out = normalizeSnResponse(200, { result: [{ a: 1 }, { a: 2 }] }, 12);
    expect(out.ok).toBe(true);
    expect(out.rowCount).toBe(2);
    expect(out.rows).toHaveLength(2);
    expect(out.durationMs).toBe(12);
  });

  it('wraps a single-object result into one row', () => {
    const out = normalizeSnResponse(201, { result: { sys_id: 'x' } }, 5);
    expect(out.ok).toBe(true);
    expect(out.rowCount).toBe(1);
    expect(out.rows?.[0]).toEqual({ sys_id: 'x' });
  });

  it('surfaces a ServiceNow error payload on non-2xx', () => {
    const out = normalizeSnResponse(401, { error: { message: 'User Not Authenticated' } }, 3);
    expect(out.ok).toBe(false);
    expect(out.status).toBe(401);
    expect(out.error?.code).toBe('HTTP_401');
    expect(out.error?.message).toBe('User Not Authenticated');
  });
});

describe('executeServiceNow', () => {
  it('sends the auth header + body and normalizes the response', async () => {
    let captured: { url: string; init: any } | null = null;
    const fakeFetch = (async (url: any, init: any) => {
      captured = { url: String(url), init };
      return new Response(JSON.stringify({ result: { sys_id: 'new1' } }), { status: 201 });
    }) as unknown as typeof fetch;

    const out = await executeServiceNow({
      baseUrl: base,
      creds: bearerCreds,
      request: {
        operation: 'table_write',
        table: 'incident',
        writeMode: 'create',
        body: { short_description: 'hi' },
      },
      cap: 100,
      fetchImpl: fakeFetch,
      now: () => 0,
    });

    expect(out.ok).toBe(true);
    expect(out.rows?.[0]).toEqual({ sys_id: 'new1' });
    expect(captured!.init.method).toBe('POST');
    expect(captured!.init.headers.Authorization).toBe('Bearer tok123');
    expect(captured!.init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(captured!.init.body)).toEqual({ short_description: 'hi' });
  });

  it('does not send a body on a GET read', async () => {
    let captured: any = null;
    const fakeFetch = (async (_url: any, init: any) => {
      captured = init;
      return new Response(JSON.stringify({ result: [] }), { status: 200 });
    }) as unknown as typeof fetch;
    await executeServiceNow({
      baseUrl: base,
      creds: basicCreds,
      request: { operation: 'table_read', table: 'incident' },
      cap: 100,
      fetchImpl: fakeFetch,
    });
    expect(captured.method).toBe('GET');
    expect(captured.body).toBeUndefined();
  });
});
