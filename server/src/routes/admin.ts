import { Router } from 'express';
import { requireAuth, requireRole, verifyTherapistSelf } from '../middleware/auth';
import {
  createUserWithRole,
  getAllUsers,
  assignTherapistToStudent,
  getStudentsForTherapist,
  getAllAssignments,
} from '../db/admin';

const router = Router();

// Apply Authentication Middleware to ALL Admin Routes
router.use(requireAuth);

// GET /api/admin/users - Get list of all users (ADMIN ONLY)
router.get('/users', requireRole(['admin']), async (_req, res) => {
  try {
    const users = await getAllUsers();
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/assignments - Get list of all therapist-student relationships (ADMIN ONLY)
router.get('/assignments', requireRole(['admin']), async (_req, res) => {
  try {
    const assignments = await getAllAssignments();
    res.json({ assignments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/therapist/:therapistId/students - Get students assigned to a therapist
router.get('/therapist/:therapistId/students', verifyTherapistSelf, async (req, res) => {
  try {
    const { therapistId } = req.params;
    if (!therapistId || typeof therapistId !== 'string') {
      return res.status(400).json({ error: 'therapistId parameter must be a string' });
    }

    const students = await getStudentsForTherapist(therapistId);
    res.json({ students });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users - Create a new user account (ADMIN ONLY)
router.post('/users', requireRole(['admin']), async (req, res) => {
  try {
    const { username, password, name, role, dateOfBirth, level } = req.body;

    // 1. Basic Incomplete Profile Validation
    if (!username || !password || !name || !role) {
      return res.status(400).json({ 
        error: 'Incomplete profile: username, password, name, and role are required.' 
      });
    }

    // 2. Student Profile Incomplete / Invalid State Validation
    if (role === 'student') {
      if (!dateOfBirth) {
        return res.status(422).json({ 
          error: 'Incomplete profile: Date of birth is required for student accounts.' 
        });
      }

      const dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime()) || dob > new Date()) {
        return res.status(422).json({ 
          error: 'Invalid profile data: Date of birth must be a valid past date.' 
        });
      }
    }

    const user = await createUserWithRole({ username, password, name, role, dateOfBirth, level });
    res.status(201).json({ status: 'ok', user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/assign-therapist - Assign Therapist to Student (ADMIN ONLY)
router.post('/assign-therapist', requireRole(['admin']), async (req, res) => {
  try {
    const { therapistId, studentId } = req.body;
    if (!therapistId || !studentId) {
      return res.status(400).json({ error: 'therapistId and studentId are required' });
    }

    await assignTherapistToStudent(therapistId, studentId);
    res.json({ status: 'ok', message: 'Therapist assigned to student successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;