import { Router } from "express";
import {
  getSummary,
  revenueByMonth,
  ratingSummary,
} from "../controllers/reportController";

// import { requireAuth, requireRole } from "../middleware/auth";
const requireAuth = (_req: any, _res: any, next: any) => next();
const requireAdmin = (_req: any, _res: any, next: any) => next();

const router = Router();

router.get("/summary", requireAuth, getSummary);
router.get("/revenue/monthly", requireAdmin, revenueByMonth);
router.get("/ratings/summary", requireAuth, ratingSummary);

export default router;
