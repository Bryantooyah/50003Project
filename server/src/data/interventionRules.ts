import { ErrorCategory } from "../types";

/**
 * PLACEHOLDER rule mapping — error category -> candidate intervention strategies.
 * Once the DAS SLP Band A/B/C materials are digitised, replace the contents
 * of interventionRuleSet below (same shape) — nothing else needs to change.
 */

export type InterventionCandidate = {
  title: string;
  band: "A" | "B" | "C" | null;
  activity: string;
  priority: "low" | "medium" | "high";
};

export const interventionRuleSet: Record<ErrorCategory, InterventionCandidate[]> = {
  phonological: [
    {
      title: "Phoneme segmentation drills",
      band: null,
      activity: "Practice breaking target words into individual sounds using tapping or counters.",
      priority: "high",
    },
    {
      title: "Minimal pairs discrimination",
      band: null,
      activity: "Contrast commonly confused sound pairs (e.g. /b/ vs /p/) in short word lists.",
      priority: "medium",
    },
  ],
  orthographic: [
    {
      title: "Sight-word pattern review",
      band: null,
      activity: "Review irregular spelling patterns the student misapplied, grouped by pattern family.",
      priority: "medium",
    },
    {
      title: "Letter-sound mapping exercises",
      band: null,
      activity: "Reinforce grapheme-phoneme correspondence for the specific letters misspelled.",
      priority: "high",
    },
  ],
  morphological: [
    {
      title: "Root/affix identification",
      band: null,
      activity: "Identify root words and affixes in the student's own misused words.",
      priority: "medium",
    },
    {
      title: "Word-family building",
      band: null,
      activity: "Build word families from a shared root to reinforce morpheme boundaries.",
      priority: "low",
    },
  ],
  grammar: [
    {
      title: "Sentence structure scaffolding",
      band: null,
      activity: "Rebuild the student's flagged sentences using a subject-verb-object frame.",
      priority: "medium",
    },
    {
      title: "Targeted tense/agreement practice",
      band: null,
      activity: "Short drills on the specific tense or agreement error pattern observed.",
      priority: "high",
    },
  ],
  other: [
    {
      title: "General writing conference",
      band: null,
      activity: "Review the sample one-on-one to identify patterns not captured by the standard categories.",
      priority: "low",
    },
  ],
};