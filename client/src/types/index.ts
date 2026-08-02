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

export type LLMOutput = { 
  issues: DetectedError[]; 
  comments: string; 
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
  // True when the result came from the real backend/LLM call.
  // False means the backend was unreachable and this is fallback demo data —
  // the UI must tell the therapist this explicitly rather than pretend it succeeded.
  backendAvailable: boolean;
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

// Accepted MIME/extension types for a therapist-uploaded writing sample.
// Used by WritingSampleForm to implement the "unsupported file type" alt flow.
export const ACCEPTED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;


export const ACCEPTED_UPLOAD_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"];

export type SummaryItem = {
  createdAt: string,
  summary: number[][]
}