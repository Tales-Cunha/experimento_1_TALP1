import { Request, Response, NextFunction } from 'express';

interface AppErrorShape {
  statusCode?: number;
  message?: string;
  name?: string;
}

function asAppError(value: unknown): AppErrorShape {
  if (value && typeof value === 'object') {
    return value as AppErrorShape;
  }

  return {};
}

export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  const normalizedError = asAppError(err);
  const statusCode = normalizedError.statusCode ?? 500;
  const message = normalizedError.message ?? 'Internal Server Error';
  const name = normalizedError.name ?? 'Error';

  console.error(`[Error Handler] ${name}: ${message}`);

  res.status(statusCode).json({ error: message });
};
