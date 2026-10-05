import { Router } from "express";
import {
  createTask,
  deleteTask,
  listTasks,
  updateTask,
} from "../controllers/taskController.js";
import { requireAuth, validate } from "../middleware.js";
import { taskCreateSchema, taskListQuerySchema, taskUpdateSchema } from "../schemas.js";

const router = Router();

router.use(requireAuth);

router.get("/", validate(taskListQuerySchema, "query"), listTasks);
router.post("/", validate(taskCreateSchema), createTask);
router.patch("/:id", validate(taskUpdateSchema), updateTask);
router.delete("/:id", deleteTask);

export default router;
