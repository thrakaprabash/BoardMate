import { Router } from "express";
import { login, register } from "../controllers/authController";
import { validate, loginSchema, registerSchema } from "../middleware/validation";

const router = Router();

router.post("/login", validate(loginSchema), login);
router.post("/register", validate(registerSchema), register);

export default router;