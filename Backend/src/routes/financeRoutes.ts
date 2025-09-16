import { Router } from "express";
import {
  createPayment,
  listPayments,
  getPaymentById,
  updatePayment,
  refundPayment,
  revenueSummary,
} from "../controllers/financeController";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  validate,
  createPaymentSchema,
  listPaymentsQuerySchema,
  updatePaymentSchema,
  refundPaymentSchema,
} from "../middleware/validation";

const router = Router();

router.get("/", requireAuth, validate(listPaymentsQuerySchema, "query"), listPayments);
router.post("/", requireAuth, requireRole("hostel_owner", "student"), validate(createPaymentSchema), createPayment);
router.get("/:id", requireAuth, getPaymentById);
router.patch("/:id", requireAuth, requireRole("hostel_owner", "maintenance_manager"), validate(updatePaymentSchema), updatePayment);
router.post("/:id/refund", requireAuth, requireRole("hostel_owner", "maintenance_manager"), validate(refundPaymentSchema), refundPayment);
router.get("/revenue/summary", requireAuth, requireRole("hostel_owner", "maintenance_manager"), revenueSummary);

export default router;