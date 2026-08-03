import crypto from 'crypto'
import request from 'supertest'
import app from '../src/index'
import { pool } from '../src/db'
import { verifyPassword } from '../src/utils/password'

// Test case for UC1 I1 - I5 + U1, U2 & U4
// requireAuth/requireRole trust the X-User-Id/X-User-Role headers directly
// (no session/token verification) — see server/src/middleware/auth.ts — so
// any UUID works as X-User-Id for auth-only checks; only verifyTherapistSelf
// requires the header to match a real therapist's id.

const ADMIN_HEADERS = { 'X-User-Id': crypto.randomUUID(), 'X-User-Role': 'admin' }

afterAll(async () => {
  await pool.end()
})

describe('POST /api/admin/users', () => {
  const createdUserIds: string[] = []

  afterAll(async () => {
    if (createdUserIds.length) {
      await pool.query('delete from users where id = any($1::uuid[])', [createdUserIds])
    }
  })

  it('creates a user as admin (UC1-I1)', async () => {
    const username = `test-therapist-${crypto.randomUUID()}`
    const res = await request(app)
      .post('/api/admin/users')
      .set(ADMIN_HEADERS)
      .send({ username, password: 'Secret123', name: 'Test Therapist', role: 'therapist' })

    expect(res.status).toBe(201)
    expect(res.body.user.username).toBe(username)
    createdUserIds.push(res.body.user.id)
  })

  it('rejects a request missing required fields with 400 (UC1-U1)', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set(ADMIN_HEADERS)
      .send({ username: 'incomplete-payload' }) // missing password/name/role

    expect(res.status).toBe(400)
  })

  it('rejects a student account with no date of birth with 422 (UC1-U2)', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set(ADMIN_HEADERS)
      .send({
        username: `test-student-${crypto.randomUUID()}`,
        password: 'Secret123',
        name: 'Test Student',
        role: 'student',
      })

    expect(res.status).toBe(422)
  })

  it('rejects a student account with an invalid (future) date of birth with 422', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set(ADMIN_HEADERS)
      .send({
        username: `test-student-${crypto.randomUUID()}`,
        password: 'Secret123',
        name: 'Test Student',
        role: 'student',
        dateOfBirth: '2999-01-01',
      })

    expect(res.status).toBe(422)
  })

  it('creates a student account with no password field at all', async () => {
    // Students don't log in via /api/auth/login (rejected outright there),
    // so password is optional for student creation — createUserWithRole
    // assigns them a random UUID password instead. Every other test in this
    // file sends a password for students anyway; this one actually omits it
    // to exercise that behavior for real.
    const username = `test-student-${crypto.randomUUID()}`
    const res = await request(app)
      .post('/api/admin/users')
      .set(ADMIN_HEADERS)
      .send({
        username,
        name: 'Passwordless Student',
        role: 'student',
        dateOfBirth: '2015-01-01',
      })

    expect(res.status).toBe(201)
    expect(res.body.user.username).toBe(username)
    createdUserIds.push(res.body.user.id)
  })

  it('rejects the request with 401 when unauthenticated (UC1-I4)', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .send({ username: 'no-auth', password: 'x', name: 'x', role: 'therapist' })

    expect(res.status).toBe(401)
  })

  it('rejects the request with 403 when authenticated as a non-admin role', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set({ 'X-User-Id': crypto.randomUUID(), 'X-User-Role': 'therapist' })
      .send({ username: 'not-admin', password: 'x', name: 'x', role: 'therapist' })

    expect(res.status).toBe(403)
  })
})

describe('GET /api/admin/users', () => {
  const createdUserIds: string[] = []

  afterAll(async () => {
    if (createdUserIds.length) {
      await pool.query('delete from users where id = any($1::uuid[])', [createdUserIds])
    }
  })

  it('includes date_of_birth and level for a student (LEFT JOIN coverage)', async () => {
    const username = `test-student-${crypto.randomUUID()}`
    const createRes = await request(app)
      .post('/api/admin/users')
      .set(ADMIN_HEADERS)
      .send({
        username,
        password: 'Secret123',
        name: 'Joined Fields Student',
        role: 'student',
        dateOfBirth: '2014-03-15',
        level: 'Primary 5',
      })
    createdUserIds.push(createRes.body.user.id)

    const res = await request(app).get('/api/admin/users').set(ADMIN_HEADERS)

    expect(res.status).toBe(200)
    const student = res.body.users.find((u: { username: string }) => u.username === username)
    expect(student).toBeDefined()
    expect(student.level).toBe('Primary 5')
    expect(student.date_of_birth).toBeTruthy()
  })

  it('rejects the request with 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/admin/users')

    expect(res.status).toBe(401)
  })
})

describe('POST /api/admin/assign-therapist and GET /api/admin/therapist/:id/students', () => {
  let therapistId: string
  let studentId: string
  const createdUserIds: string[] = []

  beforeAll(async () => {
    const therapistRes = await request(app)
      .post('/api/admin/users')
      .set(ADMIN_HEADERS)
      .send({
        username: `test-therapist-${crypto.randomUUID()}`,
        password: 'Secret123',
        name: 'Assign Therapist',
        role: 'therapist',
      })
    therapistId = therapistRes.body.user.id
    createdUserIds.push(therapistId)

    const studentRes = await request(app)
      .post('/api/admin/users')
      .set(ADMIN_HEADERS)
      .send({
        username: `test-student-${crypto.randomUUID()}`,
        password: 'Secret123',
        name: 'Assign Student',
        role: 'student',
        dateOfBirth: '2016-01-01',
        level: 'Primary 3',
      })
    studentId = studentRes.body.user.id
    createdUserIds.push(studentId)
  })

  afterAll(async () => {
    await pool.query('delete from users where id = any($1::uuid[])', [createdUserIds])
  })

  it('assigns a therapist to a student (UC1-I2)', async () => {
    const res = await request(app)
      .post('/api/admin/assign-therapist')
      .set(ADMIN_HEADERS)
      .send({ therapistId, studentId })

    expect(res.status).toBe(201)
    expect(res.body.alreadyAssigned).toBe(false)

    const { rows } = await pool.query(
      'select 1 from therapist_students where therapist_id = $1 and student_id = $2',
      [therapistId, studentId]
    )
    expect(rows).toHaveLength(1)
  })

  it('notifies when a therapist is already assigned to a student (UC1-I3)', async () => {
    const res = await request(app)
      .post('/api/admin/assign-therapist')
      .set(ADMIN_HEADERS)
      .send({ therapistId, studentId })

    expect(res.status).toBe(200)
    expect(res.body.alreadyAssigned).toBe(true)
    expect(res.body.message).toMatch(/already/i)
  })

  it("lets a therapist view their own assigned students", async () => {
    const res = await request(app)
      .get(`/api/admin/therapist/${therapistId}/students`)
      .set({ 'X-User-Id': therapistId, 'X-User-Role': 'therapist' })

    expect(res.status).toBe(200)
    expect(res.body.students.some((s: { id: string }) => s.id === studentId)).toBe(true)
  })

  it("forbids a therapist from viewing another therapist's students", async () => {
    const res = await request(app)
      .get(`/api/admin/therapist/${therapistId}/students`)
      .set({ 'X-User-Id': crypto.randomUUID(), 'X-User-Role': 'therapist' })

    expect(res.status).toBe(403)
  })

  it("lets an admin view any therapist's students", async () => {
    const res = await request(app)
      .get(`/api/admin/therapist/${therapistId}/students`)
      .set(ADMIN_HEADERS)

    expect(res.status).toBe(200)
  })
})

describe('role-based extension row on account creation (UC1-U4)', () => {
  const createdUserIds: string[] = []

  afterAll(async () => {
    if (createdUserIds.length) {
      await pool.query('delete from users where id = any($1::uuid[])', [createdUserIds])
    }
  })

  it('inserts a matching row in therapists when creating a therapist', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set(ADMIN_HEADERS)
      .send({
        username: `test-therapist-${crypto.randomUUID()}`,
        password: 'Secret123',
        name: 'Extension Row Therapist',
        role: 'therapist',
      })
    createdUserIds.push(res.body.user.id)

    const { rows } = await pool.query('select 1 from therapists where user_id = $1', [res.body.user.id])
    expect(rows).toHaveLength(1)
  })

  it('inserts a matching row in students when creating a student', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set(ADMIN_HEADERS)
      .send({
        username: `test-student-${crypto.randomUUID()}`,
        password: 'Secret123',
        name: 'Extension Row Student',
        role: 'student',
        dateOfBirth: '2015-06-01',
      })
    createdUserIds.push(res.body.user.id)

    const { rows } = await pool.query('select 1 from students where user_id = $1', [res.body.user.id])
    expect(rows).toHaveLength(1)
  })

  it('inserts a matching row in admins when creating an admin, not flagged as system admin', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set(ADMIN_HEADERS)
      .send({
        username: `test-admin-${crypto.randomUUID()}`,
        password: 'Secret123',
        name: 'Extension Row Admin',
        role: 'admin',
      })
    createdUserIds.push(res.body.user.id)

    const { rows } = await pool.query('select is_system_admin from admins where user_id = $1', [res.body.user.id])
    expect(rows).toHaveLength(1)
    expect(rows[0].is_system_admin).toBe(false)
  })
})

describe('POST /api/admin/reset-password (UC1-I5)', () => {
  let userId: string
  const createdUserIds: string[] = []

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set(ADMIN_HEADERS)
      .send({
        username: `test-reset-${crypto.randomUUID()}`,
        password: 'OriginalSecret123',
        name: 'Reset Target',
        role: 'therapist',
      })
    userId = res.body.user.id
    createdUserIds.push(userId)
  })

  afterAll(async () => {
    await pool.query('delete from users where id = any($1::uuid[])', [createdUserIds])
  })

  it("resets a user's password and the new password actually works", async () => {
    const res = await request(app)
      .post('/api/admin/reset-password')
      .set(ADMIN_HEADERS)
      .send({ userId, newPassword: 'BrandNewSecret456' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')

    const { rows } = await pool.query('select password_hash from users where id = $1', [userId])
    await expect(verifyPassword('BrandNewSecret456', rows[0].password_hash)).resolves.toBe(true)
    await expect(verifyPassword('OriginalSecret123', rows[0].password_hash)).resolves.toBe(false)
  })

  it('rejects a request missing userId or newPassword with 400', async () => {
    const res = await request(app)
      .post('/api/admin/reset-password')
      .set(ADMIN_HEADERS)
      .send({ userId })

    expect(res.status).toBe(400)
  })

  it('returns 404 for a non-existent userId', async () => {
    const res = await request(app)
      .post('/api/admin/reset-password')
      .set(ADMIN_HEADERS)
      .send({ userId: crypto.randomUUID(), newPassword: 'Whatever123' })

    expect(res.status).toBe(404)
  })

  it('rejects the request with 401 when unauthenticated', async () => {
    const res = await request(app)
      .post('/api/admin/reset-password')
      .send({ userId, newPassword: 'Whatever123' })

    expect(res.status).toBe(401)
  })

  it('rejects the request with 403 when authenticated as a non-admin role', async () => {
    const res = await request(app)
      .post('/api/admin/reset-password')
      .set({ 'X-User-Id': crypto.randomUUID(), 'X-User-Role': 'therapist' })
      .send({ userId, newPassword: 'Whatever123' })

    expect(res.status).toBe(403)
  })

  it('rejects resetting a student\'s password with 400 (students have no login access)', async () => {
    const studentRes = await request(app)
      .post('/api/admin/users')
      .set(ADMIN_HEADERS)
      .send({
        username: `test-student-${crypto.randomUUID()}`,
        name: 'Reset Target Student',
        role: 'student',
        dateOfBirth: '2015-01-01',
      })
    createdUserIds.push(studentRes.body.user.id)

    const res = await request(app)
      .post('/api/admin/reset-password')
      .set(ADMIN_HEADERS)
      .send({ userId: studentRes.body.user.id, newPassword: 'Whatever123' })

    expect(res.status).toBe(400)
  })

  it('rejects resetting the system administrator\'s password with 403', async () => {
    // Only server/src/db/seed.ts sets is_system_admin = true — POST
    // /api/admin/users can never produce this, so bootstrap it the same
    // way uc1-e2e.test.ts bootstraps its first admin: a direct insert.
    const systemAdminUsername = `test-system-admin-${crypto.randomUUID()}`
    const { rows } = await pool.query(
      `insert into users (username, password_hash, name, role)
       values ($1, 'x', 'System Admin Under Test', 'admin')
       returning id`,
      [systemAdminUsername]
    )
    const systemAdminId = rows[0].id
    createdUserIds.push(systemAdminId)
    await pool.query('insert into admins (user_id, is_system_admin) values ($1, true)', [systemAdminId])

    const res = await request(app)
      .post('/api/admin/reset-password')
      .set(ADMIN_HEADERS)
      .send({ userId: systemAdminId, newPassword: 'Whatever123' })

    expect(res.status).toBe(403)
  })
})
