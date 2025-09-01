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

// import { requireAuth, requireRole } from "../middleware/auth";
const requireAuth = (_req: any, _res: any, next: any) => next();
const requireStaffOrOwner = (_req: any, _res: any, next: any) => next();

const router = Router();

router.get("/", requireAuth, listBookings);
router.post("/", requireAuth, createBooking);
router.get("/:id", requireAuth, getBookingById);
router.patch("/:id", requireAuth, updateBooking);
router.patch("/:id/cancel", requireAuth, cancelBooking);
router.patch("/:id/check-in", requireStaffOrOwner, checkIn);
router.patch("/:id/check-out", requireStaffOrOwner, checkOut);
router.delete("/:id", requireStaffOrOwner, deleteBooking);

export default router;
