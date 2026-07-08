import type { DetectedError } from "../types";

type Props = {
  errors: DetectedError[];
};

export default function ErrorTable({ errors }: Props) {
  return (
    <section className="card">
      <h2>Detected Error Annotations</h2>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Original</th>
              <th>Suggested</th>
              <th>Category</th>
              <th>Severity</th>
              <th>Explanation</th>
            </tr>
          </thead>

          <tbody>
            {errors.map((error) => (
              <tr key={error.id}>
                <td>{error.originalText}</td>
                <td>{error.suggestedCorrection}</td>
                <td>{error.category}</td>
                <td>
                  <span className={`badge ${error.severity}`}>
                    {error.severity}
                  </span>
                </td>
                <td>{error.explanation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}