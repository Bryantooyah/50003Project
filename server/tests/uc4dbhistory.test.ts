import {
  saveWritingSample,
  saveTherapistNote,
  getWritingSamples,
  getTherapistNotes,
  getCohortAverages,
  getWritingSamples2,
} from '../src/db/history'
import { pool } from '../src/db/index'

jest.mock('../src/db/index', () => ({
  pool: {
    query: jest.fn(),
  },
}))

const mockPoolQuery = (pool.query as jest.Mock)

beforeEach(() => {
  jest.clearAllMocks()
})

describe('DB: history.ts - getWritingSamples2', () => {
  it('queries the database with correct parameterized SQL and returns rows', async () => {
    const studentId = 'c3f11db7-f989-4f30-88aa-b6708e5a3520'
    const mockRows = [
      { id: 'sample-1', student_id: studentId, sample_text: 'Yesterday I go to the park...', ai_analysis: { score: 85 } },
      { id: 'sample-2', student_id: studentId, sample_text: 'My big brother is playin...', ai_analysis: { score: 90 } },
    ]

    mockPoolQuery.mockResolvedValue({ rows: mockRows })

    const result = await getWritingSamples2(studentId)

    expect(mockPoolQuery).toHaveBeenCalledTimes(1)
    expect(mockPoolQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT *'), [studentId])
    expect(result).toEqual(mockRows)
  })

  it('returns an empty array when no records match the studentId', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [] })

    const result = await getWritingSamples2('non-existent-id')

    expect(mockPoolQuery).toHaveBeenCalledTimes(1)
    expect(result).toEqual([])
  })

  it('propagates errors if the database query fails', async () => {
    const dbError = new Error('Database connection failed')
    mockPoolQuery.mockRejectedValue(dbError)

    await expect(getWritingSamples2('c3f11db7-f989-4f30-88aa-b6708e5a3520')).rejects.toThrow('Database connection failed')
  })
})

describe('DB: history.ts - saveWritingSample', () => {
  it('inserts a writing sample and returns the saved row', async () => {
    const studentId = 'stu-001'
    const therapistId = 'th-001'
    const sampleText = 'Yesterday I go to the park.'
    const analysis = { id: 'a1', studentId, sampleText, errors: [], summary: { phonological: 0, orthographic: 0, morphological: 0, grammar: 0, other: 0 }, createdAt: '2026-01-01T00:00:00Z' }
    const recommendations = [{ id: 'r1', title: 'Practice phonics', targetCategory: 'phonological' as const, rationale: '', activity: '', priority: 'low' as const, status: 'pending' as const }]
    const feedback = 'Good effort.'

    const savedRow = { id: 'ws-1', student_id: studentId, submitted_by: therapistId, sample_text: sampleText, ai_analysis: analysis, recommendations, therapist_feedback: feedback, created_at: '2026-01-01T00:00:00Z' }
    mockPoolQuery.mockResolvedValue({ rows: [savedRow] })

    const result = await saveWritingSample(therapistId, studentId, sampleText, analysis, recommendations, feedback)

    expect(mockPoolQuery).toHaveBeenCalledTimes(1)
    expect(mockPoolQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO writing_samples'),
      [studentId, therapistId, sampleText, JSON.stringify(analysis), JSON.stringify(recommendations), feedback]
    )
    expect(result).toEqual(savedRow)
  })

  it('returns undefined when the insert returns no rows', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [] })

    const result = await saveWritingSample('th', 'stu', 'text', { id: 'a', studentId: 'stu', sampleText: 'text', errors: [], summary: { phonological: 0, orthographic: 0, morphological: 0, grammar: 0, other: 0 }, createdAt: '2026-01-01T00:00:00Z' }, [], '')

    expect(result).toBeUndefined()
  })
})

describe('DB: history.ts - saveTherapistNote', () => {
  it('inserts a therapist note and returns the saved row', async () => {
    const noteRow = { id: 'tn-1', student_id: 'stu-001', therapist_id: 'th-001', note: 'Student showed improvement.' }
    mockPoolQuery.mockResolvedValue({ rows: [noteRow] })

    const result = await saveTherapistNote('stu-001', 'th-001', 'Student showed improvement.')

    expect(mockPoolQuery).toHaveBeenCalledTimes(1)
    expect(mockPoolQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO therapist_notes'),
      ['stu-001', 'th-001', 'Student showed improvement.']
    )
    expect(result).toEqual(noteRow)
  })

  it('returns undefined when the insert returns no rows', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [] })

    const result = await saveTherapistNote('stu-001', 'th-001', 'Note text')

    expect(result).toBeUndefined()
  })
})

describe('DB: history.ts - getWritingSamples', () => {
  it('returns an array of writing samples for a student', async () => {
    const mockRows = [
      { id: 'ws-1', student_id: 'stu-001', submitted_by: 'th-001', sampleText: 'Hello world', analysis: { id: 'a1', studentId: 'stu-001', sampleText: 'Hello world', errors: [], summary: { phonological: 0, orthographic: 0, morphological: 0, grammar: 0, other: 0 }, createdAt: '2026-01-01T00:00:00Z' }, recommendations: [], therapistFeedback: '', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    ]
    mockPoolQuery.mockResolvedValue({ rows: mockRows })

    const result = await getWritingSamples('stu-001')

    expect(mockPoolQuery).toHaveBeenCalledTimes(1)
    expect(mockPoolQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT id, student_id'), ['stu-001'])
    expect(result).toEqual(mockRows)
  })

  it('returns an empty array when no samples exist for the student', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [] })

    const result = await getWritingSamples('unknown-student')

    expect(result).toEqual([])
  })
})

describe('DB: history.ts - getTherapistNotes', () => {
  it('returns an array of therapist notes for a student', async () => {
    const mockRows = [
      { therapistId: 'th-001', note: 'Good progress.' },
      { therapistId: 'th-002', note: 'Needs more practice.' },
    ]
    mockPoolQuery.mockResolvedValue({ rows: mockRows })

    const result = await getTherapistNotes('stu-001')

    expect(mockPoolQuery).toHaveBeenCalledTimes(1)
    expect(mockPoolQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT therapist_id'), ['stu-001'])
    expect(result).toEqual(mockRows)
  })

  it('returns an empty array when no notes exist', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [] })

    const result = await getTherapistNotes('unknown-student')

    expect(result).toEqual([])
  })
})

describe('DB: history.ts - getCohortAverages', () => {
  it('returns zero counts when no samples exist', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [] })

    const result = await getCohortAverages()

    expect(result).toEqual({
      phonological: 0,
      orthographic: 0,
      morphological: 0,
      grammar: 0,
      other: 0,
    })
    expect(mockPoolQuery).toHaveBeenCalledTimes(1)
  })

  it('returns averaged counts across all samples', async () => {
    const mockRows = [
      { ai_analysis: { summary: { phonological: 10, orthographic: 5, morphological: 2, grammar: 3, other: 1 } } },
      { ai_analysis: { summary: { phonological: 8, orthographic: 4, morphological: 3, grammar: 2, other: 0 } } },
    ]
    mockPoolQuery.mockResolvedValue({ rows: mockRows })

    const result = await getCohortAverages()

    expect(result.phonological).toBe(9)   // (10+8)/2
    expect(result.orthographic).toBe(4.5) // (5+4)/2
    expect(result.morphological).toBe(2.5) // (2+3)/2
    expect(result.grammar).toBe(2.5)      // (3+2)/2
    expect(result.other).toBe(0.5)        // (1+0)/2
  })

  it('handles rows with missing or null summary gracefully', async () => {
    const mockRows = [
      { ai_analysis: null },
      { ai_analysis: { summary: {} } },
      { ai_analysis: { summary: { phonological: 2 } } },
    ]
    mockPoolQuery.mockResolvedValue({ rows: mockRows })

    const result = await getCohortAverages()

    expect(result.phonological).toBeCloseTo(0.7, 0)
    expect(result.orthographic).toBe(0)
  })

  it('propagates database errors', async () => {
    mockPoolQuery.mockRejectedValue(new Error('DB down'))

    await expect(getCohortAverages()).rejects.toThrow('DB down')
  })
})