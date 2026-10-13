import { query, withTransaction } from '../database/db.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { CreateAppointmentInput } from '../validators/appointment.schema.ts';

export async function createAppointment(patientId: number, data: CreateAppointmentInput) {
  const { doctorId, appointmentDate, startTime, reason } = data;

  // 1. Date Validation: Reject appointments in the past
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (appointmentDate < todayStr) {
    throw new AppError('Cannot book an appointment for a past date.', 400);
  }

  // If appointment is today, verify start time is in the future
  if (appointmentDate === todayStr) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = startTime.split(':').map(Number);
    const slotMinutes = startH * 60 + startM;
    if (slotMinutes <= currentMinutes) {
      throw new AppError('Cannot book a time slot that has already passed.', 400);
    }
  }

  // 2. Doctor Availability Check: Ensure doctor is active and working on this day of week
  const docRes = await query('SELECT id, name, is_active FROM doctors WHERE id = $1', [doctorId]);
  if (docRes.rows.length === 0 || !docRes.rows[0].is_active) {
    throw new AppError('The selected doctor is currently inactive or not available.', 400);
  }

  const parsedDate = new Date(`${appointmentDate}T00:00:00Z`);
  const dayOfWeek = parsedDate.getUTCDay();

  const scheduleRes = await query(
    `SELECT start_time, end_time, slot_duration_minutes
     FROM doctor_availability
     WHERE doctor_id = $1 AND day_of_week = $2 AND is_active = true`,
    [doctorId, dayOfWeek]
  );

  if (scheduleRes.rows.length === 0) {
    throw new AppError('Doctor is not scheduled to work on this day.', 400);
  }

  const schedule = scheduleRes.rows[0];
  const slotDuration = schedule.slot_duration_minutes || 30;

  // Calculate standard end time
  const [startH, startM] = startTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = startMinutes + slotDuration;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedStartTime = `${pad(startH)}:${pad(startM)}:00`;
  const formattedEndTime = `${pad(Math.floor(endMinutes / 60))}:${pad(endMinutes % 60)}:00`;

  // 3. Atomically Check and Book within Transaction
  return await withTransaction(async (client) => {
    // Check if slot is already actively booked (locking row check to avoid concurrency race)
    const conflictCheck = await client.query(
      `SELECT id FROM appointments
       WHERE doctor_id = $1 
         AND appointment_date = $2 
         AND start_time = $3 
         AND status = 'booked'
       FOR UPDATE`,
      [doctorId, appointmentDate, formattedStartTime]
    );

    if (conflictCheck.rows.length > 0) {
      throw new AppError(
        'This time slot has already been reserved by another patient. Please choose another slot.',
        409
      );
    }

    // Check if patient already has an active appointment at the exact same date & time with any doctor
    const patientOverlap = await client.query(
      `SELECT id FROM appointments
       WHERE patient_id = $1
         AND appointment_date = $2
         AND start_time = $3
         AND status = 'booked'`,
      [patientId, appointmentDate, formattedStartTime]
    );

    if (patientOverlap.rows.length > 0) {
      throw new AppError(
        'You already have another active appointment booked at this exact time.',
        400
      );
    }

    // Generate readable booking reference e.g., CF-K79L-482
    const reference = `CF-${Date.now().toString(36).toUpperCase().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;

    const insertResult = await client.query(
      `INSERT INTO appointments (
         booking_reference, patient_id, doctor_id, appointment_date, start_time, end_time, status, reason
       ) VALUES ($1, $2, $3, $4, $5, $6, 'booked', $7)
       RETURNING id, booking_reference, patient_id, doctor_id, appointment_date, start_time, end_time, status, reason, created_at;`,
      [reference, patientId, doctorId, appointmentDate, formattedStartTime, formattedEndTime, reason || 'Consultation']
    );

    const appointment = insertResult.rows[0];

    // Retrieve doctor metadata to return in response
    const doctorDetails = await client.query(
      `SELECT name, specialty, consultation_fee, location, avatar_url FROM doctors WHERE id = $1`,
      [doctorId]
    );

    return {
      ...appointment,
      doctor: doctorDetails.rows[0],
    };
  });
}

export async function getPatientAppointments(patientId: number) {
  const result = await query(
    `SELECT a.id, a.booking_reference, a.appointment_date, a.start_time, a.end_time,
            a.status, a.reason, a.created_at,
            d.id as doctor_id, d.name as doctor_name, d.specialty as doctor_specialty,
            d.consultation_fee, d.location as clinic_location, d.avatar_url as doctor_avatar
     FROM appointments a
     JOIN doctors d ON d.id = a.doctor_id
     WHERE a.patient_id = $1
     ORDER BY a.appointment_date DESC, a.start_time DESC`,
    [patientId]
  );

  return result.rows;
}

export async function getAppointmentById(id: number, userId: number, role: 'patient' | 'admin') {
  const result = await query(
    `SELECT a.id, a.booking_reference, a.appointment_date, a.start_time, a.end_time,
            a.status, a.reason, a.created_at, a.patient_id,
            d.id as doctor_id, d.name as doctor_name, d.specialty as doctor_specialty,
            d.consultation_fee, d.location as clinic_location, d.avatar_url as doctor_avatar,
            u.name as patient_name, u.email as patient_email, u.phone as patient_phone
     FROM appointments a
     JOIN doctors d ON d.id = a.doctor_id
     JOIN users u ON u.id = a.patient_id
     WHERE a.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Appointment record not found.', 404);
  }

  const appointment = result.rows[0];

  // RBAC Access Control Check: Patients can only view their own records
  if (role !== 'admin' && appointment.patient_id !== userId) {
    throw new AppError('Forbidden: You do not have permission to view this appointment record.', 403);
  }

  return appointment;
}

export async function cancelAppointment(id: number, userId: number, role: 'patient' | 'admin') {
  // Fetch appointment to check ownership and state
  const checkRes = await query(
    `SELECT id, patient_id, status, appointment_date, start_time FROM appointments WHERE id = $1`,
    [id]
  );

  if (checkRes.rows.length === 0) {
    throw new AppError('Appointment not found.', 404);
  }

  const appt = checkRes.rows[0];

  // Patient access check
  if (role !== 'admin' && appt.patient_id !== userId) {
    throw new AppError('Forbidden: You can only cancel your own appointments.', 403);
  }

  // Validate state machine transition
  if (appt.status === 'cancelled') {
    throw new AppError('This appointment is already cancelled.', 400);
  }

  if (appt.status === 'completed') {
    throw new AppError('Cannot cancel an appointment that has already been completed.', 400);
  }

  const updateRes = await query(
    `UPDATE appointments
     SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, booking_reference, status, updated_at`,
    [id]
  );

  return updateRes.rows[0];
}
