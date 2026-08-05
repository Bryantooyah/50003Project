import request from 'supertest'

process.env.OPENAI_API_KEY = 'mock-key'
process.env.MODEL = 'mock-model'

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    responses: {
      parse: jest.fn().mockImplementation(async ({ input }: any) => {
        const userContent = Array.isArray(input)
          ? input.find((i: any) => i.role === 'user')?.content || ''
          : ''
        if (userContent.includes('Perfect writing sample')) {
          return { output_parsed: { issues: [], comments: 'No issues detected' } }
        }
        return {
          output_parsed: {
            issues: [
              {
                id: 1,
                originalText: 'kaktus',
                suggestedCorrection: 'cactus',
                category: 'orthographic',
                severity: 'medium',
                explanation: 'Spelling error',
              },
            ],
            comments: 'Found issues',
          },
        }
      }),
    },
  }))
})

import app from '../src/index' // Express application instance

describe('Backend: POST /api/analyse (UC2-I1)', () => {
  const validToken = 'Bearer mock-valid-token'

  it('returns 200 and structured error data for valid inputs', async () => {
    const res = await request(app)
      .post('/api/analyse')
      .set('Authorization', validToken)
      .send({
        id: 'STU-102',
        text: 'Yesterday the student went to the zoo and saw a big kaktus outside thier enclosure.',
      })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('issues')
    expect(Array.isArray(res.body.issues)).toBe(true)
  })

  it('returns 400 Bad Request if text is missing', async () => {
    const res = await request(app)
      .post('/api/analyse')
      .set('Authorization', validToken)
      .send({})

    expect(res.status).toBe(400)
  })

  it('handles empty or missing issues from internal model gracefully', async () => {
    const res = await request(app)
      .post('/api/analyse')
      .set('Authorization', validToken)
      .send({
        id: 'STU-102',
        text: 'Perfect writing sample without any spelling or grammar mistakes.',
      })

    expect(res.status).toBe(200)
    expect(res.body.issues).toBeDefined()
  })
})
