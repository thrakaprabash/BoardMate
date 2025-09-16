// src/middleware/validation.ts
import { z } from "zod";
import type { RequestHandler } from "express";

/* ===========================
   Shared primitives & helpers
   =========================== */

export const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

const roleEnum = z.enum([
  "student",
  "hostel_owner",
  "room_manager",
  "inventory_manager",
  "maintenance_manager",
]);

const statusActiveEnum = z.enum(["active", "inactive", "pending"]);

const pageQ = z.coerce.number().int().min(1).default(1);
const limitQ = z.coerce.number().int().min(1).max(100).default(20);

/** Accepts boolean or common string booleans ("true","false","1","0","yes","no") */
const boolFromQuery = z
  .union([z.boolean(), z.string()])
  .transform((v) => {
    if (typeof v === "boolean") return v;
    const s = v.trim().toLowerCase();
    if (["true", "1", "yes"].includes(s)) return true;
    if (["false", "0", "no"].includes(s)) return false;
    // If it's some other string, let Zod throw later when schema expects boolean
    return undefined as unknown as boolean;
  });

/** Generic validator middleware */
export function validate(
  schema: z.ZodTypeAny,
  where: "body" | "query" | "params" = "body"
): RequestHandler {
  return (req, res, next) => {
    let data;
    if (where === "body") {
      data = req.body;
    } else if (where === "query") {
      data = req.query; // Access to trigger Express's internal parsing
    } else if (where === "params") {
      data = req.params;
    } else {
      return res.status(500).json({ message: "Invalid validation location" });
    }

    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Validation error", errors: parsed.error.flatten() });
    }

    if (where === "query") {
      // Override the getter for query
      Object.defineProperty(req, "query", {
        value: parsed.data,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    } else {
      (req as any)[where] = parsed.data; // normalized & coerced
    }
    next();
  };
}

/** Common param schema for :id routes (use with validate(paramIdSchema, "params")) */
export const paramIdSchema = z.object({ id: objectId });

/* =====
   Auth
   ===== */
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  username: z.string().min(3).max(50),
  email: z.string().email(),
  role: roleEnum.default("student"),
  status: statusActiveEnum.default("active"),
  password: z.string().min(6),
});

/* =========
   Users
   ========= */
export const createUserSchema = registerSchema;

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  role: roleEnum.optional(),
  status: statusActiveEnum.optional(),
  password: z.string().min(6).optional(),
});

export const listUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: roleEnum.optional(),
  status: statusActiveEnum.optional(),
  page: pageQ,
  limit: limitQ,
});

/* =========
   Hostels
   ========= */
export const createHostelSchema = z.object({
  owner_id: objectId,
  name: z.string().min(1).max(100),
  location: z.string().min(1).max(200),
  facilities: z.array(z.string()).default([]),
  contact: z.string().optional(),
  description: z.string().optional(),
});

export const updateHostelSchema = createHostelSchema.partial();

export const listHostelsQuerySchema = z.object({
  owner: objectId.optional(),
  search: z.string().optional(),
  page: pageQ,
  limit: limitQ,
});

/* ======
   Rooms
   ====== */
export const createRoomSchema = z.object({
  hostel_id: objectId,
  type: z.string().min(1).max(50),
  capacity: z.coerce.number().int().min(1),
  rent: z.coerce.number().min(0),
  amenities: z.array(z.string()).default([]),
  availability_status: boolFromQuery.default(true),
});

export const updateRoomSchema = createRoomSchema.partial();

export const listRoomsQuerySchema = z.object({
  hostel: objectId.optional(),
  available: boolFromQuery.optional(),
  type: z.string().optional(),
  page: pageQ,
  limit: limitQ,
});

export const setAvailabilitySchema = z.object({
  availability_status: boolFromQuery,
});

/* =========
   Bookings
   ========= */
const bookingStatusEnum = z.enum([
  "pending",
  "confirmed",
  "checked_in",
  "completed",
  "cancelled",
]);

export const createBookingSchema = z.object({
  room_id: objectId,
  user_id: objectId,
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  status: bookingStatusEnum.default("pending").optional(),
  payment_id: objectId.optional(),
});

export const updateBookingSchema = createBookingSchema.partial();

export const listBookingsQuerySchema = z.object({
  user: objectId.optional(),
  room: objectId.optional(),
  status: bookingStatusEnum.optional(),
  page: pageQ,
  limit: limitQ,
});

/* =========
   Payments
   ========= */
const paymentStatusEnum = z.enum([
  "pending",
  "paid",
  "completed",
  "failed",
  "refunded",
  "refund_entry",
  "success",
]);

export const createPaymentSchema = z.object({
  user_id: objectId,
  booking_id: objectId.optional(),
  amount: z.coerce.number().min(0),
  currency: z.string().default("LKR"),
  date: z.coerce.date().optional(),
  method: z.string().min(1),
  status: paymentStatusEnum,
  refundOf: objectId.optional(),
});

export const updatePaymentSchema = createPaymentSchema.partial();

export const listPaymentsQuerySchema = z.object({
  user: objectId.optional(),
  status: paymentStatusEnum.optional(),
  page: pageQ,
  limit: limitQ,
});

export const refundPaymentSchema = z.object({
  amount: z.coerce.number().min(0).optional(),
});

/* =========
   Feedback
   ========= */
export const createFeedbackSchema = z.object({
  user_id: objectId,
  hostel_id: objectId.optional(),
  room_id: objectId.optional(),
  comments: z.string().min(1).max(2000),
  rating: z.coerce.number().int().min(1).max(5),
  date: z.coerce.date().optional(),
});

export const listFeedbackQuerySchema = z.object({
  hostel: objectId.optional(),
  room: objectId.optional(),
  page: pageQ,
  limit: limitQ,
});

/* =========
   Inventory
   ========= */
const inventoryStatusEnum = z.enum(["active", "inactive", "low", "out"]);

export const createInventorySchema = z.object({
  hostel_id: objectId.optional(),
  name: z.string().min(1).max(100),
  quantity: z.coerce.number().int().min(0),
  min_level: z.coerce.number().int().min(0),
  status: inventoryStatusEnum.optional(),
});

export const listInventoryQuerySchema = z.object({
  search: z.string().optional(),
  status: inventoryStatusEnum.optional(),
  page: pageQ,
  limit: limitQ,
});

export const updateInventorySchema = z.object({
  hostel_id: objectId.optional(),
  name: z.string().min(1).max(100).optional(),
  quantity: z.coerce.number().int().min(0).optional(),
  min_level: z.coerce.number().int().min(0).optional(),
  status: inventoryStatusEnum.optional(),
});

export const adjustQuantitySchema = z.object({
  quantity: z.coerce.number().int(),
});

/* =========
   Maintenance
   ========= */
const maintenanceStatusEnum = z.enum([
  "open",
  "in_progress",
  "resolved",
  "closed",
  "cancelled",
]);

const priorityEnum = z.enum(["low", "medium", "high", "urgent"]);

export const createMaintenanceSchema = z.object({
  requester: objectId.optional(),
  hostel: objectId,
  room: objectId,
  issueDetails: z.string().min(1).max(2000),
  status: maintenanceStatusEnum.default("open").optional(),
  priority: priorityEnum.default("medium").optional(),
  assignedTo: objectId.optional(),
  attachments: z.array(z.object({ url: z.string().url(), label: z.string().optional() })).optional(),
});

export const listMaintenanceQuerySchema = z.object({
  status: maintenanceStatusEnum.optional(),
  hostel: objectId.optional(),
  room: objectId.optional(),
  requester: objectId.optional(),
  assignedTo: objectId.optional(),
  search: z.string().optional(),
  sort: z.enum(["new", "old", "priority"]).optional(),
  page: pageQ,
  limit: limitQ,
});

export const updateStatusSchema = z.object({
  status: maintenanceStatusEnum,
});

export const assignSchema = z.object({
  assignedTo: objectId,
});

export const addCommentSchema = z.object({
  by: objectId.optional(),
  note: z.string().min(1).max(1000),
  at: z.coerce.date().optional(),
});

export const addAttachmentSchema = z.object({
  url: z.string().url(),
  label: z.string().optional(),
});

/* =========
   Complaints
   ========= */
const complaintStatusEnum = z.enum(["open", "in_progress", "resolved", "closed"]);

export const createComplaintSchema = z.object({
  user_id: objectId,
  hostel_id: objectId.optional(),
  room_id: objectId.optional(),
  description: z.string().min(1).max(2000),
  status: complaintStatusEnum.default("open").optional(),
});

export const listComplaintsQuerySchema = z.object({
  user: objectId.optional(),
  status: complaintStatusEnum.optional(),
  page: pageQ,
  limit: limitQ,
});

export const updateComplaintStatusSchema = z.object({
  status: complaintStatusEnum,
});

/* =========
   Notices
   ========= */

export const createNoticeSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  date_posted: z.coerce.date().optional(),
  postedBy: objectId.optional(),
});

export const updateNoticeSchema = createNoticeSchema.partial();

export const listNoticesQuerySchema = z.object({
  search: z.string().optional(),
  page: pageQ,
  limit: limitQ,
});

// Add this to your `validation.ts` file
export const revenueByMonthQuerySchema = z.object({});