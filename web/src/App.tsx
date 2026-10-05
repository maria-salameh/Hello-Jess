// Décide quelle page afficher pour quelle URL, et empêche les visiteurs non connectés d'accéder à la liste des tâches.
import type { ReactNode } from "react";
import { Navigate, Route, BrowserRouter, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Tasks from "./pages/Tasks";
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

// Les trois écrans et leurs URLs.
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
    </Routes>
  );
}

// Haut de l'application : le routeur gère les URLs, le fournisseur d'authentification partage
// "qui est connecté" avec chaque page, et les pages se trouvent à l'intérieur des deux.
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
