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
    <section className="card" style={{ height: "100%", display: "flex", flexDirection: "column", padding: "16px 20px" }}>
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.2rem" }}>Submit Student Writing Sample</h2>
      <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
        Upload a scanned writing sample to extract text automatically, or
        select a reference sample below, then review the transcription
        before analysis.
      </p>

      {selectedSampleFileName && (
        <div className="selected-file-box" style={{ padding: "6px 12px", fontSize: "0.82rem", marginBottom: "0.5rem" }}>
          Using reference sample: <strong>{selectedSampleFileName}</strong>{" "}
          <span className="muted">(test data, not linked to this student's record)</span>
        </div>
      )}

      <label htmlFor="sample-upload" style={{ margin: "4px 0 2px", fontSize: "0.85rem" }}>Upload writing sample (optional)</label>
      <div className="upload-zone" style={{ padding: "8px 12px" }}>
        <input
          id="sample-upload"
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_UPLOAD_EXTENSIONS.join(",")}
          onChange={handleFileChange}
          style={{ fontSize: "0.82rem" }}
        />
        <p style={{ margin: "2px 0 0", fontSize: "0.78rem" }}>Accepted formats: JPG, PNG, PDF</p>
      </div>

      {uploadError && <p className="message message-error">{uploadError}</p>}

      {uploadedFile && previewUrl && (
        <div className="sample-preview" style={{ marginTop: "0.5rem" }}>
          <h3 style={{ fontSize: "0.9rem" }}>{uploadedFile.name}</h3>

          {uploadedFile.type === "application/pdf" ? (
            <iframe src={previewUrl} title={uploadedFile.name} className="sample-pdf" style={{ height: "100px" }} />
          ) : (
            <img src={previewUrl} alt={uploadedFile.name} className="sample-image" style={{ maxHeight: "100px", objectFit: "contain" }} />
          )}
        </div>
      )}

      {isExtractingText && (
        <p className="message message-info">
          Extracting text from image... {ocrProgress}%
        </p>
      )}

      {ocrError && <p className="message message-warning">{ocrError}</p>}

      <label htmlFor="writing-sample" style={{ margin: "8px 0 2px", fontSize: "0.85rem" }}>OCR / extracted text</label>
      <textarea
        id="writing-sample"
        value={sampleText}
        onChange={(event) => onSampleChange(event.target.value)}
        placeholder="Upload a scan to auto-extract text, or paste/type the student's writing sample here..."
        style={{ minHeight: "85px", height: "95px", padding: "8px 12px", fontSize: "0.88rem" }}
      />

      {!selectedStudentId && (
        <p className="message message-warning" style={{ marginTop: "0.5rem", padding: "6px 10px", fontSize: "0.82rem" }}>
          ⚠️ Please select a student before analyzing a writing sample.
        </p>
      )}

      <div className="form-footer" style={{ marginTop: "auto", paddingTop: "1rem" }}>
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
