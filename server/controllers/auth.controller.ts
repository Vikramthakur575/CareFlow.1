import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, token } = await authService.registerPatient(req.body);

    // Set secure HttpOnly cookie for web browser sessions
    res.cookie('careflow_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      message: 'Registration successful. Welcome to CareFlow!',
      user,
      token,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, token } = await authService.loginUser(req.body);

    res.cookie('careflow_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: 'Login successful.',
      user,
      token,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie('careflow_token');
  res.status(200).json({ message: 'Successfully logged out.' });
}

export async function me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const profile = await authService.getUserProfile(req.user.id);
    res.status(200).json({ user: profile });
  } catch (error) {
    next(error);
  }
}
