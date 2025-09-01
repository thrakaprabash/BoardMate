import { Router } from "express";
import {
  createRequest,
  listRequests,
  getRequestById,
  updateStatus,
  assignTechnician,
  addComment,
  addAttachment,
} from "../controllers/maintenanceController";
import {
  validate,
  createMaintenanceSchema,
  listMaintenanceQuerySchema,
  updateStatusSchema,
  assignSchema,
  addCommentSchema,
  addAttachmentSchema,
} from "../middleware/validation";

// import { requireAuth, requireRole } from "../middleware/auth";
const requireAuth = (_req: any, _res: any, next: any) => next();
const requireStaff = (_req: any, _res: any, next: any) => next(); // staff/owner/admin

const router = Router();

router.post("/", requireAuth, validate(createMaintenanceSchema), createRequest);
router.get("/", requireAuth, validate(listMaintenanceQuerySchema, "query"), listRequests);
router.get("/:id", requireAuth, getRequestById);
router.patch("/:id/status", requireAuth, requireStaff, validate(updateStatusSchema), updateStatus);
router.patch("/:id/assign", requireAuth, requireStaff, validate(assignSchema), assignTechnician);
router.post("/:id/comments", requireAuth, validate(addCommentSchema), addComment);
router.post("/:id/attachments", requireAuth, validate(addAttachmentSchema), addAttachment);

export default router;
