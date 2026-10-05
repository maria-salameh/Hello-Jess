// Comment l'application mobile parle au backend : un client HTTP partagé et la forme des données reçues.
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// Nom sous lequel le jeton de connexion est sauvegardé dans le stockage du téléphone.
export const TOKEN_KEY = "hellojess_token";

// Client préconfiguré : chaque requête part vers <adresse du serveur définie dans mobile/.env>/api.
// Sur un téléphone, cette adresse doit être celle de l'ordinateur sur le réseau, pas "localhost".
export const api = axios.create({
  baseURL: `${process.env.EXPO_PUBLIC_API_URL}/api`,
});

// S'exécute avant chaque requête : si un jeton de connexion est sauvegardé,
// on l'ajoute pour que le backend sache qui fait la demande.
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
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

// Une tâche telle que renvoyée par le backend. Les dates arrivent en texte ISO.
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
