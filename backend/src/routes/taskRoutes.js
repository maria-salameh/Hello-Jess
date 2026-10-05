// URLs des tâches. app.js monte ce routeur sur /api/tasks, donc les chemins complets sont /api/tasks et /api/tasks/:id.
import { Router } from "express";
import {
  createTask,
  deleteTask,
  getAllTasks,
  getTask,
  getTaskCount,
  updateTask,
} from "../controllers/taskController.js";
import { requireAuth, validate } from "../middleware.js";
import { taskCreateSchema, taskListQuerySchema, taskUpdateSchema } from "../schemas.js";

const router = Router();

// Toutes les routes de tâches nécessitent un utilisateur connecté.
router.use(requireAuth);

// Lister les tâches (paramètres d'URL vérifiés avec taskListQuerySchema : filtres facultatifs).
router.get("/", validate(taskListQuerySchema, "query"), getAllTasks);
// Le compteur de tâches par statut. À déclarer AVANT "/:id", sinon "count" serait pris pour un id.
router.get("/count", getTaskCount);
// Créer une tâche (corps vérifié avec taskCreateSchema).
router.post("/", validate(taskCreateSchema), createTask);
// Voir le détail d'une tâche par son id.
router.get("/:id", getTask);
// Modifier une tâche par son id (corps vérifié avec taskUpdateSchema).
router.patch("/:id", validate(taskUpdateSchema), updateTask);
// Supprimer une tâche par son id.
router.delete("/:id", deleteTask);

export default router;
