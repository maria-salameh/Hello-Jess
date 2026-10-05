// La page de connexion : un formulaire email/mot de passe qui connecte l'utilisateur et ouvre la liste des tâches.
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  // Ce que l'utilisateur a saisi jusqu'ici.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Message affiché au-dessus du formulaire quand la connexion échoue.
  const [error, setError] = useState<string | null>(null);
  // Vaut true pendant l'envoi de la requête, pour désactiver le bouton et éviter les doubles envois.
  const [submitting, setSubmitting] = useState(false);

  // S'exécute quand le formulaire est envoyé.
  async function handleSubmit(e: FormEvent) {
    // Empêche l'envoi classique du formulaire par le navigateur (qui rechargerait la page).
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      // Succès : on va à la liste des tâches.
      navigate("/");
    } catch {
      setError("Incorrect email or password.");
    } finally {
      setSubmitting(false);
    }
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
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "Logging in..." : "Log in"}
        </button>
        {/* Lien pour ceux qui n'ont pas encore de compte. */}
        <p className="switch">
          No account? <Link to="/register">Sign up</Link>
        </p>
      </form>
    </div>
  );
}
