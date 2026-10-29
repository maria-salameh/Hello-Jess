// Les notes partagées : tout le monde dans l'espace de travail voit les modifications au fur et à mesure qu'on tape, sur chaque appareil.
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api, errorMessages, type Note } from "../api";
import Button from "../components/Button";
import ErrorList from "../components/ErrorList";
import FadeIn from "../components/FadeIn";
import TopNav from "../components/TopNav";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useLiveReload } from "../hooks/useLiveReload";
import { confirmAction } from "../utils/confirm";
import { styles } from "./styles";

// Combien de temps attendre après la dernière touche avant d'envoyer la modification.
const SEND_DELAY_MS = 400;

type SaveState = "saved" | "saving" | "error";

export default function NotesScreen() {
  const { user } = useAuth();
  const { socket, current } = useWorkspace();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Le texte en cours de saisie. Il est séparé de `notes` pour qu'une modification reçue ne déplace jamais le curseur.
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  // Vrai dès la première touche jusqu'à ce que le serveur ait confirmé la modification.
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const selectedRef = useRef<string | null>(null);
  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  const open = useCallback((note: Note | null) => {
    clearTimeout(timer.current);
    dirty.current = false;
    setSelectedId(note?.id ?? null);
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
    setSaveState("saved");
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Note[]>("/notes");
      setNotes(res.data);
      setErrors([]);
      // Si la note ouverte n'existe plus (supprimée ailleurs), on revient à la liste.
      if (!res.data.some((n) => n.id === selectedRef.current) && !dirty.current) open(null);
    } catch (err) {
      setErrors(errorMessages(err));
    }
    setLoading(false);
  }, [open]);

  useEffect(() => {
    load();
  }, [load]);
  useLiveReload([], load);

  // Changements en direct venus des autres appareils et des autres membres.
  useEffect(() => {
    if (!socket) return;
    const onCreated = (note: Note) => setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [note, ...prev]));
    const onUpdated = (note: Note) => {
      setNotes((prev) => [note, ...prev.filter((n) => n.id !== note.id)]);
      // Affiche la modification de quelqu'un d'autre dans la note ouverte, sauf si l'utilisateur a du texte pas encore envoyé.
      if (note.id === selectedRef.current && note.updatedById !== user?.id && !dirty.current) {
        setTitle(note.title);
        setContent(note.content);
      }
    };
    const onDeleted = ({ id }: { id: string }) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (id === selectedRef.current) open(null);
    };
    socket.on("note:created", onCreated);
    socket.on("note:updated", onUpdated);
    socket.on("note:deleted", onDeleted);
    return () => {
      socket.off("note:created", onCreated);
      socket.off("note:updated", onUpdated);
      socket.off("note:deleted", onDeleted);
    };
  }, [socket, user?.id, open]);

  // Envoie la modification par WebSocket ; repasse par HTTP quand le socket est coupé.
  const send = useCallback(
    async (id: string, changes: { title: string; content: string }) => {
      setSaveState("saving");
      try {
        if (socket?.connected) {
          const ack = await socket.timeout(5000).emitWithAck("note:edit", { id, workspaceId: current?.id, ...changes });
          if (!ack.ok) throw new Error(ack.detail);
        } else {
          await api.patch(`/notes/${id}`, changes);
        }
        dirty.current = false;
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    },
    [socket, current?.id],
  );

  function edit(changes: Partial<{ title: string; content: string }>) {
    if (!selectedId) return;
    const next = { title, content, ...changes };
    setTitle(next.title);
    setContent(next.content);
    dirty.current = true;
    setSaveState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => send(selectedId, next), SEND_DELAY_MS);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  async function handleAdd() {
    try {
      const res = await api.post<Note>("/notes", { title: "Untitled note" });
      setNotes((prev) => (prev.some((n) => n.id === res.data.id) ? prev : [res.data, ...prev]));
      open(res.data);
    } catch (err) {
      setErrors(errorMessages(err));
    }
  }

  function handleDelete(note: Note) {
    confirmAction(`Delete "${note.title || "Untitled note"}" for everyone in this workspace?`, async () => {
      try {
        await api.delete(`/notes/${note.id}`);
        setNotes((prev) => prev.filter((n) => n.id !== note.id));
        if (note.id === selectedId) open(null);
      } catch (err) {
        setErrors(errorMessages(err));
      }
    });
  }

  const editor = current?.members.find((m) => m.id === selected?.updatedById);

  return (
    <ScrollView style={styles.scrollPage} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <TopNav subtitle={`Notes shared in ${current?.name ?? "your workspace"}`} />
      <ErrorList messages={errors} />

      {loading ? (
        <Text style={styles.emptyState}>Loading...</Text>
      ) : selected ? (
        // L'éditeur d'une note.
        <FadeIn style={{ gap: 10 }}>
          <TouchableOpacity onPress={() => open(null)}>
            <Text style={styles.backLink}>← All notes</Text>
          </TouchableOpacity>
          <View style={styles.noteHead}>
            <TextInput
              style={[styles.input, { flex: 1, fontWeight: "700" }]}
              value={title}
              maxLength={120}
              onChangeText={(text) => edit({ title: text })}
              placeholder="Title"
              placeholderTextColor="#a09db8"
              accessibilityLabel="Note title"
            />
            <TouchableOpacity onPress={() => handleDelete(selected)} accessibilityLabel="Delete note">
              <Text style={styles.deleteBtn}>×</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, styles.noteTextInput]}
            value={content}
            maxLength={20000}
            multiline
            onChangeText={(text) => edit({ content: text })}
            placeholder="Start typing..."
            placeholderTextColor="#a09db8"
            accessibilityLabel="Note content"
          />
          <Text style={styles.statsNote}>
            {saveState === "saving" && "Saving..."}
            {saveState === "saved" && `Saved${editor && editor.id !== user?.id ? ` · last edit by ${editor.name}` : ""}`}
            {saveState === "error" && "Could not save. Your text is still here; keep typing to retry."}
          </Text>
        </FadeIn>
      ) : (
        // La liste des notes.
        <View style={{ gap: 10 }}>
          <Button label="New note" onPress={handleAdd} />
          {notes.length === 0 ? (
            <Text style={styles.emptyState}>No notes yet.</Text>
          ) : (
            notes.map((note, index) => (
              <FadeIn key={note.id} delay={Math.min(index, 8) * 45}>
                <TouchableOpacity style={styles.noteCard} onPress={() => open(note)}>
                  <Text style={styles.noteTitle} numberOfLines={1}>
                    {note.title || "Untitled note"}
                  </Text>
                  <Text style={styles.statsNote} numberOfLines={2}>
                    {note.content.slice(0, 120) || "Empty"}
                  </Text>
                </TouchableOpacity>
              </FadeIn>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}
