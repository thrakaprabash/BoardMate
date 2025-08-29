import { Request, Response, NextFunction } from "express";
import Booking from "../models/Booking";
import Room from "../models/Room";

/** Check overlap for room bookings */
async function roomIsAvailable(roomId: string, start: Date, end: Date, excludeBookingId?: string) {
  const filter: any = {
    room_id: roomId,
    status: { $in: ["pending", "confirmed", "checked_in"] },
    $or: [
      { start_date: { $lt: end }, end_date: { $gt: start } }, // overlap
    ],
  };
  if (excludeBookingId) filter._id = { $ne: excludeBookingId };
  const clash = await Booking.findOne(filter).lean();
  return !clash;
}

export const createBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { room_id, user_id, start_date, end_date, status = "pending", payment_id } = req.body;
    if (!room_id || !user_id || !start_date || !end_date) {
      return res.status(400).json({ message: "room_id, user_id, start_date, end_date are required" });
    }
    const start = new Date(start_date);
    const end = new Date(end_date);
    if (end <= start) return res.status(400).json({ message: "end_date must be after start_date" });

    const room = await Room.findById(room_id).lean();
    if (!room) return res.status(404).json({ message: "Room not found" });

    const available = await roomIsAvailable(room_id, start, end);
    if (!available) return res.status(409).json({ message: "Room not available for the selected dates" });

    const booking = await Booking.create({ room_id, user_id, start_date: start, end_date: end, status, payment_id });
    res.status(201).json(booking);
  } catch (e) { next(e); }
};

export const listBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user, room, status, page = 1, limit = 20 } = req.query as any;
    const filter: any = {};
    if (user) filter.user_id = user;
    if (room) filter.room_id = room;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Booking.countDocuments(filter),
    ]);

    res.json({ page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)), items });
  } catch (e) { next(e); }
};

export const getBookingById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Booking.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Booking not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

export const updateBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const update = { ...req.body } as any;

    // If dates changed, re-check availability
    if (update.start_date || update.end_date || update.room_id) {
      const current = await Booking.findById(req.params.id).lean();
      if (!current) return res.status(404).json({ message: "Booking not found" });
      const roomId = update.room_id || current.room_id?.toString();
      const start = new Date(update.start_date || current.start_date);
      const end = new Date(update.end_date || current.end_date);
      if (end <= start) return res.status(400).json({ message: "end_date must be after start_date" });

      const available = await roomIsAvailable(roomId, start, end, req.params.id);
      if (!available) return res.status(409).json({ message: "Room not available for the selected dates" });
    }

    const doc = await Booking.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: "Booking not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

export const cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Booking.findByIdAndUpdate(req.params.id, { status: "cancelled" }, { new: true });
    if (!doc) return res.status(404).json({ message: "Booking not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

export const checkIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Booking.findByIdAndUpdate(req.params.id, { status: "checked_in" }, { new: true });
    if (!doc) return res.status(404).json({ message: "Booking not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

export const checkOut = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Booking.findByIdAndUpdate(req.params.id, { status: "completed" }, { new: true });
    if (!doc) return res.status(404).json({ message: "Booking not found" });
    res.json(doc);
  } catch (e) { next(e); }
};

export const deleteBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Booking.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Booking not found" });
    res.json({ message: "Booking deleted" });
  } catch (e) { next(e); }
};
