// Garde en mémoire qui est connecté et le partage avec toutes les pages, qui peuvent appeler useAuth().
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type User } from "../api";

// Ce que useAuth() fournit : l'utilisateur courant (null si déconnecté), l'indication que la session
// sauvegardée est encore en cours de vérification, et les actions pour se connecter, s'inscrire et se déconnecter.
type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Enveloppe l'application (voir App.tsx) et possède l'état de connexion.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Vaut true au départ : tant qu'on ne sait pas si une connexion sauvegardée est encore valide, les pages ne doivent pas rediriger.
  const [loading, setLoading] = useState(true);

  // S'exécute une fois à l'ouverture de l'application : si un jeton a été sauvegardé la dernière fois,
  // on demande au backend à qui il appartient. Un jeton expiré ou invalide est jeté.
  useEffect(() => {
    const token = localStorage.getItem("hellojess_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<User>("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem("hellojess_token"))
      .finally(() => setLoading(false));
  }, []);

  // Connexion : envoie les identifiants, puis garde le jeton et l'utilisateur renvoyés.
  async function login(email: string, password: string) {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("hellojess_token", res.data.access_token);
    setUser(res.data.user);
  }

  // Inscription : crée le compte ; le backend connecte tout de suite, donc on sauvegarde le jeton comme pour la connexion.
  async function register(email: string, name: string, password: string) {
    const res = await api.post("/auth/register", { email, name, password });
    localStorage.setItem("hellojess_token", res.data.access_token);
    setUser(res.data.user);
  }

  // Déconnexion : oublie le jeton et l'utilisateur.
  function logout() {
    localStorage.removeItem("hellojess_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook utilisé par les pages pour lire l'état de connexion et les actions.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
