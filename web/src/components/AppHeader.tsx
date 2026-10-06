// L'en-tête commun aux pages connectées : titre, bienvenue, bouton de déconnexion et menu de navigation.
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// "subtitle" permet à une page d'afficher sa propre phrase sous le titre (sinon : "Hi <nom>").
export default function AppHeader({ subtitle }: { subtitle?: string }) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Titre et phrase d'accueil à gauche ; à droite, l'utilisateur connecté (nom et email) et le bouton de déconnexion. */}
      <header className="tasks-header">
        <div>
          <h1>HelloJess</h1>
          <p className="subtitle">{subtitle ?? `Hi ${user?.name}`}</p>
        </div>
        <div className="header-right">
          {user && (
            // Un clic sur l'utilisateur ouvre sa page de profil.
            <Link className="user-chip" to="/profile" title={`Logged in as ${user.name} (${user.email}) - view profile`}>
              {/* L'avatar : la première lettre du nom, en majuscule. */}
              <span className="user-avatar">{user.name.charAt(0).toUpperCase()}</span>
              <span className="user-text">
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </span>
            </Link>
          )}
          <button className="logout-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      {/* Menu : NavLink met automatiquement en évidence la page courante. "end" évite que "/" soit toujours actif. */}
      <nav className="main-nav">
        <NavLink to="/" end>
          Tasks
        </NavLink>
        <NavLink to="/calendar">Calendar</NavLink>
        <NavLink to="/habits">Habits</NavLink>
        <NavLink to="/stats">Statistics</NavLink>
      </nav>
    </>
  );
}
