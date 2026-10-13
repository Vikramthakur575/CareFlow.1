import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';

export const validateRequest = (schema: ZodType<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = (error.issues || []).map((issue: any) => ({
          field: (issue.path || []).join('.'),
          message: issue.message,
        }));
        return res.status(400).json({
          error: 'Validation failed',
          details: errorMessages,
        });
      }
      return res.status(400).json({ error: 'Invalid request data' });
    }
  };
};

export const validateQuery = (schema: ZodType<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = (error.issues || []).map((issue: any) => ({
          field: (issue.path || []).join('.'),
          message: issue.message,
        }));
        return res.status(400).json({
          error: 'Query parameter validation failed',
          details: errorMessages,
        });
      }
      return res.status(400).json({ error: 'Invalid query parameters' });
    }
  };
};
