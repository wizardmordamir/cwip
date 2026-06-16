import { describe, expect, it } from 'bun:test';
import { type CallbackDoc, runCallbackLogin, setCallbackInput } from '.';

/** A two-input session-select callback, then a username/password callback. */
const sessionSelectDoc = (): CallbackDoc => ({
  authId: 'a1',
  callbacks: [
    { type: 'NameCallback', input: [{ name: 'IDToken1', value: '' }] },
    { type: 'ChoiceCallback', input: [{ name: 'IDToken2', value: 0 }] },
  ],
});
const credentialsDoc = (): CallbackDoc => ({
  authId: 'a2',
  callbacks: [
    { type: 'NameCallback', input: [{ name: 'IDToken1', value: '' }] },
    { type: 'PasswordCallback', input: [{ name: 'IDToken2', value: '' }] },
  ],
});

/** A fake auth endpoint that returns a scripted sequence of JSON docs. */
const scriptedFetch = (docs: CallbackDoc[]) => {
  const bodies: Array<unknown> = [];
  let i = 0;
  const fn = (async (_url: string, init?: RequestInit) => {
    if (init?.body) bodies.push(JSON.parse(String(init.body)));
    return new Response(JSON.stringify(docs[i++] ?? {}), { headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
  return { fn, bodies };
};

describe('setCallbackInput', () => {
  it('sets the targeted input value and returns the doc', () => {
    const doc = sessionSelectDoc();
    const out = setCallbackInput(doc, 1, 1);
    expect(out).toBe(doc);
    expect(doc.callbacks?.[1].input?.[0].value).toBe(1);
  });

  it('throws a clear error when the callback path is missing', () => {
    expect(() => setCallbackInput({ callbacks: [] }, 1, 'x')).toThrow(/callbacks\[1\]\.input\[0\]/);
  });
});

describe('runCallbackLogin', () => {
  it('runs the fills in order, POSTing each filled doc, and returns the final result', async () => {
    const { fn, bodies } = scriptedFetch([
      sessionSelectDoc(), // opening POST → first challenge
      credentialsDoc(), //   after session pick → credentials challenge
      { tokenId: 'sess-123', successUrl: '/home' }, // after creds → authenticated
    ]);

    const result = await runCallbackLogin({
      fetch: fn,
      url: 'https://idp/authenticate',
      headers: { 'Accept-API-Version': 'resource=2.0, protocol=1.0' },
      fills: [
        (doc) => setCallbackInput(doc, 1, 1), // choose session 1
        (doc) => {
          setCallbackInput(doc, 0, 'alice');
          setCallbackInput(doc, 1, 'hunter2');
        },
      ],
    });

    expect(result.tokenId).toBe('sess-123');
    // two POSTs carried a body (the opening POST had none)
    expect(bodies).toHaveLength(2);
    expect((bodies[0] as CallbackDoc).callbacks?.[1].input?.[0].value).toBe(1);
    expect((bodies[1] as CallbackDoc).callbacks?.[0].input?.[0].value).toBe('alice');
    expect((bodies[1] as CallbackDoc).callbacks?.[1].input?.[0].value).toBe('hunter2');
  });

  it('throws a helpful error when the endpoint answers with a non-JSON (HTML) body', async () => {
    const fn = (async () =>
      new Response('<html>login</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })) as unknown as typeof fetch;
    await expect(runCallbackLogin({ fetch: fn, url: 'https://idp/authenticate', fills: [] })).rejects.toThrow(
      /non-JSON body/,
    );
  });
});
