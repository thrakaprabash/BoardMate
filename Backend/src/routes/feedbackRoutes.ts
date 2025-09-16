import { Router } from "express";
import {
  createFeedback,
  listFeedback,
  deleteFeedback,
} from "../controllers/feedbackController";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  validate,
  createFeedbackSchema,
  listFeedbackQuerySchema,
} from "../middleware/validation";

const router = Router();

router.get("/", requireAuth, validate(listFeedbackQuerySchema, "query"), listFeedback);
router.post("/", requireAuth, validate(createFeedbackSchema), createFeedback);
router.delete("/:id", requireAuth, requireRole("hostel_owner", "maintenance_manager"), deleteFeedback);

export default router;