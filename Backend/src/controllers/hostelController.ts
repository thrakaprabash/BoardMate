import { Request, Response, NextFunction } from "express";
import Hostel from "../models/Hostel";

export const createHostel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hostel = await Hostel.create(req.body);
    res.status(201).json(hostel);
  } catch (e) { next(e); }
};

export const listHostels = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, search, page = 1, limit = 20 } = req.query as any;
    const filter: any = {};
    if (owner) filter.owner_id = owner;
    if (search) {
      const regex = { $regex: search, $options: "i" };
      filter.$or = [{ name: regex }, { location: regex }];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Hostel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Hostel.countDocuments(filter),
    ]);
    res.json({ page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)), items });
  } catch (e) { next(e); }
};

export const getHostelById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Hostel.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Hostel not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

export const updateHostel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Hostel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: "Hostel not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

export const deleteHostel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Hostel.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Hostel not found" });
    res.json({ message: "Hostel deleted" });
  } catch (e) { next(e); }
};
