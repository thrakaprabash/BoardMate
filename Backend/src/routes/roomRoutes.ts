import { Router } from "express";
import {
  createRoom,
  listRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  setAvailability,
} from "../controllers/roomController";

// import { requireAuth, requireRole } from "../middleware/auth";
const requireAuth = (_req: any, _res: any, next: any) => next();
const requireOwnerOrAdmin = (_req: any, _res: any, next: any) => next();

const router = Router();

router.get("/", requireAuth, listRooms);
router.post("/", requireOwnerOrAdmin, createRoom);
router.get("/:id", requireAuth, getRoomById);
router.patch("/:id", requireOwnerOrAdmin, updateRoom);
router.patch("/:id/availability", requireOwnerOrAdmin, setAvailability);
router.delete("/:id", requireOwnerOrAdmin, deleteRoom);

export default router;
