import { Router } from "express";
import {
  createNotice,
  listNotices,
  getNoticeById,
  updateNotice,
  deleteNotice,
} from "../controllers/noticeController";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  validate,
  createNoticeSchema,
  listNoticesQuerySchema,
  updateNoticeSchema,
} from "../middleware/validation";

const router = Router();

router.get("/", requireAuth, validate(listNoticesQuerySchema, "query"), listNotices);
router.post("/", requireAuth, requireRole("hostel_owner", "maintenance_manager"), validate(createNoticeSchema), createNotice);
router.get("/:id", requireAuth, getNoticeById);
router.patch("/:id", requireAuth, requireRole("hostel_owner", "maintenance_manager"), validate(updateNoticeSchema), updateNotice);
router.delete("/:id", requireAuth, requireRole("hostel_owner", "maintenance_manager"), deleteNotice);

export default router;