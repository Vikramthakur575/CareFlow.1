-- CareFlow Schema: Patient Appointment Booking System
-- Database: PostgreSQL

-- Drop existing tables in reverse dependency order if recreating
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS doctor_availability CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users Table (Patients and Clinic Admins)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'admin')),
    phone VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- 2. Doctors Table (Profiles & Clinical Specialties)
CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    experience_years INTEGER NOT NULL DEFAULT 1 CHECK (experience_years >= 0),
    consultation_fee NUMERIC(10, 2) NOT NULL DEFAULT 50.00 CHECK (consultation_fee >= 0),
    bio TEXT,
    location VARCHAR(150) DEFAULT 'CareFlow Medical Center, Main Wing',
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_doctors_specialty ON doctors(specialty);
CREATE INDEX idx_doctors_active ON doctors(is_active);

-- 3. Doctor Availability Table (Recurring Working Hours by Day of Week)
-- 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
CREATE TABLE doctor_availability (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (slot_duration_minutes > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_availability_time_order CHECK (end_time > start_time)
);

CREATE INDEX idx_doctor_avail_doc_day ON doctor_availability(doctor_id, day_of_week);

-- 4. Appointments Table (Patient Bookings)
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    booking_reference VARCHAR(32) UNIQUE NOT NULL,
    patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'completed', 'cancelled', 'no_show')),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_appointment_time_order CHECK (end_time > start_time)
);

-- CRITICAL DATABASE-LEVEL CONCURRENCY PROTECTION:
-- Partial unique index ensures that for any given doctor on a specific date and time slot,
-- only ONE 'booked' active appointment can exist at any given time.
-- This prevents race conditions and double-booking even under concurrent traffic!
CREATE UNIQUE INDEX idx_unique_active_doctor_slot 
ON appointments(doctor_id, appointment_date, start_time) 
WHERE (status = 'booked');

-- Additional operational indexes
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
