import { Request, Response, NextFunction } from "express";
import Room from "../models/Room";

export const createRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json(room);
  } catch (e) { next(e); }
};

export const listRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hostel, type, availability_status, page = 1, limit = 20 } = req.query as any;
    const filter: any = {};
    if (hostel) filter.hostel_id = hostel;
    if (type) filter.type = type;
    if (availability_status !== undefined) filter.availability_status = availability_status;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Room.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Room.countDocuments(filter),
    ]);
    res.json({ page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)), items });
  } catch (e) { next(e); }
};

export const getRoomById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Room.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Room not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

export const updateRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: "Room not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

export const deleteRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Room.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Room not found" });
    res.json({ message: "Room deleted" });
  } catch (e) { next(e); }
};

export const setAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { availability_status } = req.body;
    const doc = await Room.findByIdAndUpdate(req.params.id, { availability_status }, { new: true });
    if (!doc) return res.status(404).json({ message: "Room not found" });
    res.json(doc);
  } catch (e) { next(e); }
};
