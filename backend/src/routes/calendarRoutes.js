// URL du calendrier. app.js monte ce routeur sur /api/calendar.
import { Router } from "express";
import { getCalendar } from "../controllers/calendarController.js";
import { requireAuth, validate } from "../middleware.js";
import { calendarQuerySchema } from "../schemas.js";

const router = Router();

// Le calendrier nécessite un utilisateur connecté.
router.use(requireAuth);

// Les événements d'une période (paramètres vérifiés avec calendarQuerySchema : from et to obligatoires).
router.get("/", validate(calendarQuerySchema, "query"), getCalendar);

export default router;
