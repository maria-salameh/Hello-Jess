// URLs des habitudes (bonus B2). app.js monte ce routeur sur /api/habits.
import { Router } from "express";
import {
  addEvent,
  createHabit,
  deleteHabit,
  getAllHabits,
  getEvents,
  getHabit,
  removeEvent,
  updateHabit,
} from "../controllers/habitController.js";
import { requireAuth, validate } from "../middleware.js";
import {
  habitCreateSchema,
  habitEventCreateSchema,
  habitRangeQuerySchema,
  habitUpdateSchema,
} from "../schemas.js";

const router = Router();

// Toutes les routes d'habitudes nécessitent un utilisateur connecté.
router.use(requireAuth);

// Lister les habitudes (avec ?from=&to= : ajoute les jours réalisés pendant cette période).
router.get("/", validate(habitRangeQuerySchema, "query"), getAllHabits);
// Créer une habitude.
router.post("/", validate(habitCreateSchema), createHabit);
// Détail, modification et suppression d'une habitude.
router.get("/:id", getHabit);
router.patch("/:id", validate(habitUpdateSchema), updateHabit);
router.delete("/:id", deleteHabit);

// Les événements datés d'une habitude : les lister, en ajouter un ({ date }), en annuler un (date dans l'URL).
router.get("/:id/events", validate(habitRangeQuerySchema, "query"), getEvents);
router.post("/:id/events", validate(habitEventCreateSchema), addEvent);
router.delete("/:id/events/:date", removeEvent);

export default router;
