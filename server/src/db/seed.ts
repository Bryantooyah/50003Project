import { pool } from './index'
import { hashPassword, verifyPassword } from '../utils/password'

const ROLE_TABLES: Record<string, string> = {
  admin: 'admins',
  therapist: 'therapists',
  parent: 'parents',
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
  const username = args.username ?? 'testuser'
  const password = args.password ?? 'test123'
  const name = args.name ?? 'Test User'
  const role = args.role ?? 'student'

  const passwordHash = await hashPassword(password)

  const { rows } = await pool.query(
    `insert into users (username, password_hash, name, role)
     values ($1, $2, $3, $4)
     returning id, username, name, role`,
    [username, passwordHash, name, role]
  )
  const user = rows[0]

  const roleTable = ROLE_TABLES[role]
  if (roleTable) {
    await pool.query(`insert into ${roleTable} (user_id) values ($1)`, [user.id])
  }

  const { rows: check } = await pool.query(
    'select password_hash from users where id = $1',
    [user.id]
  )
  const matches = await verifyPassword(password, check[0].password_hash)

  console.log('Created user:', user)
  console.log('Password round-trip verified (hash -> DB -> verify):', matches)

  await pool.end()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
