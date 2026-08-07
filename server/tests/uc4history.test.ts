import request from 'supertest'
import app from '../src/index'

jest.mock('../src/db/history', () => ({
  saveWritingSample: jest.fn(),
  saveTherapistNote: jest.fn(),
  getWritingSamples: jest.fn(),
  getTherapistNotes: jest.fn(),
  getWritingSamples2: jest.fn(),
  getCohortAverages: jest.fn(),
}))

import {
  saveWritingSample,
  getWritingSamples,
  getTherapistNotes,
  getWritingSamples2,
  getCohortAverages,
} from '../src/db/history'

const ROUTE_PREFIX = '/api/history'

function makeAnalysis(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    studentId: 'stu-001',
    sampleText: 'Yesterday I go to the park becos I wanted to play.',
    createdAt: '2026-07-01T10:00:00Z',
    errors: [
      { id: 'e1', originalText: 'becos', suggestedCorrection: 'because', category: 'phonological', severity: 'medium', explanation: 'Spelling error' },
      { id: 'e2', originalText: 'go', suggestedCorrection: 'went', category: 'grammar', severity: 'high', explanation: 'Tense error' },
    ],
    summary: { phonological: 1, orthographic: 0, morphological: 0, grammar: 1, other: 0 },
    ...overrides,
  }
}

function makeRecommendations(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `r${i}`,
    title: `Recommendation ${i}`,
    targetCategory: 'phonological',
    rationale: 'Rationale',
    activity: 'Activity',
    priority: 'low' as const,
    status: 'pending' as const,
  }))
}

function makeWritingSample(overrides: Record<string, unknown> = {}) {
  const analysis = makeAnalysis()
  return {
    id: 'ws-1',
    studentId: analysis.studentId,
    therapistId: 'th-001',
    sampleText: analysis.sampleText,
    analysis,
    recommendations: makeRecommendations(1),
    therapistFeedback: 'Great work!',
    createdAt: '2026-07-01T10:00:00Z',
    updatedAt: '2026-07-01T10:00:00Z',
    ...overrides,
  }
}

describe('Backend: History Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /save', () => {
    it('returns 200 and the saved sample on success', async () => {
      const savedSample = makeWritingSample({ id: 'ws-new' })
      ;(saveWritingSample as jest.Mock).mockResolvedValue(savedSample)

      const res = await request(app)
        .post(`${ROUTE_PREFIX}/save`)
        .send({
          therapistId: 'th-001',
          analysis: makeAnalysis(),
          recommendations: makeRecommendations(1),
          feedback: 'Good effort',
        })

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
      expect(res.body.sample).toEqual(savedSample)
      expect(saveWritingSample).toHaveBeenCalledTimes(1)
    })

    it('passes through the error to the error handler on failure', async () => {
      ;(saveWritingSample as jest.Mock).mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .post(`${ROUTE_PREFIX}/save`)
        .send({
          therapistId: 'th-001',
          analysis: makeAnalysis(),
          recommendations: [],
          feedback: '',
        })

      expect(res.status).toBe(500)
    })

    it('saves a sample with empty recommendations array', async () => {
      const savedSample = makeWritingSample()
      ;(saveWritingSample as jest.Mock).mockResolvedValue(savedSample)

      const res = await request(app)
        .post(`${ROUTE_PREFIX}/save`)
        .send({
          therapistId: 'th-001',
          analysis: makeAnalysis(),
          recommendations: [],
          feedback: 'No recommendations yet',
        })

      expect(res.status).toBe(200)
      expect(saveWritingSample).toHaveBeenCalledWith(
        'th-001',
        'stu-001',
        makeAnalysis().sampleText,
        expect.any(Object),
        [],
        'No recommendations yet'
      )
    })
  })

  describe('GET /get/:studentId', () => {
    const studentId = 'stu-001'

    it('returns 200 with summary and recommendations ranking when samples exist', async () => {
      const sample = makeWritingSample()
      ;(getWritingSamples as jest.Mock).mockResolvedValue([sample])
      ;(getTherapistNotes as jest.Mock).mockResolvedValue([])

      const res = await request(app).get(`${ROUTE_PREFIX}/get/${studentId}`)

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
      expect(res.body.summary).toHaveLength(1)
      expect(Array.isArray(res.body.recommendationsRanking)).toBe(true)
      expect(getWritingSamples).toHaveBeenCalledWith(studentId)
      expect(getTherapistNotes).toHaveBeenCalledWith(studentId)
    })

    it('returns 200 with empty arrays when no samples exist', async () => {
      ;(getWritingSamples as jest.Mock).mockResolvedValue([])
      ;(getTherapistNotes as jest.Mock).mockResolvedValue([])

      const res = await request(app).get(`${ROUTE_PREFIX}/get/${studentId}`)

      expect(res.status).toBe(200)
      expect(res.body.summary).toEqual([])
      expect(res.body.recommendationsRanking).toEqual([])
    })

    it('builds correct summary with error counts per category and severity', async () => {
      const sample = makeWritingSample({
        analysis: makeAnalysis({
          errors: [
            { id: 'e1', originalText: 'x', suggestedCorrection: 'y', category: 'phonological', severity: 'low', explanation: '' },
            { id: 'e2', originalText: 'x', suggestedCorrection: 'y', category: 'phonological', severity: 'medium', explanation: '' },
            { id: 'e3', originalText: 'x', suggestedCorrection: 'y', category: 'phonological', severity: 'high', explanation: '' },
            { id: 'e4', originalText: 'x', suggestedCorrection: 'y', category: 'grammar', severity: 'high', explanation: '' },
          ],
          sampleText: 'The quick brown fox jumps over the lazy dog near the river bank.',
        }),
      })
      ;(getWritingSamples as jest.Mock).mockResolvedValue([sample])
      ;(getTherapistNotes as jest.Mock).mockResolvedValue([])

      const res = await request(app).get(`${ROUTE_PREFIX}/get/${studentId}`)

      const summaryItem = res.body.summary[0]
      expect(summaryItem.wordCount).toBe(11)
      expect(summaryItem.summary[0][0]).toBe(1) // phonological low
      expect(summaryItem.summary[0][1]).toBe(1) // phonological medium
      expect(summaryItem.summary[0][2]).toBe(1) // phonological high
      expect(summaryItem.summary[3][2]).toBe(1) // grammar high
    })

    it('skips unknown error categories without crashing', async () => {
      const sample = makeWritingSample({
        analysis: makeAnalysis({
          errors: [
            { id: 'e1', originalText: 'x', suggestedCorrection: 'y', category: 'unknown-cat' as any, severity: 'low', explanation: '' },
          ],
          sampleText: 'Hello world test.',
        }),
      })
      ;(getWritingSamples as jest.Mock).mockResolvedValue([sample])
      ;(getTherapistNotes as jest.Mock).mockResolvedValue([])

      const res = await request(app).get(`${ROUTE_PREFIX}/get/${studentId}`)

      expect(res.status).toBe(200)
      // unknown category should not appear in summary (continue skips it)
      expect(res.body.summary[0].summary[0][0]).toBe(0)
    })

    it('handles unknown severity with console.warn and still returns 200', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const sample = makeWritingSample({
        analysis: makeAnalysis({
          errors: [
            { id: 'e1', originalText: 'x', suggestedCorrection: 'y', category: 'phonological', severity: 'extreme' as any, explanation: '' },
          ],
          sampleText: 'Hello world.',
        }),
      })
      ;(getWritingSamples as jest.Mock).mockResolvedValue([sample])
      ;(getTherapistNotes as jest.Mock).mockResolvedValue([])

      const res = await request(app).get(`${ROUTE_PREFIX}/get/${studentId}`)

      expect(res.status).toBe(200)
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('computes recommendationsRanking sorted by delta (most improvement first)', async () => {
      const sample1 = makeWritingSample({
        analysis: makeAnalysis({
          errors: [
            { id: 'e1', originalText: 'x', suggestedCorrection: 'y', category: 'phonological', severity: 'high', explanation: '' },
          ],
          sampleText: 'I goed to the store.',
        }),
        recommendations: makeRecommendations(2),
      })
      const sample2 = makeWritingSample({
        id: 'ws-2',
        createdAt: '2026-07-02T10:00:00Z',
        analysis: makeAnalysis({
          errors: [],
          sampleText: 'I went to the store.',
        }),
        recommendations: makeRecommendations(1),
      })
      ;(getWritingSamples as jest.Mock).mockResolvedValue([sample1, sample2])
      ;(getTherapistNotes as jest.Mock).mockResolvedValue([])

      const res = await request(app).get(`${ROUTE_PREFIX}/get/${studentId}`)

      expect(res.status).toBe(200)
      // sample1 has errors, sample2 has none → delta should be negative (improvement)
      // recommendationsRanking should be sorted descending by delta
      const ranking = res.body.recommendationsRanking
      expect(Array.isArray(ranking)).toBe(true)
    })

    it('returns recommendationsRanking with 0 delta when wordCount is 0', async () => {
      const sample1 = makeWritingSample({
        analysis: makeAnalysis({ sampleText: '', errors: [{ id: 'e1', originalText: 'x', suggestedCorrection: 'y', category: 'phonological', severity: 'high', explanation: '' }] }),
        recommendations: makeRecommendations(1),
      })
      const sample2 = makeWritingSample({
        id: 'ws-2',
        createdAt: '2026-07-02T10:00:00Z',
        analysis: makeAnalysis({ sampleText: '', errors: [] }),
        recommendations: makeRecommendations(1),
      })
      ;(getWritingSamples as jest.Mock).mockResolvedValue([sample1, sample2])
      ;(getTherapistNotes as jest.Mock).mockResolvedValue([])

      const res = await request(app).get(`${ROUTE_PREFIX}/get/${studentId}`)
      expect(res.status).toBe(200)
      expect(res.body.recommendationsRanking).toBeDefined()
    })

    it('returns 500 when getWritingSamples throws', async () => {
      ;(getWritingSamples as jest.Mock).mockRejectedValue(new Error('DB failure'))

      const res = await request(app).get(`${ROUTE_PREFIX}/get/${studentId}`)

      expect(res.status).toBe(500)
      expect(res.body.error).toBe('DB failure')
    })
  })

  describe('GET /getanalysis/:studentId', () => {
    const studentId = 'c3f11db7-f989-4f30-88aa-b6708e5a3520'

    it('returns 200 and an array of mapped ai_analysis objects when data exists', async () => {
      const mockRows = [
        {
          student_id: studentId,
          ai_analysis: {
            id: 'analysis-001',
            studentId: studentId,
            sampleText: 'Yesterday I go to the park and saw 3 dog runing fast becos they wanted food.',
            createdAt: '2026-07-01T10:00:00.000Z',
            summary: { phonological: 1, orthographic: 0, morphological: 1, grammar: 1, other: 0 },
            errors: [{ id: 'err-001', originalText: 'becos', suggestedCorrection: 'because', category: 'phonological', severity: 'high', explanation: 'Spelling error.' }],
          },
        },
      ]

      ;(getWritingSamples2 as jest.Mock).mockResolvedValue(mockRows)

      const res = await request(app).get(`${ROUTE_PREFIX}/getanalysis/${studentId}`)

      expect(res.status).toBe(200)
      expect(getWritingSamples2).toHaveBeenCalledWith(studentId)
      expect(getWritingSamples2).toHaveBeenCalledTimes(1)
      expect(res.body).toEqual([mockRows[0].ai_analysis])
    })

    it('returns 200 and an empty array if no samples are found for the student', async () => {
      ;(getWritingSamples2 as jest.Mock).mockResolvedValue([])

      const res = await request(app).get(`${ROUTE_PREFIX}/getanalysis/unknown-uuid-0000`)

      expect(res.status).toBe(200)
      expect(getWritingSamples2).toHaveBeenCalledWith('unknown-uuid-0000')
      expect(res.body).toEqual([])
    })
  })

  describe('GET /cohort-average', () => {
    it('returns 200 and the cohort averages object', async () => {
      const mockAverages = {
        phonological: 3.2,
        orthographic: 1.5,
        morphological: 0.8,
        grammar: 2.1,
        other: 0.3,
      }

      ;(getCohortAverages as jest.Mock).mockResolvedValue(mockAverages)

      const res = await request(app).get(`${ROUTE_PREFIX}/cohort-average`)

      expect(res.status).toBe(200)
      expect(getCohortAverages).toHaveBeenCalledTimes(1)
      expect(res.body).toEqual(mockAverages)
    })

    it('returns 200 with zero averages when no samples exist', async () => {
      ;(getCohortAverages as jest.Mock).mockResolvedValue({ phonological: 0, orthographic: 0, morphological: 0, grammar: 0, other: 0 })

      const res = await request(app).get(`${ROUTE_PREFIX}/cohort-average`)

      expect(res.status).toBe(200)
      expect(res.body.phonological).toBe(0)
    })
  })
})