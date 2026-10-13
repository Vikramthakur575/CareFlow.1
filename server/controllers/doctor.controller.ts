import { Request, Response, NextFunction } from 'express';
import * as doctorService from '../services/doctor.service.ts';

export async function listDoctors(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, specialty } = req.query;
    const doctors = await doctorService.getAllDoctors({
      search: search ? String(search) : undefined,
      specialty: specialty ? String(specialty) : undefined,
    });
    res.status(200).json({ doctors });
  } catch (error) {
    next(error);
  }
}

export async function getDoctor(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid doctor ID parameter' });
    }
    const doctor = await doctorService.getDoctorById(id);
    res.status(200).json({ doctor });
  } catch (error) {
    next(error);
  }
}

export async function getAvailableSlots(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const date = req.query.date as string;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid doctor ID parameter' });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Valid date query parameter in YYYY-MM-DD format is required' });
    }

    const slots = await doctorService.getDoctorSlotsForDate(id, date);
    res.status(200).json({ doctorId: id, date, slots });
  } catch (error) {
    next(error);
  }
}
