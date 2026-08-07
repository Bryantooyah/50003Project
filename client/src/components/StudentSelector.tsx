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
      <h2>Select student</h2>
      <p className="muted">
        Only students assigned to you are shown.
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
      {!selectedStudentId && (
        <p className="message message-warning" style={{ marginTop: "0.75rem" }}>
          ⚠️ Please select a student to begin.
        </p>
      )}
    </section>
  );
}
