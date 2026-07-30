import { pool } from './index';

export async function getStudentAnalysis(studentId: string) {
  const res = await pool.query(
    `SELECT 
        id, 
        student_id, 
        sample_text, 
        ai_analysis, 
        created_at
     FROM writing_samples
     WHERE student_id = $1
     ORDER BY created_at ASC`,
    [studentId]
  );
  
  return res.rows;
}