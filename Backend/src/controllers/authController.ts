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

/** (small helper) normalize email */
const normEmail = (e?: string) => (e ? String(e).trim().toLowerCase() : e);

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

    const user = await User.findOne({ email: normEmail(email) }).lean();
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
 * POST /api/auth/register — quick local testing
 * Body: { name, username, email, password, role? } (role defaults to "student")
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
      email: normEmail(email),
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

/**
 * POST /api/auth/reset-password  (no email flow)
 * Body: { email: string, password: string, confirm?: string }
 * Directly updates the user's passwordHash using the provided email.
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, password, confirm } = req.body as {
      email?: string;
      password?: string;
      confirm?: string;
    };

    if (!email || !password) {
      return res.status(400).json({ message: "Email and new password are required" });
    }
    if (confirm != null && confirm !== password) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    // Basic policy (optional): enforce min length
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const user = await User.findOne({ email: normEmail(email) });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (err: any) {
    return res.status(500).json({ message: "Server error", error: err?.message });
  }
};
