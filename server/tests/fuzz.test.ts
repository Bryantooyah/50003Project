import crypto from 'crypto'
import fc from 'fast-check'
import request from 'supertest'
import app from '../src/index'
import { pool } from '../src/db'
import { hashPassword, verifyPassword } from '../src/utils/password'
import { applyRuleBasedFilters } from '../src/services/recommendationEngine'
import {
  fuzzedUserPayload,
  fuzzedLoginPayload,
  fuzzedResetPasswordPayload,
  fuzzedAnalysisResult,
} from './fuzzArbitraries'

// Robustness testing (course rubric): property-based fuzzing with fast-check.
// Fast/deterministic-ish, runs inside `npm test` — the long-running (up to
// 24h) HTTP harness lives separately at server/scripts/fuzz.ts and reuses
// the same arbitraries from ./fuzzArbitraries.

const ADMIN_HEADERS = { 'X-User-Id': crypto.randomUUID(), 'X-User-Role': 'admin' }

afterAll(async () => {
  await pool.end()
})

describe('fuzz: hashPassword/verifyPassword round-trip', () => {
  it('verifyPassword always accepts the exact password it was hashed from', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 200 }), async (pw) => {
        const hash = await hashPassword(pw)
        expect(await verifyPassword(pw, hash)).toBe(true)
      }),
      { numRuns: 50 }
    )
  }, 30000)

  it('bcrypt truncates input at 72 bytes, so two passwords sharing that prefix verify as equal (documented finding, not a bug to fix)', async () => {
    const base = 'a'.repeat(72)
    const hash = await hashPassword(base + 'suffix-one')
    await expect(verifyPassword(base + 'suffix-two-completely-different', hash)).resolves.toBe(true)
  })
})

describe('fuzz: applyRuleBasedFilters (recommendationEngine.ts)', () => {
  it('handles arbitrary error arrays, including invalid categories/severities, without throwing', () => {
    fc.assert(
      fc.property(fuzzedAnalysisResult(), (analysis) => {
        expect(() => applyRuleBasedFilters(analysis as any)).not.toThrow()
      }),
      { numRuns: 200 }
    )
  })

  it('returned counts always sum to errors.length', () => {
    fc.assert(
      fc.property(fuzzedAnalysisResult(), (analysis) => {
        const filtered = applyRuleBasedFilters(analysis as any)
        const total = filtered.reduce((sum, f) => sum + f.count, 0)
        expect(total).toBe(analysis.errors.length)
      }),
      { numRuns: 200 }
    )
  })

  it('throws when errors is missing or not an array — a real crash surface fuzzing found: AnalysisResult is a compile-time-only TS type with no runtime validation (documented finding, not fixed here)', () => {
    expect(() => applyRuleBasedFilters({} as any)).toThrow()
    expect(() => applyRuleBasedFilters({ errors: 'not-an-array' } as any)).toThrow()
  })
})

describe('fuzz: POST /api/admin/users never crashes on malformed input', () => {
  const createdUserIds: string[] = []

  afterAll(async () => {
    if (createdUserIds.length) {
      await pool.query('delete from users where id = any($1::uuid[])', [createdUserIds])
    }
  })

  it('always responds 201/400/422 with a valid JSON body, never 500', async () => {
    await fc.assert(
      fc.asyncProperty(fuzzedUserPayload(), async (payload) => {
        const res = await request(app).post('/api/admin/users').set(ADMIN_HEADERS).send(payload as any)
        expect([201, 400, 422]).toContain(res.status)
        if (res.status === 201) createdUserIds.push(res.body.user.id)
      }),
      { numRuns: 100 }
    )
  }, 60000)
})

describe('fuzz: POST /api/auth/login never crashes and never leaks whether a username exists', () => {
  it('always responds 400/401, never 500, with the same generic error message', async () => {
    await fc.assert(
      fc.asyncProperty(fuzzedLoginPayload(), async (payload) => {
        const res = await request(app).post('/api/auth/login').send(payload as any)
        expect([400, 401]).toContain(res.status)
        if (res.status === 401) {
          expect(res.body.error).toBe('Invalid username or password')
        }
      }),
      { numRuns: 100 }
    )
  }, 60000)
})

describe('fuzz: POST /api/admin/reset-password with malformed userId', () => {
  let realUserId: string
  const createdUserIds: string[] = []

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set(ADMIN_HEADERS)
      .send({
        username: `fuzz-reset-target-${crypto.randomUUID()}`,
        password: 'Secret123',
        name: 'Fuzz Reset Target',
        role: 'therapist',
      })
    realUserId = res.body.user.id
    createdUserIds.push(realUserId)
  })

  afterAll(async () => {
    await pool.query('delete from users where id = any($1::uuid[])', [createdUserIds])
  })

  it('never returns 5xx even for non-UUID userId values', async () => {
    const rawDbErrorLeaks: unknown[] = []

    await fc.assert(
      fc.asyncProperty(fuzzedResetPasswordPayload(realUserId), async (payload) => {
        const res = await request(app).post('/api/admin/reset-password').set(ADMIN_HEADERS).send(payload as any)
        expect(res.status).toBeLessThan(500)
        if (res.status === 400 && typeof res.body?.error === 'string' && /invalid input syntax/i.test(res.body.error)) {
          rawDbErrorLeaks.push({ userId: (payload as any).userId, error: res.body.error })
        }
      }),
      { numRuns: 100 }
    )

    // Known, non-fatal finding: a malformed (non-UUID) userId reaches
    // getUserRole's Postgres query before any format check, so Postgres's
    // raw "invalid input syntax for type uuid" error text ends up in the
    // 400 response body (server/src/routes/admin.ts's catch block returns
    // err.message verbatim). Logged for the report, not asserted against —
    // this is a minor info-disclosure quality issue, not a crash.
    if (rawDbErrorLeaks.length) {
      console.warn(`fuzz finding: ${rawDbErrorLeaks.length}/100 malformed-userId requests leaked a raw Postgres error message`, rawDbErrorLeaks.slice(0, 2))
    }
  }, 60000)
})
