import { mockAnalysisResult, mockStudents } from "../data/mockData";
import type {
  AnalysisResult,
  ErrorCategory,
  Recommendation,
  Student,
} from "../types";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getStudents(): Promise<Student[]> {
  await delay(300);
  return mockStudents;
}

export async function analyseWritingSample(
  studentId: string,
  sampleText: string
): Promise<AnalysisResult> {
  await delay(800);

  try {
    const response = await fetch("http://localhost:3001/api/analyse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: studentId,
        text: sampleText,
      }),
    });

    if (!response.ok) {
      throw new Error("Backend analysis failed");
    }

    const data: { output: string } = await response.json();
    console.log("Backend LLM output:", data.output);
  } catch (error) {
    console.warn(
      "Backend LLM unavailable. Falling back to mock structured analysis.",
      error
    );
  }

  return {
    ...mockAnalysisResult,
    id: crypto.randomUUID(),
    studentId,
    sampleText,
    createdAt: new Date().toISOString(),
  };
}

export async function generateRecommendations(
  analysis: AnalysisResult
): Promise<Recommendation[]> {
  await delay(600);

  const recommendations: Recommendation[] = [];

  const addRecommendation = (
    category: ErrorCategory,
    title: string,
    rationale: string,
    activity: string,
    count: number
  ) => {
    recommendations.push({
      id: crypto.randomUUID(),
      title,
      targetCategory: category,
      rationale,
      activity,
      priority: count >= 2 ? "high" : "medium",
      status: "pending",
    });
  };

  if (analysis.summary.phonological > 0) {
    addRecommendation(
      "phonological",
      "Phonics Discrimination Drill",
      "The student shows sound-based spelling errors, suggesting difficulty mapping sounds to written forms.",
      "Use minimal-pair word cards and ask the student to identify, pronounce, and spell similar-sounding words.",
      analysis.summary.phonological
    );
  }

  if (analysis.summary.orthographic > 0) {
    addRecommendation(
      "orthographic",
      "Spelling Pattern Practice",
      "The student shows spelling pattern errors that may require explicit practice with common letter patterns.",
      "Group words by spelling pattern, then ask the student to sort, copy, and use them in short sentences.",
      analysis.summary.orthographic
    );
  }

  if (analysis.summary.morphological > 0) {
    addRecommendation(
      "morphological",
      "Word Form Awareness Practice",
      "The student may need support with word forms, prefixes, suffixes, or tense-related changes.",
      "Use base words and ask the student to form related words using prefixes, suffixes, or tense endings.",
      analysis.summary.morphological
    );
  }

  if (analysis.summary.grammar > 0) {
    addRecommendation(
      "grammar",
      "Sentence Correction Exercise",
      "The student shows grammar errors that affect sentence accuracy and clarity.",
      "Give the student incorrect sentences and ask them to identify and rewrite the corrected version.",
      analysis.summary.grammar
    );
  }

  if (analysis.summary.other > 0 || recommendations.length === 0) {
    recommendations.push({
      id: crypto.randomUUID(),
      title: "General Writing Review",
      targetCategory: "other",
      rationale:
        "The writing sample may contain general clarity or expression issues that do not fall neatly into one category.",
      activity:
        "Ask the student to reread the writing sample, identify unclear parts, and rewrite one improved version.",
      priority: "low",
      status: "pending",
    });
  }

  return recommendations;
}