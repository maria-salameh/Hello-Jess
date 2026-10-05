// Tous les styles des écrans mobiles. Sur mobile il n'y a pas de fichiers CSS : les styles
// s'écrivent comme des objets JavaScript, puis chaque élément les utilise avec style={styles.nom}.
import { Platform, StyleSheet } from "react-native";

// La palette de couleurs (thème sombre), définie une seule fois et réutilisée partout.
const colors = {
  bg: "#17161a",
  card: "#211f26",
  text: "#f2f0ef",
  muted: "#a29e9b",
  accent: "#6c5ce7",
  border: "#33313a",
  danger: "#e2574c",
  high: "#e2574c",
  medium: "#e2a33c",
  low: "#4caf82",
};

export const styles = StyleSheet.create({
  // ----- Écrans de connexion et d'inscription -----

  // Fond de l'écran : la carte est centrée verticalement.
  authPage: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    padding: 24,
  },
  // La carte qui contient le formulaire.
  authCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Le titre "HelloJess" en couleur d'accent.
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.accent,
  },
  // Petite phrase grise sous le titre.
  subtitle: {
    color: colors.muted,
    fontSize: 14,
  },
  // Libellé au-dessus d'un champ de saisie.
  label: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 6,
  },
  // Aspect des champs de saisie (le padding est un peu plus grand sur iOS).
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: Platform.OS === "ios" ? 12 : 10,
    color: colors.text,
    backgroundColor: colors.bg,
    fontSize: 15,
  },
  // Le bouton principal (Log in / Sign up).
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginTop: 8,
  },
  // Le texte blanc des boutons.
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  // Message d'erreur rouge au-dessus du formulaire.
  error: {
    backgroundColor: "rgba(226,87,76,0.15)",
    color: colors.danger,
    padding: 8,
    borderRadius: 8,
    fontSize: 13,
  },
  // Lien sous le formulaire ("No account? Sign up" / "Already have an account? Log in").
  switchText: {
    color: colors.accent,
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
  },

  // ----- Écran des tâches -----

  // Fond de l'écran des tâches ; plus de marge en haut sur iOS à cause de l'encoche.
  tasksPage: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    gap: 10,
  },
  // En-tête : titre et bienvenue à gauche, bouton de déconnexion à droite.
  tasksHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  // Le bouton "Log out" : discret, juste une bordure.
  logoutBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutText: {
    color: colors.muted,
    fontSize: 13,
  },
  // La ligne des boutons de priorité et du bouton "Add".
  priorityRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  // Un bouton de priorité (low / medium / high), et son aspect quand il est sélectionné.
  priorityChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  priorityChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  priorityChipText: {
    color: colors.muted,
    fontSize: 13,
    textTransform: "capitalize",
  },
  priorityChipTextActive: {
    color: "#fff",
  },
  // Le bouton "Add", poussé tout à droite de la ligne.
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginLeft: "auto",
  },
  // La ligne de l'interrupteur "Show completed".
  showCompletedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  // Messages "Loading..." et "No tasks yet".
  emptyState: {
    color: colors.muted,
    textAlign: "center",
    marginTop: 40,
  },

  // ----- Une tâche dans la liste -----

  // La carte d'une tâche, avec une bordure colorée à gauche (couleur selon la priorité, voir juste en dessous).
  taskItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderColor: colors.border,
    padding: 14,
  },
  // Couleur de la bordure gauche selon la priorité : rouge, orange ou vert.
  priority_high: { borderLeftColor: colors.high },
  priority_medium: { borderLeftColor: colors.medium },
  priority_low: { borderLeftColor: colors.low },
  // La case à cocher (la zone qui reçoit le toucher, puis le carré dessiné, puis son aspect quand elle est cochée).
  checkbox: {
    paddingTop: 2,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.muted,
  },
  checkboxBoxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  // Le titre de la tâche, et son aspect barré et grisé quand elle est terminée.
  taskTitle: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 15,
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: colors.muted,
  },
  // La petite pastille arrondie qui affiche la priorité, et son texte.
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
  },
  badgeText: {
    color: colors.muted,
    fontSize: 11,
    textTransform: "uppercase",
  },
  // Le bouton "×" de suppression.
  deleteBtn: {
    color: colors.muted,
    fontSize: 20,
  },
});
