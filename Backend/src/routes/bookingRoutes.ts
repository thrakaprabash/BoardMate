import { Router } from "express";
import {
  createBooking,
  listBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  checkIn,
  checkOut,
  deleteBooking,
} from "../controllers/bookingController";
import { requireAuth, requireRole, requireSelfOrRole } from "../middleware/auth";
import {
  validate,
  createBookingSchema,
  listBookingsQuerySchema,
  updateBookingSchema,
} from "../middleware/validation";

const router = Router();

router.get("/", requireAuth, validate(listBookingsQuerySchema, "query"), listBookings);
router.post("/", requireAuth, validate(createBookingSchema), createBooking);
router.get("/:id", requireAuth, getBookingById);
router.patch("/:id", requireAuth, validate(updateBookingSchema), updateBooking);
router.patch("/:id/cancel", requireAuth, cancelBooking);
router.patch("/:id/check-in", requireAuth, requireRole("room_manager", "hostel_owner", "maintenance_manager"), checkIn);
router.patch("/:id/check-out", requireAuth, requireRole("room_manager", "hostel_owner", "maintenance_manager"), checkOut);
router.delete("/:id", requireAuth, requireRole("room_manager", "hostel_owner", "maintenance_manager"), deleteBooking);

export default router;