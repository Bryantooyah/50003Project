import type {
  AnalysisResult,
  ErrorCategory,
  LLMOutput,
  Recommendation,
  Student,
  WritingSampleManifest,
} from "../types";

const BACKEND_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

/**
 * Helper to get authentication headers.
 * Throws an error if no active user session exists.
 */
function getAuthHeaders(): Record<string, string> {
  const userId = localStorage.getItem("userId");
  const userRole = localStorage.getItem("userRole");

  if (!userId || !userRole) {
    throw new Error("Unauthorized: Please log in first.");
  }

  return {
    "Content-Type": "application/json",
    "x-user-id": userId,
    "x-user-role": userRole,
  };
}

/* ==========================================================================
   1. Admin & Auth API Services
   ========================================================================== */

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

export type CreateUserData = {
  username: string;
  password?: string;
  name: string;
  role: "student" | "therapist" | "admin" | string;
  dateOfBirth?: string;
  level?: string;
};

export async function createUser(userData: CreateUserData): Promise<any> {
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

export async function updateStudentUser(
  id: string,
  data: {
    name?: string;
    username?: string;
    dateOfBirth?: string;
    level?: string;
  }
): Promise<any> {
  const response = await fetch(`${BACKEND_URL}/api/admin/users/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.error || "Failed to update student profile");
  }
  return resData;
}

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

export async function resetPassword(
  userId: string,
  newPassword: string
): Promise<any> {
  const response = await fetch(`${BACKEND_URL}/api/admin/reset-password`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId, newPassword }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to reset password");
  }
  return data;
}

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
    assignedTherapist: therapistId,
  }));
}

/* ==========================================================================
   2. System & Analysis API Services
   ========================================================================== */

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

/**
 * Submits writing sample to backend LLM analysis endpoint.
 *
 * NOTE: this deliberately does NOT fall back to demo data on failure —
 * a real error is thrown and surfaced to the therapist as an explicit
 * error message. (Earlier drafts of this function had a mock-data
 * fallback with a "backendAvailable" flag; that behavior was intentionally
 * dropped in favour of this simpler, more literal reading of the UC2 spec's
 * "backend analysis failure" alt-flow — see UC2 Test Plan for the update.)
 */
export async function analyseWritingSample(
  studentId: string,
  sampleText: string
): Promise<AnalysisResult> {
  const response = await fetch(`${BACKEND_URL}/api/analyse`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      id: studentId,
      text: sampleText,
    }),
  });

  if (!response.ok) {
    throw new Error("Backend analysis endpoint failed.");
  }

  const data: LLMOutput = await response.json();

  let errors = data.issues ?? [];
  let summary = {
    phonological: 0,
    orthographic: 0,
    morphological: 0,
    grammar: 0,
    other: 0,
  };

  for (const issue of data.issues ?? []) {
    switch (issue.category) {
      case "phonological": summary.phonological++; break;
      case "orthographic": summary.orthographic++; break;
      case "morphological": summary.morphological++; break;
      case "grammar": summary.grammar++; break;
      case "other": summary.other++; break;
    }
  }

  return {
    errors,
    summary,
    id: crypto.randomUUID(),
    studentId,
    sampleText,
    createdAt: new Date().toISOString(),
    llmOutput: data.comments ?? "",
    backendAvailable: true,
  };
}

export async function generateRecommendations(
  analysis: AnalysisResult
): Promise<Recommendation[]> {
  const response = await fetch(`${BACKEND_URL}/api/recommendations/generate`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ analysis }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate recommendations.");
  }

  const data = await response.json();

  if (data.status === "insufficient_data") {
    // Caller (TherapistWorkflow.tsx) can check recommendations.length === 0
    // and show the UC3 "Insufficient Data" prompt.
    return [];
  }

  return data.recommendations as Recommendation[];
}

export async function getWritingSampleManifest(): Promise<WritingSampleManifest> {
  const response = await fetch("/writing-samples/manifest.json");

  if (!response.ok) {
    throw new Error("Failed to load writing sample manifest.");
  }

  return response.json();
}

/* ==========================================================================
   3. Handwriting OCR (client-upload path)
   ========================================================================== */

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Sends an uploaded handwriting scan to the backend's vision-model OCR
 * endpoint. Handwriting recognition is genuinely hard — a dedicated OCR
 * engine (Tesseract) struggles badly on messy/cursive handwriting, so this
 * uses the LLM's vision capability instead, which reads much more reliably
 * by inferring likely words from context rather than raw letter shapes.
 *
 * Still reports whether this came from the real backend, since the
 * frontend falls back to local Tesseract OCR if this is unavailable —
 * that fallback logic lives in WritingSampleForm.tsx, not here.
 */
export async function extractTextFromImage(
  file: File
): Promise<{ text: string; backendAvailable: boolean }> {
  try {
    const imageBase64 = await fileToBase64(file);

    const response = await fetch(`${BACKEND_URL}/api/ocr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, mimeType: file.type }),
    });

    if (!response.ok) {
      throw new Error("Backend OCR failed");
    }

    const data: { text?: string } = await response.json();

    return { text: data.text ?? "", backendAvailable: true };
  } catch (error) {
    console.warn(
      "Backend OCR unavailable. Falling back to local Tesseract OCR.",
      error
    );
    return { text: "", backendAvailable: false };
  }
}

/* ==========================================================================
   4. History Services (UC4)
   ========================================================================== */

export async function saveHistory(
  therapistId: string,
  analysis: AnalysisResult,
  recommendations: Recommendation[],
  feedback: string
): Promise<boolean> {
  const response = await fetch(`${BACKEND_URL}/api/history/save`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ therapistId, analysis, recommendations, feedback }),
  });
  return response.ok;
}

export async function getHistory(studentId: string) {
  const response = await fetch(`${BACKEND_URL}/api/history/get/${studentId}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `Failed to fetch student history (${response.status})`);
  }

  const data = await response.json();

  const summary = data.summary;
  const recommendations = data.recommendationsRanking;
  return { summary, recommendations };
}

export async function getAnalysisArray(studentId: string): Promise<AnalysisResult[]> {
  const response = await fetch(`${BACKEND_URL}/api/history/getanalysis/${studentId}`);
  console.log(response)
  if (!response.ok) {
    throw new Error("Failed to fetch student analysis data.");
  }

  const analysis: AnalysisResult[] = await response.json();
  console.log(analysis)
  return analysis || [];
}

export async function getCohortAverages(): Promise<Record<ErrorCategory, number>> {
  const response = await fetch(`${BACKEND_URL}/api/history/cohort-average`);
  return await response.json();
}
