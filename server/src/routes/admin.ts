import { Router } from 'express';
import { requireAuth, requireRole, verifyTherapistSelf } from '../middleware/auth';
import {
  createUserWithRole,
  getAllUsers,
  assignTherapistToStudent,
  getStudentsForTherapist,
  getAllAssignments,
  resetPassword,
  getUserRole,
  isSystemAdmin,
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

    // 1. Basic Incomplete Profile Validation (Password ONLY required for staff)
    if (!username || !name || !role || (role !== 'student' && !password)) {
      return res.status(400).json({ 
        error: 'Incomplete profile: username, name, and role are required (password required for staff).' 
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

    // Construct user payload matching CreateUserParams discriminated union
    const userData = role === 'student'
      ? { username, name, role: 'student' as const, dateOfBirth, level }
      : { username, password, name, role: role as 'therapist' | 'admin' };

    const user = await createUserWithRole(userData);
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

    const assignment = await assignTherapistToStudent(therapistId, studentId);
    if (!assignment) {
      return res.json({
        status: 'ok',
        alreadyAssigned: true,
        message: 'This therapist is already assigned to this student.',
      });
    }
    res.status(201).json({
      status: 'ok',
      alreadyAssigned: false,
      message: 'Therapist assigned to student successfully',
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/reset-password - Admin resets any user's password (ADMIN ONLY)
router.post('/reset-password', requireRole(['admin']), async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'userId and newPassword are required' });
    }

    const targetRole = await getUserRole(userId);
    if (!targetRole) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (targetRole === 'student') {
      return res.status(400).json({ error: 'Students do not have login access; password reset is not applicable.' });
    }
    if (targetRole === 'admin' && (await isSystemAdmin(userId))) {
      return res.status(403).json({ error: "Cannot reset the system administrator's password." });
    }

    const updated = await resetPassword(userId, newPassword);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ status: 'ok', message: 'Password reset successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;