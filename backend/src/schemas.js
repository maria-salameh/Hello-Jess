// Règles de validation des données reçues (avec zod). Une requête qui ne les respecte pas reçoit
// une réponse 422 avant même d'arriver à un contrôleur ; voir validate() dans middleware.js.
import { z } from "zod";
import { addDays, isValidCivilDate, isValidTimeZone } from "./utils/dates.js";

// Les valeurs autorisées pour l'avancement d'une tâche et pour sa priorité.
export const STATUSES = ["todo", "doing", "done"];
export const PRIORITIES = ["low", "medium", "high"];

// ----- Briques réutilisables -----

// Texte obligatoire : les espaces du début et de la fin sont retirés, puis il doit faire de 1 à `max` caractères.
const requiredText = (field, max) =>
  z
    .string({ error: `${field} is required and must be a string` })
    .trim()
    .min(1, `${field} must not be empty`)
    .max(max, `${field} must be at most ${max} characters`);

// Texte facultatif : de 0 à `max` caractères (la chaîne vide est acceptée).
const optionalText = (field, max) =>
  z.string({ error: `${field} must be a string` }).max(max, `${field} must be at most ${max} characters`);

// Une vraie date du calendrier au format YYYY-MM-DD ("2026-02-30" est refusée).
const civilDate = (field) =>
  z
    .string({ error: `${field} must be a string in YYYY-MM-DD format` })
    .refine(isValidCivilDate, `${field} must be a real calendar date in YYYY-MM-DD format`);

// Les trois priorités possibles.
const priority = z.enum(PRIORITIES, { error: "priority must be one of: low, medium, high" });

// Un fuseau horaire IANA connu, par exemple "Europe/Paris".
const timeZone = z
  .string({ error: "tz must be a string" })
  .refine(isValidTimeZone, "tz must be a valid IANA time zone, for example Europe/Paris");

// Vérifie qu'un intervalle from/to est dans le bon sens (si les deux sont donnés).
const fromBeforeTo = [(q) => !q.from || !q.to || q.from <= q.to, { error: "from must not be after to", path: ["from"] }];

// ----- Comptes -----

// Formulaire d'inscription : un email valide, un nom et un mot de passe.
export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  password: z.string(),
});

// Formulaire de connexion : email et mot de passe (doivent être de simples chaînes, ce qui bloque
// aussi les tentatives d'injection NoSQL).
export const loginSchema = z.object({
  email: z.string(),
  password: z.string(),
});

// Modification du profil : le nom (1 à 100 caractères) et/ou l'email, tous deux facultatifs ; seuls ceux envoyés changent.
// Les autres champs sont ignorés, donc impossible de changer le mot de passe ou l'id par cette route.
export const profileUpdateSchema = z.object({
  name: requiredText("name", 100).optional(),
  email: z
    .string({ error: "email must be a string" })
    .trim()
    .email("email must be a valid email address")
    .optional(),
});

// ----- Tâches -----

// Création d'une tâche : le titre et le statut sont obligatoires ; la priorité vaut "medium" par défaut.
export const taskCreateSchema = z.object({
  title: requiredText("title", 120),
  status: z.enum(STATUSES, { error: "status is required and must be one of: todo, doing, done" }),
  description: optionalText("description", 1000).optional(),
  dueDate: civilDate("dueDate").nullable().optional(),
  priority: priority.default("medium"),
});

// Modification d'une tâche : tous les champs sont facultatifs, seuls ceux envoyés sont modifiés.
// (dueDate à null efface l'échéance ; les champs inconnus sont ignorés.)
export const taskUpdateSchema = z.object({
  title: requiredText("title", 120).optional(),
  status: z.enum(STATUSES, { error: "status must be one of: todo, doing, done" }).optional(),
  description: optionalText("description", 1000).optional(),
  dueDate: civilDate("dueDate").nullable().optional(),
  priority: priority.optional(),
});

// Paramètres d'URL de GET /api/tasks : filtres facultatifs (bonus B1) par statut, priorité et échéance.
export const taskListQuerySchema = z
  .object({
    status: z.enum(STATUSES, { error: "status must be one of: todo, doing, done" }).optional(),
    priority: priority.optional(),
    dueFrom: civilDate("dueFrom").optional(),
    dueTo: civilDate("dueTo").optional(),
    noDueDate: z.enum(["true", "false"], { error: "noDueDate must be true or false" }).optional(),
  })
  .refine((q) => !(q.noDueDate === "true" && (q.dueFrom || q.dueTo)), {
    error: "noDueDate cannot be combined with dueFrom or dueTo",
    path: ["noDueDate"],
  })
  .refine((q) => !q.dueFrom || !q.dueTo || q.dueFrom <= q.dueTo, {
    error: "dueFrom must not be after dueTo",
    path: ["dueFrom"],
  });

// ----- Habitudes (bonus B2) -----

// Création d'une habitude : seul le nom est obligatoire.
export const habitCreateSchema = z.object({
  name: requiredText("name", 100),
  description: optionalText("description", 500).optional(),
});

// Modification d'une habitude : tous les champs sont facultatifs.
export const habitUpdateSchema = z.object({
  name: requiredText("name", 100).optional(),
  description: optionalText("description", 500).optional(),
});

// Paramètres d'URL des listes d'habitudes et d'événements : période facultative from/to.
export const habitRangeQuerySchema = z
  .object({ from: civilDate("from").optional(), to: civilDate("to").optional() })
  .refine(...fromBeforeTo);

// Enregistrer qu'une habitude a été réalisée un jour donné. Le serveur ne connaît pas le fuseau de
// l'utilisateur ; on refuse donc seulement les dates à plus d'un jour dans le futur (en UTC).
export const habitEventCreateSchema = z.object({
  date: civilDate("date").refine(
    (date) => date <= addDays(new Date().toISOString().slice(0, 10), 1),
    "date must not be in the future"
  ),
});

// ----- Calendrier -----

// Calendrier : la période à afficher (from et to obligatoires) et le fuseau horaire de l'utilisateur.
export const calendarQuerySchema = z
  .object({ from: civilDate("from"), to: civilDate("to"), tz: timeZone.optional() })
  .refine(...fromBeforeTo);

// ----- Statistiques (bonus B3 et B4) -----

// Heatmap : période facultative (par défaut les 52 dernières semaines) et fuseau horaire de l'utilisateur.
export const heatmapQuerySchema = z
  .object({ from: civilDate("from").optional(), to: civilDate("to").optional(), tz: timeZone.optional() })
  .refine(...fromBeforeTo);

// Taux de complétion : période (semaine ou mois), nombre de périodes à renvoyer et fuseau horaire.
export const completionQuerySchema = z.object({
  period: z.enum(["week", "month"], { error: "period must be week or month" }).optional(),
  count: z.coerce
    .number({ error: "count must be a number" })
    .int("count must be a whole number")
    .min(1, "count must be at least 1")
    .max(52, "count must be at most 52")
    .optional(),
  tz: timeZone.optional(),
});
