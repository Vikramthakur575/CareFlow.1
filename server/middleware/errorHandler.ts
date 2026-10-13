import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode = 500, details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('[CareFlow Server Error]:', err);

  // PostgreSQL unique violation error code 23505
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Conflict: A record with this unique identifier already exists, or the requested slot has just been reserved.',
      code: 'RESOURCE_CONFLICT',
    });
  }

  // AppError instance
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    });
  }

  // Generic internal server error (never leak raw stack traces)
  return res.status(500).json({
    error: 'An unexpected internal server error occurred. Please try again later.',
  });
};
