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
  // La description d'une tâche dans la liste (limitée à 2 lignes dans le composant).
  taskNotes: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  // La ligne sous le titre : statut, priorité et échéance côte à côte.
  taskMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  // Le bouton arrondi qui affiche le statut ; appuyer dessus passe au statut suivant.
  statusPill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  statusPillText: {
    color: colors.muted,
    fontSize: 11,
    textTransform: "uppercase",
  },
  // La date limite, et sa version rouge quand elle est dépassée.
  dueText: {
    color: colors.muted,
    fontSize: 12,
  },
  dueTextOverdue: {
    color: colors.danger,
    fontWeight: "600",
  },

  // ----- L'utilisateur connecté (sous le titre) -----

  // Une ligne : l'avatar rond avec l'initiale, puis le nom et l'email l'un sous l'autre.
  userChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  userName: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
  },
  userEmail: {
    color: colors.muted,
    fontSize: 12,
  },

  // ----- Écran de profil -----

  // L'en-tête de la carte : grand avatar à gauche, nom et email à droite.
  profileHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 4,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 26,
  },
  // Une ligne d'information : le libellé gris à gauche, la valeur à droite, séparées par un trait.
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  // Le bouton "Cancel" du formulaire de profil : discret, juste une bordure.
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  profileValue: {
    flex: 1,
    textAlign: "right",
    color: colors.text,
    fontWeight: "600",
    fontSize: 13,
  },

  // ----- Menu de navigation (Tasks / Habits / Statistics) -----

  // La rangée du menu sous l'en-tête.
  nav: {
    flexDirection: "row",
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  // Un onglet du menu, et son aspect quand c'est la page courante (souligné en couleur d'accent).
  navItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  navItemActive: {
    borderBottomColor: colors.accent,
  },
  navText: {
    color: colors.muted,
    fontWeight: "600",
    fontSize: 14,
  },
  navTextActive: {
    color: colors.accent,
  },

  // ----- Boutons-filtres ("chips") et formulaires -----

  // Une rangée de petits boutons qui passe à la ligne si elle est trop longue.
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  // Un petit bouton arrondi, et son aspect quand il est choisi.
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.muted,
    fontSize: 13,
  },
  chipTextActive: {
    color: "#fff",
  },
  // Le petit nombre affiché dans un bouton-filtre (le compteur de tâches).
  chipCount: {
    color: colors.muted,
    fontSize: 11,
    backgroundColor: "rgba(127,127,127,0.25)",
    paddingHorizontal: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  // Petit titre au-dessus d'une rangée de filtres ou de choix.
  groupLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  // Champ de texte sur plusieurs lignes (description d'une tâche).
  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  // Message vert de confirmation ("Saved.").
  success: {
    backgroundColor: "rgba(76,175,130,0.15)",
    color: "#4caf82",
    padding: 8,
    borderRadius: 8,
    fontSize: 13,
  },
  // Bouton de suppression : transparent avec un contour rouge.
  dangerButton: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginTop: 8,
  },
  dangerText: {
    color: colors.danger,
    fontWeight: "600",
    fontSize: 15,
  },
  // Les dates gérées par le serveur (création, modification, fin) dans la page de détail.
  detailMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  // Lien "Back to tasks" en haut de la page de détail.
  backLink: {
    color: colors.accent,
    fontSize: 14,
    marginBottom: 4,
  },

  // ----- Habitudes -----

  // Une habitude : une carte avec son nom en haut et les 7 derniers jours en dessous.
  habitCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  habitHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  // La rangée des 7 jours.
  habitDays: {
    flexDirection: "row",
    gap: 6,
  },
  // Un jour : petit bouton avec le jour de la semaine et le numéro. Plein quand l'habitude est réalisée ;
  // aujourd'hui est entouré de la couleur d'accent.
  habitDay: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  habitDayDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  habitDayToday: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  habitDayWeekday: {
    color: colors.muted,
    fontSize: 11,
  },
  habitDayNumber: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },

  // ----- Statistiques -----

  // Une carte de la page des statistiques (heatmap ou graphique).
  statsCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  statsHeading: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  statsNote: {
    color: colors.muted,
    fontSize: 12,
  },
  // Les trois chiffres résumés sous la heatmap.
  statsSummary: {
    flexDirection: "row",
    gap: 24,
    flexWrap: "wrap",
    marginTop: 6,
  },
  statsSummaryValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  statsSummaryLabel: {
    color: colors.muted,
    fontSize: 12,
  },

  // ----- Heatmap -----

  // La grille et les noms de jours à sa gauche (qui ne défilent pas).
  heatmapRow: {
    flexDirection: "row",
    gap: 6,
  },
  // Les noms des jours : 7 lignes de la même hauteur que les cases ; la première ligne est décalée sous les noms de mois.
  heatmapWeekdays: {
    marginTop: 16,
    gap: 3,
    width: 26,
  },
  heatmapWeekdayLabel: {
    height: 12,
    lineHeight: 12,
    fontSize: 9,
    color: colors.muted,
  },
  // La rangée des noms de mois : chaque nom est placé à la bonne colonne avec "left".
  heatmapMonths: {
    height: 16,
    position: "relative",
  },
  heatmapMonthLabel: {
    position: "absolute",
    top: 0,
    fontSize: 10,
    color: colors.muted,
  },
  // Une colonne = une semaine (7 cases empilées).
  heatmapColumn: {
    gap: 3,
  },
  // Une case (un jour) ; sa couleur est donnée selon le niveau d'intensité.
  heatmapCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  // Le jour touché, entouré pour le repérer.
  heatmapCellSelected: {
    borderWidth: 1,
    borderColor: colors.text,
  },
  // La légende "Less ... More".
  heatmapLegend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },

  // ----- Graphique du taux de complétion -----

  // Les barres sont alignées en bas, une colonne par période (le graphique défile s'il est trop large).
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  chartCol: {
    width: 40,
    alignItems: "center",
    gap: 2,
  },
  chartValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  // L'évolution par rapport à la période précédente : verte si elle progresse, rouge si elle recule.
  chartChange: {
    fontSize: 10,
    minHeight: 12,
  },
  chartChangeUp: {
    color: "#4caf82",
  },
  chartChangeDown: {
    color: colors.danger,
  },
  // Le rail dans lequel la barre grandit : hauteur fixe, la barre est collée en bas.
  chartTrack: {
    height: 120,
    width: "100%",
    justifyContent: "flex-end",
  },
  chartBar: {
    width: "100%",
    backgroundColor: colors.accent,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 3,
  },
  // Barre grisée : aucune tâche n'était en jeu pendant cette période.
  chartBarEmpty: {
    backgroundColor: colors.border,
  },
  chartLabel: {
    color: colors.muted,
    fontSize: 11,
  },

  // ----- Écrans qui défilent (détail, statistiques, calendrier) -----

  // Fond d'un écran qui défile, et l'espace autour de son contenu.
  scrollPage: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 60,
    gap: 12,
  },

  // ----- Calendrier -----

  // La barre au-dessus de la grille : mois précédent, nom du mois, mois suivant, "Today".
  calToolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  calTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  // Une ligne de la grille = une semaine (7 cases de même largeur).
  calRow: {
    flexDirection: "row",
  },
  // La rangée des noms de jours (Mon ... Sun).
  calWeekdayLabel: {
    flex: 1,
    textAlign: "center",
    color: colors.muted,
    fontSize: 11,
    paddingBottom: 4,
  },
  // Une case (un jour) : le numéro en haut, puis les points de couleur des événements.
  calCell: {
    flex: 1,
    minHeight: 54,
    padding: 3,
    gap: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  // Les jours des mois voisins sont atténués ; aujourd'hui a un numéro dans une pastille ; le jour choisi est entouré.
  calCellOutside: {
    opacity: 0.4,
  },
  calCellSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  calDayNumber: {
    alignSelf: "flex-start",
    minWidth: 18,
    height: 18,
    lineHeight: 18,
    textAlign: "center",
    borderRadius: 9,
    overflow: "hidden",
    color: colors.text,
    fontSize: 11,
    fontWeight: "600",
  },
  calDayNumberToday: {
    backgroundColor: colors.accent,
    color: "#fff",
  },
  // Les points de couleur : un par événement (les premiers seulement), qui passent à la ligne.
  calDots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
  },
  calDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  // Une tâche en retard garde la couleur de son statut mais est entourée de rouge.
  calDotOverdue: {
    borderWidth: 2,
    borderColor: colors.danger,
  },
  // La légende sous la grille et un point de couleur (donné en ligne).
  calLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  calLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  // Une ligne de la liste des événements du jour.
  calDayItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 4,
  },
});
