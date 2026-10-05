// L'écran des habitudes (bonus B2) : créer des habitudes récurrentes et cocher, jour par jour, celles qu'on a réalisées.
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api, errorMessages, type Habit } from "../api";
import ErrorList from "../components/ErrorList";
import TopNav from "../components/TopNav";
import { confirmAction } from "../utils/confirm";
import { addDays, dayOfMonth, todayLocal, weekdayShort } from "../utils/dates";
import { styles } from "./styles";

export default function HabitsScreen() {
  const navigation = useNavigation<any>();
  const [habits, setHabits] = useState<Habit[]>([]);
  // Les champs du formulaire "ajouter une habitude".
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  // Les messages d'erreur du formulaire et ceux de la liste.
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [listErrors, setListErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Les 7 derniers jours (du plus ancien à aujourd'hui), dans le calendrier du téléphone.
  const today = todayLocal();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  // Charge les habitudes avec les jours réalisés pendant ces 7 jours.
  const loadHabits = useCallback(async () => {
    try {
      const res = await api.get<Habit[]>("/habits", { params: { from: addDays(todayLocal(), -6), to: todayLocal() } });
      setHabits(res.data);
      setListErrors([]);
    } catch (err) {
      setListErrors(errorMessages(err));
    }
    setLoading(false);
  }, []);

  // Charge la liste à l'ouverture, et à chaque retour sur cet écran.
  useEffect(() => {
    loadHabits();
  }, [loadHabits]);
  useEffect(() => navigation.addListener("focus", loadHabits), [navigation, loadHabits]);

  // Formulaire d'ajout : crée l'habitude, puis vide le formulaire et recharge la liste.
  async function handleAdd() {
    setFormErrors([]);
    try {
      await api.post("/habits", { name, description });
      setName("");
      setDescription("");
      await loadHabits();
    } catch (err) {
      setFormErrors(errorMessages(err));
    }
  }

  // Coche ou décoche un jour : l'écran est mis à jour tout de suite, puis le backend est prévenu
  // (en cas d'échec on recharge pour revenir à l'état réel).
  async function toggleDay(habit: Habit, date: string) {
    const done = habit.completions?.includes(date) ?? false;
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habit.id
          ? { ...h, completions: done ? h.completions?.filter((d) => d !== date) : [...(h.completions ?? []), date] }
          : h
      )
    );
    try {
      if (done) await api.delete(`/habits/${habit.id}/events/${date}`);
      else await api.post(`/habits/${habit.id}/events`, { date });
    } catch (err) {
      setListErrors(errorMessages(err));
      await loadHabits();
    }
  }

  // Supprime une habitude (et tous ses jours enregistrés), après confirmation.
  function handleDelete(habit: Habit) {
    confirmAction(`Delete "${habit.name}" and all its history?`, async () => {
      try {
        await api.delete(`/habits/${habit.id}`);
        await loadHabits();
      } catch (err) {
        setListErrors(errorMessages(err));
      }
    });
  }

  // Tout ce qui est au-dessus de la liste : menu, formulaire d'ajout et erreurs.
  const header = (
    <View style={{ gap: 10, paddingBottom: 10 }}>
      <TopNav subtitle="Build habits, one day at a time" />
      <ErrorList messages={formErrors} />
      <TextInput
        style={styles.input}
        placeholder="New habit (e.g. Drink water)"
        placeholderTextColor="#a29e9b"
        value={name}
        onChangeText={setName}
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
      <TouchableOpacity style={styles.button} onPress={handleAdd}>
        <Text style={styles.buttonText}>Add</Text>
      </TouchableOpacity>
      <ErrorList messages={listErrors} />
    </View>
  );

  return (
    <View style={styles.tasksPage}>
      <FlatList
        data={loading ? [] : habits}
        keyExtractor={(h) => h.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 10, paddingBottom: 40 }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text style={styles.emptyState}>{loading ? "Loading..." : "No habits yet — add one above."}</Text>
        }
        renderItem={({ item: habit }) => (
          // Une carte par habitude : son nom en haut et les 7 derniers jours en dessous.
          <View style={styles.habitCard}>
            <View style={styles.habitHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{habit.name}</Text>
                {habit.description !== "" && <Text style={styles.taskNotes}>{habit.description}</Text>}
              </View>
              <TouchableOpacity onPress={() => handleDelete(habit)} accessibilityLabel={`Delete ${habit.name}`}>
                <Text style={styles.deleteBtn}>×</Text>
              </TouchableOpacity>
            </View>
            {/* Les 7 derniers jours : un bouton par jour, plein quand l'habitude a été réalisée ce jour-là. */}
            <View style={styles.habitDays}>
              {days.map((date) => {
                const done = habit.completions?.includes(date) ?? false;
                return (
                  <TouchableOpacity
                    key={date}
                    style={[styles.habitDay, done && styles.habitDayDone, date === today && styles.habitDayToday]}
                    onPress={() => toggleDay(habit, date)}
                    accessibilityLabel={`${habit.name} on ${date}`}
                  >
                    <Text style={[styles.habitDayWeekday, done && { color: "rgba(255,255,255,0.85)" }]}>{weekdayShort(date)}</Text>
                    <Text style={[styles.habitDayNumber, done && { color: "#fff" }]}>{dayOfMonth(date)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      />
    </View>
  );
}
