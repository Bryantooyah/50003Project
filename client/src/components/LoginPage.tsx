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

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
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

      onLogin(data.user);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to authentication server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <section className="login-left" style={{ maxWidth: '420px', width: '100%', padding: '2rem' }}>
        <div className="brand-row" style={{ marginBottom: '1.5rem' }}>
          <div className="brand-icon">✦</div>
          <div>
            <h1>D.I.A.L</h1>
            <p className="muted">DAS Individualised AI-Based Learning System</p>
          </div>
        </div>

        <h2>Welcome back</h2>
        <p className="login-subtitle" style={{ color: '#666', marginBottom: '1.5rem' }}>
          Sign in to access student writing analysis, error pattern reports, and intervention recommendations.
        </p>

        {error && (
          <div style={{ color: '#d9534f', marginBottom: '1rem', fontWeight: 500, padding: '8px 12px', backgroundColor: '#fdf2f2', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontWeight: 'bold' }}>
            Username / Email
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontWeight: 'bold' }}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </label>

          <button 
            type="submit" 
            disabled={loading}
            className="primary-button"
            style={{ padding: '10px', marginTop: '0.5rem', cursor: 'pointer' }}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </section>
    </main>
  );
}