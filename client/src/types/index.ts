export type Student = {
  id: string;
  name: string;
  age: number;
  level: string;
  assignedTherapist: string;
};

export type ErrorCategory =
  | "phonological"
  | "orthographic"
  | "morphological"
  | "grammar"
  | "other";

export type DetectedError = {
  id: string;
  originalText: string;
  suggestedCorrection: string;
  category: ErrorCategory;
  severity: "low" | "medium" | "high";
  explanation: string;
};

export type AnalysisResult = {
  id: string;
  studentId: string;
  sampleText: string;
  createdAt: string;
  errors: DetectedError[];
  summary: Record<ErrorCategory, number>;
  llmOutput?: string;
  selectedSampleFileName?: string;
};

export type Recommendation = {
  id: string;
  title: string;
  targetCategory: ErrorCategory;
  rationale: string;
  activity: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "accepted" | "rejected";
};


export type Severity = "low" | "medium" | "high";

export type WritingSampleFileType = "image" | "pdf";

export type AnswerKeyItem = {
  questionNo: number;
  question: string;
  expectedAnswer: string;
  mark: number;
};

export type WritingSampleFile = {
  id: string;
  displayName: string;
  fileName: string;
  fileType: WritingSampleFileType;
  datasetType: string;
  expectedMaxMark: number;
};

export type WritingSampleManifest = {
  datasetName: string;
  answerKey: AnswerKeyItem[];
  samples: WritingSampleFile[];
};

