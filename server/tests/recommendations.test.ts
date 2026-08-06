import "dotenv/config";
import crypto from "crypto";
import request from "supertest";
import app from "../src/index";
import { pool } from "../src/db";

// UC3-I1
const THERAPIST_HEADERS = { "X-User-Id": crypto.randomUUID(), "X-User-Role": "therapist" };

afterAll(async () => {
  await pool.end();
});

describe("POST /api/recommendations/generate (UC3-I1)", () => {
  it("reaches the RecommendationEngine and returns recommendations for a real analyzed profile", async () => {
    const analysis = {
      id: crypto.randomUUID(),
      studentId: crypto.randomUUID(),
      sampleText: "I go to the shop becos I want to buy bred.",
      createdAt: new Date().toISOString(),
      errors: [
        {
          id: crypto.randomUUID(),
          originalText: "becos",
          suggestedCorrection: "because",
          category: "phonological",
          severity: "medium",
          explanation: "Phonetic spelling error.",
        },
        {
          id: crypto.randomUUID(),
          originalText: "bred",
          suggestedCorrection: "bread",
          category: "orthographic",
          severity: "low",
          explanation: "Vowel digraph omitted.",
        },
        {
          id: crypto.randomUUID(),
          originalText: "go",
          suggestedCorrection: "went",
          category: "grammar",
          severity: "medium",
          explanation: "Incorrect tense.",
        },
      ],
      summary: { phonological: 1, orthographic: 1, morphological: 0, grammar: 1, other: 0 },
    };

    const res = await request(app)
      .post("/api/recommendations/generate")
      .set(THERAPIST_HEADERS)
      .send({ analysis });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(Array.isArray(res.body.recommendations)).toBe(true);
    expect(res.body.recommendations.length).toBeGreaterThan(0);
  }, 20000);

  it("rejects an unauthenticated request", async () => {
    const res = await request(app).post("/api/recommendations/generate").send({ analysis: {} });

    expect(res.status).toBe(401);
  });
});