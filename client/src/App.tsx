import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import { AdminDashboard } from "./components/AdminDashboard";
import TherapistWorkflow from "./components/TherapistWorkflow";
import StudentPage from "./components/StudentPage";

type UserRole = "therapist" | "admin" | "student";

type CurrentUser = {
  id: string;
  name: string;
  role: UserRole;
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<UserRole>("therapist");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  function handleLoginSuccess(user: CurrentUser) {
    setCurrentUser(user);
    setRole(user.role);
    setIsLoggedIn(true);
  }

  function handleLogout() {
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    setIsLoggedIn(false);
    setCurrentUser(null);
    setRole("therapist");
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isLoggedIn ? (
            <Navigate to={`/${role}`} replace />
          ) : (
            <LoginPage onLoginSuccess={handleLoginSuccess} />
          )
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn} allowedRole="admin" userRole={role}>
            <Navbar role={role} onLogout={handleLogout} />
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/therapist"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn} allowedRole="therapist" userRole={role}>
            <TherapistWorkflow currentUser={currentUser} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn} allowedRole="student" userRole={role}>
            <Navbar role={role} onLogout={handleLogout} />
            <StudentPage currentUser={currentUser} />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={<Navigate to={isLoggedIn ? `/${role}` : "/login"} replace />}
      />
    </Routes>
  );
}

export default App;
