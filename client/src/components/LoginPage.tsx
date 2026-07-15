type LoginPageProps = {
  onLogin: (role: "therapist" | "admin") => void;
};

export default function LoginPage({ onLogin }: LoginPageProps) {
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

        <h2>Welcome back</h2>
        <p className="login-subtitle">
          Sign in to access student writing analysis, error pattern reports,
          and intervention recommendations.
        </p>

        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault();
            onLogin("therapist");
          }}
        >
          <label>
            Email
            <input
              type="email"
              defaultValue="therapist@das.org.sg"
              placeholder="therapist@das.org.sg"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              defaultValue="password"
              placeholder="Enter password"
            />
          </label>

          <button type="submit">Log In as Therapist</button>

          <button
            type="button"
            className="secondary-login"
            onClick={() => onLogin("admin")}
          >
            Continue as Admin Demo
          </button>
        </form>
      </section>

      <section className="login-right">
        <div className="mission-card">
          <span>PROJECT 2026</span>
          <h3>Error Pattern Analyzer</h3>
          <p>
            Helping Educational Therapists review student writing samples,
            identify recurring error patterns, and generate targeted
            intervention strategies.
          </p>
        </div>

      </section>
    </main>
  );
}