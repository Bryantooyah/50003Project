import { mockAnalysisResult, mockStudents } from "../data/mockData";
import type {
  AnalysisResult,
  ErrorCategory,
  Recommendation,
  Student,
} from "../types";

import type { WritingSampleManifest } from "../types";

const BACKEND_URL = "http://localhost:3001";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to get authentication headers.
 * Retrieves session user info or defaults to admin credentials for dev testing.
 */
function getAuthHeaders(): Record<string, string> {
  const userId = localStorage.getItem("userId") || "admin-dev-id";
  const userRole = localStorage.getItem("userRole") || "admin";

  return {
    "Content-Type": "application/json",
    "x-user-id": userId,
    "x-user-role": userRole,
  };
}

/* ==========================================================================
   1. Admin API Services
   ========================================================================== */

/**
 * Fetch all user accounts from the database
 */
export async function fetchUsers(): Promise<any[]> {
  const response = await fetch(`${BACKEND_URL}/api/admin/users`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch users list");
  }
  const data = await response.json();
  return data.users || [];
}

/**
 * Fetch all therapist-student relationships & assignment dates
 */
export async function fetchAssignments(): Promise<any[]> {
  const response = await fetch(`${BACKEND_URL}/api/admin/assignments`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch therapist-student assignments");
  }
  const data = await response.json();
  return data.assignments || [];
}

/**
 * Create a new user account (student, therapist, or admin)
 */
export async function createUser(userData: {
  username: string;
  password: string;
  name: string;
  role: string;
  dateOfBirth?: string;
  age?: number;
  level?: string;
}): Promise<any> {
  const response = await fetch(`${BACKEND_URL}/api/admin/users`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(userData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to create account");
  }
  return data;
}

/**
 * Assign a Therapist to a Student (inserts into therapist_students)
 */
export async function assignTherapistToStudent(
  therapistId: string,
  studentId: string
): Promise<any> {
  const response = await fetch(`${BACKEND_URL}/api/admin/assign-therapist`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ therapistId, studentId }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to assign therapist to student");
  }
  return data;
}

/**
 * Fetch only the students assigned to a specific therapist from PostgreSQL
 */
export async function getTherapistStudents(therapistId: string): Promise<Student[]> {
  const response = await fetch(`${BACKEND_URL}/api/admin/therapist/${therapistId}/students`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch assigned students for therapist");
  }

  const data = await response.json();
  return (data.students || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    age: s.age ?? 0,
    level: s.level ?? "Unspecified",
  }));
}

/* ==========================================================================
   2. Existing UC2 & System API Services
   ========================================================================== */

export async function getStudents(): Promise<Student[]> {
  await delay(300);
  return mockStudents;
}

export async function checkBackendHealth(): Promise<{
  status: string;
  db: string;
}> {
  const response = await fetch(`${BACKEND_URL}/api/health`);

  if (!response.ok) {
    throw new Error("Backend health check failed");
  }

  return response.json();
}

export async function analyseWritingSample(
  studentId: string,
  sampleText: string
): Promise<AnalysisResult> {
  await delay(600);

  let llmOutput = "";

  try {
    const response = await fetch(`${BACKEND_URL}/api/analyse`, {
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

    const data: { output?: string } = await response.json();
    llmOutput = data.output ?? "";
  } catch (error) {
    console.warn(
      "Backend LLM unavailable. Falling back to mock structured analysis.",
      error
    );

    llmOutput =
      "Backend analysis endpoint was unavailable, so the frontend displayed fallback structured mock analysis for demo purposes.";
  }

  return {
    ...mockAnalysisResult,
    id: crypto.randomUUID(),
    studentId,
    sampleText,
    createdAt: new Date().toISOString(),
    llmOutput,
  };
}

export async function generateRecommendations(
  analysis: AnalysisResult
): Promise<Recommendation[]> {
  await delay(500);

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
      "The student shows sound-based errors, suggesting difficulty mapping sounds to written forms.",
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
      "The student may need support with suffixes, tense endings, or word form changes.",
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
        "The writing sample contains issues that require general review and therapist judgement.",
      activity:
        "Ask the student to reread the writing sample, identify unclear parts, and rewrite one improved version.",
      priority: "low",
      status: "pending",
    });
  }

  return recommendations;
}

export async function getWritingSampleManifest(): Promise<WritingSampleManifest> {
  const response = await fetch("/writing-samples/manifest.json");

  if (!response.ok) {
    throw new Error("Failed to load writing sample manifest.");
  }

  return response.json();
}

export async function getAnalysisArray(studentId: string): Promise<AnalysisResult[]>{
  const response = await fetch(`${BACKEND_URL}/api/analyse/getanalysis/${studentId}`);
  const rows = await response.json();
  //   console.log("STATUS:", response.status);

  // console.log(rows);
  // return [];
  if (rows.length === 0) {
    return [];
  }
return rows.map((row: any) => ({
    id: row.id,
    studentId: row.student_id,
    sampleText: row.sample_text,
    createdAt: row.created_at,
    errors: row.ai_analysis.errors ?? [],
    summary: row.ai_analysis.summary ?? {
      phonological: 0,
      orthographic: 0,
      morphological: 0,
      grammar: 0,
      other: 0,
    },
    llmOutput: row.ai_analysis.llmOutput ?? "",
  }));
}