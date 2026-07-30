import type { AnalysisResult, Recommendation, Student } from "../types";

export const mockStudents: Student[] = [
  {
    id: "stu-001",
    name: "Aaron Tan",
    age: 9,
    level: "Primary 3",
    assignedTherapist: "Ms Lim",
  },
  {
    id: "stu-002",
    name: "Betty Wong",
    age: 10,
    level: "Primary 4",
    assignedTherapist: "Ms Lim",
  },
  {
    id: "stu-003",
    name: "Caleb Lee",
    age: 8,
    level: "Primary 2",
    assignedTherapist: "Ms Lim",
  },
];

export const mockAnalysisResult: AnalysisResult = {
  id: "analysis-001",
  studentId: "stu-001",
  sampleText: "",
  createdAt: new Date().toISOString(),
  summary: {
    phonological: 4,
    orthographic: 3,
    morphological: 2,
    grammar: 1,
    other: 0,
  },
  errors: [
    {
      id: "err-001",
      originalText: "becos",
      suggestedCorrection: "because",
      category: "phonological",
      severity: "high",
      explanation:
        "The spelling suggests confusion between spoken sound and written form.",
    },
    {
      id: "err-002",
      originalText: "runing",
      suggestedCorrection: "running",
      category: "morphological",
      severity: "medium",
      explanation:
        "The student omitted the doubled consonant when forming the present participle.",
    },
    {
      id: "err-003",
      originalText: "freind",
      suggestedCorrection: "friend",
      category: "orthographic",
      severity: "medium",
      explanation:
        "The student reversed the vowel sequence in a common irregular spelling pattern.",
    },
    {
      id: "err-004",
      originalText: "He go to school",
      suggestedCorrection: "He goes to school",
      category: "grammar",
      severity: "low",
      explanation:
        "The sentence shows subject-verb agreement error.",
    },
  ],
};

export const mockRecommendations: Recommendation[] = [
  {
    id: "rec-001",
    title: "Phonics-based sound-letter mapping activity",
    targetCategory: "phonological",
    rationale:
      "The student shows repeated confusion between spoken sounds and written spellings.",
    activity:
      "Use minimal-pair word sorting and guided decoding exercises for common sound-letter patterns.",
    priority: "high",
    status: "pending",
  },
  {
    id: "rec-002",
    title: "Morphological word-building practice",
    targetCategory: "morphological",
    rationale:
      "The student has difficulty applying spelling changes when adding suffixes.",
    activity:
      "Practise root word + suffix transformations such as run → running, hop → hopping.",
    priority: "medium",
    status: "pending",
  },
  {
    id: "rec-003",
    title: "Irregular spelling memory strategy",
    targetCategory: "orthographic",
    rationale:
      "The student makes errors in visually irregular word patterns.",
    activity:
      "Use look-cover-write-check and visual highlighting for irregular word chunks.",
    priority: "medium",
    status: "pending",
  },
];

export const mockAnalysisArray: AnalysisResult[] = [
  {
    id: "analysis-001",
    studentId: "stu-001",
    sampleText: "Yesterday I go to the park and saw 3 dog runing fast becos they wanted food.",
    createdAt: "2026-07-01T10:00:00.000Z",
    summary: {
      phonological: 4,
      orthographic: 3,
      morphological: 2,
      grammar: 1,
      other: 0,
    },
    errors: [
      {
        id: "err-001",
        originalText: "becos",
        suggestedCorrection: "because",
        category: "phonological",
        severity: "high",
        explanation: "The spelling suggests confusion between spoken sound and written form.",
      },
      {
        id: "err-002",
        originalText: "runing",
        suggestedCorrection: "running",
        category: "morphological",
        severity: "medium",
        explanation: "The student omitted the doubled consonant when forming the present participle.",
      },
      {
        id: "err-003",
        originalText: "freind",
        suggestedCorrection: "friend",
        category: "orthographic",
        severity: "medium",
        explanation: "The student reversed the vowel sequence in a common irregular spelling pattern.",
      },
      {
        id: "err-004",
        originalText: "He go to school",
        suggestedCorrection: "He goes to school",
        category: "grammar",
        severity: "low",
        explanation: "The sentence shows subject-verb agreement error.",
      },
    ],
    llmOutput: "Initial assessment indicates high frequency of phonological and orthographic errors.",
  },
  {
    id: "analysis-002",
    studentId: "stu-001",
    sampleText: "My big brother is playin basketball with his frends at school.",
    createdAt: "2026-07-15T14:30:00.000Z",
    summary: {
      phonological: 2,
      orthographic: 3,
      morphological: 1,
      grammar: 0,
      other: 0,
    },
    errors: [
      {
        id: "err-005",
        originalText: "playin",
        suggestedCorrection: "playing",
        category: "phonological",
        severity: "medium",
        explanation: "Omission of final 'g' sound in word ending.",
      },
      {
        id: "err-006",
        originalText: "frends",
        suggestedCorrection: "friends",
        category: "orthographic",
        severity: "high",
        explanation: "Vowel digraph 'ie' missed in common high-frequency word.",
      },
    ],
    llmOutput: "Student shows slight improvement in grammar, but orthographic patterns remain difficult.",
  },
  {
    id: "analysis-003",
    studentId: "stu-001",
    sampleText: "When the rain stoped, we went outside to play football.",
    createdAt: "2026-07-24T09:15:00.000Z",
    summary: {
      phonological: 1,
      orthographic: 2,
      morphological: 1,
      grammar: 0,
      other: 0,
    },
    errors: [
      {
        id: "err-007",
        originalText: "stoped",
        suggestedCorrection: "stopped",
        category: "morphological",
        severity: "low",
        explanation: "Consonant doubling rule prior to suffix '-ed'.",
      },
    ],
    llmOutput: "Significant reduction in overall error density compared to sample 1.",
  },
];