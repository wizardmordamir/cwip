import { removeModulesFromStack } from '../object';

export type UpstreamResponse = {
  raw: Response;
  text: string;
  json: Record<string, any>;
};

export type MakeErrorJsonOptions = {
  err: any;
  pipeline?: any;
  req: any;
  upstreamErrorResponse?: UpstreamResponse;
  data?: Record<string, any>; // extra information to add to help understand the error
};

export const makeErrorJson = ({ pipeline, req, data, err, upstreamErrorResponse }: MakeErrorJsonOptions) => ({
  correlationId: req.locals?.correlationId,
  error: {
    code: err.code || '',
    message: typeof err === 'string' ? err : err.message || '',
    path: err.path || '',
    status: err.status || '',
    stack: (err.stack && removeModulesFromStack(err.stack)) || '',
    ...(data ? { data } : {}),
  },
  ...(pipeline ? { pipeline } : {}),
  ...(upstreamErrorResponse
    ? {
        upstreamErrorResponse: {
          status: upstreamErrorResponse.raw.status,
          upstreamName: upstreamErrorResponse.raw.url,
          json: upstreamErrorResponse.json,
          text: upstreamErrorResponse.text,
        },
      }
    : {}),
});
