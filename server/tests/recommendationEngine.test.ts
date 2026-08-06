import "dotenv/config";
import {
  applyRuleBasedFilters,
  generateRecommendations,
} from "../src/services/recommendationEngine";
import { interventionRuleSet } from "../src/data/interventionRules";
import { AnalysisResult, DetectedError } from "../src/types";

// UC3-U1, U2, U3
// --- Similarity helper -----------------------------------------------
// LLM output wording isn't deterministic, so instead of exact-match
// assertions we check that each returned recommendation's title is a
// close match to one of the candidate titles we actually offered it
// (interventionRuleSet), catching hallucination without requiring
// identical text. Dice coefficient over character bigrams — simple,
// no extra dependency needed.
function bigrams(str: string): string[] {
  const s = str.toLowerCase();
  const grams: string[] = [];
  for (let i = 0; i < s.length - 1; i++) grams.push(s.slice(i, i + 2));
  return grams;
}

function diceSimilarity(a: string, b: string): number {
  const bgA = bigrams(a);
  const bgB = bigrams(b);
  if (bgA.length === 0 || bgB.length === 0) return 0;

  const bgBCopy = [...bgB];
  let matches = 0;
  for (const g of bgA) {
    const idx = bgBCopy.indexOf(g);
    if (idx !== -1) {
      matches++;
      bgBCopy.splice(idx, 1);
    }
  }
  return (2 * matches) / (bgA.length + bgB.length);
}

const SIMILARITY_THRESHOLD = 0.5;

function bestSimilarityAgainstCandidates(title: string, category: string): number {
  const candidates = interventionRuleSet[category as keyof typeof interventionRuleSet] ?? [];
  return Math.max(0, ...candidates.map((c) => diceSimilarity(title, c.title)));
}

// --- Fixtures ----------------------------------------------------------
function makeError(overrides: Partial<DetectedError>): DetectedError {
  return {
    id: crypto.randomUUID(),
    originalText: "becos",
    suggestedCorrection: "because",
    category: "phonological",
    severity: "medium",
    explanation: "Phonetic spelling substituted for the correct grapheme.",
    ...overrides,
  };
}

function makeAnalysis(errors: DetectedError[]): AnalysisResult {
  const summary = { phonological: 0, orthographic: 0, morphological: 0, grammar: 0, other: 0 };
  errors.forEach((e) => summary[e.category]++);
  return {
    id: crypto.randomUUID(),
    studentId: crypto.randomUUID(),
    sampleText: "sample text for test",
    createdAt: new Date().toISOString(),
    errors,
    summary,
  };
}

describe("applyRuleBasedFilters (UC3 flow step 1a)", () => {
  it("returns candidates for every category present, most frequent first", () => {
    const analysis = makeAnalysis([
      makeError({ category: "phonological" }),
      makeError({ category: "phonological" }),
      makeError({ category: "grammar" }),
    ]);

    const filtered = applyRuleBasedFilters(analysis);

    expect(filtered[0].category).toBe("phonological");
    expect(filtered[0].count).toBe(2);
    expect(filtered.some((f) => f.category === "grammar")).toBe(true);
    // every category returned should have at least one rule-based candidate
    filtered.forEach((f) => expect(f.candidates.length).toBeGreaterThan(0));
  });
});

describe("generateRecommendations — UC3-U2: insufficient data", () => {
  it("returns insufficient_data below the error threshold, without calling the LLM", async () => {
    const analysis = makeAnalysis([makeError({}), makeError({})]); // only 2 errors

    const result = await generateRecommendations(analysis);

    expect(result.status).toBe("insufficient_data");
  });
});

describe("generateRecommendations — UC3-U1: dominant category", () => {
  it("returns top-ranked recommendations matching the dominant category's rule candidates", async () => {
    const analysis = makeAnalysis([
      makeError({ category: "phonological" }),
      makeError({ category: "phonological" }),
      makeError({ category: "phonological" }),
    ]);

    const result = await generateRecommendations(analysis);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return; // type narrowing for TS

    expect(result.recommendations.length).toBeGreaterThan(0);

    for (const rec of result.recommendations) {
      const similarity = bestSimilarityAgainstCandidates(rec.title, rec.targetCategory);
      expect(similarity).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
    }
  }, 20000); // LLM call — allow more time than Jest's 5s default
});

describe("generateRecommendations — UC3-U3: mixed categories", () => {
  it("returns recommendations spanning multiple categories", async () => {
    const analysis = makeAnalysis([
      makeError({ category: "phonological" }),
      makeError({ category: "orthographic" }),
      makeError({ category: "grammar" }),
    ]);

    const result = await generateRecommendations(analysis);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    const categoriesReturned = new Set(result.recommendations.map((r) => r.targetCategory));
    expect(categoriesReturned.size).toBeGreaterThan(1);

    for (const rec of result.recommendations) {
      const similarity = bestSimilarityAgainstCandidates(rec.title, rec.targetCategory);
      expect(similarity).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
    }
  }, 20000);
});