import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

type ProtectedRouteProps = {
  isLoggedIn: boolean;
  allowedRole: "admin" | "therapist" | "student";
  userRole: string;
  children: ReactNode;
};

export default function ProtectedRoute({
  isLoggedIn,
  allowedRole,
  userRole,
  children,
}: ProtectedRouteProps) {
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (userRole !== allowedRole) {
    // Logged in, but this route belongs to a different role — send them to
    // their own home instead of showing someone else's page or a blank one.
    return <Navigate to={`/${userRole}`} replace />;
  }

  return <>{children}</>;
}
