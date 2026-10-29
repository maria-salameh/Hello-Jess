// Garde en mémoire qui est connecté et le partage avec tous les écrans, qui peuvent appeler useAuth().
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, BiometricError, TOKEN_KEY, type Challenge, type User } from "../api";
import { authenticate, readBiometrics, type Biometrics } from "../utils/biometrics";

// Nom sous lequel le choix "Face ID activé ou non" est sauvegardé. Sans valeur, Face ID est activé s'il est disponible.
const FACE_ID_KEY = "hellojess_faceid";

// Ce que useAuth() fournit : l'utilisateur courant (null si déconnecté), l'indication que la session
// sauvegardée est encore en cours de vérification, et les actions pour se connecter, s'inscrire,
// modifier son profil et se déconnecter.
//
// Se connecter ou s'inscrire se fait en deux temps (le mot de passe, puis le code reçu par email), plus un
// troisième sur un téléphone qui sait reconnaître le visage : Face ID. Le même Face ID verrouille
// l'application quand on la rouvre. La connexion dure environ un mois, puis il faut tout refaire.
type AuthContextValue = {
  user: User | null;
  loading: boolean;
  // Vrai quand une session est sauvegardée mais que Face ID n'a pas encore déverrouillé l'application.
  locked: boolean;
  unlock: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<Challenge>;
  register: (email: string, name: string, password: string) => Promise<Challenge>;
  verifyCode: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  updateProfile: (changes: { name?: string; email?: string }) => Promise<void>;
  logout: () => Promise<void>;
  // Face ID : disponible sur ce téléphone ? activé ? et comment l'activer ou le désactiver.
  faceId: Biometrics & { enabled: boolean };
  setFaceIdEnabled: (enabled: boolean) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Enveloppe l'application (voir App.tsx) et possède l'état de connexion.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Vaut true au départ : tant qu'on ne sait pas si une connexion sauvegardée est encore valide, on affiche un chargement.
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [biometrics, setBiometrics] = useState<Biometrics>({ available: false, label: "Face ID" });
  const [preference, setPreference] = useState(true);

  const enabled = biometrics.available && preference;

  // Demande au backend à qui appartient le jeton sauvegardé. Un jeton expiré ou invalide est jeté :
  // c'est ce qui force la nouvelle connexion au bout d'un mois.
  async function restoreSession() {
    try {
      const res = await api.get<User>("/auth/me");
      setUser(res.data);
      setLocked(false);
    } catch {
      await AsyncStorage.removeItem(TOKEN_KEY);
      setLocked(false);
    }
  }

  // S'exécute une fois à l'ouverture de l'application : si un jeton a été sauvegardé la dernière fois,
  // Face ID doit d'abord déverrouiller l'application (s'il est activé), puis on vérifie le jeton.
  useEffect(() => {
    (async () => {
      const [bio, stored, token] = await Promise.all([
        readBiometrics(),
        AsyncStorage.getItem(FACE_ID_KEY),
        AsyncStorage.getItem(TOKEN_KEY),
      ]);
      const wanted = stored !== "0";
      setBiometrics(bio);
      setPreference(wanted);
      if (!token) {
        setLoading(false);
        return;
      }
      if (bio.available && wanted && !(await authenticate(`Unlock HelloJess with ${bio.label}`))) {
        setLocked(true);
        setLoading(false);
        return;
      }
      await restoreSession();
      setLoading(false);
    })();
  }, []);

  // Réessaie Face ID depuis l'écran de verrouillage.
  async function unlock() {
    if (!(await authenticate(`Unlock HelloJess with ${biometrics.label}`))) return false;
    await restoreSession();
    return true;
  }

  // Première étape de la connexion : envoie les identifiants ; le backend envoie un code par email.
  async function login(email: string, password: string) {
    return (await api.post<Challenge>("/auth/login", { email, password, client: "mobile" })).data;
  }

  // Première étape de l'inscription : crée le compte (non vérifié) ; le backend envoie un code par email.
  async function register(email: string, name: string, password: string) {
    return (await api.post<Challenge>("/auth/register", { email, name, password, client: "mobile" })).data;
  }

  // Deuxième étape : le code reçu par email. Le backend répond avec le jeton (valable environ un mois) ;
  // avant de le garder, Face ID doit confirmer que c'est bien le propriétaire du téléphone.
  async function verifyCode(email: string, code: string) {
    const res = await api.post("/auth/verify", { email, code });
    if (enabled && !(await authenticate(`Confirm it's you with ${biometrics.label}`))) {
      throw new BiometricError(biometrics.label);
    }
    await AsyncStorage.setItem(TOKEN_KEY, res.data.access_token);
    setUser(res.data.user);
  }

  async function resendCode(email: string) {
    await api.post("/auth/resend", { email });
  }

  // Modification du profil (nom et/ou email) : le backend renvoie l'utilisateur à jour ; le nom et l'email affichés partout
  // se mettent à jour tout de suite. On garde l'ancien jeton : celui du backend est un jeton "web" plus court,
  // qui raccourcirait la session du téléphone.
  async function updateProfile(changes: { name?: string; email?: string }) {
    const res = await api.patch("/auth/me", changes);
    setUser(res.data.user);
  }

  // Déconnexion : oublie le jeton et l'utilisateur.
  async function logout() {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setLocked(false);
  }

  // Active ou désactive Face ID. L'activer demande d'abord une reconnaissance réussie, pour vérifier que ça marche.
  async function setFaceIdEnabled(next: boolean) {
    if (next && !(await authenticate(`Turn on ${biometrics.label}`))) return false;
    await AsyncStorage.setItem(FACE_ID_KEY, next ? "1" : "0");
    setPreference(next);
    return true;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        locked,
        unlock,
        login,
        register,
        verifyCode,
        resendCode,
        updateProfile,
        logout,
        faceId: { ...biometrics, enabled },
        setFaceIdEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook utilisé par les écrans pour lire l'état de connexion et les actions.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
