import crypto from 'crypto';
import { pool } from './index';
import { hashPassword } from '../utils/password';

// 1. Discriminated Union: Password is strictly required for Admin/Therapist, but completely absent for Student
export type CreateAdminOrTherapistParams = {
  username: string;
  password: string; // Required
  name: string;
  role: 'admin' | 'therapist';
};

export type CreateStudentParams = {
  username: string;
  name: string;
  role: 'student'; // No password field exist at all for students
  dateOfBirth?: string;
  age?: number;
  level?: string;
};

export type CreateUserParams = CreateAdminOrTherapistParams | CreateStudentParams;

export interface UpdateStudentParams {
  name?: string;
  username?: string;
  dateOfBirth?: string;
  level?: string;
}

// 2. Create a user and insert into their respective role table
export async function createUserWithRole(params: CreateUserParams) {
  const { username, name, role } = params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Generate random hash for students; use provided password for therapist/admin
    const rawPassword = role === 'student' ? crypto.randomUUID() : params.password;
    const passwordHash = await hashPassword(rawPassword);

    // Insert into users table
    const userRes = await client.query(
      `INSERT INTO users (username, password_hash, name, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, username, name, role`,
      [username, passwordHash, name, role]
    );

    const user = userRes.rows[0];

    // Insert into role extension table
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
    return user;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// 3. Fetch all users (includes date_of_birth and level for students via LEFT JOIN)
export async function getAllUsers() {
  const res = await pool.query(
    `SELECT 
       u.id, 
       u.username, 
       u.name, 
       u.role, 
       u.created_at,
       s.date_of_birth,
       s.level
     FROM users u
     LEFT JOIN students s ON u.id = s.user_id
     ORDER BY u.created_at DESC`
  );
  return res.rows;
}

// 4. Update student profile details
export async function updateStudentDetails(userId: string, data: UpdateStudentParams) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update base user details (name, username)
    if (data.name || data.username) {
      await client.query(
        `UPDATE users 
         SET name = COALESCE($1, name), 
             username = COALESCE($2, username) 
         WHERE id = $3 AND role = 'student'`,
        [data.name || null, data.username || null, userId]
      );
    }

    // Update student extension details (date_of_birth, level)
    if (data.dateOfBirth !== undefined || data.level !== undefined) {
      await client.query(
        `UPDATE students 
         SET date_of_birth = COALESCE($1, date_of_birth), 
             level = COALESCE($2, level) 
         WHERE user_id = $3`,
        [data.dateOfBirth || null, data.level || null, userId]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// 5. Assign Therapist -> Student
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

// 6. Get students assigned to a specific therapist
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

// 7. Fetch all active therapist-student relationships (with names & usernames)
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