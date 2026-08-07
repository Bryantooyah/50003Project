import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Prevent Node process from crashing when PostgreSQL socket disconnects/stops
pool.on('error', (err) => {
  console.error('Idle database pool error:', err.message)
})

export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const { rows } = await pool.query(text, params)
  return rows as T[]
}
