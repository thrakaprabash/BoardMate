import { Request, Response, NextFunction } from "express";
import Technician from "../models/Technician";
import type { FilterQuery, SortOrder } from "mongoose";

/** Helpers */
const getInt = (v: unknown, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Create a technician (no auth per requirement) */
export const createTechnician = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, skills, active } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ message: "name is required" });

    const doc = await Technician.create({
      name: name.trim(),
      email: email?.trim() || undefined,
      phone: phone?.trim() || undefined,
      skills: Array.isArray(skills) ? skills.filter(Boolean) : [],
      active: typeof active === "boolean" ? active : true,
    });

    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
};

/** List technicians with pagination + search */
export const listTechnicians = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query as {
      search?: string;
      active?: string | "true" | "false";
      page?: string | number;
      limit?: string | number;
      sort?: "new" | "old" | "name";
    };

    const filter: FilterQuery<any> = {};
    if (q.search?.trim()) {
      const s = q.search.trim();
      filter.$or = [
        { name: { $regex: s, $options: "i" } },
        { email: { $regex: s, $options: "i" } },
        { phone: { $regex: s, $options: "i" } },
        { skills: { $elemMatch: { $regex: s, $options: "i" } } },
      ];
    }
    if (q.active === "true") filter.active = true;
    if (q.active === "false") filter.active = false;

    const sortBy: Record<string, SortOrder> =
      q.sort === "old" ? { createdAt: 1 } :
      q.sort === "name" ? { name: 1 } :
      { createdAt: -1 };

    const page = clamp(getInt(q.page, 1), 1, 10_000);
    const limit = clamp(getInt(q.limit, 20), 1, 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Technician.find(filter).sort(sortBy).skip(skip).limit(limit).lean(),
      Technician.countDocuments(filter),
    ]);

    res.json({ page, limit, total, pages: Math.ceil(Math.max(1, total) / limit), items });
  } catch (e) {
    next(e);
  }
};

/** Get one */
export const getTechnicianById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Technician.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};

/** Update */
export const updateTechnician = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, skills, active } = req.body || {};
    const update: any = {};
    if (typeof name === "string") update.name = name.trim();
    if (typeof email === "string") update.email = email.trim();
    if (typeof phone === "string") update.phone = phone.trim();
    if (Array.isArray(skills)) update.skills = skills.filter(Boolean);
    if (typeof active === "boolean") update.active = active;

    const doc = await Technician.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};

/** Delete (hard) */
export const deleteTechnician = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Technician.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    return res.status(204).send();
  } catch (e) {
    next(e);
  }
};

/** Optional: bulk-create */
export const bulkCreateTechnicians = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows: Array<{ name: string; email?: string; phone?: string; skills?: string[]; active?: boolean }> =
      Array.isArray(req.body?.items) ? req.body.items : [];
    if (!rows.length) return res.status(400).json({ message: "items[] is required" });

    const prepared = rows
      .filter((r) => r?.name)
      .map((r) => ({
        name: String(r.name).trim(),
        email: r.email?.trim(),
        phone: r.phone?.trim(),
        skills: Array.isArray(r.skills) ? r.skills.filter(Boolean) : [],
        active: typeof r.active === "boolean" ? r.active : true,
      }));

    const docs = await Technician.insertMany(prepared);
    res.status(201).json({ created: docs.length, items: docs });
  } catch (e) {
    next(e);
  }
};
