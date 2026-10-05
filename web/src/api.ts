// Comment l'application web parle au backend : un client HTTP partagé et la forme des données reçues.
import axios from "axios";

// Client préconfiguré : chaque requête part vers <adresse du serveur définie dans web/.env>/api.
export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
});

// S'exécute avant chaque requête : si un jeton de connexion est sauvegardé dans le navigateur,
// on l'ajoute pour que le backend sache qui fait la demande.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("hellojess_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Transforme une erreur de requête en liste de messages lisibles : les messages de validation du
// backend (un par champ en erreur), son message général, ou un message adapté si le serveur est injoignable.
export function errorMessages(err: unknown): string[] {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      return data.errors.map((e: { message: string }) => e.message);
    }
    if (typeof data?.detail === "string") return [data.detail];
    if (!err.response) return ["Could not reach the server. Check that the backend is running."];
  }
  return ["Something went wrong. Please try again."];
}

// Un utilisateur tel que renvoyé par le backend (sans jamais le mot de passe).
export type User = {
  id: string;
  email: string;
  name: string;
  created_at: string;
};

// Les valeurs possibles pour l'avancement et la priorité d'une tâche.
export type TaskStatus = "todo" | "doing" | "done";
export type Priority = "low" | "medium" | "high";

// Une tâche telle que renvoyée par le backend. dueDate est un jour du calendrier "YYYY-MM-DD" (sans heure) ;
// completedAt, createdAt et updatedAt sont des instants au format ISO.
export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  description: string;
  dueDate: string | null;
  priority: Priority;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// Les champs que l'application peut envoyer pour créer ou modifier une tâche.
export type TaskInput = {
  title: string;
  status: TaskStatus;
  description?: string;
  dueDate?: string | null;
  priority?: Priority;
};

// Le compteur de tâches : le total et le nombre pour chaque statut.
export type TaskCount = { total: number } & Record<TaskStatus, number>;

// Une habitude. "completions" (les jours réalisés, "YYYY-MM-DD") n'est présent que si on a demandé une période.
export type Habit = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  completions?: string[];
};

// Un événement du calendrier : une tâche à faire ("task-due"), une tâche terminée ("task-done")
// ou une habitude réalisée ("habit"), à une date civile donnée.
export type CalendarEvent = {
  date: string;
  type: "task-due" | "task-done" | "habit";
  title: string;
  taskId?: string;
  habitId?: string;
  status?: TaskStatus;
  priority?: Priority;
};
export type CalendarResponse = { from: string; to: string; timeZone: string; events: CalendarEvent[] };

// Un jour de la heatmap : nombre de tâches terminées, d'habitudes réalisées, total et niveau d'intensité (0 à 4).
export type HeatmapDay = { date: string; tasks: number; habits: number; total: number; level: number };
export type Heatmap = { from: string; to: string; timeZone: string; max: number; days: HeatmapDay[] };

// Une période (semaine ou mois) du taux de complétion. rate vaut null quand aucune tâche n'était en jeu.
export type CompletionItem = {
  start: string;
  end: string;
  completed: number;
  workload: number;
  rate: number | null;
  change: number | null;
  habitCompletions: number;
};
export type Completion = { period: "week" | "month"; timeZone: string; today: string; items: CompletionItem[] };
