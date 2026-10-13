import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import * as appointmentService from '../services/appointment.service.ts';

export async function create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const patientId = req.user!.id;
    const appointment = await appointmentService.createAppointment(patientId, req.body);
    res.status(201).json({
      message: 'Appointment successfully confirmed!',
      appointment,
    });
  } catch (error) {
    next(error);
  }
}

export async function listMine(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const patientId = req.user!.id;
    const appointments = await appointmentService.getPatientAppointments(patientId);
    res.status(200).json({ appointments });
  } catch (error) {
    next(error);
  }
}

export async function getDetails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const appointmentId = parseInt(req.params.id, 10);
    if (isNaN(appointmentId)) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }
    const appointment = await appointmentService.getAppointmentById(
      appointmentId,
      req.user!.id,
      req.user!.role
    );
    res.status(200).json({ appointment });
  } catch (error) {
    next(error);
  }
}

export async function cancel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const appointmentId = parseInt(req.params.id, 10);
    if (isNaN(appointmentId)) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }
    const cancelled = await appointmentService.cancelAppointment(
      appointmentId,
      req.user!.id,
      req.user!.role
    );
    res.status(200).json({
      message: 'Appointment successfully cancelled and slot released.',
      appointment: cancelled,
    });
  } catch (error) {
    next(error);
  }
}
