type Props = {
  sampleText: string;
  setSampleText: (value: string) => void;
  onAnalyse: () => void;
  isLoading: boolean;
};

export default function WritingSampleForm({
  sampleText,
  setSampleText,
  onAnalyse,
  isLoading,
}: Props) {
  const wordCount = sampleText.trim()
    ? sampleText.trim().split(/\s+/).length
    : 0;

  return (
    <section className="card">
      <h2>Submit Student Writing Sample</h2>
      <p className="muted">
        The sample will be validated before error analysis is performed.
      </p>

      <textarea
        value={sampleText}
        onChange={(event) => setSampleText(event.target.value)}
        placeholder="Paste or type the student's writing sample here..."
      />

      <div className="form-footer">
        <span className={wordCount < 30 ? "warning" : "success"}>
          Word count: {wordCount}
        </span>

        <button onClick={onAnalyse} disabled={isLoading}>
          {isLoading ? "Analysing..." : "Analyse Sample"}
        </button>
      </div>
    </section>
  );
}