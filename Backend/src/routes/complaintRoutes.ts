import { Router } from "express";
import {
  createComplaint,
  listComplaints,
  getComplaintById,
  updateComplaintStatus,
  deleteComplaint,
} from "../controllers/complaintController";

// import { requireAuth, requireRole } from "../middleware/auth";
const requireAuth = (_req: any, _res: any, next: any) => next();
const requireStaffOrAdmin = (_req: any, _res: any, next: any) => next();

const router = Router();

router.get("/", requireAuth, listComplaints);
router.post("/", requireAuth, createComplaint);
router.get("/:id", requireAuth, getComplaintById);
router.patch("/:id/status", requireStaffOrAdmin, updateComplaintStatus);
router.delete("/:id", requireStaffOrAdmin, deleteComplaint);

export default router;
