// server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: 'admin' | 'therapist' | 'student';
  };
}

// Ensure caller is authenticated (checks X-User-Id header or session token)
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string; // or req.session.userId

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Missing user authentication' });
  }

  req.user = { id: userId, role: (req.headers['x-user-role'] as any) || 'student' };
  next();
}

// Restrict route to specific roles (e.g. Admin only)
export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
}

// Enforce that a Therapist can ONLY view their own assigned students
export function verifyTherapistSelf(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const { therapistId } = req.params;

  // If user is admin, allow override; if therapist, enforce therapistId matching logged-in ID
  if (req.user?.role !== 'admin' && req.user?.id !== therapistId) {
    return res.status(403).json({ error: 'Forbidden: Cannot view students assigned to another therapist' });
  }

  next();
}