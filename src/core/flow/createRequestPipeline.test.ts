import { afterEach, beforeAll, describe, expect, mock, test } from 'bun:test';
import { type MockResponse, makeMockReq, makeMockRes } from '../../ops/testing';
import { createRequestPipeline } from './createRequestPipeline';
import type { ExternalResponse } from './RequestPipelineContext';

type MockData = {
  externalResponses: ExternalResponse[];
  step1: boolean;
  step2: boolean;
};

describe('createRequestPipeline', () => {
  const mockReq = makeMockReq({
    locals: {
      correlationId: 'test-correlation-id',
      logger: {
        debug: mock(),
        error: mock(),
      },
    },
  });

  const mockRes = makeMockRes() as MockResponse & {
    status: ReturnType<typeof mock>;
    json: ReturnType<typeof mock>;
  };

  beforeAll(() => {
    mock.restore();
  });
  afterEach(() => {
    mock.restore();
  });

  test('should execute pipeline functions in order', async () => {
    const mockFn1 = mock((ctx) => {
      ctx.data = { ...ctx.data, step1: true };
      return ctx;
    });

    const mockFn2 = mock((ctx) => {
      ctx.data = { ...ctx.data, step2: true };
      return ctx;
    });

    const pipeline = createRequestPipeline<MockData>(mockFn1, mockFn2);
    const initialContext = {
      pipelineName: 'test-pipeline',
    };

    const result = await pipeline(initialContext)(mockReq, mockRes);

    expect(mockFn1).toHaveBeenCalled();
    expect(mockFn2).toHaveBeenCalled();
    expect(result.data).toEqual({
      externalResponses: [],
      step1: true,
      step2: true,
    });
  });

  test('should handle async functions', async () => {
    const asyncFn = mock(async (ctx) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      ctx.data = { ...ctx.data, asyncStep: true };
      return ctx;
    });

    const pipeline = createRequestPipeline(asyncFn);
    const result = await pipeline({
      pipelineName: 'test-pipeline',
    })(mockReq, mockRes);

    expect(asyncFn).toHaveBeenCalled();
    expect(result.data).toEqual({
      externalResponses: [],
      asyncStep: true,
    });
  });

  test('should handle errors in pipeline functions', async () => {
    const error = new Error('Test error');
    const errorFn = mock(() => {
      throw error;
    });

    const pipeline = createRequestPipeline(errorFn);
    const result = await pipeline({
      pipelineName: 'test-pipeline',
    })(mockReq, mockRes);

    expect(errorFn).toHaveBeenCalled();
    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]).toBe(error);
    expect(mockReq.locals.logger.error).toHaveBeenCalledWith(
      'test-correlation-id',
      'caught pipeline err:',
      expect.any(Error),
    );
  });

  test('should stop processing when stopProcessing is true', async () => {
    const mockFn1 = mock((ctx) => {
      ctx.stopProcessing = true;
      return ctx;
    });

    const mockFn2 = mock((ctx) => {
      ctx.data = { ...ctx.data, shouldNotReach: true };
      return ctx;
    });

    const pipeline = createRequestPipeline(mockFn1, mockFn2);
    const result = await pipeline({
      pipelineName: 'test-pipeline',
    })(mockReq, mockRes);

    expect(mockFn1).toHaveBeenCalled();
    expect(mockFn2).not.toHaveBeenCalled();
    expect(result.stopProcessing).toBe(true);
  });

  test('should log pipeline steps', async () => {
    function mockFn(ctx) {
      return ctx;
    }
    const pipeline = createRequestPipeline(mockFn);
    await pipeline({
      pipelineName: 'test-pipeline',
    })(mockReq, mockRes);

    expect(mockReq.locals.logger.debug).toHaveBeenCalledWith(expect.stringContaining('test-pipeline ->'));
  });
});
