import { Router } from 'express'
import { pool } from '../db'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', db: 'connected' })
  } catch (err) {
    next(err)
  }
})

export default router
