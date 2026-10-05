// Gère le côté HTTP des statistiques (bonus B3 et B4) : lit la requête, appelle statsService, envoie la réponse.
import { validationError } from "../middleware.js";
import * as statsService from "../services/statsService.js";
import { addDays, daysBetween, todayIn } from "../utils/dates.js";

// GET /api/stats/heatmap - l'activité jour par jour (tâches terminées + habitudes réalisées).
// Sans paramètres : les 52 dernières semaines (364 jours) jusqu'à aujourd'hui dans le fuseau de l'utilisateur.
// Paramètres facultatifs : ?from=2026-01-01&to=2026-10-05&tz=Europe/Paris
export async function getHeatmap(req, res) {
  const query = res.locals.query;
  const timeZone = query.tz ?? "UTC";
  const to = query.to ?? todayIn(timeZone);
  const from = query.from ?? addDays(to, -363);

  // Garde-fous : un intervalle dans le bon sens, et pas plus de 366 jours (pour limiter le travail du serveur).
  if (from > to) {
    return validationError(res, [{ field: "from", message: "from must not be after to" }]);
  }
  if (daysBetween(from, to) > 365) {
    return validationError(res, [{ field: "from", message: "The period must not exceed 366 days" }]);
  }

  res.json(await statsService.getHeatmap(req.user._id, { from, to, timeZone }));
}

// GET /api/stats/completion - le taux de complétion par semaine ou par mois, et son évolution.
// Paramètres facultatifs : ?period=week|month&count=12&tz=Europe/Paris
export async function getCompletion(req, res) {
  const query = res.locals.query;
  const timeZone = query.tz ?? "UTC";

  res.json(
    await statsService.getCompletion(req.user._id, {
      period: query.period ?? "week",
      count: query.count ?? 12,
      timeZone,
      today: todayIn(timeZone),
    })
  );
}
