// L'en-tête commun aux pages connectées : titre, bienvenue, bouton de déconnexion et menu de navigation.
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// "subtitle" permet à une page d'afficher sa propre phrase sous le titre (sinon : "Hi <nom>").
export default function AppHeader({ subtitle }: { subtitle?: string }) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Titre, phrase d'accueil et bouton de déconnexion. */}
      <header className="tasks-header">
        <div>
          <h1>HelloJess</h1>
          <p className="subtitle">{subtitle ?? `Hi ${user?.name}`}</p>
        </div>
        <button className="logout-btn" onClick={logout}>
          Log out
        </button>
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
