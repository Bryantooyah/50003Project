import { useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { extractTextFromImage } from "../services/api";
import { ACCEPTED_UPLOAD_EXTENSIONS, ACCEPTED_UPLOAD_TYPES } from "../types";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface WritingSampleFormProps {
  sampleText: string;
  selectedStudentId: string;
  selectedSampleFileName?: string;
  isAnalysing: boolean;
  onSampleChange: (value: string) => void;
  onAnalyse: () => void;
}

type OcrPageResult = {
  text: string;
  source: "backend" | "tesseract";
  confidence?: number;
};

// Renders each page of a PDF to a PNG image in the browser, so the existing
// image based OCR pipeline (backend vision model, or the Tesseract fallback)
// can be reused as is, rather than needing a separate PDF specific path on
// the backend.
async function rasterizePdfToImages(file: File): Promise<File[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: File[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    if (!context) continue;

    await page.render({ canvas, canvasContext: context, viewport }).promise;

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    );

    if (blob) {
      const baseName = file.name.replace(/\.pdf$/i, "");
      images.push(new File([blob], `${baseName}-page-${pageNum}.png`, { type: "image/png" }));
    }
  }

  return images;
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
  const [ocrStatusText, setOcrStatusText] = useState("Extracting text from image");
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

  async function extractTextFromSingleImageFile(
    file: File,
    onProgress: (pct: number) => void
  ): Promise<OcrPageResult> {
    const backendResult = await extractTextFromImage(file);

    if (backendResult.backendAvailable) {
      onProgress(100);
      return { text: backendResult.text.trim(), source: "backend" };
    }

    const result = await Tesseract.recognize(file, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });

    return {
      text: result.data.text.trim(),
      source: "tesseract",
      confidence: result.data.confidence,
    };
  }

  function reportSinglePageResult(result: OcrPageResult) {
    if (!result.text) {
      setOcrError(
        "No text could be detected in this image, and the AI extraction service may be unavailable. Please transcribe it manually below."
      );
      return;
    }

    if (result.source === "tesseract") {
      if (result.confidence !== undefined && result.confidence < 60) {
        setOcrError(
          `AI extraction is unavailable, and the local fallback's confidence is low (${Math.round(result.confidence)}%) — this is common with handwritten samples. The extracted text has been added below, but please review it carefully against the original scan and correct it before analysing.`
        );
      } else {
        setOcrError(
          "AI-based text extraction is unavailable — using a lower-accuracy local fallback instead. Please review the result carefully."
        );
      }
    }

    onSampleChange(result.text);
  }

  async function runImageOcr(file: File) {
    setIsExtractingText(true);
    setOcrProgress(0);
    setOcrError("");
    setOcrStatusText("Extracting text from image");

    try {
      const result = await extractTextFromSingleImageFile(file, setOcrProgress);
      reportSinglePageResult(result);
    } catch (err) {
      console.error("OCR failed:", err);
      setOcrError(
        "Text extraction failed. Please transcribe the sample manually below."
      );
    } finally {
      setIsExtractingText(false);
    }
  }

  async function runPdfOcr(file: File) {
    setIsExtractingText(true);
    setOcrProgress(0);
    setOcrError("");
    setOcrStatusText("Loading PDF");

    try {
      const pageImages = await rasterizePdfToImages(file);

      if (pageImages.length === 0) {
        setOcrError(
          "This PDF has no pages that could be read. Please transcribe it manually below."
        );
        return;
      }

      const pageTexts: string[] = [];
      let usedFallbackOnAnyPage = false;
      let lowestFallbackConfidence: number | null = null;

      for (let i = 0; i < pageImages.length; i++) {
        setOcrStatusText(
          pageImages.length === 1
            ? "Extracting text from page"
            : `Extracting text from page ${i + 1} of ${pageImages.length}`
        );
        setOcrProgress(0);

        const result = await extractTextFromSingleImageFile(pageImages[i], setOcrProgress);
        pageTexts.push(result.text);

        if (result.source === "tesseract") {
          usedFallbackOnAnyPage = true;
          if (
            result.confidence !== undefined &&
            (lowestFallbackConfidence === null || result.confidence < lowestFallbackConfidence)
          ) {
            lowestFallbackConfidence = result.confidence;
          }
        }
      }

      const combinedText =
        pageImages.length === 1
          ? pageTexts[0]
          : pageTexts
              .map((text, i) => `--- Page ${i + 1} ---\n${text || "(no text detected on this page)"}`)
              .join("\n\n");

      if (!pageTexts.some((t) => t.trim())) {
        setOcrError(
          "No text could be detected in this PDF. Please transcribe it manually below."
        );
        return;
      }

      onSampleChange(combinedText);

      if (usedFallbackOnAnyPage) {
        const confidenceNote =
          lowestFallbackConfidence !== null && lowestFallbackConfidence < 60
            ? ` The lowest confidence fallback page was only ${Math.round(lowestFallbackConfidence)}% confident.`
            : "";
        setOcrError(
          `AI-based text extraction was unavailable for at least one page of this PDF, so a lower-accuracy local fallback was used for it.${confidenceNote} Please review the combined text carefully, especially any page marked above.`
        );
      }
    } catch (err) {
      console.error("PDF OCR failed:", err);
      setOcrError(
        "Could not process this PDF for text extraction. Please transcribe it manually below."
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
      runPdfOcr(file);
    } else {
      runImageOcr(file);
    }
  }

  return (
    <section className="card" style={{ height: "100%", display: "flex", flexDirection: "column", padding: "16px 20px" }}>
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.2rem" }}>Submit Student Writing Sample</h2>
      <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
        Upload a scanned writing sample, image or PDF, to extract text
        automatically, or select a reference sample below, then review the
        transcription before analysis.
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
          {ocrStatusText}... {ocrProgress}%
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
