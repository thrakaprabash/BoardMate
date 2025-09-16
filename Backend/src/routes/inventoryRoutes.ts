import { Router } from "express";
import {
  createItem,
  listItems,
  getItemById,
  updateItem,
  deleteItem,
  adjustQuantity,
  listLowStock,
} from "../controllers/inventoryController";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  validate,
  createInventorySchema,
  listInventoryQuerySchema,
  updateInventorySchema,
  adjustQuantitySchema,
} from "../middleware/validation";

const router = Router();

router.get("/", requireAuth, validate(listInventoryQuerySchema, "query"), listItems);
router.get("/low-stock", requireAuth, requireRole("inventory_manager", "hostel_owner", "maintenance_manager"), listLowStock);
router.post("/", requireAuth, requireRole("inventory_manager", "hostel_owner", "maintenance_manager"), validate(createInventorySchema), createItem);
router.get("/:id", requireAuth, getItemById);
router.patch("/:id", requireAuth, requireRole("inventory_manager", "hostel_owner", "maintenance_manager"), validate(updateInventorySchema), updateItem);
router.patch("/:id/adjust", requireAuth, requireRole("inventory_manager", "hostel_owner", "maintenance_manager"), validate(adjustQuantitySchema), adjustQuantity);
router.delete("/:id", requireAuth, requireRole("inventory_manager", "hostel_owner", "maintenance_manager"), deleteItem);

export default router;