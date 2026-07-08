import type { AnalysisResult } from "../types";

type Props = {
  analysis: AnalysisResult;
};

export default function ErrorSummary({ analysis }: Props) {
  const entries = Object.entries(analysis.summary);

  return (
    <section className="card">
      <h2>Error Pattern Summary</h2>
      <p className="muted">
        The system categorises detected errors by type and frequency.
      </p>

      <div className="summary-grid">
        {entries.map(([category, count]) => (
          <div className="summary-box" key={category}>
            <span>{category}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}