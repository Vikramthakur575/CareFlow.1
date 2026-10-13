import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

// Type definitions matching node-postgres query contract
export interface QueryResultRow {
  [column: string]: any;
}

export interface QueryResult<R extends QueryResultRow = any> {
  rows: R[];
  rowCount: number;
}

export interface DBClient {
  query<R extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<R>>;
  release?: () => void;
}

let pgliteInstance: PGlite | null = null;
let pgPoolInstance: pg.Pool | null = null;
let activeEngine: 'pg_pool' | 'pglite_fs' | 'pglite_memory' = 'pglite_memory';

const DATA_DIR = path.resolve(process.cwd(), '.careflow_data');

/**
 * Connects to PostgreSQL.
 * Priority 1: DATABASE_URL via standard node-postgres (pg.Pool).
 * Priority 2: Persistent embedded PostgreSQL (PGlite with filesystem).
 * Priority 3: In-memory embedded PostgreSQL (PGlite MEMFS fallback, guaranteed to work on Windows).
 */
export async function getDb(): Promise<{ type: 'pool' | 'pglite'; instance: pg.Pool | PGlite }> {
  // Option A: Standard PostgreSQL via DATABASE_URL
  if (process.env.DATABASE_URL) {
    if (!pgPoolInstance) {
      try {
        console.log('[CareFlow Database] Connecting to PostgreSQL via DATABASE_URL...');
        pgPoolInstance = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
        });
        // Test connection
        await pgPoolInstance.query('SELECT 1');
        activeEngine = 'pg_pool';
        console.log('[CareFlow Database] Connected to PostgreSQL server successfully.');
      } catch (err: any) {
        console.warn(`[CareFlow Database] Could not connect to DATABASE_URL (${err.message}). Falling back to embedded PostgreSQL...`);
        pgPoolInstance = null;
      }
    }
    if (pgPoolInstance) {
      return { type: 'pool', instance: pgPoolInstance };
    }
  }

  // Option B: PGlite embedded PostgreSQL
  if (!pgliteInstance) {
    // 1. Try persistent filesystem first
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const instance = new PGlite(DATA_DIR);
      await instance.waitReady;
      pgliteInstance = instance;
      activeEngine = 'pglite_fs';
      console.log(`[CareFlow Database] PGlite persistent database initialized at ${DATA_DIR}`);
    } catch (fsErr: any) {
      // Common Windows file-lock/WASM path error: graceful fallback
      console.warn(`[CareFlow Database] PGlite filesystem initialization warning (${fsErr?.message || fsErr}). Switching to in-memory PostgreSQL engine...`);
      try {
        const memInstance = new PGlite();
        await memInstance.waitReady;
        pgliteInstance = memInstance;
        activeEngine = 'pglite_memory';
        console.log('[CareFlow Database] In-memory PostgreSQL engine active. Full SQL & ACID compliance enabled.');
      } catch (fatalErr: any) {
        console.error('[CareFlow Database] Fatal: Unable to initialize embedded Postgres WASM runtime:', fatalErr);
        throw fatalErr;
      }
    }
  }

  return { type: 'pglite', instance: pgliteInstance };
}

/**
 * Executes a parameterized SQL query against PostgreSQL ($1, $2, etc.).
 */
export async function query<R extends QueryResultRow = any>(
  text: string,
  params: any[] = []
): Promise<QueryResult<R>> {
  const db = await getDb();
  try {
    if (db.type === 'pool') {
      const res = await (db.instance as pg.Pool).query<R>(text, params);
      return {
        rows: res.rows || [],
        rowCount: res.rowCount ?? (res.rows ? res.rows.length : 0),
      };
    } else {
      const res = await (db.instance as PGlite).query<R>(text, params);
      return {
        rows: res.rows || [],
        rowCount: (res.rows && res.rows.length) || (res.affectedRows ?? 0),
      };
    }
  } catch (err: any) {
    console.error(`[PostgreSQL Query Error] SQL: ${text}`, err.message || err);
    throw err;
  }
}

/**
 * Obtains a transaction-aware client for multi-statement atomic operations.
 */
export async function withTransaction<T>(
  callback: (client: { query: <R extends QueryResultRow = any>(text: string, params?: any[]) => Promise<QueryResult<R>> }) => Promise<T>
): Promise<T> {
  const db = await getDb();

  if (db.type === 'pool') {
    const client = await (db.instance as pg.Pool).connect();
    try {
      await client.query('BEGIN');
      const wrappedClient = {
        query: async <R extends QueryResultRow = any>(text: string, params: any[] = []) => {
          const res = await client.query<R>(text, params);
          return {
            rows: res.rows || [],
            rowCount: res.rowCount ?? (res.rows ? res.rows.length : 0),
          };
        },
      };
      const result = await callback(wrappedClient);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } else {
    const pglite = db.instance as PGlite;
    await pglite.query('BEGIN');
    try {
      const wrappedClient = {
        query: async <R extends QueryResultRow = any>(text: string, params: any[] = []) => {
          const res = await pglite.query<R>(text, params);
          return {
            rows: res.rows || [],
            rowCount: (res.rows && res.rows.length) || (res.affectedRows ?? 0),
          };
        },
      };
      const result = await callback(wrappedClient);
      await pglite.query('COMMIT');
      return result;
    } catch (error) {
      await pglite.query('ROLLBACK');
      throw error;
    }
  }
}

/**
 * Bootstraps the PostgreSQL database:
 * 1. Checks if tables exist.
 * 2. Executes schema.sql.
 * 3. Seeds initial verified Indian doctors, hospital branches, and test accounts.
 */
export async function initDatabase(): Promise<void> {
  const db = await getDb();

  // Check if users table exists
  let tablesExist = false;
  try {
    const checkTable = await query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    tablesExist = Boolean(checkTable.rows[0]?.exists);
  } catch (err) {
    tablesExist = false;
  }

  if (!tablesExist) {
    console.log('[Database] Initializing PostgreSQL schema...');
    const schemaPath = path.resolve(process.cwd(), 'server/database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      if (db.type === 'pool') {
        await (db.instance as pg.Pool).query(schemaSql);
      } else {
        await (db.instance as PGlite).exec(schemaSql);
      }
      console.log('[Database] PostgreSQL schema created successfully.');
    }

    console.log('[Database] Seeding initial Indian clinical data...');
    await seedDatabase();
    console.log('[Database] Ready.');
  } else {
    // Check if doctors have updated Indian clinical profile
    try {
      const docCount = await query(`SELECT COUNT(*) as count FROM doctors;`);
      if (Number(docCount.rows[0]?.count) === 0) {
        await seedDatabase();
      }
    } catch (e) {
      // Ignored
    }
  }
}

/**
 * Seeds synthetic doctors, working hours, and starter test accounts.
 */
export async function seedDatabase(): Promise<void> {
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const patientPasswordHash = await bcrypt.hash('patient123', 10);

  // 1. Seed Users (Indian context with aliases for automated test suite)
  await query(
    `INSERT INTO users (name, email, password_hash, role, phone)
     VALUES 
      ($1, $2, $3, $4, $5),
      ($6, $7, $8, $9, $10),
      ($11, $12, $13, $14, $15)
     ON CONFLICT (email) DO NOTHING;`,
    [
      'Dr. Ramesh Gupta (Medical Director)', 'admin@careflow.com', adminPasswordHash, 'admin', '+91 98450 11001',
      'Priya Sundaram', 'sarah.jenkins@example.com', patientPasswordHash, 'patient', '+91 98450 23456',
      'Arjun Verma', 'marcus.chen@example.com', patientPasswordHash, 'patient', '+91 99801 87654',
    ]
  );

  // 2. Seed Doctors (Leading Indian Specialists & Premier Teaching Hospitals)
  const doctorRecords = [
    {
      name: 'Dr. Ananya Sharma, MBBS, MD, DM',
      specialty: 'Cardiology',
      experience_years: 15,
      consultation_fee: 1200.0,
      bio: 'Senior Interventional Cardiologist (AIIMS New Delhi alumna). Specializing in preventive cardiac care, clinical hypertension, echocardiography, and non-invasive coronary diagnostics.',
      location: 'Apollo Super Speciality Hospital, Bannerghatta Road, Bengaluru',
      avatar_url: '/src/assets/images/dr_ananya_sharma_1791877160992.jpg',
    },
    {
      name: 'Dr. Rohan Mukherjee, MBBS, MD',
      specialty: 'Dermatology',
      experience_years: 10,
      consultation_fee: 900.0,
      bio: 'Consultant Clinical Dermatologist & Trichologist (PGIMER Chandigarh alumnus). Expertise in pediatric eczema, psoriasis management, clinical trichology, and allergy evaluation.',
      location: 'Max Super Speciality Clinic, Saket, New Delhi',
      avatar_url: '/src/assets/images/dr_rohan_mukherjee_1791877162927.jpg',
    },
    {
      name: 'Dr. Sunita Kulkarni, MBBS, MD, DCH',
      specialty: 'Pediatrics',
      experience_years: 12,
      consultation_fee: 800.0,
      bio: 'Senior Paediatrician & Neonatologist (KEM Hospital Mumbai). Dedicated to neonatal health, growth milestones, pediatric respiratory wellness, and universal vaccination schedules.',
      location: 'Cloudnine & CareFlow Mother & Child Center, Jayanagar, Bengaluru',
      avatar_url: '/src/assets/images/dr_sunita_kulkarni_1791877161344.jpg',
    },
    {
      name: 'Dr. Vikramaditya Rao, MBBS, MS, M.Ch',
      specialty: 'Orthopedics',
      experience_years: 18,
      consultation_fee: 1500.0,
      bio: 'Chief Orthopaedic Surgeon (CMC Vellore alumnus). Renowned specialist in robotic joint replacement, knee arthroscopy, sports trauma ligament reconstruction, and spine ergonomics.',
      location: 'Manipal Hospital, Old Airport Road, Bengaluru',
      avatar_url: '/src/assets/images/dr_vikram_rao_1791877161244.jpg',
    },
    {
      name: 'Dr. Meera Namboodiri, MBBS, MD, DM',
      specialty: 'Neurology',
      experience_years: 14,
      consultation_fee: 1400.0,
      bio: 'Consultant Neurologist (NIMHANS Bengaluru). Advanced clinical practice in chronic migraine management, neurovascular rehabilitation, peripheral neuropathy, and epilepsy care.',
      location: 'Fortis Memorial Research Institute, Sector 44, Gurugram',
      avatar_url: '/src/assets/images/dr_ananya_sharma_1791877160992.jpg',
    },
    {
      name: 'Dr. Rajesh V. Nambiar, MBBS, MD',
      specialty: 'General Medicine',
      experience_years: 16,
      consultation_fee: 700.0,
      bio: 'Senior Consultant Physician & Diabetologist (Madras Medical College). Comprehensive OPD management of type 2 diabetes, seasonal fevers, metabolic syndrome, and preventive checkups.',
      location: 'CareFlow Multi-Speciality Clinic, Indiranagar 100ft Road, Bengaluru',
      avatar_url: '/src/assets/images/dr_vikram_rao_1791877161244.jpg',
    },
  ];

  for (const doc of doctorRecords) {
    const res = await query(
      `INSERT INTO doctors (name, specialty, experience_years, consultation_fee, bio, location, avatar_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING id;`,
      [doc.name, doc.specialty, doc.experience_years, doc.consultation_fee, doc.bio, doc.location, doc.avatar_url]
    );

    const doctorId = res.rows[0].id;

    // 3. Seed Recurring Working Hours:
    // Morning OPD: 09:00 - 13:00 (30 min slots)
    // Evening OPD: 16:30 - 19:30 (30 min slots)
    // Monday (1) through Saturday (6)
    for (let day = 1; day <= 6; day++) {
      await query(
        `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
         VALUES ($1, $2, '09:00:00', '13:00:00', 30, true);`,
        [doctorId, day]
      );
      // Evening OPD Monday to Friday
      if (day <= 5) {
        await query(
          `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
           VALUES ($1, $2, '16:30:00', '19:30:00', 30, true);`,
          [doctorId, day]
        );
      }
    }
  }

  // 4. Seed an initial upcoming appointment
  const patientRes = await query(`SELECT id FROM users WHERE email = 'sarah.jenkins@example.com' LIMIT 1;`);
  const doctorRes = await query(`SELECT id FROM doctors WHERE specialty = 'Cardiology' LIMIT 1;`);

  if (patientRes.rows.length && doctorRes.rows.length) {
    const patientId = patientRes.rows[0].id;
    const doctorId = doctorRes.rows[0].id;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    if (targetDate.getDay() === 0) targetDate.setDate(targetDate.getDate() + 1);

    const dateStr = targetDate.toISOString().split('T')[0];

    await query(
      `INSERT INTO appointments (booking_reference, patient_id, doctor_id, appointment_date, start_time, end_time, status, reason)
       VALUES ($1, $2, $3, $4, '10:00:00', '10:30:00', 'booked', 'Routine annual cardiac screening and BP evaluation.')
       ON CONFLICT DO NOTHING;`,
      ['CF-OPD-9821', patientId, doctorId, dateStr]
    );
  }
}
