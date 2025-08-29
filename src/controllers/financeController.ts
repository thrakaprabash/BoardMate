// src/controllers/financeController.ts
import { Request, Response, NextFunction } from "express";
import Payment from "../models/Payment";
import Booking from "../models/Booking";
import type { PipelineStage } from "mongoose";

/** Create a payment (optionally link to a booking) */
export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await Payment.create(req.body);
    const bookingId = (req.body as any).booking_id;
    if (bookingId) {
      await Booking.findByIdAndUpdate(bookingId, { payment_id: payment._id });
    }
    res.status(201).json(payment);
  } catch (e) {
    next(e);
  }
};

/** List payments with filters & pagination */
export const listPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user, status, method, page = 1, limit = 20, from, to } = req.query as any;

    const filter: Record<string, any> = {};
    if (user) filter.user_id = user;
    if (status) filter.status = status;
    if (method) filter.method = method;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Payment.find(filter).sort({ date: -1 }).skip(skip).limit(Number(limit)).lean(),
      Payment.countDocuments(filter),
    ]);

    res.json({
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
      items,
    });
  } catch (e) {
    next(e);
  }
};

/** Get one payment */
export const getPaymentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Payment.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Payment not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};

/** Update a payment */
export const updatePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await Payment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ message: "Payment not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};

/** Mark a payment as refunded and create a mirror negative entry (optional) */
export const refundPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const original = await Payment.findByIdAndUpdate(
      req.params.id,
      { status: "refunded" },
      { new: true }
    );
    if (!original) return res.status(404).json({ message: "Payment not found" });

    // Create a negative mirror entry to preserve audit trail
    const mirror = await Payment.create({
      user_id: original.user_id,
      booking_id: (original as any).booking_id,
      amount: -Math.abs(original.amount),
      currency: original.currency,
      date: new Date(),
      method: original.method,
      status: "refund_entry",
      refundOf: original._id,
    } as any);

    res.json({ refunded: original, mirrorEntry: mirror });
  } catch (e) {
    next(e);
  }
};

/** Monthly revenue summary (amount > 0 and successful statuses) */
export const revenueSummary = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stages: PipelineStage[] = [
      {
        $match: {
          amount: { $gt: 0 },
          status: { $in: ["paid", "completed", "success"] },
        },
      },
      {
        $group: {
          _id: { y: { $year: "$date" }, m: { $month: "$date" } },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
    ];

    const data = await Payment.aggregate(stages);
    res.json({ data });
  } catch (e) {
    next(e);
  }
};
