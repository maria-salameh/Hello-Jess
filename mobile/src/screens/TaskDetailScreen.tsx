// L'écran de détail d'une tâche : on y voit toutes ses informations, on peut les modifier ou supprimer la tâche.
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api, errorMessages, type Priority, type Task, type TaskStatus } from "../api";
import Chip from "../components/Chip";
import ErrorList from "../components/ErrorList";
import { formatDateTime } from "../utils/dates";
import { styles } from "./styles";

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "doing", label: "Doing" },
  { value: "done", label: "Done" },
];
const PRIORITIES: Priority[] = ["low", "medium", "high"];

export default function TaskDetailScreen() {
  const navigation = useNavigation<any>();
  // L'id de la tâche est passé par l'écran précédent (navigation.navigate("TaskDetail", { id })).
  const { id } = useRoute<any>().params;
  // La tâche telle qu'enregistrée (pour afficher les dates), et le formulaire de modification.
  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  // Messages d'erreur, confirmation d'enregistrement, chargement et tâche introuvable.
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Recopie une tâche dans les champs du formulaire.
  function fillForm(loaded: Task) {
    setTask(loaded);
    setTitle(loaded.title);
    setDescription(loaded.description);
    setStatus(loaded.status);
    setPriority(loaded.priority);
    setDueDate(loaded.dueDate ?? "");
  }

  // Charge la tâche à l'ouverture de l'écran. Une tâche inconnue (ou celle d'un autre utilisateur) donne "introuvable".
  useEffect(() => {
    api
      .get<Task>(`/tasks/${id}`)
      .then((res) => fillForm(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  // Enregistre les modifications ; les erreurs de validation du backend s'affichent au-dessus du formulaire.
  async function handleSave() {
    setErrors([]);
    setSaved(false);
    try {
      const res = await api.patch<Task>(`/tasks/${id}`, {
        title,
        status,
        description,
        priority,
        dueDate: dueDate || null,
      });
      fillForm(res.data);
      setSaved(true);
    } catch (err) {
      setErrors(errorMessages(err));
    }
  }

  // Supprime la tâche, puis retourne à la liste.
  async function handleDelete() {
    try {
      await api.delete(`/tasks/${id}`);
      navigation.goBack();
    } catch (err) {
      setErrors(errorMessages(err));
    }
  }

  return (
    <ScrollView style={styles.scrollPage} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backLink}>← Back to tasks</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Task details</Text>

      {loading ? (
        <Text style={styles.emptyState}>Loading...</Text>
      ) : notFound || !task ? (
        <Text style={styles.emptyState}>This task doesn't exist.</Text>
      ) : (
        <View style={{ gap: 10 }}>
          <ErrorList messages={errors} />
          {saved && <Text style={styles.success}>Saved.</Text>}

          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} />
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <Text style={styles.label}>Status</Text>
          <View style={styles.chipRow}>
            {STATUSES.map((s) => (
              <Chip key={s.value} label={s.label} active={status === s.value} onPress={() => setStatus(s.value)} />
            ))}
          </View>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.chipRow}>
            {PRIORITIES.map((p) => (
              <Chip key={p} label={p} active={priority === p} onPress={() => setPriority(p)} />
            ))}
          </View>
          <Text style={styles.label}>Due date (YYYY-MM-DD, empty for none)</Text>
          <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate} autoCapitalize="none" placeholder="2026-12-31" placeholderTextColor="#a29e9b" />

          {/* Les dates gérées par le serveur : lecture seule. */}
          <Text style={styles.detailMeta}>Created: {formatDateTime(task.createdAt)}</Text>
          <Text style={styles.detailMeta}>Updated: {formatDateTime(task.updatedAt)}</Text>
          {task.completedAt && <Text style={styles.detailMeta}>Completed: {formatDateTime(task.completedAt)}</Text>}

          <TouchableOpacity style={styles.button} onPress={handleSave}>
            <Text style={styles.buttonText}>Save changes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerButton} onPress={handleDelete}>
            <Text style={styles.dangerText}>Delete task</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
