import { getFunctionName } from '../utils';
import { createRequestPipelineContext } from './createRequestPipelineContext';
import { finishResponse } from './finishResponse';
import { makeErrorJson } from './makeErrorJson';
import type { RequestLocals } from './RequestLocals';
import type { RequestPipelineContext } from './RequestPipelineContext';
import { wrapPipeAsync } from './wrapAsyncPipe';

// short-circuit once stopProcessing is set
export const requestHandlerPipelineWrapper =
  <Tdata>(fn) =>
  async (value: RequestPipelineContext<Tdata>): Promise<RequestPipelineContext<Tdata>> => {
    const isCleanupFunction = (fn as any).__skipStopProcessingCheck === true;

    if (value.stopProcessing && !isCleanupFunction) {
      return value;
    }

    const nextFunctionName = getFunctionName(fn);

    if (value.pipeline.starting && nextFunctionName) {
      const logMessage = `${value.req.locals.correlationId} ${value.pipeline.starting} -> ${nextFunctionName}`;
      value.req.locals.logger.debug(logMessage);
      value.pipeline.finished = value.pipeline.starting;
    }

    if (nextFunctionName) {
      value.pipeline.starting = nextFunctionName;
    }

    const result = await fn(value);
    return result;
  };

/**
 * Marks a pipeline function as a cleanup function that should run even when
 * stopProcessing is true. Use this for functions that need to clean up resources
 * or database state after premature disconnects.
 */
export const markAsCleanup = <T>(fn: (value: T) => Promise<T>): ((value: T) => Promise<T>) => {
  (fn as any).__skipStopProcessingCheck = true;
  return fn;
};

// catch pipeline errors with this instead of try catches in each pipe fn
export const requestHandlerPipelineCatch =
  <Tdata>(value: RequestPipelineContext<Tdata>) =>
  (err): RequestPipelineContext<Tdata> => {
    if (!value?.req) return value;
    const requestLocals: RequestLocals = value.req.locals;
    requestLocals.logger.error(requestLocals.correlationId, 'caught pipeline err:', err);

    return finishResponse<Tdata>({
      ...value,
      errors: [...(value.errors || []), err],
      pipeline: { ...value.pipeline, finished: value.pipeline.starting },
      response: {
        ...value.response,
        json: makeErrorJson({
          err,
          pipeline: value.pipeline,
          req: value.req,
        }),
        status: 500,
      },
    });
  };

// create reusable pipeline that runs all functions it's loaded with
export const createPipeline = <Tdata>(...fns) => {
  const pipeline = async (initialValue: RequestPipelineContext<Tdata>): Promise<RequestPipelineContext<Tdata>> => {
    return wrapPipeAsync(requestHandlerPipelineWrapper, requestHandlerPipelineCatch<Tdata>(initialValue))(...fns)(
      initialValue,
    );
  };
  return pipeline;
};

// create reusable pipeline that automatically sends a response after all function run
// load it with fns, then call with data to start it
export const createRequestPipeline =
  <Tdata>(...fns) =>
  (defaults: Partial<RequestPipelineContext<Tdata>['defaults']> = {}) => {
    const frozenDefaults = Object.freeze(defaults);
    return async function createInnerPipeline(req?: any, res?: any): Promise<RequestPipelineContext<Tdata>> {
      const value = createRequestPipelineContext<Tdata>({
        defaults: frozenDefaults,
        req,
        res,
      } as RequestPipelineContext<Tdata>);

      res.on('close', () => {
        if (!value.res.writableEnded) {
          req.locals?.logger?.debug?.(req.locals?.correlationId, 'Premature disconnect - stopping pipeline');
          value.stopProcessing = true;

          // in-flight external API requests should not continue
          // if the client disconnects or aborts the request
          const externalPromise = (value.data as any)?.externalResponsePromise;

          if (externalPromise?.abortController) {
            externalPromise.isAborted = true;
            externalPromise.abortController.abort('Client disconnected');
          }
        }
      });

      const result = await wrapPipeAsync(
        requestHandlerPipelineWrapper<Tdata>,
        requestHandlerPipelineCatch<Tdata>(value),
      )(...fns)(value);
      return finishResponse<Tdata>(result);
    };
  };
