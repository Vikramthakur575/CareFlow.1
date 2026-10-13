import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { validateRequest } from '../middleware/validate.ts';
import { updateAppointmentStatusSchema } from '../validators/appointment.schema.ts';
import { createDoctorSchema } from '../validators/doctor.schema.ts';

const router = Router();

// Protect entire admin routing layer with auth and role='admin'
router.use(requireAuth, requireRole('admin'));

router.get('/stats', adminController.getStats);
router.get('/appointments', adminController.listAllAppointments);
router.patch('/appointments/:id/status', validateRequest(updateAppointmentStatusSchema), adminController.updateAppointmentStatus);
router.post('/doctors', validateRequest(createDoctorSchema), adminController.createDoctor);
router.patch('/doctors/:id/toggle', adminController.toggleDoctor);

export default router;
