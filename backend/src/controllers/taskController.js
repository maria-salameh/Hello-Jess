import * as taskService from "../services/taskService.js";

const isObjectId = (value) => /^[0-9a-f]{24}$/i.test(value);

function invalidId(res) {
  return res.status(422).json({ detail: "Invalid task id" });
}

export async function getAllTasks(req, res) {
  const { completed } = res.locals.query;
  const tasks = await taskService.listTasks(req.user._id, {
    completed: completed === undefined ? undefined : completed === "true",
  });
  res.json(tasks);
}

export async function createTask(req, res) {
  const task = await taskService.createTask(req.user._id, res.locals.body);
  res.status(201).json(task);
}

export async function updateTask(req, res) {
  const { id } = req.params;
  if (!isObjectId(id)) return invalidId(res);

  const task = await taskService.updateTask(req.user._id, id, res.locals.body);
  if (!task) return res.status(404).json({ detail: "Task not found" });
  res.json(task);
}

export async function deleteTask(req, res) {
  const { id } = req.params;
  if (!isObjectId(id)) return invalidId(res);

  const task = await taskService.deleteTask(req.user._id, id);
  if (!task) return res.status(404).json({ detail: "Task not found" });
  res.status(204).end();
}
