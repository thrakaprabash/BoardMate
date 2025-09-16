// src/controllers/maintenanceController.ts
import { Request, Response, NextFunction } from "express";
import Maintenance from "../models/MaintenanceRequest";
import type { FilterQuery, SortOrder } from "mongoose";
import { isValidObjectId } from "mongoose";

type ReqUser = { id: string; role?: string };
type AuthedRequest = Request & { user?: ReqUser };

const ALLOWED_STATUS = new Set(["open", "in_progress", "resolved", "closed", "cancelled"] as const);
type Status = typeof ALLOWED_STATUS extends Set<infer U> ? U : never;

/** ---------- small helpers ---------- */
const toInt = (v: unknown, def: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const ensureObjectIdIfProvided = (value: unknown, label: string) => {
  if (value == null || value === "") return; // omit
  if (typeof value === "string" && isValidObjectId(value)) return;
  const err: any = new Error(`${label} must be a valid 24-char ObjectId`);
  err.status = 400;
  throw err;
};

/** Create a maintenance request */
export const createRequest = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const { hostel, room, issueDetails, priority, attachments } = req.body;
    const requester = req.body.requester || req.user?.id;
    if (!requester) return res.status(400).json({ message: "requester is required" });

    // Optional ObjectId checks (only if provided)
    ensureObjectIdIfProvided(requester, "requester");
    ensureObjectIdIfProvided(hostel, "hostel");
    ensureObjectIdIfProvided(room, "room");

    const doc = await Maintenance.create({
      requester,
      hostel,
      room,
      issueDetails,
      priority,
      attachments,
    });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
};

/** List requests with filters, pagination, and typed sort (tolerant & clamped) */
export const listRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query as {
      status?: Status;
      hostel?: string;
      room?: string;
      requester?: string;
      assignedTo?: string;
      search?: string;
      page?: string | number;
      limit?: string | number;
      sort?: "new" | "old" | "priority";
    };

    // Build filter (tolerant: only enforce ObjectId when provided & non-empty)
    const filter: FilterQuery<any> = {};

    if (q.status && ALLOWED_STATUS.has(q.status)) filter.status = q.status;
    if (q.hostel) ensureObjectIdIfProvided(q.hostel, "hostel"), (filter.hostel = q.hostel);
    if (q.room) ensureObjectIdIfProvided(q.room, "room"), (filter.room = q.room);
    if (q.requester) ensureObjectIdIfProvided(q.requester, "requester"), (filter.requester = q.requester);
    if (q.assignedTo) ensureObjectIdIfProvided(q.assignedTo, "assignedTo"), (filter.assignedTo = q.assignedTo);
    if (q.search?.trim()) filter.issueDetails = { $regex: q.search.trim(), $options: "i" };

    // Type-safe sort map for Mongoose
    const sortBy: Record<string, SortOrder> =
      q.sort === "old"
        ? { createdAt: 1 }
        : q.sort === "priority"
        ? { priority: -1, createdAt: -1 }
        : { createdAt: -1 }; // default "new"

    // Safer pagination: numbers or numeric strings; clamp page>=1 and limit<=100
    const rawPage = toInt(q.page, 1);
    const rawLimit = toInt(q.limit, 20);
    const page = clamp(rawPage, 1, 10_000);
    const limit = clamp(rawLimit, 1, 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Maintenance.find(filter)
        .populate("requester", "name email")
        .populate("assignedTo", "name email")
        .sort(sortBy)
        .skip(skip)
        .limit(limit)
        .lean(),
      Maintenance.countDocuments(filter),
    ]);

    res.json({
      page,
      limit,
      total,
      pages: Math.ceil(Math.max(1, total) / limit),
      items,
    });
  } catch (e) {
    next(e);
  }
};

/** Get a single request */
export const getRequestById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Maintenance.findById(req.params.id)
      .populate("requester", "name email")
      .populate("assignedTo", "name email")
      .lean();
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};

/** Update status (sets resolvedAt when resolved) */
export const updateStatus = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body as { status: Status };
    if (!status || !ALLOWED_STATUS.has(status)) return res.status(400).json({ message: "invalid status" });
    const update: any = { status };
    if (status === "resolved") update.resolvedAt = new Date();

    const doc = await Maintenance.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};

/** Assign technician and move to in_progress */
export const assignTechnician = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const { assignedTo } = req.body as { assignedTo: string };
    if (!assignedTo) return res.status(400).json({ message: "assignedTo is required" });
    ensureObjectIdIfProvided(assignedTo, "assignedTo");

    const update = { assignedTo, status: "in_progress" as Status };
    const doc = await Maintenance.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};

/** Add a comment */
export const addComment = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const { note, by } = req.body as { note: string; by?: string };
    const commenter = by || req.user?.id;
    if (!commenter) return res.status(400).json({ message: "by is required" });
    if (!note?.trim()) return res.status(400).json({ message: "note is required" });
    ensureObjectIdIfProvided(commenter, "by");

    const doc = await Maintenance.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { by: commenter, note: note.trim(), at: new Date() } } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};

/** Add an attachment (URL + optional label) */
export const addAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url, label } = req.body as { url: string; label?: string };
    if (!url?.trim()) return res.status(400).json({ message: "url is required" });

    const doc = await Maintenance.findByIdAndUpdate(
      req.params.id,
      { $push: { attachments: { url: url.trim(), label } } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};

/** -------- NEW: hard delete a single maintenance request -------- */
export const deleteMaintenance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    ensureObjectIdIfProvided(id, "id");

    const doc = await Maintenance.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ message: "Not found" });

    // If you manage external attachments, cleanup here based on doc.attachments
    return res.status(204).send(); // no content
  } catch (e) {
    next(e);
  }
};

/** -------- NEW: bulk delete maintenance requests -------- */
export const bulkDeleteRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ids: unknown = req.body?.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "ids[] is required" });
    }
    for (const id of ids) ensureObjectIdIfProvided(id, "id");

    const result = await Maintenance.deleteMany({ _id: { $in: ids } });
    return res.status(200).json({ deletedCount: result.deletedCount ?? 0 });
  } catch (e) {
    next(e);
  }
};
