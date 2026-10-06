// L'écran de profil : les informations du compte connecté (modifiables) et un petit résumé de son activité.
// On y arrive en touchant l'utilisateur affiché sous le titre.
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api, errorMessages, type Habit, type TaskCount } from "../api";
import ErrorList from "../components/ErrorList";
import { useAuth } from "../context/AuthContext";
import { formatDate, todayLocal } from "../utils/dates";
import { styles } from "./styles";

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout, updateProfile } = useAuth();
  // Le résumé : nombre de tâches (par statut) et d'habitudes.
  const [counts, setCounts] = useState<TaskCount | null>(null);
  const [habitCount, setHabitCount] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  // La modification du profil : le mode "édition", les champs du formulaire, les erreurs et la confirmation.
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Charge le résumé à l'ouverture de l'écran.
  useEffect(() => {
    Promise.all([api.get<TaskCount>("/tasks/count"), api.get<Habit[]>("/habits")])
      .then(([tasks, habits]) => {
        setCounts(tasks.data);
        setHabitCount(habits.data.length);
      })
      .catch((err) => setErrors(errorMessages(err)));
  }, []);

  if (!user) return null;

  // Passe en mode édition : le formulaire démarre avec le nom et l'email actuels.
  function startEditing() {
    setName(user!.name);
    setEmail(user!.email);
    setFormErrors([]);
    setSaved(false);
    setEditing(true);
  }

  // Enregistre les modifications. Les erreurs du backend (email invalide ou déjà utilisé, nom vide...)
  // s'affichent dans le formulaire, qui reste ouvert pour qu'on puisse corriger.
  async function handleSave() {
    setFormErrors([]);
    setSaving(true);
    try {
      await updateProfile({ name, email });
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setFormErrors(errorMessages(err));
    } finally {
      setSaving(false);
    }
  }

  // Les informations du compte, affichées une par ligne : un libellé gris et sa valeur.
  // Le nom et l'email ne sont listés que hors édition (pendant l'édition, ils sont dans le formulaire).
  const details: [string, string][] = [
    ...(editing ? [] : ([["Name", user.name], ["Email", user.email]] as [string, string][])),
    ["Member since", formatDate(todayLocal(new Date(user.created_at)))],
    ["User ID", user.id],
  ];

  return (
    <ScrollView style={styles.scrollPage} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backLink}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Your profile</Text>
      <ErrorList messages={errors} />
      {saved && <Text style={styles.success}>Profile updated.</Text>}

      {/* Les informations du compte : avatar, nom, email, date d'inscription et identifiant. */}
      <View style={styles.statsCard}>
        <View style={styles.profileHead}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statsHeading}>{user.name}</Text>
            <Text style={styles.statsNote}>{user.email}</Text>
          </View>
          {/* Le bouton qui ouvre le formulaire de modification (caché pendant l'édition). */}
          {!editing && (
            <TouchableOpacity style={styles.logoutBtn} onPress={startEditing}>
              <Text style={styles.logoutText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Le formulaire de modification du nom et de l'email. */}
        {editing && (
          <View style={{ gap: 8 }}>
            <ErrorList messages={formErrors} />
            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} />
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
              <Text style={styles.buttonText}>{saving ? "Saving..." : "Save changes"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setEditing(false)} disabled={saving}>
              <Text style={styles.logoutText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {details.map(([label, value]) => (
          <View key={label} style={styles.profileRow}>
            <Text style={styles.statsNote}>{label}</Text>
            <Text style={styles.profileValue}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Le résumé de l'activité : tâches par statut et nombre d'habitudes. */}
      <View style={styles.statsCard}>
        <Text style={styles.statsHeading}>Your activity</Text>
        {counts && habitCount !== null ? (
          <View style={styles.statsSummary}>
            {(
              [
                [counts.total, "tasks"],
                [counts.todo, "to do"],
                [counts.doing, "doing"],
                [counts.done, "done"],
                [habitCount, "habits"],
              ] as const
            ).map(([value, label]) => (
              <View key={label}>
                <Text style={styles.statsSummaryValue}>{value}</Text>
                <Text style={styles.statsSummaryLabel}>{label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.statsNote}>Loading...</Text>
        )}
      </View>

      <TouchableOpacity style={styles.dangerButton} onPress={logout}>
        <Text style={styles.dangerText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
