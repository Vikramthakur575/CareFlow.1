import { Router } from 'express';
import * as appointmentController from '../controllers/appointment.controller.ts';
import { requireAuth } from '../middleware/auth.ts';
import { validateRequest } from '../middleware/validate.ts';
import { createAppointmentSchema } from '../validators/appointment.schema.ts';

const router = Router();

// All appointment operations require patient or admin authentication
router.use(requireAuth);

router.post('/', validateRequest(createAppointmentSchema), appointmentController.create);
router.get('/my', appointmentController.listMine);
router.get('/:id', appointmentController.getDetails);
router.patch('/:id/cancel', appointmentController.cancel);

export default router;
