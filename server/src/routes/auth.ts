import { Router } from 'express';
import { pool } from '../db';
import { verifyPassword } from '../utils/password';
import { createUserWithRole } from '../db/admin';

const router = Router();

// POST /api/auth/signup — public self-registration, no auth required
router.post('/signup', async (req, res) => {
  try {
    const { username, password, name, role, dateOfBirth, level } = req.body;

    if (!username || !password || !name || !role) {
      return res.status(400).json({
        error: 'Incomplete profile: username, password, name, and role are required.',
      });
    }

    if (role === 'student') {
      if (!dateOfBirth) {
        return res.status(422).json({
          error: 'Incomplete profile: Date of birth is required for student accounts.',
        });
      }

      const dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime()) || dob > new Date()) {
        return res.status(422).json({
          error: 'Invalid profile data: Date of birth must be a valid past date.',
        });
      }
    }

    const user = await createUserWithRole({ username, password, name, role, dateOfBirth, level });
    res.status(201).json({ status: 'ok', user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // 1. Fetch user from database
    const userRes = await pool.query(
      'SELECT id, username, password_hash, name, role FROM users WHERE username = $1',
      [username]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = userRes.rows[0];

    // 2. Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // 3. Return user session data (excluding password_hash)
    res.json({
      status: 'ok',
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;