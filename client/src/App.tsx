import "./App.css";
import { useEffect, useState } from "react";
import StudentSelector from "./components/StudentSelector";
import WritingSampleForm from "./components/WritingSampleForm";
import ErrorSummary from "./components/ErrorSummary";
import ErrorTable from "./components/ErrorTable";
import RecommendationCard from "./components/RecommendationCard";
import {
  analyseWritingSample,
  checkBackendHealth,
  generateRecommendations,
  getStudents,
} from "./services/api";
import type { AnalysisResult, Recommendation, Student } from "./types";
import WritingSampleBank from "./components/WritingSampleBank";
import { getWritingSampleManifest } from "./services/api";
import type { WritingSampleFile, WritingSampleManifest } from "./types";

type UserRole = "therapist" | "admin";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<UserRole>("therapist");

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [sampleText, setSampleText] = useState("");

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const [message, setMessage] = useState("");
  const [backendStatus, setBackendStatus] = useState("Backend status unknown");
  const [isAnalysing, setIsAnalysing] = useState(false);

  const [writingSampleManifest, setWritingSampleManifest] =
    useState<WritingSampleManifest | null>(null);

  const [selectedSampleId, setSelectedSampleId] = useState("");
  const [selectedSampleFileName, setSelectedSampleFileName] = useState("");

  useEffect(() => {
    async function loadWritingSamples() {
      try {
        const manifest = await getWritingSampleManifest();
        setWritingSampleManifest(manifest);
      } catch {
        setMessage("Unable to load client writing sample bank.");
      }
    }

    loadWritingSamples();
  }, []);

  useEffect(() => {
    async function loadStudents() {
      const data = await getStudents();
      setStudents(data);
    }

    loadStudents();
  }, []);

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

  function handleLogin(selectedRole: UserRole) {
    setRole(selectedRole);
    setIsLoggedIn(true);
    setMessage(`Logged in as ${selectedRole}.`);
  }

  function handleLogout() {
    setIsLoggedIn(false);
    setSelectedStudentId("");
    setSampleText("");
    setAnalysis(null);
    setRecommendations([]);
    setMessage("");
  }

  function handleSelectWritingSample(sample: WritingSampleFile) {
    setSelectedSampleId(sample.id);
    setSelectedSampleFileName(sample.fileName);

    setMessage(
      `${sample.displayName} selected. Paste OCR/extracted text before running analysis.`
    );
  }

  async function handleAnalyseSample() {
    const wordCount = sampleText.trim()
      ? sampleText.trim().split(/\s+/).length
      : 0;

    if (!selectedStudentId) {
      setMessage("Please select a student before submitting a writing sample.");
      return;
    }

    if (!sampleText.trim()) {
      setMessage("Writing sample cannot be empty.");
      return;
    }

    if (wordCount < 30) {
      const confirmShortSample = window.confirm(
        "This writing sample is below the recommended 30 words. Continue analysis anyway?"
      );

      if (!confirmShortSample) {
        setMessage(
          "Analysis cancelled. Please provide a longer writing sample."
        );
        return;
      }
    }

    try {
      setIsAnalysing(true);
      setMessage("Analysing writing sample...");

      const result = await analyseWritingSample(selectedStudentId, sampleText);

      setAnalysis({
        ...result,
        selectedSampleFileName,
      });

      setRecommendations([]);
      setMessage("Analysis completed successfully.");
    } catch {
      setMessage(
        "Analysis failed. Please check the backend connection and try again."
      );
    } finally {
      setIsAnalysing(false);
    }
  }

  async function handleGenerateRecommendations() {
    if (!analysis) {
      setMessage("Run an analysis before generating recommendations.");
      return;
    }

    const generated = await generateRecommendations(analysis);
    setRecommendations(generated);
    setMessage("Intervention recommendations generated.");
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

    setMessage(`Recommendation ${status}. Therapist feedback recorded.`);
  }

  if (!isLoggedIn) {
    return (
      <main className="login-page">
        <section className="login-left">
          <div className="brand-row">
            <div className="brand-icon">✦</div>
            <div>
              <h1>D.I.A.L</h1>
              <p>DAS Individualised AI-Based Learning System</p>
            </div>
          </div>

          <div className="login-content">
            <h2>Welcome back</h2>
            <p>
              Sign in to access student writing analysis, error pattern reports,
              and intervention recommendations.
            </p>

            <label>Email</label>
            <input value="therapist@das.org.sg" readOnly />

            <label>Password</label>
            <input value="password" type="password" readOnly />

            <button
              className="primary-button"
              onClick={() => handleLogin("therapist")}
            >
              Log In as Therapist
            </button>

            <button
              className="secondary-button"
              onClick={() => handleLogin("admin")}
            >
              Continue as Admin Demo
            </button>
          </div>
        </section>

        <section className="login-right">
          <div className="project-card">
            <span>PROJECT 2026</span>
            <h2>Error Pattern Analyzer</h2>
            <p>
              Helping Educational Therapists review student writing samples,
              identify recurring error patterns, and generate targeted
              intervention strategies.
            </p>
          </div>

          <div className="uc-card">
            <strong>UC2</strong>
            <span>Submit writing samples for analysis</span>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <header className="app-header">
        <div className="brand-row">
          <div className="brand-icon">✦</div>
          <div>
            <h1>D.I.A.L</h1>
            <p>DAS Individualised AI-Based Learning System</p>
          </div>
        </div>

        <div className="header-actions">
          <span>PROJECT 2026</span>
          <p>Logged in as {role}</p>
          <button onClick={handleLogout}>Log Out</button>
        </div>
      </header>

      <section className="hero">
        <div>
          <h2>Error Pattern Analyzer & Intervention Recommendation Engine</h2>
          <p>
            UC2 frontend workflow: submit a student writing sample, validate the
            input, call backend analysis, and display diagnostic results for
            therapist review.
          </p>
        </div>

        <div className="status-pill">{backendStatus}</div>
      </section>

      {message && <div className="message">{message}</div>}

      <div className="layout">
        <div className="left-column">
          <StudentSelector
            students={students}
            selectedStudentId={selectedStudentId}
            onSelect={setSelectedStudentId}
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
          {!analysis && (
            <section className="empty-state">
              <h2>No analysis yet</h2>
              <p>
                Submit a writing sample to view error categories, AI analysis
                notes, and diagnostic recommendations.
              </p>
            </section>
          )}

          {analysis && (
            <>
              <ErrorSummary analysis={analysis} />
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

              <section className="card">
                <h2>Proceed to UC3: Intervention Recommendations</h2>
                <p className="muted">
                  Recommendations are generated based on detected error
                  categories and severity.
                </p>

                <button
                  className="primary-button"
                  onClick={handleGenerateRecommendations}
                >
                  Generate Recommendations
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
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default App;