import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { generateRecommendations } from "../services/recommendationEngine";
import { AnalysisResult } from "../types";

const router = Router();

router.use(requireAuth);

/**
 * POST /api/recommendations/generate
 * body: { analysis: AnalysisResult }
 *
 * Mirrors client-side generateRecommendations() in api.ts, but backed by
 * rule-based filtering + LLM re-ranking instead of hardcoded thresholds.
 * Does NOT persist anything — persistence still happens via
 * POST /api/history/save, same as today.
 */
router.post("/generate", async (req, res, next) => {
  try {
    const { analysis } = req.body as { analysis?: AnalysisResult };

    if (!analysis) {
      return res.status(400).json({ error: "analysis is required." });
    }

    const result = await generateRecommendations(analysis);

    if (result.status === "insufficient_data") {
      return res.status(200).json({ status: "insufficient_data" });
    }

    return res.status(200).json({ status: "ok", recommendations: result.recommendations });
  } catch (err) {
    next(err);
  }
});

export default router;