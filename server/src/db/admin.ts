import crypto from 'crypto';
import { pool } from './index';
import { hashPassword } from '../utils/password';

export type CreateAdminOrTherapistParams = {
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'therapist';
};

export type CreateStudentParams = {
  username: string;
  name: string;
  role: 'student';
  dateOfBirth?: string;
  age?: number;
  level?: string;
};

export type CreateUserParams = CreateAdminOrTherapistParams | CreateStudentParams;

export async function createUserWithRole(params: CreateUserParams) {
  const { username, name, role } = params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const rawPassword = role === 'student' ? crypto.randomUUID() : params.password;
    const passwordHash = await hashPassword(rawPassword);

    const userRes = await client.query(
      `INSERT INTO users (username, password_hash, name, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, username, name, role`,
      [username, passwordHash, name, role]
    );

    const user = userRes.rows[0];

    if (role === 'therapist') {
      await client.query('INSERT INTO therapists (user_id) VALUES ($1)', [user.id]);
    } else if (role === 'student') {
      await client.query(
        'INSERT INTO students (user_id, date_of_birth, level) VALUES ($1, $2, $3)',
        [user.id, params.dateOfBirth || null, params.level || null]
      );
    } else if (role === 'admin') {
      await client.query('INSERT INTO admins (user_id) VALUES ($1)', [user.id]);
    }

    await client.query('COMMIT');
    client.release();
    return user;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Rollback can itself fail if the connection is already broken — ignored.
    }
    client.release(error as Error);
    throw error;
  }
}

export async function getAllUsers() {
  const res = await pool.query(
    `SELECT
       u.id,
       u.username,
       u.name,
       u.role,
       u.created_at,
       s.date_of_birth,
       s.level,
       a.is_system_admin
     FROM users u
     LEFT JOIN students s ON u.id = s.user_id
     LEFT JOIN admins a ON u.id = a.user_id
     ORDER BY u.created_at DESC`
  );
  return res.rows;
}

export async function getUserRole(userId: string): Promise<string | null> {
  const res = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
  return res.rows[0]?.role ?? null;
}

export async function isSystemAdmin(userId: string): Promise<boolean> {
  const res = await pool.query('SELECT is_system_admin FROM admins WHERE user_id = $1', [userId]);
  return res.rows[0]?.is_system_admin === true;
}

export async function assignTherapistToStudent(therapistId: string, studentId: string) {
  const res = await pool.query(
    `INSERT INTO therapist_students (therapist_id, student_id) 
     VALUES ($1, $2) 
     ON CONFLICT DO NOTHING 
     RETURNING *`,
    [therapistId, studentId]
  );
  return res.rows[0];
}

export async function getStudentsForTherapist(therapistId: string) {
  const res = await pool.query(
    `SELECT 
        u.id, 
        u.name, 
        s.date_of_birth,
        COALESCE(EXTRACT(YEAR FROM AGE(s.date_of_birth))::int, 0) AS age, 
        s.level 
     FROM users u
     JOIN students s ON u.id = s.user_id
     JOIN therapist_students ts ON s.user_id = ts.student_id
     WHERE ts.therapist_id = $1`,
    [therapistId]
  );
  return res.rows;
}

export async function resetPassword(userId: string, newPassword: string): Promise<boolean> {
  const passwordHash = await hashPassword(newPassword);
  const res = await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
  return (res.rowCount ?? 0) > 0;
}

export async function getAllAssignments() {
  const res = await pool.query(
    `SELECT 
        ts.therapist_id,
        COALESCE(t.name, 'Therapist') AS therapist_name,
        t.username AS therapist_username,
        ts.student_id,
        COALESCE(s.name, 'Student') AS student_name,
        s.username AS student_username
     FROM therapist_students ts
     LEFT JOIN users t ON ts.therapist_id = t.id
     LEFT JOIN users s ON ts.student_id = s.id`
  );
  return res.rows;
}