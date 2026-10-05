// Point d'entrée du backend (npm run dev / npm start) : se connecte à la base de données, puis démarre l'écoute.
import { connectDB } from "../config/db.js";
import { config } from "../config/env.js";
import app from "./app.js";

// On n'accepte pas de requêtes tant que MongoDB n'est pas connecté ; s'il est injoignable, on explique pourquoi et on s'arrête.
try {
  await connectDB();
} catch (err) {
  console.error(`Could not connect to MongoDB at ${config.mongodbUri}\n${err.message}`);
  process.exit(1);
}

// "0.0.0.0" = accepte aussi les connexions des autres appareils du réseau (ex. un téléphone qui utilise l'application mobile).
app.listen(config.port, "0.0.0.0", () => {
  console.log(`HelloJess API listening on http://0.0.0.0:${config.port}`);
});
