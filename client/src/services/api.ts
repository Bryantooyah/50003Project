import { mockAnalysisResult, mockRecommendations, mockStudents } from "../data/mockData";
import type { AnalysisResult, Recommendation, Student } from "../types";

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

  return {
    ...mockAnalysisResult,
    id: crypto.randomUUID(),
    studentId,
    sampleText,
    createdAt: new Date().toISOString(),
  };
}

export async function generateRecommendations(
  analysisId: string
): Promise<Recommendation[]> {
  await delay(600);
  console.log("Generating recommendations for analysis:", analysisId);
  return mockRecommendations;
}