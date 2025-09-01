import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User";

/** Helper: sign JWT with id, role, email */
function signToken(u: { _id: any; role: string; email?: string }) {
  return jwt.sign(
    { id: String(u._id), role: u.role, email: u.email },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: process.env.JWT_EXPIRES || "2h" }
  );
}

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 * Returns: { token, role, user: { id, name, email } }
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email }).lean();
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // Compare plain password with stored hash
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(user);
    return res.json({
      token,
      role: user.role,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (e) {
    next(e);
  }
};

/**
 * (Optional) POST /api/auth/register   — for quick local testing only.
 * Body: { name, username, email, password, role? }   role defaults to "student".
 * Creates user by hashing the password into passwordHash. Disable in prod if needed.
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, username, email, password, role = "student" } = req.body as any;
    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: "name, username, email, password required" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const doc = await (await import("../models/User")).default.create({
      name,
      username,
      email,
      role,
      status: "active",
      passwordHash,
    });

    const token = signToken(doc);
    res.status(201).json({
      token,
      role: doc.role,
      user: { id: doc._id, name: doc.name, email: doc.email },
    });
  } catch (e: any) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: "Duplicate field", fields: e.keyValue });
    }
    next(e);
  }
};
