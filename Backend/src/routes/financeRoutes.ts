import { Router } from "express";
import {
  createPayment,
  listPayments,
  getPaymentById,
  updatePayment,
  refundPayment,
  revenueSummary,
} from "../controllers/financeController";

// import { requireAuth, requireRole } from "../middleware/auth";
const requireAuth = (_req: any, _res: any, next: any) => next();
const requireFinanceOrAdmin = (_req: any, _res: any, next: any) => next();

const router = Router();

// payments
router.get("/", requireAuth, listPayments);
router.post("/", requireFinanceOrAdmin, createPayment);
router.get("/:id", requireAuth, getPaymentById);
router.patch("/:id", requireFinanceOrAdmin, updatePayment);
router.post("/:id/refund", requireFinanceOrAdmin, refundPayment);

// summaries
router.get("/revenue/summary", requireFinanceOrAdmin, revenueSummary);

export default router;
