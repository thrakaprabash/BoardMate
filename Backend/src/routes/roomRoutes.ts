import { Router } from "express";
import {
  createRoom,
  listRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  setAvailability,
} from "../controllers/roomController";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  validate,
  createRoomSchema,
  listRoomsQuerySchema,
  updateRoomSchema,
  setAvailabilitySchema,
} from "../middleware/validation";

const router = Router();

router.get("/", requireAuth, validate(listRoomsQuerySchema, "query"), listRooms);
router.post("/", requireAuth, requireRole("room_manager", "hostel_owner"), validate(createRoomSchema), createRoom);
router.get("/:id", requireAuth, getRoomById);
router.patch("/:id", requireAuth, requireRole("room_manager", "hostel_owner"), validate(updateRoomSchema), updateRoom);
router.patch("/:id/availability", requireAuth, requireRole("room_manager", "hostel_owner"), validate(setAvailabilitySchema), setAvailability);
router.delete("/:id", requireAuth, requireRole("room_manager", "hostel_owner"), deleteRoom);

export default router;