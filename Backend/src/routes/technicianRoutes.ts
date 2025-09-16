import { Router } from "express";
import {
  createTechnician,
  listTechnicians,
  getTechnicianById,
  updateTechnician,
  deleteTechnician,
  bulkCreateTechnicians,
} from "../controllers/technicianController";

const router = Router();

// No auth per your requirement
router.post("/", createTechnician);
router.post("/bulk", bulkCreateTechnicians);
router.get("/", listTechnicians);
router.get("/:id", getTechnicianById);
router.patch("/:id", updateTechnician);
router.delete("/:id", deleteTechnician);

export default router;
