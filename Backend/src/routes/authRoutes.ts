import { Router } from "express";
import { login, register, resetPassword } from "../controllers/authController";

const router = Router();

router.post("/login", login);
router.post("/register", register);
// direct reset (no email link)
router.post("/reset-password", resetPassword);

export default router;
