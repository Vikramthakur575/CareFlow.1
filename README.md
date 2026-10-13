# CareFlow — Patient Appointment Booking System

> A production-minded healthcare appointment booking system engineered for Software Development Intern evaluations. Demonstrates layered Express architecture, parameterized PostgreSQL queries, transactional slot reservation, and race condition prevention.

---

## 🚀 Key Features

1. **Public Doctor Discovery**: Real-time directory with specialty filters, experience badges, consultation fees, and weekly working hours.
2. **ACID-Guaranteed Slot Booking**: Prevents race conditions and double-booking using PostgreSQL partial unique indexes (`WHERE status = 'booked'`).
3. **Patient Portal**: Upcoming consultations, historical appointments, unique booking references (`CF-XXXX-XXXX`), and slot-releasing cancellation flow.
4. **Clinic Administration Console**: Real-time KPI metrics (today's visits, cancellation rates), appointment ledger, valid status state machine transitions, and physician roster management.
5. **Interview Guide & Architecture**: Interactive tab built right into the app containing the 90-second pitch, request lifecycle diagrams, and 25 senior technical interview Q&As.

---

## 🛠 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js & Express.js.
- **Database**: PostgreSQL (with embedded ACID WebAssembly engine for zero-config local runs, and `node-postgres` parameterized queries).
- **Authentication**: JWT with bcrypt password hashing (cost 10) and HttpOnly cookies.
- **Validation**: Zod schema validation on all inputs.
- **Testing**: Automated end-to-end integration test runner in `tests/run-tests.ts`.

---

## 📋 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env` based on `.env.example`:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
```
The server will boot at `http://localhost:3000`, automatically create database tables from `server/database/schema.sql`, and seed initial doctors and credentials.

### 4. Run Automated Test Suite
```bash
npx tsx tests/run-tests.ts
```

---

## 🔑 Default Evaluation Credentials

| Role | Email | Password |
|---|---|---|
| **Clinic Administrator** | `admin@careflow.com` | `admin123` |
| **Patient (Sarah Jenkins)** | `sarah.jenkins@example.com` | `patient123` |
| **Patient (Marcus Chen)** | `marcus.chen@example.com` | `patient123` |

*Tip: You can also use the 1-click **Demo: Patient** or **Demo: Admin** buttons in the navigation bar to switch roles instantaneously.*

---

## 🛡 Concurrency & Race Condition Defense

CareFlow solves the classic double-booking problem at the database engine level:

```sql
CREATE UNIQUE INDEX idx_unique_active_doctor_slot 
ON appointments(doctor_id, appointment_date, start_time) 
WHERE (status = 'booked');
```

When two users attempt to book the same slot simultaneously:
1. Both requests pass client-side checks.
2. PostgreSQL accepts the first INSERT transaction and commits it.
3. The second concurrent transaction is rejected with PostgreSQL code `23505` (`unique_violation`).
4. CareFlow translates this into a clean `HTTP 409 Conflict: This slot has just been reserved`.
5. When an appointment is cancelled, it drops out of the `status = 'booked'` index filter, freeing the slot immediately for future bookings!

---

## 📁 Project File Map

```
careflow/
├── server/
│   ├── database/
│   │   ├── schema.sql         # PostgreSQL DDL with partial unique indexes
│   │   ├── db.ts              # Connection management, migrations & seeding
│   ├── middleware/
│   │   ├── auth.ts            # JWT authentication & requireRole RBAC
│   │   ├── validate.ts        # Zod request payload validator
│   │   └── errorHandler.ts    # Centralized error handler with sanitized responses
│   ├── validators/            # Zod validation schemas
│   ├── services/              # Pure business logic & transactional booking
│   ├── controllers/           # HTTP handlers & response serialization
│   └── routes/                # Express REST routing modules
├── src/
│   ├── components/            # Navbar, Footer, DoctorCard, BookingModal, AuthModal
│   ├── context/               # AuthContext with 1-click demo login
│   ├── pages/                 # HomePage, DoctorDetailPage, PatientDashboard, AdminDashboard, InterviewGuide
│   └── services/              # Client API fetch client
├── docs/                      # ARCHITECTURE.md, DATABASE.md, API.md, INTERVIEW_GUIDE.md
├── tests/                     # Automated test suite
└── server.ts                  # Full-stack Express entry point mounting Vite
```
