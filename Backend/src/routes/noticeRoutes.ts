import { Router } from "express";
import {
  createNotice,
  listNotices,
  getNoticeById,
  updateNotice,
  deleteNotice,
} from "../controllers/noticeController";

// import { requireAuth, requireRole } from "../middleware/auth";
const requireAuth = (_req: any, _res: any, next: any) => next();
const requireStaffOrAdmin = (_req: any, _res: any, next: any) => next();

const router = Router();

router.get("/", requireAuth, listNotices);
router.post("/", requireStaffOrAdmin, createNotice);
router.get("/:id", requireAuth, getNoticeById);
router.patch("/:id", requireStaffOrAdmin, updateNotice);
router.delete("/:id", requireStaffOrAdmin, deleteNotice);

export default router;
