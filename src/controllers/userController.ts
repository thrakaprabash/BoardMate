import { Request, Response, NextFunction } from "express";
import User from "../models/User";

/** Create user (expects at least name, email, username, passwordHash) */
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (e) { next(e); }
};

export const listUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query as any;
    const filter: any = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      const regex = { $regex: search, $options: "i" };
      filter.$or = [{ name: regex }, { email: regex }, { username: regex }];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      User.countDocuments(filter),
    ]);
    res.json({ page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)), items });
  } catch (e) { next(e); }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await User.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "User not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: "User not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

export const deactivateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await User.findByIdAndUpdate(req.params.id, { status: "inactive" }, { new: true });
    if (!doc) return res.status(404).json({ message: "User not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

export const activateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await User.findByIdAndUpdate(req.params.id, { status: "active" }, { new: true });
    if (!doc) return res.status(404).json({ message: "User not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await User.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (e) { next(e); }
};
