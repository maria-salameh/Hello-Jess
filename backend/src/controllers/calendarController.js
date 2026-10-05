// Gère le côté HTTP du calendrier : lit la requête, appelle calendarService, envoie la réponse.
import { validationError } from "../middleware.js";
import * as calendarService from "../services/calendarService.js";
import { daysBetween, todayIn } from "../utils/dates.js";

// GET /api/calendar?from=2026-09-28&to=2026-11-08&tz=Europe/Paris
// Les événements de la période : tâches à faire, tâches terminées et habitudes réalisées.
export async function getCalendar(req, res) {
  const { from, to, tz } = res.locals.query;

  // Garde-fou : une vue calendrier montre au plus ~6 semaines ; on limite à 62 jours pour limiter le travail du serveur.
  if (daysBetween(from, to) > 61) {
    return validationError(res, [{ field: "from", message: "The period must not exceed 62 days" }]);
  }

  // "Aujourd'hui" dépend du fuseau horaire de l'utilisateur ; il sert à reporter les tâches en retard sur aujourd'hui.
  const timeZone = tz ?? "UTC";
  res.json(await calendarService.getCalendar(req.user._id, { from, to, timeZone, today: todayIn(timeZone) }));
}
