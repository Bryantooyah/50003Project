import type { AnalysisResult, ErrorCategory } from "../types";

type ErrorPatternDashboardProps = {
  analysis: AnalysisResult;
};

const categoryLabels: Record<ErrorCategory, string> = {
  phonological: "Phonological",
  orthographic: "Orthographic",
  morphological: "Morphological",
  grammar: "Grammar",
  other: "Other",
};

export default function ErrorPatternDashboard({
  analysis,
}: ErrorPatternDashboardProps) {
  const totalErrors = analysis.errors.length;

  const topCategory = Object.entries(analysis.summary).sort(
    ([, countA], [, countB]) => countB - countA
  )[0];

  const severityCounts = analysis.errors.reduce(
    (counts, error) => {
      counts[error.severity] += 1;
      return counts;
    },
    { low: 0, medium: 0, high: 0 }
  );

  return (
    <section className="card">
      <h2>Student error pattern dashboard</h2>
      <p className="muted">
        Visual summary of the student&apos;s detected writing error profile.
      </p>

      <div className="dashboard-metrics">
        <div className="metric-card">
          <span>Total errors</span>
          <strong>{totalErrors}</strong>
        </div>

        <div className="metric-card">
          <span>Most common category</span>
          <strong>
            {topCategory
              ? categoryLabels[topCategory[0] as ErrorCategory]
              : "None"}
          </strong>
        </div>

        <div className="metric-card">
          <span>High severity errors</span>
          <strong>{severityCounts.high}</strong>
        </div>
      </div>

      <div className="category-bars">
        {Object.entries(analysis.summary).map(([category, count]) => {
          const percentage =
            totalErrors === 0 ? 0 : Math.round((count / totalErrors) * 100);

          return (
            <div key={category} className="category-row">
              <div className="category-row-label">
                <span>{categoryLabels[category as ErrorCategory]}</span>
                <span>
                  {count} error{count === 1 ? "" : "s"}
                </span>
              </div>

              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
