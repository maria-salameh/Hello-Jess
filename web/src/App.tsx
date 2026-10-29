// Décide quelle page afficher pour quelle URL, et empêche les visiteurs non connectés d'accéder à la liste des tâches.
import type { ReactNode } from "react";
import { Navigate, Route, BrowserRouter, Routes } from "react-router-dom";
import EggTimer from "./components/EggTimer";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import Calendar from "./pages/Calendar";
import Habits from "./pages/Habits";
import Login from "./pages/Login";
import Notes from "./pages/Notes";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import Stats from "./pages/Stats";
import TaskDetail from "./pages/TaskDetail";
import Tasks from "./pages/Tasks";
import Workspaces from "./pages/Workspaces";
// Styles partagés par toutes les pages.
import "./App.css";

// Enveloppe les pages qui demandent une connexion : attend la fin de la vérification de la session sauvegardée,
// renvoie les visiteurs non connectés vers /login, et sinon affiche la page qu'elle contient.
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="empty-state">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Les écrans et leurs URLs.
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* La liste des tâches est la page d'accueil, mais seulement pour les utilisateurs connectés. */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <Tasks />
          </RequireAuth>
        }
      />
      {/* Le détail (et la modification) d'une tâche. */}
      <Route
        path="/tasks/:id"
        element={
          <RequireAuth>
            <TaskDetail />
          </RequireAuth>
        }
      />
      {/* Le profil de l'utilisateur connecté : ses informations et un résumé de son activité. */}
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <Profile />
          </RequireAuth>
        }
      />
      {/* Le calendrier : tâches et habitudes marquées en couleur sur un mois. */}
      <Route
        path="/calendar"
        element={
          <RequireAuth>
            <Calendar />
          </RequireAuth>
        }
      />
      {/* Les habitudes (bonus B2). */}
      <Route
        path="/habits"
        element={
          <RequireAuth>
            <Habits />
          </RequireAuth>
        }
      />
      {/* Les statistiques : heatmap et taux de complétion (bonus B3 et B4). */}
      <Route
        path="/stats"
        element={
          <RequireAuth>
            <Stats />
          </RequireAuth>
        }
      />
      {/* Shared notes and workspaces. */}
      <Route
        path="/notes"
        element={
          <RequireAuth>
            <Notes />
          </RequireAuth>
        }
      />
      <Route
        path="/workspaces"
        element={
          <RequireAuth>
            <Workspaces />
          </RequireAuth>
        }
      />
      {/* Toute autre URL ramène à la page d'accueil. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Haut de l'application : le routeur gère les URLs, le fournisseur d'authentification partage
// "qui est connecté" avec chaque page, le fournisseur d'espaces de travail gère l'espace affiché et la
// connexion WebSocket, et les pages se trouvent à l'intérieur de tous les trois.
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WorkspaceProvider>
          <AppRoutes />
          {/* Le minuteur d'œuf flotte en bas à droite sur toutes les pages. */}
          <EggTimer />
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
