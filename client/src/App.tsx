import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import StudentSelector from "./components/StudentSelector";
import WritingSampleForm from "./components/WritingSampleForm";
import ErrorSummary from "./components/ErrorSummary";
import ErrorTable from "./components/ErrorTable";
import RecommendationCard from "./components/RecommendationCard";
import {
  analyseWritingSample,
  generateRecommendations,
  getStudents,
} from "./services/api";
import type { AnalysisResult, Recommendation, Student } from "./types";
import "./index.css";
import LoginPage from "./components/LoginPage";
import { checkBackendHealth, analyseWithLLM } from "./services/backendApi";
import ErrorPatternDashboard from "./components/ErrorPatternDashboard";


export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [sampleText, setSampleText] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [message, setMessage] = useState("");
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] =
    useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<"therapist" | "admin" | null>(null);
  const [backendStatus, setBackendStatus] = useState<string>("Checking backend...");
  const [llmOutput, setLlmOutput] = useState<string>("");

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



  const selectedStudent = students.find(
    (student) => student.id === selectedStudentId
  );

  const handleAnalyse = async () => {
    setMessage("");

    if (!selectedStudentId) {
      setMessage("Please select a student before submitting a writing sample.");
      return;
    }

    if (!sampleText.trim()) {
      setMessage("Writing sample cannot be empty.");
      return;
    }

    const wordCount = sampleText.trim().split(/\s+/).length;

    if (wordCount < 30) {
      setMessage(
        "Warning: Sample is under 30 words. For this demo, analysis will still proceed."
      );
    }

    try {
      setIsAnalysing(true);

      const result = await analyseWritingSample(selectedStudentId, sampleText);
      setAnalysis(result);
      setRecommendations([]);
      try {
            const output = await analyseWithLLM(sampleText);
            setLlmOutput(output);
          } catch {
            setLlmOutput("LLM backend analysis unavailable. Showing mock structured analysis only.");
          }
    } catch (error) {
      setMessage("Analysis failed. Please try again.");
    } finally {
      setIsAnalysing(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    if (!analysis) {
      setMessage("Generate an analysis before requesting recommendations.");
      return;
    }
    const generated = await generateRecommendations(analysis);
    setRecommendations(generated);
    setMessage("Intervention recommendations generated.");

    try {
      setIsGeneratingRecommendations(true);
      const result = await generateRecommendations(analysis.id);
      setRecommendations(result);
      setMessage("Recommendations generated successfully.");
    } catch (error) {
      setMessage("Recommendation generation failed. Please try again.");
    } finally {
      setIsGeneratingRecommendations(false);
    }
  };

  const handleUpdateRecommendationStatus = (
    recommendationId: string,
    status: "accepted" | "rejected"
  ) => {
    setRecommendations((currentRecommendations) =>
      currentRecommendations.map((recommendation) =>
        recommendation.id === recommendationId
          ? { ...recommendation, status }
          : recommendation
      )
    );

    setMessage(`Recommendation ${status}. Feedback signal logged.`);
  };

  if (!isLoggedIn) {
    return (
      <LoginPage
        onLogin={(role) => {
          setUserRole(role);
          setIsLoggedIn(true);
        }}
      />
    );
  }

  return (
    <main>
      <div className="top-bar">
        <Navbar />

        <div className="session-controls">
          <span>Logged in as {userRole}</span>
          <button
            className="logout-button"
            onClick={() => {
              setIsLoggedIn(false);
              setUserRole(null);
            }}
          >
            Log Out
          </button>
        </div>
      </div>

      <section className="hero">
        <h2>Error Pattern Analyzer & Intervention Recommendation Engine</h2>
        <p>
          Frontend prototype for DAS D.I.A.L Problem Statements 4 and 6. This
          demo uses mock analysis data while the backend API is under
          development.
        </p>

        <p className="muted">{backendStatus}</p>
      </section>

      {message && <div className="message">{message}</div>}

      <div className="layout">
        <div className="left-column">
          <StudentSelector
            students={students}
            selectedStudentId={selectedStudentId}
            onSelect={setSelectedStudentId}
          />

          {selectedStudent && (
            <section className="card">
              <h2>Selected Student</h2>
              <p>
                <strong>Name:</strong> {selectedStudent.name}
              </p>
              <p>
                <strong>Level:</strong> {selectedStudent.level}
              </p>
              <p>
                <strong>Assigned Therapist:</strong>{" "}
                {selectedStudent.assignedTherapist}
              </p>
            </section>
          )}

          <WritingSampleForm
            sampleText={sampleText}
            setSampleText={setSampleText}
            onAnalyse={handleAnalyse}
            isLoading={isAnalysing}
          />
        </div>

        <div className="right-column">
          {!analysis && (
            <section className="empty-state">
              <h2>No analysis yet</h2>
              <p>
                Submit a writing sample to view error categories and
                recommended interventions.
              </p>
            </section>
          )}

          {analysis && (
            <>
              <ErrorSummary analysis={analysis} />
              <ErrorTable errors={analysis.errors} />
              <ErrorPatternDashboard analysis={analysis} />
              {llmOutput && (
                  <section className="card">
                    <h2>AI Analysis Notes</h2>
                    <p className="muted">
                      Response generated from the backend LLM analysis endpoint.
                    </p>
                    <div className="llm-output">
                      {llmOutput}
                    </div>
                  </section>
                )}

              <section className="card">
                <h2>Intervention Recommendations</h2>
                <p className="muted">
                  Recommendations are generated based on detected error
                  categories and severity.
                </p>

                <button className="primary-button" onClick={handleGenerateRecommendations}>
                  Generate Recommendations
                </button>
              </section>

              {recommendations.length > 0 && (
                <section className="recommendations-list">
                  {recommendations.map((recommendation) => (
                    <RecommendationCard
                      key={recommendation.id}
                      recommendation={recommendation}
                      onUpdateStatus={handleUpdateRecommendationStatus}
                    />
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}