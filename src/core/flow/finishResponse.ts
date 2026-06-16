import type { RequestLocals, RequestPipelineContext } from '.';

export const finishResponse = <T = any>(value: RequestPipelineContext<T>): RequestPipelineContext<T> => {
  if (!value || value.res.writableEnded) {
    return value;
  }

  const {
    defaults,
    errors,
    res,
    req,
    response: { status, json },
  } = value;

  const requestLocals: RequestLocals = req.locals;
  const statusCode: number = status || defaults?.responseStatus || res.statusCode || 200;
  const isStreaming = req.headers.accept === 'text/event-stream' && statusCode < 400;
  const isNoContent = statusCode === 204;

  if (statusCode >= 500) {
    requestLocals.logger.error(
      requestLocals.correlationId,
      value.pipeline.finished,
      '->',
      value.pipeline.starting,
      statusCode,
      json,
      errors || [],
    );
  } else if (statusCode >= 400) {
    requestLocals.logger.debug(
      requestLocals.correlationId,
      value.pipeline.finished,
      '->',
      value.pipeline.starting,
      statusCode,
      json,
      errors || [],
    );
  }

  if (res.headersSent) {
    if (!isNoContent) {
      res.write(JSON.stringify(json || {}));
    }
    res.end();
    return value;
  }

  if (isNoContent) {
    res.status(204).end();
  } else if (!isStreaming) {
    res.status(statusCode).json(json || {});
  } else {
    res.writeHead(statusCode, {
      'Content-Type': 'text/event-stream',
    });
    res.write(JSON.stringify(json || {}));
    res.end();
  }

  return value;
};
