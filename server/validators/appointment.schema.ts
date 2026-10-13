import { z } from 'zod';

export const createAppointmentSchema = z.object({
  doctorId: z.coerce.number().int().positive('Valid doctor ID is required'),
  appointmentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Appointment date must be in YYYY-MM-DD format'),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Start time must be in HH:MM or HH:MM:SS format'),
  reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters').optional().default('General Consultation'),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['booked', 'completed', 'cancelled', 'no_show'] as const),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
