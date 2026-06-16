import { describe, expect, it } from 'bun:test';
import { compileSchema } from '../../core/schema/validate';
import { makeMockReq, makeMockRes } from '../../ops/testing';
import { validateBody, validateQuery } from './validateRequest';

const personSchema = {
  type: 'object',
  properties: { name: { type: 'string' } },
  required: ['name'],
  additionalProperties: false,
} as const;

const run = (mw: ReturnType<typeof validateBody>, req: any) => {
  const res = makeMockRes();
  let nexted = false;
  mw(
    req,
    res as any,
    (() => {
      nexted = true;
    }) as any,
  );
  return { res, nexted };
};

describe('validateBody / validateQuery', () => {
  it('calls next when the body is valid', () => {
    const { nexted, res } = run(validateBody(personSchema), makeMockReq({ body: { name: 'ok' } }));
    expect(nexted).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responds 400 with a ValidationError envelope carrying normalized field errors', () => {
    const { nexted, res } = run(validateBody(personSchema), makeMockReq({ body: {} }));
    expect(nexted).toBe(false);
    expect(res.status).toHaveBeenCalledWith(400);

    const envelope = res.json.mock.calls[0][0];
    expect(envelope.error.code).toBe('VALIDATION_ERROR');
    expect(envelope.error.context.errors[0].keyword).toBe('required');
  });

  it('accepts a pre-compiled Ajv validator (drop-in for per-route validators)', () => {
    const validator = compileSchema(personSchema);
    expect(run(validateBody(validator), makeMockReq({ body: { name: 'x' } })).nexted).toBe(true);
    expect(run(validateBody(validator), makeMockReq({ body: {} })).nexted).toBe(false);
  });

  it('validates req.query with validateQuery', () => {
    expect(run(validateQuery(personSchema), makeMockReq({ query: { name: 'x' } })).nexted).toBe(true);
    expect(run(validateQuery(personSchema), makeMockReq({ query: {} })).nexted).toBe(false);
  });

  it('honors a custom status and message', () => {
    const { res } = run(validateBody(personSchema, { status: 422, message: 'bad input' }), makeMockReq({ body: {} }));
    expect(res.status).toHaveBeenCalledWith(422);
    const envelope = res.json.mock.calls[0][0];
    expect(envelope.error.status).toBe(422);
    expect(envelope.error.message).toBe('bad input');
  });

  it('onError escape hatch fully owns the failure response', () => {
    let capturedKeyword = '';
    const mw = validateBody(personSchema, {
      onError: (errors, _req, res) => {
        capturedKeyword = errors[0]?.keyword ?? '';
        res.status(418).json({ teapot: true });
      },
    });
    const { res } = run(mw, makeMockReq({ body: {} }));
    expect(capturedKeyword).toBe('required');
    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json.mock.calls[0][0]).toEqual({ teapot: true });
  });
});
