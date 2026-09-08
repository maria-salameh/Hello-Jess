import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api, type Task } from "../api";
import { useAuth } from "../context/AuthContext";
import { styles } from "./styles";

const PRIORITIES: Task["priority"][] = ["low", "medium", "high"];

export default function TasksScreen() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);

  const loadTasks = useCallback(async () => {
    const res = await api.get<Task[]>("/tasks");
    setTasks(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function handleAdd() {
    if (!title.trim()) return;
    await api.post("/tasks", { title, priority });
    setTitle("");
    setPriority("medium");
    loadTasks();
  }

  async function handleToggle(task: Task) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)));
    await api.patch(`/tasks/${task.id}`, { completed: !task.completed });
  }

  async function handleDelete(task: Task) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    await api.delete(`/tasks/${task.id}`);
  }

  const visibleTasks = showCompleted ? tasks : tasks.filter((t) => !t.completed);
  const remaining = tasks.filter((t) => !t.completed).length;

  return (
    <View style={styles.tasksPage}>
      <View style={styles.tasksHeader}>
        <View>
          <Text style={styles.title}>HelloJess</Text>
          <Text style={styles.subtitle}>
            Hi {user?.name} — {remaining} task{remaining === 1 ? "" : "s"} left
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Add a new task..."
        value={title}
        onChangeText={setTitle}
        onSubmitEditing={handleAdd}
        returnKeyType="done"
      />

      <View style={styles.priorityRow}>
        {PRIORITIES.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.priorityChip, priority === p && styles.priorityChipActive]}
            onPress={() => setPriority(p)}
          >
            <Text style={[styles.priorityChipText, priority === p && styles.priorityChipTextActive]}>
              {p}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Text style={styles.buttonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.showCompletedRow}>
        <Switch value={showCompleted} onValueChange={setShowCompleted} />
        <Text style={styles.subtitle}>Show completed</Text>
      </View>

      {loading ? (
        <Text style={styles.emptyState}>Loading...</Text>
      ) : (
        <FlatList
          data={visibleTasks}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={{ gap: 8 }}
          ListEmptyComponent={<Text style={styles.emptyState}>No tasks yet — add one above.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.taskItem, styles[`priority_${item.priority}` as const]]}>
              <TouchableOpacity onPress={() => handleToggle(item)} style={styles.checkbox}>
                <View style={[styles.checkboxBox, item.completed && styles.checkboxBoxChecked]} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[styles.taskTitle, item.completed && styles.taskTitleCompleted]}>
                  {item.title}
                </Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.priority}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item)}>
                <Text style={styles.deleteBtn}>×</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}
