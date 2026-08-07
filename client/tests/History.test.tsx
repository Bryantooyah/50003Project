import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import History from '../src/components/History';
import { getHistory } from '../src/services/api';

jest.mock('../src/services/api', () => ({
  getHistory: jest.fn(),
}));

const mockStudents = [
  { id: 'stu-001', name: 'Alice', age: 8, level: 'Primary 2', assignedTherapist: 'th-001' },
  { id: 'stu-002', name: 'Bob', age: 9, level: 'Primary 3', assignedTherapist: 'th-001' },
];

const mockSummary = [
  {
    wordCount: 25,
    createdAt: '2026-06-01T10:00:00Z',
    summary: [
      [1, 2, 0],
      [0, 1, 0],
      [0, 0, 0],
      [1, 0, 1],
      [0, 0, 0],
    ],
  },
  {
    wordCount: 30,
    createdAt: '2026-06-15T10:00:00Z',
    summary: [
      [0, 1, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
  },
];

const mockRecommendations = [
  {
    id: 'r1',
    title: 'Phonological Awareness',
    targetCategory: 'phonological',
    rationale: 'More phonological errors.',
    activity: 'Read aloud daily',
    priority: 'high',
    status: 'pending',
  },
  {
    id: 'r2',
    title: 'Grammar Practice',
    targetCategory: 'grammar',
    rationale: 'Grammar errors present.',
    activity: 'Verb tense exercises',
    priority: 'medium',
    status: 'accepted',
  },
];

describe('Frontend: History Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows "No student selected" when selectedStudentId is empty', () => {
    render(<History students={mockStudents} selectedStudentId="" />);
    expect(screen.getByText('No student selected')).toBeInTheDocument();
  });

  it('shows "No student selected" when studentId does not match any student', () => {
    render(<History students={mockStudents} selectedStudentId="nonexistent" />);
    expect(screen.getByText('No student selected')).toBeInTheDocument();
  });

  it('shows loading state while fetching history', async () => {
    (getHistory as jest.Mock).mockReturnValue(new Promise(() => {}));

    render(<History students={mockStudents} selectedStudentId="stu-001" />);

    expect(screen.getByText('Loading history...')).toBeInTheDocument();
  });

  it('fetches and displays history data when a student is selected', async () => {
    (getHistory as jest.Mock).mockResolvedValue({
      summary: mockSummary,
      recommendations: mockRecommendations,
    });

    render(<History students={mockStudents} selectedStudentId="stu-001" />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    expect(screen.getByText('Mistake log · by category')).toBeInTheDocument();
    expect(screen.getByText('Phonological')).toBeInTheDocument();
    expect(screen.getByText('Grammar')).toBeInTheDocument();
  });

  it('shows error message when getHistory rejects', async () => {
    (getHistory as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<History students={mockStudents} selectedStudentId="stu-001" />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it('shows "No history available." when summary is empty', async () => {
    (getHistory as jest.Mock).mockResolvedValue({
      summary: [],
      recommendations: [],
    });

    render(<History students={mockStudents} selectedStudentId="stu-001" />);

    await waitFor(() => {
      expect(screen.getByText('No history available.')).toBeInTheDocument();
    });
  });

  it('renders category tabs for each error category', async () => {
    (getHistory as jest.Mock).mockResolvedValue({
      summary: mockSummary,
      recommendations: [],
    });

    render(<History students={mockStudents} selectedStudentId="stu-001" />);

    await waitFor(() => {
      expect(screen.getByText('Phonological')).toBeInTheDocument();
      expect(screen.getByText('Orthographic')).toBeInTheDocument();
      expect(screen.getByText('Morphological')).toBeInTheDocument();
      expect(screen.getByText('Grammar')).toBeInTheDocument();
      expect(screen.getByText('Other')).toBeInTheDocument();
    });
  });

  it('renders recommendation cards when recommendations are present', async () => {
    (getHistory as jest.Mock).mockResolvedValue({
      summary: mockSummary,
      recommendations: mockRecommendations,
    });

    render(<History students={mockStudents} selectedStudentId="stu-001" />);

    await waitFor(() => {
      expect(screen.getByText('Accepted recommendations')).toBeInTheDocument();
      expect(screen.getByText('Phonological Awareness')).toBeInTheDocument();
      expect(screen.getByText('Grammar Practice')).toBeInTheDocument();
    });
  });

  it('skips rendering recommendation cards with empty title', async () => {
    const recommendationsWithEmptyTitle = [
      { id: 'r1', title: '', targetCategory: 'phonological', rationale: '', activity: '', priority: 'low', status: 'pending' },
      { id: 'r2', title: 'Valid Recommendation', targetCategory: 'grammar', rationale: 'Rationale', activity: 'Activity', priority: 'medium', status: 'accepted' },
    ];

    (getHistory as jest.Mock).mockResolvedValue({
      summary: mockSummary,
      recommendations: recommendationsWithEmptyTitle,
    });

    render(<History students={mockStudents} selectedStudentId="stu-001" />);

    await waitFor(() => {
      expect(screen.getByText('Valid Recommendation')).toBeInTheDocument();
    });

    expect(screen.queryByText(/title/)).not.toBeInTheDocument();
  });

  it('calls getHistory with the correct student id', async () => {
    (getHistory as jest.Mock).mockResolvedValue({
      summary: mockSummary,
      recommendations: mockRecommendations,
    });

    render(<History students={mockStudents} selectedStudentId="stu-002" />);

    await waitFor(() => {
      expect(getHistory).toHaveBeenCalledWith('stu-002');
    });
  });

  it('switches between category tabs', async () => {
    (getHistory as jest.Mock).mockResolvedValue({
      summary: mockSummary,
      recommendations: [],
    });

    render(<History students={mockStudents} selectedStudentId="stu-001" />);

    await waitFor(() => {
      expect(screen.getByText('Phonological')).toBeInTheDocument();
    });

    const phonologicalTab = screen.getByText('Phonological').closest('button');
    const grammarTab = screen.getByText('Grammar').closest('button');

    if (phonologicalTab && grammarTab) {
      fireEvent.click(grammarTab);
      expect(grammarTab).toHaveAttribute('aria-pressed', 'true');
    }
  });

  it('does not make API call when selectedStudentId remains empty', () => {
    render(<History students={mockStudents} selectedStudentId="" />);

    expect(getHistory).not.toHaveBeenCalled();
  });
});
