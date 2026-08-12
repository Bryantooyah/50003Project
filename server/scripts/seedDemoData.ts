import crypto from 'crypto'

// Populates a small, realistic demo dataset purely over HTTP against a
// running backend (local or the deployed Render site) — no DB credentials
// needed. Fixed 'demo-' usernames + idempotency checks make this safe to
// re-run: existing accounts/assignments/samples are detected and skipped
// rather than duplicated.
//
// Usage:
//   SEED_TARGET_URL=http://localhost:3001 npm run seed:demo
//   SEED_TARGET_URL=https://dial-backend.onrender.com npm run seed:demo

const BASE_URL = process.env.SEED_TARGET_URL ?? 'http://localhost:3001'
const DEMO_PASSWORD = 'Demo1234!'
const HEADERS = {
  'X-User-Id': crypto.randomUUID(),
  'X-User-Role': 'admin',
  'Content-Type': 'application/json',
}

type ErrorCategory = 'phonological' | 'orthographic' | 'morphological' | 'grammar' | 'other'

type DetectedError = {
  id: string
  originalText: string
  suggestedCorrection: string
  category: ErrorCategory
  severity: 'low' | 'medium' | 'high'
  explanation: string
}

type LLMOutput = { issues: DetectedError[]; comments: string }

type AnalysisResult = {
  id: string
  studentId: string
  sampleText: string
  createdAt: string
  errors: DetectedError[]
  summary: Record<ErrorCategory, number>
}

const THERAPISTS = [
  { username: 'demo-therapist-1', name: 'Ms Tan Wei Ling' },
  { username: 'demo-therapist-2', name: 'Mr Lim Jun Hao' },
  { username: 'demo-therapist-3', name: 'Ms Nur Aisyah' },
  { username: 'demo-therapist-4', name: 'Mr Raj Kumar' },
]

const STUDENTS = [
  { username: 'demo-student-1', name: 'Ethan Koh', dateOfBirth: '2016-03-14', level: 'Primary 2' },
  { username: 'demo-student-2', name: 'Sofia Abdullah', dateOfBirth: '2015-07-22', level: 'Primary 3' },
  { username: 'demo-student-3', name: 'Marcus Ng', dateOfBirth: '2015-11-05', level: 'Primary 3' },
  { username: 'demo-student-4', name: 'Aria Lee', dateOfBirth: '2014-02-18', level: 'Primary 4' },
  { username: 'demo-student-5', name: 'Kai Wong', dateOfBirth: '2014-09-30', level: 'Primary 4' },
  { username: 'demo-student-6', name: 'Priya Sharma', dateOfBirth: '2014-05-12', level: 'Primary 4' },
  { username: 'demo-student-7', name: 'Daniel Teo', dateOfBirth: '2013-01-25', level: 'Primary 5' },
  { username: 'demo-student-8', name: 'Mei Lin Chua', dateOfBirth: '2013-08-09', level: 'Primary 5' },
  { username: 'demo-student-9', name: 'Aiden Goh', dateOfBirth: '2013-04-17', level: 'Primary 5' },
  { username: 'demo-student-10', name: 'Zara Ibrahim', dateOfBirth: '2016-06-21', level: 'Primary 2' },
  { username: 'demo-student-11', name: 'Ryan Ong', dateOfBirth: '2015-10-03', level: 'Primary 3' },
  { username: 'demo-student-12', name: 'Hana Yusof', dateOfBirth: '2014-12-28', level: 'Primary 4' },
]

// Each profile is the SAME piece of writing at 3 error tiers (high -> low),
// submitted in order per student, so the history view's consecutive-sample
// diff shows a real, coherent "improving over time" trend (UC5) instead of
// 3 unrelated random texts.
const PROFILES: [string, string, string][] = [
  [
    'I go to the shop becos I want to buy bred. My mum give me money and I run to the shop kwikly. We seen alot of nice things in the shop.',
    'I go to the shop because I want to buy bread. My mum give me money and I run to the shop quickly. We seen a lot of nice things in the shop.',
    'I went to the shop because I wanted to buy bread. My mum gave me money and I ran to the shop quickly. We saw a lot of nice things in the shop.',
  ],
  [
    'Yesterday me and my freind went to the beach. We seen alot of shells and we colect them in a bukit. It was verry fun and we play until it dark.',
    'Yesterday me and my friend went to the beach. We seen a lot of shells and we collect them in a bucket. It was very fun and we play until it dark.',
    'Yesterday my friend and I went to the beach. We saw a lot of shells and we collected them in a bucket. It was very fun and we played until it was dark.',
  ],
  [
    'The dog is verry big and he like to ran around the park. He bark alot when he see other dogs. My brother scare of him but I not scare.',
    'The dog is very big and he likes to run around the park. He bark a lot when he see other dogs. My brother scared of him but I am not scared.',
    'The dog is very big and he likes to run around the park. He barks a lot when he sees other dogs. My brother is scared of him but I am not scared.',
  ],
]

async function apiGet(path: string): Promise<{ status: number; data: any }> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: HEADERS })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

async function apiPost(path: string, body: unknown): Promise<{ status: number; data: any }> {
  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

function transformToAnalysisResult(studentId: string, sampleText: string, llm: LLMOutput): AnalysisResult {
  const errors = llm.issues ?? []
  const summary: Record<ErrorCategory, number> = {
    phonological: 0,
    orthographic: 0,
    morphological: 0,
    grammar: 0,
    other: 0,
  }
  for (const issue of errors) {
    if (issue.category in summary) summary[issue.category]++
  }
  return { id: crypto.randomUUID(), studentId, sampleText, createdAt: new Date().toISOString(), errors, summary }
}

async function getOrCreateUser(
  existingByUsername: Map<string, { id: string }>,
  payload: { username: string; password: string; name: string; role: string; dateOfBirth?: string; level?: string }
): Promise<{ id: string; created: boolean }> {
  const existing = existingByUsername.get(payload.username)
  if (existing) return { id: existing.id, created: false }

  const { status, data } = await apiPost('/api/admin/users', payload)
  if (status !== 201) {
    throw new Error(`Failed to create ${payload.username}: ${status} ${JSON.stringify(data)}`)
  }
  return { id: data.user.id, created: true }
}

async function main() {
  console.log(`Seeding demo data against ${BASE_URL} ...`)

  const { status: usersStatus, data: usersData } = await apiGet('/api/admin/users')
  if (usersStatus !== 200) {
    throw new Error(`Failed to fetch existing users (${usersStatus}): ${JSON.stringify(usersData)}`)
  }
  const existingByUsername = new Map<string, { id: string }>(
    (usersData.users ?? []).map((u: { username: string; id: string }) => [u.username, u])
  )

  let createdCount = 0
  let reusedCount = 0

  const therapistIds: string[] = []
  for (const t of THERAPISTS) {
    const { id, created } = await getOrCreateUser(existingByUsername, {
      username: t.username,
      password: DEMO_PASSWORD,
      name: t.name,
      role: 'therapist',
    })
    therapistIds.push(id)
    created ? createdCount++ : reusedCount++
  }

  const studentIds: string[] = []
  for (const s of STUDENTS) {
    const { id, created } = await getOrCreateUser(existingByUsername, {
      username: s.username,
      password: DEMO_PASSWORD,
      name: s.name,
      role: 'student',
      dateOfBirth: s.dateOfBirth,
      level: s.level,
    })
    studentIds.push(id)
    created ? createdCount++ : reusedCount++
  }
  console.log(`Accounts: ${createdCount} created, ${reusedCount} already existed.`)

  // 3 students per therapist
  let assignmentCount = 0
  for (let i = 0; i < therapistIds.length; i++) {
    const therapistId = therapistIds[i]
    const studentsForThisTherapist = studentIds.slice(i * 3, i * 3 + 3)
    for (const studentId of studentsForThisTherapist) {
      const { status, data } = await apiPost('/api/admin/assign-therapist', { therapistId, studentId })
      if (status === 201 || (status === 200 && data.alreadyAssigned)) {
        assignmentCount++
      } else {
        console.warn(`Unexpected assignment result (therapist ${therapistId} / student ${studentId}): ${status}`, data)
      }
    }
  }
  console.log(`Assignments: ${assignmentCount} confirmed.`)

  // Top up each student to 3 saved samples, through the real analyse ->
  // recommend -> save pipeline. TherapistWorkflow.tsx gates "longitudinal
  // progress tracking" on >= 3 saved analyses per student, and the history
  // route's improvement ranking needs >= 2 to compute any delta at all —
  // so 1 sample (v1's seed) wasn't enough to light up either feature.
  // Idempotent: counts existing samples and only submits the remainder,
  // so re-running (or topping up students already at 1 from v1) never
  // duplicates and never resubmits a student already at 3.
  let sampleCount = 0
  let skippedCount = 0
  const perStudentCounts: string[] = []
  for (let i = 0; i < studentIds.length; i++) {
    const studentId = studentIds[i]
    const therapistId = therapistIds[Math.floor(i / 3)]
    const profile = PROFILES[i % PROFILES.length]

    const { status: existingStatus, data: existingSamples } = await apiGet(`/api/history/getanalysis/${studentId}`)
    const existingCount = existingStatus === 200 && Array.isArray(existingSamples) ? existingSamples.length : 0

    if (existingCount >= 3) {
      skippedCount++
      perStudentCounts.push(`${STUDENTS[i].username}: 3 (already had 3)`)
      continue
    }

    let savedForThisStudent = existingCount
    for (const sampleText of profile.slice(existingCount)) {
      const { status: analyseStatus, data: llmOutput } = await apiPost('/api/analyse', { text: sampleText })
      if (analyseStatus !== 200) {
        console.warn(`Analyse failed for student ${studentId}: ${analyseStatus}`, llmOutput)
        continue
      }

      const analysis = transformToAnalysisResult(studentId, sampleText, llmOutput as LLMOutput)

      const { status: recStatus, data: recData } = await apiPost('/api/recommendations/generate', { analysis })
      const recommendations = recStatus === 200 && recData.status === 'ok' ? recData.recommendations : []

      const { status: saveStatus } = await apiPost('/api/history/save', {
        therapistId,
        analysis,
        recommendations,
        feedback: '',
      })

      if (saveStatus === 200) {
        sampleCount++
        savedForThisStudent++
      } else {
        console.warn(`Save failed for student ${studentId}: ${saveStatus}`)
      }
    }
    perStudentCounts.push(`${STUDENTS[i].username}: ${savedForThisStudent}`)
  }
  console.log(`Writing samples: ${sampleCount} newly saved, ${skippedCount} students already had 3.`)
  console.log(perStudentCounts.join(', '))

  console.log('\nDone. Demo login credentials (same password for every demo account):')
  console.log(`  Password: ${DEMO_PASSWORD}`)
  console.log(`  Therapists: ${THERAPISTS.map((t) => t.username).join(', ')}`)
  console.log('  (Students never log in directly — no use logging in as one.)')
}

main().catch((err) => {
  console.error('Demo seed failed:', err)
  process.exit(1)
})
