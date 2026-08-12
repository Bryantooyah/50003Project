import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import fc from 'fast-check'
import request from 'supertest'
import app from '../src/index'
import { pool } from '../src/db'
import {
  fuzzedUserPayload,
  fuzzedLoginPayload,
  fuzzedResetPasswordPayload,
  fuzzedAssignTherapistPayload,
} from '../tests/fuzzArbitraries'

// Long-running HTTP fuzz harness (course rubric: robustness testing via a
// fuzzer able to "run over a very long period, e.g. 24 hours"). Not a Jest
// test — run directly: `npm run fuzz -- --duration=<seconds>`.
//
// Deliberately excludes /api/analyse and /api/ocr — both call the real
// OpenAI API, which is unaffordable/rate-limited over a multi-hour run.
// Those two get fuzzed instead inside tests/fuzz.test.ts, where the OpenAI
// client is mocked the same way tests/analyse.test.ts already does it.
//
// ALWAYS runs against the local DATABASE_URL (same dotenv setup as `npm
// run dev`/`npm test`) — never point this at the deployed Render database.

const ADMIN_HEADERS = { 'X-User-Id': crypto.randomUUID(), 'X-User-Role': 'admin' }
const FINDINGS_PATH = path.join(__dirname, 'fuzz-findings.jsonl')
const SLOW_THRESHOLD_MS = 5000

function parseArgs() {
  const args = process.argv.slice(2)
  const durationArg = args.find((a) => a.startsWith('--duration='))
  const cleanupOnly = args.includes('--cleanup-only')
  const parsed = durationArg ? Number(durationArg.split('=')[1]) : 30
  const durationSeconds = Number.isFinite(parsed) && parsed > 0 ? parsed : 30
  return { durationSeconds, cleanupOnly }
}

async function cleanup(createdIds: Set<string>): Promise<number> {
  const ids = [...createdIds]
  if (ids.length) {
    await pool.query('delete from users where id = any($1::uuid[])', [ids])
  }
  // Safety net for a prior interrupted run: anything still around with the
  // recognizable 'fuzz-' username prefix, even if this process never
  // tracked its id in-memory.
  const leftover = await pool.query(`delete from users where username like 'fuzz-%' returning id`)
  return ids.length + leftover.rowCount!
}

function logFinding(entry: Record<string, unknown>) {
  fs.appendFileSync(FINDINGS_PATH, JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + '\n')
}

async function main() {
  const { durationSeconds, cleanupOnly } = parseArgs()
  const createdIds = new Set<string>()

  if (cleanupOnly) {
    const removed = await cleanup(createdIds)
    console.log(`Cleanup only: removed ${removed} fuzz-created row(s).`)
    await pool.end()
    return
  }

  console.log(`Starting HTTP fuzz run for ${durationSeconds}s against the local DB (${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')})...`)

  // Seed fixtures so reset-password / assign-therapist sometimes mutate a
  // real id rather than only ever hitting fully-random UUIDs.
  const seedTherapist = await request(app)
    .post('/api/admin/users')
    .set(ADMIN_HEADERS)
    .send({ username: `fuzz-seed-therapist-${crypto.randomUUID()}`, password: 'Secret123', name: 'Fuzz Seed Therapist', role: 'therapist' })
  const seedStudent = await request(app)
    .post('/api/admin/users')
    .set(ADMIN_HEADERS)
    .send({
      username: `fuzz-seed-student-${crypto.randomUUID()}`,
      password: 'Secret123',
      name: 'Fuzz Seed Student',
      role: 'student',
      dateOfBirth: '2015-01-01',
    })
  const therapistId: string | undefined = seedTherapist.body?.user?.id
  const studentId: string | undefined = seedStudent.body?.user?.id
  if (therapistId) createdIds.add(therapistId)
  if (studentId) createdIds.add(studentId)

  type Target = { name: string; run: () => Promise<{ status: number; body: any }> }

  const targets: Target[] = [
    {
      name: 'POST /api/admin/users',
      run: async () => {
        const payload = fc.sample(fuzzedUserPayload(), 1)[0]
        const res = await request(app).post('/api/admin/users').set(ADMIN_HEADERS).send(payload as any)
        if (res.status === 201 && res.body?.user?.id) createdIds.add(res.body.user.id)
        return res
      },
    },
    {
      name: 'POST /api/admin/assign-therapist',
      run: async () => {
        const payload = fc.sample(fuzzedAssignTherapistPayload(therapistId, studentId), 1)[0]
        return request(app).post('/api/admin/assign-therapist').set(ADMIN_HEADERS).send(payload as any)
      },
    },
    {
      name: 'POST /api/admin/reset-password',
      run: async () => {
        const payload = fc.sample(fuzzedResetPasswordPayload(therapistId), 1)[0]
        return request(app).post('/api/admin/reset-password').set(ADMIN_HEADERS).send(payload as any)
      },
    },
    { name: 'GET /api/admin/users', run: async () => request(app).get('/api/admin/users').set(ADMIN_HEADERS) },
    { name: 'GET /api/admin/assignments', run: async () => request(app).get('/api/admin/assignments').set(ADMIN_HEADERS) },
    {
      name: 'POST /api/auth/login',
      run: async () => {
        const payload = fc.sample(fuzzedLoginPayload(), 1)[0]
        return request(app).post('/api/auth/login').send(payload as any)
      },
    },
    { name: 'GET /api/health', run: async () => request(app).get('/api/health') },
  ]

  const deadline = Date.now() + durationSeconds * 1000
  let total = 0
  let findings = 0
  let shuttingDown = false

  const shutdown = async () => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`\nInterrupted after ${total} requests (${findings} findings). Cleaning up...`)
    const removed = await cleanup(createdIds)
    console.log(`Removed ${removed} fuzz-created row(s).`)
    await pool.end()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  while (Date.now() < deadline && !shuttingDown) {
    const target = targets[Math.floor(Math.random() * targets.length)]
    const start = Date.now()
    try {
      const res = await target.run()
      const durationMs = Date.now() - start
      total++
      if (res.status >= 500 || durationMs > SLOW_THRESHOLD_MS) {
        findings++
        logFinding({ target: target.name, status: res.status, durationMs, body: res.body })
      }
    } catch (err: any) {
      total++
      findings++
      logFinding({ target: target.name, status: 'THROWN', error: err?.message, stack: err?.stack })
    }
    if (total % 200 === 0) {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000))
      console.log(`${total} requests sent, ${findings} finding(s) so far, ~${remaining}s remaining...`)
    }
  }

  if (!shuttingDown) {
    console.log(`\nDone: ${total} requests sent, ${findings} finding(s). See ${FINDINGS_PATH} for details.`)
    const removed = await cleanup(createdIds)
    console.log(`Cleaned up ${removed} fuzz-created row(s).`)
    await pool.end()
  }
}

main().catch(async (err) => {
  console.error('Fuzz harness crashed:', err)
  await pool.end()
  process.exit(1)
})
