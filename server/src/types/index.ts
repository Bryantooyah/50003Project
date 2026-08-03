import z from "zod";

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

export type LLMOutput = { 
  issues: DetectedError[]; 
  comments: string; 
};

// AI-readable version of the above type
export const llmOutputSchema = z.object({
  issues: z.array( z.object({
    id: z.int(),
    originalText: z.string(),
    suggestedCorrection: z.string(),
    category: z.enum(["phonological", "orthographic", "morphological", "grammar", "other"]),
    severity: z.enum(["low", "medium", "high"]),
    explanation: z.string()
  })),
  comments: z.string()
});


export type WritingSample = {
	studentId: string,
	therapistId: string,
	sampleText: string,
	analysis: AnalysisResult,
	recommendations: Recommendation[],
	therapistFeedback: string,
	createdAt: string,
	updatedAt: string
}

export type TherapistNote = {
	studentId: string,
	therapistId: string,
	note: string
}

/**
 * Quick summary of AnalysisResult
 * 
 * createdAt: timestamp of AnalysisResult creation
 * summary: 5x3 array of number, representing [type of error][severity]
 */
export type SummaryItem = {
  createdAt: string,
  summary: number[][]
}
