import type { Student, AnalysisResult } from "../types";
import {getAnalysisArray} from "../services/api";
interface StudentSelectorProps {
  students: Student[];
  selectedStudentId: string;
  onSelect: (studentId: string) => void;
  onSelect2: (analysisArray: AnalysisResult[]) => void;
}

export default function StudentSelector({
  students,
  selectedStudentId,
  onSelect,
  onSelect2,
}: StudentSelectorProps) {
  return (
    <section className="card">
      <h2>Select student</h2>
      <p className="muted">
        Only students assigned to the authenticated therapist are shown.
      </p>

      <select
        value={selectedStudentId}
        onChange={async (event) => {
        const studentId = event.target.value;
        onSelect(studentId);
        if (!studentId) {
          onSelect2([]);
        }else{
        const result = await getAnalysisArray(studentId);
        console.log(result);
        onSelect2(result);}
}}
>
        <option value="">Choose a student</option>
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {student.name} — Age {student.age}
          </option>
        ))}
      </select>
    </section>
  );
}
