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

// Un utilisateur tel que renvoyé par le backend (sans jamais le mot de passe).
export type User = {
  id: string;
  email: string;
  name: string;
  created_at: string;
};

// Une tâche telle que renvoyée par le backend. Les dates arrivent en texte ISO, ex. "2026-11-10T00:00:00.000Z".
export type Task = {
  id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  completed: boolean;
  created_at: string;
  updated_at: string;
};

// Les champs que l'application peut envoyer pour créer une tâche.
export type TaskInput = {
  title: string;
  notes?: string | null;
  due_date?: string | null;
  priority?: "low" | "medium" | "high";
};
