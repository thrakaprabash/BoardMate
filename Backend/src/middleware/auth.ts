import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Augment Express.Request with "user"
declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      role: string;
      email?: string;
    }
    interface Request {
      user?: UserPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

/** Extracts Bearer token from Authorization header or cookie named "token" */
function getToken(req: Request): string | null {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  // If you also set httpOnly cookie named "token"
  // @ts-ignore optional cookie-parser
  if (req.cookies?.token) return req.cookies.token as string;
  return null;
}

/** Verify JWT and attach req.user; returns 401 if missing/invalid */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const payload = jwt.verify(token, JWT_SECRET) as Express.UserPayload;
    req.user = { id: String(payload.id), role: String(payload.role), email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/** Ensure user has one of the allowed roles */
export function requireRole(...allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }
    next();
  };
}

/** Example helper: allow if same user (by id param) or has role */
export function requireSelfOrRole(paramName: string, ...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.params[paramName] === req.user.id) return next();
    if (roles.includes(req.user.role)) return next();
    return res.status(403).json({ message: "Forbidden" });
  };
}
