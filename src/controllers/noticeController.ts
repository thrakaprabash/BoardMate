import { Request, Response, NextFunction } from "express";
import Notice from "../models/Notice";

export const createNotice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notice = await Notice.create(req.body);
    res.status(201).json(notice);
  } catch (e) { next(e); }
};

export const listNotices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, page = 1, limit = 20 } = req.query as any;
    const filter: any = {};
    if (search) {
      const regex = { $regex: search, $options: "i" };
      filter.$or = [{ title: regex }, { description: regex }];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Notice.find(filter).sort({ date_posted: -1 }).skip(skip).limit(Number(limit)).lean(),
      Notice.countDocuments(filter),
    ]);
    res.json({ page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)), items });
  } catch (e) { next(e); }
};

export const getNoticeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Notice.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Notice not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

export const updateNotice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: "Notice not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

export const deleteNotice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Notice.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Notice not found" });
    res.json({ message: "Notice deleted" });
  } catch (e) { next(e); }
};
