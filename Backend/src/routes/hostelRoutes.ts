import { Router } from "express";
import {
  createHostel,
  listHostels,
  getHostelById,
  updateHostel,
  deleteHostel,
} from "../controllers/hostelController";

// import { requireAuth, requireRole } from "../middleware/auth";
const requireAuth = (_req: any, _res: any, next: any) => next();
const requireOwnerOrAdmin = (_req: any, _res: any, next: any) => next();

const router = Router();

router.get("/", requireAuth, listHostels);
router.post("/", requireOwnerOrAdmin, createHostel);
router.get("/:id", requireAuth, getHostelById);
router.patch("/:id", requireOwnerOrAdmin, updateHostel);
router.delete("/:id", requireOwnerOrAdmin, deleteHostel);

export default router;
