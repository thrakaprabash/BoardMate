import { Router } from "express";
import { login, register } from "../controllers/authController";

const router = Router();

router.post("/login", login);

// (Optional) quick local registration; comment out in production if you already
// create users via /api/users or an admin flow.
router.post("/register", register);

export default router;
