# CareFlow System Architecture

## 1. Executive Overview
CareFlow is a production-minded clinical appointment booking system built to demonstrate scalable, resilient software engineering principles. It features a layered monolithic architecture with:
- **Presentation Layer**: React 19 SPA running on Vite with Tailwind CSS.
- **API & Routing Layer**: Node.js & Express with RESTful route modules.
- **Middleware Layer**: JWT authentication (`requireAuth`), Role-Based Access Control (`requireRole`), request schema validation (`validateRequest` using Zod), and centralized error handling.
- **Service Layer**: Pure business logic isolation (`auth.service`, `doctor.service`, `appointment.service`, `admin.service`).
- **Data Persistence Layer**: PostgreSQL with ACID transactions, partial unique indexing, and parameterized queries using `node-postgres` semantics.

---

## 2. Request Lifecycle Diagram

```
[ User Browser ]
       │
       ▼ (HTTP/JSON + HttpOnly Cookie / Bearer Token)
[ Express Server (port 3000) ]
       │
       ├──► cors(), express.json(), cookieParser()
       │
       ├──► Router (/api/appointments, /api/auth, /api/doctors, /api/admin)
       │        │
       │        ├──► Auth Middleware: verifies JWT signature & role
       │        └──► Validation Middleware: validates payload against Zod schema
       │
       └──► Controller: maps HTTP request to domain arguments
                │
                └──► Service Layer (Business Logic & Transactions)
                         │
                         ├──► Check past date & doctor working hours
                         ├──► BEGIN Transaction
                         ├──► Query Slot (Locking Check)
                         ├──► INSERT INTO appointments
                         ├──► COMMIT Transaction
                         │
                         └──► PostgreSQL Engine (Enforces Partial Unique Index)
                                  │
                                  └──► Returns Row or Throws 23505 Conflict
```

---

## 3. Concurrency Protection & Double-Booking Prevention

### The Problem:
Under high traffic, two patients may simultaneously view slot `10:00 AM` for `Dr. Evelyn Reed` on `2026-10-20`. If the system only executes:
```sql
-- Step 1 (Time T0):
SELECT COUNT(*) FROM appointments WHERE doctor_id=1 AND appointment_date='2026-10-20' AND start_time='10:00:00';
-- Both requests see 0!
-- Step 2 (Time T1):
INSERT INTO appointments ... -- Both execute insert, resulting in DOUBLE-BOOKING!
```

### The Solution:
CareFlow implements a **two-layer defense**:
1. **Transaction & Row Locking**: `appointment.service.ts` wraps the booking inside `withTransaction(client)` using `SELECT ... FOR UPDATE`.
2. **Database Constraint (Absolute Guarantee)**:
```sql
CREATE UNIQUE INDEX idx_unique_active_doctor_slot 
ON appointments(doctor_id, appointment_date, start_time) 
WHERE (status = 'booked');
```
Because the index predicate is `WHERE (status = 'booked')`:
- Only one active appointment can exist for that doctor at that timestamp.
- The second simultaneous INSERT transaction is immediately rejected with PostgreSQL error code `23505` (`unique_violation`).
- Our centralized Express error handler converts this into `HTTP 409 Conflict: This slot has just been reserved`.
- When an appointment is cancelled (`status = 'cancelled'`), it drops out of the partial index, making the slot immediately available for booking again without deleting historical records!
