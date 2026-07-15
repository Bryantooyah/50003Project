const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

export type HealthResponse = {
  status: string;
  db: string;
};

export async function checkBackendHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/health`);

  if (!response.ok) {
    throw new Error("Backend health check failed");
  }

  return response.json();
}

export async function analyseWithLLM(text: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/analyse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      text,
    }),
  });

  if (!response.ok) {
    throw new Error("LLM analysis failed");
  }

  const data: { output: string } = await response.json();
  return data.output;
}