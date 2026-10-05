// URLs des tâches. app.js monte ce routeur sur /api/tasks, donc les chemins complets sont /api/tasks et /api/tasks/:id.
import { Router } from "express";
import {
  createTask,
  deleteTask,
  getAllTasks,
  updateTask,
} from "../controllers/taskController.js";
import { requireAuth, validate } from "../middleware.js";
import { taskCreateSchema, taskListQuerySchema, taskUpdateSchema } from "../schemas.js";

const router = Router();

// Toutes les routes de tâches nécessitent un utilisateur connecté.
router.use(requireAuth);

// Lister les tâches (paramètres d'URL vérifiés avec taskListQuerySchema).
router.get("/", validate(taskListQuerySchema, "query"), getAllTasks);
// Créer une tâche (corps vérifié avec taskCreateSchema).
router.post("/", validate(taskCreateSchema), createTask);
// Modifier une tâche par son id (corps vérifié avec taskUpdateSchema).
router.patch("/:id", validate(taskUpdateSchema), updateTask);
// Supprimer une tâche par son id.
router.delete("/:id", deleteTask);

export default router;
