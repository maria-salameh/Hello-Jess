// La page de connexion, en deux étapes : email + mot de passe, puis le code reçu par email. Ensuite la liste des tâches s'ouvre.
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { errorMessages, type Challenge } from "../api";
import CodeForm from "../components/CodeForm";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  // Ce que l'utilisateur a saisi jusqu'ici.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // "Stay logged in" : reste connecté tant que le navigateur n'est pas fermé (voir utils/session.ts).
  const [stay, setStay] = useState(true);
  // Message affiché au-dessus du formulaire quand la connexion échoue.
  const [error, setError] = useState<string | null>(null);
  // Vaut true pendant l'envoi de la requête, pour désactiver le bouton et éviter les doubles envois.
  const [submitting, setSubmitting] = useState(false);
  // Quand le mot de passe est bon, le backend envoie un code par email : on passe à la deuxième étape.
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  // S'exécute quand le formulaire est envoyé.
  async function handleSubmit(e: FormEvent) {
    // Empêche l'envoi classique du formulaire par le navigateur (qui rechargerait la page).
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      setChallenge(await login(email, password));
    } catch (err) {
      // Affiche la vraie raison renvoyée par le backend (ex. mauvais identifiants) ou "serveur injoignable".
      setError(errorMessages(err).join(" "));
    } finally {
      setSubmitting(false);
    }
  }

  if (challenge) {
    return (
      <div className="auth-page">
        <CodeForm challenge={challenge} stay={stay} onDone={() => navigate("/")} onBack={() => setChallenge(null)} />
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>HelloJess</h1>
        <p className="subtitle">Log in to your tasks</p>
        {/* Affiché seulement quand il y a un message d'erreur. */}
        {error && <div className="error">{error}</div>}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <label className="stay-row">
          <input type="checkbox" checked={stay} onChange={(e) => setStay(e.target.checked)} />
          Stay logged in while the browser is open
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "Sending code..." : "Log in"}
        </button>
        <p className="switch">
          No account? <Link to="/register">Sign up</Link>
        </p>
      </form>
    </div>
  );
}
