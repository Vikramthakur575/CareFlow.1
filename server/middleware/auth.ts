import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'careflow-super-secure-production-jwt-secret-2026';

export interface UserPayload {
  id: number;
  email: string;
  role: 'patient' | 'admin';
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

/**
 * Extracts and verifies JWT from either Authorization header or HttpOnly cookie.
 */
export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  let token: string | undefined;

  // 1. Check Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2. Fallback to HttpOnly cookie
  if (!token && req.cookies && req.cookies.careflow_token) {
    token = req.cookies.careflow_token;
  }

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required. Please log in to proceed.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired session token. Please log in again.',
    });
  }
};

/**
 * Role-Based Access Control (RBAC) middleware.
 * Ensures the authenticated user possesses the required role.
 */
export const requireRole = (allowedRole: 'patient' | 'admin') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (req.user.role !== allowedRole) {
      return res.status(403).json({
        error: `Forbidden. This operation requires '${allowedRole}' privileges.`,
      });
    }

    next();
  };
};
