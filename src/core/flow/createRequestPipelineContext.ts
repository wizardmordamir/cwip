import type { RequestPipelineContext } from './RequestPipelineContext';

// sets up the defaults for some fields that aren't provided
export const createRequestPipelineContext = <T>(value: RequestPipelineContext<T>): RequestPipelineContext<T> => {
  const defaults = {
    data: { externalResponses: [] } as T,
    response: { status: value.defaults?.responseStatus || 200 },
    stopProcessing: false,
    pipeline: { starting: value.defaults?.pipelineName || '', finished: '' },
  };
  return {
    ...defaults,
    ...value,
  };
};
