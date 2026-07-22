import type { AnalysisResult } from "../types";

interface ErrorSummaryProps {
  analysis: AnalysisResult;
}

export default function ErrorSummary({ analysis }: ErrorSummaryProps) {
  const totalErrors =
    analysis.summary.phonological +
    analysis.summary.orthographic +
    analysis.summary.morphological +
    analysis.summary.grammar +
    analysis.summary.other;

  return (
    <section className="card">
      <h2>Error Summary</h2>
      <p className="muted">
        Structured diagnostic summary generated from the submitted writing
        sample.
      </p>

      <div className="summary-grid">
        <div>
          <strong>{totalErrors}</strong>
          <span>Total Errors</span>
        </div>
        <div>
          <strong>{analysis.summary.phonological}</strong>
          <span>Phonological</span>
        </div>
        <div>
          <strong>{analysis.summary.orthographic}</strong>
          <span>Orthographic</span>
        </div>
        <div>
          <strong>{analysis.summary.morphological}</strong>
          <span>Morphological</span>
        </div>
        <div>
          <strong>{analysis.summary.grammar}</strong>
          <span>Grammar</span>
        </div>
      </div>
    </section>
  );
}