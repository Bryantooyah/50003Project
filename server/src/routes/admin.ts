import { Router } from 'express';
import {
  createUserWithRole,
  getAllUsers,
  assignTherapistToStudent,
  assignParentToStudent,
  getStudentsForTherapist,
} from '../db/admin';

const router = Router();

// GET /api/admin/users - Get list of all users
router.get('/users', async (_req, res) => {
  try {
    const users = await getAllUsers();
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/therapist/:therapistId/students - Get students assigned to a specific therapist
router.get('/therapist/:therapistId/students', async (req, res) => {
  try {
    const { therapistId } = req.params;
    if (!therapistId) {
      return res.status(400).json({ error: 'therapistId parameter is required' });
    }

    const students = await getStudentsForTherapist(therapistId);
    res.json({ students });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users - Create a new user account
router.post('/users', async (req, res) => {
  try {
    const { username, password, name, role, dateOfBirth, level } = req.body;

    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const user = await createUserWithRole({ username, password, name, role, dateOfBirth, level });
    res.status(201).json({ status: 'ok', user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/assign-therapist - Assign Therapist to Student
router.post('/assign-therapist', async (req, res) => {
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

// POST /api/admin/assign-parent - Assign Parent to Student
router.post('/assign-parent', async (req, res) => {
  try {
    const { parentId, studentId } = req.body;
    if (!parentId || !studentId) {
      return res.status(400).json({ error: 'parentId and studentId are required' });
    }

    await assignParentToStudent(parentId, studentId);
    res.json({ status: 'ok', message: 'Parent assigned to student successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;