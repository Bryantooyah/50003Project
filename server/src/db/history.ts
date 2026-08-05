import { AnalysisResult, Recommendation, WritingSample, TherapistNote, ErrorCategory } from '../types';
import { pool } from './index';

export async function saveWritingSample(
	therapistId: string,
	studentId: string,
	sampleText: string,
	analysis: AnalysisResult,
	recommendations: Recommendation[],
	feedback: string
) {
  const res = await pool.query(
    `INSERT INTO writing_samples (student_id, submitted_by, sample_text, ai_analysis, recommendations, therapist_feedback) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     ON CONFLICT DO NOTHING 
     RETURNING *`,
    [studentId, therapistId, sampleText, JSON.stringify(analysis), JSON.stringify(recommendations), feedback]
  );
  return res.rows[0];
}

export async function saveTherapistNote(studentId: string, therapistId: string, note: string) {
  const res = await pool.query(
	`INSERT INTO therapist_notes (student_id, therapist_id, note) VALUES ($1, $2, $3)
	ON CONFLICT DO NOTHING
	RETURNING *`,
	[studentId, therapistId, note]
  );
  return res.rows[0];
}

export async function getWritingSamples(studentId: string): Promise<WritingSample[]> {
  const res = await pool.query(
    `SELECT id, student_id, submitted_by, sample_text AS "sampleText",
            ai_analysis AS analysis,
            recommendations, therapist_feedback AS "therapistFeedback",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
     FROM writing_samples
     WHERE student_id = $1`,
    [studentId]
  );
  return res.rows;
}

export async function getTherapistNotes(studentId: string): Promise<TherapistNote[]> {
  const res = await pool.query(
    `SELECT therapist_id AS "therapistId", note FROM therapist_notes WHERE student_id = $1`,
    [studentId]
  );
  return res.rows;
}

export async function getCohortAverages(): Promise<Record<ErrorCategory, number>> {
  const { rows } = await pool.query(
    `SELECT ai_analysis FROM writing_samples WHERE ai_analysis IS NOT NULL`
  );
  const totalSamples = rows.length;
  const totals: Record<ErrorCategory, number> = {
    phonological: 0,
    orthographic: 0,
    morphological: 0,
    grammar: 0,
    other: 0,
  };
  if (totalSamples === 0) return totals;
  for (const row of rows) {
    const summary = row.ai_analysis?.summary || {};
    totals.phonological += summary.phonological ?? 0;
    totals.orthographic += summary.orthographic ?? 0;
    totals.morphological += summary.morphological ?? 0;
    totals.grammar += summary.grammar ?? 0;
    totals.other += summary.other ?? 0;
  }
  console.log({
    phonological: Number((totals.phonological / totalSamples).toFixed(1)),
    orthographic: Number((totals.orthographic / totalSamples).toFixed(1)),
    morphological: Number((totals.morphological / totalSamples).toFixed(1)),
    grammar: Number((totals.grammar / totalSamples).toFixed(2)),
    other: Number((totals.other / totalSamples).toFixed(2)),
  });
  return {
    phonological: Number((totals.phonological / totalSamples).toFixed(1)),
    orthographic: Number((totals.orthographic / totalSamples).toFixed(1)),
    morphological: Number((totals.morphological / totalSamples).toFixed(1)),
    grammar: Number((totals.grammar / totalSamples).toFixed(2)),
    other: Number((totals.other / totalSamples).toFixed(2)),
  };
}
