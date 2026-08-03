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
        setBackendStatus(`Backend: ${health.status}, Database: ${health.db}`);
      } catch {
        setBackendStatus("Backend unavailable");
      }
    }

    loadBackendStatus();
  }, []);

  async function handleSelectStudent(studentId: string) {
    if (studentId === selectedStudentId) return;
    if (studentId == ''){
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

    const generated = await generateRecommendations(analysis);
    setRecommendations(generated);
    announce("Intervention recommendations generated.", "success");
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

    const saved = await saveHistory(currentUser.id, analysis, recommendations, "");

    if (saved) {
      announce("Analysis saved.", "success");
    } else {
      announce("Analysis could not be saved.", "error");
    }
  }

  return (
    <main>
      <Navbar role="therapist" onLogout={onLogout} />

      <section className="hero">
        <div>
          <h2>Error Pattern Analyzer &amp; Intervention Recommendation Engine</h2>
          <p>
            UC2 frontend workflow: submit a student writing sample, validate
            the input, call backend analysis, and display diagnostic results
            for therapist review.
          </p>
        </div>

        <div className="status-pill">{backendStatus}</div>
      </section>

      <div className="page-body">
        {message && (
          <div className={`message message-${messageTone}`}>{message}</div>
        )}

        <div className="layout">
          <div className="left-column">
            <StudentSelector
              students={students}
              selectedStudentId={selectedStudentId}
              onSelect={handleSelectStudent}
            />

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
              onAnalyse={handleAnalyseSample}
            />
          </div>

          <div className="right-column">
            {analysisArray.length > 2  &&(
              <LongitudinalView analysis={analysisArray} />)}
              {analysisArray.length < 3 && (
                <section className="card">
                <h2>Not enough analysis performed yet</h2>
                <p>Please submit document/text and perform analysis</p>
                </section>
              )}
            {!analysis && (
              <History
                students={students}
                selectedStudentId={selectedStudentId}
              />
            )}

            {analysis && (
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
                    <h2>AI analysis notes</h2>
                    <p className="muted">
                      Response generated from the backend LLM analysis
                      endpoint.
                    </p>
                    <div className="llm-output">{analysis.llmOutput}</div>
                  </section>
                )}

                <section className="card">
                  <h2>Proceed to UC3: Intervention recommendations</h2>
                  <p className="muted">
                    Recommendations are generated based on detected error
                    categories and severity.
                  </p>

                  <button
                    className="btn btn-primary"
                    onClick={handleGenerateRecommendations}
                  >
                    Generate recommendations
                  </button>

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

                <section className="card">
                  <button className="btn btn-primary" onClick={handleSaveAnalysis}>
                    Save analysis
                  </button>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
