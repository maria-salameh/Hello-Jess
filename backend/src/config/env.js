// Tous les paramètres dont le backend a besoin sont ici. Chaque valeur vient d'une variable
// d'environnement (ou du fichier backend/.env) ; le texte après "??" est la valeur par défaut
// utilisée quand la variable n'est pas définie.

// Charge le fichier backend/.env dans process.env, s'il existe.
import "dotenv/config";

const corsOrigin = process.env.CORS_ORIGIN ?? "*";

export const config = {
  // Port sur lequel l'API écoute.
  port: Number(process.env.PORT ?? 8000),
  // Chaîne de connexion MongoDB ; "hellojess" à la fin est le nom de la base de données.
  mongodbUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/hellojess",
  // Sites autorisés à appeler l'API depuis un navigateur (CORS).
  // "*" autorise toutes les origines ; sinon une liste séparée par des virgules, ex. http://localhost:5173,http://localhost:8081
  corsOrigin: corsOrigin === "*" ? "*" : corsOrigin.split(",").map((origin) => origin.trim()),
  // Secret utilisé pour signer les jetons de connexion. À changer en dehors du développement local.
  secretKey: process.env.SECRET_KEY ?? "dev-secret-change-me",
  // Durée de validité d'un jeton de connexion : des minutes (7 jours par défaut) converties en secondes.
  tokenExpiresInSeconds: Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES ?? 60 * 24 * 7) * 60,
};
