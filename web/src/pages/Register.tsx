// La page d'inscription : crée un compte et va directement à la liste des tâches.
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  // Ce que l'utilisateur a saisi jusqu'ici.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Message affiché au-dessus du formulaire quand l'inscription échoue.
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
      await register(email, name, password);
      // Succès : l'utilisateur est déjà connecté, donc on va à la liste des tâches.
      navigate("/");
    } catch {
      // Toute erreur affiche ce même message (la vraie raison renvoyée par le backend n'est pas montrée).
      setError("Could not create account. That email may already be registered.");
    } finally {
      setSubmitting(false);
    }
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
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Sign up"}
        </button>
        {/* Lien pour ceux qui ont déjà un compte. */}
        <p className="switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
