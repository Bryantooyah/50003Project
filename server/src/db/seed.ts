import { pool } from './index'
import { hashPassword, verifyPassword } from '../utils/password'

const ROLE_TABLES: Record<string, string> = {
  admin: 'admins',
  therapist: 'therapists',
  student: 'students',
}

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {}
  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (match) args[match[1]] = match[2]
  }
  return args
}

async function seed() {
  const args = parseArgs(process.argv.slice(2))
  
  // Default values set to admin / admin
  const username = args.username ?? 'admin'
  const password = args.password ?? 'admin'
  const name = args.name ?? 'System Administrator'
  const role = args.role ?? 'admin'

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Check if account already exists
    const { rows: existing } = await client.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    )

    if (existing.length > 0) {
      console.log(`ℹ️ Account "${username}" already exists in the database. Skipping seed.`)
      await client.query('ROLLBACK')
      return
    }

    // Hash password & insert into base users table
    const passwordHash = await hashPassword(password)
    const { rows } = await client.query(
      `INSERT INTO users (username, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, name, role`,
      [username, passwordHash, name, role]
    );
    const user = rows[0]

    // Insert into role extension table (admins/therapists/students)
    const roleTable = ROLE_TABLES[role]
    if (roleTable) {
      await client.query(`INSERT INTO ${roleTable} (user_id) VALUES ($1)`, [user.id])
    }

    await client.query('COMMIT')

    // Password round-trip check
    const { rows: check } = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [user.id]
    )
    const matches = await verifyPassword(password, check[0].password_hash)

    console.log('✅ Created user:', user)
    console.log('🔑 Password round-trip verified (hash -> DB -> verify):', matches)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error('❌ Error seeding database:', err)
    process.exit(1)
  })