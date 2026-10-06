// La page de profil : les informations du compte connecté (modifiables) et un petit résumé de son activité.
// On y arrive en cliquant sur l'utilisateur affiché en haut à droite.
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, errorMessages, type Habit, type TaskCount } from "../api";
import AppHeader from "../components/AppHeader";
import ErrorList from "../components/ErrorList";
import { useAuth } from "../context/AuthContext";
import { formatDate, todayLocal } from "../utils/dates";

export default function Profile() {
  const { user, logout, updateProfile } = useAuth();
  // Le résumé : nombre de tâches (par statut) et d'habitudes.
  const [counts, setCounts] = useState<TaskCount | null>(null);
  const [habitCount, setHabitCount] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  // La modification du profil : le mode "édition", les champs du formulaire, les erreurs et la confirmation.
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Charge le résumé à l'ouverture de la page.
  useEffect(() => {
    Promise.all([api.get<TaskCount>("/tasks/count"), api.get<Habit[]>("/habits")])
      .then(([tasks, habits]) => {
        setCounts(tasks.data);
        setHabitCount(habits.data.length);
      })
      .catch((err) => setErrors(errorMessages(err)));
  }, []);

  if (!user) return null;

  // Passe en mode édition : le formulaire démarre avec le nom et l'email actuels.
  function startEditing() {
    setName(user!.name);
    setEmail(user!.email);
    setFormErrors([]);
    setSaved(false);
    setEditing(true);
  }

  // Enregistre les modifications. Les erreurs du backend (email invalide ou déjà utilisé, nom vide...)
  // s'affichent dans le formulaire, qui reste ouvert pour qu'on puisse corriger.
  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setFormErrors([]);
    setSaving(true);
    try {
      await updateProfile({ name, email });
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setFormErrors(errorMessages(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="tasks-page">
      <AppHeader subtitle="Your profile" />
      <Link className="back-link" to="/">
        ← Back to tasks
      </Link>
      <ErrorList messages={errors} />
      {saved && <div className="success">Profile updated.</div>}

      {/* Les informations du compte : avatar, nom, email, date d'inscription et identifiant. */}
      <section className="stats-card profile-card">
        <div className="profile-head">
          <span className="profile-avatar">{user.name.charAt(0).toUpperCase()}</span>
          <div className="profile-head-text">
            <h2>{user.name}</h2>
            <span className="stats-note">{user.email}</span>
          </div>
          {/* Le bouton qui ouvre le formulaire de modification (caché pendant l'édition). */}
          {!editing && (
            <button type="button" className="logout-btn" onClick={startEditing}>
              Edit profile
            </button>
          )}
        </div>

        {/* Le formulaire de modification du nom et de l'email. */}
        {editing && (
          <form className="profile-form" onSubmit={handleSave}>
            <ErrorList messages={formErrors} />
            <label>
              Name
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </label>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <div className="form-row">
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </button>
              <button type="button" className="logout-btn" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        )}

        <dl className="profile-list">
          {/* Le nom et l'email ne sont listés ici que hors édition (pendant l'édition, ils sont dans le formulaire). */}
          {!editing && (
            <>
              <div>
                <dt>Name</dt>
                <dd>{user.name}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
            </>
          )}
          <div>
            <dt>Member since</dt>
            <dd>{formatDate(todayLocal(new Date(user.created_at)))}</dd>
          </div>
          <div>
            <dt>User ID</dt>
            <dd className="profile-id">{user.id}</dd>
          </div>
        </dl>
      </section>

      {/* Le résumé de l'activité : tâches par statut et nombre d'habitudes. */}
      <section className="stats-card">
        <h2>Your activity</h2>
        {counts && habitCount !== null ? (
          <div className="stats-summary">
            <div>
              <strong>{counts.total}</strong>
              <span>tasks</span>
            </div>
            <div>
              <strong>{counts.todo}</strong>
              <span>to do</span>
            </div>
            <div>
              <strong>{counts.doing}</strong>
              <span>doing</span>
            </div>
            <div>
              <strong>{counts.done}</strong>
              <span>done</span>
            </div>
            <div>
              <strong>{habitCount}</strong>
              <span>habits</span>
            </div>
          </div>
        ) : (
          <p className="stats-note">Loading...</p>
        )}
      </section>

      <button className="danger-outline-btn" onClick={logout}>
        Log out
      </button>
    </div>
  );
}
