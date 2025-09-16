import { Router } from "express";
import {
  getSummary,
  revenueByMonth,
  ratingSummary,
} from "../controllers/reportController";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  validate,
  revenueByMonthQuerySchema,
} from "../middleware/validation";

const router = Router();

router.get("/summary", requireAuth, requireRole("hostel_owner", "maintenance_manager"), getSummary);
router.get("/revenue/monthly", requireAuth, requireRole("hostel_owner", "maintenance_manager"), validate(revenueByMonthQuerySchema, "query"), revenueByMonth);
router.get("/ratings/summary", requireAuth, requireRole("hostel_owner", "maintenance_manager"), ratingSummary);

export default router;