// URLs des statistiques (bonus B3 et B4). app.js monte ce routeur sur /api/stats.
import { Router } from "express";
import { getCompletion, getHeatmap } from "../controllers/statsController.js";
import { requireAuth, validate } from "../middleware.js";
import { completionQuerySchema, heatmapQuerySchema } from "../schemas.js";

const router = Router();

// Toutes les routes de statistiques nécessitent un utilisateur connecté.
router.use(requireAuth);

// La heatmap : activité jour par jour (paramètres facultatifs vérifiés avec heatmapQuerySchema).
router.get("/heatmap", validate(heatmapQuerySchema, "query"), getHeatmap);
// Le taux de complétion par semaine ou par mois (paramètres facultatifs vérifiés avec completionQuerySchema).
router.get("/completion", validate(completionQuerySchema, "query"), getCompletion);

export default router;
