import { setFunctionName } from '../utils/setFunctionName';
import { createPipeline } from './createRequestPipeline';

// create named pipeline for logging name instead of 'null' for anonymous functions
export const createNamedPipeline = <T>(name: string, ...fns: any[]) => {
  return setFunctionName(name, createPipeline<T>(...fns));
};
