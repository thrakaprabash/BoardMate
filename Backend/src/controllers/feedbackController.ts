import { Request, Response, NextFunction } from "express";
import Feedback from "../models/Feedback";

export const createFeedback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fb = await Feedback.create(req.body);
    res.status(201).json(fb);
  } catch (e) { next(e); }
};

export const listFeedback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user, hostel, room, page = 1, limit = 20 } = req.query as any;
    const filter: any = {};
    if (user) filter.user_id = user;
    if (hostel) filter.hostel_id = hostel;
    if (room) filter.room_id = room;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Feedback.find(filter).sort({ date: -1 }).skip(skip).limit(Number(limit)).lean(),
      Feedback.countDocuments(filter),
    ]);
    res.json({ page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)), items });
  } catch (e) { next(e); }
};

export const deleteFeedback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Feedback.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Feedback not found" });
    res.json({ message: "Feedback deleted" });
  } catch (e) { next(e); }
};
