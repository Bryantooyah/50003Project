import { Router } from 'express'
import { pool } from '../db'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', db: 'connected' })
  } catch (_err) {
    res.status(500).json({ status: 'error', db: 'disconnected' })
  }
})

export default router
