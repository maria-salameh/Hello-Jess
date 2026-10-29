// Garde en mémoire qui est connecté et le partage avec toutes les pages, qui peuvent appeler useAuth().
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type Challenge, type User } from "../api";
import { clearToken, getToken, replaceToken, saveToken } from "../utils/session";

// Ce que useAuth() fournit : l'utilisateur courant (null si déconnecté), l'indication que la session
// sauvegardée est encore en cours de vérification, et les actions pour se connecter, s'inscrire,
// modifier son profil et se déconnecter.
// Se connecter ou s'inscrire se fait en deux temps : login() et register() envoient un code par email
// (et renvoient de quoi l'afficher), puis verifyCode() échange ce code contre la connexion.
type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Challenge>;
  register: (email: string, name: string, password: string) => Promise<Challenge>;
  verifyCode: (email: string, code: string, stay: boolean) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  updateProfile: (changes: { name?: string; email?: string }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Enveloppe l'application (voir App.tsx) et possède l'état de connexion.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Vaut true au départ : tant qu'on ne sait pas si une connexion sauvegardée est encore valide, les pages ne doivent pas rediriger.
  const [loading, setLoading] = useState(true);

  // S'exécute une fois à l'ouverture de l'application : si un jeton a été sauvegardé la dernière fois
  // (et que le navigateur n'a pas été fermé depuis), on demande au backend à qui il appartient.
  // Un jeton expiré ou invalide est jeté.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .get<User>("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  // Première étape de la connexion : envoie les identifiants ; le backend envoie un code par email.
  async function login(email: string, password: string) {
    return (await api.post<Challenge>("/auth/login", { email, password })).data;
  }

  // Première étape de l'inscription : crée le compte (non vérifié) ; le backend envoie un code par email.
  async function register(email: string, name: string, password: string) {
    return (await api.post<Challenge>("/auth/register", { email, name, password })).data;
  }

  // Deuxième étape : le code reçu par email. "stay" choisit où garder le jeton (voir utils/session.ts).
  async function verifyCode(email: string, code: string, stay: boolean) {
    const res = await api.post("/auth/verify", { email, code });
    saveToken(res.data.access_token, stay);
    setUser(res.data.user);
  }

  async function resendCode(email: string) {
    await api.post("/auth/resend", { email });
  }

  // Modification du profil (nom et/ou email) : le backend renvoie l'utilisateur à jour et un nouveau jeton,
  // qu'on garde à la place de l'ancien ; le nom et l'email affichés partout se mettent à jour tout de suite.
  async function updateProfile(changes: { name?: string; email?: string }) {
    const res = await api.patch("/auth/me", changes);
    replaceToken(res.data.access_token);
    setUser(res.data.user);
  }

  // Déconnexion : oublie le jeton et l'utilisateur.
  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyCode, resendCode, updateProfile, logout }}>
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
