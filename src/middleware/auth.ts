import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type Role =
  | "student"
  | "hostel_owner"
  | "room_manager"
  | "inventory_manager"
  | "maintenance_manager";

export type JwtUser = { id: string; role?: Role; email?: string };

function getBearerToken(req: Request) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

function verifyToken(token: string): JwtUser {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not configured");
  const payload = jwt.verify(token, secret) as any;
  return { id: payload.id, role: payload.role as Role, email: payload.email };
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req);
    if (token) (req as any).user = verifyToken(token);
    next();
  } catch {
    next();
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ message: "Missing Authorization Bearer token" });
    const user = verifyToken(token);
    if (!user?.id) return res.status(401).json({ message: "Invalid token payload" });
    (req as any).user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as JwtUser | undefined;
    if (!user?.id) return res.status(401).json({ message: "Unauthorized" });
    if (!user.role || !roles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

/* Convenience guards for your app */
export const requireHostelOwner = requireRole(["hostel_owner"]);
export const requireRoomManager = requireRole(["room_manager"]);
export const requireInventoryManager = requireRole(["inventory_manager"]);
export const requireMaintenanceManager = requireRole(["maintenance_manager"]);

export const requireRoomManagerOrOwner = requireRole(["room_manager", "hostel_owner"]);
export const requireInventoryManagerOrOwner = requireRole(["inventory_manager", "hostel_owner"]);
export const requireMaintenanceManagerOrOwner = requireRole(["maintenance_manager", "hostel_owner"]);

/* If you want a generic “any manager or owner” */
export const requireAnyManagerOrOwner = requireRole([
  "room_manager",
  "inventory_manager",
  "maintenance_manager",
  "hostel_owner",
]);

/* Optional: token helper for tests
export function signToken(payload: JwtUser, expiresIn = "7d") {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn });
}
*/
