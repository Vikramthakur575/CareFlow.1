import { query } from '../database/db.ts';
import { AppError } from '../middleware/errorHandler.ts';

export async function getAdminMetrics() {
  const todayStr = new Date().toISOString().split('T')[0];

  const totalApptsRes = await query('SELECT COUNT(*) as count FROM appointments');
  const todayApptsRes = await query('SELECT COUNT(*) as count FROM appointments WHERE appointment_date = $1', [todayStr]);
  const activeDoctorsRes = await query('SELECT COUNT(*) as count FROM doctors WHERE is_active = true');
  const totalPatientsRes = await query("SELECT COUNT(*) as count FROM users WHERE role = 'patient'");
  
  const statusCountsRes = await query(
    `SELECT status, COUNT(*) as count FROM appointments GROUP BY status`
  );

  const statusMap: Record<string, number> = {
    booked: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
  };

  statusCountsRes.rows.forEach((r) => {
    statusMap[r.status] = parseInt(r.count, 10);
  });

  const totalAppts = parseInt(totalApptsRes.rows[0]?.count || '0', 10);
  const cancellationRate = totalAppts > 0 ? Math.round((statusMap.cancelled / totalAppts) * 100) : 0;

  return {
    totalAppointments: totalAppts,
    todayAppointments: parseInt(todayApptsRes.rows[0]?.count || '0', 10),
    activeDoctors: parseInt(activeDoctorsRes.rows[0]?.count || '0', 10),
    totalPatients: parseInt(totalPatientsRes.rows[0]?.count || '0', 10),
    statusBreakdown: statusMap,
    cancellationRatePercent: cancellationRate,
  };
}

export async function getAllAdminAppointments(filters: {
  status?: string;
  doctorId?: number;
  date?: string;
  search?: string;
}) {
  let sql = `
    SELECT a.id, a.booking_reference, a.appointment_date, a.start_time, a.end_time,
           a.status, a.reason, a.created_at,
           d.id as doctor_id, d.name as doctor_name, d.specialty as doctor_specialty,
           u.id as patient_id, u.name as patient_name, u.email as patient_email, u.phone as patient_phone
    FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    JOIN users u ON u.id = a.patient_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters.status && filters.status !== 'all') {
    params.push(filters.status);
    sql += ` AND a.status = $${params.length}`;
  }

  if (filters.doctorId) {
    params.push(filters.doctorId);
    sql += ` AND a.doctor_id = $${params.length}`;
  }

  if (filters.date) {
    params.push(filters.date);
    sql += ` AND a.appointment_date = $${params.length}`;
  }

  if (filters.search) {
    params.push(`%${filters.search.toLowerCase()}%`);
    sql += ` AND (LOWER(u.name) LIKE $${params.length} OR LOWER(a.booking_reference) LIKE $${params.length} OR LOWER(d.name) LIKE $${params.length})`;
  }

  sql += ` ORDER BY a.appointment_date DESC, a.start_time DESC`;

  const result = await query(sql, params);
  return result.rows;
}

export async function updateAppointmentStatusByAdmin(id: number, newStatus: 'booked' | 'completed' | 'cancelled' | 'no_show') {
  const currentRes = await query('SELECT id, status FROM appointments WHERE id = $1', [id]);
  if (currentRes.rows.length === 0) {
    throw new AppError('Appointment record not found.', 404);
  }

  const currentStatus = currentRes.rows[0].status;

  // State Machine Validation:
  // Completed, Cancelled, and No-Show are terminal states in standard clinical workflow
  if (currentStatus === 'cancelled' && newStatus !== 'cancelled') {
    throw new AppError('Cannot alter status of an already cancelled appointment.', 400);
  }

  if (currentStatus === 'completed' && newStatus !== 'completed') {
    throw new AppError('Cannot alter status of an already completed appointment.', 400);
  }

  const updateRes = await query(
    `UPDATE appointments 
     SET status = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2 
     RETURNING id, booking_reference, status, updated_at`,
    [newStatus, id]
  );

  return updateRes.rows[0];
}

export async function createDoctorByAdmin(data: {
  name: string;
  specialty: string;
  experienceYears: number;
  consultationFee: number;
  bio?: string;
  location?: string;
  avatarUrl?: string;
}) {
  const res = await query(
    `INSERT INTO doctors (name, specialty, experience_years, consultation_fee, bio, location, avatar_url, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     RETURNING *`,
    [
      data.name,
      data.specialty,
      data.experienceYears,
      data.consultationFee,
      data.bio || '',
      data.location || 'CareFlow Medical Center, Main Wing',
      data.avatarUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
    ]
  );

  const newDoc = res.rows[0];

  // Seed default Monday-Friday working hours (09:00 - 17:00)
  for (let day = 1; day <= 5; day++) {
    await query(
      `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
       VALUES ($1, $2, '09:00:00', '17:00:00', 30, true)`,
      [newDoc.id, day]
    );
  }

  return newDoc;
}

export async function toggleDoctorStatus(id: number, isActive: boolean) {
  const res = await query(
    `UPDATE doctors SET is_active = $1 WHERE id = $2 RETURNING *`,
    [isActive, id]
  );
  if (res.rows.length === 0) {
    throw new AppError('Doctor not found.', 404);
  }
  return res.rows[0];
}
