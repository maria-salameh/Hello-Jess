// La page d'inscription, en deux étapes : le formulaire, puis le code reçu par email qui confirme l'adresse. Ensuite la liste des tâches s'ouvre.
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { errorMessages, type Challenge } from "../api";
import CodeForm from "../components/CodeForm";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  // Ce que l'utilisateur a saisi jusqu'ici.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stay, setStay] = useState(true);
  // Message affiché au-dessus du formulaire quand l'inscription échoue.
  const [error, setError] = useState<string | null>(null);
  // Vaut true pendant l'envoi de la requête, pour désactiver le bouton et éviter les doubles envois.
  const [submitting, setSubmitting] = useState(false);
  // Une fois le compte créé, le backend envoie un code par email : on passe à la deuxième étape.
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  // S'exécute quand le formulaire est envoyé.
  async function handleSubmit(e: FormEvent) {
    // Empêche l'envoi classique du formulaire par le navigateur (qui rechargerait la page).
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      setChallenge(await register(email, name, password));
    } catch (err) {
      // Affiche la vraie raison renvoyée par le backend (ex. "Email already registered") ou "serveur injoignable".
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
        <p className="subtitle">Create your account</p>
        {/* Affiché seulement quand il y a un message d'erreur. */}
        {error && <div className="error">{error}</div>}
        <label>
          Name
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <label className="stay-row">
          <input type="checkbox" checked={stay} onChange={(e) => setStay(e.target.checked)} />
          Stay logged in while the browser is open
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "Sending code..." : "Sign up"}
        </button>
        {/* Lien pour ceux qui ont déjà un compte. */}
        <p className="switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
