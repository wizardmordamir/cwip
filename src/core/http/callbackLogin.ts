/**
 * Drive a multi-step "callback challenge" login — the shape used by ForgeRock /
 * PingAM-style authentication trees and other challenge/response identity
 * providers: you POST to an authenticate endpoint, get back a JSON document
 * holding a list of `callbacks` whose `input[].value` fields you must fill
 * (session pickers, username, password, OTP…), POST the filled document back,
 * and repeat until the response stops asking for input — at which point it
 * carries the session id / token.
 *
 * Many apps in one environment reinvent this loop. The vendor-specific part —
 * WHICH callback gets WHICH value each round — stays in the caller's `fills`.
 * The reusable part lives here: the request loop, the cookie carry (pass a cwip
 * `createSessionFetch` so the session cookie threads through every round), and
 * the JSON round-tripping (including a clear error when the IdP answers with an
 * HTML error page instead of JSON). Dependency-free; `fetch` is injectable.
 *
 *   const sf = createSessionFetch();
 *   const result = await runCallbackLogin({
 *     fetch: sf,
 *     url: authUrl,
 *     headers: { 'Accept-API-Version': 'resource=2.0, protocol=1.0' },
 *     fills: [
 *       (doc) => setCallbackInput(doc, 1, 1),                  // pick session 1
 *       (doc) => {
 *         setCallbackInput(doc, 0, username);
 *         setCallbackInput(doc, 1, password);
 *       },
 *     ],
 *   });
 *   result.tokenId; // the session id the IdP returns once no callbacks remain
 */

import type { SessionFetch } from './createSessionFetch';

export interface CallbackInput {
  name?: string;
  value?: unknown;
}

export interface CallbackOutput {
  name?: string;
  value?: unknown;
}

/** One challenge in the auth document — a typed list of outputs + fillable inputs. */
export interface Callback {
  type?: string;
  output?: CallbackOutput[];
  input?: CallbackInput[];
  [key: string]: unknown;
}

/** A challenge document: `callbacks` to fill, or — once login completes — a token. */
export interface CallbackDoc {
  authId?: string;
  callbacks?: Callback[];
  /** Present once authentication succeeds (no further callbacks). */
  tokenId?: string;
  [key: string]: unknown;
}

/** A short, safe-to-log preview of a value (truncated; never throws). */
const preview = (value: unknown): string => {
  try {
    return JSON.stringify(value)?.slice(0, 300) ?? String(value);
  } catch {
    return String(value);
  }
};

/**
 * Set `doc.callbacks[callbackIndex].input[inputIndex].value`, throwing a clear
 * error if that path is missing (the IdP returned an unexpected shape). Returns
 * the same doc so fills can chain. This replaces the hand-written
 * `doc.callbacks?.[i]?.input?.[0]` validation every caller used to repeat.
 */
export function setCallbackInput<T extends CallbackDoc>(
  doc: T,
  callbackIndex: number,
  value: unknown,
  inputIndex = 0,
): T {
  const input = doc?.callbacks?.[callbackIndex]?.input?.[inputIndex];
  if (!input) {
    throw new Error(
      `callback login: expected callbacks[${callbackIndex}].input[${inputIndex}] in the auth response, ` +
        `got: ${preview(doc)}`,
    );
  }
  input.value = value;
  return doc;
}

export interface CallbackLoginOptions {
  /** Fetch to use — pass a `createSessionFetch()` so cookies carry across rounds. */
  fetch?: SessionFetch | typeof fetch;
  /** The authenticate endpoint POSTed each round. */
  url: string;
  /** Static headers (e.g. an API-version header + content type). */
  headers?: HeadersInit;
  /** Body for the opening POST (usually none — the IdP returns the first challenge). */
  initialBody?: BodyInit;
  /**
   * One filler per challenge round, in order. Each receives the current document
   * (and round index) and fills its inputs IN PLACE (typically via
   * `setCallbackInput`, which mutates); the document is then POSTed back to get
   * the next round. Any return value is ignored.
   */
  fills: Array<(doc: CallbackDoc, round: number) => unknown>;
  /** Safety cap on rounds (default: `fills.length`). */
  maxRounds?: number;
}

/** POST the auth endpoint and parse JSON, with a clear error on a non-JSON body. */
async function postJson(
  doFetch: SessionFetch | typeof fetch,
  url: string,
  headers: Headers,
  body?: BodyInit,
): Promise<CallbackDoc> {
  const res = await doFetch(url, { method: 'POST', headers, body });
  const text = await res.text();
  try {
    return JSON.parse(text) as CallbackDoc;
  } catch {
    throw new Error(
      `callback login: ${url} returned ${res.status} with a non-JSON body (an error/login page?): ${text.slice(0, 300)}`,
    );
  }
}

/**
 * Run the challenge loop and return the final document. After the last fill the
 * returned doc is the authenticated result (carrying `tokenId` / a `successUrl`
 * etc.); the session cookie is in the `createSessionFetch` jar you passed, ready
 * for the follow-up call that exchanges it for a JWT.
 */
export async function runCallbackLogin(options: CallbackLoginOptions): Promise<CallbackDoc> {
  const doFetch = options.fetch ?? fetch;
  const headers = new Headers(options.headers);
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const max = options.maxRounds ?? options.fills.length;

  let doc = await postJson(doFetch, options.url, headers, options.initialBody);
  for (let round = 0; round < options.fills.length && round < max; round++) {
    options.fills[round](doc, round); // mutates `doc` in place
    doc = await postJson(doFetch, options.url, headers, JSON.stringify(doc));
  }
  return doc;
}
