import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../database/db.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { JWT_SECRET, UserPayload } from '../middleware/auth.ts';
import { RegisterInput, LoginInput } from '../validators/auth.schema.ts';

export async function registerPatient(data: RegisterInput) {
  // Check if email already registered
  const existingUser = await query('SELECT id FROM users WHERE email = $1', [data.email]);
  if (existingUser.rows.length > 0) {
    throw new AppError('An account with this email address already exists.', 409);
  }

  // Hash password with bcrypt (10 rounds)
  const passwordHash = await bcrypt.hash(data.password, 10);

  // Enforce patient role (prevent privilege escalation)
  const result = await query(
    `INSERT INTO users (name, email, password_hash, role, phone)
     VALUES ($1, $2, $3, 'patient', $4)
     RETURNING id, name, email, role, phone, created_at;`,
    [data.name, data.email, passwordHash, data.phone || null]
  );

  const newUser = result.rows[0];

  // Issue session token
  const payload: UserPayload = {
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
    name: newUser.name,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  return { user: newUser, token };
}

export async function loginUser(data: LoginInput) {
  const result = await query(
    `SELECT id, name, email, password_hash, role, phone, created_at 
     FROM users 
     WHERE email = $1`,
    [data.email]
  );

  if (result.rows.length === 0) {
    throw new AppError('Invalid email or password.', 401);
  }

  const user = result.rows[0];
  const isPasswordValid = await bcrypt.compare(data.password, user.password_hash);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password.', 401);
  }

  const payload: UserPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  // Exclude password hash before returning
  const { password_hash, ...safeUser } = user;

  return { user: safeUser, token };
}

export async function getUserProfile(userId: number) {
  const result = await query(
    `SELECT id, name, email, role, phone, created_at 
     FROM users 
     WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('User account not found.', 404);
  }

  return result.rows[0];
}
