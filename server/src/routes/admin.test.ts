import crypto from 'crypto'
import request from 'supertest'
import app from '../index'
import { pool } from '../db'

// Test case for UC1 I1 - I4 + U1 & U2
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

  it('inserts a matching row in admins when creating an admin', async () => {
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

    const { rows } = await pool.query('select 1 from admins where user_id = $1', [res.body.user.id])
    expect(rows).toHaveLength(1)
  })
})
