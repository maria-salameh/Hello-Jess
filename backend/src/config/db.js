// Connecte Mongoose à MongoDB. Appelé une seule fois par services/server.js avant le démarrage de l'API.
import mongoose from "mongoose";
import { config } from "./env.js";

export async function connectDB() {
  // Ouvre la connexion ; abandonne après 5 secondes si MongoDB est injoignable, au lieu de rester bloqué.
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 5000 });
  // Construit les index (ex. l'email unique des utilisateurs) avant que l'API n'accepte des requêtes.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  // Message de démarrage indiquant le serveur et la base de données auxquels on est connecté.
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}
