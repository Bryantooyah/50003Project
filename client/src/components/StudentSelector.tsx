import type { Student } from "../types";

interface StudentSelectorProps {
  students: Student[];
  selectedStudentId: string;
  onSelect: (studentId: string) => void;
}

export default function StudentSelector({
  students,
  selectedStudentId,
  onSelect,
}: StudentSelectorProps) {
  return (
    <section className="card">
      <h2>Select Student</h2>
      <p className="muted">
        Only students assigned to the authenticated therapist are shown.
      </p>

      <select
        value={selectedStudentId}
        onChange={(event) => onSelect(event.target.value)}
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