import fc from 'fast-check'

// Not matched by jest's testMatch (**/tests/**/*.test.ts) — a shared helper,
// not a test suite itself. Reused by both fuzz.test.ts (fast, Jest-run) and
// scripts/fuzz.ts (long-running harness) so the two don't drift apart.

// A deliberately hostile value for any field: wrong types, extremes, empty,
// missing. Mixing this into every field via fc.oneof turns a "valid-shaped"
// generator into a structure-aware fuzzer — most iterations are close to a
// real payload with one or two fields mutated, which finds more than fully
// random garbage does.
export const wildValue = () =>
  fc.oneof(
    fc.integer(),
    fc.boolean(),
    fc.constant(null),
    fc.constant(undefined),
    fc.constant(''),
    fc.array(fc.string(), { maxLength: 5 }),
    fc.object(),
    fc.string({ minLength: 1000, maxLength: 5000 }),
    fc.string({ unit: 'grapheme' })
  )

export const fuzzedUserPayload = () =>
  fc.record(
    {
      // "fuzz-" prefix on the well-formed branch keeps fuzz-created rows
      // visually recognizable in the DB; scripts/fuzz.ts additionally
      // tracks every created id in-memory as the authoritative cleanup
      // list, since the wildValue() branch can still produce an
      // unprefixed string.
      username: fc.oneof(fc.string({ minLength: 1 }).map((s) => `fuzz-${s}`), wildValue()),
      password: fc.oneof(fc.string(), wildValue()),
      name: fc.oneof(fc.string(), wildValue()),
      role: fc.oneof(fc.constantFrom('student', 'therapist', 'admin'), wildValue()),
      dateOfBirth: fc.oneof(
        fc.date({ min: new Date('1950-01-01'), max: new Date('2030-01-01') }).map((d) => d.toISOString().slice(0, 10)),
        fc.constantFrom('not-a-date', '9999-99-99', '2999-01-01', ''),
        wildValue()
      ),
      level: fc.oneof(fc.string(), wildValue()),
    },
    { requiredKeys: [] }
  )

export const fuzzedLoginPayload = () =>
  fc.record(
    {
      username: fc.oneof(
        fc.string(),
        fc.constantFrom(`' OR '1'='1`, `; DROP TABLE users;--`, `admin' --`),
        wildValue()
      ),
      password: fc.oneof(fc.string(), wildValue()),
    },
    { requiredKeys: [] }
  )

export const fuzzedResetPasswordPayload = (knownUserId?: string) =>
  fc.record(
    {
      userId: fc.oneof(
        fc.uuid(),
        ...(knownUserId ? [fc.constant(knownUserId)] : []),
        fc.constantFrom('00000000-0000-0000-0000-000000000000', 'not-a-uuid'),
        wildValue()
      ),
      newPassword: fc.oneof(fc.string(), wildValue()),
    },
    { requiredKeys: [] }
  )

export const fuzzedAssignTherapistPayload = (knownTherapistId?: string, knownStudentId?: string) =>
  fc.record(
    {
      therapistId: fc.oneof(
        fc.uuid(),
        ...(knownTherapistId ? [fc.constant(knownTherapistId)] : []),
        wildValue()
      ),
      studentId: fc.oneof(fc.uuid(), ...(knownStudentId ? [fc.constant(knownStudentId)] : []), wildValue()),
    },
    { requiredKeys: [] }
  )

export const fuzzedDetectedError = () =>
  fc.record({
    id: fc.string(),
    originalText: fc.string(),
    suggestedCorrection: fc.string(),
    category: fc.oneof(fc.constantFrom('phonological', 'orthographic', 'morphological', 'grammar', 'other'), fc.string()),
    severity: fc.oneof(fc.constantFrom('low', 'medium', 'high'), fc.string()),
    explanation: fc.string(),
  })

export const fuzzedAnalysisResult = () =>
  fc.record({
    id: fc.string(),
    studentId: fc.string(),
    sampleText: fc.string(),
    createdAt: fc.string(),
    errors: fc.array(fuzzedDetectedError(), { maxLength: 50 }),
    summary: fc.dictionary(fc.string(), fc.integer()),
  })
