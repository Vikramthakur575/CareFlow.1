import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import * as adminService from '../services/admin.service.ts';

export async function getStats(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const stats = await adminService.getAdminMetrics();
    res.status(200).json({ stats });
  } catch (error) {
    next(error);
  }
}

export async function listAllAppointments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { status, doctorId, date, search } = req.query;
    const appointments = await adminService.getAllAdminAppointments({
      status: status ? String(status) : undefined,
      doctorId: doctorId ? parseInt(String(doctorId), 10) : undefined,
      date: date ? String(date) : undefined,
      search: search ? String(search) : undefined,
    });
    res.status(200).json({ appointments });
  } catch (error) {
    next(error);
  }
}

export async function updateAppointmentStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    const updated = await adminService.updateAppointmentStatusByAdmin(id, status);
    res.status(200).json({
      message: `Appointment status updated to ${status}.`,
      appointment: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function createDoctor(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const doctor = await adminService.createDoctorByAdmin(req.body);
    res.status(201).json({
      message: 'New doctor added to directory with default business hours.',
      doctor,
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleDoctor(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const { isActive } = req.body;
    const updated = await adminService.toggleDoctorStatus(id, isActive);
    res.status(200).json({
      message: `Doctor ${isActive ? 'activated' : 'deactivated'}.`,
      doctor: updated,
    });
  } catch (error) {
    next(error);
  }
}
