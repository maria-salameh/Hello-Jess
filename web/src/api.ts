import axios from "axios";

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("hellojess_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type User = {
  id: string;
  email: string;
  name: string;
  created_at: string;
};

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

export type TaskInput = {
  title: string;
  notes?: string | null;
  due_date?: string | null;
  priority?: "low" | "medium" | "high";
};
