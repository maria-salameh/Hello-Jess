// L'écran principal après connexion : afficher, ajouter, cocher et supprimer ses tâches.
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

// Les trois priorités proposées, affichées sous forme de petits boutons.
const PRIORITIES: Task["priority"][] = ["low", "medium", "high"];

export default function TasksScreen() {
  const { user, logout } = useAuth();
  // La liste des tâches telle que reçue du backend.
  const [tasks, setTasks] = useState<Task[]>([]);
  // Les champs du formulaire "ajouter une tâche".
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  // Vaut true tant que la première liste n'est pas arrivée.
  const [loading, setLoading] = useState(true);
  // Interrupteur "Show completed" : afficher ou masquer les tâches terminées.
  const [showCompleted, setShowCompleted] = useState(true);

  // Demande la liste au backend et la range dans l'état.
  const loadTasks = useCallback(async () => {
    const res = await api.get<Task[]>("/tasks");
    setTasks(res.data);
    setLoading(false);
  }, []);

  // Charge la liste une fois, à l'ouverture de l'écran.
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Ajoute une tâche : envoie la nouvelle tâche, vide le formulaire, puis recharge la liste.
  async function handleAdd() {
    // Ignore un titre vide ou fait uniquement d'espaces.
    if (!title.trim()) return;
    await api.post("/tasks", { title, priority });
    setTitle("");
    setPriority("medium");
    loadTasks();
  }

  // Coche/décoche une tâche : l'écran est mis à jour tout de suite, puis le backend est prévenu.
  async function handleToggle(task: Task) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)));
    await api.patch(`/tasks/${task.id}`, { completed: !task.completed });
  }

  // Supprime une tâche : retirée de l'écran tout de suite, puis supprimée côté backend.
  async function handleDelete(task: Task) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    await api.delete(`/tasks/${task.id}`);
  }

  // Les tâches à afficher (selon l'interrupteur "Show completed") et le nombre de tâches encore à faire.
  const visibleTasks = showCompleted ? tasks : tasks.filter((t) => !t.completed);
  const remaining = tasks.filter((t) => !t.completed).length;

  return (
    <View style={styles.tasksPage}>
      {/* En-tête : titre, message de bienvenue avec le nombre de tâches restantes, bouton de déconnexion. */}
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

      {/* Champ pour saisir le titre d'une nouvelle tâche ; la touche "Entrée" du clavier l'ajoute aussi. */}
      <TextInput
        style={styles.input}
        placeholder="Add a new task..."
        value={title}
        onChangeText={setTitle}
        onSubmitEditing={handleAdd}
        returnKeyType="done"
      />

      {/* Choix de la priorité (le bouton sélectionné est mis en évidence) et bouton "Add". */}
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

      {/* Interrupteur pour afficher ou masquer les tâches terminées. */}
      <View style={styles.showCompletedRow}>
        <Switch value={showCompleted} onValueChange={setShowCompleted} />
        <Text style={styles.subtitle}>Show completed</Text>
      </View>

      {/* La liste : message de chargement, ou une ligne par tâche (avec un message si la liste est vide). */}
      {loading ? (
        <Text style={styles.emptyState}>Loading...</Text>
      ) : (
        <FlatList
          data={visibleTasks}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={{ gap: 8 }}
          ListEmptyComponent={<Text style={styles.emptyState}>No tasks yet — add one above.</Text>}
          renderItem={({ item }) => (
            // Une tâche : la couleur de la bordure gauche dépend de sa priorité.
            <View style={[styles.taskItem, styles[`priority_${item.priority}` as const]]}>
              {/* Case à cocher : appuyer bascule l'état terminé/non terminé. */}
              <TouchableOpacity onPress={() => handleToggle(item)} style={styles.checkbox}>
                <View style={[styles.checkboxBox, item.completed && styles.checkboxBoxChecked]} />
              </TouchableOpacity>
              {/* Titre (barré si terminée) et pastille de priorité. */}
              <View style={{ flex: 1 }}>
                <Text style={[styles.taskTitle, item.completed && styles.taskTitleCompleted]}>
                  {item.title}
                </Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.priority}</Text>
                </View>
              </View>
              {/* Bouton de suppression. */}
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
