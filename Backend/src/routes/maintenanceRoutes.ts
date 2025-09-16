import { Router } from "express";
import {
  createRequest,
  listRequests,
  getRequestById,
  updateStatus,
  assignTechnician,
  addComment,
  addAttachment,
  deleteMaintenance,
} from "../controllers/maintenanceController";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  validate,
  createMaintenanceSchema,
  listMaintenanceQuerySchema,
  updateStatusSchema,
  assignSchema,
  addCommentSchema,
  addAttachmentSchema,
} from "../middleware/validation";

const router = Router();

router.post("/", requireAuth, validate(createMaintenanceSchema), createRequest);
router.get("/", requireAuth, validate(listMaintenanceQuerySchema, "query"), listRequests);
router.get("/:id", requireAuth, getRequestById);
router.patch("/:id/status", requireAuth, requireRole("maintenance_manager", "hostel_owner"), validate(updateStatusSchema), updateStatus);
router.patch("/:id/assign", requireAuth, requireRole("maintenance_manager", "hostel_owner"), validate(assignSchema), assignTechnician);
router.post("/:id/comments", requireAuth, validate(addCommentSchema), addComment);
router.post("/:id/attachments", requireAuth, validate(addAttachmentSchema), addAttachment);
router.delete("/:id", deleteMaintenance)

export default router;