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

import {
  validate,
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  paramIdSchema,
} from "../middleware/validation";

// Use your real auth middleware if already implemented
import { requireAuth } from "../middleware/auth";
// If you also want role-based guards later, you can import requireRole

const router = Router();

/** LIST (auth) */
router.get("/", requireAuth, validate(listUsersQuerySchema, "query"), listUsers);

/** CREATE (PUBLIC) -> no token required for easy registration/testing */
router.post("/", validate(createUserSchema), createUser);

/** READ (auth) */
router.get("/:id", requireAuth, validate(paramIdSchema, "params"), getUserById);

/** UPDATE (auth) */
router.patch(
  "/:id",
  requireAuth,
  validate(paramIdSchema, "params"),
  validate(updateUserSchema),
  updateUser
);

/** DEACTIVATE / ACTIVATE (auth) */
router.patch("/:id/deactivate", requireAuth, validate(paramIdSchema, "params"), deactivateUser);
router.patch("/:id/activate", requireAuth, validate(paramIdSchema, "params"), activateUser);

/** DELETE (auth) */
router.delete("/:id", requireAuth, validate(paramIdSchema, "params"), deleteUser);

export default router;
