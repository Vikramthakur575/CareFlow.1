# CareFlow Database Design & PostgreSQL Schema

## 1. Relational Entity-Relationship (ER) Overview

```
 ┌───────────────┐                  ┌──────────────────────┐
 │     USERS     │                  │  DOCTOR_AVAILABILITY │
 ├───────────────┤                  ├──────────────────────┤
 │ id (PK)       │                  │ id (PK)              │
 │ name          │                  │ doctor_id (FK)───┐   │
 │ email (UQ)    │                  │ day_of_week      │   │
 │ password_hash │                  │ start_time       │   │
 │ role          │                  │ end_time         │   │
 │ phone         │                  │ slot_duration    │   │
 │ created_at    │                  └──────────────────┼───┘
 └───────┬───────┘                                     │
         │ 1                                           │ N
         │                                             │
         │ N                                           │ 1
 ┌───────┴───────────────┐                  ┌──────────┴───────────┐
 │     APPOINTMENTS      │                  │       DOCTORS        │
 ├───────────────────────┤                  ├──────────────────────┤
 │ id (PK)               │ N              1 │ id (PK)              │
 │ booking_ref (UQ)      ├──────────────────┤ name                 │
 │ patient_id (FK)       │                  │ specialty            │
 │ doctor_id (FK)        │                  │ experience_years     │
 │ appointment_date      │                  │ consultation_fee     │
 │ start_time            │                  │ bio                  │
 │ end_time              │                  │ location             │
 │ status                │                  │ is_active            │
 │ reason                │                  └──────────────────────┘
 └───────────────────────┘
```

---

## 2. Table Specifications

### `users`
- Stores authentication credentials and contact details for patients and administrators.
- `role`: Enum check `('patient', 'admin')`. Default `patient`.
- Password: Never plaintext; hashed with bcrypt (cost 10).

### `doctors`
- Represents clinical profiles, specialties, consultation rates, and active status.
- Linked to appointments via 1-to-many relationship with `ON DELETE RESTRICT` to prevent accidental deletion of clinical records.

### `doctor_availability`
- Stores recurring weekly working hours (e.g. Day 1 = Monday, 09:00 to 17:00, 30 min duration).
- Foreign key to `doctors(id)` with `ON DELETE CASCADE`.

### `appointments`
- Stores confirmed, completed, and cancelled bookings.
- `status`: Enum check `('booked', 'completed', 'cancelled', 'no_show')`.
- Partial unique index:
  `CREATE UNIQUE INDEX idx_unique_active_doctor_slot ON appointments(doctor_id, appointment_date, start_time) WHERE (status = 'booked');`

---

## 3. SQL Query Security & Performance
- All queries utilize `$1, $2` parameters via `pg` / `@electric-sql/pglite`.
- String interpolation (`${userInput}`) is strictly forbidden to prevent SQL injection.
- Indexes on `users(email)`, `doctors(specialty)`, `appointments(patient_id)`, and `appointments(doctor_id)`.
