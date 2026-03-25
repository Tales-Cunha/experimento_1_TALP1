import { Request, Response, NextFunction } from 'express';
import { NotFoundError, ValidationError } from '../errors';

interface HttpLikeError {
  status?: number;
  statusCode?: number;
  message?: string;
  name?: string;
}

function asHttpLikeError(error: unknown): HttpLikeError {
  if (error && typeof error === 'object') {
    return error as HttpLikeError;
  }

  return {};
}

export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof NotFoundError) {
    console.error(`[Error Handler] ${err.name}: ${err.message}`);
    res.status(404).json({ error: err.message });
    return;
  }

  if (err instanceof ValidationError) {
    console.error(`[Error Handler] ${err.name}: ${err.message}`);
    res.status(422).json({ error: err.message });
    return;
  }

  const httpLikeError = asHttpLikeError(err);
  const status = httpLikeError.statusCode ?? httpLikeError.status;
  if (status === 413) {
    const message = httpLikeError.message ?? 'request entity too large';
    const name = httpLikeError.name ?? 'PayloadTooLargeError';
    console.error(`[Error Handler] ${name}: ${message}`);
    res.status(413).json({ error: message });
    return;
  }

  const message = 'Internal Server Error';
  const name = err instanceof Error ? err.name : 'Error';

  console.error(`[Error Handler] ${name}: ${message}`);

  res.status(500).json({ error: message });
};
