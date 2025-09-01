import { Request, Response, NextFunction } from "express";
import User from "../models/User";
import Hostel from "../models/Hostel";
import Room from "../models/Room";
import Booking from "../models/Booking";
import Payment from "../models/Payment";
import Maintenance from "../models/MaintenanceRequest";
import Feedback from "../models/Feedback";
import Complaint from "../models/Complaint";

/** Dashboard-style snapshot + a few aggregates */
export const getSummary = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Basic counts
    const [users, hostels, rooms, bookings, payments, openMaintenance, complaints] = await Promise.all([
      User.countDocuments({}),
      Hostel.countDocuments({}),
      Room.countDocuments({}),
      Booking.countDocuments({}),
      Payment.countDocuments({ amount: { $gt: 0 }, status: { $in: ["paid", "completed", "success"] } }),
      Maintenance.countDocuments({ status: { $in: ["open", "in_progress"] } }),
      Complaint.countDocuments({ status: { $in: ["open", "in_progress"] } }),
    ]);

    // Revenue this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const revenueAgg = await Payment.aggregate([
      { $match: { amount: { $gt: 0 }, status: { $in: ["paid", "completed", "success"] }, date: { $gte: startOfMonth, $lte: now } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const revenueThisMonth = revenueAgg[0]?.total || 0;

    // Occupancy rate (approx via current active bookings)
    const activeBookings = await Booking.countDocuments({
      status: { $in: ["confirmed", "checked_in"] },
      start_date: { $lte: now },
      end_date: { $gte: now }
    });
    const occupancyRate = rooms > 0 ? Math.min(1, activeBookings / rooms) : 0;

    // Booking trend (last 6 months)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const bookingTrend = await Booking.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { "_id.y": 1, "_id.m": 1 } }
    ]);

    res.json({
      counts: { users, hostels, rooms, bookings, payments, openMaintenance, complaints },
      revenueThisMonth,
      occupancyRate,
      bookingTrend
    });
  } catch (e) { next(e); }
};

/** Detailed revenue by month/year */
export const revenueByMonth = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await Payment.aggregate([
      { $match: { amount: { $gt: 0 }, status: { $in: ["paid", "completed", "success"] } } },
      { $group: { _id: { y: { $year: "$date" }, m: { $month: "$date" } }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { "_id.y": 1, "_id.m": 1 } }
    ]);
    res.json({ data });
  } catch (e) { next(e); }
};

/** Ratings summary (if Feedback has rating) */
export const ratingSummary = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await Feedback.aggregate([
      { $match: { rating: { $exists: true } } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    res.json({ data });
  } catch (e) { next(e); }
};
