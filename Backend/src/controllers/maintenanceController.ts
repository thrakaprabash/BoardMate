// src/controllers/maintenanceController.ts
import { Request, Response, NextFunction } from "express";
import Maintenance from "../models/MaintenanceRequest";
import type { FilterQuery, SortOrder } from "mongoose";

type ReqUser = { id: string; role?: string };
type AuthedRequest = Request & { user?: ReqUser };

/** Create a maintenance request */
export const createRequest = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const { hostel, room, issueDetails, priority, attachments } = req.body;
    const requester = req.body.requester || req.user?.id;
    if (!requester) return res.status(400).json({ message: "requester is required" });

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

/** List requests with filters, pagination, and typed sort */
export const listRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query as {
      status?: "open" | "in_progress" | "resolved" | "closed" | "cancelled";
      hostel?: string;
      room?: string;
      requester?: string;
      assignedTo?: string;
      search?: string;
      page?: string | number;
      limit?: string | number;
      sort?: "new" | "old" | "priority";
    };

    const filter: FilterQuery<any> = {};
    if (q.status) filter.status = q.status;
    if (q.hostel) filter.hostel = q.hostel;
    if (q.room) filter.room = q.room;
    if (q.requester) filter.requester = q.requester;
    if (q.assignedTo) filter.assignedTo = q.assignedTo;
    if (q.search) filter.issueDetails = { $regex: q.search, $options: "i" };

    // ✅ Type-safe sort map for Mongoose
    const sortBy: Record<string, SortOrder> =
      q.sort === "old"
        ? { createdAt: 1 }
        : q.sort === "priority"
        ? { priority: -1, createdAt: -1 }
        : { createdAt: -1 }; // default "new"

    const page = Number(q.page ?? 1);
    const limit = Number(q.limit ?? 20);
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
      pages: Math.ceil(total / limit),
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
    const { status } = req.body as { status: "open" | "in_progress" | "resolved" | "closed" | "cancelled" };
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
    const doc = await Maintenance.findByIdAndUpdate(
      req.params.id,
      { assignedTo, status: "in_progress" },
      { new: true }
    );
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

    const doc = await Maintenance.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { by: commenter, note, at: new Date() } } },
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
    const doc = await Maintenance.findByIdAndUpdate(
      req.params.id,
      { $push: { attachments: { url, label } } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};
