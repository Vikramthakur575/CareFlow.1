# CareFlow Interview Guide & Technical Defense

## 1. Project Synopsis (90-Second Interview Elevator Pitch)
"CareFlow is a production-minded clinical appointment booking system built with React, Node.js, Express, and PostgreSQL. It addresses critical problems in medical scheduling: public doctor discovery, transactional slot booking, role-based access control, and eliminating race conditions.
I specifically focused on preventing double-booking by pairing application-level transaction checks with a PostgreSQL partial unique index (`WHERE status = 'booked'`), which guarantees ACID consistency at the engine level while allowing cancelled slots to be re-booked immediately. The backend uses parameterized queries with node-postgres semantics, JWT authentication with bcrypt password hashing and HttpOnly cookies, and strict Zod validation."

---

## 2. Five-Minute Architectural Walkthrough
1. **Frontend Architecture**: Built with React 19, Vite, and Tailwind CSS. State is managed via `AuthContext` for session lifecycle, and modular components for doctors (`DoctorCard`), slot booking (`BookingModal`), and role dashboards.
2. **Backend Architecture**: Layered monolith with separation of concerns:
   - Routes -> define HTTP endpoints.
   - Middlewares -> authenticate (`requireAuth`), authorize (`requireRole`), and validate (`validateRequest`).
   - Controllers -> unwrap HTTP parameters and format responses.
   - Services -> encapsulate clinical business rules and transaction boundaries.
   - Database -> executes parameterized SQL queries against PostgreSQL.
3. **Database Architecture**:
   - `users`: Identity and roles (`patient`, `admin`).
   - `doctors`: Specialties, fees, and active flags.
   - `doctor_availability`: Weekly working hours.
   - `appointments`: Bookings with status (`booked`, `completed`, `cancelled`, `no_show`).

---

## 3. Top 10 Core Interview Questions & Answers

### Q1: Why use a partial unique index instead of a standard unique constraint on appointments?
**Answer**: If we put a standard unique constraint on `(doctor_id, appointment_date, start_time)`, any cancelled appointment would permanently block that slot from ever being booked again. A partial unique index with `WHERE (status = 'booked')` only enforces uniqueness across *active* bookings. When a booking status transitions to `'cancelled'`, it drops out of the partial index, automatically making that slot bookable again.

### Q2: How does CareFlow prevent SQL injection?
**Answer**: All SQL queries use parameterized placeholders (`$1, $2`). Parameters are sent separately to the PostgreSQL engine through the wire protocol, ensuring user inputs are treated exclusively as literal values rather than executable SQL commands.

### Q3: Why is bcrypt preferred over SHA-256 for password hashing?
**Answer**: SHA-256 is designed to be fast for data integrity, making it vulnerable to brute force and Rainbow Table attacks. Bcrypt is intentionally slow and adaptive (with configurable salt rounds) and automatically salts the password, making offline dictionary attacks computationally infeasible.

### Q4: What is the difference between 401 Unauthorized and 403 Forbidden?
**Answer**: 401 indicates that authentication is missing or invalid (the server does not know who you are). 403 indicates authentication succeeded, but the user lacks sufficient permissions (e.g. a patient attempting to call an administrative endpoint).

### Q5: How do you prevent past appointments from being booked?
**Answer**: We validate on both client and server: on the server, `appointment.service.ts` checks that `appointment_date >= today`, and if `appointment_date === today`, verifies that `start_time > current_time`.

### Q6: Walk through what happens when an appointment is cancelled.
**Answer**: The user or admin sends `PATCH /api/appointments/:id/cancel`. The service verifies the user owns the appointment (or is admin) and that the status is `'booked'`. It updates `status = 'cancelled'`. The partial index frees the slot, and future queries for availability on that day show the slot as available again.

### Q7: Why use HttpOnly cookies for JWT storage?
**Answer**: Storing tokens in `localStorage` leaves them accessible to JavaScript, making them vulnerable to XSS attacks. `HttpOnly` cookies cannot be accessed via `document.cookie`, providing an extra layer of defense.

### Q8: How did you test the system?
**Answer**: We created automated test scripts in `tests/run-tests.ts` verifying duplicate email rejection, invalid password rejection, past appointment rejection, concurrent double-booking rejection (ACID test), and cancellation re-booking.

### Q9: What happens if the database connection drops?
**Answer**: The database module logs the query error and throws an exception, which bubbles up to the centralized Express `errorHandler`. The handler returns a clean 500 JSON message without leaking internal database strings or stack traces.

### Q10: How would you scale this application to hundreds of thousands of users?
**Answer**: 1) Connection pooling with PgBouncer. 2) Caching public doctor directories in Redis. 3) Database read replicas for doctor searches. 4) Partitioning the appointments table by date range.
