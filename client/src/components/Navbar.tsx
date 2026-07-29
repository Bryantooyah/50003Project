type NavbarProps = {
  role?: string;
  onLogout?: () => void;
};

export default function Navbar({ role, onLogout }: NavbarProps) {
  return (
    <header className="navbar">
      <div className="brand">
        <div className="brand-icon">✦</div>
        <div>
          <h1>D.I.A.L</h1>
          <p>DAS Individualised AI-Based Learning System</p>
        </div>
      </div>

      {role && onLogout ? (
        <div className="session-controls">
          <span>Logged in as {role}</span>
          <button className="logout-button" onClick={onLogout}>
            Log out
          </button>
        </div>
      ) : (
        <div className="project-pill">PROJECT 2026</div>
      )}
    </header>
  );
}
