import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

type LoggedInUser = {
  id: string;
  name: string;
  role: "admin" | "therapist" | "student";
};

type LoginPageProps = {
  onLoginSuccess: (user: LoggedInUser) => void;
};

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const navigate = useNavigate();

  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  async function handleFormLogin(event: FormEvent) {
    event.preventDefault();
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

      localStorage.setItem("userId", data.user.id);
      localStorage.setItem("userRole", data.user.role);
      onLoginSuccess(data.user);
      navigate(`/${data.user.role}`, { replace: true });
    } catch (err: any) {
      setLoginError(
        err.message || "Unable to log in. Please check credentials."
      );
    } finally {
      setIsLoggingIn(false);
    }
  }

  function handleDemoAdminLogin() {
    localStorage.setItem("userId", "demo-admin");
    localStorage.setItem("userRole", "admin");
    const demoUser: LoggedInUser = {
      id: "demo-admin",
      name: "Admin Demo",
      role: "admin",
    };
    onLoginSuccess(demoUser);
    navigate("/admin", { replace: true });
  }

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
            Sign in to access student writing analysis, error pattern
            reports, and intervention recommendations.
          </p>

          {loginError && (
            <div
              style={{
                color: "#d9534f",
                fontWeight: "bold",
                marginBottom: "1rem",
              }}
            >
              {loginError}
            </div>
          )}

          <form
            onSubmit={handleFormLogin}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.25rem",
                  fontWeight: "bold",
                }}
              >
                Username / Email
              </label>
              <input
                type="text"
                placeholder="Enter username (e.g. admin1 or therapist1)"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.25rem",
                  fontWeight: "bold",
                }}
              >
                Password
              </label>
              <input
                type="password"
                placeholder="Enter password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                }}
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
