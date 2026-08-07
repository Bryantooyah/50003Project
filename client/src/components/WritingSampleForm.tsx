import { useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";
import { extractTextFromImage } from "../services/api";
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

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");

  const [isExtractingText, setIsExtractingText] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState("");

  const wordCount = sampleText.trim()
    ? sampleText.trim().split(/\s+/).length
    : 0;

  const isShortSample = wordCount > 0 && wordCount < 30;

  // Object URLs must be released manually or they leak memory — clean up
  // whenever the preview changes or the component unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function runOcr(file: File) {
    setIsExtractingText(true);
    setOcrProgress(0);
    setOcrError("");

    const backendResult = await extractTextFromImage(file);

    if (backendResult.backendAvailable) {
      if (!backendResult.text.trim()) {
        setOcrError(
          "No text could be detected in this image. Please transcribe it manually below."
        );
      } else {
        onSampleChange(backendResult.text.trim());
      }
      setIsExtractingText(false);
      return;
    }

    // Backend OCR unreachable — fall back to local Tesseract, but be clear
    // this is the weaker, lower-accuracy path, especially on handwriting.
    setOcrError(
      "AI-based text extraction is unavailable — using a lower-accuracy local fallback instead. Please review the result carefully."
    );

    try {
      const result = await Tesseract.recognize(file, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      const extractedText = result.data.text.trim();
      const confidence = result.data.confidence; // 0-100

      if (!extractedText) {
        setOcrError(
          "No text could be detected in this image, and the AI extraction service is unavailable. Please transcribe it manually below."
        );
      } else if (confidence < 60) {
        setOcrError(
          `AI extraction is unavailable, and the local fallback's confidence is low (${Math.round(confidence)}%) — this is common with handwritten samples. The extracted text has been added below, but please review it carefully against the original scan and correct it before analysing.`
        );
        onSampleChange(extractedText);
      } else {
        onSampleChange(extractedText);
      }
    } catch (err) {
      console.error("Local OCR fallback failed:", err);
      setOcrError(
        "Text extraction failed. Please transcribe the sample manually below."
      );
    } finally {
      setIsExtractingText(false);
    }
  }

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
      setUploadedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadError("");
    setOcrError("");
    setUploadedFile(file);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));

    if (file.type === "application/pdf") {
      // Tesseract works on images, not PDF pages directly — rather than
      // silently doing nothing, tell the therapist why no text appeared.
      setOcrError(
        "Automatic text extraction isn't supported for PDF files yet — please transcribe this sample manually below."
      );
    } else {
      runOcr(file);
    }
  }

  return (
    <section className="card">
      <h2>Submit Student Writing Sample</h2>
      <p className="muted">
        Upload a scanned writing sample to extract text automatically, or
        select a reference sample below, then review the transcription
        before analysis.
      </p>

      {selectedSampleFileName && (
        <div className="selected-file-box">
          Using reference sample: <strong>{selectedSampleFileName}</strong>{" "}
          <span className="muted">(test data, not linked to this student's record)</span>
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

      {uploadedFile && previewUrl && (
        <div className="sample-preview">
          <h3>{uploadedFile.name}</h3>

          {uploadedFile.type === "application/pdf" ? (
            <iframe src={previewUrl} title={uploadedFile.name} className="sample-pdf" />
          ) : (
            <img src={previewUrl} alt={uploadedFile.name} className="sample-image" />
          )}
        </div>
      )}

      {isExtractingText && (
        <p className="message message-info">
          Extracting text from image... {ocrProgress}%
        </p>
      )}

      {ocrError && <p className="message message-warning">{ocrError}</p>}

      <label htmlFor="writing-sample">OCR / extracted text</label>
      <textarea
        id="writing-sample"
        value={sampleText}
        onChange={(event) => onSampleChange(event.target.value)}
        placeholder="Upload a scan to auto-extract text, or paste/type the student's writing sample here..."
      />

      {!selectedStudentId && (
        <p className="message message-warning" style={{ marginTop: "1rem" }}>
          ⚠️ Please select a student before analyzing a writing sample.
        </p>
      )}

      <div className="form-footer">
        <span className={isShortSample ? "warning-text" : "muted"}>
          Word count: {wordCount}
          {isShortSample && " — short sample, therapist confirmation required"}
        </span>

        <button
          className="btn btn-primary"
          onClick={onAnalyse}
          disabled={!selectedStudentId || isAnalysing || isExtractingText}
        >
          {isAnalysing ? "Analysing..." : "Analyse sample"}
        </button>
      </div>
    </section>
  );
}
