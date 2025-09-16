import { Router } from "express";
import {
  createHostel,
  listHostels,
  getHostelById,
  updateHostel,
  deleteHostel,
} from "../controllers/hostelController";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  validate,
  createHostelSchema,
  listHostelsQuerySchema,
  updateHostelSchema,
} from "../middleware/validation";

const router = Router();

router.get("/", requireAuth, validate(listHostelsQuerySchema, "query"), listHostels);
router.post("/", requireAuth, requireRole("hostel_owner", "maintenance_manager"), validate(createHostelSchema), createHostel);
router.get("/:id", requireAuth, getHostelById);
router.patch("/:id", requireAuth, requireRole("hostel_owner", "maintenance_manager"), validate(updateHostelSchema), updateHostel);
router.delete("/:id", requireAuth, requireRole("hostel_owner", "maintenance_manager"), deleteHostel);

export default router;