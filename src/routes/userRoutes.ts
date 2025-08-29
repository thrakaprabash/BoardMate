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
import { requireAuth, requireHostelOwner } from "../middleware/auth";
import {
  validate,
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  paramIdSchema,
} from "../middleware/validation";

const router = Router();

// List users (with filters & pagination)
router.get("/", requireAuth, validate(listUsersQuerySchema, "query"), listUsers);

// Create user (hostel owner only)
router.post("/", requireHostelOwner, validate(createUserSchema), createUser);

// Get user by id
router.get("/:id", requireAuth, validate(paramIdSchema, "params"), getUserById);

// Update user (hostel owner only)
router.patch(
  "/:id",
  requireHostelOwner,
  validate(paramIdSchema, "params"),
  validate(updateUserSchema),
  updateUser
);

// Deactivate / Activate (hostel owner only)
router.patch(
  "/:id/deactivate",
  requireHostelOwner,
  validate(paramIdSchema, "params"),
  deactivateUser
);

router.patch(
  "/:id/activate",
  requireHostelOwner,
  validate(paramIdSchema, "params"),
  activateUser
);

// Delete user (hostel owner only)
router.delete(
  "/:id",
  requireHostelOwner,
  validate(paramIdSchema, "params"),
  deleteUser
);

export default router;
