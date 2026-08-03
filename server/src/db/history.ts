import { AnalysisResult, Recommendation, WritingSample, TherapistNote } from '../types';
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
    [studentId, therapistId, sampleText, analysis, recommendations, feedback]
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
    `SELECT * FROM writing_samples WHERE student_id = $1`,
    [studentId]
  );
  return res.rows;
}

export async function getTherapistNotes(studentId: string): Promise<TherapistNote[]> {
  const res = await pool.query(
    `SELECT * FROM therapist_notes WHERE student_id = $1`,
    [studentId]
  );
  return res.rows;
}
