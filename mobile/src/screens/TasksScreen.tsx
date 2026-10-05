// L'écran principal après connexion : afficher, filtrer, ajouter, changer le statut et supprimer ses tâches.
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api, errorMessages, type Priority, type Task, type TaskCount, type TaskStatus } from "../api";
import Chip from "../components/Chip";
import ErrorList from "../components/ErrorList";
import TopNav from "../components/TopNav";
import { addDays, formatDate, todayLocal } from "../utils/dates";
import { styles } from "./styles";

// Les valeurs possibles des trois filtres (bonus B1).
type StatusFilter = "all" | TaskStatus;
type PriorityFilter = "all" | Priority;
type DueFilter = "all" | "overdue" | "today" | "week" | "none";

// Les boutons proposés pour chaque filtre.
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "todo", label: "To do" },
  { value: "doing", label: "Doing" },
  { value: "done", label: "Done" },
];
const PRIORITY_FILTERS: { value: PriorityFilter; label: string }[] = [
  { value: "all", label: "Any" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];
const DUE_FILTERS: { value: DueFilter; label: string }[] = [
  { value: "all", label: "Any" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today" },
  { value: "week", label: "Next 7 days" },
  { value: "none", label: "No date" },
];
// Les choix du formulaire d'ajout.
const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "doing", label: "Doing" },
  { value: "done", label: "Done" },
];
const PRIORITIES: Priority[] = ["low", "medium", "high"];

// Quand on appuie sur le statut d'une tâche, on passe au suivant : à faire -> en cours -> terminée -> à faire.
const NEXT_STATUS: Record<TaskStatus, TaskStatus> = { todo: "doing", doing: "done", done: "todo" };
const STATUS_LABEL: Record<TaskStatus, string> = { todo: "To do", doing: "Doing", done: "Done" };

// Transforme les trois filtres choisis en paramètres d'URL pour le backend.
// Les échéances "aujourd'hui", "cette semaine"... sont calculées ici, avec la date du téléphone.
function buildParams(status: StatusFilter, priority: PriorityFilter, due: DueFilter) {
  const params: Record<string, string> = {};
  if (status !== "all") params.status = status;
  if (priority !== "all") params.priority = priority;

  const today = todayLocal();
  if (due === "overdue") params.dueTo = addDays(today, -1);
  if (due === "today") {
    params.dueFrom = today;
    params.dueTo = today;
  }
  if (due === "week") {
    params.dueFrom = today;
    params.dueTo = addDays(today, 6);
  }
  if (due === "none") params.noDueDate = "true";
  return params;
}

export default function TasksScreen() {
  const navigation = useNavigation<any>();
  // La liste affichée et le compteur de tâches par statut.
  const [tasks, setTasks] = useState<Task[]>([]);
  const [count, setCount] = useState<TaskCount | null>(null);
  // Les filtres choisis.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  // Les champs du formulaire "ajouter une tâche".
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  // Les messages d'erreur du formulaire d'ajout et ceux de la liste.
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [listErrors, setListErrors] = useState<string[]>([]);
  // Vaut true tant que la première liste n'est pas arrivée.
  const [loading, setLoading] = useState(true);

  // Demande au backend la liste filtrée et le compteur, puis les range dans l'état.
  const loadTasks = useCallback(async () => {
    try {
      const [list, counts] = await Promise.all([
        api.get<Task[]>("/tasks", { params: buildParams(statusFilter, priorityFilter, dueFilter) }),
        api.get<TaskCount>("/tasks/count"),
      ]);
      // "En retard" ne concerne que les tâches non terminées (le backend filtre seulement sur la date).
      setTasks(dueFilter === "overdue" ? list.data.filter((task) => task.status !== "done") : list.data);
      setCount(counts.data);
      setListErrors([]);
    } catch (err) {
      setListErrors(errorMessages(err));
    }
    setLoading(false);
  }, [statusFilter, priorityFilter, dueFilter]);

  // Recharge la liste à l'ouverture de l'écran et à chaque changement de filtre.
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Quand on revient d'un autre écran (ex. la page de détail après une modification), on recharge la liste.
  useEffect(() => navigation.addListener("focus", loadTasks), [navigation, loadTasks]);

  // Formulaire d'ajout : envoie la nouvelle tâche, puis vide le formulaire et recharge la liste.
  // Les erreurs de validation du backend (titre vide, date impossible...) s'affichent au-dessus du formulaire.
  async function handleAdd() {
    setFormErrors([]);
    try {
      await api.post("/tasks", { title, status, description, priority, dueDate: dueDate || null });
      setTitle("");
      setDescription("");
      setStatus("todo");
      setPriority("medium");
      setDueDate("");
      await loadTasks();
    } catch (err) {
      setFormErrors(errorMessages(err));
    }
  }

  // Change le statut d'une tâche, puis recharge pour remettre la liste et le compteur à jour.
  async function handleStatusChange(task: Task, newStatus: TaskStatus) {
    try {
      await api.patch(`/tasks/${task.id}`, { status: newStatus });
      await loadTasks();
    } catch (err) {
      setListErrors(errorMessages(err));
    }
  }

  // Supprime une tâche, puis recharge la liste et le compteur.
  async function handleDelete(task: Task) {
    try {
      await api.delete(`/tasks/${task.id}`);
      await loadTasks();
    } catch (err) {
      setListErrors(errorMessages(err));
    }
  }

  const filtersActive = statusFilter !== "all" || priorityFilter !== "all" || dueFilter !== "all";

  // Tout ce qui est au-dessus de la liste : menu, formulaire d'ajout, filtres et erreurs.
  const header = (
    <View style={{ gap: 10, paddingBottom: 10 }}>
      <TopNav subtitle={count ? `${count.todo + count.doing} open · ${count.done} done` : undefined} />

      {/* Formulaire pour ajouter une tâche : titre, description, statut, priorité, échéance. */}
      <ErrorList messages={formErrors} />
      <TextInput
        style={styles.input}
        placeholder="Add a new task..."
        placeholderTextColor="#a29e9b"
        value={title}
        onChangeText={setTitle}
        onSubmitEditing={handleAdd}
        returnKeyType="done"
      />
      <TextInput
        style={styles.input}
        placeholder="Description (optional)"
        placeholderTextColor="#a29e9b"
        value={description}
        onChangeText={setDescription}
      />
      <View style={styles.chipRow}>
        {STATUSES.map((s) => (
          <Chip key={s.value} label={s.label} active={status === s.value} onPress={() => setStatus(s.value)} />
        ))}
      </View>
      <View style={styles.chipRow}>
        {PRIORITIES.map((p) => (
          <Chip key={p} label={p} active={priority === p} onPress={() => setPriority(p)} />
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Due date (YYYY-MM-DD, optional)"
        placeholderTextColor="#a29e9b"
        value={dueDate}
        onChangeText={setDueDate}
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.button} onPress={handleAdd}>
        <Text style={styles.buttonText}>Add</Text>
      </TouchableOpacity>

      {/* Filtres (bonus B1) : statut avec le compteur, puis priorité et échéance. */}
      <View style={styles.chipRow}>
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            active={statusFilter === f.value}
            count={count ? (f.value === "all" ? count.total : count[f.value]) : undefined}
            onPress={() => setStatusFilter(f.value)}
          />
        ))}
      </View>
      <Text style={styles.groupLabel}>Priority</Text>
      <View style={styles.chipRow}>
        {PRIORITY_FILTERS.map((f) => (
          <Chip key={f.value} label={f.label} active={priorityFilter === f.value} onPress={() => setPriorityFilter(f.value)} />
        ))}
      </View>
      <Text style={styles.groupLabel}>Due date</Text>
      <View style={styles.chipRow}>
        {DUE_FILTERS.map((f) => (
          <Chip key={f.value} label={f.label} active={dueFilter === f.value} onPress={() => setDueFilter(f.value)} />
        ))}
      </View>

      <ErrorList messages={listErrors} />
    </View>
  );

  return (
    <View style={styles.tasksPage}>
      {loading ? (
        <>
          {header}
          <Text style={styles.emptyState}>Loading...</Text>
        </>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(t) => t.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 8, paddingBottom: 40 }}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <Text style={styles.emptyState}>
              {filtersActive ? "No tasks match these filters." : "No tasks yet — add one above."}
            </Text>
          }
          renderItem={({ item }) => {
            // Une tâche est en retard si son échéance est passée et qu'elle n'est pas terminée.
            const overdue = item.status !== "done" && item.dueDate !== null && item.dueDate < todayLocal();
            return (
              // La couleur de la bordure gauche dépend de la priorité.
              <View style={[styles.taskItem, styles[`priority_${item.priority}` as const]]}>
                {/* Case à cocher : appuyer bascule entre "terminée" et "à faire". */}
                <TouchableOpacity
                  onPress={() => handleStatusChange(item, item.status === "done" ? "todo" : "done")}
                  style={styles.checkbox}
                >
                  <View style={[styles.checkboxBox, item.status === "done" && styles.checkboxBoxChecked]} />
                </TouchableOpacity>
                {/* Le titre ouvre l'écran de détail et de modification. */}
                <TouchableOpacity style={{ flex: 1 }} onPress={() => navigation.navigate("TaskDetail", { id: item.id })}>
                  <Text style={[styles.taskTitle, item.status === "done" && styles.taskTitleCompleted]}>{item.title}</Text>
                  {item.description !== "" && (
                    <Text style={styles.taskNotes} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                  <View style={styles.taskMeta}>
                    {/* Le statut : appuyer passe au statut suivant. */}
                    <TouchableOpacity style={styles.statusPill} onPress={() => handleStatusChange(item, NEXT_STATUS[item.status])}>
                      <Text style={styles.statusPillText}>{STATUS_LABEL[item.status]}</Text>
                    </TouchableOpacity>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.priority}</Text>
                    </View>
                    {item.dueDate && (
                      <Text style={[styles.dueText, overdue && styles.dueTextOverdue]}>
                        Due {formatDate(item.dueDate)}
                        {overdue ? " · Overdue" : ""}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
                {/* Bouton de suppression. */}
                <TouchableOpacity onPress={() => handleDelete(item)}>
                  <Text style={styles.deleteBtn}>×</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
