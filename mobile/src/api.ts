import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export const TOKEN_KEY = "hellojess_token";

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type User = {
  id: number;
  email: string;
  name: string;
  created_at: string;
};

export type Task = {
  id: number;
  title: string;
  notes: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  completed: boolean;
  created_at: string;
  updated_at: string;
};
