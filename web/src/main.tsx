import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Styles globaux (couleurs, polices) pour toute l'application.
import './index.css'
import App from './App.tsx'

// Point d'entrée : monte l'application React dans le <div id="root"> de index.html.
// StrictMode ajoute seulement des vérifications supplémentaires en développement ; il ne change pas la vraie application.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
