import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import StudentSelector from "./components/StudentSelector";
import WritingSampleForm from "./components/WritingSampleForm";
import ErrorPatternDashboard from "./components/ErrorPatternDashboard";
import ErrorTable from "./components/ErrorTable";
import RecommendationCard from "./components/RecommendationCard";
import { AdminDashboard } from "./components/AdminDashboard";
import History from "./components/History";
import LoginPage from "./components/LoginPage";
import {
  analyseWritingSample,
  generateRecommendations,
  getTherapistStudents,
  saveHistory,
} from "./services/api";
import type {
  AnalysisResult,
  Recommendation,
  Student,
} from "./types";

type UserRole = "therapist" | "admin" | "student";
type MessageTone = "info" | "success" | "warning" | "error";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<UserRole>("therapist");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // App Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [sampleText, setSampleText] = useState("");

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("info");
  const [isAnalysing, setIsAnalysing] = useState(false);

  function announce(text: string, tone: MessageTone = "info") {
    setMessage(text);
    setMessageTone(tone);
  }

  // Restore user session on mount
  useEffect(() => {
    const savedUserId = localStorage.getItem("userId");
    const savedUserRole = localStorage.getItem("userRole") as UserRole | null;
    const savedUsername = localStorage.getItem("username");
    const savedName = localStorage.getItem("name");

    if (savedUserId && savedUserRole) {
      setCurrentUser({
        id: savedUserId,
        role: savedUserRole,
        username: savedUsername || "",
        name: savedName || savedUserRole,
      });
      setRole(savedUserRole);
      setIsLoggedIn(true);
    }
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

  // Handle Login Callback from <LoginPage />
  const handleLogin = (user: any) => {
    localStorage.setItem("userId", user.id);
    localStorage.setItem("userRole", user.role);
    if (user.username) localStorage.setItem("username", user.username);
    if (user.name) localStorage.setItem("name", user.name);

    setCurrentUser(user);
    setRole(user.role as UserRole);
    setIsLoggedIn(true);
    announce(`Welcome, ${user.name}! Logged in as ${user.role}.`, "success");
  };

  function handleLogout() {
    localStorage.clear();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setSelectedStudentId("");
    setSampleText("");
    setAnalysis(null);
    setRecommendations([]);
    setMessage("");
  }

  function handleSelectStudent(studentId: string) {
    if (studentId === selectedStudentId) return;

    setSelectedStudentId(studentId);

    if (sampleText || analysis || recommendations.length > 0) {
      setSampleText("");
      setAnalysis(null);
      setRecommendations([]);
      announce("Switched student. Previous sample and results were cleared.");
    }
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

      setAnalysis(result);
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

  async function handleSaveAnalysis() {
    if (currentUser?.id && analysis != null) {
      const therapistId: string = currentUser.id;
      if (await saveHistory(therapistId, analysis, recommendations, "")) {
        alert("Analysis saved!");
      } else {
        alert("Analysis could not be saved.");
      }
    } else {
      alert("Analysis could not be saved.");
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

  // 1. RENDER LOGIN SCREEN IF NOT LOGGED IN
  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // 2. RENDER MAIN APP AFTER LOGGING IN
  return (
    <main>
      <Navbar role={role} onLogout={handleLogout} />

      {/* RENDER ADMIN DASHBOARD OR THERAPIST WORKFLOW */}
      {role === "admin" ? (
        <AdminDashboard />
      ) : role === "therapist" ? (
        <>
          {message && <div className={`message message-${messageTone}`}>{message}</div>}

          <div className="layout">
            <div className="left-column">
              <StudentSelector
                students={students}
                selectedStudentId={selectedStudentId}
                onSelect={handleSelectStudent}
              />

              <WritingSampleForm
                sampleText={sampleText}
                selectedStudentId={selectedStudentId}
                selectedSampleFileName=""
                isAnalysing={isAnalysing}
                onSampleChange={setSampleText}
                onAnalyse={handleAnalyseSample}
              />
            </div>

            <div className="right-column">
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
                      {students.find((s) => s.id === analysis.studentId)?.name ?? "unknown student"}
                    </strong>
                  </p>

                  {!analysis.backendAvailable && (
                    <div className="message message-warning">
                      The analysis backend was unreachable when this sample was submitted.
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
                  <section className="card">
                    <button
                      className="primary-button"
                      onClick={handleSaveAnalysis}
                    >
                      Save Analysis
                    </button>
                  </section>
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        /* student role placeholder */
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Student View</h2>
          <p>Welcome, student!</p>
        </div>
      )}
    </main>
  );
}

export default App;