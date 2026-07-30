import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import StudentSelector from "./components/StudentSelector";
import WritingSampleForm from "./components/WritingSampleForm";
import ErrorPatternDashboard from "./components/ErrorPatternDashboard";
import ErrorTable from "./components/ErrorTable";
import RecommendationCard from "./components/RecommendationCard";
import WritingSampleBank from "./components/WritingSampleBank";
import { AdminDashboard } from "./components/AdminDashboard";
import LongitudinalView from "./components/LongitudinalView";
import {
  analyseWritingSample,
  checkBackendHealth,
  generateRecommendations,
  getWritingSampleManifest,
  getTherapistStudents,
} from "./services/api";
import { mockAnalysisArray } from "./data/mockData";
import type {
  AnalysisResult,
  Recommendation,
  Student,
  WritingSampleFile,
  WritingSampleManifest,
} from "./types";

type UserRole = "therapist" | "admin";
type MessageTone = "info" | "success" | "warning" | "error";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<UserRole>("therapist");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Dynamic Login Input States
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [analysisArray, setAnalysisArray] = useState<AnalysisResult[]>([])
  // App Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
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
      if (isLoggedIn && role === "therapist" && currentUser?.id) {
        try {
          const assignedStudents = await getTherapistStudents(currentUser.id);
          setStudents(assignedStudents);
        } catch (err) {
          console.error("Failed to load assigned students:", err);
          setMessage("Could not load assigned students.");
        }
      }
    }

    loadAssignedStudents();
  }, [isLoggedIn, role, currentUser]);

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

  // Real Backend Login Handler
  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const res = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameInput,
          password: passwordInput,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Successful login from database
      localStorage.setItem("userId", data.user.id);
      localStorage.setItem("userRole", data.user.role);
      setCurrentUser(data.user);
      setRole(data.user.role as UserRole);
      setIsLoggedIn(true);selectedStudentId
      setMessage(`Welcome, ${data.user.name}! Logged in as ${data.user.role}.`);
    } catch (err: any) {
      setLoginError(err.message || "Unable to log in. Please check credentials.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Demo Admin Login Shortcut
  function handleDemoAdminLogin() {
    localStorage.setItem("userId", "demo-admin");
    localStorage.setItem("userRole", "admin");
    setRole("admin");
    setCurrentUser({ id: "demo-admin", name: "Admin Demo", role: "admin" });
    setIsLoggedIn(true);
    announce(`Logged in as admin (Demo Mode).`, "success");
  }

  function handleLogout() {
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    setIsLoggedIn(false);
    setCurrentUser(null);
    setUsernameInput("");
    setPasswordInput("");
    setLoginError("");
    setSelectedStudentId("");
    setSampleText("");
    setAnalysis(null);
    setRecommendations([]);
    setMessage("");
  }

  function handleSelectStudent(studentId: string) {
    if (studentId === selectedStudentId) return;

    setSelectedStudentId(studentId);

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

      // Be honest with the therapist about whether this came from the real
      // backend/LLM or a fallback demo response — this used to always say
      // "completed successfully" even when the backend call had failed.
      if (result.backendAvailable) {
        announce("Analysis completed successfully.", "success");
      } else {
        announce(
          "Backend analysis service is unavailable. Showing fallback demo results — this is not live LLM output.",
          "warning"
        );
      }
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

  // 1. RENDER LOGIN SCREEN IF NOT LOGGED IN
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

            {loginError && (
              <div style={{ color: "#d9534f", fontWeight: "bold", marginBottom: "1rem" }}>
                {loginError}
              </div>
            )}

            <form onSubmit={handleFormLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>
                  Username / Email
                </label>
                <input
                  type="text"
                  placeholder="Enter username (e.g. admin1 or therapist1)"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
                />
              </div>

              <button
                type="submit"
                className="primary-button"
                disabled={isLoggingIn}
                style={{ cursor: "pointer", marginTop: "0.5rem" }}
              >
                {isLoggingIn ? "Logging in..." : "Log In"}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={handleDemoAdminLogin}
                style={{ cursor: "pointer" }}
              >
                Continue as Admin Demo
              </button>
            </form>
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

  // 2. RENDER MAIN APP AFTER LOGGING IN
  return (
    <main>
      <Navbar role={role} onLogout={handleLogout} />

      {/* RENDER ADMIN DASHBOARD OR THERAPIST WORKFLOW */}
      {role === "admin" ? (
        <AdminDashboard />
      ) : (
        <>
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

          {message && <div className={`message message-${messageTone}`}>{message}</div>}

          <div className="layout">
            <div className="left-column">
              <StudentSelector
                students={students}
                selectedStudentId={selectedStudentId}
                onSelect={setSelectedStudentId}
                onSelect2={setAnalysisArray}
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

              {/* uncomment the below line when want to use non mockData */}


              {/* {analysisArray.length > 2  &&(
              <LongitudinalView analysis={analysisArray} />)}
              {analysisArray.length < 3 && (
              <section className="empty-state">
                  <h2>Not enough analysis performed yet</h2>
                  <p>
                    Please submit document/text and perform analysis
                  </p>
                </section>)} */}
              <LongitudinalView analysis={mockAnalysisArray} />
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
                <p className="results-for">
                    Showing results for{" "}
                    <strong>
                      {students.find((s) => s.id === analysis.studentId)?.name ?? "unknown student"}
                    </strong>
                  </p>

                  {!analysis.backendAvailable && (
                    <div className="message message-warning">
                      This result is fallback demo data — the analysis backend was
                      unreachable when this sample was submitted.
                    </div>
                  )}
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
        </>
      )}
    </main>
  );
}

export default App;
