import fs from 'fs'
import path from 'path'
import { pool } from './index'

async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8')
  await pool.query(schema)
  console.log('Schema applied.')
  await pool.end()
}

migrate().catch((err) => {
  console.error(err)
  process.exit(1)
})
