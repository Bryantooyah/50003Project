import crypto from 'crypto'
import request from 'supertest'
import app from '../index'
import { pool } from '../db'
import { hashPassword } from '../utils/password'

// Automates UC1- End to End Test

afterAll(async () => {
  await pool.end()
})

describe('UC1-E2E1: admin login -> create accounts -> assign -> therapist login -> scoped view', () => {
  const createdUserIds: string[] = []
  let adminUsername: string
  const adminPassword = 'AdminSecret123'

  beforeAll(async () => {
    // Bootstrap: there's no other way to get the first admin account, same
    // reasoning server/src/db/seed.ts already uses. This intentionally does
    // NOT go through the frontend's "Continue as Admin Demo" button — that's
    // pure client-side React state (client/src/App.tsx's handleDemoAdminLogin)
    // and never calls the backend at all, so there's nothing for a backend
    // test to exercise there either way.
    adminUsername = `test-admin-${crypto.randomUUID()}`
    const passwordHash = await hashPassword(adminPassword)
    const { rows } = await pool.query(
      `insert into users (username, password_hash, name, role)
       values ($1, $2, $3, 'admin')
       returning id`,
      [adminUsername, passwordHash, 'E2E Admin']
    )
    createdUserIds.push(rows[0].id)
  })

  afterAll(async () => {
    if (createdUserIds.length) {
      await pool.query('delete from users where id = any($1::uuid[])', [createdUserIds])
    }
  })

  it('runs the full UC1 workflow end-to-end', async () => {
    // 1. Admin logs in for real.
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: adminUsername, password: adminPassword })

    expect(adminLogin.status).toBe(200)
    expect(adminLogin.body.user.role).toBe('admin')
    const adminHeaders = {
      'X-User-Id': adminLogin.body.user.id,
      'X-User-Role': adminLogin.body.user.role,
    }

    // 2. Admin creates a therapist account.
    const therapistUsername = `test-therapist-${crypto.randomUUID()}`
    const therapistPassword = 'TherapistSecret123'
    const therapistRes = await request(app)
      .post('/api/admin/users')
      .set(adminHeaders)
      .send({
        username: therapistUsername,
        password: therapistPassword,
        name: 'E2E Therapist',
        role: 'therapist',
      })
    expect(therapistRes.status).toBe(201)
    const therapistId = therapistRes.body.user.id
    createdUserIds.push(therapistId)

    // A second, unrelated therapist to prove scoping actually excludes them.
    const otherTherapistRes = await request(app)
      .post('/api/admin/users')
      .set(adminHeaders)
      .send({
        username: `test-therapist-${crypto.randomUUID()}`,
        password: 'Secret123',
        name: 'E2E Other Therapist',
        role: 'therapist',
      })
    const otherTherapistId = otherTherapistRes.body.user.id
    createdUserIds.push(otherTherapistId)

    // 3. Admin creates a student account.
    const studentRes = await request(app)
      .post('/api/admin/users')
      .set(adminHeaders)
      .send({
        username: `test-student-${crypto.randomUUID()}`,
        password: 'Secret123',
        name: 'E2E Student',
        role: 'student',
        dateOfBirth: '2016-01-01',
        level: 'Primary 3',
      })
    expect(studentRes.status).toBe(201)
    const studentId = studentRes.body.user.id
    createdUserIds.push(studentId)

    // 4. Admin assigns the therapist to the student.
    const assignRes = await request(app)
      .post('/api/admin/assign-therapist')
      .set(adminHeaders)
      .send({ therapistId, studentId })
    expect(assignRes.status).toBe(201)

    // 5. The newly-created therapist logs in for real, with the password
    // set when their account was created — proves it isn't just the seed
    // fixture that can authenticate.
    const therapistLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: therapistUsername, password: therapistPassword })

    expect(therapistLogin.status).toBe(200)
    expect(therapistLogin.body.user.id).toBe(therapistId)
    const therapistHeaders = {
      'X-User-Id': therapistLogin.body.user.id,
      'X-User-Role': therapistLogin.body.user.role,
    }

    // 6. Assignment is reflected: the therapist sees only their assigned student.
    const studentsRes = await request(app)
      .get(`/api/admin/therapist/${therapistId}/students`)
      .set(therapistHeaders)

    expect(studentsRes.status).toBe(200)
    expect(studentsRes.body.students).toHaveLength(1)
    expect(studentsRes.body.students[0].id).toBe(studentId)

    // The unrelated therapist, who was never assigned anyone, sees nothing.
    const otherStudentsRes = await request(app)
      .get(`/api/admin/therapist/${otherTherapistId}/students`)
      .set({ 'X-User-Id': otherTherapistId, 'X-User-Role': 'therapist' })

    expect(otherStudentsRes.status).toBe(200)
    expect(otherStudentsRes.body.students).toHaveLength(0)
  })

  it('rejects login with the wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: adminUsername, password: 'wrong-password' })

    expect(res.status).toBe(401)
  })
})
