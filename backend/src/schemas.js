// Règles de validation des données reçues (avec zod). Une requête qui ne les respecte pas reçoit
// une réponse 422 avant même d'arriver à un contrôleur ; voir validate() dans middleware.js.
import { z } from "zod";

// Seules ces trois priorités sont autorisées.
const priority = z.enum(["low", "medium", "high"]);

// Une date envoyée sous forme de texte (ex. "2026-11-10T00:00:00.000Z") : on vérifie que c'est
// une vraie date, puis on la convertit en objet Date JavaScript.
const datetime = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid datetime")
  .transform((s) => new Date(s));

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

// Création d'une tâche : seul le titre est obligatoire ; la priorité vaut "medium" par défaut.
export const taskCreateSchema = z.object({
  title: z.string(),
  notes: z.string().nullable().optional(),
  due_date: datetime.nullable().optional(),
  priority: priority.default("medium"),
});

// Modification d'une tâche : tous les champs sont facultatifs, seuls ceux envoyés sont modifiés.
// (null efface notes/due_date ; les champs inconnus sont ignorés.)
export const taskUpdateSchema = z.object({
  title: z.string().optional(),
  notes: z.string().nullable().optional(),
  due_date: datetime.nullable().optional(),
  priority: priority.optional(),
  completed: z.boolean().optional(),
});

// Paramètres d'URL de GET /api/tasks : filtre facultatif ?completed=true ou ?completed=false.
export const taskListQuerySchema = z.object({
  completed: z.enum(["true", "false"]).optional(),
});
