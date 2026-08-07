import { useEffect, useState } from "react";
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

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

const SLIDESHOW_IMAGES = [
  { src: "/login-student.png", alt: "Student learning on laptop" },
  { src: "/login-student-2.png", alt: "Student writing in notebook" },
  { src: "/login-student-3.png", alt: "Student studying with tablet" },
];

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const navigate = useNavigate();

  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDESHOW_IMAGES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  async function handleFormLogin(event: FormEvent) {
    event.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
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

      if (data.user.role === "student") {
        setLoginError(
          "Student accounts do not have access to this application."
        );
        return;
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

  return (
    <main className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="brand-row">
            <div className="brand-icon">✦</div>
            <div>
              <h1>D.I.A.L</h1>
              <p>DAS Individualised AI-Based Learning System</p>
            </div>
          </div>

          <div className="login-content">
            <h2>Welcome back</h2>
            <p className="login-subtitle">
              Sign in to access student writing analysis, error pattern
              reports, and intervention recommendations.
            </p>

            {loginError && (
              <div className="message message-error" style={{ marginBottom: "1.25rem" }}>
                {loginError}
              </div>
            )}

            <form onSubmit={handleFormLogin} className="login-form">
              <div className="input-group">
                <label htmlFor="username">Username / Email</label>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter username (e.g. admin or therapist1)"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary login-btn"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? "Logging in..." : "Log In"}
              </button>
            </form>
          </div>
        </div>

        <div className="login-visual-panel">
          {SLIDESHOW_IMAGES.map((img, index) => (
            <img
              key={img.src}
              src={img.src}
              alt={img.alt}
              className={`login-hero-img ${index === currentSlide ? "active" : ""}`}
            />
          ))}

          <div className="visual-quote-tagline">
            <span className="quote-accent">DAS Mission</span>
            <p>“Empowering those who learn differently, including those with dyslexia, to achieve their true potential.”</p>
          </div>

          <div className="slideshow-dots">
            {SLIDESHOW_IMAGES.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`dot ${index === currentSlide ? "active" : ""}`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
