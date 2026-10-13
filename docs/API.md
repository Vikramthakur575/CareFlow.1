# CareFlow REST API Reference

All responses return JSON payloads with standard HTTP status codes.

---

## Authentication Endpoints

### `POST /api/auth/register`
- **Purpose**: Registers a new patient account.
- **Access**: Public.
- **Request Body**:
  ```json
  {
    "name": "Alex Johnson",
    "email": "alex@example.com",
    "password": "securePassword123",
    "phone": "+1 (555) 019-2831"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "message": "Registration successful. Welcome to CareFlow!",
    "user": { "id": 4, "name": "Alex Johnson", "email": "alex@example.com", "role": "patient" },
    "token": "eyJhbGciOi..."
  }
  ```
- **Error Responses**: `400 Bad Request` (validation failed), `409 Conflict` (email already in use).

### `POST /api/auth/login`
- **Purpose**: Authenticates patient or administrator credentials.
- **Access**: Public.
- **Response `200 OK`**: Sets HttpOnly `careflow_token` cookie and returns user object + JWT.

### `POST /api/auth/logout`
- **Purpose**: Clears session cookie.
- **Access**: Public.

### `GET /api/auth/me`
- **Purpose**: Retrieves current authenticated profile.
- **Access**: Requires valid JWT token.

---

## Doctors Endpoints

### `GET /api/doctors`
- **Purpose**: Lists all active medical practitioners.
- **Query Parameters**:
  - `search` (optional): Filter by doctor name or biography keyword.
  - `specialty` (optional): Filter by medical specialty (e.g. Cardiology).
- **Access**: Public.

### `GET /api/doctors/:id`
- **Purpose**: Fetches doctor profile and recurring weekly clinic working hours.
- **Access**: Public.

### `GET /api/doctors/:id/slots?date=YYYY-MM-DD`
- **Purpose**: Dynamically computes bookable time slots for a doctor on a specific date.
- **Access**: Public.
- **Response `200 OK`**:
  ```json
  {
    "doctorId": 1,
    "date": "2026-10-21",
    "slots": [
      { "startTime": "09:00:00", "endTime": "09:30:00", "isAvailable": true },
      { "startTime": "09:30:00", "endTime": "10:00:00", "isAvailable": false, "unavailableReason": "booked" }
    ]
  }
  ```

---

## Appointments Endpoints

### `POST /api/appointments`
- **Purpose**: Atomically books a doctor's time slot.
- **Access**: Patient or Admin.
- **Request Body**:
  ```json
  {
    "doctorId": 1,
    "appointmentDate": "2026-10-21",
    "startTime": "09:00:00",
    "reason": "Routine cardiac checkup"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "message": "Appointment successfully confirmed!",
    "appointment": {
      "id": 12,
      "booking_reference": "CF-L40B-912",
      "doctor_id": 1,
      "appointment_date": "2026-10-21",
      "start_time": "09:00:00",
      "end_time": "09:30:00",
      "status": "booked"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Past date or slot outside doctor working hours.
  - `409 Conflict`: Slot already booked by another patient (race condition prevented).

### `GET /api/appointments/my`
- **Purpose**: Lists all appointments belonging to the logged-in patient.
- **Access**: Authenticated Patient.

### `PATCH /api/appointments/:id/cancel`
- **Purpose**: Cancels an appointment and immediately releases the slot for re-booking.
- **Access**: Patient (owner) or Admin.

---

## Administration Endpoints

### `GET /api/admin/stats`
- **Purpose**: Clinic metrics (today's consultations, total bookings, active doctors, cancellation rate).
- **Access**: Admin only (`requireRole('admin')`).

### `GET /api/admin/appointments`
- **Purpose**: Master clinic appointment ledger with status and search filters.
- **Access**: Admin only.

### `PATCH /api/admin/appointments/:id/status`
- **Purpose**: Updates appointment status (`booked` -> `completed`, `cancelled`, `no_show`).
- **Access**: Admin only.
