import { useRef, useState } from "react";
import { ACCEPTED_UPLOAD_EXTENSIONS, ACCEPTED_UPLOAD_TYPES } from "../types";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadError, setUploadError] = useState("");

  const wordCount = sampleText.trim()
    ? sampleText.trim().split(/\s+/).length
    : 0;

  const isShortSample = wordCount > 0 && wordCount < 30;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const isAcceptedType = (ACCEPTED_UPLOAD_TYPES as readonly string[]).includes(
      file.type
    );

    if (!isAcceptedType) {
      setUploadError(
        `"${file.name}" is not a supported file type. Please upload a ${ACCEPTED_UPLOAD_EXTENSIONS.join(
          ", "
        )} file.`
      );
      setUploadedFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadError("");
    setUploadedFileName(file.name);
  }

  return (
    <section className="card">
      <h2>Submit Student Writing Sample</h2>
      <p className="muted">
        Upload a scanned writing sample, or select a client-provided sample
        below, then enter the therapist-reviewed transcription for analysis.
      </p>

      {selectedSampleFileName && (
        <div className="selected-file-box">
          Selected client sample: <strong>{selectedSampleFileName}</strong>
        </div>
      )}

      <label htmlFor="sample-upload">Upload writing sample (optional)</label>
      <div className="upload-zone">
        <input
          id="sample-upload"
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_UPLOAD_EXTENSIONS.join(",")}
          onChange={handleFileChange}
        />
        <p>Accepted formats: JPG, PNG, PDF</p>
      </div>

      {uploadError && <p className="message message-error">{uploadError}</p>}
      {!uploadError && uploadedFileName && (
        <p className="message message-success">
          &quot;{uploadedFileName}&quot; uploaded. Transcribe or paste the
          extracted text below before running analysis.
        </p>
      )}

      <label htmlFor="writing-sample">OCR / extracted text</label>
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
          className="btn btn-primary"
          onClick={onAnalyse}
          disabled={!selectedStudentId || isAnalysing}
        >
          {isAnalysing ? "Analysing..." : "Analyse sample"}
        </button>
      </div>
    </section>
  );
}
