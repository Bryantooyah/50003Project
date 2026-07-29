import { pool } from './index';
import { hashPassword } from '../utils/password';

export interface CreateUserParams {
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'therapist' | 'student';
  dateOfBirth?: string;
  age?: number;
  level?: string;
}

// 1. Create a user and insert into their respective role table
export async function createUserWithRole(params: CreateUserParams) {
  const { username, password, name, role, dateOfBirth, level } = params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const passwordHash = await hashPassword(password);

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
        [user.id, dateOfBirth || null, level || null]
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

// 2. Fetch all users (useful for dropdown lists when mapping relationships)
export async function getAllUsers() {
  const res = await pool.query(
    'SELECT id, username, name, role, created_at FROM users ORDER BY created_at DESC'
  );
  return res.rows;
}

// 3. Assign Therapist -> Student
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

// 4. Get students assigned to a specific therapist
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

// 5. Fetch all active therapist-student relationships (with names & usernames)
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