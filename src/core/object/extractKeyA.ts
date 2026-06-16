import { path } from '../object';

// Single-parameter version
export const extractKeyA = (key: string) => async (v: any) => path(key as any, v);
