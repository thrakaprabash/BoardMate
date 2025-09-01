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

// import { requireAuth, requireRole } from "../middleware/auth";
const requireAuth = (_req: any, _res: any, next: any) => next();
const requireStaffOrOwner = (_req: any, _res: any, next: any) => next();

const router = Router();

router.get("/", requireAuth, listItems);
router.get("/low-stock", requireStaffOrOwner, listLowStock);
router.post("/", requireStaffOrOwner, createItem);
router.get("/:id", requireAuth, getItemById);
router.patch("/:id", requireStaffOrOwner, updateItem);
router.patch("/:id/adjust", requireStaffOrOwner, adjustQuantity);
router.delete("/:id", requireStaffOrOwner, deleteItem);

export default router;
