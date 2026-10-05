// Construit l'application Express : middlewares, routes de l'API et gestion des erreurs.
// Elle ne démarre pas l'écoute ; cela se fait dans server.js.
import cors from "cors";
import express from "express";
import { config } from "../config/env.js";
import authRouter from "../routes/authRoutes.js";
import calendarRouter from "../routes/calendarRoutes.js";
import habitRouter from "../routes/habitRoutes.js";
import statsRouter from "../routes/statsRoutes.js";
import taskRouter from "../routes/taskRoutes.js";

const app = express();

// Permet à l'application web (dans le navigateur, sur une autre origine) d'appeler cette API ; les origines autorisées viennent de la config.
app.use(cors({ origin: config.corsOrigin }));
// Transforme les corps de requête JSON en objet disponible dans req.body.
app.use(express.json());

// Vérification simple "le serveur est-il en marche ?", en dehors de /api.
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Les routes de l'API : toute URL commençant par ces préfixes est traitée par le routeur correspondant.
app.use("/api/auth", authRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/habits", habitRouter);
app.use("/api/stats", statsRouter);
app.use("/api/calendar", calendarRouter);

// Tout ce qui ne correspond à aucune route ci-dessus reçoit un 404.
app.use((_req, res) => res.status(404).json({ detail: "Not Found" }));

// Dernier recours pour les erreurs levées n'importe où dans une fonction de traitement.
app.use((err, _req, res, _next) => {
  // Le client a envoyé un corps qui n'est pas du JSON valide.
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ detail: "Invalid JSON body" });
  }
  // Une règle du modèle Mongoose a été violée malgré la validation en amont : on répond 422 comme pour les autres erreurs de validation.
  if (err.name === "ValidationError" && err.errors) {
    return res.status(422).json({
      detail: "Validation failed",
      errors: Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
    });
  }
  // Tout le reste est un bug de notre côté : on l'enregistre dans les logs et on renvoie un 500 générique.
  console.error(err);
  res.status(500).json({ detail: "Internal Server Error" });
});

export default app;
