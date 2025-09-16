import { Router } from "express";
import {
  createComplaint,
  listComplaints,
  getComplaintById,
  updateComplaintStatus,
  assignComplaint,
  addComplaintComment,
  deleteComplaint,
} from "../controllers/complaintController";

const router = Router();

// list & create
router.get("/", listComplaints);
router.post("/", createComplaint);

// item & actions
router.get("/:id", getComplaintById);
router.patch("/:id/status", updateComplaintStatus);  // used by UI
router.patch("/:id/assign", assignComplaint);        // used by UI
router.post("/:id/comments", addComplaintComment);
router.delete("/:id", deleteComplaint);

export default router;
