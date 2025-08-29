// src/routes/userRoutes.ts
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

// List users (auth required)
router.get("/", requireAuth, validate(listUsersQuerySchema, "query"), listUsers);

// Create user (hostel_owner)
router.post("/", requireAuth, requireHostelOwner, validate(createUserSchema), createUser);

// Get user by id
router.get("/:id", requireAuth, validate(paramIdSchema, "params"), getUserById);

// Update user (hostel_owner)
router.patch(
  "/:id",
  requireAuth,
  requireHostelOwner,
  validate(paramIdSchema, "params"),
  validate(updateUserSchema),
  updateUser
);

// Deactivate / Activate (hostel_owner)
router.patch(
  "/:id/deactivate",
  requireAuth,
  requireHostelOwner,
  validate(paramIdSchema, "params"),
  deactivateUser
);

router.patch(
  "/:id/activate",
  requireAuth,
  requireHostelOwner,
  validate(paramIdSchema, "params"),
  activateUser
);

// Delete user (hostel_owner)
router.delete(
  "/:id",
  requireAuth,
  requireHostelOwner,
  validate(paramIdSchema, "params"),
  deleteUser
);

export default router;
