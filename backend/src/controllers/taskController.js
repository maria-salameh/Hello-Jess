import { Task } from "../models/Task.js";

const isObjectId = (value) => /^[0-9a-f]{24}$/i.test(value);

function invalidId(res) {
  return res.status(422).json({ detail: "Invalid task id" });
}

// Open tasks first, then by due date (undated last); ties keep creation order.
function byCompletedThenDueDate(a, b) {
  if (a.completed !== b.completed) return a.completed - b.completed;
  if (Boolean(a.due_date) !== Boolean(b.due_date)) return a.due_date ? -1 : 1;
  return a.due_date ? a.due_date - b.due_date : 0;
}

export async function listTasks(req, res) {
  const { completed } = res.locals.query;
  const filter = { owner: req.user._id };
  if (completed !== undefined) filter.completed = completed === "true";

  const tasks = await Task.find(filter).sort({ _id: 1 });
  res.json(tasks.sort(byCompletedThenDueDate));
}

export async function createTask(req, res) {
  const task = await Task.create({ ...res.locals.body, owner: req.user._id });
  res.status(201).json(task);
}

export async function updateTask(req, res) {
  const { id } = req.params;
  if (!isObjectId(id)) return invalidId(res);

  const changes = res.locals.body;
  const filter = { _id: id, owner: req.user._id };
  const task = Object.keys(changes).length
    ? await Task.findOneAndUpdate(filter, changes, { returnDocument: "after", runValidators: true })
    : await Task.findOne(filter);

  if (!task) return res.status(404).json({ detail: "Task not found" });
  res.json(task);
}

export async function deleteTask(req, res) {
  const { id } = req.params;
  if (!isObjectId(id)) return invalidId(res);

  const task = await Task.findOneAndDelete({ _id: id, owner: req.user._id });
  if (!task) return res.status(404).json({ detail: "Task not found" });
  res.status(204).end();
}
