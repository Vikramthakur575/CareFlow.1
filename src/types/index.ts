export interface User {
  id: number;
  name: string;
  email: string;
  role: 'patient' | 'admin';
  phone?: string;
  created_at?: string;
}

export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  experience_years: number;
  consultation_fee: number | string;
  bio?: string;
  location?: string;
  avatar_url?: string;
  is_active: boolean;
  completed_consultations?: number;
  schedules?: DoctorSchedule[];
}

export interface DoctorSchedule {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  unavailableReason?: 'booked' | 'past' | 'unavailable';
}

export interface Appointment {
  id: number;
  booking_reference: string;
  patient_id: number;
  doctor_id: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'booked' | 'completed' | 'cancelled' | 'no_show';
  reason?: string;
  created_at: string;
  doctor_name?: string;
  doctor_specialty?: string;
  consultation_fee?: number | string;
  clinic_location?: string;
  doctor_avatar?: string;
  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
}

export interface AdminMetrics {
  totalAppointments: number;
  todayAppointments: number;
  activeDoctors: number;
  totalPatients: number;
  cancellationRatePercent: number;
  statusBreakdown: {
    booked: number;
    completed: number;
    cancelled: number;
    no_show: number;
  };
}
