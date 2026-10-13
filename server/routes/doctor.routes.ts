import { Router } from 'express';
import * as doctorController from '../controllers/doctor.controller.ts';

const router = Router();

router.get('/', doctorController.listDoctors);
router.get('/:id', doctorController.getDoctor);
router.get('/:id/slots', doctorController.getAvailableSlots);

export default router;
