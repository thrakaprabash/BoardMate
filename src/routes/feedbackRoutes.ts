import { Router } from "express";
import {
  createFeedback,
  listFeedback,
  deleteFeedback,
} from "../controllers/feedbackController";

// import { requireAuth, requireRole } from "../middleware/auth";
const requireAuth = (_req: any, _res: any, next: any) => next();
const requireAdmin = (_req: any, _res: any, next: any) => next();

const router = Router();

router.get("/", requireAuth, listFeedback);
router.post("/", requireAuth, createFeedback);
router.delete("/:id", requireAdmin, deleteFeedback);

export default router;
