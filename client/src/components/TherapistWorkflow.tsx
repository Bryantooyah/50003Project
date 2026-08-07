import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import StudentSelector from "./StudentSelector";
import WritingSampleForm from "./WritingSampleForm";
import WritingSampleBank from "./WritingSampleBank";
import ErrorPatternDashboard from "./ErrorPatternDashboard";
import ErrorTable from "./ErrorTable";
import RecommendationCard from "./RecommendationCard";
import History from "./History";
import LongitudinalView from "./LongitudinalView";
import { getAnalysisArray } from "../services/api";
import {
  analyseWritingSample,
  checkBackendHealth,
  generateRecommendations,
  getTherapistStudents,
  getWritingSampleManifest,
  saveHistory,
} from "../services/api";
import type {
  AnalysisResult,
  Recommendation,
  Student,
  WritingSampleFile,
  WritingSampleManifest,
} from "../types";

type MessageTone = "info" | "success" | "warning" | "error";

type TherapistWorkflowProps = {
  currentUser: { id: string; name: string } | null;
  onLogout: () => void;
};

export default function TherapistWorkflow({
  currentUser,
  onLogout,
}: TherapistWorkflowProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [analysisArray, setAnalysisArray] = useState<AnalysisResult[]>([])
  const [sampleText, setSampleText] = useState("");

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("info");
  const [backendStatus, setBackendStatus] = useState("Backend status unknown");
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);
  const [hasClickedGenerateRecs, setHasClickedGenerateRecs] = useState(false);
  const [isSavingAnalysis, setIsSavingAnalysis] = useState(false);
  const [isAnalysisSaved, setIsAnalysisSaved] = useState(false);

  const [writingSampleManifest, setWritingSampleManifest] =
    useState<WritingSampleManifest | null>(null);

  const [selectedSampleId, setSelectedSampleId] = useState("");
  const [selectedSampleFileName, setSelectedSampleFileName] = useState("");

  function announce(text: string, tone: MessageTone = "info") {
    setMessage(text);
    setMessageTone(tone);
  }

  useEffect(() => {
    async function loadWritingSamples() {
      try {
        const manifest = await getWritingSampleManifest();
        setWritingSampleManifest(manifest);
      } catch {
        announce("Unable to load client writing sample bank.", "error");
      }
    }

    loadWritingSamples();
  }, []);

  // Fetch only students assigned to the logged-in therapist from DB
  useEffect(() => {
    async function loadAssignedStudents() {
      if (currentUser?.id) {
        try {
          const assignedStudents = await getTherapistStudents(currentUser.id);
          setStudents(assignedStudents);
        } catch (err) {
          console.error("Failed to load assigned students:", err);
          announce("Could not load assigned students.", "error");
        }
      }
    }

    loadAssignedStudents();
  }, [currentUser]);

  useEffect(() => {
    async function loadBackendStatus() {
      try {
        const health = await checkBackendHealth();
        if (health.status === "offline") {
          setBackendStatus("Backend server is offline");
        } else if (health.db === "disconnected") {
          setBackendStatus("Database is disconnected");
        } else {
          setBackendStatus("");
        }
      } catch {
        setBackendStatus("Backend server is offline");
      }
    }

    loadBackendStatus();
    const interval = setInterval(loadBackendStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  async function handleSelectStudent(studentId: string) {
    if (studentId === selectedStudentId) return;
    if (studentId == '') {
      setSelectedStudentId(studentId);
      setAnalysisArray([]);
      return;
    }
    setSelectedStudentId(studentId);
    const result = await getAnalysisArray(studentId);
    setAnalysisArray(result);
    // Switching students mid-session must not leave the previous student's
    // sample text or analysis results on screen — that's a real
    // accuracy/reliability risk, not just stale UI.
    if (sampleText || analysis || recommendations.length > 0) {
      setSampleText("");
      setSelectedSampleId("");
      setSelectedSampleFileName("");
      setAnalysis(null);
      setRecommendations([]);
      setIsAnalysisSaved(false);
      setHasClickedGenerateRecs(false);
      announce("Switched student. Previous sample and results were cleared.");
    }
  }

  function handleSelectWritingSample(sample: WritingSampleFile) {
    setSelectedSampleId(sample.id);
    setSelectedSampleFileName(sample.fileName);

    announce(
      `${sample.displayName} selected. Paste OCR/extracted text before running analysis.`
    );
  }

  async function handleAnalyseSample() {
    const wordCount = sampleText.trim()
      ? sampleText.trim().split(/\s+/).length
      : 0;

    if (!selectedStudentId) {
      announce(
        "Please select a student before submitting a writing sample.",
        "error"
      );
      return;
    }

    if (!sampleText.trim()) {
      announce("Writing sample cannot be empty.", "error");
      return;
    }

    if (wordCount < 30) {
      const confirmShortSample = window.confirm(
        "This writing sample is below the recommended 30 words. Continue analysis anyway?"
      );

      if (!confirmShortSample) {
        announce(
          "Analysis cancelled. Please provide a longer writing sample.",
          "warning"
        );
        return;
      }
    }

    try {
      setIsAnalysing(true);
      announce("Analysing writing sample...");

      const result = await analyseWritingSample(selectedStudentId, sampleText);

      setAnalysis({
        ...result,
        selectedSampleFileName,
      });

      setRecommendations([]);
      setHasClickedGenerateRecs(false);
      setIsAnalysisSaved(false);
      announce("Analysis completed successfully.", "success");
    } catch {
      announce(
        "Analysis failed. Please check the backend connection and try again.",
        "error"
      );
    } finally {
      setIsAnalysing(false);
    }
  }

  async function handleGenerateRecommendations() {
    if (!analysis) {
      announce("Run an analysis before generating recommendations.", "error");
      return;
    }

    try {
      setIsGeneratingRecommendations(true);
      setHasClickedGenerateRecs(true);
      announce("Generating recommendations...");
      const generated = await generateRecommendations(analysis);
      setRecommendations(generated);
      
      if (generated.length === 0 || (analysis.errors && analysis.errors.length === 0)) {
        announce("No recommendations generated — no error patterns detected.", "info");
      } else {
        announce("Intervention recommendations generated.", "success");
      }
    } catch {
      announce("Failed to generate recommendations.", "error");
    } finally {
      setIsGeneratingRecommendations(false);
    }
  }

  function handleUpdateRecommendationStatus(
    recommendationId: string,
    status: "accepted" | "rejected"
  ) {
    setRecommendations((current) =>
      current.map((recommendation) =>
        recommendation.id === recommendationId
          ? { ...recommendation, status }
          : recommendation
      )
    );

    announce(`Recommendation ${status}. Therapist feedback recorded.`, "success");
  }

  async function handleSaveAnalysis() {
    if (!currentUser?.id || !analysis) {
      announce("Analysis could not be saved.", "error");
      return;
    }

    try {
      setIsSavingAnalysis(true);
      announce("Saving analysis...");
      const saved = await saveHistory(currentUser.id, analysis, recommendations, "");

      if (saved) {
        setIsAnalysisSaved(true);
        announce("Analysis saved successfully.", "success");
        if (selectedStudentId) {
          try {
            const updated = await getAnalysisArray(selectedStudentId);
            setAnalysisArray(updated);
          } catch (err) {
            console.error("Failed to refresh student analysis history:", err);
          }
        }
      } else {
        announce("Analysis could not be saved.", "error");
      }
    } catch {
      announce("Analysis could not be saved.", "error");
    } finally {
      setIsSavingAnalysis(false);
    }
  };

  const [activeTab, setActiveTab] = useState<"analysis" | "recommendations" | "progress">("analysis");

  return (
    <main>
      <Navbar role="therapist" onLogout={onLogout} />

      <section className="hero" style={{ padding: "0.85rem 2rem", minHeight: "auto" }}>
        <div>
          <h2 style={{ fontSize: "1.35rem", marginBottom: "0.15rem" }}>
            Welcome back, {currentUser?.name || "Therapist"}
          </h2>
          <p style={{ opacity: 0.85, fontSize: "0.88rem", margin: 0 }}>
            Error Pattern Analyzer &amp; Intervention Recommendation Engine
          </p>
        </div>
      </section>

      <div className="page-body" style={{ paddingTop: "1rem" }}>
        {backendStatus ? (
          <div className="message message-error">
            {backendStatus}
          </div>
        ) : message ? (
          <div className={`message message-${messageTone}`}>{message}</div>
        ) : (
          !selectedStudentId && (
            <div className="message message-warning" style={{ padding: "8px 14px", marginBottom: "0.75rem", fontSize: "0.88rem" }}>
              ⚠️ Please select a student to begin.
            </div>
          )
        )}

        {/* Global Top Bar: Student Selection */}
        <section className="card" style={{ marginBottom: "0.85rem", padding: "12px 20px" }}>
          <StudentSelector
            students={students}
            selectedStudentId={selectedStudentId}
            onSelect={handleSelectStudent}
          />
        </section>

        {/* Tab Navigation */}
        <div className="therapist-tabs" style={{ marginBottom: "0.85rem", paddingBottom: "6px" }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === "analysis" ? "active" : ""}`}
            onClick={() => setActiveTab("analysis")}
          >
            Writing Sample &amp; Analysis
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "recommendations" ? "active" : ""}`}
            onClick={() => setActiveTab("recommendations")}
          >
            Intervention Recommendations
            {recommendations.length > 0 && <span className="tab-badge">{recommendations.length}</span>}
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "progress" ? "active" : ""}`}
            onClick={() => setActiveTab("progress")}
          >
            Progress &amp; History
            {analysisArray.length > 0 && <span className="tab-badge">{analysisArray.length}</span>}
          </button>
        </div>

        {/* TAB 1: Writing Sample & Analysis */}
        {activeTab === "analysis" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Input Row: Writing Sample Bank & Submit Form side-by-side (equal height stretch) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.5rem", alignItems: "stretch" }}>
              <WritingSampleBank
                manifest={writingSampleManifest}
                selectedSampleId={selectedSampleId}
                onSelectSample={handleSelectWritingSample}
              />

              <WritingSampleForm
                sampleText={sampleText}
                selectedStudentId={selectedStudentId}
                selectedSampleFileName={selectedSampleFileName}
                isAnalysing={isAnalysing}
                onSampleChange={setSampleText}
                onAnalyse={async () => {
                  await handleAnalyseSample();
                }}
              />
            </div>

            {/* Analysis Results View Below */}
            <div>
              {!analysis ? (
                <section className="card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
                  <h2 style={{ marginBottom: "0.5rem" }}>No Analysis Generated Yet</h2>
                  <p className="muted" style={{ maxWidth: "480px", margin: "0 auto" }}>
                    Select a student, choose or paste a writing sample above, and click <strong>Analyze Writing Sample</strong>.
                  </p>
                </section>
              ) : (
                <>
                  <p className="results-for">
                    Showing results for{" "}
                    <strong>
                      {students.find((student) => student.id === analysis.studentId)
                        ?.name ?? "unknown student"}
                    </strong>
                  </p>

                  <ErrorPatternDashboard analysis={analysis} />
                  <ErrorTable errors={analysis.errors} />

                  {analysis.llmOutput && (
                    <section className="card">
                      <h2>AI Analysis Notes</h2>
                      <p className="muted">
                        Response generated from the backend LLM analysis endpoint.
                      </p>
                      <div className="llm-output">{analysis.llmOutput}</div>
                    </section>
                  )}

                  <section className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                      <h3 style={{ margin: 0 }}>Next Step: Recommendations</h3>
                      <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>Generate evidence-based intervention strategies for this student.</p>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        handleGenerateRecommendations();
                        setActiveTab("recommendations");
                      }}
                      disabled={isGeneratingRecommendations}
                    >
                      View Intervention Recommendations ➔
                    </button>
                  </section>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Intervention Recommendations */}
        {activeTab === "recommendations" && (
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <section className="card">
              <h2>Intervention Recommendations</h2>
              <p className="muted">
                Recommendations are generated based on detected error categories and severity.
              </p>

              <button
                className="btn btn-primary"
                onClick={handleGenerateRecommendations}
                disabled={isGeneratingRecommendations || !analysis}
                style={{ marginBottom: "1.5rem" }}
              >
                {isGeneratingRecommendations
                  ? "Generating recommendations..."
                  : hasClickedGenerateRecs && recommendations.length === 0
                    ? "No recommendations generated"
                    : recommendations.length > 0
                      ? "✓ Recommendations generated (Click to regenerate)"
                      : "Generate recommendations"}
              </button>

              {!analysis && (
                <div className="message message-warning" style={{ marginTop: "1rem" }}>
                  ⚠️ Run an analysis on a writing sample first to generate intervention recommendations.
                </div>
              )}

              {hasClickedGenerateRecs && !isGeneratingRecommendations && recommendations.length === 0 && analysis && (
                <div className="message message-info" style={{ marginTop: "1rem", textAlign: "center", padding: "1.25rem" }}>
                  No recommendations generated. No error patterns were detected in this student's writing sample.
                </div>
              )}

              {recommendations.length > 0 && (
                <div className="recommendation-list">
                  {recommendations.map((recommendation) => (
                    <RecommendationCard
                      key={recommendation.id}
                      recommendation={recommendation}
                      onUpdateStatus={handleUpdateRecommendationStatus}
                    />
                  ))}
                </div>
              )}
            </section>

            {analysis && (
              <section className="card" style={{ marginTop: "1.5rem" }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveAnalysis}
                  disabled={isSavingAnalysis || isAnalysisSaved}
                  style={{ width: "100%" }}
                >
                  {isSavingAnalysis
                    ? "Saving analysis..."
                    : isAnalysisSaved
                      ? "✓ Analysis saved"
                      : "Save analysis"}
                </button>
              </section>
            )}
          </div>
        )}

        {/* TAB 3: Progress & History */}
        {activeTab === "progress" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {analysisArray.length > 2 ? (
              <LongitudinalView analysis={analysisArray} />
            ) : (
              <section className="card">
                <h2>Not enough analysis performed yet</h2>
                <p>
                  A minimum of 3 saved analyses is required to unlock longitudinal progress tracking ({analysisArray.length}/3 completed).
                </p>
                <p className="muted" style={{ marginTop: "0.5rem" }}>
                  Please submit and save <strong>{3 - analysisArray.length}</strong> more writing sample {3 - analysisArray.length === 1 ? "analysis" : "analyses"} for this student.
                </p>
              </section>
            )}

            <History
              students={students}
              selectedStudentId={selectedStudentId}
            />
          </div>
        )}
      </div>
    </main>
  );
}
