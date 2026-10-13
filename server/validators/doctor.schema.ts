import { z } from 'zod';

export const createDoctorSchema = z.object({
  name: z.string().trim().min(2, 'Doctor name must be at least 2 characters'),
  specialty: z.string().trim().min(2, 'Specialty is required'),
  experienceYears: z.coerce.number().int().min(0, 'Experience must be non-negative'),
  consultationFee: z.coerce.number().min(0, 'Consultation fee must be non-negative'),
  bio: z.string().trim().optional(),
  location: z.string().trim().optional(),
  avatarUrl: z.string().url('Avatar must be a valid URL').optional().or(z.literal('')),
});

export const updateDoctorSchema = createDoctorSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createAvailabilitySchema = z.object({
  doctorId: z.coerce.number().int().positive(),
  dayOfWeek: z.coerce.number().int().min(0).max(6, 'Day of week must be between 0 (Sunday) and 6 (Saturday)'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Invalid start time format'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Invalid end time format'),
  slotDurationMinutes: z.coerce.number().int().min(10).max(120).default(30),
});
