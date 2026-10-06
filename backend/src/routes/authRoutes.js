// URLs du compte. app.js monte ce routeur sur /api/auth, donc les chemins complets sont /api/auth/register, etc.
// Chaque ligne dit : pour cette URL, exécuter d'abord les vérifications listées, puis appeler la fonction du contrôleur.
import { Router } from "express";
import { getMe, login, register, updateMe } from "../controllers/authController.js";
import { requireAuth, validate } from "../middleware.js";
import { loginSchema, profileUpdateSchema, registerSchema } from "../schemas.js";

const router = Router();

// Créer un compte (le corps doit respecter registerSchema).
router.post("/register", validate(registerSchema), register);
// Se connecter (le corps doit respecter loginSchema).
router.post("/login", validate(loginSchema), login);
// Obtenir l'utilisateur courant (nécessite un jeton valide).
router.get("/me", requireAuth, getMe);
// Modifier son nom et/ou son email (corps vérifié avec profileUpdateSchema).
router.patch("/me", requireAuth, validate(profileUpdateSchema), updateMe);

export default router;
