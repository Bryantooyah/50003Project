/**
 * Client-side unit tests for history-related API service functions.
 * Tests the getHistory, saveHistory, getAnalysisArray, getCohortAverages
 * functions from src/services/api.ts by mocking the module.
 */
import {
  saveHistory,
  getHistory,
  getAnalysisArray,
  getCohortAverages,
} from "../src/services/api";

jest.mock("../src/services/api", () => ({
  saveHistory: jest.fn(),
  getHistory: jest.fn(),
  getAnalysisArray: jest.fn(),
  getCohortAverages: jest.fn(),
}));

describe('Frontend: API History Services', () => {
  const originalLocalStorage = { ...localStorage };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('userId', 'user-123');
    localStorage.setItem('userRole', 'therapist');
  });

  afterEach(() => {
    Object.keys(localStorage).forEach((key) => localStorage.removeItem(key));
    Object.assign(localStorage, originalLocalStorage);
  });

  describe('saveHistory', () => {
    it('returns true when the save succeeds', async () => {
      (saveHistory as jest.Mock).mockResolvedValue(true);

      const result = await saveHistory('th-001', {
        id: 'a1',
        studentId: 'stu-001',
        sampleText: 'Hello world',
        createdAt: '2026-07-01T00:00:00Z',
        errors: [],
        summary: { phonological: 0, orthographic: 0, morphological: 0, grammar: 0, other: 0 },
        backendAvailable: true,
      }, [], '');

      expect(result).toBe(true);
      expect(saveHistory).toHaveBeenCalledWith(
        'th-001',
        expect.objectContaining({ studentId: 'stu-001' }),
        [],
        ''
      );
    });

    it('returns false when the save fails', async () => {
      (saveHistory as jest.Mock).mockResolvedValue(false);

      const result = await saveHistory('th-001', {
        id: 'a1',
        studentId: 'stu-001',
        sampleText: 'Hello world',
        createdAt: '2026-07-01T00:00:00Z',
        errors: [],
        summary: { phonological: 0, orthographic: 0, morphological: 0, grammar: 0, other: 0 },
        backendAvailable: true,
      }, [], '');

      expect(result).toBe(false);
    });
  });

  describe('getHistory', () => {
    it('returns summary and recommendationsRanking on success', async () => {
      const mockResponse = {
        summary: [
          { wordCount: 25, createdAt: '2026-07-01T00:00:00Z', summary: [[1, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]] },
        ],
        recommendations: [{ id: 'r1', title: 'Test' }],
      };
      (getHistory as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getHistory('stu-001');

      expect(result.summary).toEqual(mockResponse.summary);
      expect(result.recommendations).toEqual(mockResponse.recommendations);
      expect(getHistory).toHaveBeenCalledWith('stu-001');
    });

    it('throws an error when the backend returns an error', async () => {
      (getHistory as jest.Mock).mockRejectedValue(new Error('Network failed'));

      await expect(getHistory('stu-001')).rejects.toThrow('Network failed');
    });
  });

  describe('getAnalysisArray', () => {
    it('returns analysis array on success', async () => {
      const mockAnalysis = [
        { id: 'a1', studentId: 'stu-001', sampleText: 'Hello', createdAt: '2026-07-01T00:00:00Z', errors: [], summary: { phonological: 0, orthographic: 0, morphological: 0, grammar: 0, other: 0 }, backendAvailable: true },
      ];
      (getAnalysisArray as jest.Mock).mockResolvedValue(mockAnalysis);

      const result = await getAnalysisArray('stu-001');

      expect(result).toEqual(mockAnalysis);
      expect(getAnalysisArray).toHaveBeenCalledWith('stu-001');
    });

    it('returns empty array when response body is falsy', async () => {
      (getAnalysisArray as jest.Mock).mockResolvedValue([]);

      const result = await getAnalysisArray('stu-001');

      expect(result).toEqual([]);
    });

    it('throws when response is not ok', async () => {
      (getAnalysisArray as jest.Mock).mockRejectedValue(new Error('Failed to fetch student analysis data.'));

      await expect(getAnalysisArray('nonexistent')).rejects.toThrow('Failed to fetch student analysis data.');
    });
  });

  describe('getCohortAverages', () => {
    it('returns cohort averages on success', async () => {
      const mockAverages = { phonological: 3.2, orthographic: 1.5, morphological: 0.8, grammar: 2.1, other: 0.3 };
      (getCohortAverages as jest.Mock).mockResolvedValue(mockAverages);

      const result = await getCohortAverages();

      expect(result).toEqual(mockAverages);
      expect(getCohortAverages).toHaveBeenCalledTimes(1);
    });
  });
});
