import { Router } from 'express';
import { pool } from '../db';
import { verifyPassword } from '../utils/password';

const router = Router();

// POST /api/auth/login — Authenticate staff (admin / therapist)
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

    // 2. Reject direct login for student accounts
    if (user.role === 'student') {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // 3. Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // 4. Return user session data (excluding password_hash)
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