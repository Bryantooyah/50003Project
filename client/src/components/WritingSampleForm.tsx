interface WritingSampleFormProps {
  sampleText: string;
  selectedStudentId: string;
  selectedSampleFileName?: string;
  isAnalysing: boolean;
  onSampleChange: (value: string) => void;
  onAnalyse: () => void;
}

export default function WritingSampleForm({
  sampleText,
  selectedStudentId,
  selectedSampleFileName,
  isAnalysing,
  onSampleChange,
  onAnalyse,
}: WritingSampleFormProps) {
  const wordCount = sampleText.trim()
    ? sampleText.trim().split(/\s+/).length
    : 0;

  const isShortSample = wordCount > 0 && wordCount < 30;

  return (
    <section className="card">
      <h2>UC2: Submit Student Writing Sample</h2>
      <p className="muted">
        The therapist can either select a client-provided sample image/PDF or
        manually enter OCR-extracted text for analysis.
      </p>

      {selectedSampleFileName && (
        <div className="selected-file-box">
          Selected client sample: <strong>{selectedSampleFileName}</strong>
        </div>
      )}

      <label htmlFor="writing-sample">OCR / Extracted Text</label>
      <textarea
        id="writing-sample"
        value={sampleText}
        onChange={(event) => onSampleChange(event.target.value)}
        placeholder="Paste OCR text or manually transcribe the student's writing sample here..."
      />

      <div className="form-footer">
        <span className={isShortSample ? "warning-text" : "muted"}>
          Word count: {wordCount}
          {isShortSample && " — short sample, therapist confirmation required"}
        </span>

        <button
          className="primary-button"
          onClick={onAnalyse}
          disabled={!selectedStudentId || isAnalysing}
        >
          {isAnalysing ? "Analysing..." : "Analyse Sample"}
        </button>
      </div>
    </section>
  );
}