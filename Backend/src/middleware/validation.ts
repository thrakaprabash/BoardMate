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
    const parsed = schema.safeParse(req[where]);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Validation error", errors: parsed.error.flatten() });
    }
    (req as any)[where] = parsed.data; // normalized & coerced
    next();
  };
}

/** Common param schema for :id routes (use with validate(paramIdSchema, "params")) */
export const paramIdSchema = z.object({ id: objectId });

/* =========
   Users
   ========= */

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  username: z.string().min(3).max(50),
  email: z.string().email(),
  role: roleEnum.default("student").optional(),
  status: statusActiveEnum.default("active").optional(),
  // For now controllers expect passwordHash (hash it at creation in controller/service)
  passwordHash: z.string().min(10, "passwordHash should be a hash"),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  role: roleEnum.optional(),
  status: statusActiveEnum.optional(),
  passwordHash: z.string().min(10).optional(),
});

export const listUsersQuerySchema = z.object({
  role: roleEnum.optional(),
  status: statusActiveEnum.optional(),
  search: z.string().optional(),
  page: pageQ,
  limit: limitQ,
});

/* =========
   Hostels
   ========= */

export const createHostelSchema = z.object({
  owner_id: objectId,
  name: z.string().min(2).max(120),
  location: z.string().min(2).max(200),
  facilities: z.array(z.string()).optional(),
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

/* ========
   Rooms
   ======== */

export const createRoomSchema = z.object({
  hostel_id: objectId,
  type: z.string().min(1).max(50),
  capacity: z.coerce.number().int().min(1),
  rent: z.coerce.number().min(0),
  amenities: z.array(z.string()).optional(),
  availability_status: boolFromQuery.optional(), // body can be boolean or "true"/"false"
});

export const updateRoomSchema = createRoomSchema.partial();

export const setAvailabilitySchema = z.object({
  availability_status: boolFromQuery,
});

export const listRoomsQuerySchema = z.object({
  hostel: objectId.optional(),
  type: z.string().optional(),
  availability_status: boolFromQuery.optional(),
  page: pageQ,
  limit: limitQ,
});

/* ==========
   Bookings
   ========== */

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
  status: bookingStatusEnum.optional(),
  payment_id: objectId.optional(),
});

export const updateBookingSchema = z.object({
  room_id: objectId.optional(),
  user_id: objectId.optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  status: bookingStatusEnum.optional(),
  payment_id: objectId.optional(),
});

export const listBookingsQuerySchema = z.object({
  user: objectId.optional(),
  room: objectId.optional(),
  status: bookingStatusEnum.optional(),
  page: pageQ,
  limit: limitQ,
});

/* ============
   Inventory
   ============ */

const itemStatusEnum = z.enum(["active", "inactive", "low", "out"]);

export const createItemSchema = z.object({
  hostel_id: objectId.optional(),
  name: z.string().min(1).max(120),
  quantity: z.coerce.number().min(0).default(0),
  min_level: z.coerce.number().min(0).default(0),
  status: itemStatusEnum.default("active").optional(),
});

export const updateItemSchema = createItemSchema.partial();

export const adjustQuantitySchema = z.object({
  delta: z.coerce.number(),
});

export const listItemsQuerySchema = z.object({
  status: itemStatusEnum.optional(),
  search: z.string().optional(),
  page: pageQ,
  limit: limitQ,
});

/* ======================
   Maintenance Requests
   ====================== */

export const createMaintenanceSchema = z.object({
  requester: objectId.optional(), // can derive from req.user.id
  hostel: objectId,
  room: objectId,
  issueDetails: z.string().min(5).max(1000),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  attachments: z
    .array(z.object({ url: z.string().url(), label: z.string().optional() }))
    .optional(),
});

export const listMaintenanceQuerySchema = z.object({
  status: z
    .enum(["open", "in_progress", "resolved", "closed", "cancelled"])
    .optional(),
  hostel: objectId.optional(),
  room: objectId.optional(),
  requester: objectId.optional(),
  assignedTo: objectId.optional(),
  search: z.string().optional(),
  page: pageQ,
  limit: limitQ,
  sort: z.enum(["new", "old", "priority"]).default("new"),
});

export const updateStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed", "cancelled"]),
});

export const assignSchema = z.object({
  assignedTo: objectId,
});

export const addCommentSchema = z.object({
  note: z.string().min(1).max(1000),
  by: objectId.optional(), // can derive from req.user.id
});

export const addAttachmentSchema = z.object({
  url: z.string().url(),
  label: z.string().optional(),
});

/* ==========
   Payments
   ========== */

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
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(5).default("LKR"),
  date: z.coerce.date().optional(),
  method: z.string().min(2).max(50),
  status: paymentStatusEnum.optional(),
});

export const updatePaymentSchema = createPaymentSchema.partial();

export const listPaymentsQuerySchema = z.object({
  user: objectId.optional(),
  status: paymentStatusEnum.optional(),
  method: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: pageQ,
  limit: limitQ,
});

/* ==========
   Feedback
   ========== */

export const createFeedbackSchema = z.object({
  user_id: objectId,
  hostel_id: objectId.optional(),
  room_id: objectId.optional(),
  comments: z.string().min(1).max(2000),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  date: z.coerce.date().optional(),
});

export const listFeedbackQuerySchema = z.object({
  user: objectId.optional(),
  hostel: objectId.optional(),
  room: objectId.optional(),
  page: pageQ,
  limit: limitQ,
});

/* ===========
   Complaints
   =========== */

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
