import { Router } from "express";
import { getMe, login, register } from "../controllers/authController.js";
import { requireAuth, validate } from "../middleware.js";
import { loginSchema, registerSchema } from "../schemas.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", requireAuth, getMe);

export default router;
