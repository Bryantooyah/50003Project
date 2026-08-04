import crypto from "crypto";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient } from "../routes/analyse";
import { interventionRuleSet, InterventionCandidate } from "../data/interventionRules";
import { AnalysisResult, ErrorCategory, Recommendation } from "../types";

// UC3 error state: "Insufficient Data: System prompts therapist to input
// more writing samples before generating recommendations."
const MIN_ERRORS_FOR_RECOMMENDATIONS = 3;

export type GenerateRecommendationsResult =
  | { status: "insufficient_data" }
  | { status: "ok"; recommendations: Recommendation[] };

/**
 * Step 1 of UC3: "System processes the error categories through
 * rule-based filters." Pulls candidate strategies for every error
 * category present in the student's analysis, weighted by frequency.
 */
export function applyRuleBasedFilters(
  analysis: AnalysisResult
): { category: ErrorCategory; count: number; candidates: InterventionCandidate[] }[] {
  const categoryCounts = analysis.errors.reduce((acc, err) => {
    acc[err.category] = (acc[err.category] ?? 0) + 1;
    return acc;
  }, {} as Record<ErrorCategory, number>);

  return Object.entries(categoryCounts)
    .map(([category, count]) => ({
      category: category as ErrorCategory,
      count,
      candidates: interventionRuleSet[category as ErrorCategory] ?? [],
    }))
    .sort((a, b) => b.count - a.count);
}

const rerankSchema = z.object({
  recommendations: z.array(
    z.object({
      title: z.string(),
      targetCategory: z.enum(["phonological", "orthographic", "morphological", "grammar", "other"]),
      rationale: z.string(),
      activity: z.string(),
      priority: z.enum(["low", "medium", "high"]),
    })
  ),
});

/**
 * Step 1 (continued): "...and LLM re-ranking." Selects and ranks the
 * top strategies, with a rationale grounded in the student's actual errors.
 */
export async function applyLLMReranking(
  analysis: AnalysisResult,
  filtered: { category: ErrorCategory; count: number; candidates: InterventionCandidate[] }[]
): Promise<Recommendation[]> {
  const { client, model } = getOpenAIClient();

  const candidateList = filtered.flatMap((f) =>
    f.candidates.map((c) => ({ ...c, targetCategory: f.category, errorCount: f.count }))
  );

  const sampleErrors = analysis.errors
    .slice(0, 15)
    .map((e) => `[${e.category}/${e.severity}] "${e.originalText}" -> "${e.suggestedCorrection}": ${e.explanation}`)
    .join("\n");

  const response = await client.responses.parse({
    model,
    input: [
      {
        role: "system",
        content:
          "You are ranking intervention strategies for a student's writing error profile. " +
          "Given candidate strategies and the student's specific detected errors, select and " +
          "rank the most relevant strategies (most impactful first), and write a short rationale " +
          "for each grounded in the student's actual errors, not generic advice.",
      },
      {
        role: "user",
        content:
          `Student's detected errors:\n${sampleErrors}\n\n` +
          `Candidate strategies:\n${JSON.stringify(candidateList, null, 2)}\n\n` +
          `Return the top-ranked strategies (at most one per targetCategory unless clearly warranted).`,
      },
    ],
    text: {
      format: zodTextFormat(rerankSchema, "recommendation_ranking"),
    },
  });

  const parsed = response.output_parsed;
  if (!parsed) return [];

  return parsed.recommendations.map((r) => ({
    id: crypto.randomUUID(),
    title: r.title,
    targetCategory: r.targetCategory,
    rationale: r.rationale,
    activity: r.activity,
    priority: r.priority,
    status: "pending",
  }));
}

/**
 * Full UC3 flow entry point — mirrors
 * RecommendationEngine.generateRecommendations(analysisResult) in the
 * sequence diagram. Returns Recommendation[] straight from `../types`,
 * so the client can pass the result directly into saveHistory() exactly
 * like the current local generateRecommendations() does.
 */
export async function generateRecommendations(
  analysis: AnalysisResult
): Promise<GenerateRecommendationsResult> {
  if (analysis.errors.length < MIN_ERRORS_FOR_RECOMMENDATIONS) {
    return { status: "insufficient_data" };
  }

  const filtered = applyRuleBasedFilters(analysis);
  const recommendations = await applyLLMReranking(analysis, filtered);

  return { status: "ok", recommendations };
}