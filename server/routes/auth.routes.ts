import { Router } from 'express';
import * as authController from '../controllers/auth.controller.ts';
import { validateRequest } from '../middleware/validate.ts';
import { registerSchema, loginSchema } from '../validators/auth.schema.ts';
import { requireAuth } from '../middleware/auth.ts';

const router = Router();

router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;
