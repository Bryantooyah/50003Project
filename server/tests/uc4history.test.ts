import request from 'supertest'
import app from '../src/index'

jest.mock('../src/db/history', () => ({
  getWritingSamples2: jest.fn(),
  getCohortAverages: jest.fn(),
}))

import { getWritingSamples2, getCohortAverages } from '../src/db/history'

describe('Backend: History Routes', () => {
  const ROUTE_PREFIX = '/api/history'

  beforeEach(() => {
    jest.clearAllMocks()
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
            summary: {
              phonological: 1,
              orthographic: 0,
              morphological: 1,
              grammar: 1,
              other: 0,
            },
            errors: [
              {
                id: 'err-001',
                originalText: 'becos',
                suggestedCorrection: 'because',
                category: 'phonological',
                severity: 'high',
                explanation: 'Spelling suggests confusion between spoken sound and written form.',
              },
            ],
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
        totalStudents: 45,
        commonCategories: ['phonological', 'morphological', 'orthographic'],
      }

      ;(getCohortAverages as jest.Mock).mockResolvedValue(mockAverages)

      const res = await request(app).get(`${ROUTE_PREFIX}/cohort-average`)

      expect(res.status).toBe(200)
      expect(getCohortAverages).toHaveBeenCalledTimes(1)
      expect(res.body).toEqual(mockAverages)
    })
  })
})