import { Request, Response, NextFunction } from "express";
import User from "../models/User";

/** Create a user (PUBLIC for easy testing) */
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await User.create(req.body);
    res.status(201).json(doc);
  } catch (e: any) {
    // Handle duplicate keys nicely
    if (e?.code === 11000) {
      const fields = Object.keys(e.keyValue || {});
      return res.status(409).json({ message: `Duplicate ${fields.join(", ")}`, fields: e.keyValue });
    }
    next(e);
  }
};

/** List users with filters + pagination */
export const listUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query as any;
    const filter: any = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      // leverage text index
      filter.$text = { $search: String(search) };
    }

    const _page = Number(page);
    const _limit = Number(limit);
    const skip = (_page - 1) * _limit;

    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(_limit).lean(),
      User.countDocuments(filter),
    ]);

    res.json({ page: _page, limit: _limit, total, pages: Math.ceil(total / _limit), items });
  } catch (e) { next(e); }
};

/** Get one user */
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await User.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "User not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

/** Update user (partial) */
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).lean();
    if (!doc) return res.status(404).json({ message: "User not found" });
    res.json(doc);
  } catch (e: any) {
    if (e?.code === 11000) {
      const fields = Object.keys(e.keyValue || {});
      return res.status(409).json({ message: `Duplicate ${fields.join(", ")}`, fields: e.keyValue });
    }
    next(e);
  }
};

/** Deactivate */
export const deactivateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await User.findByIdAndUpdate(req.params.id, { status: "inactive" }, { new: true }).lean();
    if (!doc) return res.status(404).json({ message: "User not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

/** Activate */
export const activateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await User.findByIdAndUpdate(req.params.id, { status: "active" }, { new: true }).lean();
    if (!doc) return res.status(404).json({ message: "User not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

/** Delete */
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await User.findByIdAndDelete(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "User not found" });
    res.json({ deleted: true, id: req.params.id });
  } catch (e) { next(e); }
};
