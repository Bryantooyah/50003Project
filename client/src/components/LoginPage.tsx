import React, { useState } from 'react';

type User = {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'therapist' | 'student';
};

type LoginPageProps = {
  onLogin: (user: User) => void;
};

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('admin1');
  const [password, setPassword] = useState('Secret123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      // Success: pass user object back to App state
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to authentication server');
    } finally {
      setLoading(false);
    }
  };

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

        {error && (
          <div style={{ color: '#d9534f', marginBottom: '1rem', fontWeight: 500 }}>
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email / Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username or email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>

          <button
            type="button"
            className="secondary-login"
            onClick={() =>
              onLogin({
                id: 'demo-admin-id',
                username: 'admin_demo',
                name: 'Admin Demo User',
                role: 'admin',
              })
            }
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