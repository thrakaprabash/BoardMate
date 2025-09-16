import { Request, Response, NextFunction } from "express";
import { FilterQuery, SortOrder, Types } from "mongoose";
import Complaint from "../models/Complaint";

// helpers
const toInt = (v: any, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const isId = (v?: string) => !!v && Types.ObjectId.isValid(v);

// ---------- Create ----------
export const createComplaint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subject, description, user, assignedTo } = req.body || {};
    if (!subject?.trim()) return res.status(400).json({ message: "subject is required" });

    const doc = await Complaint.create({
      subject: subject.trim(),
      description: description?.trim(),
      user: isId(user) ? user : undefined,
      assignedTo: isId(assignedTo) ? assignedTo : undefined,
      status: "open",
    });

    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
};

// ---------- List (filters + pagination) ----------
export const listComplaints = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query as {
      status?: "open" | "in_progress" | "resolved" | "closed" | "rejected";
      assignedTo?: string;
      user?: string;
      search?: string;
      sort?: "new" | "old";
      page?: string | number;
      limit?: string | number;
    };

    const filter: FilterQuery<any> = {};
    if (q.status) filter.status = q.status;
    if (isId(q.assignedTo)) filter.assignedTo = q.assignedTo;
    if (isId(q.user)) filter.user = q.user;

    if (q.search?.trim()) {
      const s = q.search.trim();
      filter.$or = [
        { subject: { $regex: s, $options: "i" } },
        { description: { $regex: s, $options: "i" } },
      ];
    }

    const sortBy: Record<string, SortOrder> = q.sort === "old" ? { createdAt: 1 } : { createdAt: -1 };

    const page = clamp(toInt(q.page, 1), 1, 10_000);
    const limit = clamp(toInt(q.limit, 20), 1, 200);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Complaint.find(filter)
        .populate("user", "name email")
        .populate("assignedTo", "name email")
        .sort(sortBy)
        .skip(skip)
        .limit(limit)
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    res.json({ page, limit, total, pages: Math.ceil(Math.max(1, total) / limit), items });
  } catch (e) {
    next(e);
  }
};

// ---------- Get one ----------
export const getComplaintById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Complaint.findById(req.params.id)
      .populate("user", "name email")
      .populate("assignedTo", "name email")
      .lean();
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};

// ---------- Update status ----------
export const updateComplaintStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body as {
      status: "open" | "in_progress" | "resolved" | "closed" | "rejected";
    };
    if (!status) return res.status(400).json({ message: "status is required" });

    const update: any = { status };
    if (status === "resolved") update.resolvedAt = new Date();

    const doc = await Complaint.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate("user", "name email")
      .populate("assignedTo", "name email");

    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};

// ---------- Assign technician ----------
export const assignComplaint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignedTo } = req.body as { assignedTo: string };
    if (!isId(assignedTo)) return res.status(400).json({ message: "assignedTo (valid ObjectId) is required" });

    const doc = await Complaint.findByIdAndUpdate(
      req.params.id,
      { assignedTo, status: "in_progress" },
      { new: true }
    )
      .populate("user", "name email")
      .populate("assignedTo", "name email");

    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};

// ---------- Add comment ----------
export const addComplaintComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { note, by } = req.body as { note: string; by?: string };
    if (!note?.trim()) return res.status(400).json({ message: "note is required" });

    const doc = await Complaint.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { note: note.trim(), by: isId(by) ? by : by || undefined, at: new Date() } } },
      { new: true }
    )
      .populate("user", "name email")
      .populate("assignedTo", "name email");

    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};

// ---------- Delete (hard) ----------
export const deleteComplaint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Complaint.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};
