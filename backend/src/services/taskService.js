import { Task } from "../models/Task.js";

// Open tasks first, then by due date (undated last); ties keep creation order.
function byCompletedThenDueDate(a, b) {
  if (a.completed !== b.completed) return a.completed - b.completed;
  if (Boolean(a.due_date) !== Boolean(b.due_date)) return a.due_date ? -1 : 1;
  return a.due_date ? a.due_date - b.due_date : 0;
}

export async function listTasks(userId, { completed } = {}) {
  const filter = { owner: userId };
  if (completed !== undefined) filter.completed = completed;

  const tasks = await Task.find(filter).sort({ _id: 1 });
  return tasks.sort(byCompletedThenDueDate);
}

export function createTask(userId, data) {
  return Task.create({ ...data, owner: userId });
}

export function updateTask(userId, taskId, changes) {
  const filter = { _id: taskId, owner: userId };
  if (Object.keys(changes).length === 0) return Task.findOne(filter);
  return Task.findOneAndUpdate(filter, changes, { returnDocument: "after", runValidators: true });
}

export function deleteTask(userId, taskId) {
  return Task.findOneAndDelete({ _id: taskId, owner: userId });
}
