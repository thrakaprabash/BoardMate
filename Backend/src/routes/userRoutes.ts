import { Router } from "express";
import {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  deactivateUser,
  activateUser,
  deleteUser,
} from "../controllers/userController";
import { requireAuth, requireRole, requireSelfOrRole } from "../middleware/auth";
import {
  validate,
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  paramIdSchema,
} from "../middleware/validation";

const router = Router();

router.get("/", requireAuth, requireRole("hostel_owner", "maintenance_manager"), validate(listUsersQuerySchema, "query"), listUsers);
router.post("/", validate(createUserSchema), createUser);
router.get("/:id", requireAuth, requireSelfOrRole("id", "hostel_owner", "maintenance_manager"), validate(paramIdSchema, "params"), getUserById);
router.patch(
  "/:id",
  requireAuth,
  requireSelfOrRole("id", "hostel_owner", "maintenance_manager"),
  validate(paramIdSchema, "params"),
  validate(updateUserSchema),
  updateUser
);
router.patch("/:id/deactivate", requireAuth, requireRole("hostel_owner", "maintenance_manager"), validate(paramIdSchema, "params"), deactivateUser);
router.patch("/:id/activate", requireAuth, requireRole("hostel_owner", "maintenance_manager"), validate(paramIdSchema, "params"), activateUser);
router.delete("/:id", requireAuth, requireRole("hostel_owner", "maintenance_manager"), validate(paramIdSchema, "params"), deleteUser);

export default router;