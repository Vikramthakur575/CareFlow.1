import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Terminal, Layers, Database } from 'lucide-react';

interface QuestionItem {
  id: number;
  category: 'database' | 'concurrency' | 'backend' | 'auth' | 'frontend' | 'system_design';
  question: string;
  answer: string;
  followUp: string;
}

const INTERVIEW_QUESTIONS: QuestionItem[] = [
  {
    id: 1,
    category: 'concurrency',
    question: 'How does CareFlow prevent two patients from booking the exact same doctor slot at the same millisecond?',
    answer: 'We enforce concurrency control at two complementary layers: 1) Application Layer: An explicit SQL transaction wraps the booking query with a pessimistic check. 2) Database Constraint Layer (Absolute Guarantee): We constructed a PostgreSQL partial unique index: `CREATE UNIQUE INDEX idx_unique_active_doctor_slot ON appointments(doctor_id, appointment_date, start_time) WHERE (status = \'booked\');`. Even under high concurrent load, PostgreSQL serializes writes to the B-tree index and throws error code 23505 (unique_violation) for the second transaction, which our Express error middleware translates into a clean HTTP 409 Conflict response.',
    followUp: 'Why use a partial index instead of a standard UNIQUE(doctor_id, appointment_date, start_time)? Because when an appointment is cancelled, a standard unique constraint would block any future patient from ever booking that same slot again. A partial index with `WHERE (status = \'booked\')` ignores cancelled records, automatically freeing the slot!',
  },
  {
    id: 2,
    category: 'database',
    question: 'Why did you choose node-postgres (pg) with parameterized queries over a heavy ORM like Hibernate or TypeORM?',
    answer: 'In clinical scheduling systems, predictability, query transparency, and explicit control over transactions and locking are paramount. Parameterized queries ($1, $2) pass user values out-of-band to the PostgreSQL query planner, which eliminates SQL injection attacks at the protocol level. Furthermore, raw SQL with explicit indexes makes query plan analysis (EXPLAIN ANALYZE) straightforward without hidden ORM N+1 query bottlenecks.',
    followUp: 'How would you detect and fix an N+1 query problem? By looking for queries executed inside a loop over child records, and replacing them with a single JOIN or an aggregate CTE (`COUNT(DISTINCT ...) FILTER (...)`).',
  },
  {
    id: 3,
    category: 'auth',
    question: 'How is user authentication structured, and why do we prefer HttpOnly cookies over localStorage?',
    answer: 'We use JWT (JSON Web Tokens) with passwords hashed via bcrypt (10 salt rounds). When a user logs in, the backend signs a payload with their ID, email, and role, issuing an HttpOnly, Secure, SameSite=Lax cookie alongside the response. Storing tokens in HttpOnly cookies prevents malicious scripts from stealing the session token via Cross-Site Scripting (XSS), as JavaScript cannot access document.cookie for HttpOnly flags.',
    followUp: 'What is the role of the SameSite=Lax cookie attribute? It prevents Cross-Site Request Forgery (CSRF) on cross-origin POST requests while still permitting top-level navigation.',
  },
  {
    id: 4,
    category: 'backend',
    question: 'Walk me through the request-response lifecycle of an Express endpoint in CareFlow.',
    answer: '1) HTTP Request arrives at port 3000. 2) Core Express middleware runs: cors(), express.json(), cookieParser(). 3) Route dispatch matches `/api/appointments`. 4) `requireAuth` middleware extracts and verifies the JWT. 5) `validateRequest(createAppointmentSchema)` executes Zod validation. If invalid, early returns 400 with field issues. 6) Controller delegates to `appointmentService.createAppointment()`. 7) Service initiates `withTransaction(client)` to verify slot availability, generate reference, and insert. 8) Controller returns HTTP 201 with JSON payload. 9) Any unhandled promise rejection bubbles to the centralized `errorHandler` middleware.',
    followUp: 'Why is error handling middleware placed after all route declarations in Express? Because Express error middlewares have 4 parameters `(err, req, res, next)` and only receive errors passed via `next(err)` from preceding routes.',
  },
  {
    id: 5,
    category: 'database',
    question: 'Explain the entity relationship between Users, Doctors, Availability, and Appointments.',
    answer: 'Users has a 1-to-Many relationship with Appointments (`appointments.patient_id -> users.id`). Doctors has a 1-to-Many relationship with DoctorAvailability (`doctor_availability.doctor_id -> doctors.id` with CASCADE delete). Doctors has a 1-to-Many relationship with Appointments (`appointments.doctor_id -> doctors.id` with RESTRICT delete to preserve medical history audit trails).',
    followUp: 'Why use ON DELETE RESTRICT on appointments instead of CASCADE? Because healthcare regulations require preserving past appointment records even if a practitioner leaves the clinic.',
  },
  {
    id: 6,
    category: 'concurrency',
    question: 'What are database isolation levels and why does READ COMMITTED vs SERIALIZABLE matter in booking engines?',
    answer: 'Under default READ COMMITTED, each query sees committed data. However, two transactions can both check that a slot has 0 rows and then both attempt an INSERT. By adding our PostgreSQL partial unique index, the engine enforces uniqueness at commit time regardless of the isolation level. If stricter serial ordering is needed without constraints, SELECT ... FOR UPDATE or SERIALIZABLE isolation detects read/write conflicts and prompts a retry.',
    followUp: 'What error code does PostgreSQL throw on serializable failure? 40001 (serialization_failure), indicating the transaction should be retried.',
  },
  {
    id: 7,
    category: 'auth',
    question: 'How does CareFlow enforce Role-Based Access Control (RBAC)?',
    answer: 'We have two user roles: `patient` and `admin`. The `requireRole("admin")` middleware verifies `req.user.role === "admin"`. If a regular patient attempts to hit `/api/admin/*`, Express immediately terminates the request with HTTP 403 Forbidden. Additionally, during public registration, the role is hardcoded to "patient" on the server, preventing privilege escalation.',
    followUp: 'Can a patient view another patient\'s appointments? No, `appointmentService.getAppointmentById` validates `appointment.patient_id === req.user.id` unless the requester is an admin.',
  },
  {
    id: 8,
    category: 'frontend',
    question: 'How does React handle state synchronization when an appointment is booked or cancelled?',
    answer: 'We utilize unidirectional data flow: `AuthContext` provides authenticated user state, while `PatientDashboardPage` maintains local `appointments` state fetched on mount via `useEffect`. When a cancellation occurs, the API request updates PostgreSQL first, and upon successful HTTP 200 resolution, we re-fetch or optimistically update the list, ensuring client state strictly mirrors database reality.',
    followUp: 'Why not store sensitive JWT tokens in global Redux or window variables? Because memory leaks or devtools can expose them. HttpOnly cookies or localized in-memory contexts with short expiration are safer.',
  },
  {
    id: 9,
    category: 'system_design',
    question: 'How do you handle time zones between the clinic location and the patient\'s browser?',
    answer: 'Clinic operating hours and appointment dates are stored as explicit clinic calendar dates (`DATE` and `TIME`), and combined into `TIMESTAMP WITH TIME ZONE` in PostgreSQL. When generating slots, the server calculates availability based on the clinic\'s scheduled working hours (e.g. 09:00 to 17:00), returning standardized ISO strings so the client renders the exact scheduled clinic time.',
    followUp: 'What problem occurs if appointment_date is stored as a raw Javascript Date without specifying timezone? Midnight in UTC can roll back to the previous calendar day in negative UTC offsets (e.g. EST/PST).',
  },
  {
    id: 10,
    category: 'backend',
    question: 'What is the purpose of Zod schemas and why validate on both client and server?',
    answer: 'Client-side validation provides instant UX feedback (disabling submit buttons, formatting inputs). However, client code can be bypassed by Postman, curl, or malicious actors. Server-side Zod validation guarantees that all data entering our controllers and services conforms strictly to expected types, bounds, and regex patterns before hitting the database.',
    followUp: 'What HTTP status code should validation failures return? HTTP 400 Bad Request with an array of specific field error messages.',
  },
  {
    id: 11,
    category: 'database',
    question: 'What indexes did you create in PostgreSQL and what was the engineering rationale for each?',
    answer: '1) `idx_users_email` (B-Tree): Accelerates user login lookups from O(N) table scan to O(log N). 2) `idx_doctors_specialty`: Speeds up public directory filtering by specialty. 3) `idx_appointments_patient`: Accelerates patient dashboard queries (`WHERE patient_id = $1`). 4) `idx_doctor_avail_doc_day`: Speeds up slot generation. 5) `idx_unique_active_doctor_slot`: Partial unique index preventing double-booking.',
    followUp: 'What is the trade-off of having too many indexes? Indexes consume memory and add write overhead on INSERT/UPDATE/DELETE operations because the B-tree must be updated.',
  },
  {
    id: 12,
    category: 'system_design',
    question: 'How does the booking engine handle slot generation dynamically from working hours?',
    answer: 'Instead of storing thousands of empty slot rows years into the future, CareFlow generates slots on-the-fly: Given a doctor ID and date, it looks up recurring schedule intervals for that weekday, slices the window into `slot_duration_minutes` blocks, queries existing `booked` appointments for that day, and marks each interval as available or unavailable.',
    followUp: 'What is the advantage of on-the-fly generation over pre-generating slot rows? Pre-generating millions of future rows creates massive database bloat and requires maintenance batch jobs whenever a doctor adjusts their schedule.',
  },
  {
    id: 13,
    category: 'backend',
    question: 'Explain the difference between 401 Unauthorized, 403 Forbidden, and 409 Conflict.',
    answer: 'HTTP 401 Unauthorized means authentication is missing or invalid (the server does not know who you are). HTTP 403 Forbidden means authentication succeeded, but the user does not have permission for this resource (e.g. patient accessing admin data). HTTP 409 Conflict means the request cannot be processed due to a resource state conflict (e.g. another patient already booked that slot).',
    followUp: 'What status code is returned when a doctor ID in the URL does not exist? HTTP 404 Not Found.',
  },
  {
    id: 14,
    category: 'auth',
    question: 'Why should passwords never be hashed with plain MD5 or SHA-256?',
    answer: 'MD5 and SHA-256 are fast cryptographic hash functions designed for data integrity, making them vulnerable to brute-force attacks and precomputed Rainbow Tables at billions of hashes per second. Bcrypt is a slow, salted, adaptive key derivation function with an adjustable work factor (salt rounds), designed specifically to make brute-force cracking computationally impractical.',
    followUp: 'What does a salt do in bcrypt? A salt is random data appended before hashing that ensures identical passwords produce completely different hash strings, neutralizing rainbow table attacks.',
  },
  {
    id: 15,
    category: 'concurrency',
    question: 'What is a race condition in web development?',
    answer: 'A race condition occurs when the behavior of software depends on the uncontrollable timing or interleaving of multiple concurrent operations. In booking systems, if two users read that slot 10:00 is free at the exact same moment, both conclude it is available and both execute an INSERT, resulting in double-booking unless locked or protected by database unique constraints.',
    followUp: 'How did you test or verify that CareFlow handles this race condition? By writing concurrent test requests simulating simultaneous booking attempts for the same slot.',
  },
  {
    id: 16,
    category: 'frontend',
    question: 'What are React Hooks and why do we use useState and useEffect in CareFlow?',
    answer: 'React Hooks allow functional components to use state and lifecycle features. `useState` manages reactive UI data (e.g., selected date, active slots, error states). `useEffect` synchronizes the component with external systems (such as fetching slot data from the Express API whenever the selected doctor or date changes).',
    followUp: 'Why is it important to clean up effects with an `isMounted` flag or AbortController? To prevent memory leaks and state updates on unmounted components when network requests complete after navigation.',
  },
  {
    id: 17,
    category: 'backend',
    question: 'What is the role of Vite middleware mounting in our Express server.ts?',
    answer: 'In full-stack Node.js + React development, mounting `vite.middlewares` directly into the Express application allows a single port (3000) to serve both the hot-reloading frontend SPA and backend API endpoints, eliminating CORS preflight overhead and complex proxy setups during development.',
    followUp: 'How does production deployment differ? In production, Vite compiles the React code to static assets in `dist/`, which Express serves via `express.static()` with a fallback to `index.html` for client-side routing.',
  },
  {
    id: 18,
    category: 'database',
    question: 'What is ACID in relational database management systems?',
    answer: 'ACID stands for: Atomicity (all operations in a transaction succeed or all fail), Consistency (data transitions adhere to constraints and indexes), Isolation (concurrent transactions execute without interfering with each other), and Durability (committed transactions persist permanently even across power failures).',
    followUp: 'Which ACID property guarantees that an interrupted booking will not leave orphan rows? Atomicity, achieved through ROLLBACK.',
  },
  {
    id: 19,
    category: 'system_design',
    question: 'What is the difference between monolithic architecture and microservices for an intern project like CareFlow?',
    answer: 'A modular monolith (Node.js Express + React + PostgreSQL in a unified structure) is optimal here: it minimizes operational complexity, avoids distributed network latency, simplifies transactions across tables, and allows rapid iteration. Microservices introduce Docker orchestration, service meshes, and distributed tracing that add unnecessary complexity for this scale.',
    followUp: 'When would you break CareFlow into microservices? If clinical scheduling, patient billing, and video consultation required independent scaling, separate teams, and isolated databases.',
  },
  {
    id: 20,
    category: 'database',
    question: 'Explain SQL injection and how CareFlow prevents it completely.',
    answer: 'SQL injection happens when untrusted user input is concatenated directly into SQL strings, allowing attackers to execute arbitrary SQL commands. CareFlow uses parameterized queries: `query(\'SELECT * FROM doctors WHERE specialty = $1\', [specialty])`. Values are sent separately via PostgreSQL wire protocol and treated strictly as literal data, never executable SQL code.',
    followUp: 'Does using string escaping (like addslashes) protect against all SQL injection? No, character encoding tricks and multibyte characters can bypass simple escaping, which is why parameterized queries are mandatory.',
  },
  {
    id: 21,
    category: 'backend',
    question: 'Why did you use Zod over alternatives like Joi or Yup?',
    answer: 'Zod is TypeScript-first, zero-dependency, lightweight, and supports automatic type inference (`z.infer<typeof schema>`), allowing backend code to share identical validation rules and inferred interfaces across validators and controllers with zero code duplication.',
    followUp: 'How does Zod handle unknown keys by default? Zod strips unknown keys by default, preventing mass-assignment vulnerabilities.',
  },
  {
    id: 22,
    category: 'auth',
    question: 'What information should NEVER be returned in an API response or stored in a JWT payload?',
    answer: 'Sensitive credentials (plain passwords, password hashes, payment card numbers, internal database connection strings, secret keys) should never be returned. A JWT is base64-encoded and can be decoded by anyone with access to the token, so it must only contain non-sensitive identity markers like user ID, email, and role.',
    followUp: 'How did you ensure user queries don\'t leak the password_hash? By explicitly projecting `SELECT id, name, email, role, phone FROM users` or destructuring `{ password_hash, ...safeUser }`.',
  },
  {
    id: 23,
    category: 'system_design',
    question: 'What is the state machine for an appointment and what transitions are prohibited?',
    answer: 'An appointment starts in `booked`. Valid transitions: `booked` -> `completed`, `booked` -> `cancelled`, `booked` -> `no_show`. Terminal states: once an appointment is `cancelled` or `completed`, it cannot transition back to `booked` or `completed`. This is enforced in `admin.service.ts` and `appointment.service.ts`.',
    followUp: 'Why is a state machine essential in healthcare software? Prohibiting invalid transitions prevents double billing, fraudulent slot reclamation, and corrupted clinical logs.',
  },
  {
    id: 24,
    category: 'frontend',
    question: 'What is responsive design and how is it implemented in CareFlow?',
    answer: 'Responsive design ensures optimal usability across smartphones, tablets, and desktop displays. Using Tailwind CSS mobile-first breakpoint utilities (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, `hidden md:flex`), the UI naturally reorganizes doctor cards, slot pickers, and admin tables into touch-friendly layouts.',
    followUp: 'How do you ensure accessibility for clinical booking? High contrast text ratios, visible focus outlines, descriptive button labels, and semantic HTML form elements.',
  },
  {
    id: 25,
    category: 'concurrency',
    question: 'If CareFlow scaled to 100,000 bookings per day, how would you optimize the architecture?',
    answer: '1) Database connection pooling: tune `max` connections in `pg.Pool` or use PgBouncer. 2) Caching: cache static doctor profiles and specialty directories in Redis with short TTLs. 3) Read Replicas: route public read-only doctor discovery queries to PostgreSQL read replicas while writing appointments to the primary node. 4) Partitioning: partition the `appointments` table by `appointment_date` range.',
    followUp: 'Would caching solve the double-booking problem? No! Reservation writes must always touch the authoritative primary database to preserve ACID guarantees.',
  },
];

export const InterviewGuidePage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(1);

  const categories = [
    { key: 'all', label: 'All Questions (25)' },
    { key: 'concurrency', label: 'Concurrency & Locking' },
    { key: 'database', label: 'PostgreSQL & SQL' },
    { key: 'backend', label: 'Node.js & Express' },
    { key: 'auth', label: 'JWT & Security' },
    { key: 'frontend', label: 'React State' },
    { key: 'system_design', label: 'System Architecture' },
  ];

  const filteredQuestions = selectedCategory === 'all'
    ? INTERVIEW_QUESTIONS
    : INTERVIEW_QUESTIONS.filter((q) => q.category === selectedCategory);

  return (
    <div className="space-y-10 pb-20 max-w-5xl mx-auto">
      
      {/* Editorial Header */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="text-slate-900 font-bold">Technical Interview Preparation</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>Software Engineering Intern Evaluation</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
          CareFlow Architecture & System Defense Guide
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-3xl">
          Complete conceptual walkthroughs, request-response lifecycles, and 25 senior engineering interview questions with model answers and follow-ups.
        </p>
      </div>

      {/* 90-Second Interview Pitch */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-950">The 90-Second Elevator Pitch</h2>
            <p className="text-xs text-slate-500">Concise, confident answer to: "Tell me about this project and its architecture"</p>
          </div>
        </div>

        <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm text-slate-800 leading-relaxed space-y-3 font-normal">
          <p>
            "CareFlow is a production-minded clinical appointment booking application designed to solve real-world scheduling concurrency and clinic operations.
            The frontend is built in React 19 with Tailwind CSS, providing doctor discovery, specialty filtering, and live slot reservation.
            The backend is powered by Node.js and Express with a layered architecture cleanly separating routes, middleware, controllers, and services."
          </p>
          <p>
            "For persistence, I used PostgreSQL with parameterized SQL queries via node-postgres semantics to eliminate SQL injection vulnerabilities.
            The most critical engineering challenge was eliminating double-booking race conditions when multiple patients attempt to reserve the same slot simultaneously.
            I solved this by combining transaction-level checks with a database-level partial unique index in PostgreSQL (<code>WHERE status = 'booked'</code>), so the database itself guarantees atomicity while allowing cancelled slots to be re-booked immediately.
            Authentication uses JWT with bcrypt password hashing and HttpOnly cookies, and all payloads are validated via Zod schemas."
          </p>
        </div>
      </div>

      {/* End-to-End Request Lifecycle */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-950">Request-Response Lifecycle</h2>
            <p className="text-xs text-slate-500">Tracing an appointment booking request from user click to database commit</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="font-bold text-slate-950 block text-[11px]">1. Client Event</span>
            <p className="text-slate-600">Patient clicks 'Confirm Booking'. React validates input and calls <code>appointmentApi.create()</code>.</p>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="font-bold text-slate-950 block text-[11px]">2. Express Routing</span>
            <p className="text-slate-600">Catches <code>POST /api/appointments</code>. <code>cors</code>, <code>json</code>, and <code>cookieParser</code> parse headers.</p>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="font-bold text-slate-950 block text-[11px]">3. Middleware Guard</span>
            <p className="text-slate-600"><code>requireAuth</code> verifies JWT. <code>validateRequest</code> runs Zod schema. If invalid, early 400 return.</p>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="font-bold text-slate-950 block text-[11px]">4. Service & Lock</span>
            <p className="text-slate-600"><code>appointmentService</code> opens transaction. Verifies doctor working hours and checks slot.</p>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="font-bold text-slate-950 block text-[11px]">5. Engine Commit</span>
            <p className="text-slate-600">Partial index checks uniqueness. Inserts row, generates reference, commits, returns HTTP 201.</p>
          </div>
        </div>
      </div>

      {/* Concurrency Deep Dive */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-950">PostgreSQL Concurrency Defense Mechanism</h2>
            <p className="text-xs text-slate-500">How CareFlow mathematically eliminates double-booking</p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
          <p>
            Standard application-level checks fail during simultaneous requests because both concurrent queries see zero existing bookings before either commits.
            CareFlow delegates absolute enforcement to the PostgreSQL engine:
          </p>

          <div className="p-4 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto space-y-1">
            <div className="text-slate-400 font-bold">-- PostgreSQL Partial Unique Index:</div>
            <div>CREATE UNIQUE INDEX idx_unique_active_doctor_slot</div>
            <div>ON appointments(doctor_id, appointment_date, start_time)</div>
            <div>WHERE (status = 'booked');</div>
          </div>

          <p>
            When two transactions race, the second transaction violates index constraint <code>23505</code>, which our centralized error middleware translates into <code>HTTP 409 Conflict</code>.
            Because the index predicate is <code>WHERE (status = 'booked')</code>, when an appointment is cancelled, it drops out of the partial index, automatically liberating the slot for future bookings!
          </p>
        </div>
      </div>

      {/* 25 Questions Section */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-950">25 Technical Interview Questions & Model Answers</h2>
          <p className="text-xs text-slate-500">Filter by category to test your knowledge</p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-950 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Questions Accordion */}
        <div className="divide-y divide-slate-100">
          {filteredQuestions.map((item) => {
            const isExpanded = expandedQuestion === item.id;
            return (
              <div key={item.id} className="py-3.5 space-y-2.5">
                <button
                  onClick={() => setExpandedQuestion(isExpanded ? null : item.id)}
                  className="w-full flex items-start justify-between text-left gap-4 group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                      {item.id}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-slate-950 transition">
                      {item.question}
                    </span>
                  </div>
                  <div className="p-1 text-slate-400 group-hover:text-slate-700 transition shrink-0">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="pl-7 pr-2 space-y-2.5 text-xs leading-relaxed animate-in fade-in">
                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800">
                      <strong className="block text-slate-900 font-semibold text-[11px] mb-1">
                        Model Answer:
                      </strong>
                      <p>{item.answer}</p>
                    </div>

                    <div className="p-3 bg-slate-100/70 border border-slate-200/70 rounded-xl text-slate-700">
                      <strong className="block text-slate-900 font-semibold text-[11px] mb-0.5">
                        Interviewer Follow-Up:
                      </strong>
                      <p>{item.followUp}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
