import { query } from '../database/db.ts';
import { AppError } from '../middleware/errorHandler.ts';

export async function getAllDoctors(filters: { search?: string; specialty?: string }) {
  let sql = `
    SELECT d.id, d.name, d.specialty, d.experience_years, d.consultation_fee,
           d.bio, d.location, d.avatar_url, d.is_active, d.created_at,
           COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') as completed_consultations
    FROM doctors d
    LEFT JOIN appointments a ON a.doctor_id = d.id
    WHERE d.is_active = true
  `;
  const params: any[] = [];

  if (filters.search) {
    params.push(`%${filters.search.toLowerCase()}%`);
    sql += ` AND (LOWER(d.name) LIKE $${params.length} OR LOWER(d.bio) LIKE $${params.length})`;
  }

  if (filters.specialty && filters.specialty !== 'All') {
    params.push(filters.specialty);
    sql += ` AND d.specialty = $${params.length}`;
  }

  sql += ` GROUP BY d.id ORDER BY d.experience_years DESC, d.name ASC`;

  const result = await query(sql, params);
  return result.rows;
}

export async function getDoctorById(id: number) {
  const doctorResult = await query(
    `SELECT id, name, specialty, experience_years, consultation_fee, bio, location, avatar_url, is_active, created_at
     FROM doctors
     WHERE id = $1`,
    [id]
  );

  if (doctorResult.rows.length === 0) {
    throw new AppError('Doctor not found.', 404);
  }

  const doctor = doctorResult.rows[0];

  // Fetch doctor's recurring weekly availability schedules
  const availResult = await query(
    `SELECT id, day_of_week, start_time, end_time, slot_duration_minutes, is_active
     FROM doctor_availability
     WHERE doctor_id = $1 AND is_active = true
     ORDER BY day_of_week ASC, start_time ASC`,
    [id]
  );

  return {
    ...doctor,
    schedules: availResult.rows,
  };
}

export interface GeneratedSlot {
  startTime: string; // HH:MM:SS
  endTime: string;   // HH:MM:SS
  isAvailable: boolean;
  unavailableReason?: 'booked' | 'past' | 'unavailable';
}

/**
 * Calculates bookable appointment time slots for a given doctor on a specific calendar date.
 */
export async function getDoctorSlotsForDate(doctorId: number, dateStr: string): Promise<GeneratedSlot[]> {
  // Validate doctor exists and is active
  const docCheck = await query('SELECT id, is_active FROM doctors WHERE id = $1', [doctorId]);
  if (docCheck.rows.length === 0 || !docCheck.rows[0].is_active) {
    throw new AppError('Doctor is either not found or currently inactive.', 404);
  }

  const parsedDate = new Date(`${dateStr}T00:00:00Z`);
  if (isNaN(parsedDate.getTime())) {
    throw new AppError('Invalid calendar date string.', 400);
  }

  // Calculate day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = parsedDate.getUTCDay();

  // Find active schedule for this day of week
  const scheduleResult = await query(
    `SELECT start_time, end_time, slot_duration_minutes
     FROM doctor_availability
     WHERE doctor_id = $1 AND day_of_week = $2 AND is_active = true`,
    [doctorId, dayOfWeek]
  );

  if (scheduleResult.rows.length === 0) {
    // Doctor does not work on this day
    return [];
  }

  // Fetch all active appointments for this doctor on this date
  const appointmentsResult = await query(
    `SELECT start_time, end_time
     FROM appointments
     WHERE doctor_id = $1 AND appointment_date = $2 AND status = 'booked'`,
    [doctorId, dateStr]
  );

  const bookedStartTimes = new Set(
    appointmentsResult.rows.map((row) => row.start_time.slice(0, 5))
  );

  // Generate slots based on schedule
  const slots: GeneratedSlot[] = [];
  const now = new Date();
  const isToday = dateStr === now.toISOString().split('T')[0];
  const currentMinutesFromMidnight = now.getHours() * 60 + now.getMinutes();

  for (const sched of scheduleResult.rows) {
    const [startH, startM] = sched.start_time.split(':').map(Number);
    const [endH, endM] = sched.end_time.split(':').map(Number);
    const slotDuration = sched.slot_duration_minutes || 30;

    let cursorMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (cursorMinutes + slotDuration <= endMinutes) {
      const slotStartH = Math.floor(cursorMinutes / 60);
      const slotStartM = cursorMinutes % 60;
      const slotEndH = Math.floor((cursorMinutes + slotDuration) / 60);
      const slotEndM = (cursorMinutes + slotDuration) % 60;

      const pad = (n: number) => n.toString().padStart(2, '0');
      const startFormatted = `${pad(slotStartH)}:${pad(slotStartM)}:00`;
      const endFormatted = `${pad(slotEndH)}:${pad(slotEndM)}:00`;
      const startShort = `${pad(slotStartH)}:${pad(slotStartM)}`;

      let isAvailable = true;
      let unavailableReason: 'booked' | 'past' | 'unavailable' | undefined;

      // Check if slot is already booked
      if (bookedStartTimes.has(startShort)) {
        isAvailable = false;
        unavailableReason = 'booked';
      }
      // Check if date is today and time is in the past
      else if (isToday && cursorMinutes <= currentMinutesFromMidnight) {
        isAvailable = false;
        unavailableReason = 'past';
      }

      slots.push({
        startTime: startFormatted,
        endTime: endFormatted,
        isAvailable,
        unavailableReason,
      });

      cursorMinutes += slotDuration;
    }
  }

  return slots;
}
