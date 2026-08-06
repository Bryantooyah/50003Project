import { getWritingSamples2 } from '../src/db/history'
import { pool } from '../src/db/index' 
jest.mock('../src/db/index', () => ({
  pool: {
    query: jest.fn(),
  },
}))

describe('DB: history.ts - getWritingSamples2', () => {
  const mockPoolQuery = pool.query as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('queries the database with correct parameterized SQL and returns rows', async () => {
    const studentId = 'c3f11db7-f989-4f30-88aa-b6708e5a3520'
    const mockRows = [
      {
        id: 'sample-1',
        student_id: studentId,
        sample_text: 'Yesterday I go to the park...',
        ai_analysis: { score: 85 },
      },
      {
        id: 'sample-2',
        student_id: studentId,
        sample_text: 'My big brother is playin...',
        ai_analysis: { score: 90 },
      },
    ]

    mockPoolQuery.mockResolvedValue({ rows: mockRows })

    const result = await getWritingSamples2(studentId)

    expect(mockPoolQuery).toHaveBeenCalledTimes(1)
    expect(mockPoolQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT *'),
      [studentId]
    )

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

    await expect(getWritingSamples2('c3f11db7-f989-4f30-88aa-b6708e5a3520')).rejects.toThrow(
      'Database connection failed'
    )
  })
})