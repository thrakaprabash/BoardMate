import { Request, Response, NextFunction } from "express";
import Complaint from "../models/Complaint";

export const createComplaint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const complaint = await Complaint.create(req.body);
    res.status(201).json(complaint);
  } catch (e) { next(e); }
};

export const listComplaints = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user, status, page = 1, limit = 20 } = req.query as any;
    const filter: any = {};
    if (user) filter.user_id = user;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Complaint.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Complaint.countDocuments(filter),
    ]);

    res.json({ page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)), items });
  } catch (e) { next(e); }
};

export const getComplaintById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Complaint.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Complaint not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

export const updateComplaintStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body as { status: string };
    const doc = await Complaint.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!doc) return res.status(404).json({ message: "Complaint not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

export const deleteComplaint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Complaint.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Complaint not found" });
    res.json({ message: "Complaint deleted" });
  } catch (e) { next(e); }
};
